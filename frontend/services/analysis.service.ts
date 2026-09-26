"use client";
import axios from "axios";

export type AnalysisStage =
  | "downloading"
  | "parsing"
  | "chunking"
  | "embedding"
  | "saving";

export type AnalysisProgress = {
  stage: AnalysisStage;
  percent: number;
  message?: string;
  files?: number;
  chunks?: number;
};

export type AnalysisStatus = {
  jobId: string;
  state: "waiting" | "active" | "completed" | "failed" | "delayed" | string;
  progress?: AnalysisProgress | number | null;
  result?: { files: number; chunks: number } | null;
  error?: string | null;
  attemptsMade?: number;
  maxAttempts?: number;
  queuedAt?: number | null;
  startedAt?: number | null;
  finishedAt?: number | null;
  logs?: string[];
  // false while a job is waiting but no worker process is running to pick it up
  workerOnline?: boolean;
  cached?: boolean;
};

// Error carrying the backend's machine-readable code (e.g. REDIS_UNAVAILABLE).
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

const backendUrl = () => {
  const url = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!url) {
    // NEXT_PUBLIC_* vars are baked in at build time - if this fires, the
    // deploy host's build didn't have NEXT_PUBLIC_BACKEND_URL set. Add it
    // in the host's project settings and redeploy (env changes alone don't
    // update an already-built deployment).
    throw new Error(
      "NEXT_PUBLIC_BACKEND_URL is not set. Add it in your deploy host's environment variables and redeploy.",
    );
  }
  return url;
};

const toError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      const reason = error.code === "ECONNABORTED" ? "did not respond in time" : "could not be reached";
      return new ApiError(`The backend at ${backendUrl()} ${reason}. Is it running?`);
    }
    return new ApiError(
      error.response.data?.message ?? error.message,
      error.response.status,
      error.response.data?.code,
    );
  }
  return error instanceof Error ? error : new Error(String(error));
};

// Asks the backend to download the repo and queue it for parsing + embedding.
// Returns the existing job/index instead if the repo was already analysed,
// unless force is set.
export async function startAnalysis(repourl: string, force = false): Promise<AnalysisStatus> {
  try {
    const response = await axios.post(`${backendUrl()}/analyze`, { repourl, force }, { timeout: 30_000 });
    return response.data.data;
  } catch (error) {
    throw toError(error);
  }
}

export async function getAnalysisStatus(jobId: string): Promise<AnalysisStatus> {
  try {
    const response = await axios.get(`${backendUrl()}/analyze/${encodeURIComponent(jobId)}`, {
      timeout: 15_000,
    });
    return response.data.data;
  } catch (error) {
    throw toError(error);
  }
}

export type SearchHit = {
  id: string;
  path: string;
  startLine: number;
  endLine: number;
  content: string;
  score: number;
};

// Semantic search over an already-indexed repo's chunks.
export async function searchRepository(
  owner: string,
  repo: string,
  query: string,
  topK = 5,
): Promise<SearchHit[]> {
  try {
    const response = await axios.post(
      `${backendUrl()}/analyze/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/search`,
      { query, topK },
      { timeout: 60_000 }, // the first search may load the embedding model
    );
    return response.data.data;
  } catch (error) {
    throw toError(error);
  }
}
