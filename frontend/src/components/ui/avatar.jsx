import React from 'react';

const sizeMap = { xs: 24, sm: 32, md: 40, lg: 48, xl: 64, '2xl': 80 };

const BG_PALETTE = [
  '#C4904A', '#569040', '#5080B0', '#A06020',
  '#C05040', '#806090', '#40A090', '#A04060',
];

function hashName(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

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
  variant = 'circle',
  online,
  ring = false,
  style,
  className,
  ...props
}) {
  const px = sizeMap[size] || sizeMap.md;
  const radius = variant === 'circle' ? '50%'
    : variant === 'rounded' ? 'var(--radius-md)'
    : 'var(--radius-sm)';
  const fontSize = Math.max(10, px * 0.35);
  const bgColor = BG_PALETTE[hashName(name) % BG_PALETTE.length];

  const wrapperStyle = {
    position: 'relative',
    display: 'inline-flex',
    flexShrink: 0,
    ...(ring ? {
      padding: 2,
      borderRadius: '50%',
      border: '2px solid var(--color-green)',
    } : {}),
    ...style,
  };

  const innerStyle = {
    width: px,
    height: px,
    borderRadius: radius,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  };

  const showDot = online !== undefined && px >= 40;
  const dotSize = 8;

  return (
    <span style={wrapperStyle} className={className} {...props}>
      <span style={innerStyle}>
        {src ? (
          <img
            src={src}
            alt={name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <span
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: bgColor,
              color: 'var(--color-white)',
              fontSize,
              fontWeight: 600,
              fontFamily: 'var(--font-sans)',
            }}
          >
            {getInitials(name)}
          </span>
        )}
      </span>
      {showDot && (
        <span
          style={{
            position: 'absolute',
            bottom: ring ? 2 : 0,
            right: ring ? 2 : 0,
            width: dotSize,
            height: dotSize,
            borderRadius: '50%',
            background: online ? 'var(--color-green)' : 'var(--color-stone)',
            border: '2px solid var(--color-cream)',
          }}
        />
      )}
    </span>
  );
}
