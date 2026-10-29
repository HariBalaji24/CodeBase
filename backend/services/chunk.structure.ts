import { Parser, Language } from "web-tree-sitter";
import type { RepoFile } from "./unzip.service.ts";

export type ChunkType =
  | "imports"
  | "function"
  | "method"
  | "class"
  | "interface"
  | "type"
  | "enum"
  | "constant"
  | "variable"
  | "jsx_element"
  | "comment_block"
  | "other";

export type StructureChunk = {
  id: string;
  path: string;
  startLine: number;
  endLine: number;
  content: string;
  metadata: {
    scope: "global" | "class" | "function" | "block";
    type: ChunkType;
    symbols: string[];
    parentSymbol?: string;
    language: string;
  };
};

const LANGUAGE_MAP: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "tsx",
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".py": "python",
  ".go": "go",
  ".rs": "rust",
  ".java": "java",
  ".kt": "kotlin",
  ".swift": "swift",
  ".c": "c",
  ".h": "c",
  ".cpp": "cpp",
  ".hpp": "cpp",
  ".cs": "c_sharp",
  ".php": "php",
  ".rb": "ruby",
  ".scala": "scala",
  ".json": "json",
  ".yml": "yaml",
  ".yaml": "yaml",
  ".toml": "toml",
  ".html": "html",
  ".css": "css",
  ".scss": "css",
  ".vue": "vue",
  ".svelte": "svelte",
};

const LANGUAGE_URLS: Record<string, string> = {
  typescript: "https://unpkg.com/@tree-sitter/grammars@latest/dist/tree-sitter-typescript.wasm",
  tsx: "https://unpkg.com/@tree-sitter/grammars@latest/dist/tree-sitter-typescript.wasm",
  javascript: "https://unpkg.com/@tree-sitter/grammars@latest/dist/tree-sitter-javascript.wasm",
  python: "https://unpkg.com/@tree-sitter/grammars@latest/dist/tree-sitter-python.wasm",
  go: "https://unpkg.com/@tree-sitter/grammars@latest/dist/tree-sitter-go.wasm",
  rust: "https://unpkg.com/@tree-sitter/grammars@latest/dist/tree-sitter-rust.wasm",
  java: "https://unpkg.com/@tree-sitter/grammars@latest/dist/tree-sitter-java.wasm",
  cpp: "https://unpkg.com/@tree-sitter/grammars@latest/dist/tree-sitter-cpp.wasm",
  c: "https://unpkg.com/@tree-sitter/grammars@latest/dist/tree-sitter-c.wasm",
  c_sharp: "https://unpkg.com/@tree-sitter/grammars@latest/dist/tree-sitter-c-sharp.wasm",
  php: "https://unpkg.com/@tree-sitter/grammars@latest/dist/tree-sitter-php.wasm",
  ruby: "https://unpkg.com/@tree-sitter/grammars@latest/dist/tree-sitter-ruby.wasm",
  json: "https://unpkg.com/@tree-sitter/grammars@latest/dist/tree-sitter-json.wasm",
  yaml: "https://unpkg.com/@tree-sitter/grammars@latest/dist/tree-sitter-yaml.wasm",
  toml: "https://unpkg.com/@tree-sitter/grammars@latest/dist/tree-sitter-toml.wasm",
  html: "https://unpkg.com/@tree-sitter/grammars@latest/dist/tree-sitter-html.wasm",
  css: "https://unpkg.com/@tree-sitter/grammars@latest/dist/tree-sitter-css.wasm",
};

let parser: Parser | null = null;
const loadedLanguages = new Map<string, Language>();
let wasmInitialized = false;

async function initParser(): Promise<Parser> {
  if (parser && wasmInitialized) return parser;

  await Parser.init();
  parser = new Parser();
  wasmInitialized = true;
  return parser;
}

async function loadLanguage(name: string): Promise<Language | null> {
  if (loadedLanguages.has(name)) return loadedLanguages.get(name)!;

  const url = LANGUAGE_URLS[name];
  if (!url) return null;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${url}`);
    const wasm = new Uint8Array(await response.arrayBuffer());
    const language = await Language.load(wasm);
    loadedLanguages.set(name, language);
    return language;
  } catch (error) {
    console.warn(`Failed to load language ${name}:`, error);
    return null;
  }
}

function getLanguageForFile(filePath: string): string | null {
  const ext = filePath.split(".").pop()?.toLowerCase();
  if (!ext) return null;
  return LANGUAGE_MAP[`.${ext}`] || null;
}

function extractSymbols(node: any, source: string): string[] {
  const symbols: string[] = [];

  const walk = (n: any) => {
    if (n.type === "identifier" || n.type === "function_name" || n.type === "class_name" || n.type === "type_identifier") {
      const text = source.slice(n.startIndex, n.endIndex).trim();
      if (text && !symbols.includes(text)) symbols.push(text);
    }
    for (const child of n.children || []) {
      walk(child);
    }
  };

  walk(node);
  return symbols.slice(0, 10);
}

function getNodeType(nodeType: string): ChunkType {
  const typeMap: Record<string, ChunkType> = {
    "import_statement": "imports",
    "import_declaration": "imports",
    "export_statement": "imports",
    "function_declaration": "function",
    "function": "function",
    "arrow_function": "function",
    "function_expression": "function",
    "method_definition": "method",
    "method": "method",
    "class_declaration": "class",
    "class": "class",
    "interface_declaration": "interface",
    "interface": "interface",
    "type_alias_declaration": "type",
    "type": "type",
    "enum_declaration": "enum",
    "enum": "enum",
    "const_declaration": "constant",
    "variable_declaration": "variable",
    "lexical_declaration": "variable",
    "jsx_element": "jsx_element",
    "jsx_self_closing_element": "jsx_element",
    "comment": "comment_block",
  };
  return typeMap[nodeType] || "other";
}

function getScope(node: any): "global" | "class" | "function" | "block" {
  let current = node.parent;
  while (current) {
    if (current.type === "class_declaration" || current.type === "class") return "class";
    if (current.type === "function_declaration" || current.type === "function" ||
        current.type === "arrow_function" || current.type === "method_definition") return "function";
    if (current.type === "block") return "block";
    current = current.parent;
  }
  return "global";
}

function nodeToChunk(
  node: any,
  filePath: string,
  source: string,
  language: string
): StructureChunk | null {
  const startLine = node.startPosition.row + 1;
  const endLine = node.endPosition.row + 1;
  const content = source.slice(node.startIndex, node.endIndex);

  if (!content.trim() || content.length > 5000) return null;

  const symbols = extractSymbols(node, source);
  const type = getNodeType(node.type);
  const scope = getScope(node);

  let parentSymbol: string | undefined;
  let current = node.parent;
  while (current && !parentSymbol) {
    if (current.type === "class_declaration" || current.type === "class" ||
        current.type === "function_declaration" || current.type === "function") {
      const nameNode = current.childForFieldName("name") || current.children.find((c: any) => c.type === "identifier");
      if (nameNode) {
        parentSymbol = source.slice(nameNode.startIndex, nameNode.endIndex);
      }
    }
    current = current.parent;
  }

  return {
    id: `${filePath}:${startLine}-${endLine}`,
    path: filePath,
    startLine,
    endLine,
    content,
metadata: {
    scope,
    type,
    symbols,
    parentSymbol: parentSymbol ?? "",
    language,
  },
  };
}

function extractChunksFromTree(
  tree: any,
  filePath: string,
  source: string,
  language: string
): StructureChunk[] {
  const chunks: StructureChunk[] = [];
  const rootNode = tree.rootNode;

  const nodeTypesToExtract = new Set([
    "import_statement", "import_declaration", "export_statement",
    "function_declaration", "function", "arrow_function", "function_expression",
    "method_definition", "method",
    "class_declaration", "class",
    "interface_declaration", "interface",
    "type_alias_declaration", "type",
    "enum_declaration", "enum",
    "const_declaration", "variable_declaration", "lexical_declaration",
    "jsx_element", "jsx_self_closing_element",
    "comment",
  ]);

  const walk = (node: any) => {
    if (nodeTypesToExtract.has(node.type)) {
      const chunk = nodeToChunk(node, filePath, source, language);
      if (chunk) chunks.push(chunk);
    }
    for (const child of node.children || []) {
      walk(child);
    }
  };

  walk(rootNode);

  if (chunks.length === 0 && source.trim()) {
    chunks.push({
      id: `${filePath}:1-${source.split("\n").length}`,
      path: filePath,
      startLine: 1,
      endLine: source.split("\n").length,
      content: source,
      metadata: {
        scope: "global",
        type: "other",
        symbols: [],
        language,
      },
    });
  }

  return chunks;
}

export async function chunkFileStructureAware(file: RepoFile): Promise<StructureChunk[]> {
  const language = getLanguageForFile(file.path);
  if (!language) {
    return [{
      id: `${file.path}:1-${file.content.split("\n").length}`,
      path: file.path,
      startLine: 1,
      endLine: file.content.split("\n").length,
      content: file.content,
      metadata: { scope: "global", type: "other", symbols: [], language: "unknown" },
    }];
  }

  try {
    await initParser();
    if (!parser) throw new Error("Parser not initialized");

    const lang = await loadLanguage(language);
    if (!lang) {
      console.warn(`No tree-sitter grammar for ${language} (${file.path})`);
      return fallbackChunk(file);
    }

    parser.setLanguage(lang);
    const tree = parser.parse(file.content);
    return extractChunksFromTree(tree, file.path, file.content, language);
  } catch (error) {
    console.warn(`Structure-aware chunking failed for ${file.path}:`, error);
    return fallbackChunk(file);
  }
}

function fallbackChunk(file: RepoFile): StructureChunk[] {
  const lines = file.content.split("\n");
  return [{
    id: `${file.path}:1-${lines.length}`,
    path: file.path,
    startLine: 1,
    endLine: lines.length,
    content: file.content,
    metadata: {
      scope: "global",
      type: "other",
      symbols: [],
      language: getLanguageForFile(file.path) || "unknown",
    },
  }];
}

export async function chunkFilesStructureAware(files: RepoFile[]): Promise<StructureChunk[]> {
  const results: StructureChunk[] = [];
  for (const file of files) {
    const chunks = await chunkFileStructureAware(file);
    results.push(...chunks);
  }
  return results;
}

export function convertToLegacyChunks(chunks: StructureChunk[]): Array<{
  id: string;
  path: string;
  startLine: number;
  endLine: number;
  content: string;
}> {
  return chunks.map((c) => ({
    id: c.id,
    path: c.path,
    startLine: c.startLine,
    endLine: c.endLine,
    content: c.content,
  }));
}