import type { Request, Response } from "express";
import { repoQueue, repoJobId } from "../services/queue.service.ts";
import { hasIndex, countChunks, searchIndex } from "../services/vectorstore.service.ts";
import { embedQuery } from "../services/embedding.service.ts";
import { parseRepoUrl } from "./repository.controller.ts";

// POST /analyze  { repourl }  -> enqueue a download+parse+embed job
const startAnalysis = async (req: Request, res: Response) => {
  const { repourl } = req.body ?? {};

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
    // Already indexed and no job re-running it? Report it as done straight away.
    const existing = await repoQueue.getJob(jobId);
    if (!existing) {
      if (await hasIndex(owner, repo)) {
        return res.status(200).json({
          message: "Repository already indexed",
          data: { jobId, state: "completed", cached: true, chunks: await countChunks(owner, repo) },
        });
      }
    } else if (["completed", "failed"].includes(await existing.getState())) {
      // Let the user re-run a finished/failed job with the same id.
      await existing.remove();
    }

    const job = await repoQueue.add("index", { owner, repo, repourl: repourl.trim() }, { jobId });

    return res.status(202).json({
      message: "Repository analysis queued",
      data: { jobId: job.id, state: await job.getState() },
    });
  } catch (error) {
    console.error(error);
    return res.status(503).json({
      message: "Could not queue the analysis. Is Redis running?",
    });
  }
};

// GET /analyze/:jobId -> current state + progress
const getAnalysisStatus = async (req: Request, res: Response) => {
  const jobId = req.params.jobId;
  if (typeof jobId !== "string") {
    return res.status(400).json({ message: "Missing job id." });
  }

  try {
    const job = await repoQueue.getJob(jobId);
    if (!job) {
      return res.status(404).json({ message: "No analysis job found with that id." });
    }

    const state = await job.getState();
    return res.status(200).json({
      message: "Job status",
      data: {
        jobId: job.id,
        state,
        progress: job.progress,
        result: job.returnvalue ?? null,
        error: job.failedReason ?? null,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(503).json({ message: "Could not read job status. Is Redis running?" });
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
    if (!(await hasIndex(owner, repo))) {
      return res.status(404).json({
        message: `"${owner}/${repo}" has not been indexed yet. Run analysis first.`,
      });
    }

    const queryEmbedding = await embedQuery(query.trim());
    const hits = await searchIndex(owner, repo, queryEmbedding, Number(topK) || 8);

    return res.status(200).json({ message: "Search results", data: hits });
  } catch (error) {
    console.error(error);
    return res.status(503).json({ message: "Could not search the repository index." });
  }
};

export default { startAnalysis, getAnalysisStatus, searchRepository };
