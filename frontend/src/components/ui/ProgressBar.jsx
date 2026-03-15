import React from 'react';

const colorMap = {
  green: 'var(--color-green)',
  amber: 'var(--color-amber)',
  red:   'var(--color-red)',
};

export default function ProgressBar({
  value = 0,
  variant = 'green',
  size = 'sm',
  showLabel = false,
  style,
  ...props
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const height = size === 'sm' ? 3 : 6;
  const fillColor = colorMap[variant] || colorMap.green;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', ...style }} {...props}>
      <div
        style={{
          flex: 1,
          height,
          borderRadius: height,
          background: 'var(--color-surface)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${clamped}%`,
            height: '100%',
            borderRadius: height,
            background: fillColor,
            transition: 'width 300ms ease',
          }}
        />
      </div>
      {showLabel && (
        <span
          style={{
            fontSize: '11px',
            fontWeight: 500,
            color: 'var(--color-stone)',
            fontFamily: 'var(--font-sans)',
            minWidth: '32px',
            textAlign: 'right',
          }}
        >
          {Math.round(clamped)}%
        </span>
      )}
    </div>
  );
}
