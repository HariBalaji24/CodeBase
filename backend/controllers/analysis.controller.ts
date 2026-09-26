import type { Request, Response } from "express";
import type { Job } from "bullmq";
import {
  QUEUE_PREFIX,
  REPO_QUEUE_NAME,
  ensureQueueReady,
  isWorkerOnline,
  repoJobId,
  repoQueue,
  type RepoJobData,
  type RepoJobResult,
} from "../services/queue.service.ts";
import { ServiceUnavailableError } from "../services/redis.service.ts";
import {
  collectionNameFor,
  ensureChromaReady,
  getIndexInfo,
  searchIndex,
  type IndexInfo,
} from "../services/vectorstore.service.ts";
import { embedQuery } from "../services/embedding.service.ts";
import { isInProcessWorkerRunning } from "../workers/repo.worker.ts";
import { parseRepoUrl } from "./repository.controller.ts";

const IN_PROGRESS_STATES = new Set(["waiting", "active", "delayed", "prioritized", "waiting-children"]);

const sendError = (res: Response, error: unknown, fallback: string) => {
  if (error instanceof ServiceUnavailableError) {
    return res.status(503).json({ message: error.message, code: error.code });
  }
  console.error(error);
  return res.status(500).json({ message: fallback });
};

const workerOnline = async () =>
  isInProcessWorkerRunning() || (await isWorkerOnline().catch(() => false));

// Everything the frontend needs to show what a job is doing.
const describeJob = async (job: Job<RepoJobData, RepoJobResult>) => {
  const state = await job.getState();
  const { logs } = await repoQueue.getJobLogs(job.id!, -15, -1);
  return {
    jobId: job.id!,
    state,
    progress: job.progress,
    result: job.returnvalue ?? null,
    error: job.failedReason ?? null,
    attemptsMade: job.attemptsMade,
    maxAttempts: job.opts.attempts ?? 1,
    queuedAt: job.timestamp,
    startedAt: job.processedOn ?? null,
    finishedAt: job.finishedOn ?? null,
    logs,
    // Only relevant while the job still needs a worker to pick it up or finish it.
    workerOnline: IN_PROGRESS_STATES.has(state) ? await workerOnline() : true,
    cached: false,
  };
};

// Status for a repo whose index already exists in Chroma (no queue job needed).
const indexedStatus = (jobId: string, owner: string, repo: string, index: IndexInfo) => ({
  jobId,
  state: "completed",
  progress: { stage: "saving", percent: 100, message: "Already indexed", files: index.files, chunks: index.chunks },
  result: { files: index.files, chunks: index.chunks, collection: collectionNameFor(owner, repo) },
  error: null,
  attemptsMade: 0,
  maxAttempts: 0,
  queuedAt: null,
  startedAt: null,
  finishedAt: index.indexedAt ? Date.parse(index.indexedAt) : null,
  logs: [],
  workerOnline: true,
  cached: true,
});

// POST /analyze  { repourl, force? } -> start (or reuse) indexing for a repo
const startAnalysis = async (req: Request, res: Response) => {
  const { repourl, force } = req.body ?? {};

  if (typeof repourl !== "string" || !repourl.trim()) {
    return res.status(400).json({ message: "Please enter a GitHub repository URL." });
  }

  let parsed;
  try {
    parsed = parseRepoUrl(repourl.trim());
  } catch {
    parsed = null;
  }
  if (!parsed) {
    return res.status(400).json({ message: "That does not look like a GitHub repository URL." });
  }

  const { owner, repo } = parsed;
  const jobId = repoJobId(owner, repo);

  try {
    await ensureQueueReady();

    const existing = await repoQueue.getJob(jobId);
    if (existing) {
      const state = await existing.getState();
      // Already running, or finished recently: report it rather than start over.
      if (IN_PROGRESS_STATES.has(state) || (state === "completed" && force !== true)) {
        return res.status(200).json({ message: "Analysis already exists", data: await describeJob(existing) });
      }
      await existing.remove(); // failed (or re-index forced): start a fresh job
    }

    // Check Chroma before queueing, rather than finding out after the whole download and embed.
    await ensureChromaReady();

    if (force !== true) {
      const index = await getIndexInfo(owner, repo);
      if (index) {
        return res.status(200).json({ message: "Repository already indexed", data: indexedStatus(jobId, owner, repo, index) });
      }
    }

    const job = await repoQueue.add("index", { owner, repo, repourl: repourl.trim() }, { jobId });
    return res.status(202).json({ message: "Repository analysis queued", data: await describeJob(job) });
  } catch (error) {
    return sendError(res, error, "Could not start the analysis.");
  }
};

// GET /analyze/:jobId -> current state, progress, recent logs
const getAnalysisStatus = async (req: Request, res: Response) => {
  const jobId = req.params.jobId;
  if (typeof jobId !== "string" || !jobId) {
    return res.status(400).json({ message: "Missing job id." });
  }

  try {
    await ensureQueueReady();

    const job = await repoQueue.getJob(jobId);
    if (job) {
      return res.status(200).json({ message: "Job status", data: await describeJob(job) });
    }

    // Finished jobs are removed from the queue after an hour; the index itself stays.
    // Job ids are "<owner>__<repo>" and GitHub owners can't contain "_".
    const split = jobId.indexOf("__");
    if (split > 0) {
      const owner = jobId.slice(0, split);
      const repo = jobId.slice(split + 2);
      const index = await getIndexInfo(owner, repo).catch(() => null);
      if (index) {
        return res.status(200).json({ message: "Repository already indexed", data: indexedStatus(jobId, owner, repo, index) });
      }
    }

    return res.status(404).json({ message: "No analysis job found with that id.", code: "JOB_NOT_FOUND" });
  } catch (error) {
    return sendError(res, error, "Could not read the job status.");
  }
};

// POST /analyze/:owner/:repo/search  { query, topK? } -> similarity search over the repo's chunks
const searchRepository = async (req: Request, res: Response) => {
  const { owner, repo } = req.params;
  const { query, topK } = req.body ?? {};

  if (typeof owner !== "string" || typeof repo !== "string") {
    return res.status(400).json({ message: "Missing owner/repo." });
  }
  if (typeof query !== "string" || !query.trim()) {
    return res.status(400).json({ message: "Please provide a search query." });
  }

  try {
    await ensureChromaReady();
    if (!(await getIndexInfo(owner, repo))) {
      return res.status(404).json({ message: `"${owner}/${repo}" has not been indexed yet. Run analysis first.` });
    }

    const queryEmbedding = await embedQuery(query.trim());
    const hits = await searchIndex(owner, repo, queryEmbedding, Number(topK) || 8);
    return res.status(200).json({ message: "Search results", data: hits });
  } catch (error) {
    return sendError(res, error, "Could not search the repository index.");
  }
};

// GET /health -> is everything the analysis pipeline needs actually up?
const health = async (_req: Request, res: Response) => {
  const [redis, chroma] = await Promise.all([
    ensureQueueReady(3000).then(
      () => "ok",
      (error: Error) => error.message,
    ),
    ensureChromaReady(5000).then(
      () => "ok",
      (error: Error) => error.message,
    ),
  ]);
  const worker = redis === "ok" ? await workerOnline() : isInProcessWorkerRunning();
  const jobs =
    redis === "ok"
      ? await repoQueue.getJobCounts("waiting", "active", "delayed", "completed", "failed").catch(() => null)
      : null;

  const ok = redis === "ok" && chroma === "ok" && worker;
  return res.status(ok ? 200 : 503).json({
    status: ok ? "ok" : "degraded",
    redis,
    chroma,
    worker: worker
      ? "online"
      : "offline - queued jobs will wait. Start the API without RUN_WORKER=false, or run `npm run worker`.",
    queue: `${QUEUE_PREFIX}:${REPO_QUEUE_NAME}`,
    jobs,
  });
};

export default { startAnalysis, getAnalysisStatus, searchRepository, health };
