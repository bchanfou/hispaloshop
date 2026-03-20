import React from 'react';
import { motion } from 'framer-motion';

/**
 * PageTransition — fade + subtle slide-up wrapper.
 * Wrap route content with this inside AnimatePresence.
 */
export default function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] } }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
    >
      {children}
    </motion.div>
  );
}
