import React from 'react';
import { FileText, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const V2 = {
  black: '#0A0A0A',
  blue: '#3060A0',
  blueLight: '#EBF0F8',
  blueBorder: '#B0C8E8',
  stone: '#8A8881',
  fontSans: 'Inter, sans-serif',
};

export default function B2BContextBanner({ request, onViewRequest }) {
  if (!request) return null;

  return (
    <div
      className="w-full flex items-center"
      style={{
        padding: '10px 16px',
        backgroundColor: V2.blueLight,
        borderBottom: `1px solid ${V2.blueBorder}`,
        fontFamily: V2.fontSans,
      }}
    >
      <div className="flex-1" style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: V2.blue,
            lineHeight: '18px',
          }}
        >
          Solicitud B2B en negociación
        </div>
        <div
          style={{
            fontSize: 12,
            color: V2.stone,
            lineHeight: '16px',
            marginTop: 2,
          }}
        >
          {request.product_name} · {request.quantity} ud. · Precio solicitado:{' '}
          {request.unit_price}€/u
        </div>
      </div>

      <button
        onClick={() => onViewRequest?.()}
        className="flex items-center shrink-0"
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: V2.blue,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          marginLeft: 12,
          fontFamily: V2.fontSans,
        }}
      >
        Ver solicitud →
      </button>
    </div>
  );
}
