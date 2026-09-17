"use client";

import {
  Suspense,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { useRouter, useSearchParams } from "next/navigation";

import getgithubrepository from "@/services/file.service";

import {
  Activity,
  ArrowUpRight,
  Bot,
  Boxes,
  Check,
  ChevronRight,
  CircleDot,
  Code2,
  ExternalLink,
  FolderGit2,
  GitBranch,
  GitPullRequest,
  HardDrive,
  Layers3,
  Link2,
  Network,
  Search,
  Sparkles,
  Star,
  Users,
  XCircle,
  Zap,
} from "lucide-react";

import { motion } from "framer-motion";

/* =========================================================
   TYPES
========================================================= */

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

/* =========================================================
   PAGE
========================================================= */

const AnalyzePage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [response, setResponse] = useState<Repository | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* =======================================================
     FETCH REPOSITORY
  ======================================================= */

  useEffect(() => {
    const fetchRepository = async () => {
      const url = searchParams.get("repo");

      if (!url) {
        setError("No GitHub repository URL was provided.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const data = await getgithubrepository(url);

        console.log("Repository response:", data);

        setResponse(data);
      } catch (err) {
        console.error(err);
        setError("Unable to fetch repository details.");
      } finally {
        setLoading(false);
      }
    };

    fetchRepository();
  }, [searchParams]);

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return <AnalysisLoading />;
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (error) {
    return <AnalysisError message={error} />;
  }

  if (!response) {
    return null;
  }

  /* =======================================================
     ANALYZE REPOSITORY
  ======================================================= */

  const handleAnalyze = () => {
    if (!response.html_url) return;

    router.push(
      `/analysis?repo=${encodeURIComponent(response.html_url)}`
    );
  };

  /* =======================================================
     MAIN UI
  ======================================================= */

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050608] text-white">
      <DashboardBackground />

      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#050608]/85 backdrop-blur-2xl">
        <div className="mx-auto flex h-[72px] max-w-[1550px] items-center justify-between px-5 sm:px-8 lg:px-10">
          {/* Logo */}

          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{
                rotate: 5,
                scale: 1.05,
              }}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-400/[0.08]"
            >
              <Code2
                size={21}
                className="text-blue-400"
              />
</motion.div>

            <div>
              <div className="text-base font-bold tracking-tight">
                CodeBase
              </div>

              <div className="hidden text-[11px] uppercase tracking-[0.18em] text-white/30 sm:block">
                Code Intelligence
              </div>
            </div>
          </div>

          {/* Breadcrumb */}

          <div className="hidden items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] px-5 py-2.5 md:flex">
            <FolderGit2
              size={16}
              className="text-blue-400/80"
            />

            <span className="max-w-[360px] truncate font-mono text-xs text-white/50">
              {response.full_name || response.name}
            </span>

            <span className="text-white/15">
              /
            </span>

            <span className="text-sm font-medium text-white/35">
              Repository
            </span>
          </div>

          {/* GitHub */}

          {response.html_url && (
            <a
              href={response.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2.5 rounded-xl border border-white/[0.09] bg-white/[0.035] px-4 py-2.5 text-sm font-medium text-white/65 transition-all duration-300 hover:border-blue-400/30 hover:bg-blue-400/[0.06] hover:text-white"
            >
              <GitHubIcon />

              <span className="hidden sm:block">
                View on GitHub
              </span>

              <ArrowUpRight
                size={15}
                className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </a>
          )}
        </div>
      </header>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <div className="mx-auto max-w-[1550px] px-5 py-8 sm:px-8 lg:px-10 lg:py-12">

        {/* ===================================================
            REPOSITORY HERO
        =================================================== */}

        <motion.section
          initial={{
            opacity: 0,
            y: 25,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.65,
          }}
          className="relative overflow-hidden rounded-3xl border border-white/[0.09] bg-white/[0.025] shadow-2xl shadow-black/20"
        >
          <RepositoryHeroSVG />

          <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-blue-500/[0.06] blur-[120px]" />

          <div className="relative p-6 sm:p-8 lg:p-10">
            <div className="flex flex-col gap-10 xl:flex-row xl:items-center xl:justify-between">

              {/* Repository information */}

              <div className="flex min-w-0 items-start gap-5 sm:gap-6">

                {/* Avatar */}

                {response.owner?.avatar_url ? (
                  <motion.img
                    initial={{
                      opacity: 0,
                      scale: 0.75,
                    }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                    }}
                    transition={{
                      duration: 0.55,
                    }}
                    src={response.owner.avatar_url}
                    alt={
                      response.owner.login ||
                      "Repository owner"
                    }
                    className="h-20 w-20 shrink-0 rounded-2xl border border-white/10 object-cover shadow-2xl shadow-blue-500/10 sm:h-24 sm:w-24"
                  />
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] sm:h-24 sm:w-24">
                    <GitHubIcon size={35} />
                  </div>
                )}

                <div className="min-w-0">

                  {/* Badges */}

                  <div className="mb-3 flex flex-wrap items-center gap-2.5">
                    <span className="rounded-full border border-blue-400/15 bg-blue-400/[0.06] px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-blue-300">
                      Repository Details
                    </span>

                    {response.private ? (
                      <StatusBadge
                        label="Private"
                        type="yellow"
                      />
                    ) : (
                      <StatusBadge
                        label="Public"
                        type="green"
                      />
                    )}

                    {response.archived && (
                      <StatusBadge
                        label="Archived"
                        type="red"
                      />
                    )}
                  </div>

                  {/* Name */}

                  <h1 className="max-w-4xl break-words text-3xl font-bold tracking-[-0.035em] text-white sm:text-4xl lg:text-5xl">
                    {response.full_name ||
                      response.name}
                  </h1>

                  {/* Description */}

                  <p className="mt-4 max-w-3xl text-base leading-7 text-white/50 sm:text-lg sm:leading-8">
                    {response.description ||
                      "No description provided for this repository."}
                  </p>

                  {/* Owner */}

                  {response.owner?.login && (
                    <div className="mt-5 flex items-center gap-2.5 text-sm text-white/35">
                      <Users size={15} />

                      <span>
                        Owned by
                      </span>

                      <span className="font-medium text-white/70">
                        {response.owner.login}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Connection status */}

              <motion.div
                whileHover={{
                  y: -3,
                }}
                className="relative min-w-[280px] overflow-hidden rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.035] px-5 py-5"
              >
                <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-emerald-400/[0.08] blur-3xl" />

                <div className="relative flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-400/15 bg-emerald-400/[0.08]">
                    <Check
                      size={21}
                      className="text-emerald-400"
                    />
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-emerald-300">
                      Repository Connected
                    </div>

                    <div className="mt-1.5 text-xs text-white/35">
                      Repository information loaded
                    </div>
                  </div>
                </div>

                <div className="relative mt-4 h-1 overflow-hidden rounded-full bg-white/[0.05]">
                  <motion.div
                    initial={{
                      width: 0,
                    }}
                    animate={{
                      width: "100%",
                    }}
                    transition={{
                      duration: 1.2,
                      delay: 0.5,
                    }}
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400/40 via-emerald-400 to-cyan-400"
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* ===================================================
            STATS
        =================================================== */}

        <motion.section
          initial="hidden"
          animate="visible"
          variants={{
            visible: {
              transition: {
                staggerChildren: 0.08,
              },
            },
          }}
          className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4"
        >
          <StatCard
            label="Stars"
            value={formatNumber(
              response.stargazers_count
            )}
            icon={<Star />}
            color="yellow"
          />

          <StatCard
            label="Forks"
            value={formatNumber(
              response.forks_count
            )}
            icon={<GitBranch />}
            color="violet"
          />

          <StatCard
            label="Open Issues"
            value={formatNumber(
              response.open_issues_count
            )}
            icon={<CircleDot />}
            color="orange"
          />

          <StatCard
            label="Watchers"
            value={formatNumber(
              response.watchers_count
            )}
            icon={<Users />}
            color="cyan"
          />
        </motion.section>

        {/* ===================================================
            OVERVIEW + LINKS
        =================================================== */}

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.55fr_0.8fr]">

          {/* =================================================
              REPOSITORY OVERVIEW
          ================================================= */}

          <motion.section
            initial={{
              opacity: 0,
              y: 25,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.25,
            }}
            className="overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.025]"
          >
            <SectionTitle
              icon={<FolderGit2 />}
              title="Repository Overview"
              description="General information about this project"
            />

            <div className="p-5 sm:p-7">

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

                <InfoCard
                  label="Primary Language"
                  value={
                    response.language ||
                    "Not specified"
                  }
                  icon={<Code2 />}
                  color="blue"
                />

                <InfoCard
                  label="Default Branch"
                  value={
                    response.default_branch ||
                    "Not specified"
                  }
                  icon={<GitBranch />}
                  color="violet"
                />

                <InfoCard
                  label="Repository Size"
                  value={
                    response.size
                      ? `${response.size.toLocaleString()} KB`
                      : "Not available"
                  }
                  icon={<HardDrive />}
                  color="cyan"
                />

                <InfoCard
                  label="Created"
                  value={formatDate(
                    response.created_at
                  )}
                  icon={<CircleDot />}
                  color="green"
                />

                <InfoCard
                  label="Last Updated"
                  value={formatDate(
                    response.updated_at
                  )}
                  icon={<Activity />}
                  color="orange"
                />

                <InfoCard
                  label="Last Push"
                  value={formatDate(
                    response.pushed_at
                  )}
                  icon={<GitPullRequest />}
                  color="pink"
                />
              </div>

              {/* Activity */}

              <div className="mt-7 overflow-hidden rounded-2xl border border-white/[0.07] bg-black/20">

                <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
                  <div className="flex items-center gap-3">

                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400/[0.08]">
                      <Activity
                        size={17}
                        className="text-emerald-400"
                      />
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-white/75">
                        Repository Activity
                      </div>

                      <div className="mt-0.5 text-xs text-white/30">
                        Activity visualization
                      </div>
                    </div>
                  </div>

                  <span className="rounded-full border border-emerald-400/10 bg-emerald-400/[0.04] px-3 py-1.5 font-mono text-[10px] font-medium tracking-wider text-emerald-300/60">
                    ACTIVE
                  </span>
                </div>

              </div>
            </div>
          </motion.section>

          {/* =================================================
              QUICK LINKS
          ================================================= */}

          <motion.section
            initial={{
              opacity: 0,
              y: 25,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.35,
            }}
            className="overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.025]"
          >
            <SectionTitle
              icon={<Link2 />}
              title="Quick Links"
              description="Repository resources"
            />

            <div className="space-y-3 p-5">

              {response.html_url && (
                <QuickLink
                  label="GitHub Repository"
                  description="Source code and repository"
                  href={response.html_url}
                  icon={<GitHubIcon />}
                  color="blue"
                />
              )}

              {response.homepage && (
                <QuickLink
                  label="Project Homepage"
                  description="Live application"
                  href={response.homepage}
                  icon={<ExternalLink />}
                  color="cyan"
                />
              )}

              {response.owner?.html_url && (
                <QuickLink
                  label="Repository Owner"
                  description={`github.com/${response.owner.login}`}
                  href={response.owner.html_url}
                  icon={<Users />}
                  color="violet"
                />
              )}
            </div>

            {/* Intelligence */}

            <div className="mx-5 mb-5 rounded-2xl border border-blue-400/10 bg-gradient-to-br from-blue-400/[0.06] to-violet-400/[0.03] p-5">
              <div className="flex items-start gap-4">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-400/[0.08]">
                  <Sparkles
                    size={18}
                    className="text-blue-400"
                  />
                </div>

                <div>
                  <div className="text-sm font-semibold text-blue-200/85">
                    CodeBase Intelligence
                  </div>

                  <p className="mt-2 text-xs leading-5 text-white/35">
                    Use AI to understand the
                    structure, dependencies and
                    implementation of this
                    repository.
                  </p>
                </div>
              </div>
            </div>
          </motion.section>
        </div>

        {/* ===================================================
            TOPICS
        =================================================== */}

        {response.topics &&
          response.topics.length > 0 && (
            <motion.section
              initial={{
                opacity: 0,
                y: 25,
              }}
              whileInView={{
                opacity: 1,
                y: 0,
              }}
              viewport={{
                once: true,
              }}
              className="mt-6 overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.025]"
            >
              <SectionTitle
                icon={<Boxes />}
                title="Repository Topics"
                description="Technologies and concepts associated with this repository"
              />

              <div className="flex flex-wrap gap-3 p-6 sm:p-7">
                {response.topics.map(
                  (topic, index) => (
                    <motion.span
                      key={`${topic}-${index}`}
                      initial={{
                        opacity: 0,
                        scale: 0.9,
                      }}
                      whileInView={{
                        opacity: 1,
                        scale: 1,
                      }}
                      viewport={{
                        once: true,
                      }}
                      transition={{
                        delay: index * 0.035,
                      }}
                      whileHover={{
                        y: -3,
                        scale: 1.03,
                      }}
                      className="group flex items-center gap-2 rounded-xl border border-blue-400/10 bg-blue-400/[0.045] px-4 py-2.5 font-mono text-xs font-medium text-blue-300/75 transition hover:border-blue-400/25 hover:bg-blue-400/[0.08]"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,.6)]" />

                      {topic}

                      <ChevronRight
                        size={12}
                        className="text-white/15 transition group-hover:translate-x-0.5 group-hover:text-blue-300/60"
                      />
                    </motion.span>
                  )
                )}
              </div>
            </motion.section>
          )}

        {/* ===================================================
            ANALYZE CTA
        =================================================== */}

        <motion.section
          initial={{
            opacity: 0,
            y: 30,
          }}
          whileInView={{
            opacity: 1,
            y: 0,
          }}
          viewport={{
            once: true,
          }}
          className="relative mt-6 overflow-hidden rounded-3xl border border-blue-400/15 bg-gradient-to-br from-blue-500/[0.08] via-violet-500/[0.045] to-cyan-500/[0.05]"
        >
          {/* Glow */}

          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blue-500/[0.12] blur-[110px]" />

          <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-violet-500/[0.08] blur-[110px]" />

          <AnalysisCTAVisual />

          <div className="relative p-6 sm:p-8 lg:p-10">

            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">

              {/* Left */}

              <div className="max-w-2xl">

                <div className="mb-5 flex items-center gap-3">

                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-400/[0.08]">
                    <Sparkles
                      size={22}
                      className="text-blue-400"
                    />
                  </div>

                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.12em] text-blue-300/80">
                      CodeBase Intelligence
                    </div>

                    <div className="mt-1 text-xs text-white/30">
                      AI-powered repository understanding
                    </div>
                  </div>
                </div>

                <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
                  Ready to understand
                  this codebase?
                </h2>

                <p className="mt-4 max-w-xl text-sm leading-6 text-white/45 sm:text-base sm:leading-7">
                  Analyze the repository structure,
                  dependencies, files, architecture
                  and source code using CodeBase AI.
                </p>

                {/* Capabilities */}

                <div className="mt-6 flex flex-wrap gap-2.5">

                  <CapabilityBadge
                    icon={<Search size={13} />}
                    text="Semantic Search"
                  />

                  <CapabilityBadge
                    icon={<Network size={13} />}
                    text="Dependency Graph"
                  />

                  <CapabilityBadge
                    icon={<Layers3 size={13} />}
                    text="Architecture"
                  />

                  <CapabilityBadge
                    icon={<Bot size={13} />}
                    text="AI Answers"
                  />
                </div>
              </div>

              {/* Button */}

              <div className="relative shrink-0">

                <motion.button
                  whileHover={{
                    scale: 1.04,
                    y: -3,
                  }}
                  whileTap={{
                    scale: 0.97,
                  }}
                  onClick={handleAnalyze}
                  className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-blue-400/30 bg-blue-500 px-6 py-4 text-sm font-semibold text-white shadow-xl shadow-blue-500/20 transition-all duration-300 hover:bg-blue-400 hover:shadow-blue-500/30 sm:px-7 sm:py-5"
                >
                  {/* Shine */}

                  <motion.span
                    animate={{
                      x: ["-120%", "180%"],
                    }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      repeatDelay: 2,
                      ease: "easeInOut",
                    }}
                    className="absolute inset-y-0 w-1/3 -skew-x-12 bg-white/10"
                  />

                  <span className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                    <Zap size={18} />
                  </span>

                  <span className="relative text-sm sm:text-base">
                    Analyze Repository
                  </span>

                  <ArrowUpRight
                    size={18}
                    className="relative transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </motion.button>

                <div className="mt-3 text-center text-[11px] text-white/25">
                  Start AI analysis →
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ===================================================
            INTELLIGENCE PIPELINE
        =================================================== */}

        

        {/* ===================================================
            FOOTER
        =================================================== */}

        <footer className="py-10 text-center">
          <div className="flex items-center justify-center gap-2 text-xs text-white/20">
            <Code2 size={14} />

            <span>
              CodeBase
            </span>

            <span>
              •
            </span>

            <span>
              Repository Intelligence
            </span>
          </div>
        </footer>
      </div>
    </main>
  );
};

/* =========================================================
   BACKGROUND
========================================================= */

function DashboardBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">

      {/* Grid */}

      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Blue */}

      <motion.div
        animate={{
          x: [0, 40, 0],
          y: [0, 30, 0],
        }}
        transition={{
          duration: 14,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute left-[5%] top-[-300px] h-[650px] w-[650px] rounded-full bg-blue-600/[0.06] blur-[160px]"
      />

      {/* Violet */}

      <motion.div
        animate={{
          x: [0, -40, 0],
          y: [0, 30, 0],
        }}
        transition={{
          duration: 17,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute right-[-250px] top-[25%] h-[600px] w-[600px] rounded-full bg-violet-600/[0.05] blur-[160px]"
      />

      {/* Cyan */}

      <div className="absolute bottom-[-250px] left-[25%] h-[500px] w-[500px] rounded-full bg-cyan-500/[0.035] blur-[160px]" />
    </div>
  );
}

/* =========================================================
   HERO SVG
========================================================= */

function RepositoryHeroSVG() {
  return (
    <svg
      className="pointer-events-none absolute right-0 top-0 h-full w-[65%] opacity-60"
      viewBox="0 0 900 350"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id="heroGradient"
          x1="0"
          y1="0"
          x2="900"
          y2="350"
          gradientUnits="userSpaceOnUse"
        >
          <stop
            stopColor="#3B82F6"
            stopOpacity="0"
          />

          <stop
            offset="0.45"
            stopColor="#6366F1"
            stopOpacity=".35"
          />

          <stop
            offset="1"
            stopColor="#06B6D4"
            stopOpacity=".05"
          />
        </linearGradient>

        <filter id="heroGlow">
          <feGaussianBlur
            stdDeviation="4"
            result="blur"
          />
        </filter>
      </defs>

      {/* Main path */}

      <motion.path
        d="M0 300 C150 120 230 320 390 150 S650 80 900 20"
        stroke="url(#heroGradient)"
        strokeWidth="1.5"
        initial={{
          pathLength: 0,
        }}
        animate={{
          pathLength: 1,
        }}
        transition={{
          duration: 2,
          ease: "easeInOut",
        }}
      />

      {/* Secondary path */}

      <motion.path
        d="M100 350 C250 180 340 300 500 180 S720 130 900 80"
        stroke="url(#heroGradient)"
        strokeWidth="1"
        strokeDasharray="5 8"
        initial={{
          pathLength: 0,
        }}
        animate={{
          pathLength: 1,
        }}
        transition={{
          duration: 2.5,
          delay: 0.3,
        }}
      />

      {/* Nodes */}

      {[
        [150, 220],
        [300, 250],
        [420, 150],
        [550, 170],
        [700, 110],
        [820, 65],
      ].map(([cx, cy], index) => (
        <motion.g
          key={index}
          initial={{
            opacity: 0,
            scale: 0,
          }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
          transition={{
            delay: 0.5 + index * 0.12,
          }}
        >
          <circle
            cx={cx}
            cy={cy}
            r="22"
            fill="#3B82F6"
            fillOpacity=".035"
            stroke="#60A5FA"
            strokeOpacity=".2"
          />

          <motion.circle
            cx={cx}
            cy={cy}
            r="4"
            fill="#60A5FA"
            fillOpacity=".8"
            filter="url(#heroGlow)"
            animate={{
              opacity: [0.3, 1, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: index * 0.3,
            }}
          />
        </motion.g>
      ))}
    </svg>
  );
}


/* =========================================================
   ANALYSIS CTA SVG
========================================================= */

function AnalysisCTAVisual() {
  return (
    <svg
      className="pointer-events-none absolute right-0 top-0 hidden h-full w-[45%] opacity-50 lg:block"
      viewBox="0 0 500 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id="ctaGradient"
          x1="0"
          y1="0"
          x2="500"
          y2="300"
          gradientUnits="userSpaceOnUse"
        >
          <stop
            stopColor="#3B82F6"
            stopOpacity="0"
          />

          <stop
            offset="0.5"
            stopColor="#6366F1"
            stopOpacity="0.5"
          />

          <stop
            offset="1"
            stopColor="#06B6D4"
            stopOpacity="0"
          />
        </linearGradient>
      </defs>

      <motion.path
        d="M40 240 C140 150 170 230 250 140 S390 80 480 30"
        stroke="url(#ctaGradient)"
        strokeWidth="1.5"
        strokeDasharray="6 7"
        initial={{
          pathLength: 0,
        }}
        whileInView={{
          pathLength: 1,
        }}
        viewport={{
          once: true,
        }}
        transition={{
          duration: 2,
        }}
      />

      <motion.path
        d="M100 300 C180 220 230 250 300 180 S400 130 500 100"
        stroke="url(#ctaGradient)"
        strokeWidth="1"
        initial={{
          pathLength: 0,
        }}
        whileInView={{
          pathLength: 1,
        }}
        viewport={{
          once: true,
        }}
        transition={{
          duration: 2.2,
          delay: 0.3,
        }}
      />

      {[
        [110, 205],
        [215, 180],
        [300, 135],
        [390, 100],
        [455, 65],
      ].map(([cx, cy], index) => (
        <motion.g
          key={index}
          initial={{
            opacity: 0,
            scale: 0,
          }}
          whileInView={{
            opacity: 1,
            scale: 1,
          }}
          viewport={{
            once: true,
          }}
          transition={{
            delay: 0.5 + index * 0.12,
          }}
        >
          <circle
            cx={cx}
            cy={cy}
            r="18"
            fill="#3B82F6"
            fillOpacity=".04"
            stroke="#60A5FA"
            strokeOpacity=".2"
          />

          <motion.circle
            cx={cx}
            cy={cy}
            r="3"
            fill="#60A5FA"
            animate={{
              opacity: [0.3, 1, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: index * 0.25,
            }}
          />
        </motion.g>
      ))}
    </svg>
  );
}


function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  color: string;
}) {
  const colors: Record<string, string> = {
    yellow:
      "text-yellow-300 bg-yellow-400/[0.07] border-yellow-400/10",
    violet:
      "text-violet-300 bg-violet-400/[0.07] border-violet-400/10",
    orange:
      "text-orange-300 bg-orange-400/[0.07] border-orange-400/10",
    cyan:
      "text-cyan-300 bg-cyan-400/[0.07] border-cyan-400/10",
  };

  return (
    <motion.div
      variants={{
        hidden: {
          opacity: 0,
          y: 15,
        },
        visible: {
          opacity: 1,
          y: 0,
        },
      }}
      whileHover={{
        y: -4,
      }}
      className="group rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 transition hover:border-white/[0.14] sm:p-6"
    >
      <div className="flex items-center justify-between">

        <span className="text-sm font-medium text-white/40">
          {label}
        </span>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl border ${colors[color]}`}
        >
          {icon}
        </div>
      </div>

      <div className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
        {value}
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.04]">
        <motion.div
          initial={{
            width: 0,
          }}
          animate={{
            width: "65%",
          }}
          transition={{
            duration: 1,
          }}
          className="h-full rounded-full bg-gradient-to-r from-blue-500/40 to-violet-400/60"
        />
      </div>
    </motion.div>
  );
}

/* =========================================================
   INFO CARD
========================================================= */

function InfoCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  color: string;
}) {
  const iconColors: Record<string, string> = {
    blue: "text-blue-400 bg-blue-400/[0.07]",
    violet: "text-violet-400 bg-violet-400/[0.07]",
    cyan: "text-cyan-400 bg-cyan-400/[0.07]",
    green: "text-emerald-400 bg-emerald-400/[0.07]",
    orange: "text-orange-400 bg-orange-400/[0.07]",
    pink: "text-pink-400 bg-pink-400/[0.07]",
  };

  return (
    <motion.div
      whileHover={{
        scale: 1.015,
        y: -2,
      }}
      className="rounded-2xl border border-white/[0.06] bg-black/20 p-5"
    >
      <div className="flex items-center gap-3">

        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconColors[color]}`}
        >
          {icon}
        </div>

        <span className="text-xs font-medium uppercase tracking-[0.12em] text-white/30">
          {label}
        </span>
      </div>

      <div className="mt-4 truncate text-base font-semibold text-white/75 sm:text-lg">
        {value}
      </div>
    </motion.div>
  );
}

/* =========================================================
   SECTION TITLE
========================================================= */

function SectionTitle({
  icon,
  title,
  description,
  accent = "blue",
}: {
  icon: ReactNode;
  title: string;
  description: string;
  accent?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-5 sm:px-7 sm:py-6">

      <div className="flex items-center gap-4">

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${
            accent === "violet"
              ? "bg-violet-400/[0.08] text-violet-300"
              : "bg-blue-400/[0.08] text-blue-300"
          }`}
        >
          {icon}
        </div>

        <div>
          <h2 className="text-base font-semibold text-white sm:text-lg">
            {title}
          </h2>

          <p className="mt-1 text-xs text-white/30 sm:text-sm">
            {description}
          </p>
        </div>
      </div>

      <ChevronRight
        size={17}
        className="text-white/15"
      />
    </div>
  );
}

/* =========================================================
   QUICK LINK
========================================================= */

function QuickLink({
  label,
  description,
  href,
  icon,
  color,
}: {
  label: string;
  description: string;
  href: string;
  icon: ReactNode;
  color: string;
}) {
  const colors: Record<string, string> = {
    blue: "text-blue-400 bg-blue-400/[0.07]",
    cyan: "text-cyan-400 bg-cyan-400/[0.07]",
    violet: "text-violet-400 bg-violet-400/[0.07]",
  };

  return (
    <motion.a
      whileHover={{
        x: 4,
      }}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-4 rounded-xl border border-white/[0.06] bg-black/20 p-4 transition hover:border-white/[0.13] hover:bg-white/[0.025]"
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${colors[color]}`}
      >
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-white/65">
          {label}
        </div>

        <div className="mt-1 truncate text-xs text-white/25">
          {description}
        </div>
      </div>

      <ArrowUpRight
        size={16}
        className="text-white/15 transition group-hover:text-white/60"
      />
    </motion.a>
  );
}

/* =========================================================
   CAPABILITY BADGE
========================================================= */

function CapabilityBadge({
  icon,
  text,
}: {
  icon: ReactNode;
  text: string;
}) {
  return (
    <motion.div
      whileHover={{
        y: -2,
      }}
      className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-xs font-medium text-white/45 transition hover:border-blue-400/20 hover:bg-blue-400/[0.05] hover:text-white/70"
    >
      <span className="text-blue-400/70">
        {icon}
      </span>

      {text}
    </motion.div>
  );
}

/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({
  label,
  type,
}: {
  label: string;
  type: "green" | "yellow" | "red";
}) {
  const styles = {
    green:
      "border-emerald-400/15 bg-emerald-400/[0.05] text-emerald-300",

    yellow:
      "border-yellow-400/15 bg-yellow-400/[0.05] text-yellow-300",

    red:
      "border-red-400/15 bg-red-400/[0.05] text-red-300",
  };

  return (
    <span
      className={`rounded-full border px-3 py-1.5 text-[11px] font-medium ${styles[type]}`}
    >
      {label}
    </span>
  );
}

/* =========================================================
   LOADING
========================================================= */

function AnalysisLoading() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050608] px-5 text-white">
      <DashboardBackground />

      <div className="relative text-center">

        <motion.div
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear",
          }}
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-400/[0.05] shadow-xl shadow-blue-500/[0.08]"
        >
          <GitHubIcon
            size={34}
            className="text-blue-400"
          />
        </motion.div>

        <motion.h1
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          className="mt-7 text-xl font-semibold"
        >
          Loading repository
        </motion.h1>

        <p className="mt-2 text-sm text-white/30">
          Fetching repository information...
        </p>

        <div className="mx-auto mt-7 h-1.5 w-56 overflow-hidden rounded-full bg-white/[0.06]">
          <motion.div
            animate={{
              x: ["-100%", "200%"],
            }}
            transition={{
              duration: 1.4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="h-full w-1/2 rounded-full bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-400"
          />
        </div>
      </div>
    </main>
  );
}

/* =========================================================
   ERROR
========================================================= */

function AnalysisError({
  message,
}: {
  message: string;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050608] px-5 text-white">
      <DashboardBackground />

      <motion.div
        initial={{
          opacity: 0,
          y: 20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        className="w-full max-w-lg rounded-3xl border border-red-400/15 bg-red-400/[0.03] p-8 text-center shadow-2xl"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-400/[0.07]">
          <XCircle
            size={25}
            className="text-red-400"
          />
        </div>

        <h1 className="mt-6 text-xl font-semibold">
          Something went wrong
        </h1>

        <p className="mt-3 text-sm leading-6 text-white/40">
          {message}
        </p>

        <button
          onClick={() =>
            window.history.back()
          }
          className="mt-7 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-white/55 transition hover:bg-white/[0.07] hover:text-white"
        >
          Go back
        </button>
      </motion.div>
    </main>
  );
}

/* =========================================================
   GITHUB ICON
========================================================= */

function GitHubIcon({
  size = 18,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 .5C5.65.5.5 5.78.5 12.29c0 5.21 3.44 9.63 8.2 11.19.6.11.82-.27.82-.59v-2.07c-3.34.74-4.04-1.65-4.04-1.65-.55-1.43-1.34-1.81-1.34-1.81-1.09-.77.08-.75.08-.75 1.21.09 1.85 1.28 1.85 1.28 1.07 1.87 2.8 1.33 3.48 1.02.11-.8.42-1.33.76-1.64-2.67-.31-5.48-1.37-5.48-6.01 0-1.33.46-2.42 1.21-3.27-.12-.31-.52-1.55.12-3.23 0 0 .99-.32 3.3 1.25a11.07 11.07 0 0 1 6.01 0c2.3-1.57 3.29-1.25 3.29-1.25.64 1.68.24 2.92.12 3.23.75.85 1.21 1.94 1.21 3.27 0 4.65-2.82 5.69-5.5 6 .43.38.81 1.13.81 2.29v3.39c0 .32.22.7.83.59 4.76-1.56 8.19-5.98 8.19-11.19C23.5 5.78 18.35.5 12 .5Z" />
    </svg>
  );
}

/* =========================================================
   HELPERS
========================================================= */

function formatNumber(
  value?: number
): string {
  if (
    value === undefined ||
    value === null
  ) {
    return "0";
  }

  return new Intl.NumberFormat("en", {
    notation:
      value >= 1000
        ? "compact"
        : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDate(
  value?: string
): string {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(
    "en",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  ).format(new Date(value));
}

/* =========================================================
   SUSPENSE
========================================================= */

export default function Page() {
  return (
    <Suspense fallback={<AnalysisLoading />}>
      <AnalyzePage />
    </Suspense>
  );
}