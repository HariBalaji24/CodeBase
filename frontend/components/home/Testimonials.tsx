"use client"

import { motion } from "framer-motion"
import { Star } from "lucide-react"
import { Stagger, SectionHeading, container, fadeUp } from "./motion"

// PLACEHOLDER COPY: these are sample quotes with fictional people. Replace them with real
// customer feedback (and permission to use their names) before launch.
const TESTIMONIALS = [
  {
    quote:
      "I joined a 400-file service on Monday and shipped a fix by Wednesday. Asking where things live beat grepping for hours.",
    name: "Priya Raman",
    role: "Backend engineer",
    gradient: "from-blue-500 to-cyan-400",
  },
  {
    quote:
      "The line-level citations are what sold me. I can trust an answer because I can open the exact lines it came from.",
    name: "Marcus Hale",
    role: "Staff engineer",
    gradient: "from-violet-500 to-fuchsia-500",
  },
  {
    quote:
      "We use it for code review prep and onboarding. New teammates get oriented in an afternoon instead of a week.",
    name: "Sofia Alvarez",
    role: "Engineering manager",
    gradient: "from-emerald-400 to-cyan-500",
  },
]

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")

export function Testimonials() {
  return (
    <section id="testimonials" aria-labelledby="testimonials-title" className="scroll-mt-20 border-t border-white/[0.06] py-24 lg:py-32">
      <div className={container}>
        <SectionHeading
          id="testimonials-title"
          eyebrow="Loved by developers"
          title="Less digging,"
          highlight="more building"
          description="Teams use CodeBase to get up to speed on unfamiliar code faster."
        />

        <Stagger className="mt-16 grid gap-5 lg:grid-cols-3" gap={0.12}>
          {TESTIMONIALS.map((item) => (
            <motion.figure
              key={item.name}
              variants={fadeUp}
              whileHover={{ y: -6 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              className="flex flex-col rounded-2xl border border-white/[0.1] bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-7 transition-colors duration-300 hover:border-violet-400/40"
            >
              <div className="flex gap-0.5" role="img" aria-label="5 out of 5 stars">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
                ))}
              </div>
              <blockquote className="mt-5 flex-1 text-pretty leading-7 text-slate-200">&ldquo;{item.quote}&rdquo;</blockquote>
              <figcaption className="mt-7 flex items-center gap-3">
                <span
                  aria-hidden
                  className={`grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br ${item.gradient} text-sm font-bold text-white`}
                >
                  {initials(item.name)}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-white">{item.name}</span>
                  <span className="block text-xs text-slate-400">{item.role}</span>
                </span>
              </figcaption>
            </motion.figure>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
