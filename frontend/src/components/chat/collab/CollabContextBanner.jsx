import React from 'react';

const V2 = {
  black: '#0c0a09',
  stone: '#78716c',
  fontSans: 'Inter, sans-serif',
};

// Context banner alineado al palette stone B&W. Antes usaba púrpuras
// decorativos para marcar contexto "collab" — ahora diferencia por tipografía.
const COLLAB = {
  bg: '#f5f5f4',      // stone-100
  text: '#0c0a09',    // stone-950
  border: '#e7e5e4',  // stone-200
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
