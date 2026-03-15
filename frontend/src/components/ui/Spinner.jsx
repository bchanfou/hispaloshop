import React from 'react';

const sizeMap = { sm: 16, md: 24, lg: 32, xl: 48 };

const colorMap = {
  black: 'var(--color-black)',
  white: 'var(--color-white)',
  green: 'var(--color-green)',
  stone: 'var(--color-stone)',
};

export default function Spinner({ size = 'md', color = 'black', style, ...props }) {
  const px = sizeMap[size] || sizeMap.md;
  const strokeColor = colorMap[color] || colorMap.black;
  const strokeWidth = px <= 16 ? 3 : 2.5;
  const r = 10;
  const circumference = 2 * Math.PI * r;

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label="Loading"
      style={{
        animation: 'hs-spin 800ms linear infinite',
        display: 'inline-block',
        flexShrink: 0,
        ...style,
      }}
      {...props}
    >
      {/* Track */}
      <circle
        cx="12"
        cy="12"
        r={r}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeOpacity={0.2}
      />
      {/* Fill */}
      <circle
        cx="12"
        cy="12"
        r={r}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={`${circumference * 0.7} ${circumference * 0.3}`}
        strokeLinecap="round"
        transform="rotate(-90 12 12)"
      />
      <style>{`@keyframes hs-spin { to { transform: rotate(360deg) } }`}</style>
    </svg>
  );
}
