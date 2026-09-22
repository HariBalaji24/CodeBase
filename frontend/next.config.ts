import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Falls back to the deployed backend if NEXT_PUBLIC_BACKEND_URL isn't set
    // on the build host (e.g. Vercel project env vars weren't configured).
    // A local .env with NEXT_PUBLIC_BACKEND_URL=http://localhost:5000 still
    // takes priority for local dev, since Next.js loads .env before this file.
    NEXT_PUBLIC_BACKEND_URL:
      process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://codebase-j49t.onrender.com",
  },
};

export default nextConfig;
