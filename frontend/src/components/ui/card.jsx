import React from 'react';

const variantStyles = {
  default: {
    background: 'var(--color-white)',
    border: '0.5px solid var(--color-border)',
    boxShadow: 'none',
  },
  elevated: {
    background: 'var(--color-white)',
    border: '0.5px solid var(--color-border)',
    boxShadow: 'var(--shadow-sm)',
  },
  outlined: {
    background: 'transparent',
    border: '1px solid var(--color-black)',
    boxShadow: 'none',
  },
};

export default function Card({
  children,
  variant = 'default',
  padding,
  onClick,
  style,
  className,
  ...props
}) {
  const [hovered, setHovered] = React.useState(false);
  const vs = variantStyles[variant] || variantStyles.default;
  const isClickable = !!onClick;

  return (
    <div
      onClick={onClick}
      className={className}
      onMouseEnter={() => isClickable && setHovered(true)}
      onMouseLeave={() => isClickable && setHovered(false)}
      style={{
        borderRadius: 'var(--radius-lg)',
        padding: padding || 'var(--space-4)',
        cursor: isClickable ? 'pointer' : undefined,
        transition: 'var(--transition-fast)',
        ...vs,
        ...(hovered && isClickable ? { boxShadow: 'var(--shadow-md)' } : {}),
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
