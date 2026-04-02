import React from 'react';
import { motion } from 'framer-motion';

/** Abstract growth/analytics — ascending curve with data points */
export default function GrowthIllustration({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Grid lines */}
      {[120, 170, 220, 270, 320].map((y, i) => (
        <motion.line
          key={`h-${i}`}
          x1="60" y1={y} x2="340" y2={y}
          stroke="#e7e5e4" strokeWidth="0.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: i * 0.05 }}
        />
      ))}

      {/* Ascending curve */}
      <motion.path
        d="M80 300 C120 290 140 270 170 250 C200 230 220 200 250 160 C270 135 300 110 330 90"
        stroke="#44403c" strokeWidth="2" strokeLinecap="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, delay: 0.3, ease: 'easeOut' }}
      />

      {/* Fill under curve */}
      <motion.path
        d="M80 300 C120 290 140 270 170 250 C200 230 220 200 250 160 C270 135 300 110 330 90 L330 320 L80 320 Z"
        fill="#f5f5f4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ duration: 0.8, delay: 1.0 }}
      />

      {/* Data points */}
      {[
        [80, 300], [130, 278], [170, 250], [210, 218],
        [250, 160], [290, 120], [330, 90],
      ].map(([cx, cy], i) => (
        <motion.circle
          key={i}
          cx={cx} cy={cy} r="4"
          fill="white" stroke="#44403c" strokeWidth="1.5"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3, delay: 1.2 + i * 0.1 }}
        />
      ))}

      {/* Highlight point (latest) */}
      <motion.circle
        cx="330" cy="90" r="7"
        fill="none" stroke="#78716c" strokeWidth="1"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.4, delay: 1.9 }}
      />

      {/* Axis lines */}
      <motion.line
        x1="60" y1="320" x2="350" y2="320"
        stroke="#a8a29e" strokeWidth="1" strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      />
      <motion.line
        x1="60" y1="80" x2="60" y2="320"
        stroke="#a8a29e" strokeWidth="1" strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      />
    </svg>
  );
}
