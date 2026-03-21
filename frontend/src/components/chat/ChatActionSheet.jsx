import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FocusTrap from 'focus-trap-react';
import { Camera, Video, FileText, ShoppingBag } from 'lucide-react';

function ActionOption({ icon: Icon, label, onClick, isBlack }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 border-none bg-transparent cursor-pointer p-2"
    >
      <div
        className={`flex items-center justify-center w-14 h-14 rounded-full ${
          isBlack ? 'bg-stone-950' : 'bg-stone-100'
        }`}
      >
        <Icon size={24} className={isBlack ? 'text-white' : 'text-stone-950'} />
      </div>
      <span className="text-xs text-stone-950 font-medium">
        {label}
      </span>
    </button>
  );
}

export default function ChatActionSheet({
  isOpen,
  onClose,
  onSelectPhoto,
  onSelectVideo,
  onSelectDocument,
  onSelectProduct,
  showProductOption,
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <FocusTrap focusTrapOptions={{ allowOutsideClick: true }}>
          <div className="fixed inset-0 z-50">
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />

            {/* Sheet */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[20px] pb-[env(safe-area-inset-bottom,16px)]"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            >
              {/* Handle bar */}
              <div className="flex justify-center pt-2.5 pb-1">
                <div className="w-10 h-1 rounded-sm bg-stone-200" />
              </div>

              {/* Options grid */}
              <div className="grid grid-cols-2 justify-items-center px-6 pt-4 pb-2">
                <ActionOption
                  icon={Camera}
                  label="Foto"
                  onClick={() => { onSelectPhoto?.(); onClose?.(); }}
                />
                <ActionOption
                  icon={Video}
                  label="V\u00eddeo"
                  onClick={() => { onSelectVideo?.(); onClose?.(); }}
                />
                <ActionOption
                  icon={FileText}
                  label="Documento"
                  onClick={() => { onSelectDocument?.(); onClose?.(); }}
                />
                {showProductOption && (
                  <ActionOption
                    icon={ShoppingBag}
                    label="Producto"
                    onClick={() => { onSelectProduct?.(); onClose?.(); }}
                    isBlack
                  />
                )}
              </div>

              {/* Cancel button */}
              <div className="px-4 pt-2 pb-3">
                <button
                  onClick={onClose}
                  className="w-full flex items-center justify-center h-12 bg-stone-100 text-stone-950 rounded-full border-none text-[15px] font-medium cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        </FocusTrap>
      )}
    </AnimatePresence>
  );
}
