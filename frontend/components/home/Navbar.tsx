"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { Boxes, Menu, X } from "lucide-react"
import { useAuth } from "@/components/auth/AuthProvider"
import { UserMenu } from "@/components/auth/UserMenu"
import { container } from "./motion"

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#testimonials", label: "Testimonials" },
]

export function Navbar() {
  const { status } = useAuth()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const signedIn = status === "authenticated"

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed inset-x-0 top-0 z-50 border-b backdrop-blur-xl transition-colors duration-300 ${
        scrolled || open ? "border-white/10 bg-[#050506]/85 shadow-lg shadow-black/30" : "border-transparent bg-transparent"
      }`}
    >
      <nav aria-label="Main" className={container}>
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="group flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-violet-400">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-violet-500/25 transition-transform duration-300 group-hover:rotate-6">
              <Boxes className="h-5 w-5 text-white" aria-hidden />
            </span>
            <span className="bg-gradient-to-r from-blue-300 via-violet-300 to-cyan-300 bg-clip-text text-xl font-bold text-transparent">
              CodeBase
            </span>
          </Link>

          <ul className="hidden items-center gap-1 md:flex">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-2 focus-visible:outline-violet-400"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="hidden items-center gap-3 md:flex">
            {signedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-violet-400"
                >
                  Dashboard
                </Link>
                <UserMenu />
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-violet-400"
                >
                  Sign in
                </Link>
                <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    href="/auth/signup"
                    className="block rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-shadow hover:shadow-violet-500/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300"
                  >
                    Get started
                  </Link>
                </motion.div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-200 transition-colors hover:bg-white/[0.08] focus-visible:outline-2 focus-visible:outline-violet-400 md:hidden"
          >
            {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden md:hidden"
          >
            <div className={`${container} space-y-1 pb-5 pt-2`}>
              {LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-4 py-3 text-base font-medium text-slate-200 transition-colors hover:bg-white/[0.06]"
                >
                  {link.label}
                </a>
              ))}
              <div className="grid gap-2 pt-3">
                {signedIn ? (
                  <Link
                    href="/dashboard"
                    className="rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 px-4 py-3 text-center text-sm font-semibold text-white"
                  >
                    Go to dashboard
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/auth/login"
                      className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-sm font-medium text-white"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/auth/signup"
                      className="rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 px-4 py-3 text-center text-sm font-semibold text-white"
                    >
                      Get started
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
