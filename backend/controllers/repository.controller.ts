import type { Request, Response } from "express";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const parseRepoUrl = (repourl: string) => {
  const { hostname, pathname } = new URL(repourl);

  if (!hostname.endsWith("github.com")) {
    return null;
  }

  const segments = pathname.split("/").filter(Boolean);
  const owner = segments[0];
  const repo = segments[1]?.replace(/\.git$/, "");

  if (!owner || !repo) {
    return null;
  }

  return { owner, repo };
};

const minutesUntil = (epochSeconds: number) => {
  const diffMs = epochSeconds * 1000 - Date.now();
  return Math.max(1, Math.ceil(diffMs / 60000));
};

const getrepository = async (req: Request, res: Response) => {
  const { repourl } = req.body ?? {};

  if (typeof repourl !== "string" || !repourl.trim()) {
    return res.status(400).json({
      message: "Please enter a GitHub repository URL.",
    });
  }

  let parsed;
  try {
    parsed = parseRepoUrl(repourl.trim());
  } catch {
    parsed = null;
  }

  if (!parsed) {
    return res.status(400).json({
      message: "That does not look like a GitHub repository URL.",
    });
  }

  const { owner, repo } = parsed;

  try {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;
    const response = await axios.get(apiUrl, {
      headers: {
        Accept: "application/vnd.github+json",
        ...(process.env.GITHUB_TOKEN
          ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
          : {}),
      },
    });

    return res.status(200).json({
      message: "Repository data fetched successfully",
      data: response.data,
    });
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const { status, headers } = error.response;
      const remaining = headers["x-ratelimit-remaining"];
      const reset = Number(headers["x-ratelimit-reset"]);

      // GitHub uses 403 (and sometimes 429) for rate limiting.
      if ((status === 403 || status === 429) && remaining === "0") {
        const wait = Number.isFinite(reset) ? minutesUntil(reset) : null;

        return res.status(429).json({
          message: process.env.GITHUB_TOKEN
            ? `GitHub rate limit reached. Try again in ${wait ?? "a few"} minute(s).`
            : `GitHub rate limit reached (60 requests/hour without a token). Try again in ${wait ?? "a few"} minute(s), or add a GITHUB_TOKEN to backend/.env.`,
        });
      }

      if (status === 404) {
        return res.status(404).json({
          message: `Repository "${owner}/${repo}" not found. It may be private or renamed.`,
        });
      }

      console.error(`GitHub API ${status} for ${owner}/${repo}`);

      return res.status(status).json({
        message: `GitHub returned an error (${status}) for ${owner}/${repo}.`,
      });
    }

    console.error(error);

    return res.status(500).json({
      message: "Could not reach GitHub. Check your network connection.",
    });
  }
};

export default { getrepository };
