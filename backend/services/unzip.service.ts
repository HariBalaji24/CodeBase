import axios from "axios";
import { UnrecoverableError } from "bullmq";
import unzipper from "unzipper";
import path from "node:path";
import dotenv from "dotenv";
dotenv.config();

export type RepoFile = {
  path: string; // path inside the repo, e.g. "src/index.ts"
  content: string;
};

const MAX_FILE_BYTES = 200 * 1024; // skip anything over 200 KB (minified bundles, lockfiles…)

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "out",
  ".next",
  "coverage",
  "vendor",
  "__pycache__",
  ".venv",
  "venv",
]);

const SKIP_FILES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  "Cargo.lock",
  "poetry.lock",
]);

const TEXT_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".py", ".rb", ".go", ".rs", ".java", ".kt", ".swift",
  ".c", ".h", ".cpp", ".hpp", ".cs", ".php", ".scala",
  ".html", ".css", ".scss", ".vue", ".svelte",
  ".json", ".yml", ".yaml", ".toml", ".xml", ".env.example",
  ".md", ".mdx", ".txt", ".sql", ".graphql", ".prisma", ".sh",
]);

const TEXT_BASENAMES = new Set([
  "Dockerfile", "Makefile", "README", "LICENSE", ".gitignore", ".env.example",
]);

const isTextFile = (filePath: string) => {
  const base = path.basename(filePath);
  if (SKIP_FILES.has(base)) return false;
  if (TEXT_BASENAMES.has(base)) return true;
  return TEXT_EXTENSIONS.has(path.extname(base).toLowerCase());
};

const shouldSkipDir = (filePath: string) =>
  filePath.split("/").some((segment) => SKIP_DIRS.has(segment));

const MAX_ZIP_MB = Number(process.env.MAX_REPO_ZIP_MB) || 50;

// Downloads the repo's default-branch zipball from GitHub as a Buffer.
export const downloadRepoZip = async (owner: string, repo: string): Promise<Buffer> => {
  const url = `https://api.github.com/repos/${owner}/${repo}/zipball`;
  try {
    const response = await axios.get<ArrayBuffer>(url, {
      responseType: "arraybuffer",
      maxRedirects: 5,
      timeout: 120_000, // without this, a stalled connection hangs the job forever
      maxContentLength: MAX_ZIP_MB * 1024 * 1024, // the whole zip is held in memory
      headers: {
        Accept: "application/vnd.github+json",
        ...(process.env.GITHUB_TOKEN
          ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
          : {}),
      },
    });
    return Buffer.from(response.data);
  } catch (error) {
    throw describeDownloadError(error, `${owner}/${repo}`);
  }
};

// Turns axios failures into messages a user can act on. Errors that retrying
// can't fix are UnrecoverableError, so BullMQ fails the job instead of retrying.
const describeDownloadError = (error: unknown, fullName: string): Error => {
  if (!axios.isAxiosError(error)) return error instanceof Error ? error : new Error(String(error));

  const status = error.response?.status;
  if (status === 404) {
    return new UnrecoverableError(`Repository ${fullName} was not found on GitHub. It may be private or renamed.`);
  }
  if (status === 401) {
    return new UnrecoverableError("GitHub rejected GITHUB_TOKEN (401). Check or replace the token in backend/.env.");
  }
  if ((status === 403 || status === 429) && error.response?.headers["x-ratelimit-remaining"] === "0") {
    return new Error("GitHub rate limit reached while downloading. The job will retry automatically.");
  }
  if (error.code === "ERR_BAD_RESPONSE" && /maxContentLength/i.test(error.message)) {
    return new UnrecoverableError(`Repository archive is larger than ${MAX_ZIP_MB} MB, which is too big to index.`);
  }
  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
    return new Error("Downloading the repository from GitHub timed out. The job will retry automatically.");
  }
  return new Error(`Could not download ${fullName} from GitHub: ${status ? `HTTP ${status}` : error.message}`);
};

// Reads a zipball in memory and returns the text files worth indexing.
export const extractTextFiles = async (zip: Buffer): Promise<RepoFile[]> => {
  const directory = await unzipper.Open.buffer(zip);
  const files: RepoFile[] = [];

  for (const entry of directory.files) {
    if (entry.type !== "File") continue;

    // GitHub zipballs wrap everything in "<owner>-<repo>-<sha>/"; drop that prefix.
    const relativePath = entry.path.split("/").slice(1).join("/");
    if (!relativePath) continue;
    if (shouldSkipDir(relativePath)) continue;
    if (!isTextFile(relativePath)) continue;
    if (entry.uncompressedSize > MAX_FILE_BYTES) continue;

    const buffer = await entry.buffer();
    // Cheap binary sniff: a NUL byte means it's not text.
    if (buffer.includes(0)) continue;

    const content = buffer.toString("utf8");
    if (!content.trim()) continue;

    files.push({ path: relativePath, content });
  }

  return files;
};

export const unzipFile = async (owner: string, repo: string): Promise<RepoFile[]> => {
  const zip = await downloadRepoZip(owner, repo);
  return extractTextFiles(zip);
};

export default unzipFile;
