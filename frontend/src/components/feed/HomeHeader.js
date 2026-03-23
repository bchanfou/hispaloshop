import React from 'react';
import { motion } from 'framer-motion';

/**
 * HomeHeader v8 — compact feed tab toggle, inline (not sticky).
 * Sits between AppHeader and StoriesBar as part of scrollable content.
 */
export default function HomeHeader({ activeTab = 'foryou', onTabChange }) {
  if (!onTabChange) return null;

  return (
    <div className="flex items-center justify-center py-2 bg-white">
      <div className="flex items-center rounded-full bg-stone-100 p-0.5 gap-0.5">
        {[
          { key: 'foryou', label: 'Para ti' },
          { key: 'following', label: 'Siguiendo' },
        ].map(({ key, label }) => (
          <motion.button
            key={key}
            type="button"
            onClick={() => onTabChange(key)}
            whileHover={{ scale: 1.05 }}
            className={`relative rounded-full px-5 py-1.5 text-[13px] font-semibold transition-colors ${
              activeTab === key ? 'text-white' : 'text-stone-500 bg-transparent'
            }`}
            aria-pressed={activeTab === key}
          >
            {activeTab === key && (
              <motion.span
                layoutId="feed-tab-indicator"
                className="absolute inset-0 rounded-full bg-stone-950"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative z-10">{label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
