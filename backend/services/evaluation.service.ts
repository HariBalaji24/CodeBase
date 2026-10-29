import type { SearchHit } from "./vectorstore.service.ts";
import { searchIndex } from "./vectorstore.service.ts";
import { embedQuery } from "./embedding.service.ts";


export type GroundTruthItem = {
  query: string;
  relevantPaths: string[]; // file paths that should be retrieved
};

export type RetrievalMetrics = {
  precisionAtK: Record<number, number>;
  recallAtK: Record<number, number>;
  mrr: number;
  ndcgAtK: Record<number, number>;
  meanPrecision: number;
  meanRecall: number;
};

const DEFAULT_K_VALUES = [1, 3, 5, 10];

function computePrecisionAtK(retrieved: string[], relevant: Set<string>, k: number): number {
  const topK = retrieved.slice(0, k);
  if (topK.length === 0) return 0;
  const hits = topK.filter((id) => relevant.has(id)).length;
  return hits / k;
}

function computeRecallAtK(retrieved: string[], relevant: Set<string>, k: number): number {
  if (relevant.size === 0) return 1;
  const topK = retrieved.slice(0, k);
  const hits = topK.filter((id) => relevant.has(id)).length;
  return hits / relevant.size;
}

function computeMRR(retrieved: string[], relevant: Set<string>): number {
  for (let i = 0; i < retrieved.length; i++) {
    const id = retrieved[i];
    if (id !== undefined && relevant.has(id)) return 1 / (i + 1);
  }
  return 0;
}

function computeDCG(retrieved: string[], relevant: Set<string>, k: number): number {
  let dcg = 0;
  for (let i = 0; i < Math.min(k, retrieved.length); i++) {
    const id = retrieved[i];
    const rel = id !== undefined && relevant.has(id) ? 1 : 0;
    dcg += rel / Math.log2(i + 2);
  }
  return dcg;
}

function computeNDCGAtK(retrieved: string[], relevant: Set<string>, k: number): number {
  const dcg = computeDCG(retrieved, relevant, k);
  const idealRetrieved = [...relevant].slice(0, k);
  const idcg = computeDCG(idealRetrieved, relevant, k);
  return idcg === 0 ? 0 : dcg / idcg;
}

const average = (values: number[]): number =>
  values.length === 0 ? 0 : values.reduce((sum, v) => sum + v, 0) / values.length;

export async function evaluateRetrieval(
  owner: string,
  repo: string,
  groundTruth: GroundTruthItem[],
  kValues: number[] = DEFAULT_K_VALUES,
): Promise<RetrievalMetrics> {
  if (groundTruth.length === 0) {
    throw new Error("groundTruth must contain at least one query.");
  }

  const precisionRows: number[][] = [];
  const recallRows: number[][] = [];
  const ndcgRows: number[][] = [];
  const mrrs: number[] = [];

  const maxK = Math.max(...kValues);

  for (const item of groundTruth) {
    const queryEmbedding = await embedQuery(item.query);
    const hits = await searchIndex(owner, repo, queryEmbedding, maxK);

    const retrievedPaths = hits.map((h) => h.path);
    const relevantSet = new Set(item.relevantPaths);

    precisionRows.push(kValues.map((k) => computePrecisionAtK(retrievedPaths, relevantSet, k)));
    recallRows.push(kValues.map((k) => computeRecallAtK(retrievedPaths, relevantSet, k)));
    ndcgRows.push(kValues.map((k) => computeNDCGAtK(retrievedPaths, relevantSet, k)));
    mrrs.push(computeMRR(retrievedPaths, relevantSet));
  }

  const precisionAtK: Record<number, number> = {};
  const recallAtK: Record<number, number> = {};
  const ndcgAtK: Record<number, number> = {};

  kValues.forEach((k, idx) => {
    precisionAtK[k] = average(precisionRows.map((row) => row[idx] ?? 0));
    recallAtK[k] = average(recallRows.map((row) => row[idx] ?? 0));
    ndcgAtK[k] = average(ndcgRows.map((row) => row[idx] ?? 0));
  });

  return {
    precisionAtK,
    recallAtK,
    ndcgAtK,
    mrr: average(mrrs),
    meanPrecision: average(Object.values(precisionAtK)),
    meanRecall: average(Object.values(recallAtK)),
  };
}

export function printMetrics(metrics: RetrievalMetrics): string {
  const lines = [
    "=== Retrieval Evaluation Metrics ===",
    "",
    "Precision@K:",
    ...Object.entries(metrics.precisionAtK).map(([k, v]) => `  P@${k}: ${(v * 100).toFixed(2)}%`),
    "",
    "Recall@K:",
    ...Object.entries(metrics.recallAtK).map(([k, v]) => `  R@${k}: ${(v * 100).toFixed(2)}%`),
    "",
    "NDCG@K:",
    ...Object.entries(metrics.ndcgAtK).map(([k, v]) => `  NDCG@${k}: ${(v * 100).toFixed(2)}%`),
    "",
    `MRR: ${(metrics.mrr * 100).toFixed(2)}%`,
    `Mean Precision: ${(metrics.meanPrecision * 100).toFixed(2)}%`,
    `Mean Recall: ${(metrics.meanRecall * 100).toFixed(2)}%`,
  ];
  return lines.join("\n");
}


export type LiveRetrievalMetrics = {
  precision: number;
  recall: number;
  f1: number;
  mrr: number;
  relevantRetrieved: number;
  relevantInCorpusSample: number;
  threshold: number;
};

const RELEVANCE_THRESHOLD = 0.3; // cosine similarity; embeddings are normalised, so 1 - distance
const CORPUS_SAMPLE_K = 50;

export async function computeLiveRetrievalMetrics(
  owner: string,
  repo: string,
  queryEmbedding: number[],
  retrievedHits: SearchHit[],
): Promise<LiveRetrievalMetrics> {
  const relevantRetrieved = retrievedHits.filter((h) => h.score >= RELEVANCE_THRESHOLD).length;
  const precision = retrievedHits.length === 0 ? 0 : relevantRetrieved / retrievedHits.length;

  // Only re-query the corpus if the caller asked for fewer than the sample
  // size; otherwise the retrieved set already covers the sample itself.
  const corpusSample =
    retrievedHits.length >= CORPUS_SAMPLE_K
      ? retrievedHits
      : await searchIndex(owner, repo, queryEmbedding, CORPUS_SAMPLE_K);
  const relevantInCorpusSample = corpusSample.filter((h) => h.score >= RELEVANCE_THRESHOLD).length;

  const recall = relevantInCorpusSample === 0 ? 1 : relevantRetrieved / relevantInCorpusSample;
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

  const firstRelevantIndex = retrievedHits.findIndex((h) => h.score >= RELEVANCE_THRESHOLD);
  const mrr = firstRelevantIndex === -1 ? 0 : 1 / (firstRelevantIndex + 1);

  return {
    precision,
    recall,
    f1,
    mrr,
    relevantRetrieved,
    relevantInCorpusSample,
    threshold: RELEVANCE_THRESHOLD,
  };
}

/* =========================================================================
   TEXT-OVERLAP METRICS (BLEU, ROUGE-L, token F1). These compare a generated
   answer against a reference answer - they only mean something when you have
   a known-good reference to compare against, which an arbitrary live question
   doesn't have. Exposed for the ground-truth evaluation flow (pass a
   `referenceAnswer` alongside relevantPaths) rather than the live search path.
========================================================================= */

const tokenize = (text: string): string[] => text.toLowerCase().match(/[a-z0-9_]+/g) ?? [];

const ngrams = (tokens: string[], n: number): string[] => {
  const result: string[] = [];
  for (let i = 0; i + n <= tokens.length; i++) result.push(tokens.slice(i, i + n).join(" "));
  return result;
};

const countMap = (items: string[]): Map<string, number> => {
  const map = new Map<string, number>();
  for (const item of items) map.set(item, (map.get(item) ?? 0) + 1);
  return map;
};

// BLEU-4 with brevity penalty (Papineni et al., 2002), smoothed so a single
// short sentence doesn't collapse to exactly 0 on a missing n-gram order.
export function computeBLEU(candidate: string, reference: string, maxN = 4): number {
  const candTokens = tokenize(candidate);
  const refTokens = tokenize(reference);
  if (candTokens.length === 0) return 0;

  const precisions: number[] = [];
  for (let n = 1; n <= maxN; n++) {
    const candGrams = ngrams(candTokens, n);
    if (candGrams.length === 0) {
      precisions.push(0);
      continue;
    }
    const refCounts = countMap(ngrams(refTokens, n));
    const candCounts = countMap(candGrams);
    let clipped = 0;
    for (const [gram, count] of candCounts) clipped += Math.min(count, refCounts.get(gram) ?? 0);
    // +1 smoothing avoids an entire-score-zero from one unmatched higher-order n-gram.
    precisions.push((clipped + 1) / (candGrams.length + 1));
  }

  const logMean = precisions.reduce((sum, p) => sum + Math.log(p), 0) / maxN;
  const brevityPenalty = candTokens.length >= refTokens.length ? 1 : Math.exp(1 - refTokens.length / candTokens.length);
  return brevityPenalty * Math.exp(logMean);
}

// Longest common subsequence, used by ROUGE-L.
const lcsLength = (a: string[], b: string[]): number => {
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const ai = a[i - 1];
      const bj = b[j - 1];
      const diag = dp[i - 1]?.[j - 1] ?? 0;
      const up = dp[i - 1]?.[j] ?? 0;
      const left = dp[i]?.[j - 1] ?? 0;
      dp[i]![j] = ai === bj ? diag + 1 : Math.max(up, left);
    }
  }
  return dp[a.length]?.[b.length] ?? 0;
};

// ROUGE-L F-measure: LCS-based precision/recall between candidate and reference.
export function computeROUGEL(candidate: string, reference: string): number {
  const candTokens = tokenize(candidate);
  const refTokens = tokenize(reference);
  if (candTokens.length === 0 || refTokens.length === 0) return 0;

  const lcs = lcsLength(candTokens, refTokens);
  const precision = lcs / candTokens.length;
  const recall = lcs / refTokens.length;
  return precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
}

// Token-level F1 (the standard SQuAD-style metric): treats both texts as bags
// of words and scores their overlap, ignoring order and repetition.
export function computeTokenF1(candidate: string, reference: string): number {
  const candCounts = countMap(tokenize(candidate));
  const refCounts = countMap(tokenize(reference));
  if (candCounts.size === 0 || refCounts.size === 0) return candCounts.size === refCounts.size ? 1 : 0;

  let overlap = 0;
  for (const [token, count] of candCounts) overlap += Math.min(count, refCounts.get(token) ?? 0);

  const candTotal = [...candCounts.values()].reduce((a, b) => a + b, 0);
  const refTotal = [...refCounts.values()].reduce((a, b) => a + b, 0);
  const precision = overlap / candTotal;
  const recall = overlap / refTotal;
  return precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
}

export type TextOverlapMetrics = { bleu: number; rougeL: number; tokenF1: number };

export const computeTextOverlapMetrics = (candidate: string, reference: string): TextOverlapMetrics => ({
  bleu: computeBLEU(candidate, reference),
  rougeL: computeROUGEL(candidate, reference),
  tokenF1: computeTokenF1(candidate, reference),
});
