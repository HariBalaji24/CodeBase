import axios from "axios";
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

// Downloads the repo's default-branch zipball from GitHub as a Buffer.
export const downloadRepoZip = async (owner: string, repo: string): Promise<Buffer> => {
  const url = `https://api.github.com/repos/${owner}/${repo}/zipball`;
  const response = await axios.get<ArrayBuffer>(url, {
    responseType: "arraybuffer",
    maxRedirects: 5,
    headers: {
      Accept: "application/vnd.github+json",
      ...(process.env.GITHUB_TOKEN
        ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
        : {}),
    },
  });
  return Buffer.from(response.data);
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
