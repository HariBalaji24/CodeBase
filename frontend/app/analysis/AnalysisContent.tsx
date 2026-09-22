"use client";

import { useEffect, useState, type ReactNode } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Bot,
  Check,
  ChevronRight,
  Code2,
  Command,
  Database,
  Download,
  FileCode2,
  FolderGit2,
  GitBranch,
  Loader2,
  Network,
  PanelLeft,
  Save,
  Scissors,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";

import {
  startAnalysis,
  getAnalysisStatus,
  searchRepository,
  type AnalysisStatus as AnalysisJobStatus,
  type SearchHit,
} from "../../services/analysis.service";

/* =========================================================
   TYPES
========================================================= */

type StepStatus = "queued" | "running" | "complete" | "failed";

interface AnalysisStep {
  key: string;
  title: string;
  icon: ReactNode;
  status: StepStatus;
}

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  hits?: SearchHit[];
}

// Real pipeline order, matching workers/repo.worker.ts on the backend.
const STAGE_ORDER = ["downloading", "parsing", "chunking", "embedding", "saving"] as const;

const STAGE_LABELS: Record<string, string> = {
  queued: "Queued for analysis",
  waiting: "Waiting for a worker",
  delayed: "Retrying shortly",
  active: "Starting analysis",
  downloading: "Downloading repository zip",
  parsing: "Extracting source files",
  chunking: "Splitting files into chunks",
  embedding: "Embedding code chunks",
  saving: "Saving repository index",
  completed: "Analysis complete",
  failed: "Analysis failed",
};

const STAGE_ICONS: Record<(typeof STAGE_ORDER)[number], ReactNode> = {
  downloading: <Download />,
  parsing: <FileCode2 />,
  chunking: <Scissors />,
  embedding: <Database />,
  saving: <Save />,
};

/* =========================================================
   PAGE
========================================================= */

export function AnalysisContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const repo =
    searchParams.get("repo") ??
    (typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("repo")
      : null) ??
    "";

  const { owner, name } = parseOwnerRepo(repo);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [searching, setSearching] = useState(false);

  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [analysisStage, setAnalysisStage] = useState<string>("queued");
  const [analysisError, setAnalysisError] = useState("");
  const [analysisResult, setAnalysisResult] = useState<{
    files: number;
    chunks: number;
  } | null>(null);

  /* =======================================================
     REAL ANALYSIS PROGRESS
     POST /analyze queues a BullMQ job that downloads the
     repo zip, parses + chunks it and embeds every chunk.
     We poll GET /analyze/:jobId until it finishes.
  ======================================================= */

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (!repo) return;

    const applyStatus = (status: AnalysisJobStatus) => {
      if (status.state === "completed") {
        setAnalysisProgress(100);
        setAnalysisStage("completed");
        setAnalysisComplete(true);
        if (status.result) setAnalysisResult(status.result);
        else if (typeof status.files === "number" && typeof status.chunks === "number") {
          setAnalysisResult({ files: status.files, chunks: status.chunks });
        }
        return true;
      }

      if (status.state === "failed") {
        setAnalysisError(status.error || "Repository analysis failed.");
        setAnalysisStage("failed");
        return true;
      }

      const progress = status.progress;
      if (progress && typeof progress === "object") {
        setAnalysisProgress(progress.percent);
        setAnalysisStage(progress.stage);
      } else if (typeof progress === "number") {
        setAnalysisProgress(progress);
      } else {
        setAnalysisStage(status.state);
      }

      return false;
    };

    const poll = async (jobId: string) => {
      if (cancelled) return;

      try {
        const status = await getAnalysisStatus(jobId);
        if (cancelled || applyStatus(status)) return;
      } catch (err) {
        console.error(err);
      }

      timer = setTimeout(() => poll(jobId), 1500);
    };

    const start = async () => {
      try {
        const status = await startAnalysis(repo);
        if (cancelled) return;
        if (!applyStatus(status)) {
          poll(status.jobId);
        }
      } catch (err) {
        console.error(err);
        setAnalysisError(err instanceof Error ? err.message : "Unable to start repository analysis.");
        setAnalysisStage("failed");
      }
    };

    start();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [repo]);

  /* =======================================================
     ASK - real semantic search over the indexed repo
  ======================================================= */

  const askQuestion = async (question?: string) => {
    const value = question || input.trim();
    if (!value || !analysisComplete || !owner || !name) return;

    const userMessage: ChatMessage = { id: Date.now(), role: "user", content: value };
    setMessages((previous) => [...previous, userMessage]);
    setInput("");
    setSearching(true);

    try {
      const hits = await searchRepository(owner, name, value);
      const assistantMessage: ChatMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: hits.length
          ? `Found ${hits.length} relevant code chunk${hits.length === 1 ? "" : "s"}:`
          : "No relevant code was found for that question.",
        hits,
      };
      setMessages((previous) => [...previous, assistantMessage]);
    } catch (err) {
      setMessages((previous) => [
        ...previous,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: err instanceof Error ? err.message : "Search failed.",
        },
      ]);
    } finally {
      setSearching(false);
    }
  };

  const statusLabel = analysisComplete
    ? "Ready"
    : analysisError
      ? "Failed"
      : `${analysisProgress}% · ${STAGE_LABELS[analysisStage] ?? analysisStage}`;

  return (
    <main className="relative flex h-screen overflow-hidden bg-[#050608] text-white">
      <Background />

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 270, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="relative z-40 hidden shrink-0 overflow-hidden border-r border-white/[0.07] bg-[#08090c]/90 lg:block"
          >
            <div className="flex h-full w-[270px] flex-col">
              {/* Logo */}
              <div className="flex h-[72px] items-center border-b border-white/[0.07] px-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-400/[0.07]">
                    <Code2 size={19} className="text-blue-400" />
                  </div>
                  <div>
                    <div className="text-sm font-bold">CodeBase</div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/25">
                      Intelligence
                    </div>
                  </div>
                </div>
              </div>

              {/* Repository */}
              <div className="border-b border-white/[0.07] p-4">
                <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/20">
                  Repository
                </div>

                <a
                  href={repo}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 transition hover:border-blue-400/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-400/[0.07]">
                      <FolderGit2 size={17} className="text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-white/75">
                        {owner && name ? `${owner}/${name}` : "Repository"}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-[10px] text-white/25">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            analysisError
                              ? "bg-red-400"
                              : analysisComplete
                                ? "bg-emerald-400"
                                : "bg-blue-400"
                          }`}
                        />
                        {analysisError ? "Failed" : analysisComplete ? "Indexed" : "Indexing…"}
                      </div>
                    </div>
                  </div>
                </a>

                {analysisResult && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <SidebarStat label="Files" value={analysisResult.files} />
                    <SidebarStat label="Chunks" value={analysisResult.chunks} />
                  </div>
                )}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* HEADER */}
        <header className="z-30 flex h-[72px] shrink-0 items-center justify-between border-b border-white/[0.07] bg-[#050608]/80 px-5 backdrop-blur-2xl sm:px-7">
          <div className="flex min-w-0 items-center gap-4">
            <button
              onClick={() => setSidebarOpen((value) => !value)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025] text-white/40 transition hover:bg-white/[0.06] hover:text-white"
            >
              <PanelLeft size={17} />
            </button>

            <div className="hidden h-5 w-px bg-white/10 sm:block" />

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <FolderGit2 size={15} className="shrink-0 text-blue-400" />
                <span className="truncate text-sm font-semibold text-white/75">
                  {owner && name ? `${owner}/${name}` : "Repository"}
                </span>
              </div>
              <div className="mt-1 hidden items-center gap-2 text-[10px] text-white/25 sm:flex">
                <span>Repository Intelligence</span>
                <span>•</span>
                <span>{analysisComplete ? "Analysis complete" : "Analyzing repository"}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 sm:flex">
              <motion.span
                animate={{ opacity: analysisComplete ? 1 : [0.3, 1, 0.3] }}
                transition={{ duration: 1.4, repeat: analysisComplete ? 0 : Infinity }}
                className={`h-2 w-2 rounded-full ${
                  analysisError
                    ? "bg-red-400"
                    : analysisComplete
                      ? "bg-emerald-400"
                      : "bg-blue-400"
                }`}
              />
              <span className="text-xs text-white/40">{statusLabel}</span>
            </div>

            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-xs text-white/40 transition hover:text-white"
            >
              <ArrowLeft size={14} />
              <span className="hidden sm:block">Repository</span>
            </button>
          </div>
        </header>

        {/* WORKSPACE */}
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[1200px] px-5 py-8 sm:px-8 lg:px-10">
              {/* Hero / progress */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6 sm:p-8 lg:p-10"
              >
                <div className="max-w-3xl">
                  <div className="mb-4 flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-400/[0.08]">
                      <Sparkles size={14} className="text-blue-400" />
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300/70">
                      Repository Intelligence
                    </span>
                  </div>

                  <h1 className="text-3xl font-bold tracking-[-0.035em] text-white sm:text-4xl lg:text-5xl">
                    Understand your codebase.
                  </h1>

                  <p className="mt-4 max-w-2xl text-sm leading-7 text-white/40 sm:text-base">
                    CodeBase downloads, chunks and embeds your repository so you can search and
                    ask questions about it in plain language.
                  </p>
                </div>

                {analysisError ? (
                  <div className="mt-8 flex items-start gap-3 rounded-xl border border-red-400/15 bg-red-400/[0.04] px-4 py-3">
                    <AlertTriangle size={17} className="mt-0.5 shrink-0 text-red-400" />
                    <div>
                      <div className="text-sm font-medium text-red-300">Analysis failed</div>
                      <div className="mt-0.5 text-xs text-white/40">{analysisError}</div>
                    </div>
                  </div>
                ) : !analysisComplete ? (
                  <div className="mt-8 max-w-2xl">
                    <div className="mb-2 flex justify-between text-xs">
                      <span className="text-white/30">
                        {STAGE_LABELS[analysisStage] ?? "Building repository index"}
                      </span>
                      <span className="font-mono text-blue-300/60">{analysisProgress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
                      <motion.div
                        animate={{ width: `${analysisProgress}%` }}
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-400"
                      />
                    </div>
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 flex items-center gap-3 rounded-xl border border-emerald-400/10 bg-emerald-400/[0.035] px-4 py-3"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/[0.08]">
                      <Check size={15} className="text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-emerald-300">
                        Repository analysis ready
                      </div>
                      <div className="mt-0.5 text-xs text-white/25">
                        Ask questions about the repository below.
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.section>

              {/* Real metrics - only shown once we have real numbers */}
              {analysisResult && (
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Metric icon={<FileCode2 />} label="Files Indexed" value={analysisResult.files} color="blue" />
                  <Metric icon={<Database />} label="Chunks Embedded" value={analysisResult.chunks} color="cyan" />
                  <Metric icon={<Check />} label="Status" value="Ready" color="emerald" isText />
                </div>
              )}

              {/* Pipeline timeline - reflects the real worker stages */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mt-5 overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.025]"
              >
                <div className="border-b border-white/[0.07] px-5 py-5 sm:px-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400/[0.07]">
                      <Network size={17} className="text-emerald-300" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-white/75 sm:text-base">
                        Pipeline
                      </h2>
                      <p className="mt-0.5 text-xs text-white/25">
                        What the worker has processed so far
                      </p>
                    </div>
                  </div>
                </div>

                <PipelineTimeline stage={analysisStage} failed={Boolean(analysisError)} />
              </motion.section>

              {/* Ask CodeBase - real semantic search */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="mt-5 overflow-hidden rounded-3xl border border-blue-400/10 bg-gradient-to-br from-blue-500/[0.055] via-violet-500/[0.025] to-transparent"
              >
                <div className="p-5 sm:p-7 lg:p-8">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-400/[0.08]">
                      <Bot size={21} className="text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-white sm:text-xl">Ask CodeBase</h2>
                      <p className="mt-1 text-xs leading-5 text-white/30 sm:text-sm">
                        {analysisComplete
                          ? "Search the repository using natural language."
                          : "Available once indexing finishes."}
                      </p>
                    </div>
                  </div>

                  {analysisComplete && (
                    <div className="mt-6 grid gap-2 sm:grid-cols-2">
                      <SuggestedQuestion
                        icon={<Network />}
                        text="How is the application structured?"
                        onClick={() => askQuestion("How is the application structured?")}
                      />
                      <SuggestedQuestion
                        icon={<ShieldCheck />}
                        text="Where is authentication implemented?"
                        onClick={() => askQuestion("Where is authentication implemented?")}
                      />
                      <SuggestedQuestion
                        icon={<GitBranch />}
                        text="Explain the main dependencies"
                        onClick={() => askQuestion("Explain the main dependencies")}
                      />
                      <SuggestedQuestion
                        icon={<Code2 />}
                        text="What are the most important files?"
                        onClick={() => askQuestion("What are the most important files?")}
                      />
                    </div>
                  )}

                  {messages.length > 0 && (
                    <div className="mt-6 space-y-4 border-t border-white/[0.07] pt-6">
                      {messages.map((message) => (
                        <Message key={message.id} message={message} />
                      ))}
                      {searching && (
                        <div className="flex items-center gap-2 text-xs text-white/30">
                          <Loader2 size={13} className="animate-spin" />
                          Searching the repository…
                        </div>
                      )}
                    </div>
                  )}

                  <div className="relative mt-6">
                    <div className="rounded-2xl border border-white/[0.1] bg-[#07080b]/80 p-2 shadow-2xl shadow-blue-500/[0.04] backdrop-blur-xl">
                      <div className="flex items-end gap-2">
                        <textarea
                          value={input}
                          onChange={(event) => setInput(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" && !event.shiftKey) {
                              event.preventDefault();
                              askQuestion();
                            }
                          }}
                          disabled={!analysisComplete}
                          placeholder={
                            analysisComplete
                              ? "Ask anything about this repository..."
                              : "Indexing in progress..."
                          }
                          rows={1}
                          className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-2 py-3 text-sm text-white outline-none placeholder:text-white/20 disabled:cursor-not-allowed sm:text-base"
                        />
                        <button
                          onClick={() => askQuestion()}
                          disabled={!input.trim() || !analysisComplete}
                          className="mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-white/[0.04] disabled:text-white/20"
                        >
                          <ArrowUpRight size={18} />
                        </button>
                      </div>

                      <div className="mt-1 flex items-center justify-between px-3 pb-1">
                        <div className="flex items-center gap-3 text-[10px] text-white/20">
                          <span className="flex items-center gap-1.5">
                            <Sparkles size={11} />
                            Semantic search
                          </span>
                          <span className="hidden items-center gap-1.5 sm:flex">
                            <Command size={11} />
                            Enter to ask
                          </span>
                        </div>
                        <span className="font-mono text-[10px] text-white/15">CODEBASE AI</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.section>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/* =========================================================
   BACKGROUND
========================================================= */

function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)
          `,
          backgroundSize: "55px 55px",
        }}
      />
      <motion.div
        animate={{ x: [0, 30, 0], y: [0, 25, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-[10%] top-[-300px] h-[600px] w-[600px] rounded-full bg-blue-600/[0.05] blur-[150px]"
      />
      <motion.div
        animate={{ x: [0, -30, 0], y: [0, 30, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute right-[-250px] top-[30%] h-[600px] w-[600px] rounded-full bg-violet-600/[0.04] blur-[160px]"
      />
    </div>
  );
}

/* =========================================================
   PIPELINE TIMELINE - reflects real worker stages
========================================================= */

function PipelineTimeline({ stage, failed }: { stage: string; failed: boolean }) {
  const currentIndex = STAGE_ORDER.indexOf(stage as (typeof STAGE_ORDER)[number]);
  const isComplete = stage === "completed";

  const steps: AnalysisStep[] = STAGE_ORDER.map((key, index) => {
    let status: StepStatus = "queued";
    if (failed && (currentIndex === index || currentIndex === -1)) status = "failed";
    else if (isComplete || (currentIndex !== -1 && index < currentIndex)) status = "complete";
    else if (currentIndex === index) status = "running";

    return { key, title: STAGE_LABELS[key] ?? key, icon: STAGE_ICONS[key], status };
  });

  return (
    <div className="divide-y divide-white/[0.05]">
      {steps.map((step, index) => (
        <motion.div
          key={step.key}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.08 }}
          className="flex items-center gap-4 px-5 py-4 sm:px-6"
        >
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              step.status === "complete"
                ? "bg-emerald-400/[0.07] text-emerald-400"
                : step.status === "running"
                  ? "bg-blue-400/[0.07] text-blue-400"
                  : step.status === "failed"
                    ? "bg-red-400/[0.07] text-red-400"
                    : "bg-white/[0.035] text-white/20"
            }`}
          >
            {step.status === "complete" ? (
              <Check size={17} />
            ) : step.status === "failed" ? (
              <AlertTriangle size={17} />
            ) : (
              step.icon
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-white/65">{step.title}</div>
          </div>

          <div>
            {step.status === "complete" && (
              <span className="rounded-full border border-emerald-400/10 bg-emerald-400/[0.04] px-2.5 py-1 text-[10px] font-medium text-emerald-300/60">
                Complete
              </span>
            )}
            {step.status === "running" && (
              <motion.span
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.3, repeat: Infinity }}
                className="rounded-full border border-blue-400/10 bg-blue-400/[0.04] px-2.5 py-1 text-[10px] text-blue-300/60"
              >
                Processing
              </motion.span>
            )}
            {step.status === "failed" && (
              <span className="rounded-full border border-red-400/10 bg-red-400/[0.04] px-2.5 py-1 text-[10px] text-red-300/60">
                Failed
              </span>
            )}
            {step.status === "queued" && <span className="text-[10px] text-white/15">Queued</span>}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* =========================================================
   METRIC
========================================================= */

function Metric({
  icon,
  label,
  value,
  color,
  isText = false,
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  color: string;
  isText?: boolean;
}) {
  const styles: Record<string, string> = {
    blue: "bg-blue-400/[0.07] text-blue-400",
    violet: "bg-violet-400/[0.07] text-violet-400",
    cyan: "bg-cyan-400/[0.07] text-cyan-400",
    emerald: "bg-emerald-400/[0.07] text-emerald-400",
  };

  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 sm:p-5"
    >
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${styles[color]}`}>
        {icon}
      </div>
      <div className="mt-4 text-xl font-bold text-white sm:text-2xl">
        {isText ? value : typeof value === "number" ? value.toLocaleString() : value}
      </div>
      <div className="mt-1 text-xs text-white/30">{label}</div>
    </motion.div>
  );
}

/* =========================================================
   SIDEBAR STAT
========================================================= */

function SidebarStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
      <div className="text-sm font-semibold text-white/70">{value.toLocaleString()}</div>
      <div className="text-[10px] text-white/25">{label}</div>
    </div>
  );
}

/* =========================================================
   SUGGESTED QUESTION
========================================================= */

function SuggestedQuestion({
  icon,
  text,
  onClick,
}: {
  icon: ReactNode;
  text: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="group flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5 text-left transition hover:border-blue-400/15 hover:bg-blue-400/[0.035]"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.035] text-white/30 transition group-hover:bg-blue-400/[0.07] group-hover:text-blue-400">
        {icon}
      </div>
      <span className="flex-1 text-xs font-medium text-white/45 transition group-hover:text-white/70 sm:text-sm">
        {text}
      </span>
      <ChevronRight
        size={14}
        className="text-white/15 transition group-hover:translate-x-0.5 group-hover:text-blue-400"
      />
    </motion.button>
  );
}

/* =========================================================
   MESSAGE
========================================================= */

function Message({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-400/[0.07] text-blue-400">
          <Bot size={15} />
        </div>
      )}

      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
          isUser
            ? "bg-blue-500 text-white"
            : "border border-white/[0.07] bg-white/[0.025] text-white/45"
        }`}
      >
        <div>{message.content}</div>

        {message.hits && message.hits.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.hits.map((hit) => (
              <div
                key={hit.id}
                className="rounded-lg border border-white/[0.07] bg-black/20 p-3"
              >
                <div className="flex items-center justify-between gap-2 font-mono text-[10px] text-white/30">
                  <span className="truncate">
                    {hit.path}:{hit.startLine}-{hit.endLine}
                  </span>
                  <span className="shrink-0 text-blue-300/50">{hit.score.toFixed(2)}</span>
                </div>
                <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-white/55">
                  {hit.content.slice(0, 600)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* =========================================================
   HELPERS
========================================================= */

function parseOwnerRepo(url: string): { owner: string; name: string } {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.replace(/^\/+|\/+$/g, "").split("/");
    const owner = segments[0] ?? "";
    const name = (segments[1] ?? "").replace(/\.git$/, "");
    return { owner, name };
  } catch {
    return { owner: "", name: "" };
  }
}
