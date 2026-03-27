import React from 'react';

export default function WeeklyGoalBar({ spent = 0, goal = 2000 }) {
  if (goal <= 0) return null;

  const pct = Math.min((spent / goal) * 100, 100);
  const achieved = pct >= 100;

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-stone-500">Tu objetivo saludable esta semana</span>
        <span className={`text-xs font-semibold ${achieved ? 'text-stone-950' : 'text-stone-700'}`}>
          {Math.round(spent / 100)}€ / {Math.round(goal / 100)}€
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden bg-stone-200">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: achieved ? '#0c0a09' : '#44403c',
            transition: 'width 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}
        />
      </div>
    </div>
  );
}
