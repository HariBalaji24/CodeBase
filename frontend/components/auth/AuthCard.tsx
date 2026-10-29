"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

// Heading + glass card + footer line shared by login, signup and the error page.
export function AuthCard({
  title,
  subtitle,
  footer,
  children,
}: {
  title: string;
  subtitle?: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full max-w-md"
    >
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-white">{title}</h1>
        {subtitle && <p className="text-slate-400">{subtitle}</p>}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8">
        {children}
      </div>

      {footer && <p className="mt-6 text-center text-sm text-slate-400">{footer}</p>}
    </motion.div>
  );
}
