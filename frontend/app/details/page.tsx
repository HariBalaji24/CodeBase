"use client";

import dynamic from "next/dynamic";

const AnalyzePage = dynamic(
  () =>
    import("./AnalyzePage").then(
      (module) => module.AnalyzePage
    ),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen w-full bg-[#050608]" />
    ),
  }
);

export default function DetailsPage() {
  return <AnalyzePage />;
}