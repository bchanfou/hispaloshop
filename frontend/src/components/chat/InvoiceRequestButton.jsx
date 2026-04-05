import React from 'react';
import { FileText } from 'lucide-react';

const V2 = {
  black: '#0c0a09',
  surface: '#f5f5f4',
  surfaceHover: '#e7e5e4',
  fontSans: 'Inter, sans-serif',
};

export default function InvoiceRequestButton({ onRequest }) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <button
      onClick={() => onRequest?.()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="inline-flex items-center gap-1.5"
      style={{
        height: 36,
        padding: '0 16px',
        backgroundColor: hovered ? V2.surfaceHover : V2.surface,
        color: V2.black,
        borderRadius: 999,
        border: 'none',
        fontSize: 13,
        fontWeight: 500,
        fontFamily: V2.fontSans,
        cursor: 'pointer',
        transition: 'background-color 150ms ease',
        whiteSpace: 'nowrap',
      }}
    >
      <FileText size={14} />
      Solicitar factura
    </button>
  );
}
