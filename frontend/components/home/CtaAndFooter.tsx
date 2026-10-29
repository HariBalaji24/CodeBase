"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, Boxes, Sparkles } from "lucide-react"
import { useAuth } from "@/components/auth/AuthProvider"
import { Reveal, container } from "./motion"

export function Cta() {
  const { status } = useAuth()
  const signedIn = status === "authenticated"

  return (
    <section aria-labelledby="cta-title" className="border-t border-white/[0.06] py-24 lg:py-32">
      <div className={container}>
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-white/[0.12] bg-gradient-to-br from-violet-600/20 via-[#0a0a0f] to-blue-600/20 px-6 py-16 text-center shadow-2xl shadow-violet-950/40 sm:px-12 lg:py-20">
            <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[600px] -translate-x-1/2 rounded-full bg-violet-500/30 blur-[100px]" />
            <div className="relative mx-auto max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.05] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-violet-200">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Ready when you are
              </span>
              <h2 id="cta-title" className="mt-6 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
                Start analyzing in seconds
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-pretty text-lg leading-8 text-slate-300">
                Connect your first repository and experience semantic code search powered by AI.
              </p>

              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="mt-9 inline-block">
                <Link
                  href={signedIn ? "/dashboard" : "/auth/signup"}
                  className="group relative inline-flex items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-500 to-violet-600 px-8 py-4 text-sm font-semibold text-white shadow-xl shadow-violet-500/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300"
                >
                  <span
                    aria-hidden
                    className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                  />
                  <span className="relative">{signedIn ? "Go to your dashboard" : "Analyze your first repository"}</span>
                  <ArrowRight className="relative h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
                </Link>
              </motion.div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

const FOOTER_LINKS = [
  {
    heading: "Product",
    links: [
      { href: "#features", label: "Features" },
      { href: "#how-it-works", label: "How it works" },
      { href: "#testimonials", label: "Testimonials" },
    ],
  },
  {
    heading: "Account",
    links: [
      { href: "/auth/login", label: "Sign in" },
      { href: "/auth/signup", label: "Create account" },
      { href: "/dashboard", label: "Dashboard" },
    ],
  },
]

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-gradient-to-b from-transparent to-black/40">
      <div className={`${container} py-14`}>
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-violet-400">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600">
                <Boxes className="h-5 w-5 text-white" aria-hidden />
              </span>
              <span className="text-xl font-bold text-white">CodeBase</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-slate-400">
              AI-powered code intelligence for developers. Understand any repository, faster.
            </p>
          </div>

          {FOOTER_LINKS.map((group) => (
            <nav key={group.heading} aria-label={group.heading}>
              <h3 className="text-sm font-semibold text-white">{group.heading}</h3>
              <ul className="mt-4 space-y-3">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-400 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-violet-400"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 border-t border-white/[0.06] pt-6 text-sm text-slate-500">
          &copy; {new Date().getFullYear()} CodeBase. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
