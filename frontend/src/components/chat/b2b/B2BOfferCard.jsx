import React from 'react';
import { FileText } from 'lucide-react';

const V2 = {
  black: '#0A0A0A',
  green: '#2E7D52',
  greenLight: '#E8F5EE',
  stone: '#8A8881',
  border: '#E5E2DA',
  surface: '#F0EDE8',
  white: '#fff',
  blue: '#3060A0',
  blueLight: '#EBF0F8',
  amber: '#B45309',
  amberLight: '#FEF3C7',
  red: '#DC2626',
  redLight: '#FEE2E2',
  fontSans: 'Inter, sans-serif',
  radiusMd: 12,
};

const STATUS_CONFIG = {
  draft: { bg: V2.amberLight, color: V2.amber, label: 'Borrador' },
  sent: { bg: V2.blueLight, color: V2.blue, label: 'Enviada' },
  accepted: { bg: V2.greenLight, color: V2.green, label: 'Aceptada' },
  rejected: { bg: V2.redLight, color: V2.red, label: 'Rechazada' },
};

function formatPrice(value) {
  if (value == null) return '—';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

function InfoRow({ label, value }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 11, color: V2.stone, lineHeight: '14px' }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: V2.black,
          lineHeight: '18px',
          marginTop: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default function B2BOfferCard({
  offer,
  currentUserId,
  onAccept,
  onCounterOffer,
  onCancel,
  onViewContract,
}) {
  if (!offer) return null;

  const statusCfg = STATUS_CONFIG[offer.status] || STATUS_CONFIG.draft;
  const isReceiver = offer.sender_id !== currentUserId;
  const isSender = offer.sender_id === currentUserId;

  const showReceiverActions = isReceiver && offer.status === 'sent';
  const showSenderActions = isSender && offer.status === 'sent';
  const showAcceptedActions = offer.status === 'accepted';
  const hasFooter = showReceiverActions || showSenderActions || showAcceptedActions;

  return (
    <div
      style={{
        maxWidth: 280,
        fontFamily: V2.fontSans,
        borderRadius: V2.radiusMd,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2"
        style={{
          backgroundColor: V2.black,
          padding: '12px 16px',
          borderRadius: `${V2.radiusMd}px ${V2.radiusMd}px 0 0`,
        }}
      >
        <FileText size={16} style={{ color: V2.white, flexShrink: 0 }} />
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: V2.white,
            whiteSpace: 'nowrap',
          }}
        >
          Oferta B2B · v{offer.version}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: statusCfg.color,
            backgroundColor: statusCfg.bg,
            borderRadius: 999,
            padding: '2px 8px',
            whiteSpace: 'nowrap',
            marginLeft: 4,
          }}
        >
          {statusCfg.label}
        </span>
      </div>

      {/* Body */}
      <div
        style={{
          backgroundColor: V2.white,
          padding: 14,
          borderLeft: `1px solid ${V2.border}`,
          borderRight: `1px solid ${V2.border}`,
          borderBottom: hasFooter ? 'none' : `1px solid ${V2.border}`,
          borderRadius: hasFooter
            ? 0
            : `0 0 ${V2.radiusMd}px ${V2.radiusMd}px`,
        }}
      >
        <InfoRow label="Producto" value={offer.product_name} />
        <InfoRow label="Cantidad" value={`${offer.quantity} unidades`} />
        <InfoRow label="Precio total" value={formatPrice(offer.total_price)} />
        <InfoRow
          label="Incoterm"
          value={`${offer.incoterm} ${offer.incoterm_city || ''}`}
        />
      </div>

      {/* Footer */}
      {hasFooter && (
        <div
          className="flex gap-2"
          style={{
            backgroundColor: V2.white,
            padding: 12,
            borderLeft: `1px solid ${V2.border}`,
            borderRight: `1px solid ${V2.border}`,
            borderBottom: `1px solid ${V2.border}`,
            borderRadius: `0 0 ${V2.radiusMd}px ${V2.radiusMd}px`,
          }}
        >
          {showReceiverActions && (
            <>
              <button
                onClick={() => onAccept?.(offer)}
                className="flex-1 flex items-center justify-center"
                style={{
                  height: 36,
                  backgroundColor: V2.green,
                  color: V2.white,
                  border: 'none',
                  borderRadius: V2.radiusMd,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: V2.fontSans,
                }}
              >
                ✓ Aceptar
              </button>
              <button
                onClick={() => onCounterOffer?.(offer)}
                className="flex-1 flex items-center justify-center"
                style={{
                  height: 36,
                  backgroundColor: V2.white,
                  color: V2.black,
                  border: `1px solid ${V2.border}`,
                  borderRadius: V2.radiusMd,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: V2.fontSans,
                }}
              >
                Contrapropuesta
              </button>
            </>
          )}

          {showSenderActions && (
            <button
              onClick={() => onCancel?.(offer)}
              className="flex items-center justify-center"
              style={{
                height: 36,
                backgroundColor: 'transparent',
                color: V2.red,
                border: 'none',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: V2.fontSans,
                padding: 0,
              }}
            >
              Cancelar oferta
            </button>
          )}

          {showAcceptedActions && (
            <button
              onClick={() => onViewContract?.(offer)}
              className="w-full flex items-center justify-center"
              style={{
                height: 36,
                backgroundColor: V2.black,
                color: V2.white,
                border: 'none',
                borderRadius: V2.radiusMd,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: V2.fontSans,
              }}
            >
              Ver contrato →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
