import axios from "axios";
import dotenv from "dotenv";
import type { SearchHit } from "./vectorstore.service.ts";

dotenv.config();

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.GROQ_MODEL ?? "openai/gpt-oss-20b";

export const isLLMAvailable = (): boolean =>
  Boolean(process.env.GROQ_API_KEY);

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type GroqResponse = {
  choices?: Array<{
    message?: { content?: string | null };
    finish_reason?: string | null;
  }>;
};

const chat = async (
  messages: ChatMessage[],
  jsonMode = false,
): Promise<string> => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured.");

  const response = await axios.post<GroqResponse>(
    GROQ_URL,
    {
      model: MODEL,
      messages,
      temperature: 0,
      ...(jsonMode
        ? { response_format: { type: "json_object" } }
        : {}),
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 30_000,
    },
  );

  const content = response.data.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("Groq returned an empty response.");
  }
  return content.trim();
};

const formatContext = (hits: SearchHit[]): string =>
  hits
    .map(
      (hit, index) =>
        `[${index + 1}] File: ${hit.path}\n` +
        `Lines: ${hit.startLine}-${hit.endLine}\n` +
        `Code:\n${hit.content}`,
    )
    .join("\n\n---\n\n");

const ANSWER_SYSTEM_PROMPT = `
You are a codebase assistant. Answer the user's question using only
the numbered code excerpts supplied in the request.

GROUNDING
- Do not invent files, functions, APIs, dependencies, or behavior.
- If the excerpts are insufficient, say what is missing.
- Cite claims using the exact excerpt numbers, such as [1] and [2].
- Put citations next to the claims they support.
- Distinguish directly supported facts from inference.

MANDATORY MARKDOWN
- Return Markdown, not HTML and not a JSON string.
- Use actual newline characters, never literal backslash-n sequences.
- Put each heading on its own line, with a blank line before and after.
- Put each paragraph on its own line, separated by a blank line.
- Put each list item on its own line.
- For tables, put every row on its own line and include a separator row.
- Use inline code for filenames, paths, symbols, variables, and commands.
- Use fenced code blocks with a language identifier for code examples.
- Do not escape Markdown markers unnecessarily. Write **bold**, not \\*\\*bold\\*\\*.
- Never flatten the whole answer, a table, or a list into one line.
- Do not wrap the entire response in a code block.
- Do not force every answer into a table.

STRUCTURE
Choose sections appropriate to the question.
For architecture questions, use an overview, component breakdown, and request flow.
For debugging questions, explain the likely cause, evidence, and fix.
For simple questions, answer directly without unnecessary sections.

Return only the answer.
`.trim();

export const generateAnswer = async (
  query: string,
  hits: SearchHit[],
): Promise<string> => {
  if (!query.trim()) throw new Error("The question cannot be empty.");

  if (hits.length === 0) {
    return (
      "## No relevant code found\n\n" +
      "The retrieval system did not find code excerpts that answer this question."
    );
  }

  return chat([
    { role: "system", content: ANSWER_SYSTEM_PROMPT },
    {
      role: "user",
      content: `
Question:
${query}

Retrieved code excerpts:
${formatContext(hits)}

Answer using the excerpts above. Format the answer as readable Markdown
with actual line breaks. Cite supporting excerpts as [1], [2], and so on.
      `.trim(),
    },
  ]);
};

export type RagJudgeScores = {
  contextPrecision: number;
  contextRecall: number;
  answerRelevance: number;
  faithfulness: number;
  groundedness: number;
  reasoning: string;
};

const clamp01 = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : 0;

/*
 * Evaluation requests should be smaller than answer-generation requests.
 * Sending entire large source files to the evaluator can cause HTTP 413.
 * These limits are character limits, not token limits; lower them if your
 * provider/proxy has a particularly small request-body limit.
 */
const MAX_HIT_CHARS = 1800;
const MAX_CONTEXT_CHARS = 6000;
const MAX_QUERY_CHARS = 1500;
const MAX_ANSWER_CHARS = 4000;

const formatEvaluationContext = (hits: SearchHit[]): string => {
  const blocks: string[] = [];
  let total = 0;

  for (let i = 0; i < hits.length; i += 1) {
    const hit = hits[i];
    if (!hit) continue;

    const header =
      `[${i + 1}] File: ${hit.path}\n` +
      `Lines: ${hit.startLine}-${hit.endLine}\n`;
    const remaining = MAX_CONTEXT_CHARS - total - header.length;

    if (remaining <= 0) break;

    const body = hit.content.slice(
      0,
      Math.max(0, Math.min(MAX_HIT_CHARS, remaining)),
    );
    const block = `${header}${body}`;
    blocks.push(block);
    total += block.length;
  }

  return blocks.join("\n\n---\n\n");
};

const parseJudgeResponse = (raw: string): RagJudgeScores => {
  let value: unknown;

  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("Groq returned invalid JSON for RAG evaluation.");
  }

  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error("Groq returned an invalid RAG evaluation object.");
  }

  const parsed = value as Record<string, unknown>;
  return {
    contextPrecision: clamp01(parsed.contextPrecision),
    contextRecall: clamp01(parsed.contextRecall),
    answerRelevance: clamp01(parsed.answerRelevance),
    faithfulness: clamp01(parsed.faithfulness),
    groundedness: clamp01(parsed.groundedness),
    reasoning:
      typeof parsed.reasoning === "string" ? parsed.reasoning : "",
  };
};

export const judgeRagMetrics = async (
  query: string,
  hits: SearchHit[],
  answer: string,
): Promise<RagJudgeScores> => {
  if (hits.length === 0) {
    return {
      contextPrecision: 0,
      contextRecall: 0,
      answerRelevance: 0,
      faithfulness: 0,
      groundedness: 0,
      reasoning: "No retrieved excerpts were available.",
    };
  }

  const raw = await chat(
    [
      {
        role: "system",
        content: `
You are a strict evaluator of a retrieval-augmented answer.
Return ONLY one valid JSON object with:
{
  "contextPrecision": 0.0,
  "contextRecall": 0.0,
  "answerRelevance": 0.0,
  "faithfulness": 0.0,
  "groundedness": 0.0,
  "reasoning": "brief explanation"
}

Every score must be between 0 and 1.

contextPrecision: proportion of retrieved excerpts relevant to the question.
contextRecall: how completely the retrieved excerpts cover the information
needed to answer the question.
answerRelevance: how directly the answer addresses the question.
faithfulness: how much of the answer's factual content is supported by excerpts.
groundedness: how well the answer can be justified using only those excerpts.

Do not reward formatting alone. Penalize unsupported factual claims.
Do not use Markdown fences around the JSON.
        `.trim(),
      },
      {
        role: "user",
        content: `
Question:
${query.slice(0, MAX_QUERY_CHARS)}

Retrieved excerpts:
${formatEvaluationContext(hits)}

Answer:
${answer.slice(0, MAX_ANSWER_CHARS)}
        `.trim(),
      },
    ],
    true,
  );

  return parseJudgeResponse(raw);
};
