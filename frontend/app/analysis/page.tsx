"use client";

import dynamic from "next/dynamic";

const AnalysisContent = dynamic(
  () =>
    import("./AnalysisContent").then(
      (module) => module.AnalysisContent
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-screen w-full bg-[#050608]" />
    ),
  }
);

export default function AnalysisPage() {
  return <AnalysisContent />;
}