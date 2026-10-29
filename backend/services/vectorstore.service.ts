import { ChromaClient, CloudClient, type Collection } from "chromadb";
import dotenv from "dotenv";
import type { Chunk } from "./chunk.service.ts";
import type { StructureChunk } from "./chunk.structure.ts";
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

export type EmbeddedStructureChunk = StructureChunk & { embedding: number[] };

export type RepoIndex = {
  owner: string;
  repo: string;
  repourl: string;
  model: string;
  files: number;
  chunks: (EmbeddedChunk | EmbeddedStructureChunk)[];
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
        metadatas: batch.map((c) => {
          const base = {
            path: c.path,
            startLine: c.startLine,
            endLine: c.endLine,
          };
          if ("metadata" in c && c.metadata) {
            return {
              ...base,
              scope: c.metadata.scope,
              chunkType: c.metadata.type,
              symbols: c.metadata.symbols.join(","),
              parentSymbol: c.metadata.parentSymbol || "",
              language: c.metadata.language,
            };
          }
          return base;
        }),
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

export type IndexedRepo = {
  owner: string;
  repo: string;
  repourl: string;
  model: string;
  files: number;
  chunks: number;
  indexedAt: string | null;
};

// Every fully indexed repo, newest first. Reads collection metadata only, so
// it stays cheap no matter how many chunks each repo has.
export const listIndexedRepos = async (): Promise<IndexedRepo[]> => {
  const PAGE = 100;
  const collections: Collection[] = [];

  for (let offset = 0; ; offset += PAGE) {
    const page = await withTimeout(
      client.listCollections({ limit: PAGE, offset }),
      15_000,
      "Chroma listCollections",
    );
    collections.push(...page);
    if (page.length < PAGE) break;
  }

  return collections
    .flatMap((collection) => {
      const m = collection.metadata;
      if (!m || m.complete !== true || typeof m.owner !== "string" || typeof m.repo !== "string") return [];
      return [
        {
          owner: m.owner,
          repo: m.repo,
          repourl: typeof m.repourl === "string" ? m.repourl : `https://github.com/${m.owner}/${m.repo}`,
          model: typeof m.model === "string" ? m.model : "",
          files: Number(m.files ?? 0),
          chunks: Number(m.chunks ?? 0),
          indexedAt: typeof m.indexedAt === "string" ? m.indexedAt : null,
        },
      ];
    })
    .sort((a, b) => Date.parse(b.indexedAt ?? "") - Date.parse(a.indexedAt ?? "") || 0);
};

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  ".ts": "TypeScript", ".tsx": "TypeScript", ".js": "JavaScript", ".jsx": "JavaScript",
  ".mjs": "JavaScript", ".cjs": "JavaScript", ".py": "Python", ".rb": "Ruby", ".go": "Go",
  ".rs": "Rust", ".java": "Java", ".kt": "Kotlin", ".swift": "Swift", ".c": "C", ".h": "C",
  ".cpp": "C++", ".hpp": "C++", ".cs": "C#", ".php": "PHP", ".scala": "Scala",
  ".html": "HTML", ".css": "CSS", ".scss": "CSS", ".vue": "Vue", ".svelte": "Svelte",
  ".json": "JSON", ".yml": "YAML", ".yaml": "YAML", ".toml": "TOML", ".xml": "XML",
  ".md": "Markdown", ".mdx": "Markdown", ".txt": "Text", ".sql": "SQL", ".graphql": "GraphQL",
  ".prisma": "Prisma", ".sh": "Shell",
};

const languageOf = (filePath: string) => {
  const base = filePath.split("/").pop() ?? filePath;
  const dot = base.lastIndexOf(".");
  const ext = dot > 0 ? base.slice(dot).toLowerCase() : "";
  return LANGUAGE_BY_EXTENSION[ext] ?? (ext ? ext.slice(1).toUpperCase() : "Other");
};

export type RepoStats = {
  files: number;
  chunks: number;
  linesCovered: number; // sum of chunk line spans (overlapping lines count twice)
  languages: { name: string; files: number; chunks: number }[];
  topFiles: { path: string; chunks: number }[];
};

// Metrics computed from the stored chunks of one repo. Returns null if it isn't indexed.
export const getRepoStats = async (owner: string, repo: string): Promise<RepoStats | null> => {
  const collection = await findCollection(owner, repo);
  if (!collection || collection.metadata?.complete !== true) return null;

  const PAGE = 300;
  const MAX_PAGES = 100; // 30k chunks is far beyond the 50 MB repo cap
  const chunksByFile = new Map<string, number>();
  let chunks = 0;
  let linesCovered = 0;

  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await withTimeout(
      collection.get({ limit: PAGE, offset: page * PAGE, include: ["metadatas"] }),
      30_000,
      "Chroma get",
    );

    for (const metadata of result.metadatas) {
      const filePath = String(metadata?.path ?? "");
      if (!filePath) continue;
      chunks += 1;
      linesCovered += Math.max(0, Number(metadata?.endLine ?? 0) - Number(metadata?.startLine ?? 0) + 1);
      chunksByFile.set(filePath, (chunksByFile.get(filePath) ?? 0) + 1);
    }

    if (result.ids.length < PAGE) break;
  }

  const languages = new Map<string, { files: number; chunks: number }>();
  for (const [filePath, count] of chunksByFile) {
    const entry = languages.get(languageOf(filePath)) ?? { files: 0, chunks: 0 };
    entry.files += 1;
    entry.chunks += count;
    languages.set(languageOf(filePath), entry);
  }

  return {
    files: chunksByFile.size,
    chunks,
    linesCovered,
    languages: [...languages]
      .map(([name, value]) => ({ name, ...value }))
      .sort((a, b) => b.chunks - a.chunks),
    topFiles: [...chunksByFile]
      .map(([path, count]) => ({ path, chunks: count }))
      .sort((a, b) => b.chunks - a.chunks)
      .slice(0, 5),
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
