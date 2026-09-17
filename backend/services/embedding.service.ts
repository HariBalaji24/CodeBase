import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

// Small, fast sentence-embedding model (384 dims). Downloaded once and cached
// by transformers.js under node_modules/@huggingface/transformers/.cache.
const MODEL_ID = process.env.EMBEDDING_MODEL ?? "Xenova/all-MiniLM-L6-v2";
const BATCH_SIZE = 16;

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

const getExtractor = () => {
  if (!extractorPromise) {
    extractorPromise = pipeline("feature-extraction", MODEL_ID, {
      dtype: "fp32",
    }) as Promise<FeatureExtractionPipeline>;
  }
  return extractorPromise;
};

export const embedTexts = async (
  texts: string[],
  onBatch?: (done: number, total: number) => void | Promise<void>,
): Promise<number[][]> => {
  const extractor = await getExtractor();
  const vectors: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const output = await extractor(batch, { pooling: "mean", normalize: true });
    const rows = output.tolist() as number[][];
    vectors.push(...rows);
    await onBatch?.(Math.min(i + BATCH_SIZE, texts.length), texts.length);
  }

  return vectors;
};

export const embedQuery = async (text: string): Promise<number[]> => {
  const [vector] = await embedTexts([text]);
  return vector ?? [];
};
