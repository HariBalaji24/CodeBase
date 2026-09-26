import { Queue } from "bullmq";
import {
  createQueueConnection,
  throttledErrorLogger,
  waitForRedis,
} from "./redis.service.ts";

export const REPO_QUEUE_NAME = "repo-indexing";

// Namespace for every queue key in Redis. Local dev and production get separate
// namespaces so they never pick up each other's jobs, even when both point at
// the same hosted Redis. Render sets RENDER=true on its services.
export const QUEUE_PREFIX =
  process.env.QUEUE_PREFIX ?? (process.env.RENDER ? "codebase-prod" : "codebase-dev");

export type RepoJobData = {
  owner: string;
  repo: string;
  repourl: string;
};

export type RepoJobResult = {
  files: number;
  chunks: number;
  collection: string;
};

export type RepoJobStage = "downloading" | "parsing" | "chunking" | "embedding" | "saving";

export type RepoJobProgress = {
  stage: RepoJobStage;
  percent: number;
  message: string;
  files?: number;
  chunks?: number;
};

export const queueConnection = createQueueConnection();
queueConnection.on("error", throttledErrorLogger("redis"));

export const repoQueue = new Queue<RepoJobData, RepoJobResult>(REPO_QUEUE_NAME, {
  connection: queueConnection,
  prefix: QUEUE_PREFIX,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 10_000 },
    removeOnComplete: { age: 60 * 60 }, // finished jobs stay visible for an hour
    removeOnFail: { age: 24 * 60 * 60 },
  },
});
repoQueue.on("error", () => {}); // already reported by the connection's logger

// Throws ServiceUnavailableError (after up to timeoutMs) when Redis is down.
export const ensureQueueReady = (timeoutMs = 5000) => waitForRedis(queueConnection, timeoutMs);

// One job per repo, so analysing the same URL again reuses the existing job.
export const repoJobId = (owner: string, repo: string) =>
  `${owner}__${repo}`.toLowerCase().replace(/[^a-z0-9_-]/g, "-");

// Each running worker refreshes this key; if it expires, no worker is alive.
export const WORKER_HEARTBEAT = {
  key: `${QUEUE_PREFIX}:${REPO_QUEUE_NAME}:worker-heartbeat`,
  intervalMs: 60_000,
  ttlMs: 150_000,
};

export const isWorkerOnline = async () =>
  (await queueConnection.exists(WORKER_HEARTBEAT.key)) === 1;
