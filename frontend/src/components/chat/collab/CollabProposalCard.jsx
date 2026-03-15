import React from 'react';

const V2 = {
  black: '#0A0A0A',
  green: '#2E7D52',
  stone: '#8A8881',
  border: '#E5E2DA',
  surface: '#F0EDE8',
  white: '#fff',
  greenLight: '#E8F5EC',
  fontSans: 'Inter, sans-serif',
  radiusMd: 12,
};

function Badge({ label, bg, color }) {
  return (
    <span
      style={{
        display: 'inline-block',
        background: bg,
        color,
        fontSize: 10,
        fontWeight: 500,
        borderRadius: 9999,
        padding: '4px 10px',
        fontFamily: V2.fontSans,
      }}
    >
      {label}
    </span>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between" style={{ marginTop: 8 }}>
      <span style={{ fontSize: 11, color: V2.stone }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: V2.black }}>{value}</span>
    </div>
  );
}

export default function CollabProposalCard({
  proposal,
  isReceiver,
  onAccept,
  onDecline,
  onGenerateLink,
}) {
  const { product_name, product_image, commission_percent, duration_days, include_sample, status } =
    proposal;

  return (
    <div
      style={{
        maxWidth: 280,
        borderRadius: V2.radiusMd,
        overflow: 'hidden',
        fontFamily: V2.fontSans,
      }}
    >
      {/* Header */}
      <div
        style={{
          background: V2.black,
          padding: '12px 16px',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: V2.white }}>
          Propuesta de colaboración
        </span>
      </div>

      {/* Body */}
      <div
        style={{
          background: V2.white,
          padding: 14,
          borderLeft: `1px solid ${V2.border}`,
          borderRight: `1px solid ${V2.border}`,
        }}
      >
        {/* Product row */}
        <div className="flex items-center gap-3">
          {product_image && (
            <img
              src={product_image}
              alt={product_name}
              className="object-cover"
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                flexShrink: 0,
              }}
            />
          )}
          <span style={{ fontSize: 13, fontWeight: 500, color: V2.black }}>
            {product_name}
          </span>
        </div>

        <InfoRow label="Comisión especial" value={`${commission_percent}%`} />
        <InfoRow label="Duración" value={`${duration_days} días`} />
        <InfoRow label="Entrega de muestra" value={include_sample ? 'Sí' : 'No'} />
      </div>

      {/* Footer */}
      <div
        style={{
          padding: 12,
          borderLeft: `1px solid ${V2.border}`,
          borderRight: `1px solid ${V2.border}`,
          borderBottom: `1px solid ${V2.border}`,
          borderRadius: `0 0 ${V2.radiusMd}px ${V2.radiusMd}px`,
          background: V2.white,
        }}
      >
        {status === 'pending' && isReceiver && (
          <div className="flex items-center gap-2">
            <button
              onClick={onAccept}
              className="flex-1 flex items-center justify-center"
              style={{
                height: 36,
                background: V2.green,
                color: V2.white,
                border: 'none',
                borderRadius: V2.radiusMd,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: V2.fontSans,
              }}
            >
              ✓ Aceptar
            </button>
            <button
              onClick={onDecline}
              style={{
                height: 36,
                background: 'transparent',
                color: V2.stone,
                border: 'none',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: V2.fontSans,
                padding: '0 12px',
              }}
            >
              Declinar
            </button>
          </div>
        )}

        {status === 'accepted' && (
          <div>
            <Badge label="Aceptada" bg={V2.greenLight} color={V2.green} />
            <button
              onClick={onGenerateLink}
              className="w-full flex items-center justify-center"
              style={{
                height: 36,
                background: V2.green,
                color: V2.white,
                border: 'none',
                borderRadius: V2.radiusMd,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: V2.fontSans,
                marginTop: 8,
              }}
            >
              Generar link exclusivo
            </button>
          </div>
        )}

        {status === 'declined' && (
          <Badge label="Declinada" bg={V2.surface} color={V2.stone} />
        )}
      </div>
    </div>
  );
}
