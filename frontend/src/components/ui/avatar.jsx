import React from 'react';

const sizeMap = { xs: 24, sm: 32, md: 44, lg: 64, xl: 80 };

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({
  src,
  name = '',
  size = 'md',
  shape = 'circle',
  online,
  storyActive,
  style,
  className,
  ...props
}) {
  const px = sizeMap[size] || sizeMap.md;
  const radius = shape === 'circle' ? '50%' : 'var(--radius-md)';
  const fontSize = Math.max(10, px * 0.38);

  const wrapperStyle = {
    position: 'relative',
    display: 'inline-flex',
    flexShrink: 0,
    width: storyActive ? px + 4 : px,
    height: storyActive ? px + 4 : px,
    ...(storyActive ? {
      padding: '2px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, var(--color-green), #4CAF50)',
    } : {}),
    ...style,
  };

  const imgStyle = {
    width: px,
    height: px,
    borderRadius: radius,
    objectFit: 'cover',
    display: 'block',
  };

  const fallbackStyle = {
    width: px,
    height: px,
    borderRadius: radius,
    background: 'var(--color-surface)',
    color: 'var(--color-stone)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize,
    fontWeight: 600,
    fontFamily: 'var(--font-sans)',
  };

  const dotSize = Math.max(8, px * 0.2);

  return (
    <span style={wrapperStyle} className={className} {...props}>
      {src ? (
        <img src={src} alt={name} style={imgStyle} />
      ) : (
        <span style={fallbackStyle}>{getInitials(name)}</span>
      )}
      {online !== undefined && (
        <span
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: dotSize,
            height: dotSize,
            borderRadius: '50%',
            background: online ? 'var(--color-green)' : 'var(--color-stone)',
            border: '2px solid var(--color-white)',
          }}
        />
      )}
    </span>
  );
}
