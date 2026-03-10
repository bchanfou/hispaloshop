import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

function HIFloatingButton({ onClick, hasNewMessages = false }) {
  const { t } = useTranslation();
  const [isPulsing, setIsPulsing] = useState(false);

  // Pulse sutil cada 5 segundos si no se ha interactuado
  useEffect(() => {
    const interval = setInterval(() => {
      setIsPulsing(true);
      setTimeout(() => setIsPulsing(false), 1000);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="fixed bottom-24 right-4 z-40 flex flex-col items-center gap-1"
    >
      <motion.div
        animate={isPulsing ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        {/* Badge de mensajes nuevos */}
        {hasNewMessages && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold z-10">
            1
          </span>
        )}
        
        {/* Botón principal */}
        <div className="w-14 h-14 bg-accent rounded-2xl shadow-lg shadow-[#2D5A3D]/30 flex items-center justify-center">
          <Bot className="w-7 h-7 text-white" />
        </div>
        
        {/* Efecto pulse */}
        {isPulsing && (
          <motion.div
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 bg-accent rounded-2xl"
          />
        )}
      </motion.div>
      
      {/* Label */}
      <span className="text-[10px] font-medium text-accent bg-white/80 backdrop-blur-sm px-2 py-0.5 rounded-full shadow-sm">
        HI AI
      </span>
    </motion.button>
  );
}

export default HIFloatingButton;
