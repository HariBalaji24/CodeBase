import axios from "axios";

async function getGithubRepository(url: string) {
  try {
    const response = await axios.post("http://localhost:5000/getrepository", {
      repourl: url,
    });

    return response.data.data;
  } catch (error) {
    /*
     * Surface the backend's message (rate limit, repo not found, ...) so the
     * UI can show the real reason. Re-thrown as a plain Error rather than
     * console.error'd, which would trigger the Next.js dev error overlay for
     * what is an expected, handled condition.
     */
    if (axios.isAxiosError(error)) {
      const message =
        error.response?.data?.message ??
        "Could not reach the analyzer backend. Is it running on port 5000?";

      throw new Error(message);
    }

    throw error;
  }
}

export default getGithubRepository;
