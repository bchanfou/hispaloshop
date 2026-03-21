import React, { useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHaptics } from '../../hooks/useHaptics';

const SPRING = { type: 'spring', stiffness: 280, damping: 26, mass: 0.9 };

/**
 * BottomSheet — drag-to-dismiss sheet with backdrop.
 * Props: isOpen, onClose, children, className, maxHeight (default '85vh')
 */
export default function BottomSheet({ isOpen, onClose, children, className = '', maxHeight = '85vh' }) {
  const sheetRef = useRef(null);
  const { trigger } = useHaptics();

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [isOpen, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [isOpen]);

  const handleDragEnd = useCallback((_, info) => {
    if (info.velocity.y > 300 || info.offset.y > 120) {
      trigger('medium');
      onClose();
    }
  }, [onClose, trigger]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9998]" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            ref={sheetRef}
            initial={{ y: '100%' }}
            animate={{ y: 0, transition: SPRING }}
            exit={{ y: '100%', transition: SPRING }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={handleDragEnd}
            style={{ maxHeight, touchAction: 'none' }}
            className={`absolute bottom-0 left-0 right-0 z-[9999] flex flex-col rounded-t-2xl bg-white shadow-modal ${className}`}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing">
              <div className="h-1 w-9 rounded-full bg-stone-200" />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
