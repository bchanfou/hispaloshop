import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Truck, Check, Clock, Package, ExternalLink, Star, MessageCircle, Loader2,
} from 'lucide-react';

const STATUS_FLOW = ['confirmed', 'preparing', 'shipped', 'delivered'];
const STATUS_LABELS = {
  pending: 'Pendiente', paid: 'Pagado', confirmed: 'Confirmado', preparing: 'Preparando',
  shipped: 'Enviado', in_transit: 'Enviado', delivered: 'Entregado',
  cancelled: 'Cancelado', refunded: 'Reembolsado',
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}
function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} · ${d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
}

function SectionLabel({ children }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 700, color: '#78716c',
      textTransform: 'uppercase', letterSpacing: '0.08em',
      margin: '24px 0 8px', fontFamily: 'inherit',
    }}>
      {children}
    </p>
  );
}

export default function OrderDetailPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      const data = await apiClient.get(`/customer/orders/${orderId}`);
      setOrder(data);
    } catch (error) {
      toast.error(error?.status === 404 ? 'Pedido no encontrado' : 'Error al cargar el pedido');
      navigate('/dashboard/orders');
    } finally {
      setLoading(false);
    }
  }, [orderId, navigate]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  const cancelOrder = async () => {
    if (!window.confirm('¿Estás seguro de que quieres cancelar este pedido?')) return;
    try {
      await apiClient.put(`/customer/orders/${orderId}/cancel`, {});
      toast.success('Pedido cancelado');
      fetchOrder();
    } catch (error) {
      toast.error(error?.message || 'No se puede cancelar este pedido');
    }
  };

  const submitReview = async () => {
    if (reviewRating === 0) { toast.error('Selecciona una valoración'); return; }
    setReviewSubmitting(true);
    try {
      await apiClient.post(`/customer/orders/${orderId}/review`, {
        rating: reviewRating, comment: reviewText,
      });
      toast.success('Reseña publicada');
      setReviewRating(0);
      setReviewText('');
    } catch {
      toast.error('Error al publicar la reseña');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const font = { fontFamily: 'inherit' };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 size={28} className="text-stone-500 animate-spin" />
      </div>
    );
  }

  if (!order) return null;

  const status = (order.status || 'pending').toLowerCase();
  const canCancel = ['pending', 'paid', 'confirmed'].includes(status);
  const isDelivered = status === 'delivered';
  const isCancelled = status === 'cancelled' || status === 'refunded';
  const normalizedStatus = status === 'pending' || status === 'paid' ? 'confirmed' : status === 'in_transit' ? 'shipped' : status;
  const currentStepIdx = STATUS_FLOW.indexOf(normalizedStatus);
  const ref = `#HSP-${String(order.order_id || orderId).slice(-8).toUpperCase()}`;
  const items = order.items || order.line_items || [];
  const subtotal = order.subtotal_cents ? (order.subtotal_cents / 100).toFixed(2) : order.subtotal ? Number(order.subtotal).toFixed(2) : null;
  const discount = order.discount_cents ? (order.discount_cents / 100).toFixed(2) : order.discount ? Number(order.discount).toFixed(2) : null;
  const shipping = order.shipping_cents != null ? (order.shipping_cents / 100).toFixed(2) : order.shipping_amount != null ? Number(order.shipping_amount).toFixed(2) : null;
  const total = order.total_cents ? (order.total_cents / 100).toFixed(2) : order.total_amount ? Number(order.total_amount).toFixed(2) : '0.00';

  const statusTimestamps = {};
  if (order.status_history) {
    order.status_history.forEach(entry => { statusTimestamps[entry.status] = entry.timestamp; });
  }

  const addr = order.shipping_address || order.address || {};

  return (
    <div style={{ minHeight: '100vh', background: '#fafaf9', paddingBottom: 100, ...font }}>
      {/* Topbar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 30,
        background: '#ffffff',
        borderBottom: '1px solid #e7e5e4',
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px',
      }}>
        <button
          onClick={() => navigate('/orders')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
        >
          <ArrowLeft size={22} color="#0c0a09" />
        </button>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#0c0a09' }}>{ref}</span>
      </div>

      <div style={{ padding: '16px', maxWidth: 600, margin: '0 auto' }}>
        {/* ── Status Timeline ── */}
        {!isCancelled && currentStepIdx >= 0 && (
          <div style={{
            background: '#ffffff',
            border: '1px solid #e7e5e4',
            borderRadius: '16px',
            padding: 20, marginBottom: 16,
          }}>
            {/* Horizontal 4-step timeline */}
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              {STATUS_FLOW.map((s, i) => {
                const isCompleted = i < currentStepIdx || (i === currentStepIdx && isDelivered);
                const isActive = i === currentStepIdx && !isDelivered;
                const isPending = i > currentStepIdx;
                const isLast = i === STATUS_FLOW.length - 1;
                const ts = statusTimestamps[s];

                return (
                  <React.Fragment key={s}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: isLast ? '0 0 auto' : 0 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isCompleted ? '#0c0a09' : isActive ? '#0c0a09' : 'transparent',
                        border: isPending ? '2px solid #e7e5e4' : 'none',
                        position: 'relative',
                      }}>
                        {isCompleted ? (
                          <Check size={16} color="#fff" />
                        ) : (
                          <span style={{ fontSize: 12, fontWeight: 700, color: isActive ? '#fff' : '#78716c' }}>
                            {i + 1}
                          </span>
                        )}
                        {isActive && (
                          <motion.div
                            animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            style={{
                              position: 'absolute', inset: -4,
                              borderRadius: '50%', border: '2px solid #0c0a09',
                            }}
                          />
                        )}
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 600, color: isActive ? '#0c0a09' : isCompleted ? '#0c0a09' : '#78716c', marginTop: 6, textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {STATUS_LABELS[s] || s}
                      </span>
                      {ts && (isCompleted || isActive) && (
                        <span style={{ fontSize: 9, color: '#78716c', marginTop: 2, textAlign: 'center' }}>
                          {formatDateTime(ts)}
                        </span>
                      )}
                    </div>
                    {!isLast && (
                      <div style={{
                        flex: 1, height: 2, marginTop: 15,
                        background: i < currentStepIdx ? '#0c0a09' : '#e7e5e4',
                      }} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* Tracking card */}
        {(status === 'shipped' || status === 'in_transit') && (
          <div style={{
            background: '#f5f5f4',
            border: '1px solid #e7e5e4',
            borderRadius: '16px',
            padding: 14, marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Truck size={20} color="#0c0a09" />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#0c0a09', margin: 0 }}>
                {order.carrier || 'Transportista'} {order.tracking_number && `· ${order.tracking_number}`}
              </p>
            </div>
            {order.tracking_url && (
              <a
                href={order.tracking_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 13, fontWeight: 600, color: '#0c0a09', textDecoration: 'none',
                }}
              >
                Rastrear <ExternalLink size={14} />
              </a>
            )}
          </div>
        )}

        {/* ── Products ── */}
        <SectionLabel>PRODUCTOS</SectionLabel>
        <div style={{
          background: '#ffffff',
          border: '1px solid #e7e5e4',
          borderRadius: '16px',
          overflow: 'hidden',
        }}>
          {items.map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: 14,
              borderBottom: i < items.length - 1 ? '1px solid #e7e5e4' : 'none',
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: '12px',
                background: '#f5f5f4', overflow: 'hidden', flexShrink: 0,
              }}>
                {(item.image || item.product_image) && (
                  <img src={item.image || item.product_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 500, color: '#0c0a09', margin: 0 }}>
                  {item.name || item.product_name}
                </p>
                <p style={{ fontSize: 12, color: '#78716c', margin: '2px 0 0' }}>x{item.quantity}</p>
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#0c0a09', flexShrink: 0 }}>
                {item.unit_price_cents
                  ? `${(item.unit_price_cents / 100 * item.quantity).toFixed(2)} €`
                  : item.price
                    ? `${(Number(item.price) * item.quantity).toFixed(2)} €`
                    : ''}
              </span>
            </div>
          ))}
        </div>

        {/* ── Shipping Address ── */}
        <SectionLabel>DIRECCIÓN DE ENVÍO</SectionLabel>
        <div style={{
          background: '#f5f5f4',
          borderRadius: '16px',
          padding: 16,
        }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#0c0a09', margin: 0 }}>
            {addr.full_name || addr.name || ''}
          </p>
          <p style={{ fontSize: 13, color: '#78716c', margin: '4px 0 0', lineHeight: 1.5 }}>
            {addr.street}{addr.city ? `, ${addr.city}` : ''}{addr.postal_code ? ` ${addr.postal_code}` : ''}
            {addr.country ? `, ${addr.country}` : ''}
          </p>
          {addr.phone && (
            <p style={{ fontSize: 13, color: '#78716c', margin: '2px 0 0' }}>{addr.phone}</p>
          )}
        </div>

        {/* ── Payment Summary ── */}
        <SectionLabel>RESUMEN DE PAGO</SectionLabel>
        <div style={{
          background: '#ffffff',
          border: '1px solid #e7e5e4',
          borderRadius: '16px',
          padding: 16,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {subtotal && <PaymentRow label="Subtotal" value={`${subtotal}€`} />}
            {discount && Number(discount) > 0 && <PaymentRow label="Descuento" value={`-${discount}€`} color="#0c0a09" />}
            {shipping != null && <PaymentRow label="Envío" value={Number(shipping) === 0 ? 'Gratis' : `${shipping}€`} />}
            <div style={{ height: 1, background: '#e7e5e4', margin: '4px 0' }} />
            <PaymentRow label="Total" value={`${total}€`} bold />
          </div>
          {order.payment_method && (
            <p style={{ fontSize: 12, color: '#78716c', marginTop: 12 }}>
              Método: {order.payment_method}
            </p>
          )}
          <p style={{ fontSize: 12, color: '#78716c', marginTop: 4 }}>
            Fecha: {formatDate(order.created_at)}
          </p>
        </div>

        {/* ── Sellers ── */}
        {order.seller_name && (
          <>
            <SectionLabel>VENDEDORES</SectionLabel>
            <div style={{
              background: '#ffffff',
              border: '1px solid #e7e5e4',
              borderRadius: '16px',
              padding: 14,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: '#f5f5f4', overflow: 'hidden', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {order.seller_avatar ? (
                  <img src={order.seller_avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Package size={18} color="#78716c" />
                )}
              </div>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#0c0a09' }}>
                {order.seller_name}
              </span>
              <button
                onClick={() => {
                  if (order.producer_id) navigate(`/messages?to=${order.producer_id}`);
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '6px 14px',
                  background: '#ffffff',
                  border: '1px solid #e7e5e4',
                  borderRadius: '12px',
                  fontSize: 13, fontWeight: 600,
                  color: '#0c0a09',
                  cursor: 'pointer',
                }}
              >
                <MessageCircle size={14} /> Contactar
              </button>
            </div>
          </>
        )}

        {/* ── Review form (if delivered) ── */}
        {isDelivered && (
          <div style={{
            background: '#f5f5f4',
            border: '1px solid #e7e5e4',
            borderRadius: '16px',
            padding: 16, marginTop: 24,
          }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#0c0a09', marginBottom: 12 }}>
              ¿Cómo fue tu experiencia?
            </p>
            {/* Stars */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
              {[1, 2, 3, 4, 5].map(s => (
                <button
                  key={s}
                  onClick={() => setReviewRating(s)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                  }}
                >
                  <Star
                    size={28}
                    fill={s <= reviewRating ? '#0c0a09' : 'none'}
                    color={s <= reviewRating ? '#0c0a09' : '#e7e5e4'}
                  />
                </button>
              ))}
            </div>
            <textarea
              value={reviewText}
              onChange={e => setReviewText(e.target.value)}
              placeholder="Deja una reseña..."
              rows={3}
              style={{
                width: '100%', padding: 12, fontSize: 14,
                border: '1px solid #e7e5e4',
                borderRadius: '14px',
                background: '#ffffff',
                color: '#0c0a09',
                outline: 'none', resize: 'vertical',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
            <button
              onClick={submitReview}
              disabled={reviewSubmitting}
              style={{
                marginTop: 10, padding: '8px 20px',
                background: '#0c0a09', color: '#fff',
                border: 'none', borderRadius: '12px',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {reviewSubmitting ? 'Publicando...' : 'Publicar reseña'}
            </button>
          </div>
        )}

        {/* ── Actions ── */}
        {!isCancelled && (
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={() => navigate('/help')}
              style={{
                width: '100%', height: 44,
                background: '#ffffff',
                border: '1px solid #e7e5e4',
                borderRadius: '14px',
                fontSize: 14, fontWeight: 600,
                color: '#0c0a09',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Contactar con soporte
            </button>

            {canCancel && (
              <button
                onClick={cancelOrder}
                style={{
                  width: '100%', height: 44,
                  background: 'transparent',
                  border: '1px solid #78716c',
                  borderRadius: '14px',
                  fontSize: 14, fontWeight: 600,
                  color: '#78716c',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Cancelar pedido
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PaymentRow({ label, value, bold, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 13, color: '#78716c' }}>{label}</span>
      <span style={{
        fontSize: bold ? 18 : 14,
        fontWeight: bold ? 700 : 500,
        color: color || '#0c0a09',
      }}>{value}</span>
    </div>
  );
}
