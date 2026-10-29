"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { Space_Grotesk } from "next/font/google";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type Variants,
} from "framer-motion";
import {
  ArrowUpRight,
  ChevronDown,
  Clock,
  Code2,
  ExternalLink,
  FileCode2,
  FolderGit2,
  Languages,
  Plus,
  Rows3,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import {
  getRepositoryStats,
  listRepositories,
  type IndexedRepo,
  type RepoStats,
} from "@/services/analysis.service";
import { UserMenu } from "@/components/auth/UserMenu";
import {
  AnimatedNumber,
  FloatingShapes,
  RepoCube,
  ScrollProgress,
  TiltCard,
} from "../details/Visuals3D";

const display = Space_Grotesk({ subsets: ["latin"], display: "swap" });

/* =========================================================
   PALETTE  (each repository keeps one colour everywhere)
========================================================= */

type Tone = { from: string; to: string };

const PALETTE: readonly Tone[] = [
  { from: "#3b82f6", to: "#22d3ee" },
  { from: "#8b5cf6", to: "#e879f9" },
  { from: "#10b981", to: "#5eead4" },
  { from: "#f59e0b", to: "#fb923c" },
  { from: "#ec4899", to: "#fb7185" },
  { from: "#6366f1", to: "#38bdf8" },
];

const gradient = (tone: Tone) => `linear-gradient(135deg, ${tone.from}, ${tone.to})`;
const keyOf = (repo: IndexedRepo) => `${repo.owner}/${repo.repo}`;
const dateOf = (repo: IndexedRepo) => Date.parse(repo.indexedAt ?? "") || 0;

/* =========================================================
   MOTION
========================================================= */

const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const rise: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
};

// Pointer position across the window, normalised to -0.5..0.5 and smoothed.
function useMouse() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 60, damping: 20 });
  const sy = useSpring(y, { stiffness: 60, damping: 20 });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      x.set(e.clientX / window.innerWidth - 0.5);
      y.set(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [x, y]);

  return { x: sx, y: sy };
}

/* =========================================================
   FORMATTERS
========================================================= */

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const formatCount = (n: number) => (n >= 10_000 ? compact.format(n) : n.toLocaleString());

function timeAgo(iso: string | null): string {
  if (!iso) return "unknown";
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return "unknown";

  const seconds = Math.max(0, (Date.now() - parsed) / 1000);
  const units: [number, string][] = [
    [86400 * 30, "mo"],
    [86400, "d"],
    [3600, "h"],
    [60, "min"],
  ];
  for (const [size, label] of units) {
    if (seconds >= size) return `${Math.floor(seconds / size)} ${label} ago`;
  }
  return "just now";
}

type SortKey = "recent" | "name" | "files";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "recent", label: "Recent" },
  { key: "name", label: "Name" },
  { key: "files", label: "Files" },
];

type StatsState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; stats: RepoStats };

/* =========================================================
   PAGE
========================================================= */

export default function RepositoryDashboard() {
  const [repos, setRepos] = useState<IndexedRepo[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [active, setActive] = useState<string | null>(null);

  const reduce = useReducedMotion();
  const mouse = useMouse();
  const { scrollY } = useScroll();

  // Hero layers drift at different speeds as you scroll.
  const copyY = useTransform(scrollY, [0, 500], [0, 60]);
  const copyOpacity = useTransform(scrollY, [0, 420], [1, 0.2]);
  const cubeY = useTransform(scrollY, [0, 500], [0, -40]);
  const cubeX = useTransform(mouse.x, [-0.5, 0.5], [-16, 16]);
  const cubeMouseY = useTransform(mouse.y, [-0.5, 0.5], [-12, 12]);

  const load = useCallback(async () => {
    setError("");
    setRepos(null);
    try {
      setRepos(await listRepositories());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the analyzed repositories.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch
    void load();
  }, [load]);

  // A repository keeps its colour no matter how the list is sorted.
  const toneOf = useMemo(() => {
    const map = new Map<string, Tone>();
    (repos ?? []).forEach((repo, i) => map.set(keyOf(repo), PALETTE[i % PALETTE.length]));
    return (repo: IndexedRepo) => map.get(keyOf(repo)) ?? PALETTE[0];
  }, [repos]);

  const metrics = useMemo(() => {
    const list = repos ?? [];
    // language / lines are optional fields the backend doesn't send yet; count only what exists.
    const languages = new Set(list.map((r) => r.language).filter((l): l is string => Boolean(l)));
    return {
      repos: list.length,
      files: list.reduce((sum, r) => sum + r.files, 0),
      lines: list.reduce((sum, r) => sum + (r.lines ?? 0), 0),
      languages: languages.size,
      lastIndexed: [...list].sort((a, b) => dateOf(b) - dateOf(a))[0]?.indexedAt ?? null,
    };
  }, [repos]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = (repos ?? []).filter(
      (r) =>
        !q || [keyOf(r), r.language ?? "", r.framework ?? ""].join(" ").toLowerCase().includes(q),
    );
    return [...filtered].sort((a, b) => {
      if (sort === "files") return b.files - a.files;
      if (sort === "name") return keyOf(a).localeCompare(keyOf(b));
      return dateOf(b) - dateOf(a);
    });
  }, [repos, query, sort]);

  const hasRepos = !error && repos !== null && repos.length > 0;
  const latest = repos ? [...repos].sort((a, b) => dateOf(b) - dateOf(a))[0] : undefined;

  const kpis = [
    { label: "Repositories", value: metrics.repos, icon: <FolderGit2 size={18} aria-hidden />, tone: PALETTE[0] },
    { label: "Files indexed", value: metrics.files, icon: <FileCode2 size={18} aria-hidden />, tone: PALETTE[1] },
    ...(metrics.lines > 0
      ? [{ label: "Lines of code", value: metrics.lines, icon: <Rows3 size={18} aria-hidden />, tone: PALETTE[2] }]
      : []),
    ...(metrics.languages > 0
      ? [{ label: "Languages", value: metrics.languages, icon: <Languages size={18} aria-hidden />, tone: PALETTE[4] }]
      : []),
  ];

  return (
    <div
      className={`relative min-h-screen overflow-x-clip bg-[#07070c] text-slate-100 selection:bg-violet-500/30 ${display.className}`}
    >
      <Background />
      <ScrollProgress />

      {/* ---------- Top bar ---------- */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#07070c]/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1450px] items-center justify-between px-4 sm:px-8 lg:px-10">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-400"
          >
            <span
              className="grid h-9 w-9 place-items-center rounded-xl shadow-lg shadow-violet-500/25"
              style={{ background: gradient(PALETTE[1]) }}
            >
              <Code2 size={18} className="text-white" aria-hidden />
            </span>
            <span className="text-base font-bold tracking-tight">CodeBase</span>
          </Link>

          <div className="flex items-center gap-3">
            <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/"
                className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
              >
                <Plus size={16} aria-hidden />
                <span>
                  Analyze<span className="hidden sm:inline"> repository</span>
                </span>
              </Link>
            </motion.div>

            <UserMenu />
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-[1450px] px-4 pb-24 sm:px-8 lg:px-10">
        {/* ---------- Hero ---------- */}
        <section className="grid items-center gap-6 pb-10 pt-10 sm:pt-14 lg:grid-cols-[1.35fr_0.65fr]">
          <motion.div style={reduce ? undefined : { y: copyY, opacity: copyOpacity }}>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3.5 py-1.5 text-xs text-slate-300 backdrop-blur-md"
            >
              <span className="relative flex h-2 w-2" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70 motion-reduce:hidden" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              {hasRepos
                ? `${metrics.repos} indexed · updated ${timeAgo(metrics.lastIndexed)}`
                : error
                  ? "Backend unreachable"
                  : repos === null
                    ? "Loading your workspace"
                    : "Nothing indexed yet"}
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.08 }}
              className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
            >
              Understand your{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: `linear-gradient(100deg, ${PALETTE[0].from}, ${PALETTE[1].from} 45%, ${PALETTE[1].to})`,
                }}
              >
                Codebase deeply
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.18 }}
              className="mt-4 max-w-lg text-base leading-7 text-slate-400"
            >
              Search, explore and understand all your repositories in one place.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.28 }}
              className="mt-7 flex flex-wrap gap-3"
            >
              <GradientButton href="/" tone={PALETTE[1]} icon={<Plus size={16} aria-hidden />}>
                Analyze a repository
              </GradientButton>

              {latest && (
                <GhostButton
                  href={`/analysis?repo=${encodeURIComponent(latest.repourl)}`}
                  icon={<Sparkles size={16} aria-hidden />}
                >
                  Open {latest.repo}
                </GhostButton>
              )}
            </motion.div>
          </motion.div>

          <motion.div
            aria-hidden
            style={reduce ? undefined : { y: cubeY, translateX: cubeX, translateY: cubeMouseY }}
            className="hidden justify-center sm:flex"
          >
            <RepoCube />
          </motion.div>
        </section>

        {/* ---------- States ---------- */}
        {error && <ErrorState message={error} onRetry={load} />}
        {!error && repos === null && <LoadingState />}
        {!error && repos && repos.length === 0 && <EmptyState />}

        {/* ---------- Dashboard ---------- */}
        {hasRepos && repos && (
          <motion.div variants={container} initial="hidden" animate="visible" className="space-y-8">
            <motion.section
              variants={container}
              aria-label="Summary"
              className={`grid grid-cols-2 gap-3 sm:gap-4 ${
                kpis.length === 4 ? "lg:grid-cols-4" : kpis.length === 3 ? "lg:grid-cols-3" : ""
              }`}
            >
              {kpis.map((kpi) => (
                <Kpi key={kpi.label} {...kpi} />
              ))}
            </motion.section>

            <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
              {/* Repositories */}
              <motion.div variants={rise} className="min-w-0 space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <h2 className="text-xl font-semibold tracking-tight">
                    Your repositories
                    <span className="ml-2 text-sm font-normal text-slate-500">{visible.length}</span>
                  </h2>

                  <div
                    role="group"
                    aria-label="Sort repositories"
                    className="flex w-fit rounded-xl border border-white/10 bg-white/[0.04] p-1"
                  >
                    {SORTS.map((option) => (
                      <button
                        key={option.key}
                        onClick={() => setSort(option.key)}
                        aria-pressed={sort === option.key}
                        className="relative rounded-lg px-3.5 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-violet-400"
                      >
                        {sort === option.key && (
                          <motion.span
                            layoutId="sort-pill"
                            className="absolute inset-0 rounded-lg bg-white/10"
                            transition={{ type: "spring", stiffness: 420, damping: 34 }}
                          />
                        )}
                        <span className={`relative ${sort === option.key ? "text-white" : ""}`}>
                          {option.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 transition-colors focus-within:border-violet-400/50 focus-within:bg-white/[0.06] focus-within:shadow-[0_0_0_4px_rgba(139,92,246,0.12)]">
                  <Search size={16} className="text-slate-500" aria-hidden />
                  <span className="sr-only">Search repositories</span>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search repositories..."
                    className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
                  />
                  {query && (
                    <button
                      onClick={() => setQuery("")}
                      aria-label="Clear search"
                      className="grid h-6 w-6 place-items-center rounded-md text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-violet-400"
                    >
                      <X size={14} aria-hidden />
                    </button>
                  )}
                </label>

                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {visible.map((repo, index) => (
                      <RepoCard
                        key={keyOf(repo)}
                        repo={repo}
                        index={index}
                        tone={toneOf(repo)}
                        totalFiles={metrics.files}
                        active={active === keyOf(repo)}
                        dimmed={active !== null && active !== keyOf(repo)}
                        onActive={setActive}
                      />
                    ))}
                  </AnimatePresence>
                </div>

                {visible.length === 0 && (
                  <p className="rounded-2xl border border-dashed border-white/10 py-12 text-center text-sm text-slate-400">
                    No repositories match &ldquo;{query}&rdquo;.
                  </p>
                )}
              </motion.div>

              {/* Sidebar */}
              <motion.aside variants={rise} className="space-y-4 xl:sticky xl:top-24">
                <DistributionChart
                  repos={repos}
                  toneOf={toneOf}
                  total={metrics.files}
                  active={active}
                  onActive={setActive}
                />
                <RecentActivity repos={repos} toneOf={toneOf} />
                {latest && <AskCard repo={latest} />}
              </motion.aside>
            </section>
          </motion.div>
        )}
      </main>
    </div>
  );
}

/* =========================================================
   BACKGROUND  (radial gradients instead of blur filters)
========================================================= */

function Background() {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const mouse = useMouse();

  const gridY = useTransform(scrollY, [0, 2000], [0, -140]);
  const blueY = useTransform(scrollY, [0, 2000], [0, -480]);
  const violetY = useTransform(scrollY, [0, 2000], [0, 320]);
  const pinkY = useTransform(scrollY, [0, 2000], [0, -240]);
  const blueX = useTransform(mouse.x, [-0.5, 0.5], [-36, 36]);
  const violetX = useTransform(mouse.x, [-0.5, 0.5], [28, -28]);

  const orb = (color: string) => ({
    background: `radial-gradient(closest-side, ${color}, transparent)`,
  });

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <motion.div
        style={reduce ? undefined : { y: gridY }}
        className="absolute inset-x-0 -top-20 h-[130%] opacity-[0.05]"
      >
        <div
          className="h-full w-full"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage: "radial-gradient(ellipse at 50% 20%, black 20%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse at 50% 20%, black 20%, transparent 75%)",
          }}
        />
      </motion.div>

      <motion.div
        style={{ ...orb("rgba(59,130,246,0.30)"), ...(reduce ? {} : { y: blueY, x: blueX }) }}
        className="absolute -left-40 -top-40 h-[640px] w-[640px] rounded-full"
      />
      <motion.div
        style={{ ...orb("rgba(139,92,246,0.26)"), ...(reduce ? {} : { y: violetY, x: violetX }) }}
        className="absolute -right-52 top-[28%] h-[620px] w-[620px] rounded-full"
      />
      <motion.div
        style={{ ...orb("rgba(236,72,153,0.16)"), ...(reduce ? {} : { y: pinkY }) }}
        className="absolute -bottom-52 left-[28%] h-[560px] w-[560px] rounded-full"
      />

      <FloatingShapes />
    </div>
  );
}

/* =========================================================
   BUTTONS
========================================================= */

function GradientButton({
  href,
  tone,
  icon,
  children,
}: {
  href: string;
  tone: Tone;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <motion.div whileHover={{ y: -3, scale: 1.02 }} whileTap={{ scale: 0.97 }}>
      <Link
        href={href}
        style={{ background: gradient(tone), boxShadow: `0 10px 30px -10px ${tone.from}99` }}
        className="flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        {icon}
        {children}
      </Link>
    </motion.div>
  );
}

function GhostButton({ href, icon, children }: { href: string; icon: ReactNode; children: ReactNode }) {
  return (
    <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}>
      <Link
        href={href}
        className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] px-5 py-3 text-sm font-medium text-slate-200 backdrop-blur-md transition-colors hover:border-white/30 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
      >
        {icon}
        <span className="max-w-[16ch] truncate sm:max-w-[28ch]">{children}</span>
      </Link>
    </motion.div>
  );
}

/* =========================================================
   KPI TILE
========================================================= */

function Kpi({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  tone: Tone;
}) {
  return (
    <TiltCard
      variants={rise}
      intensity={7}
      className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md transition-colors hover:border-white/25 sm:p-5"
    >
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px opacity-70"
        style={{ background: `linear-gradient(90deg, transparent, ${tone.to}, transparent)` }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-25 transition-opacity duration-500 group-hover:opacity-50"
        style={{ background: `radial-gradient(closest-side, ${tone.from}, transparent)` }}
      />

      <span
        className="relative grid h-9 w-9 place-items-center rounded-xl text-white"
        style={{ background: gradient(tone), boxShadow: `0 8px 20px -8px ${tone.from}` }}
      >
        {icon}
      </span>

      <p className="relative mt-4 text-3xl font-bold tabular-nums tracking-tight sm:text-4xl">
        <AnimatedNumber value={value} format={formatCount} />
      </p>
      <p className="relative mt-1 text-xs text-slate-400 sm:text-sm">{label}</p>
    </TiltCard>
  );
}

/* =========================================================
   REPOSITORY CARD
========================================================= */

function Avatar({ owner, tone, size = 48 }: { owner: string; tone: Tone; size?: number }) {
  const [failed, setFailed] = useState(false);

  return (
    <span
      className="grid shrink-0 place-items-center rounded-xl p-[2px] transition-transform duration-300 group-hover:scale-105"
      style={{ background: gradient(tone), width: size, height: size }}
    >
      <span className="grid h-full w-full place-items-center overflow-hidden rounded-[10px] bg-[#0b0b14] text-sm font-bold">
        {failed ? (
          owner.slice(0, 1).toUpperCase()
        ) : (
          // GitHub already serves a resized avatar; next/image would only add a proxy hop.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`https://github.com/${encodeURIComponent(owner)}.png?size=${size * 2}`}
            alt=""
            width={size}
            height={size}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            className="h-full w-full object-cover"
          />
        )}
      </span>
    </span>
  );
}

function RepoCard({
  repo,
  index,
  tone,
  totalFiles,
  active,
  dimmed,
  onActive,
}: {
  repo: IndexedRepo;
  index: number;
  tone: Tone;
  totalFiles: number;
  active: boolean;
  dimmed: boolean;
  onActive: (key: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState<StatsState>({ status: "idle" });
  const key = keyOf(repo);
  const share = totalFiles ? (repo.files / totalFiles) * 100 : 0;
  const encoded = encodeURIComponent(repo.repourl);
  const panelId = `insights-${key}`.replace(/[^a-z0-9_-]/gi, "-");

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (!next || stats.status === "ready" || stats.status === "loading") return;

    setStats({ status: "loading" });
    try {
      setStats({ status: "ready", stats: await getRepositoryStats(repo.owner, repo.repo) });
    } catch (err) {
      setStats({
        status: "error",
        message: err instanceof Error ? err.message : "Could not load repository insights.",
      });
    }
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: dimmed ? 0.55 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.45, delay: Math.min(index, 6) * 0.05 }}
      whileHover={{ y: -3 }}
      onHoverStart={() => onActive(key)}
      onHoverEnd={() => onActive(null)}
      style={{
        boxShadow: active
          ? `0 0 0 1px ${tone.from}88, 0 18px 50px -18px ${tone.from}99`
          : "0 0 0 1px rgba(255,255,255,0.10)",
      }}
      className="group relative overflow-hidden rounded-2xl bg-white/[0.04] backdrop-blur-md transition-[box-shadow,opacity] duration-300"
    >
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 w-1 opacity-80"
        style={{ background: gradient(tone) }}
      />

      <div className="p-4 pl-5 sm:p-5 sm:pl-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          {/* Identity */}
          <div className="flex min-w-0 flex-1 items-center gap-3.5">
            <Avatar owner={repo.owner} tone={tone} />

            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold leading-tight tracking-tight">
                {repo.repo}
              </h3>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-slate-400">
                <span className="truncate">{repo.owner}</span>
                <span aria-hidden className="text-slate-600">
                  ·
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock size={12} aria-hidden />
                  {timeAgo(repo.indexedAt)}
                </span>
              </p>

              {(repo.language || repo.framework) && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {repo.language && (
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white"
                      style={{ background: gradient(tone) }}
                    >
                      {repo.language}
                    </span>
                  )}
                  {repo.framework && (
                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-0.5 text-[11px] text-slate-300">
                      {repo.framework}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Files + share */}
          <div className="w-full lg:w-44">
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-bold tabular-nums">
                <AnimatedNumber value={repo.files} format={formatCount} />
              </p>
              <p className="text-xs text-slate-400">files · {share.toFixed(share < 10 ? 1 : 0)}%</p>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${share}%` }}
                transition={{ duration: 0.9, delay: 0.2 + Math.min(index, 6) * 0.05, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ background: gradient(tone) }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }}>
              <Link
                href={`/analysis?repo=${encoded}`}
                style={{ background: gradient(tone) }}
                className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-black/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Explore <ArrowUpRight size={14} aria-hidden />
              </Link>
            </motion.div>

            <Link
              href={`/details?repo=${encoded}`}
              className="rounded-lg border border-white/10 px-3.5 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-white/30 hover:bg-white/[0.06] hover:text-white focus-visible:outline-2 focus-visible:outline-violet-400"
            >
              Open
            </Link>

            <a
              href={repo.repourl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${key} on GitHub`}
              className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-slate-400 transition-colors hover:border-white/30 hover:bg-white/[0.06] hover:text-white focus-visible:outline-2 focus-visible:outline-violet-400"
            >
              <ExternalLink size={14} aria-hidden />
            </a>

            <button
              onClick={toggle}
              aria-expanded={open}
              aria-controls={panelId}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-2 focus-visible:outline-violet-400"
            >
              Insights
              <motion.span animate={{ rotate: open ? 180 : 0 }} className="flex">
                <ChevronDown size={14} aria-hidden />
              </motion.span>
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/10 bg-black/25 p-4 pl-5 sm:p-5 sm:pl-6">
              <Insights state={stats} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

function Insights({ state }: { state: StatsState }) {
  if (state.status === "idle" || state.status === "loading") {
    return (
      <div className="space-y-3" role="status">
        <div className="h-3 animate-pulse rounded bg-white/10" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-white/5" />
        <span className="sr-only">Loading repository insights</span>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <p role="alert" className="text-sm text-red-400">
        {state.message}
      </p>
    );
  }

  // Languages and largest files only: raw chunk counts are intentionally not shown.
  const { stats } = state;
  const totalChunks = stats.chunks || 1;
  const shown = stats.languages.slice(0, 6);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <h4 className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Language distribution
        </h4>

        <div className="mt-3 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-white/5">
          {shown.map((language, i) => (
            <motion.div
              key={language.name}
              initial={{ width: 0 }}
              animate={{ width: `${(language.chunks / totalChunks) * 100}%` }}
              transition={{ duration: 0.9, delay: i * 0.08, ease: "easeOut" }}
              style={{ background: gradient(PALETTE[i % PALETTE.length]) }}
            />
          ))}
        </div>

        <ul className="mt-4 space-y-2">
          {shown.map((language, i) => (
            <li key={language.name} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-slate-200">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: PALETTE[i % PALETTE.length].from }}
                />
                {language.name}
              </span>
              <span className="tabular-nums text-slate-400">
                {Math.round((language.chunks / totalChunks) * 100)}%
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Largest files
        </h4>

        <ul className="mt-3 space-y-2.5">
          {stats.topFiles.slice(0, 5).map((file, i) => (
            <motion.li
              key={file.path}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.07 }}
              className="truncate font-mono text-xs text-slate-200"
              title={file.path}
            >
              {file.path}
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* =========================================================
   SIDEBAR: DISTRIBUTION DONUT (files per repository)
========================================================= */

const RADIUS = 72;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const OTHER_KEY = "__other";
const OTHER_TONE: Tone = { from: "#64748b", to: "#94a3b8" };

type Slice = { key: string; label: string; value: number; tone: Tone; pct: number; offset: number };

const gradientId = (key: string) => `slice-${key.replace(/[^a-z0-9]/gi, "-")}`;

function DistributionChart({
  repos,
  toneOf,
  total,
  active,
  onActive,
}: {
  repos: IndexedRepo[];
  toneOf: (repo: IndexedRepo) => Tone;
  total: number;
  active: string | null;
  onActive: (key: string | null) => void;
}) {
  const slices = useMemo<Slice[]>(() => {
    const sorted = [...repos].sort((a, b) => b.files - a.files);
    const head = sorted.slice(0, 5);
    const rest = sorted.slice(5).reduce((sum, r) => sum + r.files, 0);

    const raw = [
      ...head.map((repo) => ({ key: keyOf(repo), label: repo.repo, value: repo.files, tone: toneOf(repo) })),
      ...(rest > 0 ? [{ key: OTHER_KEY, label: "Other", value: rest, tone: OTHER_TONE }] : []),
    ];

    let offset = 0;
    return raw.map((slice) => {
      const pct = total ? (slice.value / total) * 100 : 0;
      const result = { ...slice, pct, offset };
      offset += pct;
      return result;
    });
  }, [repos, toneOf, total]);

  const current = slices.find((s) => s.key === active);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-md">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-40"
        style={{ background: `radial-gradient(closest-side, ${PALETTE[1].from}, transparent)` }}
      />

      <h2 className="relative text-lg font-semibold tracking-tight">Files by repository</h2>

      <div className="relative mx-auto mt-5 aspect-square w-full max-w-[220px]">
        <svg
          viewBox="0 0 200 200"
          role="img"
          aria-label={`Share of indexed files: ${slices.map((s) => `${s.label} ${Math.round(s.pct)}%`).join(", ")}`}
          className="h-full w-full -rotate-90"
        >
          <defs>
            {slices.map((slice) => (
              <linearGradient key={slice.key} id={gradientId(slice.key)}>
                <stop offset="0%" stopColor={slice.tone.from} />
                <stop offset="100%" stopColor={slice.tone.to} />
              </linearGradient>
            ))}
          </defs>

          <circle cx="100" cy="100" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="22" />

          {slices.map((slice, i) => {
            const length = Math.max(0, (slice.pct / 100) * CIRCUMFERENCE - 3);
            const isActive = active === slice.key;
            return (
              <motion.circle
                key={slice.key}
                cx="100"
                cy="100"
                r={RADIUS}
                fill="none"
                stroke={`url(#${gradientId(slice.key)})`}
                strokeLinecap="round"
                strokeDashoffset={-(slice.offset / 100) * CIRCUMFERENCE}
                initial={{ strokeDasharray: `0 ${CIRCUMFERENCE}`, strokeWidth: 22 }}
                animate={{
                  strokeDasharray: `${length} ${CIRCUMFERENCE}`,
                  strokeWidth: isActive ? 28 : 22,
                  opacity: active && !isActive ? 0.35 : 1,
                }}
                transition={{
                  strokeDasharray: { duration: 1, delay: 0.2 + i * 0.1, ease: "easeOut" },
                  strokeWidth: { duration: 0.25 },
                  opacity: { duration: 0.25 },
                }}
                style={{
                  cursor: "pointer",
                  filter: isActive ? `drop-shadow(0 0 8px ${slice.tone.from})` : undefined,
                }}
                onMouseEnter={() => onActive(slice.key === OTHER_KEY ? null : slice.key)}
                onMouseLeave={() => onActive(null)}
              />
            );
          })}
        </svg>

        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div className="max-w-[110px]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={current?.key ?? "total"}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                <p className="truncate text-2xl font-bold tabular-nums">
                  {current ? `${Math.round(current.pct)}%` : formatCount(total)}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-400">
                  {current ? current.label : "files"}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <ul className="relative mt-5 space-y-1">
        {slices.map((slice) => (
          <li key={slice.key}>
            <button
              onMouseEnter={() => onActive(slice.key === OTHER_KEY ? null : slice.key)}
              onMouseLeave={() => onActive(null)}
              onFocus={() => onActive(slice.key === OTHER_KEY ? null : slice.key)}
              onBlur={() => onActive(null)}
              className={`flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-violet-400 ${
                active === slice.key ? "bg-white/[0.08]" : "hover:bg-white/[0.05]"
              }`}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: gradient(slice.tone) }}
                />
                <span className="truncate text-slate-200">{slice.label}</span>
              </span>
              <span className="shrink-0 tabular-nums text-slate-400">
                {slice.pct.toFixed(slice.pct < 10 ? 1 : 0)}%
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* =========================================================
   SIDEBAR: RECENT ACTIVITY (real index times) + ASK CARD
========================================================= */

function RecentActivity({
  repos,
  toneOf,
}: {
  repos: IndexedRepo[];
  toneOf: (repo: IndexedRepo) => Tone;
}) {
  const recent = [...repos].sort((a, b) => dateOf(b) - dateOf(a)).slice(0, 4);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-md">
      <h2 className="text-lg font-semibold tracking-tight">Recently indexed</h2>

      <ul className="mt-4 space-y-1">
        {recent.map((repo) => (
          <li key={keyOf(repo)}>
            <Link
              href={`/analysis?repo=${encodeURIComponent(repo.repourl)}`}
              className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-violet-400"
            >
              <span
                aria-hidden
                className="h-2 w-2 shrink-0 rounded-full"
                style={{
                  background: gradient(toneOf(repo)),
                  boxShadow: `0 0 10px ${toneOf(repo).from}`,
                }}
              />
              <span className="min-w-0 flex-1 truncate text-sm text-slate-200">{repo.repo}</span>
              <span className="shrink-0 text-xs text-slate-500">{timeAgo(repo.indexedAt)}</span>
              <ArrowUpRight
                size={14}
                aria-hidden
                className="shrink-0 text-slate-600 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-slate-300"
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AskCard({ repo }: { repo: IndexedRepo }) {
  return (
    <motion.div whileHover={{ y: -3 }} className="relative">
      <Link
        href={`/analysis?repo=${encodeURIComponent(repo.repourl)}`}
        className="group relative block overflow-hidden rounded-2xl border border-violet-400/25 p-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
        style={{
          background: `linear-gradient(135deg, ${PALETTE[1].from}33, ${PALETTE[0].from}22 60%, transparent)`,
        }}
      >
        <Sparkles size={18} className="text-violet-300" aria-hidden />
        <p className="mt-3 text-base font-semibold">Ask your codebase</p>
        <p className="mt-1 text-sm leading-6 text-slate-400">
          Find implementations and see how {repo.repo} works.
        </p>
        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-violet-200">
          Start exploring
          <ArrowUpRight
            size={15}
            aria-hidden
            className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </span>
      </Link>
    </motion.div>
  );
}

/* =========================================================
   STATES
========================================================= */

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <motion.section
      role="alert"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-red-400/25 bg-red-500/[0.06] p-8 text-center backdrop-blur-md"
    >
      <h2 className="text-lg font-semibold">Couldn&apos;t load repositories</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-400">{message}</p>
      <motion.button
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        onClick={onRetry}
        className="mt-6 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
      >
        Try again
      </motion.button>
    </motion.section>
  );
}

function LoadingState() {
  return (
    <section className="space-y-6" role="status" aria-label="Loading repositories">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Shimmer key={i} className="h-36" delay={i * 0.1} />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Shimmer key={i} className="h-32" delay={i * 0.15} />
          ))}
        </div>
        <Shimmer className="h-96" delay={0.2} />
      </div>
    </section>
  );
}

function Shimmer({ className, delay }: { className: string; delay: number }) {
  return (
    <div
      aria-hidden
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] ${className}`}
    >
      <motion.div
        animate={{ x: ["-100%", "100%"] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut", delay }}
        className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent"
      />
    </div>
  );
}

function EmptyState() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] px-6 py-16 text-center backdrop-blur-md"
    >
      <motion.div
        aria-hidden
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="mx-auto grid h-20 w-20 place-items-center rounded-3xl"
        style={{ background: gradient(PALETTE[1]), boxShadow: `0 20px 50px -14px ${PALETTE[1].from}` }}
      >
        <FolderGit2 size={32} className="text-white" />
      </motion.div>

      <h2 className="mt-7 text-2xl font-semibold tracking-tight">No repositories yet</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-400">
        Analyze your first repository and it will appear here.
      </p>

      <div className="mt-7 flex justify-center">
        <GradientButton href="/" tone={PALETTE[1]} icon={<Plus size={16} aria-hidden />}>
          Analyze repository
        </GradientButton>
      </div>
    </motion.section>
  );
}
