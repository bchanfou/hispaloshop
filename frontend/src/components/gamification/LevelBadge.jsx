import React from 'react';

/**
 * LevelBadge — Circular level indicator with SVG progress ring.
 * Stone palette. Apple minimalist DNA.
 *
 * @param {number} level - Current level number (1-5)
 * @param {number} progress - Progress to next level (0-1)
 * @param {number} [size=48] - Diameter in pixels
 */
export default function LevelBadge({ level = 1, progress = 0, size = 48 }) {
  const strokeWidth = size * 0.08;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(Math.max(progress, 0), 1));
  const center = size / 2;

  // Font size scales with container
  const fontSize = size * 0.38;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0"
      >
        {/* Track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#e7e5e4"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#0c0a09"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${center} ${center})`}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      {/* Level number */}
      <span
        className="relative font-semibold text-stone-950 select-none"
        style={{ fontSize, lineHeight: 1 }}
      >
        {level}
      </span>
    </div>
  );
}
