import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';

/**
 * PressableButton — button with tactile press feedback.
 *
 * Variants:
 *   solid  — bg-stone-950 text-white (default)
 *   soft   — bg-stone-100 text-stone-950
 *   ghost  — transparent text-stone-950
 *   danger — bg-stone-950 text-white (same look, semantic difference)
 */
const VARIANT_CLASSES = {
  solid: 'bg-stone-950 text-white hover:bg-stone-800',
  soft: 'bg-stone-100 text-stone-950 hover:bg-stone-200',
  ghost: 'bg-transparent text-stone-950 hover:bg-stone-50',
  danger: 'bg-stone-950 text-white hover:bg-stone-800',
};

const PressableButton = forwardRef(function PressableButton(
  { variant = 'solid', className = '', children, disabled, ...props },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      whileHover={disabled ? undefined : { scale: 1.02 }}
      transition={{ type: 'spring', damping: 20, stiffness: 400 }}
      disabled={disabled}
      className={`inline-flex items-center justify-center font-semibold text-sm transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer border-none ${VARIANT_CLASSES[variant] || VARIANT_CLASSES.solid} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
});

export default PressableButton;
