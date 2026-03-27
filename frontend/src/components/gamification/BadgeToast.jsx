import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function BadgeToast({ badge, hpEarned, show, onClose }) {
  useEffect(() => {
    if (!show) return;
    if (navigator.vibrate) navigator.vibrate([10, 50, 100, 50, 200]);
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [show, onClose]);

  return (
    <AnimatePresence>
      {show && badge && (
        <motion.div
          className="fixed bottom-24 left-1/2 z-[1000] min-w-[240px] rounded-2xl border border-stone-200 bg-white p-5 text-center shadow-lg"
          style={{ x: '-50%' }}
          initial={{ y: '100%', scale: 0.8, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          exit={{ y: '100%', scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        >
          <div className="text-5xl mb-2">{badge.emoji || badge.icon}</div>
          <div className="font-bold text-sm text-stone-950">
            ¡Logro desbloqueado!
          </div>
          <div className="text-base font-semibold mt-0.5 text-stone-950">
            {badge.name || badge.name_default}
          </div>
          {hpEarned > 0 && (
            <div className="text-xs mt-1 text-stone-500">
              +{hpEarned} HP
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
