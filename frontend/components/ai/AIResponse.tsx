import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bot,
  Check,
  Copy,
  ExternalLink,
  FileCode2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";

import type {
  SearchHit,
  RetrievalMetrics,
} from "../../services/analysis.service";

interface AIResponseProps {
  message: {
    content: string;
    hits?: SearchHit[];
    metrics?: RetrievalMetrics;
    llmError?: string | null;
  };
  isStreaming?: boolean;
}

/*
 * Normalizes common formatting damage without attempting to invent
 * missing content. The table-row repair handles common flattened Markdown
 * tables whose rows were concatenated as "| cell | |---|---|".
 */
function normalizeMarkdown(input: string): string {
  let text = input
    // Turn literal \n sequences into real line breaks.
    .replace(/\\n/g, "\n")
    // Unescape common Markdown punctuation: \*\*bold\*\* -> **bold**
    .replace(/\\([\\*_[\]`~|])/g, "$1")
    // Separate common horizontal rules followed by headings.
    .replace(/[ \t]+---[ \t]+(?=#{1,6}\s)/g, "\n\n---\n\n")
    // Separate concatenated headings after ordinary text.
    .replace(/[ \t]+(?=#{1,6}\s)/g, "\n\n")
    // Separate numbered/bulleted lists when concatenated to prose.
    .replace(/[ \t]+(?=\d+\.\s+\S)/g, "\n")
    .replace(/[ \t]+(?=[*-]\s+\S)/g, "\n")
    // Repair common flattened table row boundaries before a separator row.
    .replace(/\s+\|\s+(?=[|]?\s*:?-{3,})/g, " |\n|")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // If a markdown table was returned on one line, split row separators
  // when a pipe is followed by another pipe and then a table separator.
  text = text.replace(
    /[ \t]*\|[ \t]*\|([ \t]*:?-{3,})/g,
    " |\n|$1",
  );

  return text;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      console.error("Could not copy to clipboard.");
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-md
        border border-white/10 px-2 py-1 text-xs text-white/60
        hover:bg-white/10 hover:text-white"
      aria-label="Copy code"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function CodeBlock({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  const text = String(children ?? "").replace(/\n$/, "");
  const language = className?.match(/language-([\w-]+)/)?.[1] ?? "code";

  return (
    <div className="my-4 overflow-hidden rounded-xl border
      border-white/10 bg-black/30">
      <div className="flex items-center justify-between
        border-b border-white/10 px-3 py-2">
        <span className="text-xs text-white/40">{language}</span>
        <CopyButton text={text} />
      </div>
      <pre className="overflow-x-auto p-4 text-sm leading-6 text-white/85">
        <code className={className}>{text}</code>
      </pre>
    </div>
  );
}

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="mb-4 mt-6 text-2xl font-bold leading-tight
      text-white first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-3 mt-7 border-b border-white/10 pb-2
      text-xl font-semibold text-white first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-5 text-lg font-semibold text-white">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="mb-2 mt-4 font-semibold text-white">
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="my-3 break-words leading-7 text-white/80">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="my-4 list-disc space-y-2 pl-6 leading-7 text-white/80">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-4 list-decimal space-y-2 pl-6 leading-7 text-white/80">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="pl-1 marker:text-blue-400">{children}</li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-4 border-l-4 border-blue-400/60
      bg-white/[0.03] px-4 py-2 text-white/70">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-6 border-white/10" />,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-400 underline underline-offset-4
        hover:text-blue-300"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-white">{children}</strong>
  ),
  em: ({ children }) => <em className="text-white/90">{children}</em>,
  code: ({ children, className }) => {
    const isBlock = Boolean(className?.includes("language-"));
    return isBlock ? (
      <code className={className}>{children}</code>
    ) : (
      <code className="rounded bg-white/[0.08] px-1.5 py-0.5
        font-mono text-[0.9em] text-cyan-300">
        {children}
      </code>
    );
  },
  pre: ({ children }) => {
    // react-markdown supplies the code element as the pre's child.
    const child = Array.isArray(children) ? children[0] : children;
    if (
      child &&
      typeof child === "object" &&
      "props" in child
    ) {
      const props = child.props as {
        children?: ReactNode;
        className?: string;
      };
      return (
        <CodeBlock className={props.className}>
          {props.children}
        </CodeBlock>
      );
    }
    return <pre className="my-4 overflow-x-auto">{children}</pre>;
  },
  table: ({ children }) => (
    <div className="my-5 w-full overflow-x-auto rounded-lg border border-white/10">
      <table className="w-full border-collapse text-left text-sm">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-white/[0.06] text-white">{children}</thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-white/[0.07]">{children}</tbody>
  ),
  tr: ({ children }) => (
    <tr className="border-b border-white/[0.07] last:border-b-0">
      {children}
    </tr>
  ),
  th: ({ children }) => (
    <th className="whitespace-nowrap px-4 py-3 font-semibold">{children}</th>
  ),
  td: ({ children }) => (
    <td className="min-w-28 px-4 py-3 align-top leading-6 text-white/75">
      {children}
    </td>
  ),
};

function MetricGroup({
  title,
  values,
}: {
  title: string;
  values: Array<{ label: string; value: number | null | undefined }>;
}) {
  const visible = values.filter(
    (item): item is { label: string; value: number } =>
      typeof item.value === "number" && Number.isFinite(item.value),
  );

  if (!visible.length) return null;

  return (
    <section>
      <h3 className="mb-3 text-xs font-semibold uppercase
        tracking-wider text-white/50">
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {visible.map(({ label, value }) => (
          <div
            key={label}
            className="rounded-lg border border-white/10
              bg-white/[0.025] p-3"
          >
            <div className="text-xs text-white/45">{label}</div>
            <div
              className={`mt-2 text-xl font-bold ${
                value >= 0.7
                  ? "text-emerald-400"
                  : value >= 0.4
                    ? "text-amber-400"
                    : "text-red-400"
              }`}
            >
              {Math.round(value * 100)}%
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MetricsPanel({ metrics }: { metrics: RetrievalMetrics }) {
  return (
    <div className="mt-6 space-y-5 border-t border-white/10 pt-5">
      <MetricGroup
        title="Retrieval Quality"
        values={[
          { label: "Precision", value: metrics.precision },
          { label: "Recall", value: metrics.recall },
          { label: "F1 Score", value: metrics.f1 },
          { label: "MRR", value: metrics.mrr },
        ]}
      />
      <MetricGroup
        title="Answer Quality"
        values={[
          { label: "Context Precision", value: metrics.contextPrecision },
          { label: "Context Recall", value: metrics.contextRecall },
          { label: "Answer Relevance", value: metrics.answerRelevance },
          { label: "Faithfulness", value: metrics.faithfulness },
          { label: "Groundedness", value: metrics.groundedness },
        ]}
      />
    </div>
  );
}

function SourcesPanel({ hits }: { hits: SearchHit[] }) {
  const [expanded, setExpanded] = useState(false);

  if (!hits.length) return null;

  return (
    <section data-source-panel className="mt-5 border-t border-white/10 pt-4">
      <button
        type="button"
        onClick={() => setExpanded((previous) => !previous)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3
          text-sm font-medium text-white/70 hover:text-white"
      >
        <span className="flex items-center gap-2">
          <FileCode2 size={16} />
          Retrieved Sources ({hits.length})
        </span>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {expanded && (
        <div className="mt-4 space-y-3">
          {hits.map((hit, index) => (
            <article
              key={`${hit.path}-${hit.startLine}-${index}`}
              id={`source-${index + 1}`}
              className="scroll-mt-6 rounded-lg border
                border-white/10 bg-black/20 p-3"
            >
              <div className="flex flex-wrap items-center
                justify-between gap-2">
                <span className="flex items-center gap-2 break-all
                  font-mono text-xs text-blue-300">
                  <FileCode2 size={13} />
                  {hit.path}
                </span>
                <span className="text-xs text-white/40">
                  Lines {hit.startLine}-{hit.endLine}
                </span>
              </div>
              <pre className="mt-3 max-h-64 overflow-auto
                whitespace-pre-wrap break-words rounded-md
                bg-black/30 p-3 font-mono text-xs leading-5
                text-white/70">
                {hit.content}
              </pre>
              <div className="mt-2 flex items-center justify-between gap-3">
                {typeof hit.score === "number" && (
                  <span className="text-xs text-white/40">
                    Score: {hit.score.toFixed(3)}
                  </span>
                )}
                <CopyButton text={hit.content} />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function AIResponse({
  message,
  isStreaming = false,
}: AIResponseProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const markdown = normalizeMarkdown(message.content);

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [message.content, isStreaming]);

  const jumpToSource = (index: number) => {
    const sourcePanel = document.querySelector("[data-source-panel]");
    const source = document.getElementById(`source-${index + 1}`);

    if (source) {
      source.scrollIntoView({ behavior: "smooth", block: "center" });
    } else if (sourcePanel) {
      sourcePanel.scrollIntoView({ behavior: "smooth", block: "center" });
      // Open the source list so the requested excerpt becomes visible.
      const button = sourcePanel.querySelector("button");
      if (button?.getAttribute("aria-expanded") !== "true") {
        button?.click();
      }
      window.setTimeout(() => {
        document.getElementById(`source-${index + 1}`)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 50);
    }
  };

  return (
    <div className="flex w-full items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center
        justify-center rounded-xl bg-gradient-to-br
        from-blue-500 to-violet-600">
        <Bot size={18} className="text-white" />
      </div>

      <div className="min-w-0 w-full max-w-5xl">
        <div className="overflow-hidden rounded-2xl border
          border-white/[0.08] bg-white/[0.025] p-4 sm:p-6">
          <div className="mb-4 flex items-center gap-2
            text-sm font-semibold text-white">
            <MessageSquareIcon />
            Answer
          </div>

          {markdown ? (
            <div className="min-w-0">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {markdown}
              </ReactMarkdown>
              {isStreaming && (
                <span
                  className="ml-1 inline-block h-4 w-1
                    animate-pulse bg-blue-400"
                  aria-label="Generating response"
                />
              )}
            </div>
          ) : isStreaming ? (
            <p className="py-3 text-sm text-white/50">
              Generating answer...
            </p>
          ) : (
            <p className="text-sm text-white/50">
              No answer was returned.
            </p>
          )}

          {message.llmError && (
            <div className="mt-5 flex items-start gap-2 rounded-lg
              border border-amber-400/20 bg-amber-400/[0.05]
              p-3 text-sm text-amber-300">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">
                  Generated-answer metrics unavailable
                </p>
                <p className="mt-1 break-words text-amber-200/70">
                  {message.llmError}
                </p>
              </div>
            </div>
          )}

          {!isStreaming && message.metrics && (
            <MetricsPanel metrics={message.metrics} />
          )}

          {!isStreaming && message.hits && (
            <SourcesPanel hits={message.hits} />
          )}
        </div>

        {!isStreaming && message.hits && message.hits.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.hits.slice(0, 5).map((hit, index) => (
              <button
                type="button"
                key={`${hit.path}-${hit.startLine}-${index}`}
                onClick={() => jumpToSource(index)}
                className="inline-flex max-w-full items-center
                  gap-1.5 rounded-md border border-blue-400/20
                  bg-blue-400/[0.05] px-2 py-1 text-xs
                  text-blue-300 hover:bg-blue-400/10"
                title={`${hit.path}:${hit.startLine}-${hit.endLine}`}
              >
                <FileCode2 size={12} />
                <span className="max-w-48 truncate">
                  [{index + 1}] {hit.path}
                </span>
                <ExternalLink size={10} />
              </button>
            ))}
          </div>
        )}
        <div ref={endRef} aria-hidden="true" />
      </div>
    </div>
  );
}

function MessageSquareIcon() {
  return <span aria-hidden="true" className="text-blue-400">✦</span>;
}

export default AIResponse;
