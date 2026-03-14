import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function LikeAnimation({ show, x = '50%', y = '50%' }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ 
            scale: [0, 1.4, 1],
            opacity: [0, 1, 1, 0],
            y: [0, -20, -100],
          }}
          exit={{ opacity: 0 }}
          transition={{ 
            duration: 0.8,
            ease: 'easeOut',
            times: [0, 0.2, 0.5, 1]
          }}
          style={{ 
            position: 'absolute',
            left: x,
            top: y,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 50,
          }}
        >
          <svg
            width="120"
            height="120"
            viewBox="0 0 24 24"
            fill="var(--hs-red)"
            style={{ filter: 'drop-shadow(0 4px 12px rgba(255, 59, 48, 0.4))' }}
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
          
          {/* Partículas */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, x: 0, y: 0 }}
              animate={{ 
                scale: [0, 1, 0],
                x: Math.cos((i * 60 * Math.PI) / 180) * 60,
                y: Math.sin((i * 60 * Math.PI) / 180) * 60,
              }}
              transition={{ duration: 0.6, delay: 0.1 }}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'var(--hs-red)',
                transform: 'translate(-50%, -50%)',
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default LikeAnimation;
