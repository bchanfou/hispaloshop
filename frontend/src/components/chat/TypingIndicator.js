import React from 'react';
import { motion } from 'framer-motion';

export function TypingIndicator({ roleConfig }) {
  const name = roleConfig?.name || 'Hispal AI';

  return (
    <div className="flex justify-start mb-4">
      <div className="flex items-end gap-2">
        {/* HA Avatar */}
        <div className="w-8 h-8 rounded-full bg-stone-950 flex items-center justify-center flex-shrink-0 mb-0.5">
          <span className="text-white font-semibold text-[9px] tracking-tight">HA</span>
        </div>

        {/* Bubble */}
        <div className="bg-white border border-stone-100 rounded-3xl rounded-bl-md px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-stone-400"
                  animate={{ y: [0, -5, 0] }}
                  transition={{
                    duration: 0.9,
                    repeat: Infinity,
                    delay: i * 0.18,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </div>
            <span className="text-stone-400 text-[11px] italic">
              {name} está pensando...
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TypingIndicator;
