import React from 'react';

const fillColors = {
  green: 'var(--color-green)',
  amber: 'var(--color-amber)',
  black: 'var(--color-black)',
};

const heightMap = { xs: 4, sm: 6, md: 8, lg: 12 };

export default function ProgressBar({
  value = 0,
  variant = 'green',
  size = 'sm',
  animated = false,
  style,
  ...props
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const h = heightMap[size] || heightMap.sm;
  const fillColor = fillColors[variant] || fillColors.green;
  const showPulse = animated && clamped < 100 && variant === 'green';

  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{
        width: '100%',
        height: h,
        borderRadius: 'var(--radius-full)',
        background: 'var(--color-surface)',
        overflow: 'hidden',
        ...style,
      }}
      {...props}
    >
      <div
        style={{
          width: `${clamped}%`,
          height: '100%',
          borderRadius: 'var(--radius-full)',
          background: fillColor,
          transition: 'width 600ms ease',
          position: 'relative',
          ...(showPulse ? { animation: 'hs-progress-pulse 1.5s ease-in-out infinite' } : {}),
        }}
      />
      {showPulse && (
        <style>{`
          @keyframes hs-progress-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
        `}</style>
      )}
    </div>
  );
}
