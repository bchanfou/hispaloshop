import React from 'react';
import { motion } from 'framer-motion';

function SuggestionChips({ suggestions, onSelect, roleColor }) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-4">
      {suggestions.map((suggestion, index) => (
        <motion.button
          key={suggestion.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelect(suggestion)}
          className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors"
          style={{
            backgroundColor: roleColor + '15',
            color: roleColor,
            border: `1px solid ${roleColor}30`,
          }}
        >
          {suggestion.label}
        </motion.button>
      ))}
    </div>
  );
}

export default SuggestionChips;
