import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Loader2 } from 'lucide-react';
import apiClient from '../../../services/api/client';
import { useTranslation } from 'react-i18next';
const STATUS_CONFIG = {
  draft: {
    bg: 'bg-stone-50',
    text: 'text-stone-500',
    label: 'Borrador'
  },
  sent: {
    bg: 'bg-stone-100',
    text: 'text-stone-700',
    label: 'Enviada'
  },
  accepted: {
    bg: 'bg-stone-100',
    text: 'text-stone-950',
    label: 'Aceptada'
  },
  rejected: {
    bg: 'bg-stone-100',
    text: 'text-stone-950',
    label: 'Rechazada'
  },
  offer_sent: {
    bg: 'bg-stone-100',
    text: 'text-stone-700',
    label: 'Enviada'
  },
  offer_accepted: {
    bg: 'bg-stone-100',
    text: 'text-stone-950',
    label: 'Aceptada'
  },
  offer_rejected: {
    bg: 'bg-stone-100',
    text: 'text-stone-950',
    label: 'Rechazada'
  },
  contract_pending: {
    bg: 'bg-stone-100',
    text: 'text-stone-700',
    label: 'Contrato pendiente'
  },
  contract_signed: {
    bg: 'bg-stone-100',
    text: 'text-stone-950',
    label: 'Contrato firmado'
  },
  payment_pending: {
    bg: 'bg-stone-50',
    text: 'text-stone-500',
    label: 'Pago pendiente'
  },
  payment_confirmed: {
    bg: 'bg-stone-100',
    text: 'text-stone-950',
    label: 'Pago confirmado'
  },
  in_transit: {
    bg: 'bg-stone-100',
    text: 'text-stone-700',
    label: "En tránsito"
  },
  delivered: {
    bg: 'bg-stone-100',
    text: 'text-stone-950',
    label: 'Entregado'
  },
  completed: {
    bg: 'bg-stone-100',
    text: 'text-stone-950',
    label: 'Completado'
  }
};
function formatPrice(value) {
  if (value == null) return '—';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  }).format(value);
}
function InfoRow({
  label,
  value,
  highlighted
}) {
  return <div className={`mb-2 ${highlighted ? 'px-1.5 py-1 bg-stone-50 rounded-md' : ''}`}>
      <div className="text-[11px] text-stone-500 leading-[14px]">
        {label}
      </div>
      <div className="text-[13px] font-medium text-stone-950 leading-[18px] mt-px">
        {value}
      </div>
    </div>;
}
export default function B2BOfferCard({
  offer,
  currentUserId,
  onAccept,
  onCounterOffer,
  onCancel,
  onViewContract
}) {
  const navigate = useNavigate();
  const [actionLoading, setActionLoading] = useState(false);
  if (!offer) return null;
  const statusCfg = STATUS_CONFIG[offer.status] || STATUS_CONFIG.draft;
  const senderId = offer.created_by || offer.sender_id;
  const isReceiver = senderId !== currentUserId;
  const isSender = senderId === currentUserId;
  const isSentStatus = offer.status === 'sent' || offer.status === 'offer_sent';
  const isAcceptedStatus = offer.status === 'accepted' || offer.status === 'offer_accepted';
  const showReceiverActions = isReceiver && isSentStatus;
  const showSenderActions = isSender && isSentStatus;
  const showAcceptedActions = isAcceptedStatus;
  const hasFooter = showReceiverActions || showSenderActions || showAcceptedActions;
  const modifiedFields = offer.modified_fields || [];
  const isModified = field => modifiedFields.includes(field);
  const unit = offer.unit || 'unidades';
  const quantityStr = `${offer.quantity} ${unit}`;
  const pricePerUnitStr = offer.price_per_unit != null ? `${formatPrice(offer.price_per_unit)} / ${unit}` : null;
  const deliveryStr = offer.delivery_days != null ? `${offer.delivery_days} días` : null;
  const handleAccept = async () => {
    setActionLoading(true);
    try {
      if (offer.operation_id && offer.version) {
        await apiClient.put(`/b2b/operations/${offer.operation_id}/offers/${offer.version}/accept`);
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
      delivery_days: offer.delivery_days
    };
    if (offer.operation_id && offer.conversation_id) {
      navigate(`/b2b/offer/new?operationId=${offer.operation_id}&conversationId=${offer.conversation_id}&prefill=${encodeURIComponent(JSON.stringify(prefillData))}`);
    }
    onCounterOffer?.(offer);
  };
  return <div className="max-w-[280px] rounded-2xl overflow-hidden border border-stone-200">
      {/* Header */}
      <div className="flex items-center gap-2 bg-stone-950 px-4 py-3 rounded-t-2xl">
        <FileText size={16} className="text-white shrink-0" />
        <span className="text-[13px] font-semibold text-white whitespace-nowrap">
          Oferta B2B · v{offer.version}
        </span>
        <span className={`text-[11px] font-medium ${statusCfg.text} ${statusCfg.bg} rounded-full px-2 py-0.5 whitespace-nowrap ml-1`}>
          {statusCfg.label}
        </span>
      </div>

      {/* Body */}
      <div className={`bg-white p-3.5 ${hasFooter ? '' : 'rounded-b-2xl'}`}>
        <InfoRow label="Producto" value={offer.product_name} highlighted={isModified('product_name')} />
        <InfoRow label="Cantidad" value={quantityStr} highlighted={isModified('quantity')} />
        {pricePerUnitStr && <InfoRow label="Precio unitario" value={pricePerUnitStr} highlighted={isModified('price_per_unit')} />}
        <InfoRow label="Precio total" value={formatPrice(offer.total_price)} highlighted={isModified('total_price')} />
        <InfoRow label="Incoterm" value={`${offer.incoterm} ${offer.incoterm_city || ''}`} highlighted={isModified('incoterm')} />
        {offer.payment_terms && <InfoRow label="Condiciones de pago" value={offer.payment_terms} highlighted={isModified('payment_terms')} />}
        {deliveryStr && <InfoRow label="Plazo de entrega" value={deliveryStr} highlighted={isModified('delivery_days')} />}
      </div>

      {/* Footer */}
      {hasFooter && <div className="flex gap-2 bg-white p-3 rounded-b-2xl border-t border-stone-200">
          {showReceiverActions && <>
              <button onClick={handleAccept} disabled={actionLoading} className={`flex-1 flex items-center justify-center h-9 rounded-full text-[13px] font-medium border-none text-white ${actionLoading ? 'bg-stone-500 cursor-not-allowed opacity-70' : 'bg-stone-950 cursor-pointer'}`}>
                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : '✓ Aceptar'}
              </button>
              <button onClick={handleCounterOffer} disabled={actionLoading} className={`flex-1 flex items-center justify-center h-9 rounded-full text-[13px] font-medium bg-white text-stone-950 border border-stone-200 ${actionLoading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                Contrapropuesta
              </button>
            </>}

          {showSenderActions && <button onClick={() => onCancel?.(offer)} className="flex items-center justify-center h-9 bg-transparent text-stone-950 underline underline-offset-2 border-none text-[13px] font-medium cursor-pointer p-0">
              Cancelar oferta
            </button>}

          {showAcceptedActions && <button onClick={() => onViewContract?.(offer)} className="w-full flex items-center justify-center h-9 bg-stone-950 text-white border-none rounded-full text-[13px] font-medium cursor-pointer">
              Ver contrato →
            </button>}
        </div>}
    </div>;
}