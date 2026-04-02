import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FocusTrap from 'focus-trap-react';
import { Camera, Video, Package, FileText, Link } from 'lucide-react';

function ActionOption({ icon: Icon, label, onClick, bgColor }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2 border-none bg-transparent cursor-pointer p-2"
    >
      <div
        className={`flex items-center justify-center w-14 h-14 rounded-full ${bgColor || 'bg-stone-100'}`}
      >
        <Icon size={24} className="text-stone-950" />
      </div>
      <span className="text-xs text-stone-950 font-medium">
        {label}
      </span>
    </button>
  );
}

export default function CollabActionSheet({
  isOpen,
  onClose,
  onSelectPhoto,
  onSelectVideo,
  onSelectProduct,
  onSelectProposal,
  onSelectAffiliateLink,
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <FocusTrap
          focusTrapOptions={{
            allowOutsideClick: true,
            fallbackFocus: '[data-collab-sheet]',
          }}
        >
          <div
            data-collab-sheet
            tabIndex={-1}
            className="fixed inset-0 z-50 flex flex-col justify-end"
          >
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
              className="relative w-full bg-white rounded-t-[20px] pb-[env(safe-area-inset-bottom,16px)]"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            >
              {/* Handle bar */}
              <div className="flex justify-center pt-2.5 pb-1">
                <div className="w-9 h-1 rounded-sm bg-stone-100" />
              </div>

              {/* Options grid */}
              <div className="grid grid-cols-2 justify-items-center px-6 pt-3 pb-2">
                <ActionOption
                  icon={Camera}
                  label="Foto"
                  onClick={onSelectPhoto}
                />
                <ActionOption
                  icon={Video}
                  label="Vídeo"
                  onClick={onSelectVideo}
                />
                <ActionOption
                  icon={Package}
                  label="Producto muestra"
                  onClick={onSelectProduct}
                />
                <ActionOption
                  icon={FileText}
                  label="Propuesta"
                  onClick={onSelectProposal}
                  bgColor="bg-stone-200"
                />
                <ActionOption
                  icon={Link}
                  label="Link afiliado"
                  onClick={onSelectAffiliateLink}
                />
              </div>

              {/* Cancel */}
              <div className="px-4 pt-2 pb-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full flex items-center justify-center h-12 bg-stone-100 border-none rounded-full text-sm font-medium text-stone-950 cursor-pointer"
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
