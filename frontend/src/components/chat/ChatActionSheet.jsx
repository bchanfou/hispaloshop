import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FocusTrap from 'focus-trap-react';
import { Camera, Video, FileText, ShoppingBag } from 'lucide-react';

const V2 = {
  black: '#0A0A0A',
  green: '#2E7D52',
  stone: '#8A8881',
  border: '#E5E2DA',
  surface: '#F0EDE8',
  white: '#fff',
  fontSans: 'Inter, sans-serif',
  radiusMd: 12,
};

const ICON_SIZE = 24;
const CIRCLE_SIZE = 56;

function ActionOption({ icon: Icon, label, onClick, isGreen }) {
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
          backgroundColor: isGreen ? V2.green : V2.surface,
        }}
      >
        <Icon size={ICON_SIZE} style={{ color: isGreen ? V2.white : V2.black }} />
      </div>
      <span style={{ fontSize: 12, color: V2.black, fontWeight: 500 }}>
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
          <div className="fixed inset-0 z-50" style={{ fontFamily: V2.fontSans }}>
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
              className="absolute bottom-0 left-0 right-0"
              style={{
                backgroundColor: V2.white,
                borderRadius: '20px 20px 0 0',
                paddingBottom: 'env(safe-area-inset-bottom, 16px)',
              }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            >
              {/* Handle bar */}
              <div className="flex justify-center" style={{ padding: '10px 0 4px' }}>
                <div
                  style={{
                    width: 40,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: V2.border,
                  }}
                />
              </div>

              {/* Options grid */}
              <div
                className="grid grid-cols-2 justify-items-center"
                style={{ padding: '16px 24px 8px' }}
              >
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
                    isGreen
                  />
                )}
              </div>

              {/* Cancel button */}
              <div style={{ padding: '8px 16px 12px' }}>
                <button
                  onClick={onClose}
                  className="w-full flex items-center justify-center"
                  style={{
                    height: 48,
                    backgroundColor: V2.surface,
                    color: V2.black,
                    borderRadius: V2.radiusMd,
                    border: 'none',
                    fontSize: 15,
                    fontWeight: 500,
                    fontFamily: V2.fontSans,
                    cursor: 'pointer',
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
