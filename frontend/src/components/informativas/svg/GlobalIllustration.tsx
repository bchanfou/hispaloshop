import React from 'react';
import { motion } from 'framer-motion';

/** Abstract globe — minimal meridians and parallels, dot markers */
export default function GlobalIllustration({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Main globe circle */}
      <motion.circle
        cx="200" cy="200" r="140"
        stroke="#44403c" strokeWidth="1.5" fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, ease: 'easeInOut' }}
      />

      {/* Vertical meridian */}
      <motion.ellipse
        cx="200" cy="200" rx="60" ry="140"
        stroke="#a8a29e" strokeWidth="0.8" fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, delay: 0.3 }}
      />

      {/* Tilted meridian */}
      <motion.ellipse
        cx="200" cy="200" rx="100" ry="140"
        stroke="#d6d3d1" strokeWidth="0.5" fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, delay: 0.4 }}
      />

      {/* Horizontal parallels */}
      {[-70, -35, 0, 35, 70].map((offset, i) => {
        const y = 200 + offset;
        const halfWidth = Math.sqrt(140 * 140 - offset * offset);
        return (
          <motion.line
            key={i}
            x1={200 - halfWidth} y1={y} x2={200 + halfWidth} y2={y}
            stroke="#e7e5e4" strokeWidth="0.5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6, delay: 0.6 + i * 0.1 }}
          />
        );
      })}

      {/* Location dots — key markets */}
      {[
        [175, 160, 5],   // Spain
        [225, 170, 4],   // Italy
        [285, 180, 3.5], // Japan
        [295, 195, 3.5], // Korea
        [120, 180, 4],   // USA
        [195, 150, 3],   // France
        [205, 145, 3],   // Germany
      ].map(([cx, cy, r], i) => (
        <React.Fragment key={i}>
          <motion.circle
            cx={cx} cy={cy} r={r as number}
            fill="#57534e"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.4, delay: 1.2 + i * 0.08 }}
          />
          <motion.circle
            cx={cx} cy={cy} r={(r as number) + 6}
            stroke="#a8a29e" strokeWidth="0.5" fill="none"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.5 }}
            transition={{ duration: 0.6, delay: 1.4 + i * 0.08 }}
          />
        </React.Fragment>
      ))}

      {/* Equator emphasis */}
      <motion.ellipse
        cx="200" cy="200" rx="140" ry="20"
        stroke="#a8a29e" strokeWidth="0.5" fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, delay: 0.5 }}
      />
    </svg>
  );
}
