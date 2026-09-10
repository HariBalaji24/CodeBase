"use client";

import { useState } from "react";


export default function HomePage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
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

      
      window.location.href = `/analyze?repo=${encodeURIComponent(url)}`;
    } catch (error) {
      console.error(error);
      setError("Unable to analyze the repository. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      

      <main>
        {/* Hero Section */}
        <section className="px-6 pb-20 pt-20">
          <div className="mx-auto max-w-5xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-green-400" />
              AI-powered code intelligence
            </div>

            <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Understand your
              <span className="block text-zinc-500">
                codebase with AI.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
              Connect a GitHub repository and explore its architecture,
              dependencies, functions, and code using natural language.
            </p>

            {/* Repository Input */}
            <div className="mx-auto mt-12 max-w-3xl">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2 shadow-2xl">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="flex flex-1 items-center gap-3 rounded-xl bg-black/30 px-4">
                    {/* GitHub Icon */}
                    <svg
                      className="h-5 w-5 shrink-0 text-zinc-500"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2.16c-3.2.7-3.88-1.54-3.88-1.54-.53-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.23-1.28-5.23-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.17 1.18A11 11 0 0 1 12 5.9c.98 0 1.97.13 2.89.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.77.11 3.06.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.39-5.25 5.67.41.36.78 1.08.78 2.18v3.23c0 .31.21.68.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
                    </svg>

                    <input
                      type="text"
                      value={url}
                      placeholder="https://github.com/username/repository"
                      onChange={(e) => {
                        setUrl(e.target.value);
                        setError("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleSubmit();
                        }
                      }}
                      className="h-14 w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
                    />
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="h-14 rounded-xl bg-white px-7 font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? "Analyzing..." : "Analyze Repository"}
                  </button>
                </div>
              </div>

              {error && (
                <p className="mt-3 text-left text-sm text-red-400">
                  {error}
                </p>
              )}

              <p className="mt-4 text-xs text-zinc-600">
                Enter a public GitHub repository to get started.
              </p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-7xl px-6 py-16">
          <div className="grid gap-5 md:grid-cols-3">
            <FeatureCard
              number="01"
              title="Semantic Code Search"
              description="Search your entire repository using natural language and find the code that actually matters."
              icon="⌕"
            />

            <FeatureCard
              number="02"
              title="Dependency Intelligence"
              description="Understand how files, functions, services, and schemas are connected throughout your application."
              icon="⌘"
            />

            <FeatureCard
              number="03"
              title="AI Code Assistant"
              description="Ask questions about your codebase and get contextual answers backed by actual source code."
              icon="✦"
            />
          </div>
        </section>

        {/* How It Works */}
        <section className="mx-auto max-w-7xl px-6 py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-medium tracking-widest text-zinc-600">
              HOW IT WORKS
            </p>

            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              From repository to intelligence.
            </h2>

            <p className="mt-4 leading-7 text-zinc-500">
              CodeBase analyzes your repository and builds an understanding
              of its structure before answering your questions.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-4">
            <Step
              number="01"
              title="Connect"
              description="Provide your GitHub repository URL."
            />

            <Step
              number="02"
              title="Analyze"
              description="Parse files, functions, classes, and relationships."
            />

            <Step
              number="03"
              title="Understand"
              description="Create embeddings and build a searchable code graph."
            />

            <Step
              number="04"
              title="Ask"
              description="Ask questions and receive answers grounded in your code."
            />
          </div>
        </section>

        {/* Questions Section */}
        <section className="mx-auto max-w-7xl px-6 py-20">
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 md:p-12">
            <div className="grid gap-12 md:grid-cols-2 md:items-center">
              <div>
                <p className="text-sm font-medium tracking-widest text-zinc-600">
                  ASK YOUR CODEBASE
                </p>

                <h2 className="mt-4 text-3xl font-semibold">
                  Stop searching.
                  <br />
                  Start asking.
                </h2>

                <p className="mt-5 max-w-lg leading-7 text-zinc-500">
                  CodeBase lets you explore your repository using natural
                  language instead of manually navigating through hundreds
                  of files.
                </p>
              </div>

              <div className="space-y-3">
                <Question text="Where is authentication handled?" />
                <Question text="How does the login flow work?" />
                <Question text="Where is this function used?" />
                <Question text="What files depend on UserSchema?" />
                <Question text="What could break if I change this service?" />
              </div>
            </div>
          </div>
        </section>

        {/* Technology Stack */}
        <section className="mx-auto max-w-7xl px-6 py-20 text-center">
          <p className="text-sm font-medium tracking-widest text-zinc-600">
            TECHNOLOGY
          </p>

          <h2 className="mt-3 text-2xl font-semibold">
            Built for modern codebases
          </h2>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {[
              "Next.js",
              "TypeScript",
              "Node.js",
              "PostgreSQL",
              "pgvector",
              "Tree-sitter",
              "OpenAI",
              "Redis",
              "BullMQ",
            ].map((technology) => (
              <span
                key={technology}
                className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-zinc-400"
              >
                {technology}
              </span>
            ))}
          </div>
        </section>
      </main>

      
    </div>
  );
}

function FeatureCard({
  number,
  title,
  description,
  icon,
}: {
  number: string;
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-7 transition hover:border-white/20 hover:bg-white/[0.04]">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-lg text-zinc-300">
          {icon}
        </div>

        <span className="text-xs text-zinc-700">{number}</span>
      </div>

      <h3 className="mt-7 text-lg font-semibold">{title}</h3>

      <p className="mt-3 text-sm leading-6 text-zinc-500">
        {description}
      </p>
    </div>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <span className="text-xs font-medium text-zinc-700">
        {number}
      </span>

      <h3 className="mt-6 font-semibold">{title}</h3>

      <p className="mt-3 text-sm leading-6 text-zinc-500">
        {description}
      </p>
    </div>
  );
}

function Question({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm text-zinc-400 transition hover:border-white/20 hover:text-zinc-200">
      <span className="text-zinc-600">→</span>
      {text}
    </div>
  );
}