import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

function HIFloatingButton({ onClick, hasNewMessages = false }) {
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      aria-label="Abrir asistente HI"
      className="fixed bottom-24 right-4 z-40 flex flex-col items-center gap-1.5"
    >
      <div className="relative">
        {hasNewMessages && (
          <span className="absolute -top-1 -right-1 z-10 h-3.5 w-3.5 rounded-full border-2 border-white bg-stone-950" />
        )}

        <div className="w-12 h-12 bg-stone-950 rounded-full shadow-[0_8px_24px_rgba(15,15,15,0.22)] flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
      </div>

      <span className="text-[10px] font-semibold text-stone-950 bg-white/90 backdrop-blur-sm px-2.5 py-0.5 rounded-full shadow-sm tracking-wide">
        HI
      </span>
    </motion.button>
  );
}

export default HIFloatingButton;
