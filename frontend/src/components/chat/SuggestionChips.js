import React from 'react';
import { motion } from 'framer-motion';

/**
 * SuggestionChips
 *
 * isEmpty=true  → 2×2 card grid for the welcome screen
 * isEmpty=false → horizontal scrolling compact chips during conversation
 */
function SuggestionChips({ suggestions, onSelect, isEmpty = false }) {
  if (!suggestions || suggestions.length === 0) return null;

  // ── Welcome state: 2×2 grid of cards ──────────────────────────
  if (isEmpty) {
    const items = suggestions.slice(0, 4);
    return (
      <div className="grid grid-cols-2 gap-3 w-full">
        {items.map((suggestion, index) => (
          <motion.button
            key={suggestion.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.07, duration: 0.2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect(suggestion)}
            className="flex flex-col items-start gap-2 p-4 rounded-2xl bg-white border border-stone-200 hover:border-stone-400 hover:shadow-sm transition-all text-left group"
          >
            <span className="text-xl leading-none">{suggestion.emoji || '✨'}</span>
            <span className="text-sm font-medium text-stone-800 leading-snug">
              {suggestion.label}
            </span>
          </motion.button>
        ))}
      </div>
    );
  }

  // ── Conversation state: compact horizontal chips ───────────────
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide px-4">
      {suggestions.map((suggestion, index) => (
        <motion.button
          key={suggestion.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelect(suggestion)}
          className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium bg-white border border-stone-200 text-stone-700 hover:border-stone-400 hover:bg-stone-50 transition-colors"
        >
          {suggestion.emoji && (
            <span className="text-base leading-none">{suggestion.emoji}</span>
          )}
          {suggestion.label}
        </motion.button>
      ))}
    </div>
  );
}

export default SuggestionChips;
