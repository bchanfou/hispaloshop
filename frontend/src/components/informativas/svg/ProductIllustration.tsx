import React from 'react';
import { motion } from 'framer-motion';

/** Abstract product/basket — organic shapes, thin lines, stone palette */
export default function ProductIllustration({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background circle */}
      <motion.circle
        cx="200" cy="200" r="180"
        stroke="#d6d3d1" strokeWidth="0.5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2, ease: 'easeInOut' }}
      />

      {/* Basket shape */}
      <motion.path
        d="M120 220 C120 220 140 300 200 300 C260 300 280 220 280 220"
        stroke="#44403c" strokeWidth="1.5" strokeLinecap="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, delay: 0.3 }}
      />
      <motion.line
        x1="120" y1="220" x2="280" y2="220"
        stroke="#44403c" strokeWidth="1.5" strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      />

      {/* Handle */}
      <motion.path
        d="M160 220 C160 160 240 160 240 220"
        stroke="#a8a29e" strokeWidth="1" strokeLinecap="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, delay: 0.5 }}
      />

      {/* Products peeking out — abstract circles */}
      <motion.circle
        cx="170" cy="200" r="18"
        stroke="#78716c" strokeWidth="1" fill="none"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      />
      <motion.circle
        cx="200" cy="190" r="22"
        stroke="#57534e" strokeWidth="1" fill="#fafaf9"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, delay: 0.9 }}
      />
      <motion.circle
        cx="235" cy="200" r="16"
        stroke="#78716c" strokeWidth="1" fill="none"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, delay: 1.0 }}
      />

      {/* Leaf accent */}
      <motion.path
        d="M210 170 C220 150 240 155 235 175 C230 160 215 158 210 170Z"
        fill="#a8a29e"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ duration: 0.6, delay: 1.2 }}
      />

      {/* Decorative dots */}
      {[
        [130, 170], [270, 170], [150, 320], [250, 320],
        [100, 250], [300, 250],
      ].map(([cx, cy], i) => (
        <motion.circle
          key={i}
          cx={cx} cy={cy} r="2"
          fill="#d6d3d1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 1.0 + i * 0.1 }}
        />
      ))}
    </svg>
  );
}
