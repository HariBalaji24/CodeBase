"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, LayoutDashboard, LogOut, Plus, User } from "lucide-react";

// Avatar button + dropdown for signed-in users. Renders nothing while signed out.
export function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!user) return null;

  const initial = (user.name ?? user.email ?? "?").charAt(0).toUpperCase();

  const itemClass =
    "flex items-center gap-2 px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:bg-white/[0.06] focus-visible:outline-none";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] p-1.5 pr-2.5 transition-colors hover:border-violet-400/40 hover:bg-white/[0.08] focus-visible:outline-2 focus-visible:outline-violet-400"
      >
        <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-sm font-bold text-white">
          {user.image ? (
            // Provider avatars (GitHub/Google) are already resized; skip the image proxy.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt=""
              width={32}
              height={32}
              referrerPolicy="no-referrer"
              className="h-8 w-8 object-cover"
            />
          ) : (
            initial || <User className="h-4 w-4" aria-hidden />
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d14]/95 py-2 shadow-2xl shadow-black/50 backdrop-blur-xl"
          >
            <div className="border-b border-white/10 px-3 pb-3 pt-1">
              <p className="truncate text-sm font-medium text-white">{user.name ?? "Signed in"}</p>
              <p className="truncate text-xs text-slate-400">{user.email}</p>
            </div>

            <Link href="/dashboard" role="menuitem" onClick={() => setOpen(false)} className={itemClass}>
              <LayoutDashboard className="h-4 w-4" aria-hidden />
              Dashboard
            </Link>
            <Link href="/" role="menuitem" onClick={() => setOpen(false)} className={itemClass}>
              <Plus className="h-4 w-4" aria-hidden />
              Analyze repository
            </Link>

            <div className="my-2 border-t border-white/10" />

            <button
              role="menuitem"
              onClick={() => void logout()}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300 focus-visible:bg-red-500/10 focus-visible:outline-none"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
