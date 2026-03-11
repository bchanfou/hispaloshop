import React from 'react';
import { motion } from 'framer-motion';

export function TypingIndicator() {
  return (
    <div className="mb-4 flex justify-start">
      <div className="flex items-end gap-3">
        <div className="mb-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-stone-950 shadow-[0_6px_16px_rgba(15,15,15,0.12)]">
          <span className="text-[10px] font-semibold tracking-tight text-white">HA</span>
        </div>

        <div className="rounded-[28px] rounded-bl-lg border border-stone-200 bg-white px-5 py-4 shadow-[0_10px_24px_rgba(30,25,20,0.05)]">
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="h-2 w-2 rounded-full bg-stone-400"
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
        </div>
      </div>
    </div>
  );
}

export default TypingIndicator;
