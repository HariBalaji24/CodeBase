"use client"

import type { ReactNode } from "react"
import { motion, type Variants } from "framer-motion"

// Shared motion primitives for the landing page. Everything animates transform/opacity only,
// plays once, and is switched off for visitors who prefer reduced motion (see <MotionConfig>
// in app/page.tsx).

const EASE = [0.22, 1, 0.36, 1] as const

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
}

export const stagger = (staggerChildren = 0.1, delayChildren = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren, delayChildren } },
})

// Fades its children up when scrolled into view.
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Container that staggers its <motion.* variants={fadeUp}> children as it scrolls into view.
export function Stagger({
  children,
  className,
  gap = 0.1,
}: {
  children: ReactNode
  className?: string
  gap?: number
}) {
  return (
    <motion.div
      variants={stagger(gap)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function SectionHeading({
  id,
  eyebrow,
  title,
  highlight,
  description,
}: {
  id?: string
  eyebrow: string
  title: string
  highlight: string
  description: string
}) {
  return (
    <Stagger className="mx-auto max-w-2xl text-center" gap={0.08}>
      <motion.p variants={fadeUp} className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-400">
        {eyebrow}
      </motion.p>
      <motion.h2 id={id} variants={fadeUp} className="mt-3 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
        {title}{" "}
        <span className="bg-gradient-to-r from-blue-300 via-violet-300 to-cyan-300 bg-clip-text text-transparent">
          {highlight}
        </span>
      </motion.h2>
      <motion.p variants={fadeUp} className="mt-4 text-pretty text-lg leading-8 text-slate-300">
        {description}
      </motion.p>
    </Stagger>
  )
}

export const container = "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
