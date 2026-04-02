import React from 'react';

const V2 = {
  black: '#0A0A0A',
  green: '#0c0a09',
  stone: '#8A8881',
  border: '#E5E2DA',
  surface: '#F0EDE8',
  white: '#fff',
  greenLight: '#f5f5f4',
  fontSans: 'Inter, sans-serif',
  radiusMd: 12,
};

const STATUS_MAP = {
  preparing: { label: 'Preparando', bg: V2.surface, color: V2.stone },
  shipped: { label: 'Enviado', bg: '#f5f5f4', color: '#44403c' },
  delivered: { label: 'Entregado', bg: '#f5f5f4', color: '#0c0a09' },
};

export default function SampleShipmentCard({ shipment }) {
  const { product_name, product_image, tracking_number, status } = shipment;
  const badge = STATUS_MAP[status] || STATUS_MAP.preparing;

  return (
    <div
      style={{
        maxWidth: 260,
        background: V2.white,
        border: `1px solid ${V2.border}`,
        borderRadius: V2.radiusMd,
        overflow: 'hidden',
        fontFamily: V2.fontSans,
      }}
    >
      {/* Product image */}
      {product_image && (
        <img
          src={product_image}
          alt={product_name}
          className="w-full object-cover"
          style={{
            height: 100,
            display: 'block',
          }}
        />
      )}

      {/* Body */}
      <div style={{ padding: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: V2.black, display: 'block' }}>
          Muestra enviada
        </span>

        <span
          style={{
            fontSize: 12,
            color: V2.stone,
            display: 'block',
            marginTop: 2,
          }}
        >
          {product_name}
        </span>

        {tracking_number && (
          <span
            style={{
              fontSize: 11,
              color: V2.stone,
              fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
              display: 'block',
              marginTop: 6,
            }}
          >
            Seguimiento: {tracking_number}
          </span>
        )}

        {/* Status badge */}
        <div style={{ marginTop: 8 }}>
          <span
            style={{
              display: 'inline-block',
              background: badge.bg,
              color: badge.color,
              fontSize: 11,
              fontWeight: 500,
              borderRadius: 9999,
              padding: '4px 10px',
            }}
          >
            {badge.label}
          </span>
        </div>
      </div>
    </div>
  );
}
