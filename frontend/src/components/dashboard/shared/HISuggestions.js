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
          className="bg-gradient-to-r from-[#2D5A3D]/5 to-[#E6A532]/5 rounded-xl p-4 border border-[#2D5A3D]/10"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#2D5A3D] flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#1A1A1A]">{suggestion.title}</p>
              <p className="text-xs text-[#6B7280] mt-0.5">{suggestion.description}</p>
              
              <div className="flex items-center gap-2 mt-2">
                <button 
                  onClick={suggestion.onAction}
                  className="text-xs font-medium text-[#2D5A3D] hover:text-[#234a31] flex items-center gap-1"
                >
                  {suggestion.actionLabel}
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
            <button 
              onClick={() => onDismiss?.(suggestion.id)}
              className="p-1 hover:bg-black/5 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-[#6B7280]" />
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export default HISuggestions;
