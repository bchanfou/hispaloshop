import React from 'react';
import Spinner from './Spinner';

// Legacy compat — shadcn ui files (pagination, calendar, alert-dialog) reference this
export const buttonVariants = () => '';

const variants = {
  primary: {
    background: 'var(--color-black)',
    color: 'var(--color-white)',
    border: 'none',
    hoverStyle: { opacity: 0.85 },
    activeStyle: { opacity: 0.7, transform: 'scale(0.98)' },
    spinnerColor: 'white',
  },
  secondary: {
    background: 'var(--color-white)',
    color: 'var(--color-black)',
    border: '1.5px solid var(--color-border)',
    hoverStyle: { borderColor: 'var(--color-black)' },
    activeStyle: {},
    spinnerColor: 'black',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--color-black)',
    border: '1.5px solid var(--color-black)',
    hoverStyle: { background: 'var(--color-black)', color: 'var(--color-white)' },
    activeStyle: {},
    spinnerColor: 'black',
  },
  'ghost-white': {
    background: 'transparent',
    color: 'var(--color-white)',
    border: '1.5px solid rgba(255,255,255,0.4)',
    hoverStyle: {
      borderColor: 'rgba(255,255,255,0.8)',
      background: 'rgba(255,255,255,0.05)',
    },
    activeStyle: {},
    spinnerColor: 'white',
  },
  pay: {
    background: 'var(--color-green)',
    color: 'var(--color-white)',
    border: 'none',
    hoverStyle: { background: 'var(--color-green-dark)' },
    activeStyle: {},
    spinnerColor: 'white',
  },
  destructive: {
    background: 'var(--color-red-light)',
    color: 'var(--color-red)',
    border: '1.5px solid var(--color-red-border)',
    hoverStyle: { background: 'rgba(192,80,64,0.12)' },
    activeStyle: {},
    spinnerColor: 'black',
  },
};

const sizes = {
  sm: { height: 32, padding: '0 12px', fontSize: 'var(--text-sm)', borderRadius: 'var(--radius-sm)' },
  md: { height: 40, padding: '0 16px', fontSize: 'var(--text-base)', borderRadius: 'var(--radius-md)' },
  lg: { height: 46, padding: '0 24px', fontSize: 'var(--text-md)', borderRadius: 'var(--radius-md)' },
  xl: { height: 56, padding: '0 40px', fontSize: 'var(--text-lg)', borderRadius: 'var(--radius-md)' },
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  type = 'button',
  style,
  className,
  ...props
}) {
  const [hovered, setHovered] = React.useState(false);
  const [pressed, setPressed] = React.useState(false);

  const v = variants[variant] || variants.primary;
  const s = sizes[size] || sizes.md;
  const isDisabled = disabled || loading;

  const baseStyle = {
    display: fullWidth ? 'flex' : 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    fontFamily: 'var(--font-sans)',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    cursor: isDisabled ? (loading ? 'wait' : 'not-allowed') : 'pointer',
    transition: 'var(--transition-fast)',
    opacity: isDisabled ? 0.4 : 1,
    pointerEvents: isDisabled ? 'none' : undefined,
    width: fullWidth ? '100%' : undefined,
    background: v.background,
    color: v.color,
    border: v.border,
    height: s.height,
    padding: s.padding,
    fontSize: s.fontSize,
    borderRadius: s.borderRadius,
    ...(hovered && !isDisabled ? v.hoverStyle : {}),
    ...(pressed && !isDisabled ? v.activeStyle : {}),
    ...style,
  };

  const spinnerSize = size === 'sm' ? 'sm' : 'md';

  return (
    <button
      type={type}
      disabled={isDisabled}
      style={baseStyle}
      className={className}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      {...props}
    >
      {loading ? (
        <span style={{ display: 'flex', alignItems: 'center', visibility: 'visible' }}>
          <Spinner size={spinnerSize} color={v.spinnerColor} />
          <span style={{ visibility: 'hidden', height: 0, overflow: 'hidden' }}>{children}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}
