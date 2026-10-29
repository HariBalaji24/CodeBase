"use client"

import { motion } from "framer-motion"
import { Cpu, Database, GitBranch, MessageSquareText, type LucideIcon } from "lucide-react"
import { GraphIllustration } from "./GraphIllustration"
import { Reveal, Stagger, container, fadeUp } from "./motion"

const STEPS: { icon: LucideIcon; title: string; description: string }[] = [
  { icon: GitBranch, title: "Connect a repository", description: "Paste a GitHub URL. We download and parse it for you." },
  { icon: Cpu, title: "Parse & chunk", description: "Source files are split into meaningful chunks that keep their structure." },
  { icon: Database, title: "Embed & index", description: "Embeddings are stored in a vector database for instant similarity search." },
  { icon: MessageSquareText, title: "Ask anything", description: "Query in plain English and get answers with exact file and line references." },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="relative scroll-mt-20 overflow-hidden border-t border-white/[0.06] py-24 lg:py-32">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-[480px] w-[880px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/10 blur-[120px]" />

      <div className={`${container} relative`}>
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
          <div>
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-400">How it works</p>
              <h2 id="how-title" className="mt-3 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
                From repository to{" "}
                <span className="bg-gradient-to-r from-blue-300 via-violet-300 to-cyan-300 bg-clip-text text-transparent">
                  intelligence
                </span>{" "}
                in minutes
              </h2>
              <p className="mt-4 text-pretty text-lg leading-8 text-slate-300">
                CodeBase handles the pipeline of parsing, embedding and indexing so you can focus on
                understanding your code.
              </p>
            </Reveal>

            <Stagger className="mt-10" gap={0.12}>
              <ol className="relative space-y-7">
                <span aria-hidden className="absolute bottom-6 left-6 top-6 w-px bg-gradient-to-b from-violet-400/50 via-white/10 to-transparent" />
                {STEPS.map(({ icon: Icon, title, description }, index) => (
                  <motion.li key={title} variants={fadeUp} className="relative flex gap-5">
                    <div className="relative z-10 grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-white/[0.12] bg-[#0d0d14] shadow-lg shadow-black/40">
                      <Icon className="h-5 w-5 text-violet-300" aria-hidden />
                      <span className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-[10px] font-bold text-white">
                        {index + 1}
                      </span>
                    </div>
                    <div className="pt-1">
                      <h3 className="text-lg font-semibold text-white">{title}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-400">{description}</p>
                    </div>
                  </motion.li>
                ))}
              </ol>
            </Stagger>
          </div>

          <Reveal delay={0.1}>
            <div className="rounded-3xl border border-white/[0.1] bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-6 shadow-2xl shadow-black/40 backdrop-blur sm:p-8">
              <GraphIllustration />
              <p className="mt-2 text-center text-xs text-slate-500">Your codebase, mapped as a connected graph</p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
