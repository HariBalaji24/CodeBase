"use client";
import axios from "axios";
/// <reference types="vite/client" />

async function getGithubRepository(url: string) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
  console.log("backendUrl", backendUrl);
  try {
    const response = await axios.post(`${backendUrl}/getrepository`, {
      repourl: url,
    });

    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message =
        error.response?.data?.message 

      throw new Error(message);
    }

    throw error;
  }
}

export default getGithubRepository;
