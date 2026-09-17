"use client";

import {
  Suspense,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Bot,
  Boxes,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Code2,
  Command,
  Database,
  FileCode2,
  FileJson,
  Folder,
  FolderGit2,
  GitBranch,
  GitCommit,
  GitPullRequest,
  HardDrive,
  Layers3,
  MessageSquare,
  Network,
  Package,
  PanelLeft,
  Search,
  Server,
  Settings2,
  ShieldCheck,
  Sparkles,
  Terminal,
  Upload,
  Users,
  Zap,
} from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";

import {
  startAnalysis,
  getAnalysisStatus,
  type AnalysisStatus as AnalysisJobStatus,
} from "../../services/analysis.service";

/* =========================================================
   TYPES
========================================================= */

type AnalysisStatus =
  | "queued"
  | "running"
  | "complete";

interface AnalysisStep {
  title: string;
  description: string;
  icon: ReactNode;
  status: AnalysisStatus;
}

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
}

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

/* =========================================================
   PAGE
========================================================= */

export default function AnalysisPage() {
  return (
    <Suspense fallback={<div className="h-screen w-full bg-[#050608]" />}>
      <AnalysisContent />
    </Suspense>
  );
}

function AnalysisContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const repo =
    searchParams.get("repo") ||
    "https://github.com/example/repository";

  const [sidebarOpen, setSidebarOpen] =
    useState(true);

  const [input, setInput] = useState("");

  const [activeView, setActiveView] =
    useState("overview");

  const [messages, setMessages] =
    useState<ChatMessage[]>([]);

  const [analysisProgress, setAnalysisProgress] =
    useState(0);

  const [analysisComplete, setAnalysisComplete] =
    useState(false);

  const [analysisStage, setAnalysisStage] =
    useState<string>("queued");

  const [analysisError, setAnalysisError] =
    useState("");

  /* =======================================================
     REAL ANALYSIS PROGRESS
     POST /analyze queues a BullMQ job that downloads the
     repo zip, parses + chunks it and embeds every chunk.
     We poll GET /analyze/:jobId until it finishes.
  ======================================================= */

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const applyStatus = (status: AnalysisJobStatus) => {
      if (status.state === "completed") {
        setAnalysisProgress(100);
        setAnalysisStage("completed");
        setAnalysisComplete(true);
        return true;
      }

      if (status.state === "failed") {
        setAnalysisError(
          status.error || "Repository analysis failed."
        );
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
        setAnalysisError(
          err instanceof Error
            ? err.message
            : "Unable to start repository analysis."
        );
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
     ASK
  ======================================================= */

  const askQuestion = (
    question?: string
  ) => {
    const value =
      question || input.trim();

    if (!value) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      role: "user",
      content: value,
    };

    setMessages((previous) => [
      ...previous,
      userMessage,
    ]);

    setInput("");

    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content:
          "I’ve analyzed the repository context available to CodeBase. This workspace will eventually return a grounded answer based on the repository files, dependencies and architecture graph.",
      };

      setMessages((previous) => [
        ...previous,
        assistantMessage,
      ]);
    }, 700);
  };

  return (
    <main className="relative flex h-screen overflow-hidden bg-[#050608] text-white">

      <Background />

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{
              width: 0,
              opacity: 0,
            }}
            animate={{
              width: 270,
              opacity: 1,
            }}
            exit={{
              width: 0,
              opacity: 0,
            }}
            className="relative z-40 hidden shrink-0 overflow-hidden border-r border-white/[0.07] bg-[#08090c]/90 lg:block"
          >
            <div className="flex h-full w-[270px] flex-col">

              {/* Logo */}

              <div className="flex h-[72px] items-center border-b border-white/[0.07] px-5">
                <div className="flex items-center gap-3">

                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-400/[0.07]">
                    <Code2
                      size={19}
                      className="text-blue-400"
                    />
                  </div>

                  <div>
                    <div className="text-sm font-bold">
                      CodeBase
                    </div>

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

                <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">

                  <div className="flex items-center gap-3">

                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-400/[0.07]">
                      <FolderGit2
                        size={17}
                        className="text-blue-400"
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-white/75">
                        {getRepoName(repo)}
                      </div>

                      <div className="mt-1 flex items-center gap-1.5 text-[10px] text-white/25">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Connected
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation */}

              <div className="flex-1 overflow-y-auto p-4">

                <SidebarGroup title="Repository">

                  <SidebarItem
                    icon={<Activity />}
                    label="Overview"
                    active={
                      activeView ===
                      "overview"
                    }
                    onClick={() =>
                      setActiveView(
                        "overview"
                      )
                    }
                  />

                  <SidebarItem
                    icon={<Folder />}
                    label="Files"
                    active={
                      activeView ===
                      "files"
                    }
                    onClick={() =>
                      setActiveView("files")
                    }
                  />

                  <SidebarItem
                    icon={<Network />}
                    label="Architecture"
                    active={
                      activeView ===
                      "architecture"
                    }
                    onClick={() =>
                      setActiveView(
                        "architecture"
                      )
                    }
                  />

                  <SidebarItem
                    icon={<Package />}
                    label="Dependencies"
                    active={
                      activeView ===
                      "dependencies"
                    }
                    onClick={() =>
                      setActiveView(
                        "dependencies"
                      )
                    }
                  />

                </SidebarGroup>

                <SidebarGroup title="Intelligence">

                  <SidebarItem
                    icon={<Sparkles />}
                    label="Ask CodeBase"
                    active={
                      activeView ===
                      "ask"
                    }
                    onClick={() =>
                      setActiveView("ask")
                    }
                  />

                  <SidebarItem
                    icon={<BarChart3 />}
                    label="Insights"
                    active={
                      activeView ===
                      "insights"
                    }
                    onClick={() =>
                      setActiveView(
                        "insights"
                      )
                    }
                  />

                </SidebarGroup>

                <SidebarGroup title="Tools">

                  <SidebarItem
                    icon={<Search />}
                    label="Semantic Search"
                  />

                  <SidebarItem
                    icon={<Terminal />}
                    label="Code Explorer"
                  />

                </SidebarGroup>

              </div>

              {/* Bottom */}

              <div className="border-t border-white/[0.07] p-4">

                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">

                  <div className="flex items-center gap-3">

                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-400/[0.07]">
                      <Settings2
                        size={16}
                        className="text-violet-300"
                      />
                    </div>

                    <div>
                      <div className="text-xs font-medium text-white/55">
                        Analysis Settings
                      </div>

                      <div className="mt-1 text-[10px] text-white/20">
                        RAG configuration
                      </div>
                    </div>

                  </div>

                </div>

              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <div className="flex min-w-0 flex-1 flex-col">

        {/* ===================================================
            HEADER
        =================================================== */}

        <header className="z-30 flex h-[72px] shrink-0 items-center justify-between border-b border-white/[0.07] bg-[#050608]/80 px-5 backdrop-blur-2xl sm:px-7">

          <div className="flex min-w-0 items-center gap-4">

            <button
              onClick={() =>
                setSidebarOpen(
                  (value) => !value
                )
              }
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025] text-white/40 transition hover:bg-white/[0.06] hover:text-white"
            >
              <PanelLeft size={17} />
            </button>

            <div className="hidden h-5 w-px bg-white/10 sm:block" />

            <div className="min-w-0">

              <div className="flex items-center gap-2">

                <FolderGit2
                  size={15}
                  className="shrink-0 text-blue-400"
                />

                <span className="truncate text-sm font-semibold text-white/75">
                  {getRepoName(repo)}
                </span>

              </div>

              <div className="mt-1 hidden items-center gap-2 text-[10px] text-white/25 sm:flex">

                <span>
                  Repository Intelligence
                </span>

                <span>
                  •
                </span>

                <span>
                  {analysisComplete
                    ? "Analysis complete"
                    : "Analyzing repository"}
                </span>

              </div>
            </div>
          </div>

          {/* Status */}

          <div className="flex items-center gap-3">

            <div className="hidden items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 sm:flex">

              <motion.span
                animate={{
                  opacity: analysisComplete
                    ? 1
                    : [0.3, 1, 0.3],
                }}
                transition={{
                  duration: 1.4,
                  repeat: analysisComplete
                    ? 0
                    : Infinity,
                }}
                className={`h-2 w-2 rounded-full ${
                  analysisComplete
                    ? "bg-emerald-400"
                    : "bg-blue-400"
                }`}
              />

              <span className="text-xs text-white/40">
                {analysisComplete
                  ? "Ready"
                  : analysisError
                  ? "Failed"
                  : `${analysisProgress}% · ${STAGE_LABELS[analysisStage] ?? analysisStage}`}
              </span>
            </div>

            <button
              onClick={() =>
                router.back()
              }
              className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-xs text-white/40 transition hover:text-white"
            >
              <ArrowLeft size={14} />
              <span className="hidden sm:block">
                Repository
              </span>
            </button>

          </div>
        </header>

        {/* ===================================================
            WORKSPACE
        =================================================== */}

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">

          {/* =================================================
              OVERVIEW
          ================================================= */}

          <div className="flex-1 overflow-y-auto">

            <div className="mx-auto w-full max-w-[1200px] px-5 py-8 sm:px-8 lg:px-10">

              {/* Hero */}

              <motion.section
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.6,
                }}
                className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.025]"
              >

                <IntelligenceHero />

                <div className="relative p-6 sm:p-8 lg:p-10">

                  <div className="max-w-3xl">

                    <div className="mb-4 flex items-center gap-2">

                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-400/[0.08]">
                        <Sparkles
                          size={14}
                          className="text-blue-400"
                        />
                      </span>

                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300/70">
                        Repository Intelligence
                      </span>

                    </div>

                    <h1 className="text-3xl font-bold tracking-[-0.035em] text-white sm:text-4xl lg:text-5xl">
                      Understand your codebase.
                    </h1>

                    <p className="mt-4 max-w-2xl text-sm leading-7 text-white/40 sm:text-base">
                      CodeBase has indexed your repository
                      and is building an intelligence layer
                      across your files, dependencies and
                      architecture.
                    </p>

                  </div>

                  {/* Progress */}

                  {!analysisComplete && (
                    <div className="mt-8 max-w-2xl">

                      <div className="mb-2 flex justify-between text-xs">

                        <span className="text-white/30">
                          {analysisError
                            ? analysisError
                            : STAGE_LABELS[analysisStage] ??
                              "Building repository index"}
                        </span>

                        <span className="font-mono text-blue-300/60">
                          {analysisProgress}%
                        </span>

                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">

                        <motion.div
                          animate={{
                            width: `${analysisProgress}%`,
                          }}
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-400"
                        />

                      </div>
                    </div>
                  )}

                  {analysisComplete && (
                    <motion.div
                      initial={{
                        opacity: 0,
                        y: 10,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      className="mt-8 flex items-center gap-3 rounded-xl border border-emerald-400/10 bg-emerald-400/[0.035] px-4 py-3"
                    >

                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/[0.08]">
                        <Check
                          size={15}
                          className="text-emerald-400"
                        />
                      </div>

                      <div>
                        <div className="text-sm font-medium text-emerald-300">
                          Repository analysis ready
                        </div>

                        <div className="mt-0.5 text-xs text-white/25">
                          Ask questions or explore the
                          repository intelligence graph.
                        </div>
                      </div>

                    </motion.div>
                  )}

                </div>
              </motion.section>

              {/* =================================================
                  QUICK METRICS
              ================================================= */}

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">

                <Metric
                  icon={<FileCode2 />}
                  label="Files Indexed"
                  value="12,482"
                  color="blue"
                />

                <Metric
                  icon={<Code2 />}
                  label="Languages"
                  value="7"
                  color="violet"
                />

                <Metric
                  icon={<Network />}
                  label="Dependencies"
                  value="184"
                  color="cyan"
                />

                <Metric
                  icon={<Database />}
                  label="Embeddings"
                  value="38.4K"
                  color="emerald"
                />

              </div>

              {/* =================================================
                  ARCHITECTURE
              ================================================= */}

              <motion.section
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  delay: 0.25,
                }}
                className="mt-5 overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.025]"
              >

                <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4 sm:px-6">

                  <div className="flex items-center gap-3">

                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-400/[0.07]">
                      <Network
                        size={17}
                        className="text-violet-300"
                      />
                    </div>

                    <div>
                      <h2 className="text-sm font-semibold text-white/75 sm:text-base">
                        Architecture Map
                      </h2>

                      <p className="mt-0.5 text-xs text-white/25">
                        Repository relationships detected by CodeBase
                      </p>
                    </div>

                  </div>

                  <button className="flex items-center gap-2 rounded-lg border border-white/[0.07] px-3 py-2 text-xs text-white/30 hover:text-white/70">
                    Expand
                    <ArrowUpRight size={13} />
                  </button>

                </div>

                <ArchitectureMap />

              </motion.section>

              {/* =================================================
                  ANALYSIS ACTIVITY
              ================================================= */}

              <motion.section
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  delay: 0.35,
                }}
                className="mt-5 overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.025]"
              >

                <div className="border-b border-white/[0.07] px-5 py-5 sm:px-6">

                  <div className="flex items-center gap-3">

                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400/[0.07]">
                      <Activity
                        size={17}
                        className="text-emerald-300"
                      />
                    </div>

                    <div>
                      <h2 className="text-sm font-semibold text-white/75 sm:text-base">
                        Analysis Timeline
                      </h2>

                      <p className="mt-0.5 text-xs text-white/25">
                        What CodeBase has processed
                      </p>
                    </div>

                  </div>
                </div>

                <AnalysisTimeline
                  complete={analysisComplete}
                />

              </motion.section>

              {/* =================================================
                  ASK CODEBASE
              ================================================= */}

              <motion.section
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  delay: 0.45,
                }}
                className="mt-5 overflow-hidden rounded-3xl border border-blue-400/10 bg-gradient-to-br from-blue-500/[0.055] via-violet-500/[0.025] to-transparent"
              >

                <div className="p-5 sm:p-7 lg:p-8">

                  <div className="flex items-start gap-4">

                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-400/[0.08]">
                      <Bot
                        size={21}
                        className="text-blue-400"
                      />
                    </div>

                    <div>
                      <h2 className="text-lg font-semibold text-white sm:text-xl">
                        Ask CodeBase
                      </h2>

                      <p className="mt-1 text-xs leading-5 text-white/30 sm:text-sm">
                        Explore your repository using natural
                        language.
                      </p>
                    </div>

                  </div>

                  {/* Suggested questions */}

                  <div className="mt-6 grid gap-2 sm:grid-cols-2">

                    <SuggestedQuestion
                      icon={<Network />}
                      text="How is the application structured?"
                      onClick={() =>
                        askQuestion(
                          "How is the application structured?"
                        )
                      }
                    />

                    <SuggestedQuestion
                      icon={<ShieldCheck />}
                      text="Where is authentication implemented?"
                      onClick={() =>
                        askQuestion(
                          "Where is authentication implemented?"
                        )
                      }
                    />

                    <SuggestedQuestion
                      icon={<GitBranch />}
                      text="Explain the main dependencies"
                      onClick={() =>
                        askQuestion(
                          "Explain the main dependencies"
                        )
                      }
                    />

                    <SuggestedQuestion
                      icon={<Code2 />}
                      text="What are the most important files?"
                      onClick={() =>
                        askQuestion(
                          "What are the most important files?"
                        )
                      }
                    />

                  </div>

                  {/* Conversation */}

                  {messages.length > 0 && (
                    <div className="mt-6 space-y-4 border-t border-white/[0.07] pt-6">

                      {messages.map(
                        (message) => (
                          <Message
                            key={message.id}
                            message={message}
                          />
                        )
                      )}

                    </div>
                  )}

                  {/* Input */}

                  <div className="relative mt-6">

                    <div className="rounded-2xl border border-white/[0.1] bg-[#07080b]/80 p-2 shadow-2xl shadow-blue-500/[0.04] backdrop-blur-xl">

                      <div className="flex items-end gap-2">

                        <button className="mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white/20 transition hover:bg-white/[0.05] hover:text-white/50">
                          <Upload size={17} />
                        </button>

                        <textarea
                          value={input}
                          onChange={(event) =>
                            setInput(
                              event.target.value
                            )
                          }
                          onKeyDown={(event) => {
                            if (
                              event.key ===
                                "Enter" &&
                              !event.shiftKey
                            ) {
                              event.preventDefault();
                              askQuestion();
                            }
                          }}
                          placeholder="Ask anything about this repository..."
                          rows={1}
                          className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-2 py-3 text-sm text-white outline-none placeholder:text-white/20 sm:text-base"
                        />

                        <button
                          onClick={() =>
                            askQuestion()
                          }
                          disabled={
                            !input.trim()
                          }
                          className="mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-white/[0.04] disabled:text-white/20"
                        >
                          <ArrowUpRight size={18} />
                        </button>

                      </div>

                      <div className="mt-1 flex items-center justify-between px-3 pb-1">

                        <div className="flex items-center gap-3 text-[10px] text-white/20">

                          <span className="flex items-center gap-1.5">
                            <Sparkles size={11} />
                            RAG enabled
                          </span>

                          <span className="hidden sm:flex items-center gap-1.5">
                            <Command size={11} />
                            Enter to ask
                          </span>

                        </div>

                        <span className="font-mono text-[10px] text-white/15">
                          CODEBASE AI
                        </span>

                      </div>
                    </div>
                  </div>

                </div>
              </motion.section>

            </div>
          </div>

          {/* =================================================
              BOTTOM STATUS BAR
          ================================================= */}

          <div className="hidden h-9 shrink-0 items-center justify-between border-t border-white/[0.06] bg-[#07080b]/80 px-5 text-[10px] text-white/20 backdrop-blur-xl sm:flex">

            <div className="flex items-center gap-4">

              <span className="flex items-center gap-1.5">
                <FileCode2 size={11} />
                12,482 files
              </span>

              <span>
                •
              </span>

              <span>
                TypeScript
              </span>

              <span>
                •
              </span>

              <span>
                184 dependencies
              </span>

            </div>

            <div className="flex items-center gap-3">

              <span className="flex items-center gap-1.5">
                <Database size={11} />
                Vector index ready
              </span>

              <span className="text-emerald-400/60">
                ●
              </span>

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
        animate={{
          x: [0, 30, 0],
          y: [0, 25, 0],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute left-[10%] top-[-300px] h-[600px] w-[600px] rounded-full bg-blue-600/[0.05] blur-[150px]"
      />

      <motion.div
        animate={{
          x: [0, -30, 0],
          y: [0, 30, 0],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute right-[-250px] top-[30%] h-[600px] w-[600px] rounded-full bg-violet-600/[0.04] blur-[160px]"
      />

    </div>
  );
}

/* =========================================================
   INTELLIGENCE HERO SVG
========================================================= */

function IntelligenceHero() {
  return (
    <svg
      className="pointer-events-none absolute right-0 top-0 h-full w-[55%] opacity-50"
      viewBox="0 0 700 320"
      fill="none"
    >
      <defs>

        <linearGradient
          id="heroLine"
          x1="0"
          y1="0"
          x2="700"
          y2="320"
        >
          <stop
            stopColor="#3B82F6"
            stopOpacity="0"
          />

          <stop
            offset=".5"
            stopColor="#8B5CF6"
            stopOpacity=".7"
          />

          <stop
            offset="1"
            stopColor="#06B6D4"
            stopOpacity="0"
          />
        </linearGradient>

      </defs>

      <motion.path
        d="M0 260 C100 170 150 290 260 180 S450 100 700 30"
        stroke="url(#heroLine)"
        strokeWidth="1"
        strokeDasharray="7 8"
        initial={{
          pathLength: 0,
        }}
        animate={{
          pathLength: 1,
        }}
        transition={{
          duration: 2.5,
        }}
      />

      <motion.path
        d="M80 320 C180 200 240 280 350 190 S530 150 700 90"
        stroke="url(#heroLine)"
        strokeWidth="1"
        initial={{
          pathLength: 0,
        }}
        animate={{
          pathLength: 1,
        }}
        transition={{
          duration: 2.5,
          delay: 0.3,
        }}
      />

      {[
        [130, 220],
        [250, 225],
        [350, 175],
        [470, 145],
        [590, 105],
      ].map(
        ([cx, cy], index) => (
          <motion.g
            key={index}
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            transition={{
              delay:
                0.7 + index * 0.12,
            }}
          >
            <circle
              cx={cx}
              cy={cy}
              r="17"
              fill="#3B82F6"
              fillOpacity=".04"
              stroke="#60A5FA"
              strokeOpacity=".18"
            />

            <motion.circle
              cx={cx}
              cy={cy}
              r="3"
              fill="#60A5FA"
              animate={{
                opacity: [
                  0.3,
                  1,
                  0.3,
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay:
                  index * 0.25,
              }}
            />
          </motion.g>
        )
      )}
    </svg>
  );
}

/* =========================================================
   ARCHITECTURE MAP
========================================================= */

function ArchitectureMap() {
  return (
    <div className="relative h-[430px] overflow-hidden bg-[#07080b]">

      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(96,165,250,.15) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
        }}
      />

      {/* SVG */}

      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 1000 430"
        preserveAspectRatio="none"
      >
        <defs>

          <linearGradient
            id="architectureLine"
            x1="0"
            y1="0"
            x2="1"
            y2="0"
          >
            <stop
              stopColor="#3B82F6"
              stopOpacity=".1"
            />

            <stop
              offset=".5"
              stopColor="#8B5CF6"
              stopOpacity=".8"
            />

            <stop
              offset="1"
              stopColor="#06B6D4"
              stopOpacity=".2"
            />
          </linearGradient>

        </defs>

        <AnimatedPath d="M500 80 L500 150 L270 230" />

        <AnimatedPath d="M500 150 L730 230" delay={0.2} />

        <AnimatedPath d="M270 230 L160 350" delay={0.4} />

        <AnimatedPath d="M270 230 L350 350" delay={0.5} />

        <AnimatedPath d="M730 230 L650 350" delay={0.6} />

        <AnimatedPath d="M730 230 L840 350" delay={0.7} />
      </svg>

      {/* Repository */}

      <MapNode
        title="Repository"
        subtitle="Source Code"
        icon={<FolderGit2 />}
        color="blue"
        className="absolute left-1/2 top-7 w-[220px] -translate-x-1/2"
      />

      {/* Middle */}

      <MapNode
        title="Source Analysis"
        subtitle="AST + Tree-sitter"
        icon={<Code2 />}
        color="violet"
        className="absolute left-[12%] top-[180px] w-[220px]"
      />

      <MapNode
        title="AI Intelligence"
        subtitle="RAG + Embeddings"
        icon={<Sparkles />}
        color="cyan"
        className="absolute right-[12%] top-[180px] w-[220px]"
      />

      {/* Bottom */}

      <MapMiniNode
        title="Functions"
        icon={<FileCode2 />}
        className="absolute bottom-8 left-[10%]"
      />

      <MapMiniNode
        title="Dependencies"
        icon={<Network />}
        className="absolute bottom-8 left-[29%]"
      />

      <MapMiniNode
        title="Embeddings"
        icon={<Database />}
        className="absolute bottom-8 right-[29%]"
      />

      <MapMiniNode
        title="AI Answers"
        icon={<Bot />}
        className="absolute bottom-8 right-[10%]"
      />

    </div>
  );
}

/* =========================================================
   ANIMATED PATH
========================================================= */

function AnimatedPath({
  d,
  delay = 0,
}: {
  d: string;
  delay?: number;
}) {
  return (
    <motion.path
      d={d}
      stroke="url(#architectureLine)"
      strokeWidth="1.5"
      fill="none"
      strokeDasharray="7 7"
      initial={{
        pathLength: 0,
      }}
      whileInView={{
        pathLength: 1,
      }}
      viewport={{
        once: true,
      }}
      transition={{
        duration: 1.3,
        delay,
      }}
    />
  );
}

/* =========================================================
   MAP NODE
========================================================= */

function MapNode({
  title,
  subtitle,
  icon,
  color,
  className,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  color: "blue" | "violet" | "cyan";
  className: string;
}) {
  const colors = {
    blue:
      "border-blue-400/20 bg-blue-400/[0.055] text-blue-300",
    violet:
      "border-violet-400/20 bg-violet-400/[0.055] text-violet-300",
    cyan:
      "border-cyan-400/20 bg-cyan-400/[0.055] text-cyan-300",
  };

  return (
    <motion.div
      whileHover={{
        y: -4,
        scale: 1.02,
      }}
      className={`${className} z-10 rounded-2xl border ${colors[color]} p-4 backdrop-blur-xl`}
    >
      <div className="flex items-center gap-3">

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/20">
          {icon}
        </div>

        <div>
          <div className="text-sm font-semibold text-white/75">
            {title}
          </div>

          <div className="mt-1 font-mono text-[10px] text-white/25">
            {subtitle}
          </div>
        </div>

      </div>
    </motion.div>
  );
}

/* =========================================================
   MAP MINI NODE
========================================================= */

function MapMiniNode({
  title,
  icon,
  className,
}: {
  title: string;
  icon: ReactNode;
  className: string;
}) {
  return (
    <motion.div
      whileHover={{
        y: -3,
      }}
      className={`${className} z-10 flex w-[130px] flex-col items-center rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 backdrop-blur-xl`}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] text-white/35">
        {icon}
      </div>

      <div className="mt-2 text-xs font-medium text-white/40">
        {title}
      </div>
    </motion.div>
  );
}

/* =========================================================
   ANALYSIS TIMELINE
========================================================= */

function AnalysisTimeline({
  complete,
}: {
  complete: boolean;
}) {
  const steps: AnalysisStep[] = [
    {
      title: "Repository connected",
      description:
        "GitHub repository successfully loaded.",
      icon: <GitCommit />,
      status: "complete",
    },
    {
      title: "Source files indexed",
      description:
        "Repository files are being mapped.",
      icon: <FileCode2 />,
      status:
        complete
          ? "complete"
          : "running",
    },
    {
      title: "Dependency graph",
      description:
        "Relationships between modules are being discovered.",
      icon: <Network />,
      status:
        complete
          ? "complete"
          : "running",
    },
    {
      title: "Embeddings generated",
      description:
        "Code chunks are being prepared for semantic retrieval.",
      icon: <Database />,
      status:
        complete
          ? "complete"
          : "running",
    },
    {
      title: "AI intelligence ready",
      description:
        "Repository can now be explored using CodeBase AI.",
      icon: <Sparkles />,
      status:
        complete
          ? "complete"
          : "queued",
    },
  ];

  return (
    <div className="divide-y divide-white/[0.05]">

      {steps.map(
        (step, index) => (
          <motion.div
            key={step.title}
            initial={{
              opacity: 0,
              x: -10,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            transition={{
              delay:
                index * 0.08,
            }}
            className="flex items-center gap-4 px-5 py-4 sm:px-6"
          >

            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                step.status ===
                "complete"
                  ? "bg-emerald-400/[0.07] text-emerald-400"
                  : step.status ===
                      "running"
                    ? "bg-blue-400/[0.07] text-blue-400"
                    : "bg-white/[0.035] text-white/20"
              }`}
            >
              {step.status ===
              "complete" ? (
                <Check size={17} />
              ) : (
                step.icon
              )}
            </div>

            <div className="min-w-0 flex-1">

              <div className="text-sm font-medium text-white/65">
                {step.title}
              </div>

              <div className="mt-1 text-xs text-white/25">
                {step.description}
              </div>

            </div>

            <div>

              {step.status ===
                "complete" && (
                <span className="rounded-full border border-emerald-400/10 bg-emerald-400/[0.04] px-2.5 py-1 text-[10px] font-medium text-emerald-300/60">
                  Complete
                </span>
              )}

              {step.status ===
                "running" && (
                <motion.span
                  animate={{
                    opacity: [
                      0.3,
                      1,
                      0.3,
                    ],
                  }}
                  transition={{
                    duration: 1.3,
                    repeat: Infinity,
                  }}
                  className="rounded-full border border-blue-400/10 bg-blue-400/[0.04] px-2.5 py-1 text-[10px] text-blue-300/60"
                >
                  Processing
                </motion.span>
              )}

              {step.status ===
                "queued" && (
                <span className="text-[10px] text-white/15">
                  Queued
                </span>
              )}

            </div>

          </motion.div>
        )
      )}

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
}: {
  icon: ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  const styles: Record<
    string,
    string
  > = {
    blue:
      "bg-blue-400/[0.07] text-blue-400",
    violet:
      "bg-violet-400/[0.07] text-violet-400",
    cyan:
      "bg-cyan-400/[0.07] text-cyan-400",
    emerald:
      "bg-emerald-400/[0.07] text-emerald-400",
  };

  return (
    <motion.div
      whileHover={{
        y: -3,
      }}
      className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 sm:p-5"
    >
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-lg ${styles[color]}`}
      >
        {icon}
      </div>

      <div className="mt-4 text-xl font-bold text-white sm:text-2xl">
        {value}
      </div>

      <div className="mt-1 text-xs text-white/30">
        {label}
      </div>
    </motion.div>
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
      whileHover={{
        y: -2,
      }}
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

function Message({
  message,
}: {
  message: ChatMessage;
}) {
  const isUser =
    message.role === "user";

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 8,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      className={`flex gap-3 ${
        isUser
          ? "justify-end"
          : "justify-start"
      }`}
    >

      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-400/[0.07] text-blue-400">
          <Bot size={15} />
        </div>
      )}

      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-6 ${
          isUser
            ? "bg-blue-500 text-white"
            : "border border-white/[0.07] bg-white/[0.025] text-white/45"
        }`}
      >
        {message.content}
      </div>

    </motion.div>
  );
}

/* =========================================================
   SIDEBAR GROUP
========================================================= */

function SidebarGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-7">

      <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/20">
        {title}
      </div>

      <div className="space-y-1">
        {children}
      </div>

    </div>
  );
}

/* =========================================================
   SIDEBAR ITEM
========================================================= */

function SidebarItem({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
        active
          ? "bg-blue-400/[0.08] text-blue-300"
          : "text-white/30 hover:bg-white/[0.035] hover:text-white/60"
      }`}
    >
      <span className="flex h-7 w-7 items-center justify-center">
        {icon}
      </span>

      <span className="text-sm font-medium">
        {label}
      </span>

      {active && (
        <motion.span
          layoutId="sidebarActive"
          className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,.8)]"
        />
      )}
    </button>
  );
}

/* =========================================================
   HELPERS
========================================================= */

function getRepoName(
  url: string
) {
  try {
    const parsed = new URL(url);

    return parsed.pathname
      .replace(/^\/+/, "")
      .replace(/\/+$/, "")
      .replace(/\.git$/, "");
  } catch {
    return "Repository";
  }
}