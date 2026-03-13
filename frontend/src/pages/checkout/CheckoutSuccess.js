import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Package, Home, ShoppingBag, Loader2, Star } from 'lucide-react';
import apiClient from '../../services/api/client';

const CheckoutSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Stripe redirects with ?session_id=cs_xxx
  const sessionId = searchParams.get('session_id');

  // Fallback: some paths pass state (legacy mock flow)
  const stateData = location.state || {};

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(!!sessionId);

  useEffect(() => {
    if (!sessionId) return;
    // Fetch our orders and match by payment_session_id
    const fetchOrder = async () => {
      try {
        const orders = await apiClient.get('/customer/orders') || [];
        const matched = orders.find(o => o.payment_session_id === sessionId);
        if (matched) setOrder(matched);
      } catch {
        // silently ignore — we still show a generic success
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [sessionId]);

  const orderId = order?.order_id || stateData.orderId;
  const total = order?.total_amount ?? stateData.total;

  const confettiColors = ['#2D5A27', '#E6A532', '#16A34A', '#C83A2A'];

  return (
    <div className="min-h-screen bg-background-subtle flex flex-col">
      {/* Confetti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ y: -20, x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 400), rotate: 0 }}
            animate={{ y: (typeof window !== 'undefined' ? window.innerHeight : 800) + 20, rotate: 360 }}
            transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }}
            className="absolute w-3 h-3 rounded-full"
            style={{
              backgroundColor: confettiColors[Math.floor(Math.random() * confettiColors.length)],
              left: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center relative z-10">

        {loading ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-accent" />
            <p className="text-stone-500">Confirmando tu pedido...</p>
          </div>
        ) : (
          <>
            {/* Success icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="w-24 h-24 bg-state-success rounded-full flex items-center justify-center mb-6"
            >
              <Check className="w-12 h-12 text-white" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl font-bold text-stone-950 mb-2"
            >
              ¡Pedido confirmado!
            </motion.h1>

            {orderId && (
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-stone-500 mb-1"
              >
                #{orderId.slice(-8).toUpperCase()}
              </motion.p>
            )}

            {total != null && (
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="text-lg font-bold text-stone-950 mb-6"
              >
                Total pagado: €{Number(total).toFixed(2)}
              </motion.p>
            )}

            {/* Delivery card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm mb-6 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-4">
                <Package className="w-5 h-5 text-accent" />
                <div className="text-left">
                  <p className="font-medium text-stone-950">Tu pedido está en camino</p>
                  <p className="text-sm text-stone-500">Recibirás un email de confirmación</p>
                </div>
              </div>
              {orderId && (
                <button
                  onClick={() => navigate('/orders')}
                  className="w-full py-2 border-2 border-accent text-accent rounded-xl font-medium text-sm"
                >
                  Seguir envío
                </button>
              )}
            </motion.div>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex gap-3 w-full max-w-sm"
            >
              <button
                onClick={() => navigate('/')}
                className="flex-1 py-3 bg-accent text-white rounded-xl font-medium flex items-center justify-center gap-2 text-sm"
              >
                <Home className="w-4 h-4" />
                Inicio
              </button>
              <button
                onClick={() => navigate('/discover')}
                className="flex-1 py-3 bg-white text-stone-950 rounded-xl font-medium flex items-center justify-center gap-2 border border-stone-200 text-sm"
              >
                <ShoppingBag className="w-4 h-4" />
                Seguir comprando
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-8 w-full max-w-sm"
            >
              <p className="text-sm text-stone-500 mb-3">¿Qué te ha parecido la compra?</p>
              <button
                onClick={() => navigate('/orders')}
                className="flex items-center gap-2 text-state-amber font-medium"
              >
                <Star className="w-5 h-5" />
                Valorar productos
              </button>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
};

export default CheckoutSuccess;
