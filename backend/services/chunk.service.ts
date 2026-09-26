import type { RepoFile } from "./unzip.service.ts";

export type Chunk = {
  id: string;
  path: string;
  startLine: number;
  endLine: number;
  content: string;
};

// Sized so a chunk fits the embedding model's 256-token window (roughly
// 800-1000 characters of code). Anything past the window is cut off before
// embedding, which would make the rest of an oversized chunk unsearchable.
const CHUNK_LINES = 30;
const OVERLAP_LINES = 5;
const MAX_CHUNK_CHARS = 1000;

// Splits each file into overlapping line-based windows. Line-based keeps
// chunks aligned with code structure better than raw character slicing.
export const chunkFile = (file: RepoFile): Chunk[] => {
  const lines = file.content.split("\n");
  const chunks: Chunk[] = [];
  let start = 0;

  while (start < lines.length) {
    let end = Math.min(start + CHUNK_LINES, lines.length);
    let content = lines.slice(start, end).join("\n");

    // Guard against very long lines blowing past the model's input size.
    while (content.length > MAX_CHUNK_CHARS && end - start > 1) {
      end -= 1;
      content = lines.slice(start, end).join("\n");
    }
    if (content.length > MAX_CHUNK_CHARS) {
      content = content.slice(0, MAX_CHUNK_CHARS);
    }

    if (content.trim()) {
      chunks.push({
        id: `${file.path}:${start + 1}-${end}`,
        path: file.path,
        startLine: start + 1,
        endLine: end,
        content,
      });
    }

    if (end >= lines.length) break;
    start = Math.max(end - OVERLAP_LINES, start + 1);
  }

  return chunks;
};

export const chunkFiles = (files: RepoFile[]): Chunk[] =>
  files.flatMap(chunkFile);
