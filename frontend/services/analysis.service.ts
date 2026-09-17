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

const backendUrl = () => process.env.NEXT_PUBLIC_BACKEND_URL;

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
