import React from 'react';
import { motion } from 'framer-motion';

/**
 * HomeHeader v7 — feed tab toggle only (logo + bell live in AppHeader)
 * Sticky below AppHeader (top-[52px] on mobile, top-0 on desktop).
 */
export default function HomeHeader({ activeTab = 'foryou', onTabChange }) {
  if (!onTabChange) return null;

  return (
    <div
      className="sticky top-[52px] lg:top-0 z-30 bg-white border-b border-stone-100 flex items-center justify-center py-2.5"
      data-testid="home-header"
    >
      {/* Feed tab toggle — centered */}
      <div className="flex items-center rounded-full bg-stone-100 p-0.5 gap-0.5">
        {[
          { key: 'foryou', label: 'Para ti' },
          { key: 'following', label: 'Siguiendo' },
        ].map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => onTabChange(key)}
            className={`relative rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors ${
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
          </button>
        ))}
      </div>
    </div>
  );
}
