"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle } from "lucide-react";

const TONES = {
  error: {
    box: "border-red-500/25 bg-red-500/10 text-red-300",
    Icon: AlertCircle,
    role: "alert",
  },
  success: {
    box: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    Icon: CheckCircle,
    role: "status",
  },
} as const;

export function FormAlert({
  tone,
  children,
}: {
  tone: keyof typeof TONES;
  children?: ReactNode;
}) {
  const { box, Icon, role } = TONES[tone];

  return (
    <AnimatePresence initial={false}>
      {children && (
        <motion.div
          role={role}
          initial={{ opacity: 0, height: 0, marginBottom: 0 }}
          animate={{ opacity: 1, height: "auto", marginBottom: 20 }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          className="overflow-hidden"
        >
          <div className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${box}`}>
            <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{children}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
