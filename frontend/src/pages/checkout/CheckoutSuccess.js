import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Package, MapPin, Star, Share2, Home, ShoppingBag } from 'lucide-react';

const CheckoutSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { orderId, total, estimatedDelivery } = location.state || {};

  return (
    <div className="min-h-screen bg-background-subtle flex flex-col">
      {/* Confetti animation background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              y: -20, 
              x: Math.random() * window.innerWidth,
              rotate: 0 
            }}
            animate={{ 
              y: window.innerHeight + 20,
              rotate: 360 
            }}
            transition={{ 
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2
            }}
            className="absolute w-3 h-3 rounded-full"
            style={{
              backgroundColor: ['#2D5A3D', '#E6A532', '#16A34A', '#DC2626'][Math.floor(Math.random() * 4)],
              left: `${Math.random() * 100}%`
            }}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center relative z-10">
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
          className="text-2xl font-bold text-gray-900 mb-2"
        >
          ¡Pedido confirmado!
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-text-muted mb-6"
        >
          #{orderId || 'HS-001234'}
        </motion.p>

        {/* Delivery info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl p-6 w-full max-w-sm mb-6 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-4">
            <Package className="w-5 h-5 text-accent" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Llega el {estimatedDelivery || 'martes 12 marzo'}</p>
              <p className="text-sm text-text-muted">Entre 9:00 y 14:00</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/orders')}
            className="w-full py-2 border-2 border-accent text-accent rounded-xl font-medium"
          >
            Seguir envío
          </button>
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
            className="flex-1 py-3 bg-accent text-white rounded-xl font-medium flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            Volver al inicio
          </button>
          <button 
            onClick={() => navigate('/discover')}
            className="flex-1 py-3 bg-white text-gray-900 rounded-xl font-medium flex items-center justify-center gap-2 border border-gray-200"
          >
            <ShoppingBag className="w-5 h-5" />
            Seguir comprando
          </button>
        </motion.div>

        {/* Rate products suggestion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 w-full max-w-sm"
        >
          <p className="text-sm text-text-muted mb-3">¿Qué te ha parecido la compra?</p>
          <button className="flex items-center gap-2 text-state-amber font-medium">
            <Star className="w-5 h-5" />
            Valorar productos
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default CheckoutSuccess;
