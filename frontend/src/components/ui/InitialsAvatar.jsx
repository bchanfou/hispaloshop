import React from 'react';

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0][0]?.toUpperCase() || '?';
};

const COLORS = [
  'bg-stone-200 text-stone-600',
  'bg-stone-300 text-stone-700',
  'bg-stone-100 text-stone-500',
];

const getColorIndex = (name) => {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % COLORS.length;
};

export const InitialsAvatar = ({ name, size = 40, className = '', style }) => {
  const initials = getInitials(name);
  const colorClass = COLORS[getColorIndex(name)];
  const fontSize = size < 32 ? 'text-xs' : size < 48 ? 'text-sm' : 'text-base';

  return (
    <div
      className={`rounded-full flex items-center justify-center font-semibold ${colorClass} ${fontSize} ${className}`}
      style={{ width: size, height: size, flexShrink: 0, ...style }}
    >
      {initials}
    </div>
  );
};

export default InitialsAvatar;
