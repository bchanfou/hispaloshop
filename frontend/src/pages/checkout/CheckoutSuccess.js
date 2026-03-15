import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Home, Loader2, Package, ShoppingBag, Star } from 'lucide-react';
import apiClient from '../../services/api/client';

const CONFETTI_COLORS = ['#0A0A0A', '#8A8881', '#E5E2DA', '#F0EDE8', '#2E7D52', '#F7F6F2'];

const CheckoutSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const sessionId = searchParams.get('session_id');
  const stateData = location.state || {};

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(!!sessionId);

  // Stable confetti pieces — computed once per mount
  const confettiPieces = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 2.5,
        duration: 2.8 + Math.random() * 2,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        isRect: Math.random() > 0.5,
      })),
    []
  );

  useEffect(() => {
    if (!sessionId) return;
    const fetchOrder = async () => {
      try {
        const orders = (await apiClient.get('/customer/orders')) || [];
        const matched = orders.find((o) => o.payment_session_id === sessionId);
        if (matched) setOrder(matched);
      } catch {
        // silently ignore — generic success still shown
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [sessionId]);

  const orderId = order?.order_id || stateData.orderId;
  const total = order?.total_amount ?? stateData.total;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-cream)' }}>
      {/* Confetti overlay */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {confettiPieces.map((p) => (
          <motion.div
            key={p.id}
            initial={{ y: -24, rotate: 0 }}
            animate={{ y: typeof window !== 'undefined' ? window.innerHeight + 40 : 900, rotate: 720 }}
            transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: 'linear' }}
            className={p.isRect ? 'absolute w-2 h-3.5 rounded-[2px]' : 'absolute w-2.5 h-2.5 rounded-full'}
            style={{ backgroundColor: p.color, left: `${p.left}%` }}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center relative z-10">
        {loading ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--color-stone)' }} />
            <p className="text-sm" style={{ color: 'var(--color-stone)' }}>Confirmando tu pedido...</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35 }}
            className="w-full max-w-sm"
          >
            {/* Checkmark */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.1 }}
              className="flex items-center justify-center mx-auto mb-8"
              style={{
                width: 64,
                height: 64,
                background: 'var(--color-green)',
                borderRadius: '50%',
                boxShadow: '0 0 0 8px var(--color-green-light)',
              }}
            >
              <Check className="w-8 h-8" style={{ color: '#fff' }} strokeWidth={2.5} />
            </motion.div>

            {/* Heading */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <p className="text-xs uppercase tracking-[0.28em] mb-2" style={{ color: 'var(--color-stone)' }}>Pago confirmado</p>
              <h1 className="text-3xl font-black leading-tight" style={{ color: 'var(--color-black)', fontFamily: 'var(--font-sans)' }}>
                ¡Gracias por tu<br />pedido!
              </h1>
            </motion.div>

            {/* Order meta pills */}
            {(orderId || total != null) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="flex items-center justify-center gap-3 mt-3"
              >
                {orderId && (
                  <span className="text-sm" style={{ color: 'var(--color-stone)' }}>#{String(orderId).slice(-8).toUpperCase()}</span>
                )}
                {orderId && total != null && (
                  <span className="w-1 h-1 rounded-full shrink-0" style={{ background: 'var(--color-border)' }} />
                )}
                {total != null && (
                  <span className="text-sm font-semibold" style={{ color: 'var(--color-black)' }}>
                    €{Number(total).toFixed(2)} pagados
                  </span>
                )}
              </motion.div>
            )}

            {/* Delivery card */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="mt-6 p-4"
              style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 flex items-center justify-center shrink-0"
                  style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}
                >
                  <Package className="w-5 h-5" style={{ color: 'var(--color-stone)' }} />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="font-semibold text-sm" style={{ color: 'var(--color-black)' }}>Tu pedido está en preparación</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-stone)' }}>Recibirás un email de confirmación en breve</p>
                </div>
              </div>
              {orderId && (
                <button
                  onClick={() => navigate('/orders')}
                  className="w-full mt-3 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                  style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-black)',
                    background: 'var(--color-white)',
                  }}
                >
                  Seguir envío
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </motion.div>

            {/* CTA buttons */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              className="mt-3 grid grid-cols-2 gap-2.5"
            >
              <button
                onClick={() => navigate('/')}
                className="py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                style={{
                  background: 'var(--color-black)',
                  color: '#fff',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <Home className="w-4 h-4" />
                Inicio
              </button>
              <button
                onClick={() => navigate('/discover')}
                className="py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                style={{
                  background: 'var(--color-white)',
                  color: 'var(--color-black)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <ShoppingBag className="w-4 h-4" />
                Seguir comprando
              </button>
            </motion.div>

            {/* Rating prompt */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.65 }}
              onClick={() => navigate('/orders')}
              className="mt-5 flex items-center justify-center gap-2 text-sm transition-colors mx-auto"
              style={{ color: 'var(--color-stone)' }}
            >
              <Star className="w-4 h-4" />
              Valorar productos
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default CheckoutSuccess;
