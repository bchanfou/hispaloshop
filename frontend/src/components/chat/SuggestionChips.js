import React from 'react';
import { motion } from 'framer-motion';

function SuggestionChips({ suggestions, onSelect, isEmpty = false }) {
  if (!suggestions || suggestions.length === 0) return null;

  if (isEmpty) {
    const items = suggestions.slice(0, 3);

    return (
      <div className="flex w-full gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {items.map((suggestion, index) => (
          <motion.button
            key={suggestion.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.07, duration: 0.2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect(suggestion)}
            className="flex min-w-[172px] flex-shrink-0 flex-col items-start gap-3 rounded-[24px] border border-stone-200 bg-white px-4 py-4 text-left shadow-[0_10px_24px_rgba(30,25,20,0.05)] transition-all hover:border-stone-300 hover:bg-stone-50"
          >
            <span className="text-lg leading-none">{suggestion.emoji || 'AI'}</span>
            <span className="text-sm font-medium leading-snug text-stone-900">{suggestion.label}</span>
          </motion.button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {suggestions.slice(0, 3).map((suggestion, index) => (
        <motion.button
          key={suggestion.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelect(suggestion)}
          className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:border-stone-300 hover:bg-stone-50"
        >
          {suggestion.emoji ? <span className="text-sm leading-none">{suggestion.emoji}</span> : null}
          {suggestion.label}
        </motion.button>
      ))}
    </div>
  );
}

export default SuggestionChips;
