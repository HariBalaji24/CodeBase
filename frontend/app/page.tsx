"use client"

import { MotionConfig } from "framer-motion"
import { Navbar } from "@/components/home/Navbar"
import { Hero } from "@/components/home/Hero"
import { Features } from "@/components/home/Features"

export default function HomePage() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[#050506] text-white">
        <a
          href="#main"
          className="sr-only rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-60"
        >
          Skip to content
        </a>
        <Navbar />
        <main id="main">
          <Hero />
          <Features />
          <HowItWorks />
          <Testimonials />
          <Cta />
        </main>
        <Footer />
      </div>
    </MotionConfig>
  )
}

import { HowItWorks } from "@/components/home/HowItWorks"
import { Testimonials } from "@/components/home/Testimonials"
import { Cta, Footer } from "@/components/home/CtaAndFooter"