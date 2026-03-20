import React from 'react';
import { motion } from 'framer-motion';

const EASE = [0.25, 0.1, 0.25, 1];

const variants = {
  forward: {
    initial: { x: 20, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -20, opacity: 0 },
  },
  back: {
    initial: { x: -20, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: 20, opacity: 0 },
  },
};

/**
 * PageTransition — directional slide + fade wrapper.
 * Accepts `direction` ('forward' | 'back') for navigation-aware transitions.
 */
export default function PageTransition({ children, direction = 'forward' }) {
  const v = variants[direction] || variants.forward;

  return (
    <motion.div
      initial={v.initial}
      animate={{ ...v.animate, transition: { type: 'tween', duration: 0.2, ease: EASE } }}
      exit={{ ...v.exit, transition: { type: 'tween', duration: 0.2, ease: EASE } }}
    >
      {children}
    </motion.div>
  );
}
