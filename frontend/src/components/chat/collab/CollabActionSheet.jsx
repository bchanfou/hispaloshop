import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FocusTrap from 'focus-trap-react';
import { Camera, Video, Package, FileText, Link } from 'lucide-react';

const V2 = {
  black: '#0A0A0A',
  stone: '#8A8881',
  surface: '#F0EDE8',
  white: '#fff',
  fontSans: 'Inter, sans-serif',
  radiusMd: 12,
};

const COLLAB = {
  bg: '#F5F0F8',
};

const ICON_SIZE = 24;
const CIRCLE_SIZE = 56;

function ActionOption({ icon: Icon, label, onClick, bgColor }) {
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
          background: bgColor || V2.surface,
        }}
      >
        <Icon size={ICON_SIZE} style={{ color: V2.black }} />
      </div>
      <span style={{ fontSize: 12, color: V2.black, fontWeight: 500 }}>
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
              className="absolute inset-0"
              style={{ background: 'rgba(0,0,0,0.6)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />

            {/* Sheet */}
            <motion.div
              className="relative w-full"
              style={{
                background: V2.white,
                borderRadius: '20px 20px 0 0',
                paddingBottom: 'env(safe-area-inset-bottom, 16px)',
                fontFamily: V2.fontSans,
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
                    width: 36,
                    height: 4,
                    borderRadius: 2,
                    background: V2.surface,
                  }}
                />
              </div>

              {/* Options grid */}
              <div
                className="grid grid-cols-2 justify-items-center"
                style={{ padding: '12px 24px 8px' }}
              >
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
                  bgColor={COLLAB.bg}
                />
                <ActionOption
                  icon={Link}
                  label="Link afiliado"
                  onClick={onSelectAffiliateLink}
                />
              </div>

              {/* Cancel */}
              <div style={{ padding: '8px 16px 8px' }}>
                <button
                  onClick={onClose}
                  className="w-full flex items-center justify-center"
                  style={{
                    height: 48,
                    background: V2.surface,
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
