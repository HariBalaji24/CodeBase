import type { Request, Response } from "express";
import axios from "axios";

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
      headers: { Accept: "application/vnd.github+json" },
    });

    return res.status(200).json({
      message: "Repository data fetched successfully",
      data: response.data,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({ message: "Something went wrong" });
  }
};

export default { getrepository };
