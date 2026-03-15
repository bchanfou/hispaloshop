import React from 'react';

const V2 = {
  black: '#0A0A0A',
  stone: '#8A8881',
  border: '#E5E2DA',
  surface: '#F0EDE8',
  white: '#fff',
  fontSans: 'Inter, system-ui, sans-serif',
  radiusXl: 20,
  radiusFull: 9999,
};

function formatMemberCount(count) {
  if (typeof count !== 'number') return count;
  if (count >= 1000) {
    const k = count / 1000;
    return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K miembros`;
  }
  return `${count} miembros`;
}

export default function SharedCommunityCard({ community, onJoin, onView, isMember }) {
  if (!community) return null;

  return (
    <div
      className="flex flex-col items-center"
      style={{
        width: 240,
        backgroundColor: V2.white,
        borderRadius: V2.radiusXl,
        border: `1px solid ${V2.border}`,
        padding: 16,
        fontFamily: V2.fontSans,
      }}
    >
      {/* Emoji circle */}
      <div
        className="flex items-center justify-center shrink-0"
        style={{
          width: 48,
          height: 48,
          borderRadius: V2.radiusFull,
          backgroundColor: V2.surface,
          fontSize: 22,
        }}
      >
        {community.emoji || '\uD83E\uDED2'}
      </div>

      {/* Name */}
      <p
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: V2.black,
          margin: '10px 0 0',
          textAlign: 'center',
        }}
      >
        {community.name}
      </p>

      {/* Member count */}
      <p style={{ fontSize: 12, color: V2.stone, margin: '4px 0 0' }}>
        {formatMemberCount(community.member_count ?? community.members)}
      </p>

      {/* Action button */}
      {isMember ? (
        <button
          type="button"
          onClick={() => onView?.(community.id)}
          className="w-full"
          style={{
            height: 36,
            borderRadius: V2.radiusFull,
            backgroundColor: V2.surface,
            color: V2.black,
            fontSize: 13,
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            marginTop: 12,
          }}
        >
          Ver comunidad
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onJoin?.(community.id)}
          className="w-full"
          style={{
            height: 36,
            borderRadius: V2.radiusFull,
            backgroundColor: V2.black,
            color: V2.white,
            fontSize: 13,
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            marginTop: 12,
          }}
        >
          Unirse
        </button>
      )}
    </div>
  );
}
