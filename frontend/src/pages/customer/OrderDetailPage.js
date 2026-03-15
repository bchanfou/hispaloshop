import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';
import {
  ArrowLeft, XCircle, Truck, Check, Clock, Package,
  MapPin, ExternalLink, RotateCcw, Star, MessageSquare
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { asNumber } from '../../utils/safe';
import ReviewModal from '../../components/ReviewModal';
import { getStatusLabel, getStatusColor, getStatusIcon } from '../../components/OrderStatusBadge';

const statusIcons = {
  pending: Clock,
  confirmed: Check,
  preparing: Package,
  shipped: Truck,
  delivered: Check,
  cancelled: XCircle,
};

const STATUS_FLOW = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered'];

export default function OrderDetailPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewOpen, setReviewOpen] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      const data = await apiClient.get(`/customer/orders/${orderId}`);
      setOrder(data);
    } catch {
      toast.error('Error al cargar el pedido');
      navigate('/dashboard/orders');
    } finally {
      setLoading(false);
    }
  }, [orderId, navigate]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const cancelOrder = async () => {
    if (!window.confirm('¿Estás seguro de que quieres cancelar este pedido?')) return;
    try {
      await apiClient.put(`/customer/orders/${orderId}/cancel`, {});
      toast.success('Pedido cancelado');
      fetchOrder();
    } catch (error) {
      toast.error(error.message || 'No se puede cancelar este pedido');
    }
  };

  const reorder = async () => {
    try {
      await apiClient.post(`/customer/orders/${orderId}/reorder`, {});
      toast.success('Productos agregados al carrito');
    } catch {
      toast.error('Error al reordenar');
    }
  };

  if (loading) {
    return (
      <div
        className="flex justify-center items-center"
        style={{ background: 'var(--color-cream)', minHeight: '100vh' }}
      >
        <div
          className="w-8 h-8 rounded-full animate-spin"
          style={{
            border: '2px solid var(--color-border)',
            borderTopColor: 'var(--color-black)',
          }}
        />
      </div>
    );
  }

  if (!order) return null;

  const canCancel = ['pending', 'confirmed'].includes(order.status);
  const isDelivered = ['delivered', 'completed'].includes(order.status);
  const currentStep = STATUS_FLOW.indexOf(order.status);
  const StatusIcon = statusIcons[order.status] || Clock;

  // Build a map of status → timestamp from status_history
  const statusTimestamps = {};
  if (order.status_history) {
    order.status_history.forEach((entry) => {
      statusTimestamps[entry.status] = entry.timestamp;
    });
  }

  return (
    <div
      style={{
        background: 'var(--color-cream)',
        minHeight: '100vh',
        paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {/* TopBar header */}
      <div
        className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3"
        style={{
          background: 'var(--color-white)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <button
          onClick={() => navigate('/dashboard/orders')}
          className="flex items-center justify-center w-8 h-8"
          style={{ color: 'var(--color-black)' }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1
          className="text-base font-semibold"
          style={{ color: 'var(--color-black)', fontFamily: 'var(--font-sans)' }}
        >
          Seguimiento #HSP-{String(orderId).slice(-4)}
        </h1>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Header card */}
        <div
          className="p-5"
          style={{
            background: 'var(--color-white)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
          }}
        >
          <div className="flex items-start justify-between">
            <div>
              <h2
                className="text-lg font-bold"
                style={{ color: 'var(--color-black)', fontFamily: 'var(--font-sans)' }}
              >
                Pedido #{String(order.order_id).slice(-8)}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-stone)' }}>
                {new Date(order.created_at).toLocaleDateString('es-ES', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusIcon className="w-4 h-4" style={{ color: 'var(--color-stone)' }} />
              <span
                className="px-3 py-1 rounded-full text-xs font-medium"
                style={{
                  background: order.status === 'delivered' ? 'var(--color-green-light)'
                    : order.status === 'cancelled' ? 'var(--color-red-light)'
                    : order.status === 'shipped' ? 'var(--color-surface)'
                    : 'var(--color-surface)',
                  color: order.status === 'delivered' ? 'var(--color-green)'
                    : order.status === 'cancelled' ? 'var(--color-red)'
                    : 'var(--color-black)',
                }}
              >
                {getStatusLabel(order.status)}
              </span>
            </div>
          </div>
        </div>

        {/* ETA Card */}
        {order.status !== 'cancelled' && order.status !== 'refunded' && !isDelivered && (
          <div
            className="p-4 flex items-center gap-4"
            style={{
              background: 'var(--color-black)',
              borderRadius: 'var(--radius-xl)',
            }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,255,255,0.15)' }}
            >
              <Truck className="w-5 h-5" style={{ color: '#fff' }} />
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Entrega estimada
              </p>
              <p className="text-sm font-semibold" style={{ color: '#fff' }}>
                {order.estimated_delivery
                  ? new Date(order.estimated_delivery).toLocaleDateString('es-ES', {
                      day: 'numeric', month: 'long',
                    })
                  : '2-3 días laborables'}
              </p>
            </div>
          </div>
        )}

        {/* Vertical Timeline */}
        {order.status !== 'cancelled' && order.status !== 'refunded' && currentStep >= 0 && (
          <div
            className="p-5"
            style={{
              background: 'var(--color-white)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
            }}
          >
            <div className="relative">
              {STATUS_FLOW.map((status, index) => {
                const StepIcon = statusIcons[status];
                const isCompleted = index < currentStep;
                const isCurrent = index === currentStep;
                const isPending = index > currentStep;
                const isLast = index === STATUS_FLOW.length - 1;
                const ts = statusTimestamps[status];

                return (
                  <div key={status} className="flex gap-3" style={{ minHeight: isLast ? 'auto' : 56 }}>
                    {/* Dot + line column */}
                    <div className="flex flex-col items-center">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                        style={{
                          background: isCurrent
                            ? 'var(--color-green)'
                            : isCompleted
                            ? 'var(--color-black)'
                            : 'var(--color-border)',
                          boxShadow: isCurrent ? '0 0 0 4px var(--color-green-light)' : 'none',
                          transition: 'var(--transition-fast)',
                        }}
                      >
                        <StepIcon
                          className="w-4 h-4"
                          style={{ color: isPending ? 'var(--color-stone)' : '#fff' }}
                        />
                      </div>
                      {!isLast && (
                        <div
                          className="w-0.5 flex-1 my-1"
                          style={{
                            background: index < currentStep
                              ? 'var(--color-black)'
                              : 'var(--color-border)',
                          }}
                        />
                      )}
                    </div>
                    {/* Label column */}
                    <div className="pt-1 pb-2">
                      <p
                        className="text-sm font-medium"
                        style={{
                          color: isCurrent
                            ? 'var(--color-green)'
                            : isCompleted
                            ? 'var(--color-black)'
                            : 'var(--color-stone)',
                        }}
                      >
                        {getStatusLabel(status)}
                      </p>
                      {ts && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-stone)' }}>
                          {new Date(ts).toLocaleString('es-ES', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tracking */}
        {order.tracking_number && (
          <div
            className="p-4"
            style={{
              background: 'var(--color-white)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
            }}
          >
            <h3
              className="text-sm font-semibold mb-2 flex items-center gap-2"
              style={{ color: 'var(--color-black)' }}
            >
              <Truck className="w-4 h-4" /> Seguimiento
            </h3>
            <p
              className="text-sm"
              style={{ color: 'var(--color-black)', fontFamily: 'monospace' }}
            >
              {order.tracking_number}
            </p>
            {order.tracking_url && (
              <a
                href={order.tracking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-sm font-medium"
                style={{ color: 'var(--color-black)', textDecoration: 'none' }}
                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
              >
                Rastrear envío <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}

        {/* Products */}
        <div
          className="p-4"
          style={{
            background: 'var(--color-white)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
          }}
        >
          <h3
            className="text-sm font-semibold mb-3 flex items-center gap-2"
            style={{ color: 'var(--color-black)' }}
          >
            <Package className="w-4 h-4" /> Productos
          </h3>
          <div className="space-y-3">
            {order.line_items?.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3">
                {item.image ? (
                  <img
                    src={item.image}
                    alt=""
                    className="w-12 h-12 object-cover shrink-0"
                    style={{ borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}
                  />
                ) : (
                  <div
                    className="w-12 h-12 shrink-0"
                    style={{ borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--color-black)' }}>
                    {item.name || item.product_name}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-stone)' }}>x{item.quantity}</p>
                </div>
                <p className="text-sm font-semibold shrink-0" style={{ color: 'var(--color-black)' }}>
                  {asNumber(item.amount || item.price * item.quantity).toFixed(2)}€
                </p>
              </div>
            ))}
          </div>

          {/* Price breakdown */}
          <div className="mt-4 pt-3 space-y-1.5" style={{ borderTop: '1px solid var(--color-border)' }}>
            {order.subtotal != null && (
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--color-stone)' }}>Subtotal</span>
                <span style={{ color: 'var(--color-stone)' }}>{asNumber(order.subtotal).toFixed(2)}€</span>
              </div>
            )}
            {order.shipping_cost != null && order.shipping_cost > 0 && (
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--color-stone)' }}>Envío</span>
                <span style={{ color: 'var(--color-stone)' }}>{asNumber(order.shipping_cost).toFixed(2)}€</span>
              </div>
            )}
            {order.discount_amount != null && order.discount_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--color-stone)' }}>Descuento</span>
                <span style={{ color: 'var(--color-stone)' }}>-{asNumber(order.discount_amount).toFixed(2)}€</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold pt-1" style={{ color: 'var(--color-black)' }}>
              <span>Total</span>
              <span>{asNumber(order.total_amount).toFixed(2)}€</span>
            </div>
          </div>
        </div>

        {/* Shipping address */}
        {order.shipping_address && (
          <div
            className="p-4"
            style={{
              background: 'var(--color-white)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
            }}
          >
            <h3
              className="text-sm font-semibold mb-2 flex items-center gap-2"
              style={{ color: 'var(--color-black)' }}
            >
              <MapPin className="w-4 h-4" /> Dirección de envío
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-stone)' }}>
              {order.shipping_address.full_name || order.shipping_address.name}<br />
              {order.shipping_address.street}<br />
              {order.shipping_address.city}, {order.shipping_address.postal_code}<br />
              {order.shipping_address.country}
            </p>
            {order.shipping_address.phone && (
              <p className="text-xs mt-1" style={{ color: 'var(--color-stone)' }}>
                Tel: {order.shipping_address.phone}
              </p>
            )}
          </div>
        )}

        {/* Status history */}
        {order.status_history?.length > 0 && (
          <div
            className="p-4"
            style={{
              background: 'var(--color-white)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
            }}
          >
            <h3
              className="text-sm font-semibold mb-3"
              style={{ color: 'var(--color-black)' }}
            >
              Historial
            </h3>
            <div className="space-y-3">
              {order.status_history.slice().reverse().map((entry, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                    style={{ background: 'var(--color-border)' }}
                  />
                  <div>
                    <p
                      className="text-sm font-medium capitalize"
                      style={{ color: 'var(--color-black)' }}
                    >
                      {getStatusLabel(entry.status)}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-stone)' }}>
                      {new Date(entry.timestamp).toLocaleString('es-ES')}
                    </p>
                    {entry.notes && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-stone)' }}>
                        {entry.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pb-4">
          {canCancel && (
            <button
              onClick={cancelOrder}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium"
              style={{
                background: 'var(--color-white)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-xl)',
                color: 'var(--color-stone)',
                transition: 'var(--transition-fast)',
              }}
            >
              <XCircle className="w-4 h-4" />
              Cancelar pedido
            </button>
          )}
          {isDelivered && (
            <>
              <button
                onClick={reorder}
                className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium"
                style={{
                  background: 'var(--color-black)',
                  color: '#fff',
                  borderRadius: 'var(--radius-xl)',
                  border: 'none',
                  transition: 'var(--transition-fast)',
                }}
              >
                <RotateCcw className="w-4 h-4" />
                Repetir pedido
              </button>
              <button
                onClick={() => setReviewOpen(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium"
                style={{
                  background: 'var(--color-white)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-xl)',
                  color: 'var(--color-black)',
                  transition: 'var(--transition-fast)',
                }}
              >
                <Star className="w-4 h-4" />
                Valorar
              </button>
            </>
          )}
        </div>
      </div>

      <ReviewModal open={reviewOpen} onClose={() => setReviewOpen(false)} order={order} />
    </div>
  );
}
