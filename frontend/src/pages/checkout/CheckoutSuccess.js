import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Home, Loader2, Package, ShoppingBag, Star } from 'lucide-react';
import apiClient from '../../services/api/client';

const CONFETTI_COLORS = ['#0c0a09', '#44403c', '#78716c', '#a8a29e', '#d6d3d1', '#f5f5f4'];

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
    <div className="min-h-screen bg-stone-50 flex flex-col">
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
            <Loader2 className="w-10 h-10 animate-spin text-stone-400" />
            <p className="text-sm text-stone-500">Confirmando tu pedido...</p>
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
              className="w-28 h-28 bg-stone-950 rounded-full flex items-center justify-center ring-8 ring-stone-200 mx-auto mb-8"
            >
              <Check className="w-14 h-14 text-white" strokeWidth={2.5} />
            </motion.div>

            {/* Heading */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <p className="text-xs uppercase tracking-[0.28em] text-stone-500 mb-2">Pago confirmado</p>
              <h1 className="text-3xl font-black text-stone-950 leading-tight">
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
                  <span className="text-sm text-stone-500">#{String(orderId).slice(-8).toUpperCase()}</span>
                )}
                {orderId && total != null && (
                  <span className="w-1 h-1 rounded-full bg-stone-300 shrink-0" />
                )}
                {total != null && (
                  <span className="text-sm font-semibold text-stone-950">
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
              className="mt-6 bg-white rounded-2xl border border-stone-200 p-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5 text-stone-700" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="font-semibold text-stone-950 text-sm">Tu pedido está en preparación</p>
                  <p className="text-xs text-stone-500 mt-0.5">Recibirás un email de confirmación en breve</p>
                </div>
              </div>
              {orderId && (
                <button
                  onClick={() => navigate('/orders')}
                  className="w-full mt-3 py-2.5 rounded-xl border border-stone-200 text-sm font-medium text-stone-950 hover:bg-stone-50 transition-colors flex items-center justify-center gap-2"
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
                className="py-3 bg-stone-950 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors hover:bg-stone-800"
              >
                <Home className="w-4 h-4" />
                Inicio
              </button>
              <button
                onClick={() => navigate('/discover')}
                className="py-3 bg-white text-stone-950 rounded-xl text-sm font-medium flex items-center justify-center gap-2 border border-stone-200 transition-colors hover:bg-stone-50"
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
              className="mt-5 flex items-center justify-center gap-2 text-sm text-stone-500 hover:text-stone-950 transition-colors mx-auto"
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
