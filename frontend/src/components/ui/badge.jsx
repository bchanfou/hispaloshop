import React from 'react';

const variants = {
  green: {
    background: 'var(--color-green-light)',
    color: 'var(--color-green)',
    borderColor: 'var(--color-green-border)',
    dotColor: 'var(--color-green)',
  },
  amber: {
    background: 'var(--color-amber-light)',
    color: 'var(--color-amber-dark)',
    borderColor: 'var(--color-amber-border)',
    dotColor: 'var(--color-amber)',
  },
  red: {
    background: 'var(--color-red-light)',
    color: 'var(--color-red)',
    borderColor: 'var(--color-red-border)',
    dotColor: 'var(--color-red)',
  },
  blue: {
    background: 'var(--color-blue-light)',
    color: 'var(--color-blue)',
    borderColor: 'var(--color-blue-border)',
    dotColor: 'var(--color-blue)',
  },
  black: {
    background: 'var(--color-black)',
    color: 'var(--color-white)',
    borderColor: 'var(--color-black)',
    dotColor: 'var(--color-white)',
  },
  gray: {
    background: 'var(--color-surface)',
    color: 'var(--color-stone)',
    borderColor: 'var(--color-border)',
    dotColor: 'var(--color-stone)',
  },
  white: {
    background: 'var(--color-white)',
    color: 'var(--color-black)',
    borderColor: 'var(--color-border)',
    dotColor: 'var(--color-black)',
  },
};

export default function Badge({
  children,
  variant = 'gray',
  dot = false,
  style,
  className,
  ...props
}) {
  const v = variants[variant] || variants.gray;

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        fontSize: 'var(--text-xs)',
        fontWeight: 500,
        fontFamily: 'var(--font-sans)',
        borderRadius: 'var(--radius-full)',
        border: `1px solid ${v.borderColor}`,
        whiteSpace: 'nowrap',
        background: v.background,
        color: v.color,
        ...style,
      }}
      {...props}
    >
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: v.dotColor,
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </span>
  );
}
