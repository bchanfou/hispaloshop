import React from 'react';

const SIZE_MAP = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl',
  xl: 'text-3xl',
};

function countryCodeToFlagEmoji(countryCode) {
  if (!countryCode || countryCode.length !== 2) return '??';

  const upper = countryCode.toUpperCase();
  const first = upper.codePointAt(0);
  const second = upper.codePointAt(1);

  if (first < 65 || first > 90 || second < 65 || second > 90) return '??';

  const base = 127397; // Regional indicator offset
  return String.fromCodePoint(first + base) + String.fromCodePoint(second + base);
}

/**
 * CountryFlag - lightweight emoji-based country flag renderer.
 * Avoids shipping the full flag-icons CSS/SVG set in the bundle.
 */
export default function CountryFlag({ countryCode, size = 'md', className = '' }) {
  if (!countryCode) return null;

  const emoji = countryCodeToFlagEmoji(countryCode);
  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;

  return (
    <span
      className={`inline-flex items-center justify-center leading-none ${sizeClass} ${className}`.trim()}
      role="img"
      aria-label={`Flag of ${countryCode.toUpperCase()}`}
      title={countryCode.toUpperCase()}
    >
      {emoji}
    </span>
  );
}
