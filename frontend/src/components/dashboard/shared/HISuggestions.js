import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, X } from 'lucide-react';

function HISuggestions({ suggestions, onDismiss }) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="space-y-3">
      {suggestions.map((suggestion, index) => (
        <motion.div
          key={suggestion.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.06 }}
          className="rounded-2xl border border-stone-100 bg-stone-50 p-4"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white text-stone-700">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-stone-950">{suggestion.title}</p>
              <p className="mt-1 text-xs text-stone-500">{suggestion.description}</p>
              <button type="button" onClick={suggestion.onAction} className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-stone-700">
                {suggestion.actionLabel}
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            <button type="button" onClick={() => onDismiss?.(suggestion.id)} className="rounded-full p-1 text-stone-400 transition-colors hover:bg-white hover:text-stone-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export default HISuggestions;
