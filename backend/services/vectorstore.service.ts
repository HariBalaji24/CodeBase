import { ChromaClient, CloudClient, type Collection } from "chromadb";
import dotenv from "dotenv";
import type { Chunk } from "./chunk.service.ts";
import { ServiceUnavailableError } from "./redis.service.ts";

dotenv.config();

// CHROMA_API_KEY set -> Chroma Cloud. Otherwise a local/self-hosted server at CHROMA_URL.
const cloudApiKey = process.env.CHROMA_API_KEY;
const usingCloud = Boolean(cloudApiKey);

export const chromaTarget = usingCloud
  ? "Chroma Cloud"
  : (process.env.CHROMA_URL ?? "http://localhost:8000");

const client = cloudApiKey
  ? new CloudClient({
      apiKey: cloudApiKey,
      ...(process.env.CHROMA_TENANT ? { tenant: process.env.CHROMA_TENANT } : {}),
      ...(process.env.CHROMA_DATABASE ? { database: process.env.CHROMA_DATABASE } : {}),
    })
  : (() => {
      const url = new URL(chromaTarget);
      return new ChromaClient({
        host: url.hostname,
        port: Number(url.port) || (url.protocol === "https:" ? 443 : 80),
        ssl: url.protocol === "https:",
      });
    })();

const chromaUnavailableMessage = () =>
  usingCloud
    ? "Chroma Cloud is not reachable. Check CHROMA_API_KEY, CHROMA_TENANT and CHROMA_DATABASE."
    : `Chroma is not reachable at ${chromaTarget}. Start it locally with \`npm run redis\` (needs Docker), ` +
      "or set CHROMA_API_KEY in backend/.env to use Chroma Cloud.";

// A Chroma request that never answers would otherwise hang the caller forever.
const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });

// Throws ServiceUnavailableError when Chroma can't be reached.
export const ensureChromaReady = async (timeoutMs = 8000) => {
  try {
    await withTimeout(client.heartbeat(), timeoutMs, "Chroma heartbeat");
  } catch {
    throw new ServiceUnavailableError(chromaUnavailableMessage(), "CHROMA_UNAVAILABLE");
  }
};

// One collection per repo, e.g. "repo__facebook__react".
export const collectionNameFor = (owner: string, repo: string) =>
  `repo__${owner}__${repo}`.toLowerCase().replace(/[^a-z0-9_-]/g, "-");

const isNotFound = (error: unknown) =>
  error instanceof Error && (error.name === "ChromaNotFoundError" || /not found|does not exist/i.test(error.message));

// The existing collection, or null. Never creates one.
const findCollection = async (owner: string, repo: string): Promise<Collection | null> => {
  try {
    return await withTimeout(
      client.getCollection({ name: collectionNameFor(owner, repo) }),
      15_000,
      "Chroma getCollection",
    );
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
};

export type EmbeddedChunk = Chunk & { embedding: number[] };

export type RepoIndex = {
  owner: string;
  repo: string;
  repourl: string;
  model: string;
  files: number;
  chunks: EmbeddedChunk[];
};

// Replaces the repo's collection with a fresh one. The collection is marked
// complete only after every chunk is written, so a run that dies half-way is
// never mistaken for a finished index.
export const saveIndex = async (index: RepoIndex): Promise<string> => {
  const name = collectionNameFor(index.owner, index.repo);

  if (await findCollection(index.owner, index.repo)) {
    await withTimeout(client.deleteCollection({ name }), 30_000, "Chroma deleteCollection");
  }

  const collection = await withTimeout(
    client.createCollection({
      name,
      metadata: { owner: index.owner, repo: index.repo, complete: false },
      embeddingFunction: null, // we always pass our own embeddings
      configuration: { hnsw: { space: "cosine" } }, // embeddings are normalised
    }),
    30_000,
    "Chroma createCollection",
  );

  const BATCH_SIZE = 100;
  for (let i = 0; i < index.chunks.length; i += BATCH_SIZE) {
    const batch = index.chunks.slice(i, i + BATCH_SIZE);
    await withTimeout(
      collection.upsert({
        ids: batch.map((c) => c.id),
        embeddings: batch.map((c) => c.embedding),
        documents: batch.map((c) => c.content),
        metadatas: batch.map((c) => ({
          path: c.path,
          startLine: c.startLine,
          endLine: c.endLine,
        })),
      }),
      60_000,
      "Chroma upsert",
    );
  }

  await withTimeout(
    collection.modify({
      metadata: {
        owner: index.owner,
        repo: index.repo,
        repourl: index.repourl,
        model: index.model,
        files: index.files,
        chunks: index.chunks.length,
        indexedAt: new Date().toISOString(),
        complete: true,
      },
    }),
    30_000,
    "Chroma modify",
  );

  return name;
};

export type IndexInfo = { files: number; chunks: number; indexedAt: string | null };

// Details of a completed index, or null if the repo hasn't been fully indexed.
export const getIndexInfo = async (owner: string, repo: string): Promise<IndexInfo | null> => {
  const collection = await findCollection(owner, repo);
  if (!collection || collection.metadata?.complete !== true) return null;

  const metadata = collection.metadata;
  return {
    files: Number(metadata.files ?? 0),
    chunks: Number(metadata.chunks ?? 0),
    indexedAt: typeof metadata.indexedAt === "string" ? metadata.indexedAt : null,
  };
};

export type SearchHit = {
  id: string;
  path: string;
  startLine: number;
  endLine: number;
  content: string;
  score: number; // similarity, higher is closer (1 - cosine distance)
};

// Similarity search against an indexed repo using a pre-computed query embedding.
export const searchIndex = async (
  owner: string,
  repo: string,
  queryEmbedding: number[],
  topK = 8,
): Promise<SearchHit[]> => {
  const collection = await findCollection(owner, repo);
  if (!collection) return [];

  const result = await withTimeout(
    collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: topK,
      include: ["documents", "metadatas", "distances"],
    }),
    30_000,
    "Chroma query",
  );

  const ids = result.ids[0] ?? [];
  const documents = result.documents[0] ?? [];
  const metadatas = result.metadatas[0] ?? [];
  const distances = result.distances?.[0] ?? [];

  return ids.map((id, i) => {
    const metadata = (metadatas[i] ?? {}) as Record<string, unknown>;
    return {
      id,
      path: String(metadata.path ?? ""),
      startLine: Number(metadata.startLine ?? 0),
      endLine: Number(metadata.endLine ?? 0),
      content: documents[i] ?? "",
      score: 1 - (distances[i] ?? 1),
    };
  });
};
