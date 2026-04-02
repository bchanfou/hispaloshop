import React from 'react';
import { motion } from 'framer-motion';

/** Abstract botanical — minimal plant/leaf forms, editorial style */
export default function BotanicalIllustration({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Main stem */}
      <motion.path
        d="M200 350 C200 350 200 250 200 200 C200 150 195 100 200 70"
        stroke="#57534e" strokeWidth="1.5" strokeLinecap="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />

      {/* Left leaf 1 */}
      <motion.path
        d="M200 250 C170 240 130 220 120 190 C140 200 170 210 200 220"
        stroke="#78716c" strokeWidth="1" fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, delay: 0.5 }}
      />
      <motion.path
        d="M200 250 C170 240 130 220 120 190 C140 200 170 210 200 220"
        fill="#e7e5e4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      />

      {/* Right leaf 1 */}
      <motion.path
        d="M200 210 C230 195 270 185 290 160 C270 175 235 190 200 200"
        stroke="#78716c" strokeWidth="1" fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, delay: 0.7 }}
      />
      <motion.path
        d="M200 210 C230 195 270 185 290 160 C270 175 235 190 200 200"
        fill="#e7e5e4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ duration: 0.5, delay: 1.0 }}
      />

      {/* Left leaf 2 (smaller, higher) */}
      <motion.path
        d="M200 160 C180 150 155 140 145 120 C160 130 180 140 200 148"
        stroke="#a8a29e" strokeWidth="0.8" fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, delay: 0.9 }}
      />

      {/* Right leaf 2 (smaller, higher) */}
      <motion.path
        d="M200 130 C215 120 240 115 255 100 C240 112 218 120 200 125"
        stroke="#a8a29e" strokeWidth="0.8" fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, delay: 1.0 }}
      />

      {/* Top bud */}
      <motion.circle
        cx="200" cy="68" r="8"
        stroke="#57534e" strokeWidth="1" fill="none"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, delay: 1.2 }}
      />
      <motion.circle
        cx="200" cy="68" r="3"
        fill="#57534e"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.4, delay: 1.4 }}
      />

      {/* Leaf veins */}
      <motion.line
        x1="160" y1="230" x2="190" y2="240"
        stroke="#d6d3d1" strokeWidth="0.5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, delay: 1.1 }}
      />
      <motion.line
        x1="245" y1="185" x2="210" y2="200"
        stroke="#d6d3d1" strokeWidth="0.5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, delay: 1.2 }}
      />

      {/* Ground line */}
      <motion.line
        x1="150" y1="350" x2="250" y2="350"
        stroke="#d6d3d1" strokeWidth="1" strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      />

      {/* Decorative scattered dots */}
      {[
        [100, 280], [300, 130], [110, 150], [310, 250],
        [130, 100], [280, 300],
      ].map(([cx, cy], i) => (
        <motion.circle
          key={i}
          cx={cx} cy={cy} r="1.5"
          fill="#d6d3d1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 1.3 + i * 0.08 }}
        />
      ))}
    </svg>
  );
}
