"use client"

import { motion } from "framer-motion"

// Decorative dependency-graph illustration: edges draw themselves and nodes pop in when the
// graphic scrolls into view.

const CENTER = { x: 240, y: 180 }

const NODES = [
  { x: 80, y: 70, label: "routes.ts", color: "#60a5fa" },
  { x: 400, y: 60, label: "auth.service", color: "#a78bfa" },
  { x: 60, y: 250, label: "queue.ts", color: "#22d3ee" },
  { x: 410, y: 270, label: "vectorstore", color: "#f0abfc" },
  { x: 240, y: 40, label: "index.ts", color: "#34d399" },
  { x: 240, y: 322, label: "worker.ts", color: "#fbbf24" },
]

export function GraphIllustration() {
  return (
    <svg
      viewBox="0 0 480 360"
      role="img"
      aria-label="Illustration of a dependency graph linking source files around a central module"
      className="h-auto w-full"
    >
      <defs>
        <radialGradient id="graph-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#3b82f6" />
        </radialGradient>
        <radialGradient id="graph-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx={CENTER.x} cy={CENTER.y} r="150" fill="url(#graph-glow)" />

      {NODES.map((node, i) => (
        <motion.line
          key={`edge-${node.label}`}
          x1={CENTER.x}
          y1={CENTER.y}
          x2={node.x}
          y2={node.y}
          stroke={node.color}
          strokeOpacity="0.55"
          strokeWidth="1.5"
          strokeDasharray="4 5"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.9, delay: 0.2 + i * 0.12, ease: "easeOut" }}
        />
      ))}

      {NODES.map((node, i) => (
        <motion.g
          key={node.label}
          initial={{ opacity: 0, scale: 0.6 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.5 + i * 0.12 }}
          style={{ transformOrigin: `${node.x}px ${node.y}px` }}
        >
          <circle cx={node.x} cy={node.y} r="22" fill="#0d0d14" stroke={node.color} strokeWidth="1.5" />
          <circle cx={node.x} cy={node.y} r="6" fill={node.color} />
          <text x={node.x} y={node.y + 40} textAnchor="middle" fontSize="12" fill="#94a3b8" fontFamily="ui-monospace, monospace">
            {node.label}
          </text>
        </motion.g>
      ))}

      <motion.g
        initial={{ opacity: 0, scale: 0.5 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ type: "spring", stiffness: 200, damping: 16 }}
        style={{ transformOrigin: `${CENTER.x}px ${CENTER.y}px` }}
      >
        <motion.circle
          cx={CENTER.x}
          cy={CENTER.y}
          r="38"
          fill="none"
          stroke="#a78bfa"
          strokeOpacity="0.5"
          animate={{ r: [38, 52], opacity: [0.6, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
        />
        <circle cx={CENTER.x} cy={CENTER.y} r="34" fill="url(#graph-core)" />
        <text x={CENTER.x} y={CENTER.y + 5} textAnchor="middle" fontSize="13" fontWeight="600" fill="#fff" fontFamily="ui-monospace, monospace">
          core
        </text>
      </motion.g>
    </svg>
  )
}
