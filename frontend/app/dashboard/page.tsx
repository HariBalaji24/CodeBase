"use client";

import { useState } from "react";
import getgithubrepository from "@/services/file.service";

type RepositoryData = {
  name: string;
  description: string;
  owner: string;
  language: string;
  stars: number;
  forks: number;
  files: number;
  functions: number;
  classes: number;
};

export default function RepositoryDashboard() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [repository, setRepository] =
    useState<RepositoryData | null>(null);
  const [error, setError] = useState("");

  async function handleAnalyze() {
    if (!url.trim()) {
      setError("Please enter a GitHub repository URL.");
      return;
    }

    if (!url.includes("github.com")) {
      setError("Please enter a valid GitHub repository URL.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const response = await getgithubrepository(url);

      setRepository({
        name: response.name,
        description: response.description ?? "No description provided.",
        owner: response.owner?.login ?? "",
        language: response.language ?? "Unknown",
        stars: response.stargazers_count ?? 0,
        forks: response.forks_count ?? 0,
        /*
         * Not returned by the GitHub API - these come from the
         * static-analysis pipeline, which is not built yet.
         */
        files: 0,
        functions: 0,
        classes: 0,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to analyze the repository. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      

      <main className="mx-auto max-w-7xl px-6 py-10">
        {/* Page Header */}
        <div className="mb-10">
          <p className="text-xs font-medium tracking-[0.2em] text-zinc-600">
            CODEBASE / ANALYZER
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Repository Analyzer
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
            Connect a GitHub repository to analyze its structure, understand
            dependencies, and explore the code using AI.
          </p>
        </div>

        {/* Repository Input */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="flex flex-1 items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4">
              <svg
                className="h-5 w-5 shrink-0 text-zinc-600"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2.16c-3.2.7-3.88-1.54-3.88-1.54-.53-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.23-1.28-5.23-5.69 0-1.26.45-2.29 1.19-3.1.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.39-5.25 5.67.41.36.78 1.08.78 2.18v3.23c0 .31.21.68.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
              </svg>

              <input
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAnalyze();
                  }
                }}
                placeholder="https://github.com/username/repository"
                className="h-12 w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-700"
              />
            </div>

            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="rounded-xl bg-white px-7 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Analyzing..." : "Analyze Repository"}
            </button>
          </div>

          {error && (
            <p className="mt-3 text-sm text-red-400">
              {error}
            </p>
          )}
        </section>

        {/* Empty State */}
        {!repository && !loading && (
          <section className="mt-8 rounded-2xl border border-dashed border-white/10 bg-white/[0.01] py-24 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
              <span className="text-xl text-zinc-500">⌘</span>
            </div>

            <h2 className="mt-6 text-lg font-semibold">
              No repository analyzed
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-600">
              Enter a GitHub repository above to begin analyzing its code,
              dependencies, and architecture.
            </p>
          </section>
        )}

        {/* Loading State */}
        {loading && (
          <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-8">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 animate-pulse rounded-xl bg-white/10" />

              <div className="flex-1">
                <div className="h-4 w-48 animate-pulse rounded bg-white/10" />
                <div className="mt-2 h-3 w-72 animate-pulse rounded bg-white/5" />
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <LoadingBar />
              <LoadingBar />
              <LoadingBar />
            </div>

            <p className="mt-6 text-center text-xs text-zinc-600">
              Fetching and analyzing repository...
            </p>
          </section>
        )}

        {/* Repository Dashboard */}
        {repository && !loading && (
          <div className="mt-8 space-y-6">
            {/* Repository Overview */}
            <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                      <svg
                        className="h-5 w-5 text-zinc-300"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2.16c-3.2.7-3.88-1.54-3.88-1.54-.53-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.23-1.28-5.23-5.69 0-1.26.45-2.29 1.19-3.1.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.39-5.25 5.67.41.36.78 1.08.78 2.18v3.23c0 .31.21.68.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
                      </svg>
                    </div>

                    <div>
                      <h2 className="text-lg font-semibold">
                        {repository.name}
                      </h2>

                      <p className="mt-1 text-xs text-zinc-600">
                        {repository.owner}
                      </p>
                    </div>
                  </div>

                  <p className="mt-5 max-w-2xl text-sm leading-6 text-zinc-500">
                    {repository.description}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-green-400/20 bg-green-400/5 px-3 py-1.5 text-xs text-green-400">
                    Analyzed
                  </span>

                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-400 transition hover:bg-white/[0.04]"
                  >
                    GitHub ↗
                  </a>
                </div>
              </div>
            </section>

            {/* Stats */}
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Files"
                value={repository.files || 0}
                description="Source files analyzed"
              />

              <StatCard
                label="Functions"
                value={repository.functions || 0}
                description="Functions discovered"
              />

              <StatCard
                label="Classes"
                value={repository.classes || 0}
                description="Classes discovered"
              />

              <StatCard
                label="Language"
                value={repository.language || "Multiple"}
                description="Primary language"
              />
            </section>

            {/* Main Dashboard Grid */}
            <section className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
              {/* AI Assistant */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs tracking-widest text-zinc-600">
                      AI ASSISTANT
                    </p>

                    <h2 className="mt-2 text-lg font-semibold">
                      Ask about this repository
                    </h2>
                  </div>

                  <span className="text-xs text-zinc-700">
                    RAG
                  </span>
                </div>

                <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4">
                  <input
                    type="text"
                    placeholder="Ask something about your code..."
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-700"
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Suggestion text="Explain the architecture" />
                  <Suggestion text="Where is authentication?" />
                  <Suggestion text="Find API routes" />
                  <Suggestion text="Show dependencies" />
                </div>
              </div>

              {/* Repository Insights */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <p className="text-xs tracking-widest text-zinc-600">
                  REPOSITORY INSIGHTS
                </p>

                <div className="mt-6 space-y-5">
                  <Insight
                    label="Stars"
                    value={repository.stars || 0}
                  />

                  <Insight
                    label="Forks"
                    value={repository.forks || 0}
                  />

                  <Insight
                    label="Primary Language"
                    value={repository.language || "Multiple"}
                  />

                  <Insight
                    label="Analysis Status"
                    value="Complete"
                  />
                </div>
              </div>
            </section>

            {/* Analysis Tools */}
            <section>
              <div className="mb-4">
                <p className="text-xs tracking-widest text-zinc-600">
                  ANALYSIS TOOLS
                </p>

                <h2 className="mt-2 text-lg font-semibold">
                  Explore your codebase
                </h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <ToolCard
                  title="Code Search"
                  description="Find relevant code using natural language."
                  icon="⌕"
                />

                <ToolCard
                  title="File Explorer"
                  description="Explore files and source structure."
                  icon="□"
                />

                <ToolCard
                  title="Dependencies"
                  description="Visualize relationships between components."
                  icon="⌘"
                />

                <ToolCard
                  title="Impact Analysis"
                  description="Understand the impact of code changes."
                  icon="◎"
                />
              </div>
            </section>

            {/* Architecture */}
            <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <div>
                <p className="text-xs tracking-widest text-zinc-600">
                  CODE INTELLIGENCE
                </p>

                <h2 className="mt-2 text-lg font-semibold">
                  Repository processing
                </h2>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-5">
                <PipelineStep
                  title="Repository"
                  status="Complete"
                />

                <PipelineStep
                  title="Tree-sitter"
                  status="Complete"
                />

                <PipelineStep
                  title="Code Structure"
                  status="Complete"
                />

                <PipelineStep
                  title="Embeddings"
                  status="Ready"
                />

                <PipelineStep
                  title="AI Search"
                  status="Ready"
                />
              </div>
            </section>
          </div>
        )}
      </main>

    </div>
  );
}

/* ---------------- Components ---------------- */

function StatCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string | number;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <p className="text-xs text-zinc-600">{label}</p>

      <p className="mt-3 text-2xl font-semibold">
        {value}
      </p>

      <p className="mt-1 text-xs text-zinc-700">
        {description}
      </p>
    </div>
  );
}

function ToolCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <button className="group rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-left transition hover:border-white/20 hover:bg-white/[0.04]">
      <div className="flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-zinc-400">
          {icon}
        </div>

        <span className="text-zinc-700 transition group-hover:text-zinc-400">
          ↗
        </span>
      </div>

      <h3 className="mt-6 text-sm font-semibold">
        {title}
      </h3>

      <p className="mt-2 text-xs leading-5 text-zinc-600">
        {description}
      </p>
    </button>
  );
}

function Suggestion({ text }: { text: string }) {
  return (
    <button className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-600 transition hover:border-white/20 hover:text-zinc-300">
      {text}
    </button>
  );
}

function Insight({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 pb-4 last:border-0 last:pb-0">
      <span className="text-sm text-zinc-600">
        {label}
      </span>

      <span className="text-sm font-medium text-zinc-300">
        {value}
      </span>
    </div>
  );
}

function PipelineStep({
  title,
  status,
}: {
  title: string;
  status: string;
}) {
  return (
    <div className="relative rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-green-400" />

        <span className="text-sm text-zinc-300">
          {title}
        </span>
      </div>

      <p className="mt-2 text-xs text-zinc-700">
        {status}
      </p>
    </div>
  );
}

function LoadingBar() {
  return (
    <div className="h-12 animate-pulse rounded-xl bg-white/[0.03]" />
  );
}