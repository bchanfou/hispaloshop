import React from 'react';
import { Star } from 'lucide-react';

const V2 = {
  green: '#2E7D52',
  greenLight: 'rgba(46,125,82,0.08)',
  fontSans: 'Inter, system-ui, sans-serif',
  radiusFull: 9999,
};

export default function InfluencerBadge({ username }) {
  if (!username) return null;

  return (
    <span
      className="inline-flex items-center"
      style={{
        gap: 4,
        backgroundColor: V2.greenLight,
        borderRadius: V2.radiusFull,
        padding: '2px 8px',
        height: 20,
        fontFamily: V2.fontSans,
      }}
    >
      <Star
        size={12}
        style={{
          fill: V2.green,
          stroke: V2.green,
        }}
      />
      <span
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: V2.green,
          lineHeight: 1,
        }}
      >
        @{username}
      </span>
    </span>
  );
}
