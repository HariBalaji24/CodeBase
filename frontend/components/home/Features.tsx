"use client"

import { motion } from "framer-motion"
import { Activity, Bot, LayoutDashboard, Network, Quote, Search, type LucideIcon } from "lucide-react"
import { Stagger, SectionHeading, container, fadeUp } from "./motion"

const FEATURES: { icon: LucideIcon; title: string; description: string; accent: string }[] = [
  {
    icon: Search,
    title: "Semantic code search",
    description: "Ask in natural language and find the implementation, even when you don't know the exact keywords.",
    accent: "from-blue-500/25 to-blue-500/0 text-blue-300",
  },
  {
    icon: Network,
    title: "Dependency intelligence",
    description: "See how files, functions and services connect, so you understand the impact before you change anything.",
    accent: "from-violet-500/25 to-violet-500/0 text-violet-300",
  },
  {
    icon: Bot,
    title: "AI code assistant",
    description: "Get contextual answers grounded in your actual source instead of generic guesses.",
    accent: "from-cyan-500/25 to-cyan-500/0 text-cyan-300",
  },
  {
    icon: Quote,
    title: "Line-level citations",
    description: "Every result points to the exact file and line range, so you can verify an answer in one click.",
    accent: "from-fuchsia-500/25 to-fuchsia-500/0 text-fuchsia-300",
  },
  {
    icon: Activity,
    title: "Live indexing progress",
    description: "Watch your repository move through download, parsing, chunking and embedding in real time.",
    accent: "from-emerald-500/25 to-emerald-500/0 text-emerald-300",
  },
  {
    icon: LayoutDashboard,
    title: "Your personal dashboard",
    description: "Keep every analyzed repository in one place, with language breakdowns and the biggest files at a glance.",
    accent: "from-amber-500/25 to-amber-500/0 text-amber-300",
  },
]

export function Features() {
  return (
    <section id="features" aria-labelledby="features-title" className="scroll-mt-20 border-t border-white/[0.06] py-24 lg:py-32">
      <div className={container}>
        <SectionHeading
          id="features-title"
          eyebrow="Capabilities"
          title="Everything you need to"
          highlight="understand code"
          description="From semantic search to dependency analysis, CodeBase builds a complete picture of your repository."
        />

        <Stagger className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" gap={0.08}>
          {FEATURES.map(({ icon: Icon, title, description, accent }) => (
            <motion.article
              key={title}
              variants={fadeUp}
              whileHover={{ y: -6 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              className="group relative overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0a0a0f] p-6 transition-colors duration-300 hover:border-violet-400/40"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-violet-500/0 blur-3xl transition-colors duration-500 group-hover:bg-violet-500/20"
              />
              <div
                className={`relative grid h-12 w-12 place-items-center rounded-xl border border-white/[0.1] bg-gradient-to-br ${accent} transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3`}
              >
                <Icon className="h-6 w-6" aria-hidden />
              </div>
              <h3 className="relative mt-6 text-lg font-semibold text-white">{title}</h3>
              <p className="relative mt-2.5 text-sm leading-6 text-slate-400">{description}</p>
            </motion.article>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
