"use client";

import { useEffect, type ReactNode } from "react";

import {
  animate,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type HTMLMotionProps,
} from "framer-motion";

import {
  Bot,
  Boxes,
  Code2,
  GitBranch,
  Layers3,
  Network,
  Search,
  Star,
} from "lucide-react";

/* =========================================================
   TILT CARD  (mouse-tracked 3D tilt + moving glare)
========================================================= */

type TiltCardProps = Omit<HTMLMotionProps<"div">, "style" | "children"> & {
  children?: ReactNode;
  intensity?: number;
  glare?: boolean;
};

export function TiltCard({
  children,
  className = "",
  intensity = 8,
  glare = true,
  ...rest
}: TiltCardProps) {
  const reduce = useReducedMotion();

  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);

  const spring = { stiffness: 220, damping: 20, mass: 0.4 };

  const rotateX = useSpring(
    useTransform(py, [0, 1], [intensity, -intensity]),
    spring
  );
  const rotateY = useSpring(
    useTransform(px, [0, 1], [-intensity, intensity]),
    spring
  );

  const glareX = useTransform(px, (v) => v * 100);
  const glareY = useTransform(py, (v) => v * 100);
  const glareBackground = useMotionTemplate`radial-gradient(260px circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.10), transparent 62%)`;
  const glareOpacity = useSpring(0, { stiffness: 200, damping: 24 });

  if (reduce) {
    return (
      <motion.div {...rest} className={className}>
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      {...rest}
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        px.set((e.clientX - rect.left) / rect.width);
        py.set((e.clientY - rect.top) / rect.height);
      }}
      onPointerEnter={() => glareOpacity.set(1)}
      onPointerLeave={() => {
        px.set(0.5);
        py.set(0.5);
        glareOpacity.set(0);
      }}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 900,
        transformStyle: "preserve-3d",
      }}
      className={`relative ${className}`}
    >
      {children}

      {glare && (
        <motion.div
          aria-hidden
          style={{ background: glareBackground, opacity: glareOpacity }}
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
        />
      )}
    </motion.div>
  );
}

/* =========================================================
   ANIMATED NUMBER  (count-up)
========================================================= */

export function AnimatedNumber({
  value,
  format = (n: number) => n.toLocaleString(),
  duration = 1.4,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
}) {
  const reduce = useReducedMotion();
  const motionValue = useMotionValue(reduce ? value : 0);
  const text = useTransform(motionValue, (v) => format(Math.round(v)));

  useEffect(() => {
    if (reduce) {
      motionValue.set(value);
      return;
    }
    const controls = animate(motionValue, value, {
      duration,
      ease: "easeOut",
    });
    return () => controls.stop();
  }, [value, duration, reduce, motionValue]);

  return <motion.span>{text}</motion.span>;
}

/* =========================================================
   SCROLL PROGRESS BAR
========================================================= */

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 25 });

  return (
    <motion.div
      aria-hidden
      style={{ scaleX, transformOrigin: "0% 50%" }}
      className="fixed inset-x-0 top-0 z-[60] h-0.5 bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-400"
    />
  );
}

/* =========================================================
   CSS 3D CUBE
========================================================= */

const faceTransforms = (half: number) => [
  `rotateY(0deg) translateZ(${half}px)`,
  `rotateY(90deg) translateZ(${half}px)`,
  `rotateY(180deg) translateZ(${half}px)`,
  `rotateY(-90deg) translateZ(${half}px)`,
  `rotateX(90deg) translateZ(${half}px)`,
  `rotateX(-90deg) translateZ(${half}px)`,
];

function Cube({
  size,
  faces = [],
  faceClassName,
  duration = 24,
  reverse = false,
  tilt = -24,
}: {
  size: number;
  faces?: ReactNode[];
  faceClassName: string;
  duration?: number;
  reverse?: boolean;
  tilt?: number;
}) {
  const reduce = useReducedMotion();

  return (
    <div
      style={{ width: size, height: size, perspective: size * 6 }}
      className="relative"
    >
      <motion.div
        initial={{ rotateX: tilt, rotateY: reduce ? 28 : 0 }}
        animate={reduce ? undefined : { rotateY: reverse ? -360 : 360 }}
        transition={{ duration, repeat: Infinity, ease: "linear" }}
        style={{ transformStyle: "preserve-3d" }}
        className="relative h-full w-full"
      >
        {faceTransforms(size / 2).map((transform, i) => (
          <div
            key={i}
            style={{ transform }}
            className={`absolute inset-0 flex items-center justify-center ${faceClassName}`}
          >
            {faces[i]}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/* =========================================================
   HERO 3D OBJECT  (glass cube + core + orbit rings)
========================================================= */

const HERO_FACES = [
  <Code2 key="code" size={30} />,
  <GitBranch key="branch" size={30} />,
  <Star key="star" size={30} />,
  <Network key="network" size={30} />,
  <Boxes key="boxes" size={30} />,
  <Bot key="bot" size={30} />,
];

export function RepoCube() {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.9, delay: 0.3, ease: "easeOut" }}
      aria-hidden
      className="relative hidden h-[230px] w-[230px] shrink-0 sm:block"
      style={{ perspective: 900 }}
    >
      {/* soft glow underneath */}
      <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/20 blur-[60px]" />

      {/* orbit rings */}
      {[
        { size: 220, rotateX: 74, duration: 14, color: "cyan" },
        { size: 190, rotateX: 112, duration: 18, color: "violet" },
      ].map(({ size, rotateX, duration, color }, i) => (
        <motion.div
          key={i}
          style={{ rotateX, transformStyle: "preserve-3d" }}
          className="absolute inset-0 grid place-items-center"
        >
          <motion.div
            animate={reduce ? undefined : { rotateZ: i === 0 ? 360 : -360 }}
            transition={{ duration, repeat: Infinity, ease: "linear" }}
            style={{ width: size, height: size }}
            className={`relative rounded-full border ${
              color === "cyan"
                ? "border-cyan-400/25"
                : "border-violet-400/25"
            }`}
          >
            <span
              className={`absolute -top-[5px] left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full ${
                color === "cyan"
                  ? "bg-cyan-300 shadow-[0_0_14px_rgba(34,211,238,.9)]"
                  : "bg-violet-300 shadow-[0_0_14px_rgba(167,139,250,.9)]"
              }`}
            />
          </motion.div>
        </motion.div>
      ))}

      {/* cube */}
      <motion.div
        animate={reduce ? undefined : { y: [-7, 7, -7] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 grid place-items-center"
        style={{ transformStyle: "preserve-3d" }}
      >
        <div className="relative">
          <Cube
            size={124}
            faces={HERO_FACES}
            duration={26}
            faceClassName="border border-blue-400/35 bg-blue-500/[0.07] text-blue-300 shadow-[inset_0_0_34px_rgba(59,130,246,0.18)]"
          />

          {/* inner core, counter-rotating */}
          <div className="absolute inset-0 grid place-items-center">
            <Cube
              size={44}
              duration={14}
              reverse
              faceClassName="border border-violet-300/50 bg-violet-400/25 shadow-[0_0_22px_rgba(167,139,250,0.55)]"
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* =========================================================
   FLOATING BACKGROUND SHAPES
========================================================= */

const SHAPES = [
  { size: 54, left: "7%", top: "22%", duration: 38, float: 7, delay: 0 },
  { size: 36, left: "90%", top: "14%", duration: 30, float: 9, delay: 1 },
  { size: 70, left: "84%", top: "62%", duration: 46, float: 8, delay: 0.5 },
  { size: 30, left: "14%", top: "74%", duration: 28, float: 6, delay: 1.5 },
  { size: 44, left: "48%", top: "88%", duration: 34, float: 10, delay: 2 },
];

export function FloatingShapes() {
  const reduce = useReducedMotion();

  return (
    <div className="absolute inset-0 hidden md:block">
      {SHAPES.map((shape, i) => (
        <motion.div
          key={i}
          style={{ left: shape.left, top: shape.top }}
          animate={reduce ? undefined : { y: [0, -22, 0] }}
          transition={{
            duration: shape.float,
            repeat: Infinity,
            ease: "easeInOut",
            delay: shape.delay,
          }}
          className="absolute opacity-60"
        >
          <Cube
            size={shape.size}
            duration={shape.duration}
            reverse={i % 2 === 1}
            tilt={-20 - i * 6}
            faceClassName="border border-blue-300/[0.14] bg-blue-400/[0.02]"
          />
        </motion.div>
      ))}
    </div>
  );
}

/* =========================================================
   ISOMETRIC LAYER STACK  (for the CTA)
========================================================= */

const LAYERS: { icon: ReactNode; className: string }[] = [
  {
    icon: <Search size={20} />,
    className:
      "border-cyan-300/30 bg-cyan-400/[0.10] text-cyan-200 shadow-[0_0_30px_rgba(34,211,238,0.18)]",
  },
  {
    icon: <Layers3 size={20} />,
    className:
      "border-violet-300/30 bg-violet-400/[0.12] text-violet-200 shadow-[0_0_30px_rgba(167,139,250,0.2)]",
  },
  {
    icon: <Bot size={20} />,
    className:
      "border-blue-300/40 bg-blue-400/[0.18] text-blue-100 shadow-[0_0_36px_rgba(96,165,250,0.35)]",
  },
];

export function IsometricStack() {
  const reduce = useReducedMotion();

  return (
    <div
      aria-hidden
      className="relative hidden h-[190px] w-[190px] shrink-0 xl:block"
      style={{ perspective: 800 }}
    >
      <div
        style={{
          transformStyle: "preserve-3d",
          transform: "rotateX(58deg) rotateZ(-38deg)",
        }}
        className="absolute inset-0 grid place-items-center"
      >
        {LAYERS.map((layer, i) => (
          <motion.div
            key={i}
            initial={{ z: 0, opacity: 0 }}
            whileInView={{ z: i * 34, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 + i * 0.15 }}
            className="absolute [transform-style:preserve-3d]"
          >
            <motion.div
              animate={reduce ? undefined : { z: [0, 12, 0] }}
              transition={{
                duration: 3.6,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.45,
              }}
              className={`flex h-28 w-28 items-center justify-center rounded-2xl border backdrop-blur-sm ${layer.className}`}
            >
              {layer.icon}
            </motion.div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
