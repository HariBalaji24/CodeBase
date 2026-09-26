"use client";
import axios from "axios";


async function getGithubRepository(url: string) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!backendUrl) {
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
        error.response?.data?.message 

      throw new Error(message);
    }

    throw error;
  }
}

export default getGithubRepository;
