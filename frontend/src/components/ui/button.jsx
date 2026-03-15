import React from 'react';

// Legacy compat — shadcn ui files (pagination, calendar, alert-dialog) reference this
export const buttonVariants = () => '';

const variantStyles = {
  primary: {
    background: 'var(--color-black)',
    color: 'var(--color-white)',
    border: 'none',
  },
  secondary: {
    background: 'var(--color-white)',
    color: 'var(--color-black)',
    border: '0.5px solid var(--color-border)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--color-black)',
    border: 'none',
  },
  danger: {
    background: 'var(--color-red-light)',
    color: 'var(--color-red)',
    border: '1px solid var(--color-red-border)',
  },
  pay: {
    background: 'var(--color-green)',
    color: 'var(--color-white)',
    border: 'none',
  },
};

const sizeStyles = {
  sm: { padding: '6px 14px', fontSize: '13px', minHeight: '32px' },
  md: { padding: '10px 20px', fontSize: '14px', minHeight: '40px' },
  lg: { padding: '13px 28px', fontSize: '15px', minHeight: '48px' },
};

const hoverBg = {
  secondary: 'var(--color-cream)',
  ghost: 'var(--color-cream)',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon: Icon,
  type = 'button',
  style,
  className,
  ...props
}) {
  const [hovered, setHovered] = React.useState(false);
  const vs = variantStyles[variant] || variantStyles.primary;
  const ss = sizeStyles[size] || sizeStyles.md;
  const isDisabled = disabled || loading;

  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    borderRadius: 'var(--radius-md)',
    fontFamily: 'var(--font-sans)',
    fontWeight: 500,
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    transition: 'var(--transition-fast)',
    whiteSpace: 'nowrap',
    textDecoration: 'none',
    width: fullWidth ? '100%' : undefined,
    opacity: isDisabled ? 0.4 : (hovered && !hoverBg[variant] ? 0.85 : 1),
    ...vs,
    ...ss,
    background: hovered && hoverBg[variant] ? hoverBg[variant] : vs.background,
    ...style,
  };

  return (
    <button
      type={type}
      disabled={isDisabled}
      style={baseStyle}
      className={className}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      {...props}
    >
      {loading ? (
        <span
          style={{
            width: ss.fontSize,
            height: ss.fontSize,
            borderRadius: '50%',
            border: `2px solid ${variant === 'primary' || variant === 'pay' ? 'rgba(255,255,255,0.3)' : 'var(--color-border)'}`,
            borderTopColor: variant === 'primary' || variant === 'pay' ? '#fff' : 'var(--color-black)',
            animation: 'hs-spin 0.7s linear infinite',
          }}
        />
      ) : (
        <>
          {Icon && <Icon size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />}
          {children}
        </>
      )}
    </button>
  );
}
