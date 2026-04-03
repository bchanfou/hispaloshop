import React from 'react';

/**
 * Logo — centralised logo component for Hispaloshop.
 *
 * @param {object} props
 * @param {'icon'|'full'} [props.variant] icon = Atlas only, full = Atlas + wordmark
 * @param {'light'|'dark'} [props.theme] light = black logo (for light bg), dark = white logo (for dark bg)
 * @param {number} [props.size] px width (defaults: 32 icon, 120 full)
 * @param {function} [props.onClick] optional click handler
 */
export default function Logo({ variant = 'full', theme = 'light', size, onClick }) {
  const src = variant === 'icon'
    ? '/brand/logo-icon.png'
    : '/brand/logo-full.png';

  const defaultSize = variant === 'icon' ? 32 : 120;

  const filter = theme === 'dark'
    ? 'brightness(0) invert(1)'
    : 'brightness(0)';

  const handleError = (e) => {
    e.target.style.display = 'none';
    const fallback = document.createElement('span');
    fallback.textContent = 'hispaloshop';
    Object.assign(fallback.style, {
      fontFamily: 'Inter, sans-serif',
      fontWeight: '600',
      fontSize: '17px',
      letterSpacing: '-0.02em',
      color: theme === 'dark' ? '#FFF' : '#0A0A0A',
    });
    e.target.parentElement.appendChild(fallback);
  };

  return (
    <img
      src={src}
      alt="Hispaloshop"
      width={size || defaultSize}
      style={{
        filter,
        display: 'block',
        cursor: onClick ? 'pointer' : 'default',
        objectFit: 'contain',
      }}
      onClick={onClick}
      onError={handleError}
    />
  );
}
