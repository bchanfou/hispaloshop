import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FocusTrap from 'focus-trap-react';
import {
  Camera,
  Video,
  FileText,
  BookOpen,
  Award,
  FileSignature,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

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
      <span
        className={`text-xs font-medium ${isBlack ? 'text-stone-950' : 'text-stone-500'}`}
      >
        {label}
      </span>
    </button>
  );
}

export default function B2BActionSheet({
  isOpen,
  onClose,
  onSelectPhoto,
  onSelectVideo,
  onSelectDocument,
  onSelectCatalog,
  onSelectCertificate,
  onCreateOffer,
  conversationId,
}) {
  const navigate = useNavigate();

  const handleCreateOffer = () => {
    onClose?.();
    if (onCreateOffer) {
      onCreateOffer();
    } else {
      navigate(`/b2b/offer/new?conversationId=${conversationId}`);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <FocusTrap
          focusTrapOptions={{
            allowOutsideClick: true,
            fallbackFocus: '[data-b2b-sheet]',
          }}
        >
          <div
            data-b2b-sheet
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
              className="relative bg-white rounded-t-[20px] pb-[env(safe-area-inset-bottom,16px)]"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            >
              {/* Handle bar */}
              <div className="flex justify-center pt-2.5 pb-2">
                <div className="w-9 h-1 rounded-sm bg-stone-200" />
              </div>

              {/* Options grid */}
              <div className="grid grid-cols-3 justify-items-center px-4 pt-2 pb-4">
                <ActionOption
                  icon={Camera}
                  label="Foto"
                  onClick={() => { onClose?.(); onSelectPhoto?.(); }}
                />
                <ActionOption
                  icon={Video}
                  label={t('b2_b_action.video', 'Vídeo')}
                  onClick={() => { onClose?.(); onSelectVideo?.(); }}
                />
                <ActionOption
                  icon={FileText}
                  label="Documento PDF"
                  onClick={() => { onClose?.(); onSelectDocument?.(); }}
                />
                <ActionOption
                  icon={BookOpen}
                  label=t('b2_b_marketplace.catalogo', 'Catálogo')
                  onClick={() => { onClose?.(); onSelectCatalog?.(); }}
                />
                <ActionOption
                  icon={Award}
                  label="Certificado"
                  onClick={() => { onClose?.(); onSelectCertificate?.(); }}
                />
                <ActionOption
                  icon={FileSignature}
                  label="Crear oferta"
                  onClick={handleCreateOffer}
                  isBlack
                />
              </div>

              {/* Cancel button */}
              <div className="px-4 pb-2">
                <button
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
