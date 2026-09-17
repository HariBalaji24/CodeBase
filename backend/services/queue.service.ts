import { Queue } from "bullmq";
import { Redis } from "ioredis";
import dotenv from "dotenv";
dotenv.config();

export const REPO_QUEUE_NAME = "repo-indexing";

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

// BullMQ needs maxRetriesPerRequest: null on the connection it shares.
export const redisConnection = new Redis(
  process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
  { maxRetriesPerRequest: null },
);

export const repoQueue = new Queue<RepoJobData, RepoJobResult>(REPO_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { age: 60 * 60 }, // keep finished jobs for an hour
    removeOnFail: { age: 24 * 60 * 60 },
  },
});

// One job per repo so re-analyzing the same URL reuses the in-flight job.
export const repoJobId = (owner: string, repo: string) =>
  `${owner}__${repo}`.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
