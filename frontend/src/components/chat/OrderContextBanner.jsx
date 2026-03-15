import React from 'react';
import { Package, ChevronRight } from 'lucide-react';

const V2 = {
  black: '#0A0A0A',
  green: '#2E7D52',
  greenLight: '#E8F5EE',
  stone: '#8A8881',
  border: '#E5E2DA',
  surface: '#F0EDE8',
  fontSans: 'Inter, sans-serif',
};

const STATUS_STYLES = {
  enviado: { bg: V2.greenLight, color: V2.green, label: 'Enviado' },
  procesando: { bg: V2.surface, color: V2.stone, label: 'Procesando' },
  entregado: { bg: V2.surface, color: V2.black, label: 'Entregado' },
};

function getStatusStyle(status) {
  if (!status) return STATUS_STYLES.procesando;
  const key = status.toLowerCase();
  return STATUS_STYLES[key] || STATUS_STYLES.procesando;
}

export default function OrderContextBanner({ order, onClick }) {
  if (!order) return null;

  const orderId = order.id ? String(order.id).slice(-8) : '—';
  const statusStyle = getStatusStyle(order.status);

  return (
    <button
      onClick={() => onClick?.(order)}
      className="w-full flex items-center gap-3"
      style={{
        padding: '10px 16px',
        backgroundColor: V2.surface,
        borderBottom: `1px solid ${V2.border}`,
        border: 'none',
        borderBlockEnd: `1px solid ${V2.border}`,
        cursor: 'pointer',
        fontFamily: V2.fontSans,
      }}
    >
      {/* Left icon */}
      <Package size={18} style={{ color: V2.stone, flexShrink: 0 }} />

      {/* Center content */}
      <div className="flex-1" style={{ minWidth: 0, textAlign: 'left' }}>
        <p
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: V2.black,
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          Pedido #{orderId}
        </p>

        <span
          style={{
            display: 'inline-block',
            marginTop: 3,
            fontSize: 11,
            fontWeight: 500,
            color: statusStyle.color,
            backgroundColor: statusStyle.bg,
            padding: '2px 8px',
            borderRadius: 999,
            lineHeight: 1.4,
          }}
        >
          {statusStyle.label}
        </span>
      </div>

      {/* Right chevron */}
      <ChevronRight size={18} style={{ color: V2.stone, flexShrink: 0 }} />
    </button>
  );
}
