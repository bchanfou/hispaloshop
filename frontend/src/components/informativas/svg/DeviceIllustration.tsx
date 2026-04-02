import React from 'react';
import { motion } from 'framer-motion';

/** Abstract phone/app wireframe — minimal device outline with UI elements */
export default function DeviceIllustration({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Phone frame */}
      <motion.rect
        x="120" y="50" width="160" height="300" rx="20"
        stroke="#44403c" strokeWidth="1.5" fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2 }}
      />

      {/* Screen area */}
      <motion.rect
        x="130" y="70" width="140" height="260" rx="12"
        fill="#fafaf9"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      />

      {/* Notch */}
      <motion.rect
        x="175" y="55" width="50" height="6" rx="3"
        fill="#a8a29e"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ duration: 0.3, delay: 0.8 }}
      />

      {/* UI elements inside screen */}
      {/* Header bar */}
      <motion.rect
        x="140" y="82" width="120" height="8" rx="4"
        fill="#d6d3d1"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.4, delay: 1.0 }}
        style={{ transformOrigin: '140px 86px' }}
      />

      {/* Product card 1 */}
      <motion.rect
        x="140" y="100" width="52" height="52" rx="8"
        fill="#e7e5e4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 1.1 }}
      />
      <motion.rect
        x="200" y="100" width="52" height="52" rx="8"
        fill="#e7e5e4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 1.2 }}
      />

      {/* Text lines */}
      {[164, 180, 196, 216].map((y, i) => (
        <motion.rect
          key={i}
          x="140" y={y} width={100 - i * 15} height="4" rx="2"
          fill="#d6d3d1"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.3, delay: 1.3 + i * 0.08 }}
          style={{ transformOrigin: `140px ${y + 2}px` }}
        />
      ))}

      {/* Product card 2 */}
      <motion.rect
        x="140" y="232" width="52" height="52" rx="8"
        fill="#e7e5e4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 1.5 }}
      />
      <motion.rect
        x="200" y="232" width="52" height="52" rx="8"
        fill="#e7e5e4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 1.6 }}
      />

      {/* Bottom nav dots */}
      {[165, 200, 235].map((cx, i) => (
        <motion.circle
          key={i}
          cx={cx} cy="310" r="3"
          fill={i === 0 ? '#57534e' : '#d6d3d1'}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3, delay: 1.7 + i * 0.05 }}
        />
      ))}

      {/* Decorative rings around phone */}
      <motion.rect
        x="105" y="35" width="190" height="330" rx="30"
        stroke="#e7e5e4" strokeWidth="0.5" fill="none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ duration: 0.6, delay: 1.5 }}
      />
    </svg>
  );
}
