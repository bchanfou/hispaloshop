import React from 'react';

const sizeMap = { sm: 16, md: 24, lg: 40 };

const colorMap = {
  dark:  { border: 'var(--color-border)', top: 'var(--color-black)' },
  light: { border: 'rgba(255,255,255,0.3)', top: '#FFFFFF' },
  green: { border: 'var(--color-green-border)', top: 'var(--color-green)' },
};

export default function Spinner({ size = 'md', variant = 'dark', style, ...props }) {
  const px = sizeMap[size] || sizeMap.md;
  const colors = colorMap[variant] || colorMap.dark;

  return (
    <span
      role="status"
      aria-label="Loading"
      style={{
        display: 'inline-block',
        width: px,
        height: px,
        borderRadius: '50%',
        border: `${Math.max(2, px * 0.1)}px solid ${colors.border}`,
        borderTopColor: colors.top,
        animation: 'hs-spin 0.7s linear infinite',
        ...style,
      }}
      {...props}
    />
  );
}
