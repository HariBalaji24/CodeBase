"use client"

import { useRef, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, useScroll, useTransform } from "framer-motion"
import { ArrowRight, Quote, Search, Sparkles, Zap } from "lucide-react"
import { HeroPreview } from "./HeroPreview"
import { container, fadeUp, stagger } from "./motion"
import { useAuth } from "@/components/auth/AuthProvider"
import { getAccessToken } from "@/services/auth.service"

const HIGHLIGHTS = [
  { icon: Search, label: "Semantic search" },
  { icon: Quote, label: "Line-level citations" },
  { icon: Zap, label: "Live indexing progress" },
]

export function Hero() {
  const router = useRouter()
  const { user, status } = useAuth()
  const [url, setUrl] = useState("")
  const [error, setError] = useState("")

  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] })
  const glowY = useTransform(scrollYProgress, [0, 1], [0, 120])
  const previewY = useTransform(scrollYProgress, [0, 1], [0, -40])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    if (!url.trim()) {
      setError("Please enter a GitHub repository URL.")
      return
    }
    if (!url.includes("github.com")) {
      setError("Please enter a valid GitHub repository URL.")
      return
    }

    setError("")

    try {
      const token = await getAccessToken()
      
      if (!token) {
        router.push(`/auth/login?callbackUrl=/details?repo=${encodeURIComponent(url.trim())}`)
        return
      }

      router.push(`/details?repo=${encodeURIComponent(url.trim())}`)
    } catch {
      setError("Failed to start analysis. Please try again.")
    }
  }

  const isAuthenticated = status === "authenticated"

  return (
    <section ref={ref} className="relative overflow-hidden pb-24 pt-32 sm:pt-36 lg:pb-32 lg:pt-40">
      <motion.div aria-hidden style={{ y: glowY }} className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[120px]" />
        <div className="absolute -left-24 top-40 h-72 w-72 rounded-full bg-blue-600/15 blur-[100px]" />
        <div className="absolute -right-24 top-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-[100px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />
      </motion.div>

      <div className={`${container} relative`}>
        <motion.div variants={stagger(0.12, 0.05)} initial="hidden" animate="show" className="mx-auto max-w-3xl text-center">
          <motion.div
            variants={fadeUp}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.04] py-1.5 pl-2 pr-4 backdrop-blur"
          >
            <span className="grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600">
              <Sparkles className="h-3 w-3 text-white" aria-hidden />
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
              AI-powered code intelligence
            </span>
          </motion.div>

          <motion.h1 variants={fadeUp} className="text-balance text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Understand your{" "}
            <span className="bg-gradient-to-r from-blue-300 via-violet-300 to-cyan-300 bg-clip-text text-transparent">
              codebase deeply
            </span>
          </motion.h1>

          <motion.p variants={fadeUp} className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-8 text-slate-300">
            Connect any GitHub repository and explore its architecture, dependencies and code in plain
            English. Every answer is backed by the source, with file and line references.
          </motion.p>

          <motion.form variants={fadeUp} onSubmit={handleSubmit} noValidate className="mx-auto mt-10 w-full max-w-2xl text-left">
            <div className="flex flex-col gap-2 rounded-2xl border border-white/[0.12] bg-[#0a0a0f]/80 p-2 shadow-2xl shadow-violet-950/40 backdrop-blur transition-colors focus-within:border-violet-400/50 sm:flex-row">
              <label htmlFor="repo-url" className="sr-only">
                GitHub repository URL
              </label>
              <input
                id="repo-url"
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value)
                  setError("")
                }}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "repo-url-error" : undefined}
                placeholder="https://github.com/username/repository"
                className="h-12 w-full flex-1 bg-transparent px-4 text-sm text-white outline-none placeholder:text-slate-500"
              />
              <motion.button
                type="submit"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="group relative flex h-12 items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 px-7 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300"
              >
                <span
                  aria-hidden
                  className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                />
                <span className="relative">Analyze</span>
                <ArrowRight className="relative h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
              </motion.button>
            </div>
            {error && (
              <p id="repo-url-error" role="alert" className="mt-3 text-sm text-red-400">
                {error}
              </p>
            )}
          </motion.form>

          <motion.ul variants={fadeUp} className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-slate-400">
            {HIGHLIGHTS.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-violet-400" aria-hidden />
                {label}
              </li>
            ))}
          </motion.ul>

          {!isAuthenticated && (
            <motion.p variants={fadeUp} className="mt-6 text-sm text-slate-500">
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="font-medium text-violet-300 underline-offset-4 transition-colors hover:text-violet-200 hover:underline focus-visible:outline-2 focus-visible:outline-violet-400"
              >
                Sign in
              </Link>
            </motion.p>
          )}

          
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 48 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mt-16 max-w-4xl lg:mt-20"
        >
          <motion.div style={{ y: previewY }}>
            <HeroPreview />
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}