import React from 'react';
import { motion } from 'framer-motion';

/** Abstract connection: producer → consumer — dots linked by flowing lines */
export default function ConnectionIllustration({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Left node (producer) */}
      <motion.circle
        cx="80" cy="200" r="30"
        stroke="#44403c" strokeWidth="1.5" fill="none"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.6 }}
      />
      <motion.circle
        cx="80" cy="200" r="8"
        fill="#44403c"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      />

      {/* Right node (consumer) */}
      <motion.circle
        cx="320" cy="200" r="30"
        stroke="#44403c" strokeWidth="1.5" fill="none"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      />
      <motion.circle
        cx="320" cy="200" r="8"
        fill="#44403c"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      />

      {/* Flowing connection line */}
      <motion.path
        d="M110 200 C160 160 240 240 290 200"
        stroke="#78716c" strokeWidth="1.5" strokeLinecap="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, delay: 0.5 }}
      />

      {/* Intermediate dots on path */}
      {[
        [155, 180], [200, 200], [245, 220],
      ].map(([cx, cy], i) => (
        <motion.circle
          key={i}
          cx={cx} cy={cy} r="4"
          fill="#a8a29e"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 1.0 + i * 0.15 }}
        />
      ))}

      {/* Label lines (abstract text representations) */}
      <motion.line
        x1="55" y1="250" x2="105" y2="250"
        stroke="#d6d3d1" strokeWidth="2" strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, delay: 0.8 }}
      />
      <motion.line
        x1="295" y1="250" x2="345" y2="250"
        stroke="#d6d3d1" strokeWidth="2" strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, delay: 0.9 }}
      />

      {/* Radiating rings — subtle */}
      {[40, 55].map((r, i) => (
        <motion.circle
          key={`l-${i}`}
          cx="80" cy="200" r={r}
          stroke="#e7e5e4" strokeWidth="0.5" fill="none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ duration: 0.5, delay: 1.2 + i * 0.1 }}
        />
      ))}
      {[40, 55].map((r, i) => (
        <motion.circle
          key={`r-${i}`}
          cx="320" cy="200" r={r}
          stroke="#e7e5e4" strokeWidth="0.5" fill="none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ duration: 0.5, delay: 1.3 + i * 0.1 }}
        />
      ))}

      {/* Cross-out of middleman (subtle X in center) */}
      <motion.line
        x1="190" y1="140" x2="210" y2="160"
        stroke="#d6d3d1" strokeWidth="0.8" strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, delay: 1.5 }}
      />
      <motion.line
        x1="210" y1="140" x2="190" y2="160"
        stroke="#d6d3d1" strokeWidth="0.8" strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, delay: 1.6 }}
      />
    </svg>
  );
}
