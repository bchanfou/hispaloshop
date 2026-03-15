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

const V2 = {
  black: '#0A0A0A',
  stone: '#8A8881',
  border: '#E5E2DA',
  surface: '#F0EDE8',
  white: '#fff',
  fontSans: 'Inter, sans-serif',
  radiusMd: 12,
};

const ICON_SIZE = 24;
const CIRCLE_SIZE = 56;

function ActionOption({ icon: Icon, label, onClick, isBlack }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2"
      style={{
        border: 'none',
        background: 'none',
        cursor: 'pointer',
        padding: 8,
        fontFamily: V2.fontSans,
      }}
    >
      <div
        className="flex items-center justify-center"
        style={{
          width: CIRCLE_SIZE,
          height: CIRCLE_SIZE,
          borderRadius: '50%',
          backgroundColor: isBlack ? V2.black : V2.surface,
        }}
      >
        <Icon
          size={ICON_SIZE}
          style={{ color: isBlack ? V2.white : V2.black }}
        />
      </div>
      <span
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: isBlack ? V2.black : V2.stone,
        }}
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
              className="absolute inset-0"
              style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />

            {/* Sheet */}
            <motion.div
              className="relative"
              style={{
                backgroundColor: V2.white,
                borderRadius: '20px 20px 0 0',
                paddingBottom: 'env(safe-area-inset-bottom, 16px)',
                fontFamily: V2.fontSans,
              }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            >
              {/* Handle bar */}
              <div className="flex justify-center" style={{ paddingTop: 10, paddingBottom: 8 }}>
                <div
                  style={{
                    width: 36,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: V2.border,
                  }}
                />
              </div>

              {/* Options grid */}
              <div
                className="grid grid-cols-3 justify-items-center"
                style={{ padding: '8px 16px 16px' }}
              >
                <ActionOption
                  icon={Camera}
                  label="Foto"
                  onClick={() => { onClose?.(); onSelectPhoto?.(); }}
                />
                <ActionOption
                  icon={Video}
                  label="Vídeo"
                  onClick={() => { onClose?.(); onSelectVideo?.(); }}
                />
                <ActionOption
                  icon={FileText}
                  label="Documento PDF"
                  onClick={() => { onClose?.(); onSelectDocument?.(); }}
                />
                <ActionOption
                  icon={BookOpen}
                  label="Catálogo"
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
              <div style={{ padding: '0 16px 8px' }}>
                <button
                  onClick={onClose}
                  className="w-full flex items-center justify-center"
                  style={{
                    height: 48,
                    backgroundColor: V2.surface,
                    border: 'none',
                    borderRadius: V2.radiusMd,
                    fontSize: 14,
                    fontWeight: 500,
                    color: V2.black,
                    cursor: 'pointer',
                    fontFamily: V2.fontSans,
                  }}
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
