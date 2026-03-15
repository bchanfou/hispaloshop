import React from 'react';

const V2 = {
  black: '#0A0A0A',
  stone: '#8A8881',
  fontSans: 'Inter, sans-serif',
};

const COLLAB = {
  bg: '#F5F0F8',
  text: '#8060B0',
  border: '#D0C0E8',
};

export default function CollabContextBanner({ collab, onViewDetails }) {
  if (!collab) return null;

  return (
    <div
      className="w-full flex items-center justify-between"
      style={{
        padding: '10px 16px',
        background: COLLAB.bg,
        borderBottom: `1px solid ${COLLAB.border}`,
        fontFamily: V2.fontSans,
      }}
    >
      <div className="flex flex-col gap-0.5">
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: COLLAB.text,
          }}
        >
          Colaboración activa · {collab.product_name}
        </span>
        {collab.commission != null && (
          <span
            style={{
              fontSize: 12,
              color: V2.stone,
            }}
          >
            {collab.commission}% comisión · {collab.duration_days} días
          </span>
        )}
      </div>

      <button
        onClick={onViewDetails}
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: COLLAB.text,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          fontFamily: V2.fontSans,
          whiteSpace: 'nowrap',
        }}
      >
        Ver detalles →
      </button>
    </div>
  );
}
