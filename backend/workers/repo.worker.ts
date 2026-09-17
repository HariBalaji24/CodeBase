import { Worker, type Job } from "bullmq";
import {
  REPO_QUEUE_NAME,
  redisConnection,
  type RepoJobData,
  type RepoJobResult,
} from "../services/queue.service.ts";
import { downloadRepoZip, extractTextFiles } from "../services/unzip.service.ts";
import { chunkFiles } from "../services/chunk.service.ts";
import { embedTexts } from "../services/embedding.service.ts";
import { saveIndex } from "../services/vectorstore.service.ts";

export type RepoJobProgress = {
  stage: "downloading" | "parsing" | "chunking" | "embedding" | "saving";
  percent: number;
  files?: number;
  chunks?: number;
};

// Rough share of total time each stage takes, used to map to a single 0-100 bar.
const STAGE_BASE: Record<RepoJobProgress["stage"], number> = {
  downloading: 0,
  parsing: 15,
  chunking: 25,
  embedding: 30,
  saving: 95,
};

const processRepo = async (
  job: Job<RepoJobData, RepoJobResult>,
): Promise<RepoJobResult> => {
  const { owner, repo, repourl } = job.data;
  const report = (progress: RepoJobProgress) => job.updateProgress(progress);

  await report({ stage: "downloading", percent: STAGE_BASE.downloading });
  const zip = await downloadRepoZip(owner, repo);
  await job.log(`Downloaded zipball (${(zip.length / 1024).toFixed(0)} KB)`);

  await report({ stage: "parsing", percent: STAGE_BASE.parsing });
  const files = await extractTextFiles(zip);
  await job.log(`Extracted ${files.length} text files`);

  await report({ stage: "chunking", percent: STAGE_BASE.chunking, files: files.length });
  const chunks = chunkFiles(files);
  await job.log(`Split into ${chunks.length} chunks`);

  await report({
    stage: "embedding",
    percent: STAGE_BASE.embedding,
    files: files.length,
    chunks: chunks.length,
  });
  const embeddings = await embedTexts(
    chunks.map((c) => `// ${c.path}\n${c.content}`),
    (done, total) =>
      report({
        stage: "embedding",
        percent: STAGE_BASE.embedding + Math.round((done / total) * (STAGE_BASE.saving - STAGE_BASE.embedding)),
        files: files.length,
        chunks: chunks.length,
      }),
  );

  await report({ stage: "saving", percent: STAGE_BASE.saving, files: files.length, chunks: chunks.length });
  const collection = await saveIndex({
    owner,
    repo,
    repourl,
    model: process.env.EMBEDDING_MODEL ?? "Xenova/all-MiniLM-L6-v2",
    createdAt: new Date().toISOString(),
    files: files.length,
    chunks: chunks.map((chunk, i) => ({ ...chunk, embedding: embeddings[i] ?? [] })),
  });
  await job.log(`Saved ${chunks.length} embeddings to Chroma collection "${collection}"`);

  return { files: files.length, chunks: chunks.length, collection };
};

export const startRepoWorker = () => {
  const worker = new Worker<RepoJobData, RepoJobResult>(REPO_QUEUE_NAME, processRepo, {
    connection: redisConnection,
    concurrency: Number(process.env.WORKER_CONCURRENCY ?? 1), // embedding is CPU-bound
    lockDuration: 5 * 60 * 1000, // embedding a big repo can take a while
  });

  worker.on("completed", (job, result) =>
    console.log(`[worker] ${job.id} done: ${result.files} files, ${result.chunks} chunks`),
  );
  worker.on("failed", (job, err) =>
    console.error(`[worker] ${job?.id} failed: ${err.message}`),
  );
  worker.on("error", (err) => console.error("[worker] error", err));

  console.log(`[worker] listening on queue "${REPO_QUEUE_NAME}"`);
  return worker;
};
