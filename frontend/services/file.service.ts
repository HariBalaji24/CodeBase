"use client";
import axios from "axios";
/// <reference types="vite/client" />

async function getGithubRepository(url: string) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!backendUrl) {
    // NEXT_PUBLIC_* vars are baked in at build time - if this fires, the
    // deploy host's build didn't have NEXT_PUBLIC_BACKEND_URL set. Add it
    // in the host's project settings and redeploy (env changes alone don't
    // update an already-built deployment).
    throw new Error(
      "NEXT_PUBLIC_BACKEND_URL is not set. Add it in your deploy host's environment variables and redeploy.",
    );
  }
  try {
    const response = await axios.post(`${backendUrl}/getrepository`, {
      repourl: url,
    });

    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message =
        error.response?.data?.message ??
        error.message ??
        "Backend request failed. Make sure the API server is running.";

      throw new Error(message);
    }

    throw error;
  }
}

export default getGithubRepository;
