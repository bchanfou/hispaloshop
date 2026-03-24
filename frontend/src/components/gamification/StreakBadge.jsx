import React from 'react';

export default function StreakBadge({ count }) {
  if (!count || count <= 0) return null;

  const isHot = count >= 7;

  return (
    <div
      className="flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold shrink-0"
      style={{
        background: isHot ? 'linear-gradient(135deg, #FF6B35, #FF3B30)' : 'var(--color-bg-secondary)',
        color: isHot ? 'white' : 'var(--color-text-secondary)',
      }}
      title={`Racha de ${count} días`}
    >
      <span style={{ fontSize: 13 }}>{isHot ? '🔥' : '⚡'}</span>
      <span>{count}</span>
    </div>
  );
}
