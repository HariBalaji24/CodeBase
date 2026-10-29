"use client";

import { useId, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-black/30 py-3 pl-10 text-white placeholder:text-slate-500 transition-all focus:border-violet-400/50 focus:outline-none focus:ring-2 focus:ring-violet-400/20 disabled:opacity-60";

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "type"> & {
  label: string;
};

export function EmailField({ label, ...props }: FieldProps) {
  const id = useId();

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-slate-300">
        {label}
      </label>
      <div className="relative">
        <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" aria-hidden />
        <input id={id} type="email" autoComplete="email" className={`${inputClass} pr-4`} {...props} />
      </div>
    </div>
  );
}

export function PasswordField({ label, ...props }: FieldProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-slate-300">
        {label}
      </label>
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" aria-hidden />
        <input id={id} type={visible ? "text" : "password"} className={`${inputClass} pr-12`} {...props} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-violet-400"
        >
          {visible ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
        </button>
      </div>
    </div>
  );
}
