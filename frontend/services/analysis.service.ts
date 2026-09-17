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
  files?: number;
  chunks?: number;
};

export type AnalysisStatus = {
  jobId: string;
  state: "waiting" | "active" | "completed" | "failed" | "delayed" | string;
  progress?: AnalysisProgress | number | null;
  result?: { files: number; chunks: number } | null;
  error?: string | null;
  cached?: boolean;
  files?: number;
  chunks?: number;
};

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
    return new Error(error.response?.data?.message ?? error.message);
  }
  return error instanceof Error ? error : new Error(String(error));
};

// Asks the backend to download the repo zip and queue it for parsing + embedding.
export async function startAnalysis(repourl: string): Promise<AnalysisStatus> {
  try {
    const response = await axios.post(`${backendUrl()}/analyze`, { repourl });
    return response.data.data;
  } catch (error) {
    throw toError(error);
  }
}

export async function getAnalysisStatus(jobId: string): Promise<AnalysisStatus> {
  try {
    const response = await axios.get(`${backendUrl()}/analyze/${encodeURIComponent(jobId)}`);
    return response.data.data;
  } catch (error) {
    throw toError(error);
  }
}
