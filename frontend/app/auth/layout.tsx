import Link from "next/link";
import { Code2 } from "lucide-react";

// Shell shared by /auth/login, /auth/signup and /auth/error.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07070c]">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute -left-40 -top-40 h-[560px] w-[560px] rounded-full"
          style={{ background: "radial-gradient(closest-side, rgba(59,130,246,0.28), transparent)" }}
        />
        <div
          className="absolute -bottom-52 -right-40 h-[620px] w-[620px] rounded-full"
          style={{ background: "radial-gradient(closest-side, rgba(139,92,246,0.26), transparent)" }}
        />
      </div>

      <main className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-12">
        <Link
          href="/"
          className="mb-8 flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-400"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-400 shadow-lg shadow-violet-500/25">
            <Code2 size={20} className="text-white" aria-hidden />
          </span>
          <span className="bg-gradient-to-r from-blue-300 via-violet-300 to-cyan-300 bg-clip-text text-xl font-bold text-transparent">
            CodeBase
          </span>
        </Link>

        {children}
      </main>
    </div>
  );
}
