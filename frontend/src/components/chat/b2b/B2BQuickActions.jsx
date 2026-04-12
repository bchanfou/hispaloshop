import React from 'react';

const V2 = {
  black: '#0c0a09',
  surface: '#f5f5f4',
  fontSans: 'Inter, sans-serif',
};

export default function B2BQuickActions({ onCreateOffer, onAttachDoc, visible }) {
  if (!visible) return null;

  return (
    <div
      className="flex items-center"
      style={{
        gap: 8,
        padding: '8px 12px',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.04)',
      }}
    >
      <button
        onClick={onCreateOffer}
        style={{
          height: 32,
          borderRadius: 999,
          padding: '0 14px',
          backgroundColor: V2.surface,
          border: 'none',
          fontSize: 12,
          fontWeight: 500,
          color: V2.black,
          cursor: 'pointer',
          fontFamily: V2.fontSans,
          whiteSpace: 'nowrap',
        }}
      >
        📄 Crear oferta
      </button>
      <button
        onClick={onAttachDoc}
        style={{
          height: 32,
          borderRadius: 999,
          padding: '0 14px',
          backgroundColor: V2.surface,
          border: 'none',
          fontSize: 12,
          fontWeight: 500,
          color: V2.black,
          cursor: 'pointer',
          fontFamily: V2.fontSans,
          whiteSpace: 'nowrap',
        }}
      >
        Adjuntar doc.
      </button>
    </div>
  );
}
