import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Check, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import apiClient from '../services/api/client';

export default function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState('checking'); // checking | success | error | timeout
  const [order, setOrder] = useState(null);

  useEffect(() => {
    if (!sessionId) { setStatus('error'); return; }

    let cancelled = false;
    let attempt = 0;
    const MAX = 20;

    const getDelay = (n) => Math.min(1000 + n * 500, 5000); // 1s, 1.5s, 2s... max 5s

    const poll = async () => {
      if (cancelled || attempt >= MAX) {
        if (!cancelled && attempt >= MAX) setStatus('timeout');
        return;
      }
      attempt++;
      try {
        const data = await apiClient.get(`/payments/checkout-status/${sessionId}`);
        if (data.payment_status === 'paid' || data.status === 'paid') {
          if (!cancelled) {
            setStatus('success');
            // Try to fetch order details
            if (data.order_id) {
              try {
                const orderData = await apiClient.get(`/customer/orders/${data.order_id}`);
                setOrder(orderData);
              } catch { /* ignore */ }
            }
          }
        } else if (!cancelled) {
          setTimeout(poll, getDelay(attempt));
        }
      } catch {
        if (!cancelled) setStatus('error');
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [sessionId]);

  const font = { fontFamily: 'var(--font-sans)' };

  // Loading state
  if (status === 'checking') {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--color-cream)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 16, ...font,
      }}>
        <Loader2 size={40} color="var(--color-stone)" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ fontSize: 15, color: 'var(--color-stone)' }}>Verificando tu pago...</p>
      </div>
    );
  }

  // Error / Timeout
  if (status === 'error' || status === 'timeout') {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--color-cream)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px', ...font,
      }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
            background: 'var(--color-surface, #f5f5f4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AlertCircle size={32} color="var(--color-stone)" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-black)', marginBottom: 8 }}>
            {status === 'timeout' ? 'Pago procesado' : 'Error de pago'}
          </h1>
          <p style={{ fontSize: 15, color: 'var(--color-stone)', lineHeight: 1.5, marginBottom: 24 }}>
            {status === 'timeout'
              ? 'Tu pago se ha procesado correctamente. Recibirás un email de confirmación con los detalles de tu pedido en los próximos minutos.'
              : 'Ha ocurrido un error al verificar tu pago. Si se ha realizado el cobro, contacta con soporte.'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Link to="/orders" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: 48, background: 'var(--color-black)', color: 'var(--color-white)',
              borderRadius: 'var(--radius-lg)', fontSize: 15, fontWeight: 600, textDecoration: 'none',
            }}>
              Ver mis pedidos
            </Link>
            {status === 'error' && (
              <Link to="/help" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: 48, background: 'var(--color-white)', color: 'var(--color-black)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)', fontSize: 15, fontWeight: 600, textDecoration: 'none',
              }}>
                Contactar soporte
              </Link>
            )}
            <Link to="/" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: 48, background: 'var(--color-white)', color: 'var(--color-black)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)', fontSize: 15, fontWeight: 600, textDecoration: 'none',
            }}>
              Seguir comprando
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success
  const orderId = order?.order_id || order?.id;
  const orderRef = orderId ? `#HSP-${String(orderId).slice(-8).toUpperCase()}` : '';
  const totalPaid = order?.total ? `${(order.total / 100).toFixed(2)}€` : order?.total_amount ? `${Number(order.total_amount).toFixed(2)}€` : '';
  const email = order?.customer_email || order?.email || '';
  const items = order?.items || order?.line_items || [];

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--color-cream)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px', ...font,
    }}>
      <div style={{ textAlign: 'center', maxWidth: 440, width: '100%' }}>
        {/* Animated checkmark */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
          style={{
            width: 80, height: 80, borderRadius: '50%',
            background: '#16a34a', margin: '0 auto 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 0 8px rgba(22,163,74,0.12)',
          }}
        >
          <Check size={40} color="#fff" strokeWidth={2.5} />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-black)', marginBottom: 8 }}
        >
          ¡Pedido confirmado!
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          style={{ fontSize: 15, color: 'var(--color-stone)', lineHeight: 1.5, marginBottom: 24 }}
        >
          Hemos recibido tu pedido. Recibirás un email con los detalles.
        </motion.p>

        {/* Order info card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          style={{
            background: 'var(--color-surface, #f5f5f4)',
            borderRadius: 'var(--radius-xl)',
            padding: 20, textAlign: 'left', marginBottom: 20,
          }}
        >
          {orderRef && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--color-stone)' }}>Pedido</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-black)' }}>{orderRef}</span>
            </div>
          )}
          {totalPaid && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--color-stone)' }}>Total pagado</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-black)' }}>{totalPaid}</span>
            </div>
          )}
          {email && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: 'var(--color-stone)' }}>Email</span>
              <span style={{ fontSize: 13, color: 'var(--color-black)' }}>{email}</span>
            </div>
          )}
        </motion.div>

        {/* Items list */}
        {items.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
            style={{
              background: 'var(--color-white)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              padding: 14, textAlign: 'left', marginBottom: 20,
            }}
          >
            {items.map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 0',
                borderBottom: i < items.length - 1 ? '1px solid var(--color-border)' : 'none',
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 'var(--radius-md)',
                  background: 'var(--color-surface)', overflow: 'hidden', flexShrink: 0,
                }}>
                  {(item.image || item.product_image) && (
                    <img src={item.image || item.product_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-black)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.name || item.product_name}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--color-stone)', margin: 0 }}>x{item.quantity}</p>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-black)', flexShrink: 0 }}>
                  {item.price ? `${Number(item.price).toFixed(2)}€` : ''}
                </span>
              </div>
            ))}
          </motion.div>
        )}

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          {orderId && (
            <Link
              to={`/dashboard/orders/${orderId}`}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: 48, background: 'var(--color-white)',
                color: 'var(--color-black)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                fontSize: 15, fontWeight: 600, textDecoration: 'none',
              }}
            >
              Ver mi pedido
            </Link>
          )}
          <Link
            to="/"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: 48, background: 'var(--color-black)', color: 'var(--color-white)',
              borderRadius: 'var(--radius-lg)',
              fontSize: 15, fontWeight: 600, textDecoration: 'none',
            }}
          >
            Seguir comprando
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
