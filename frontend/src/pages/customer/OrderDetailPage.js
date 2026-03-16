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
  pending: 'Confirmado', confirmed: 'Confirmado', preparing: 'Preparando',
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
      fontSize: 11, fontWeight: 700, color: 'var(--color-stone)',
      textTransform: 'uppercase', letterSpacing: '0.08em',
      margin: '24px 0 8px', fontFamily: 'var(--font-sans)',
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
    } catch {
      toast.error('Error al cargar el pedido');
      navigate('/orders');
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

  const font = { fontFamily: 'var(--font-sans)' };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={28} color="var(--color-stone)" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!order) return null;

  const status = (order.status || 'pending').toLowerCase();
  const canCancel = ['pending', 'confirmed'].includes(status);
  const isDelivered = status === 'delivered';
  const isCancelled = status === 'cancelled' || status === 'refunded';
  const currentStepIdx = STATUS_FLOW.indexOf(status === 'pending' ? 'confirmed' : status);
  const ref = `#HSP-${String(order.order_id || orderId).slice(-8).toUpperCase()}`;
  const items = order.items || order.line_items || [];
  const subtotal = order.subtotal ? (order.subtotal / 100).toFixed(2) : null;
  const discount = order.discount ? (order.discount / 100).toFixed(2) : null;
  const shipping = order.shipping != null ? (order.shipping / 100).toFixed(2) : null;
  const total = order.total ? (order.total / 100).toFixed(2) : order.total_amount ? Number(order.total_amount).toFixed(2) : '0.00';

  const statusTimestamps = {};
  if (order.status_history) {
    order.status_history.forEach(entry => { statusTimestamps[entry.status] = entry.timestamp; });
  }

  const addr = order.shipping_address || order.address || {};

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-cream)', paddingBottom: 100, ...font }}>
      {/* Topbar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 30,
        background: 'var(--color-white)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px',
      }}>
        <button
          onClick={() => navigate('/orders')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
        >
          <ArrowLeft size={22} color="var(--color-black)" />
        </button>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-black)' }}>{ref}</span>
      </div>

      <div style={{ padding: '16px', maxWidth: 600, margin: '0 auto' }}>
        {/* ── Status Timeline ── */}
        {!isCancelled && currentStepIdx >= 0 && (
          <div style={{
            background: 'var(--color-white)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
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
                        background: isCompleted ? 'var(--color-black)' : isActive ? '#16a34a' : 'transparent',
                        border: isPending ? '2px solid var(--color-border)' : 'none',
                        position: 'relative',
                      }}>
                        {isCompleted ? (
                          <Check size={16} color="#fff" />
                        ) : (
                          <span style={{ fontSize: 12, fontWeight: 700, color: isActive ? '#fff' : 'var(--color-stone)' }}>
                            {i + 1}
                          </span>
                        )}
                        {isActive && (
                          <motion.div
                            animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            style={{
                              position: 'absolute', inset: -4,
                              borderRadius: '50%', border: '2px solid #16a34a',
                            }}
                          />
                        )}
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 600, color: isActive ? '#16a34a' : isCompleted ? 'var(--color-black)' : 'var(--color-stone)', marginTop: 6, textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {STATUS_LABELS[s] || s}
                      </span>
                      {ts && (isCompleted || isActive) && (
                        <span style={{ fontSize: 9, color: 'var(--color-stone)', marginTop: 2, textAlign: 'center' }}>
                          {formatDateTime(ts)}
                        </span>
                      )}
                    </div>
                    {!isLast && (
                      <div style={{
                        flex: 1, height: 2, marginTop: 15,
                        background: i < currentStepIdx ? 'var(--color-black)' : 'var(--color-border)',
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
            background: 'rgba(37,99,235,0.06)',
            border: '1px solid rgba(37,99,235,0.15)',
            borderRadius: 'var(--radius-xl)',
            padding: 14, marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Truck size={20} color="#2563eb" />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#2563eb', margin: 0 }}>
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
                  fontSize: 13, fontWeight: 600, color: '#2563eb', textDecoration: 'none',
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
          background: 'var(--color-white)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
        }}>
          {items.map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: 14,
              borderBottom: i < items.length - 1 ? '1px solid var(--color-border)' : 'none',
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface)', overflow: 'hidden', flexShrink: 0,
              }}>
                {(item.image || item.product_image) && (
                  <img src={item.image || item.product_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-black)', margin: 0 }}>
                  {item.name || item.product_name}
                </p>
                <p style={{ fontSize: 12, color: 'var(--color-stone)', margin: '2px 0 0' }}>x{item.quantity}</p>
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-black)', flexShrink: 0 }}>
                {item.price ? `${Number(item.price).toFixed(2)}€` : ''}
              </span>
            </div>
          ))}
        </div>

        {/* ── Shipping Address ── */}
        <SectionLabel>DIRECCIÓN DE ENVÍO</SectionLabel>
        <div style={{
          background: 'var(--color-surface, #f5f5f4)',
          borderRadius: 'var(--radius-xl)',
          padding: 16,
        }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-black)', margin: 0 }}>
            {addr.full_name || addr.name || ''}
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-stone)', margin: '4px 0 0', lineHeight: 1.5 }}>
            {addr.street}{addr.city ? `, ${addr.city}` : ''}{addr.postal_code ? ` ${addr.postal_code}` : ''}
            {addr.country ? `, ${addr.country}` : ''}
          </p>
          {addr.phone && (
            <p style={{ fontSize: 13, color: 'var(--color-stone)', margin: '2px 0 0' }}>{addr.phone}</p>
          )}
        </div>

        {/* ── Payment Summary ── */}
        <SectionLabel>RESUMEN DE PAGO</SectionLabel>
        <div style={{
          background: 'var(--color-white)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: 16,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {subtotal && <PaymentRow label="Subtotal" value={`${subtotal}€`} />}
            {discount && Number(discount) > 0 && <PaymentRow label="Descuento" value={`-${discount}€`} color="var(--color-green, #16a34a)" />}
            {shipping != null && <PaymentRow label="Envío" value={Number(shipping) === 0 ? 'Gratis' : `${shipping}€`} />}
            <div style={{ height: 1, background: 'var(--color-border)', margin: '4px 0' }} />
            <PaymentRow label="Total" value={`${total}€`} bold />
          </div>
          {order.payment_method && (
            <p style={{ fontSize: 12, color: 'var(--color-stone)', marginTop: 12 }}>
              Método: {order.payment_method}
            </p>
          )}
          <p style={{ fontSize: 12, color: 'var(--color-stone)', marginTop: 4 }}>
            Fecha: {formatDate(order.created_at)}
          </p>
        </div>

        {/* ── Sellers ── */}
        {order.seller_name && (
          <>
            <SectionLabel>VENDEDORES</SectionLabel>
            <div style={{
              background: 'var(--color-white)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              padding: 14,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'var(--color-surface)', overflow: 'hidden', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {order.seller_avatar ? (
                  <img src={order.seller_avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Package size={18} color="var(--color-stone)" />
                )}
              </div>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--color-black)' }}>
                {order.seller_name}
              </span>
              <button
                onClick={() => {
                  if (order.producer_id) navigate(`/messages?to=${order.producer_id}`);
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '6px 14px',
                  background: 'var(--color-white)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 13, fontWeight: 600,
                  color: 'var(--color-black)',
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
            background: 'rgba(22,163,74,0.04)',
            border: '1px solid rgba(22,163,74,0.15)',
            borderRadius: 'var(--radius-xl)',
            padding: 16, marginTop: 24,
          }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-black)', marginBottom: 12 }}>
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
                    color={s <= reviewRating ? '#0c0a09' : 'var(--color-border)'}
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
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--color-white)',
                color: 'var(--color-black)',
                outline: 'none', resize: 'vertical',
                fontFamily: 'var(--font-sans)',
                boxSizing: 'border-box',
              }}
            />
            <button
              onClick={submitReview}
              disabled={reviewSubmitting}
              style={{
                marginTop: 10, padding: '8px 20px',
                background: '#16a34a', color: '#fff',
                border: 'none', borderRadius: 'var(--radius-md)',
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
                background: 'var(--color-white)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                fontSize: 14, fontWeight: 600,
                color: 'var(--color-black)',
                cursor: 'pointer', fontFamily: 'var(--font-sans)',
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
                  border: '1px solid rgba(220,38,38,0.3)',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: 14, fontWeight: 600,
                  color: '#dc2626',
                  cursor: 'pointer', fontFamily: 'var(--font-sans)',
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
      <span style={{ fontSize: 13, color: 'var(--color-stone)' }}>{label}</span>
      <span style={{
        fontSize: bold ? 18 : 14,
        fontWeight: bold ? 700 : 500,
        color: color || 'var(--color-black)',
      }}>{value}</span>
    </div>
  );
}
