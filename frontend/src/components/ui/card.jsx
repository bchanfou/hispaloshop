import React from 'react';

const variantStyles = {
  default: {
    background: 'var(--color-white)',
    border: '1px solid var(--color-border)',
    boxShadow: 'var(--shadow-xs)',
  },
  surface: {
    background: 'var(--color-surface)',
    border: 'none',
  },
  dark: {
    background: 'var(--color-dark-card)',
    border: '1px solid var(--color-dark-border)',
  },
  green: {
    background: 'var(--color-green-light)',
    border: '1px solid var(--color-green-border)',
  },
  amber: {
    background: 'var(--color-amber-light)',
    border: '1px solid var(--color-amber-border)',
  },
  red: {
    background: 'var(--color-red-light)',
    border: '1px solid var(--color-red-border)',
  },
};

const paddingMap = {
  none: 0,
  sm: 'var(--space-3)',
  md: 'var(--space-4)',
  lg: 'var(--space-6)',
  xl: 'var(--space-8)',
};

export default function Card({
  children,
  variant = 'default',
  padding = 'md',
  hoverable = false,
  pressable = false,
  onClick,
  style,
  className,
  ...props
}) {
  const [hovered, setHovered] = React.useState(false);
  const [pressed, setPressed] = React.useState(false);

  const v = variantStyles[variant] || variantStyles.default;
  const isClickable = !!onClick || hoverable || pressable;

  const cardStyle = {
    borderRadius: 'var(--radius-lg)',
    padding: paddingMap[padding] ?? paddingMap.md,
    transition: hoverable ? 'var(--transition-base)' : undefined,
    cursor: isClickable ? 'pointer' : undefined,
    ...v,
    ...(hoverable && hovered ? {
      transform: 'translateY(-2px)',
      boxShadow: 'var(--shadow-md)',
    } : {}),
    ...(pressable && pressed ? {
      transform: 'scale(0.98)',
      opacity: 0.9,
    } : {}),
    ...style,
  };

  return (
    <div
      onClick={onClick}
      className={className}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => pressable && setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={cardStyle}
      {...props}
    >
      {children}
    </div>
  );
}
