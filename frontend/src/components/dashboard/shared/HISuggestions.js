import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, X, ArrowRight } from 'lucide-react';

function HISuggestions({ suggestions, onDismiss }) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="space-y-3">
      {suggestions.map((suggestion, index) => (
        <motion.div
          key={suggestion.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-gradient-to-r from-accent/5 to-state-amber/5 rounded-xl p-4 border border-accent/10"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{suggestion.title}</p>
              <p className="text-xs text-text-muted mt-0.5">{suggestion.description}</p>
              
              <div className="flex items-center gap-2 mt-2">
                <button 
                  onClick={suggestion.onAction}
                  className="text-xs font-medium text-accent hover:text-accent/90 flex items-center gap-1"
                >
                  {suggestion.actionLabel}
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
            <button 
              onClick={() => onDismiss?.(suggestion.id)}
              className="p-1 hover:bg-slate-950/5 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-text-muted" />
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export default HISuggestions;
