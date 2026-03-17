import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Loader2 } from 'lucide-react';
import apiClient from '@/services/api/client';

const V2 = {
  black: '#0A0A0A',
  green: '#0c0a09',
  greenLight: '#f5f5f4',
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
  // Legacy statuses (backwards compat)
  draft: { bg: V2.amberLight, color: V2.amber, label: 'Borrador' },
  sent: { bg: V2.blueLight, color: V2.blue, label: 'Enviada' },
  accepted: { bg: V2.greenLight, color: V2.green, label: 'Aceptada' },
  rejected: { bg: V2.redLight, color: V2.red, label: 'Rechazada' },
  // New operation statuses
  offer_sent: { bg: V2.blueLight, color: V2.blue, label: 'Enviada' },
  offer_accepted: { bg: V2.greenLight, color: V2.green, label: 'Aceptada' },
  offer_rejected: { bg: V2.redLight, color: V2.red, label: 'Rechazada' },
  contract_pending: { bg: V2.blueLight, color: V2.blue, label: 'Contrato pendiente' },
  contract_signed: { bg: V2.greenLight, color: V2.green, label: 'Contrato firmado' },
  payment_pending: { bg: V2.amberLight, color: V2.amber, label: 'Pago pendiente' },
  payment_confirmed: { bg: V2.greenLight, color: V2.green, label: 'Pago confirmado' },
  in_transit: { bg: V2.blueLight, color: V2.blue, label: 'En tránsito' },
  delivered: { bg: V2.greenLight, color: V2.green, label: 'Entregado' },
  completed: { bg: V2.greenLight, color: V2.green, label: 'Completado' },
};

function formatPrice(value) {
  if (value == null) return '—';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

function InfoRow({ label, value, highlighted }) {
  return (
    <div
      style={{
        marginBottom: 8,
        padding: highlighted ? '4px 6px' : undefined,
        backgroundColor: highlighted ? V2.amberLight : undefined,
        borderRadius: highlighted ? 6 : undefined,
      }}
    >
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
  const navigate = useNavigate();
  const [actionLoading, setActionLoading] = useState(false);

  if (!offer) return null;

  const statusCfg = STATUS_CONFIG[offer.status] || STATUS_CONFIG.draft;

  // Backwards compat: support both sender_id (legacy) and created_by (new)
  const senderId = offer.created_by || offer.sender_id;
  const isReceiver = senderId !== currentUserId;
  const isSender = senderId === currentUserId;

  // Backwards compat: match both legacy and new status values
  const isSentStatus = offer.status === 'sent' || offer.status === 'offer_sent';
  const isAcceptedStatus = offer.status === 'accepted' || offer.status === 'offer_accepted';

  const showReceiverActions = isReceiver && isSentStatus;
  const showSenderActions = isSender && isSentStatus;
  const showAcceptedActions = isAcceptedStatus;
  const hasFooter = showReceiverActions || showSenderActions || showAcceptedActions;

  const modifiedFields = offer.modified_fields || [];
  const isModified = (field) => modifiedFields.includes(field);

  // Build quantity string with unit
  const unit = offer.unit || 'unidades';
  const quantityStr = `${offer.quantity} ${unit}`;

  // Build price per unit string
  const pricePerUnitStr = offer.price_per_unit != null
    ? `${formatPrice(offer.price_per_unit)} / ${unit}`
    : null;

  // Delivery days
  const deliveryStr = offer.delivery_days != null
    ? `${offer.delivery_days} días`
    : null;

  const handleAccept = async () => {
    setActionLoading(true);
    try {
      if (offer.operation_id && offer.version) {
        await apiClient.put(
          `/b2b/operations/${offer.operation_id}/offers/${offer.version}/accept`
        );
      }
      onAccept?.(offer.operation_id, offer.version, offer);
    } catch (err) {
      console.error('Error accepting offer:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCounterOffer = () => {
    const prefillData = {
      product_name: offer.product_name,
      product_id: offer.product_id,
      quantity: offer.quantity,
      unit: offer.unit,
      price_per_unit: offer.price_per_unit,
      total_price: offer.total_price,
      incoterm: offer.incoterm,
      incoterm_city: offer.incoterm_city,
      payment_terms: offer.payment_terms,
      delivery_days: offer.delivery_days,
    };

    if (offer.operation_id && offer.conversation_id) {
      navigate(
        `/b2b/offer/new?operationId=${offer.operation_id}&conversationId=${offer.conversation_id}&prefill=${encodeURIComponent(JSON.stringify(prefillData))}`
      );
    }

    onCounterOffer?.(offer);
  };

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
        <InfoRow
          label="Producto"
          value={offer.product_name}
          highlighted={isModified('product_name')}
        />
        <InfoRow
          label="Cantidad"
          value={quantityStr}
          highlighted={isModified('quantity')}
        />
        {pricePerUnitStr && (
          <InfoRow
            label="Precio unitario"
            value={pricePerUnitStr}
            highlighted={isModified('price_per_unit')}
          />
        )}
        <InfoRow
          label="Precio total"
          value={formatPrice(offer.total_price)}
          highlighted={isModified('total_price')}
        />
        <InfoRow
          label="Incoterm"
          value={`${offer.incoterm} ${offer.incoterm_city || ''}`}
          highlighted={isModified('incoterm')}
        />
        {offer.payment_terms && (
          <InfoRow
            label="Condiciones de pago"
            value={offer.payment_terms}
            highlighted={isModified('payment_terms')}
          />
        )}
        {deliveryStr && (
          <InfoRow
            label="Plazo de entrega"
            value={deliveryStr}
            highlighted={isModified('delivery_days')}
          />
        )}
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
                onClick={handleAccept}
                disabled={actionLoading}
                className="flex-1 flex items-center justify-center"
                style={{
                  height: 36,
                  backgroundColor: actionLoading ? V2.stone : V2.green,
                  color: V2.white,
                  border: 'none',
                  borderRadius: V2.radiusMd,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  fontFamily: V2.fontSans,
                  opacity: actionLoading ? 0.7 : 1,
                }}
              >
                {actionLoading ? (
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  '✓ Aceptar'
                )}
              </button>
              <button
                onClick={handleCounterOffer}
                disabled={actionLoading}
                className="flex-1 flex items-center justify-center"
                style={{
                  height: 36,
                  backgroundColor: V2.white,
                  color: V2.black,
                  border: `1px solid ${V2.border}`,
                  borderRadius: V2.radiusMd,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  fontFamily: V2.fontSans,
                  opacity: actionLoading ? 0.5 : 1,
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
