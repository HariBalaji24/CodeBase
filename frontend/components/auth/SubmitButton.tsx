"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

export function SubmitButton({
  pending,
  pendingLabel,
  children,
}: {
  pending: boolean;
  pendingLabel: string;
  children: ReactNode;
}) {
  return (
    <motion.button
      type="submit"
      disabled={pending}
      whileHover={pending ? undefined : { y: -2 }}
      whileTap={pending ? undefined : { scale: 0.98 }}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {pending ? pendingLabel : children}
    </motion.button>
  );
}
