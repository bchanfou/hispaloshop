import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, ChevronRight } from 'lucide-react';

function TierProgress({ currentTier, currentRate, nextTier, progress, onViewBenefits }) {
  const percentage = Math.round(progress * 100);
  
  return (
    <div className="bg-gradient-to-r from-accent to-accent rounded-2xl p-4 text-white">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-5 h-5 text-state-amber" />
        <span className="font-bold">Nivel {currentTier}</span>
        <span className="text-white/70 text-sm">({(currentRate * 100).toFixed(0)}% comisión)</span>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-white/70">Progreso hacia {nextTier}</span>
          <span className="font-medium">{percentage}%</span>
        </div>
        
        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full bg-state-amber rounded-full"
          />
        </div>
        
        <p className="text-xs text-white/70">
          €{(progress * 1000).toFixed(0)} para subir de nivel
        </p>
      </div>
      
      {onViewBenefits && (
        <button 
          onClick={onViewBenefits}
          className="mt-3 text-xs text-white/80 hover:text-white flex items-center gap-1 transition-colors"
        >
          Ver beneficios de niveles
          <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

export default TierProgress;
