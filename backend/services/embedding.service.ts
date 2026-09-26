import {
  AutoModel,
  AutoTokenizer,
  mean_pooling,
  type PreTrainedModel,
  type PreTrainedTokenizer,
} from "@huggingface/transformers";

// Small sentence-embedding model (384 dims), downloaded from Hugging Face on
// first use (~25 MB) and cached under node_modules/@huggingface/transformers/.cache.
export const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? "Xenova/all-MiniLM-L6-v2";

// This model was trained on inputs of at most 256 tokens; its tokenizer would
// otherwise allow 512. Longer inputs add memory (attention grows with the
// square of the length) without improving the embedding. Capping at 256 cut
// peak memory on a 68-file repo from ~800 MB to ~340 MB, which is what keeps
// indexing inside Render's 512 MB free tier.
const MAX_TOKENS = 256;

// Texts embedded per model call. Bigger is faster but uses more memory
// (~460 MB peak at 16 on the same repo). Raise it locally if you have RAM.
const BATCH_SIZE = Number(process.env.EMBEDDING_BATCH_SIZE) || 4;

type Embedder = { tokenizer: PreTrainedTokenizer; model: PreTrainedModel };

let embedderPromise: Promise<Embedder> | null = null;

const loadEmbedder = async (): Promise<Embedder> => {
  const [tokenizer, model] = await Promise.all([
    AutoTokenizer.from_pretrained(EMBEDDING_MODEL),
    AutoModel.from_pretrained(EMBEDDING_MODEL, {
      dtype: "q8", // 8-bit weights: ~4x smaller than fp32
      // Release inference buffers after each call instead of keeping the peak reserved.
      session_options: { enableCpuMemArena: false },
    }),
  ]);
  return { tokenizer, model };
};

const getEmbedder = () => {
  if (!embedderPromise) {
    embedderPromise = loadEmbedder().catch((err) => {
      embedderPromise = null; // let the next call retry instead of caching the failure
      throw new Error(`Could not load embedding model "${EMBEDDING_MODEL}": ${err.message}`);
    });
  }
  return embedderPromise;
};

// Loads the model ahead of the first job so it doesn't pay the download/startup cost.
export const warmUpEmbeddings = async () => {
  const startedAt = Date.now();
  await getEmbedder();
  return Date.now() - startedAt;
};

export const embedTexts = async (
  texts: string[],
  onBatch?: (done: number, total: number) => void | Promise<void>,
): Promise<number[][]> => {
  const { tokenizer, model } = await getEmbedder();
  const vectors: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const inputs = tokenizer(batch, { padding: true, truncation: true, max_length: MAX_TOKENS });
    const { last_hidden_state } = await model(inputs);
    const pooled = mean_pooling(last_hidden_state, inputs.attention_mask).normalize(2, -1);
    vectors.push(...(pooled.tolist() as number[][]));
    await onBatch?.(Math.min(i + BATCH_SIZE, texts.length), texts.length);
  }

  return vectors;
};

export const embedQuery = async (text: string): Promise<number[]> => {
  const [vector] = await embedTexts([text]);
  return vector ?? [];
};
