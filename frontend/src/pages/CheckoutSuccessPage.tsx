// @ts-nocheck
import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Check, Loader2, AlertCircle, Calendar, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import apiClient from '../services/api/client';
import { captureException } from '../lib/sentry';
import { useQueryClient } from '@tanstack/react-query';
import { useCart } from '../context/CartContext';

function estimateDeliveryRange(createdAt) {
  const base = createdAt ? new Date(createdAt) : new Date();
  const addBusinessDays = (date, days) => {
    const result = new Date(date);
    let added = 0;
    while (added < days) {
      result.setDate(result.getDate() + 1);
      const dow = result.getDay();
      if (dow !== 0 && dow !== 6) added++;
    }
    return result;
  };
  const fmt = (d) =>
    d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  return `${fmt(addBusinessDays(base, 3))} – ${fmt(addBusinessDays(base, 7))}`;
}

export default function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState('checking'); // checking | success | error | timeout
  const [order, setOrder] = useState(null);
  const queryClient = useQueryClient();
  const { fetchCart } = useCart();

  const tempRef = useMemo(
    () => (sessionId ? `#HSP-${sessionId.slice(-8).toUpperCase()}` : ''),
    [sessionId],
  );

  useEffect(() => {
    if (!sessionId) { setStatus('error'); return; }

    let cancelled = false;
    let attempt = 0;
    const MAX = 20;

    const getDelay = (n) => Math.min(1000 + n * 500, 5000);

    const poll = async () => {
      if (cancelled) return;
      if (attempt >= MAX) { if (!cancelled) setStatus('timeout'); return; }
      attempt++;
      try {
        const data = await apiClient.get(`/payments/checkout-status/${sessionId}`);
        const isPaid = data?.payment_status === 'paid' || data?.status === 'paid' || data?.order_status === 'confirmed';
        if (isPaid) {
          if (!cancelled && data.order_id) {
            try {
              const orderData = await apiClient.get(`/customer/orders/${data.order_id}`);
              if (!cancelled) setOrder(orderData);
            } catch { /* ignore */ }
          }
          if (!cancelled) {
            queryClient.invalidateQueries({ queryKey: ['cart'] });
            queryClient.invalidateQueries({ queryKey: ['cart-pricing'] });
            fetchCart();
            setStatus('success');
          }
        } else if (!cancelled) {
          setTimeout(poll, getDelay(attempt));
        }
      } catch (err) {
        captureException(err);
        // Don't switch to error — keep showing success with temp ref
        if (!cancelled && attempt < MAX) {
          setTimeout(poll, getDelay(attempt));
        }
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [sessionId]);

  // Loading state — only if no sessionId at all (edge case)
  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center flex-col gap-4">
        <Loader2 className="w-10 h-10 text-stone-500 animate-spin" />
        <p className="text-[15px] text-stone-500" aria-live="polite">Verificando tu pago...</p>
      </div>
    );
  }

  // Error / Timeout
  if (status === 'error' || status === 'timeout') {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4 py-6">
        <div className="text-center max-w-[400px]">
          <div className="w-16 h-16 rounded-full mx-auto mb-5 bg-stone-100 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-stone-500" />
          </div>
          <h1 className="text-[22px] font-bold text-stone-950 mb-2">
            {status === 'timeout' ? 'Pago procesado' : 'Error de pago'}
          </h1>
          <p className="text-[15px] text-stone-500 leading-relaxed mb-6" aria-live="polite">
            {status === 'timeout'
              ? 'Tu pago se ha procesado correctamente. Recibirás un email de confirmación con los detalles de tu pedido en los próximos minutos.'
              : 'Ha ocurrido un error al verificar tu pago. Si se ha realizado el cobro, contacta con soporte.'}
          </p>
          <div className="flex flex-col gap-2.5">
            <Link to="/orders" className="flex items-center justify-center h-12 bg-stone-950 text-white rounded-full text-[15px] font-semibold no-underline hover:bg-stone-800 transition-colors">
              Ver mis pedidos
            </Link>
            {status === 'error' && (
              <Link to="/help" className="flex items-center justify-center h-12 bg-white text-stone-950 border border-stone-200 rounded-full text-[15px] font-semibold no-underline hover:bg-stone-50 transition-colors">
                Contactar soporte
              </Link>
            )}
            <Link to="/discover" className="flex items-center justify-center h-12 bg-white text-stone-950 border border-stone-200 rounded-full text-[15px] font-semibold no-underline hover:bg-stone-50 transition-colors">
              Seguir comprando
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success
  const orderId = order?.order_id || order?.id;
  const orderRef = orderId
    ? `#HSP-${String(orderId).slice(-8).toUpperCase()}`
    : tempRef;
  const total = order?.total_amount ?? (order?.total_cents ? order.total_cents / 100 : 0);
  const totalPaid = total ? `${Number(total).toFixed(2)} €` : '';
  const email = order?.user_email || order?.customer_email || order?.email || '';
  const allItems = order?.items || order?.line_items || [];
  const visibleItems = allItems.slice(0, 5);
  const extraCount = allItems.length - 5;
  const deliveryRange = estimateDeliveryRange(order?.created_at);

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4 py-6">
      <div className="text-center max-w-[440px] w-full">
        {/* Animated checkmark */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
          className="w-20 h-20 rounded-full bg-stone-950 mx-auto mb-6 flex items-center justify-center ring-8 ring-stone-200"
        >
          <Check className="w-10 h-10 text-white" strokeWidth={2.5} />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="text-2xl font-bold text-stone-950 mb-1"
        >
          Pedido confirmado
        </motion.h1>

        {orderRef && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-sm text-stone-500 mb-1"
          >
            Tu referencia: <span className="font-semibold text-stone-700">{orderRef}</span>
          </motion.p>
        )}

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="text-[15px] text-stone-500 leading-relaxed mb-6"
        >
          Hemos recibido tu pedido. Recibirás un email con los detalles.
        </motion.p>

        {/* Order info card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-stone-100 rounded-2xl p-5 text-left mb-5"
        >
          {orderRef && (
            <div className="flex justify-between mb-2">
              <span className="text-[13px] text-stone-500">Pedido</span>
              <span className="text-sm font-semibold text-stone-950">{orderRef}</span>
            </div>
          )}
          {totalPaid && (
            <div className="flex justify-between mb-2">
              <span className="text-[13px] text-stone-500">Total pagado</span>
              <span className="text-sm font-semibold text-stone-950">{totalPaid}</span>
            </div>
          )}
          {email && (
            <div className="flex justify-between mb-2">
              <span className="text-[13px] text-stone-500">Email</span>
              <span className="text-[13px] text-stone-950">{email}</span>
            </div>
          )}
          {/* Estimated delivery */}
          <div className="flex justify-between items-center">
            <span className="text-[13px] text-stone-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Entrega estimada
            </span>
            <span className="text-sm text-stone-500">{deliveryRange}</span>
          </div>
        </motion.div>

        {/* Items purchased list */}
        {visibleItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
            className="bg-white shadow-sm rounded-2xl p-4 text-left mb-5"
          >
            {visibleItems.map((item, i) => (
              <div key={item.product_id || item.id || `item-${i}`} className={`flex items-center gap-2.5 py-2 ${i < visibleItems.length - 1 ? 'border-b border-stone-100' : ''}`}>
                <div className="w-10 h-10 rounded-xl bg-stone-100 overflow-hidden flex-shrink-0">
                  {(item.image || item.product_image) && (
                    <img loading="lazy" src={item.image || item.product_image} alt={item.name || item.product_name || ''} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-stone-950 truncate">
                    {item.name || item.product_name}
                  </p>
                  <p className="text-xs text-stone-500">x{item.quantity}</p>
                </div>
                <span className="text-[13px] font-semibold text-stone-950 flex-shrink-0">
                  {item.unit_price_cents
                    ? `${(item.unit_price_cents / 100 * item.quantity).toFixed(2)} €`
                    : item.price
                      ? `${(Number(item.price) * item.quantity).toFixed(2)} €`
                      : ''}
                </span>
              </div>
            ))}
            {extraCount > 0 && (
              <p className="text-xs text-stone-400 text-center pt-2 mt-2 border-t border-stone-100">
                y {extraCount} más
              </p>
            )}
          </motion.div>
        )}

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65 }}
          className="flex flex-col gap-2.5"
        >
          {orderId && (
            <Link
              to={`/dashboard/orders/${orderId}`}
              className="flex items-center justify-center h-12 bg-stone-950 text-white rounded-full text-[15px] font-semibold no-underline hover:bg-stone-800 transition-colors"
            >
              Ver mi pedido
            </Link>
          )}
          <Link
            to="/discover"
            className="flex items-center justify-center h-12 bg-white text-stone-950 border border-stone-200 rounded-full text-[15px] font-semibold no-underline hover:bg-stone-50 transition-colors"
          >
            Seguir comprando
          </Link>
        </motion.div>

        {/* Support contact */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.75 }}
        >
          <Link
            to="/contact"
            className="inline-flex items-center gap-1 text-xs text-stone-400 mt-4 no-underline hover:text-stone-600 transition-colors"
          >
            <MessageCircle className="w-3 h-3" />
            ¿Algún problema? Contacta con soporte
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
