"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import getgithubrepository from "@/services/file.service";

interface Repository {
  name?: string;
  full_name?: string;
  description?: string | null;
  html_url?: string;
  homepage?: string | null;
  language?: string | null;
  stargazers_count?: number;
  forks_count?: number;
  open_issues_count?: number;
  watchers_count?: number;
  size?: number;
  default_branch?: string;
  topics?: string[];
  created_at?: string;
  updated_at?: string;
  pushed_at?: string;
  private?: boolean;
  archived?: boolean;
  owner?: {
    login?: string;
    avatar_url?: string;
    html_url?: string;
  };
}
interface PageProps {
  searchParams: Promise<{
    repo?: string;
  }>;
}
const Page = ({ searchParams }: PageProps) => {

  const [response, setResponse] = useState<Repository | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchRepository = async () => {
      const params = await searchParams;
  const url = params.repo;

      if (!url) {
        setError("No GitHub repository URL was provided.");
        setLoading(false);
        return;
      }

      try {
        const data = await getgithubrepository(url);

        console.log("Repository response:", data);

        setResponse(data);
      } catch (error) {
        console.error(error);
        setError("Unable to fetch repository details.");
      } finally {
        setLoading(false);
      }
    };

    fetchRepository();
  }, [searchParams]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0d1117] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-gray-600 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">
            Analyzing repository...
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#0d1117] text-white flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-[#161b22] border border-red-500/30 rounded-xl p-8 text-center">
          <div className="text-4xl mb-4">⚠️</div>

          <h1 className="text-xl font-semibold mb-2">
            Something went wrong
          </h1>

          <p className="text-gray-400">
            {error}
          </p>
        </div>
      </main>
    );
  }

  if (!response) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#0d1117] text-white">
      {/* Header */}
      <header className="border-b border-[#30363d] bg-[#0d1117]/95">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">
              Repository Analysis
            </p>

            <h1 className="text-2xl font-bold tracking-tight">
              {response.name || "Unnamed Repository"}
            </h1>
          </div>

          {response.html_url && (
            <a
              href={response.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg border border-[#30363d] bg-[#161b22] hover:bg-[#21262d] transition text-sm font-medium"
            >
              View on GitHub ↗
            </a>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Repository Overview */}
        <section className="mb-8">
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-7">
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              {/* Avatar */}
              {response.owner?.avatar_url && (
                <img
                  src={response.owner.avatar_url}
                  alt={response.owner.login || "Owner"}
                  className="w-16 h-16 rounded-xl border border-[#30363d]"
                />
              )}

              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <h2 className="text-2xl font-semibold">
                    {response.full_name || response.name}
                  </h2>

                  {response.private ? (
                    <span className="px-2.5 py-1 rounded-full text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                      Private
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs bg-green-500/10 text-green-400 border border-green-500/20">
                      Public
                    </span>
                  )}

                  {response.archived && (
                    <span className="px-2.5 py-1 rounded-full text-xs bg-red-500/10 text-red-400 border border-red-500/20">
                      Archived
                    </span>
                  )}
                </div>

                <p className="text-gray-400 leading-relaxed max-w-3xl">
                  {response.description ||
                    "No description provided for this repository."}
                </p>

                {response.owner?.login && (
                  <p className="text-sm text-gray-500 mt-4">
                    Owned by{" "}
                    <span className="text-gray-300">
                      {response.owner.login}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Statistics */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Stars"
            value={formatNumber(response.stargazers_count)}
            icon="★"
          />

          <StatCard
            label="Forks"
            value={formatNumber(response.forks_count)}
            icon="⑂"
          />

          <StatCard
            label="Open Issues"
            value={formatNumber(response.open_issues_count)}
            icon="○"
          />

          <StatCard
            label="Watchers"
            value={formatNumber(response.watchers_count)}
            icon="◉"
          />
        </section>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Repository Information */}
          <section className="lg:col-span-2 bg-[#161b22] border border-[#30363d] rounded-2xl">
            <div className="px-6 py-5 border-b border-[#30363d]">
              <h2 className="font-semibold text-lg">
                Repository Information
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                General information about this project
              </p>
            </div>

            <div className="p-6 grid sm:grid-cols-2 gap-6">
              <InfoItem
                label="Primary Language"
                value={response.language || "Not specified"}
              />

              <InfoItem
                label="Default Branch"
                value={response.default_branch || "Not specified"}
              />

              <InfoItem
                label="Repository Size"
                value={
                  response.size
                    ? `${response.size.toLocaleString()} KB`
                    : "Not available"
                }
              />

              <InfoItem
                label="Created"
                value={formatDate(response.created_at)}
              />

              <InfoItem
                label="Last Updated"
                value={formatDate(response.updated_at)}
              />

              <InfoItem
                label="Last Push"
                value={formatDate(response.pushed_at)}
              />
            </div>
          </section>

          {/* Quick Links */}
          <section className="bg-[#161b22] border border-[#30363d] rounded-2xl">
            <div className="px-6 py-5 border-b border-[#30363d]">
              <h2 className="font-semibold text-lg">
                Quick Links
              </h2>
            </div>

            <div className="p-6 space-y-3">
              {response.html_url && (
                <ExternalLink
                  label="GitHub Repository"
                  href={response.html_url}
                />
              )}

              {response.homepage && (
                <ExternalLink
                  label="Project Homepage"
                  href={response.homepage}
                />
              )}

              {response.owner?.html_url && (
                <ExternalLink
                  label="Repository Owner"
                  href={response.owner.html_url}
                />
              )}
            </div>
          </section>
        </div>

        {/* Topics */}
        {response.topics && response.topics.length > 0 && (
          <section className="mt-6 bg-[#161b22] border border-[#30363d] rounded-2xl">
            <div className="px-6 py-5 border-b border-[#30363d]">
              <h2 className="font-semibold text-lg">
                Topics
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Technologies and concepts associated with this repository
              </p>
            </div>

            <div className="p-6 flex flex-wrap gap-2">
              {response.topics.map((topic) => (
                <span
                  key={topic}
                  className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-sm"
                >
                  {topic}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Analysis Placeholder */}
        <section className="mt-6 bg-[#161b22] border border-[#30363d] rounded-2xl">
          <div className="px-6 py-5 border-b border-[#30363d]">
            <h2 className="font-semibold text-lg">
              AI Repository Analysis
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Intelligent analysis of the repository codebase
            </p>
          </div>

          <div className="p-8 text-center">
            <div className="text-3xl mb-3">✦</div>

            <h3 className="font-medium mb-2">
              AI analysis coming soon
            </h3>

            <p className="text-gray-500 text-sm max-w-lg mx-auto">
              This section can later contain architecture analysis,
              code quality insights, dependency analysis, security
              findings, and an AI-generated repository summary.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
};

/* ---------------- Components ---------------- */

interface StatCardProps {
  label: string;
  value: string;
  icon: string;
}

const StatCard = ({
  label,
  value,
  icon,
}: StatCardProps) => {
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500">
          {label}
        </span>

        <span className="text-gray-400">
          {icon}
        </span>
      </div>

      <p className="text-2xl font-bold">
        {value}
      </p>
    </div>
  );
};

interface InfoItemProps {
  label: string;
  value: string;
}

const InfoItem = ({
  label,
  value,
}: InfoItemProps) => {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-gray-500 mb-1.5">
        {label}
      </p>

      <p className="text-gray-200 font-medium">
        {value}
      </p>
    </div>
  );
};

interface ExternalLinkProps {
  label: string;
  href: string;
}

const ExternalLink = ({
  label,
  href,
}: ExternalLinkProps) => {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between p-3 rounded-lg border border-[#30363d] hover:bg-[#21262d] transition group"
    >
      <span className="text-sm text-gray-300">
        {label}
      </span>

      <span className="text-gray-500 group-hover:text-white transition">
        ↗
      </span>
    </a>
  );
};

/* ---------------- Helpers ---------------- */

function formatNumber(value?: number): string {
  if (value === undefined || value === null) {
    return "0";
  }

  return new Intl.NumberFormat("en", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDate(value?: string): string {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export default Page;