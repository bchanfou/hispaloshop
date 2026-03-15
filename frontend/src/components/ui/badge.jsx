import React from 'react';

const variantMap = {
  green:  { background: 'var(--color-green-light)',  color: 'var(--color-green)' },
  amber:  { background: 'var(--color-amber-light)',  color: 'var(--color-amber)' },
  red:    { background: 'var(--color-red-light)',    color: 'var(--color-red)' },
  blue:   { background: 'var(--color-blue-light)',   color: 'var(--color-blue)' },
  gray:   { background: 'var(--color-surface)',      color: 'var(--color-stone)' },
  black:  { background: 'var(--color-black)',        color: 'var(--color-white)' },
};

const sizeMap = {
  sm: { fontSize: '9px', padding: '2px 7px' },
  md: { fontSize: '10px', padding: '3px 10px' },
};

export default function Badge({
  children,
  variant = 'gray',
  size = 'md',
  style,
  className,
  ...props
}) {
  const vs = variantMap[variant] || variantMap.gray;
  const ss = sizeMap[size] || sizeMap.md;

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        borderRadius: 'var(--radius-full)',
        fontFamily: 'var(--font-sans)',
        fontWeight: 500,
        whiteSpace: 'nowrap',
        letterSpacing: '0.01em',
        lineHeight: 1.4,
        ...vs,
        ...ss,
        ...style,
      }}
      {...props}
    >
      {children}
    </span>
  );
}
