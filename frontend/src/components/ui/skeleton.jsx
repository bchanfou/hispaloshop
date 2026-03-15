import React from 'react';

export function Skeleton({
  width,
  height,
  shape = 'rect',
  style,
  className,
  ...props
}) {
  const borderRadius = shape === 'circle'
    ? '50%'
    : shape === 'text'
      ? '4px'
      : 'var(--radius-sm)';

  return (
    <div
      className={`skeleton ${className || ''}`}
      style={{
        width: width || '100%',
        height: shape === 'text' ? '1em' : (height || 48),
        borderRadius,
        ...style,
      }}
      {...props}
    />
  );
}

export default Skeleton;
