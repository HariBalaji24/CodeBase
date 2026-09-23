import { ChromaClient, CloudClient, type Collection } from "chromadb";
import dotenv from "dotenv";
import type { Chunk } from "./chunk.service.ts";

dotenv.config();

const collectionNameFor = (owner: string, repo: string) =>
  `repo__${owner}__${repo}`.toLowerCase().replace(/[^a-z0-9_-]/g, "-");


const client = process.env.CHROMA_API_KEY
  ? new CloudClient({
      apiKey: process.env.CHROMA_API_KEY,
      ...(process.env.CHROMA_TENANT ? { tenant: process.env.CHROMA_TENANT } : {}),
      ...(process.env.CHROMA_DATABASE ? { database: process.env.CHROMA_DATABASE } : {}),
    })
  : (() => {
      const url = new URL(process.env.CHROMA_URL ?? "http://localhost:8000");
      return new ChromaClient({
        host: url.hostname,
        port: Number(url.port) || (url.protocol === "https:" ? 443 : 80),
        ssl: url.protocol === "https:",
      });
    })();

const collectionCache = new Map<string, Promise<Collection>>();

const getCollection = (owner: string, repo: string): Promise<Collection> => {
  const name = collectionNameFor(owner, repo);
  let promise = collectionCache.get(name);
  if (!promise) {
    promise = client.getOrCreateCollection({
      name,
      metadata: { owner, repo },
      embeddingFunction: null,
      configuration: { hnsw: { space: "cosine" } },
    });
    collectionCache.set(name, promise);
  }
  return promise;
};

export type EmbeddedChunk = Chunk & { embedding: number[] };

export type RepoIndex = {
  owner: string;
  repo: string;
  repourl: string;
  model: string;
  createdAt: string;
  files: number;
  chunks: EmbeddedChunk[];
};

// Replaces the collection's contents with a fresh set of embedded chunks.
export const saveIndex = async (index: RepoIndex): Promise<string> => {
  const collection = await getCollection(index.owner, index.repo);

  // Clear any previous run before writing the new one (re-analysis support).
  await collection.delete({ where: {} }).catch(() => {});

  const BATCH_SIZE = 100;
  for (let i = 0; i < index.chunks.length; i += BATCH_SIZE) {
    const batch = index.chunks.slice(i, i + BATCH_SIZE);
    await collection.upsert({
      ids: batch.map((c) => c.id),
      embeddings: batch.map((c) => c.embedding),
      documents: batch.map((c) => c.content),
      metadatas: batch.map((c) => ({
        path: c.path,
        startLine: c.startLine,
        endLine: c.endLine,
        repourl: index.repourl,
        model: index.model,
        createdAt: index.createdAt,
      })),
    });
  }

  return collectionNameFor(index.owner, index.repo);
};

// True once a repo has at least one chunk stored (used for the "already indexed" check).
export const hasIndex = async (owner: string, repo: string): Promise<boolean> => {
  try {
    const collection = await getCollection(owner, repo);
    const count = await collection.count();
    return count > 0;
  } catch {
    return false;
  }
};

export const countChunks = async (owner: string, repo: string): Promise<number> => {
  try {
    const collection = await getCollection(owner, repo);
    return await collection.count();
  } catch {
    return 0;
  }
};

export type SearchHit = {
  id: string;
  path: string;
  startLine: number;
  endLine: number;
  content: string;
  score: number; // similarity, higher is closer (1 - cosine distance)
};

// Similarity search against an already-indexed repo using a pre-computed query embedding.
export const searchIndex = async (
  owner: string,
  repo: string,
  queryEmbedding: number[],
  topK = 8,
): Promise<SearchHit[]> => {
  const collection = await getCollection(owner, repo);

  const result = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults: topK,
    include: ["documents", "metadatas", "distances"],
  });

  const ids = result.ids[0] ?? [];
  const documents = result.documents[0] ?? [];
  const metadatas = result.metadatas[0] ?? [];
  const distances = result.distances?.[0] ?? [];

  return ids.map((id, i) => {
    const metadata = (metadatas[i] ?? {}) as Record<string, unknown>;
    const distance = distances[i] ?? 1;
    return {
      id,
      path: String(metadata.path ?? ""),
      startLine: Number(metadata.startLine ?? 0),
      endLine: Number(metadata.endLine ?? 0),
      content: documents[i] ?? "",
      score: 1 - distance, // Chroma's default space is cosine distance
    };
  });
};
