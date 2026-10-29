"use client"

import { motion } from "framer-motion"
import { CheckCircle2, ChevronRight, FileCode2, Folder, Quote, Search, Sparkles } from "lucide-react"

// A faux product window: the hero's "screenshot". Built in markup so it stays crisp at any
// size, themes with the page and costs no image bytes.

const TREE = [
  { name: "src", folder: true, depth: 0 },
  { name: "webhooks", folder: true, depth: 1 },
  { name: "retry.ts", depth: 2, active: true },
  { name: "dispatcher.ts", depth: 2 },
  { name: "queue", folder: true, depth: 1 },
  { name: "worker.ts", depth: 2 },
]

const RESULTS = [
  {
    path: "src/webhooks/retry.ts",
    lines: "42-61",
    score: 0.91,
    code: [
      ["const", "retryWebhook", "= async (event) => {"],
      ["  ", "for", " (let attempt = 1; attempt <= MAX; attempt++) {"],
      ["    ", "await", " sleep(backoff(attempt));"],
    ],
  },
  { path: "src/queue/worker.ts", lines: "108-124", score: 0.84, code: [["export", "async function", " processJob(job) {"]] },
]

export function HeroPreview() {
  return (
    <div className="relative">
      <div aria-hidden className="absolute -inset-x-8 -inset-y-6 rounded-[2rem] bg-gradient-to-tr from-blue-500/20 via-violet-500/25 to-cyan-400/15 blur-3xl" />

      <div className="relative overflow-hidden rounded-2xl border border-white/[0.12] bg-[#0a0a0f]/90 shadow-2xl shadow-violet-950/50 backdrop-blur-xl">
        <div className="flex items-center gap-3 border-b border-white/[0.08] bg-white/[0.02] px-4 py-3">
          <div className="flex gap-1.5" aria-hidden>
            <span className="h-3 w-3 rounded-full bg-red-400/90" />
            <span className="h-3 w-3 rounded-full bg-yellow-400/90" />
            <span className="h-3 w-3 rounded-full bg-green-400/90" />
          </div>
          <div className="flex-1 truncate rounded-md bg-white/[0.04] px-3 py-1.5 font-mono text-xs text-slate-400">
            github.com/acme/payments-api
          </div>
        </div>

        <div className="grid md:grid-cols-[200px_1fr]">
          <div className="hidden border-r border-white/[0.08] p-4 md:block" aria-hidden>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Explorer</p>
            <ul className="space-y-1 font-mono text-xs">
              {TREE.map((item) => (
                <li
                  key={item.name}
                  style={{ paddingLeft: item.depth * 12 }}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${
                    item.active ? "bg-violet-500/15 text-violet-200" : "text-slate-400"
                  }`}
                >
                  {item.folder ? (
                    <Folder className="h-3.5 w-3.5 text-blue-300" />
                  ) : (
                    <FileCode2 className="h-3.5 w-3.5 text-cyan-300" />
                  )}
                  {item.name}
                </li>
              ))}
            </ul>
            <div className="mt-5">
              <div className="mb-1.5 flex justify-between text-[10px] text-slate-500">
                <span>Indexing</span>
                <span>100%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1.6, delay: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-blue-400 to-violet-500"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4 sm:p-5">
            <div className="flex items-center gap-3 rounded-xl border border-violet-400/30 bg-violet-500/[0.06] px-4 py-3">
              <Search className="h-4 w-4 shrink-0 text-violet-300" aria-hidden />
              <p className="truncate text-sm text-slate-200">Where is the retry logic for failed webhooks?</p>
            </div>

            <ul className="space-y-3">
              {RESULTS.map((result, index) => (
                <motion.li
                  key={result.path}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.9 + index * 0.18 }}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="flex min-w-0 items-center gap-2 font-mono text-xs text-slate-300">
                      <FileCode2 className="h-3.5 w-3.5 shrink-0 text-cyan-300" aria-hidden />
                      <span className="truncate">{result.path}</span>
                      <span className="shrink-0 text-slate-500">:{result.lines}</span>
                    </p>
                    <span className="shrink-0 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                      {Math.round(result.score * 100)}% match
                    </span>
                  </div>
                  <pre className="mt-3 overflow-hidden whitespace-pre-wrap font-mono text-[11px] leading-5 text-slate-400 sm:text-xs">
                    {result.code.map((line, i) => (
                      <span key={i} className="block">
                        {line.map((part, j) => (
                          <span key={j} className={j === 0 && part.trim() ? "text-violet-300" : j === 1 ? "text-cyan-300" : ""}>
                            {part}
                          </span>
                        ))}
                      </span>
                    ))}
                  </pre>
                </motion.li>
              ))}
            </ul>

            <p className="flex items-center gap-2 text-xs text-slate-500">
              <Quote className="h-3.5 w-3.5" aria-hidden />
              Answer grounded in 2 source files
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </p>
          </div>
        </div>
      </div>

      <motion.div
        aria-hidden
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -right-3 -top-5 hidden items-center gap-2.5 rounded-xl border border-white/[0.12] bg-[#0d0d14]/95 px-3.5 py-2.5 shadow-xl shadow-black/40 backdrop-blur-md sm:flex lg:-right-8"
      >
        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
        <div>
          <p className="text-xs font-semibold text-white">Repository indexed</p>
          <p className="text-[11px] text-slate-400">312 files · 1,248 chunks</p>
        </div>
      </motion.div>

      <motion.div
        aria-hidden
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -bottom-5 -left-3 hidden items-center gap-2.5 rounded-xl border border-white/[0.12] bg-[#0d0d14]/95 px-3.5 py-2.5 shadow-xl shadow-black/40 backdrop-blur-md sm:flex lg:-left-8"
      >
        <Sparkles className="h-5 w-5 text-violet-300" />
        <div>
          <p className="text-xs font-semibold text-white">Semantic search</p>
          <p className="text-[11px] text-slate-400">Ask in plain English</p>
        </div>
      </motion.div>
    </div>
  )
}
