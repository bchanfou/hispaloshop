import React from 'react';

const variantColors = {
  default: 'var(--color-border)',
  dark: 'var(--color-dark-border)',
  strong: 'var(--color-black)',
};

export default function Divider({
  variant = 'default',
  orientation = 'horizontal',
  label,
  style,
  ...props
}) {
  const color = variantColors[variant] || variantColors.default;
  const isVertical = orientation === 'vertical';

  if (label) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          ...style,
        }}
        {...props}
      >
        <span style={{ flex: 1, height: 1, background: color }} />
        <span
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--color-stone)',
            fontFamily: 'var(--font-sans)',
            fontWeight: 500,
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </span>
        <span style={{ flex: 1, height: 1, background: color }} />
      </div>
    );
  }

  return (
    <hr
      style={{
        width: isVertical ? 1 : '100%',
        height: isVertical ? '100%' : 1,
        background: color,
        border: 'none',
        margin: 0,
        flexShrink: 0,
        ...style,
      }}
      {...props}
    />
  );
}
