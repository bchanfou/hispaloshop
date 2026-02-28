import React from 'react';
import { Heart, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function HealthScoreHero({ 
  score, 
  label, 
  trend,
  trendValue,
  breakdown,
  className = '' 
}) {
  const getScoreClass = (score) => {
    if (score >= 80) return 'health-score-excellent';
    if (score >= 60) return 'health-score-good';
    if (score >= 40) return 'health-score-fair';
    return 'health-score-poor';
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div 
      className={`health-score-hero ${getScoreClass(score)} ${className}`}
      data-testid="health-score-hero"
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
        <Heart className="w-full h-full" fill="currentColor" />
      </div>
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Heart className="w-5 h-5" fill="currentColor" strokeWidth={0} />
          <span className="health-score-label">Store Health Score</span>
        </div>
        
        {/* Score */}
        <div className="flex items-end gap-4 mb-4">
          <div className="health-score-value">{score}</div>
          <div className="flex flex-col pb-2">
            <span className="text-sm opacity-90">/100</span>
            {trend && (
              <div className="flex items-center gap-1 mt-1">
                <TrendIcon className="w-4 h-4" />
                <span className="text-sm font-medium">{trendValue}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Status Label */}
        <div className="text-lg font-medium opacity-95 mb-4">{label}</div>
        
        {/* Progress Bar */}
        <div className="h-2 bg-white/20 rounded-full overflow-hidden mb-4">
          <div 
            className="h-full bg-white/90 rounded-full transition-all duration-500"
            style={{ width: `${score}%` }}
          />
        </div>
        
        {/* Breakdown - Mobile Grid */}
        {breakdown && (
          <div className="grid grid-cols-5 gap-2 mt-4">
            {Object.entries(breakdown).map(([key, item]) => (
              <div 
                key={key} 
                className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center"
              >
                <div className="text-lg font-bold">{item.score}</div>
                <div className="text-[10px] opacity-80 uppercase tracking-wider">{item.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
