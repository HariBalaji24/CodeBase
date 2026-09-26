import os from "node:os";
import { Worker, type Job } from "bullmq";
import {
  QUEUE_PREFIX,
  REPO_QUEUE_NAME,
  WORKER_HEARTBEAT,
  type RepoJobData,
  type RepoJobProgress,
  type RepoJobResult,
  type RepoJobStage,
} from "../services/queue.service.ts";
import { createWorkerConnection, throttledErrorLogger } from "../services/redis.service.ts";
import { downloadRepoZip, extractTextFiles } from "../services/unzip.service.ts";
import { chunkFiles } from "../services/chunk.service.ts";
import { EMBEDDING_MODEL, embedTexts, warmUpEmbeddings } from "../services/embedding.service.ts";
import { saveIndex } from "../services/vectorstore.service.ts";

// Where each stage starts on the single 0-100 progress bar.
const STAGE_START: Record<RepoJobStage, number> = {
  downloading: 0,
  parsing: 10,
  chunking: 15,
  embedding: 20,
  saving: 95,
};

const processRepo = async (job: Job<RepoJobData, RepoJobResult>): Promise<RepoJobResult> => {
  const { owner, repo, repourl } = job.data;
  let lastReportAt = 0;

  // Progress updates are Redis writes; during embedding they are capped at one
  // a second so a hosted Redis with a command quota isn't flooded.
  const report = async (progress: RepoJobProgress, force = true) => {
    const now = Date.now();
    if (!force && now - lastReportAt < 1000) return;
    lastReportAt = now;
    await job.updateProgress(progress);
  };
  const log = (message: string) => {
    console.log(`[worker] ${job.id}: ${message}`);
    return job.log(`${new Date().toISOString()}  ${message}`);
  };

  await log(`Started (attempt ${job.attemptsMade + 1})`);

  await report({ stage: "downloading", percent: STAGE_START.downloading, message: `Downloading ${owner}/${repo} from GitHub` });
  let zip: Buffer | null = await downloadRepoZip(owner, repo);
  const kb = zip.length / 1024;
  await log(`Downloaded repository archive (${kb < 1024 ? `${kb.toFixed(0)} KB` : `${(kb / 1024).toFixed(1)} MB`})`);

  await report({ stage: "parsing", percent: STAGE_START.parsing, message: "Extracting source files" });
  const files = await extractTextFiles(zip);
  zip = null; // let the archive be garbage-collected before embedding
  await log(`Extracted ${files.length} source files`);
  if (files.length === 0) {
    throw new Error("No source files found in this repository (only binaries, dependencies or files over 200 KB).");
  }

  await report({ stage: "chunking", percent: STAGE_START.chunking, message: "Splitting files into chunks", files: files.length });
  const chunks = chunkFiles(files);
  await log(`Split into ${chunks.length} chunks`);

  await report({
    stage: "embedding",
    percent: STAGE_START.embedding,
    message: "Loading embedding model (the first run downloads ~25 MB)",
    files: files.length,
    chunks: chunks.length,
  });
  const embeddings = await embedTexts(
    chunks.map((c) => `// ${c.path}\n${c.content}`),
    (done, total) =>
      report(
        {
          stage: "embedding",
          percent: STAGE_START.embedding + Math.floor((done / total) * (STAGE_START.saving - STAGE_START.embedding)),
          message: `Embedded ${done} of ${total} chunks`,
          files: files.length,
          chunks: total,
        },
        done === total,
      ),
  );
  await log(`Embedded ${embeddings.length} chunks`);

  await report({
    stage: "saving",
    percent: STAGE_START.saving,
    message: "Saving embeddings to Chroma",
    files: files.length,
    chunks: chunks.length,
  });
  const collection = await saveIndex({
    owner,
    repo,
    repourl,
    model: EMBEDDING_MODEL,
    files: files.length,
    chunks: chunks.map((chunk, i) => ({ ...chunk, embedding: embeddings[i] ?? [] })),
  });
  await log(`Saved ${chunks.length} chunks to Chroma collection "${collection}"`);
  await report({
    stage: "saving",
    percent: 100,
    message: `Indexed ${chunks.length} chunks from ${files.length} files`,
    files: files.length,
    chunks: chunks.length,
  });

  return { files: files.length, chunks: chunks.length, collection };
};

let inProcessWorker: Worker<RepoJobData, RepoJobResult> | null = null;

// True when this process is running a worker that is connected and polling.
export const isInProcessWorkerRunning = () => Boolean(inProcessWorker?.isRunning());

export const startRepoWorker = () => {
  const connection = createWorkerConnection();
  connection.on("error", throttledErrorLogger("worker redis"));

  const worker = new Worker<RepoJobData, RepoJobResult>(REPO_QUEUE_NAME, processRepo, {
    connection,
    prefix: QUEUE_PREFIX,
    concurrency: 1, // embedding is CPU- and memory-heavy; one repo at a time
    lockDuration: 120_000, // renewed every 60s while a job runs
    stalledInterval: 60_000, // how often to look for jobs orphaned by a crashed worker
    maxStalledCount: 1, // an orphaned job is retried once, then marked failed
    // Idle long-poll in seconds. New jobs still wake the worker instantly; a long
    // poll just means fewer Redis requests while idle (hosted Redis bills per request).
    drainDelay: 60,
  });

  worker.on("failed", (job, err) => console.error(`[worker] ${job?.id} failed: ${err.message}`));
  worker.on("completed", (job, result) =>
    console.log(`[worker] ${job.id} done: ${result.files} files, ${result.chunks} chunks`),
  );
  // A listener is required (an unhandled "error" event would crash the process).
  // Connection problems are already reported by the connection's own logger.
  const logWorkerError = throttledErrorLogger("worker", null);
  worker.on("error", (err) => {
    if (connection.status !== "ready") return;
    logWorkerError(err);
  });

  // Tells the API a worker is alive; it expires on its own if this process dies.
  const beat = () => {
    if (connection.status !== "ready") return;
    const value = JSON.stringify({ host: os.hostname(), pid: process.pid, at: new Date().toISOString() });
    connection.set(WORKER_HEARTBEAT.key, value, "PX", WORKER_HEARTBEAT.ttlMs).catch(() => {});
  };
  connection.on("ready", beat);
  const heartbeat = setInterval(beat, WORKER_HEARTBEAT.intervalMs);

  // Load the model now so the first job doesn't wait for it (and problems show up at startup).
  warmUpEmbeddings()
    .then((ms) => console.log(`[worker] Embedding model ready (${(ms / 1000).toFixed(1)}s)`))
    .catch((err) => console.error(`[worker] ${err.message}. Jobs will retry loading it.`));

  inProcessWorker = worker;
  console.log(`[worker] Listening on queue "${QUEUE_PREFIX}:${REPO_QUEUE_NAME}"`);

  return {
    worker,
    stop: async () => {
      clearInterval(heartbeat);
      inProcessWorker = null;
      // Don't wait for a running job; its lock expires and it is picked up again.
      await worker.close(true);
      connection.disconnect(); // the heartbeat key then expires within a minute
    },
  };
};
