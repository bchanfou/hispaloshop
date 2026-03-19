import React from 'react';
import { motion } from 'framer-motion';

const SPRING = { type: 'spring', stiffness: 380, damping: 30, mass: 0.8 };
const EASE_OUT = [0, 0, 0.2, 1];

/**
 * Wraps page content with a staggered entrance animation.
 * Children with `data-animate` get individually staggered.
 *
 * Usage:
 *   <PageTransition>
 *     <section>...</section>
 *   </PageTransition>
 */
export default function PageTransition({ children, className = '' }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

/**
 * A single animated section for use inside PageTransition or standalone.
 * Staggers automatically when nested inside <StaggerList>.
 */
export function AnimatedSection({ children, className = '', delay = 0 }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Wraps a list of items with automatic stagger.
 * Each direct child gets an entrance animation with 60ms stagger.
 *
 * Usage:
 *   <StaggerList>
 *     {items.map(item => <Card key={item.id} />)}
 *   </StaggerList>
 */
const staggerContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  show:   { opacity: 1, y: 0,  scale: 1,    transition: SPRING },
};

export function StaggerList({ children, className = '' }) {
  return (
    <motion.div
      className={className}
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      {React.Children.map(children, (child) =>
        child ? (
          <motion.div variants={staggerItem} style={{ display: 'contents' }}>
            {child}
          </motion.div>
        ) : null,
      )}
    </motion.div>
  );
}
