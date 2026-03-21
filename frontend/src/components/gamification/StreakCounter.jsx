import React from 'react';
import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';

/**
 * StreakCounter — Flame icon with streak day count.
 * Pulsing animation when streak is active (days > 0).
 * Stone palette. Apple minimalist DNA.
 *
 * @param {number} days - Current streak in days
 */
export default function StreakCounter({ days = 0 }) {
  const isActive = days > 0;

  return (
    <div className="inline-flex items-center gap-1.5">
      <motion.div
        animate={
          isActive
            ? { scale: [1, 1.15, 1], opacity: [0.85, 1, 0.85] }
            : { scale: 1, opacity: 0.4 }
        }
        transition={
          isActive
            ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 0.3 }
        }
        className="flex items-center justify-center"
      >
        <Flame
          size={20}
          className={isActive ? 'text-stone-950' : 'text-stone-300'}
          strokeWidth={2}
        />
      </motion.div>
      <span
        className={`text-sm font-semibold tabular-nums ${
          isActive ? 'text-stone-950' : 'text-stone-400'
        }`}
      >
        {days}
      </span>
    </div>
  );
}
