import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award } from 'lucide-react';

/**
 * AchievementToast — Full-width toast for badge unlock.
 * Spring scale animation. Stone palette. Apple minimalist DNA.
 *
 * @param {string} name - Badge display name
 * @param {string} [icon] - Lucide icon name (decorative; Award used as default)
 * @param {boolean} [visible=true] - Controls visibility for AnimatePresence
 * @param {function} [onDismiss] - Called when toast auto-dismisses or is tapped
 */
export default function AchievementToast({
  name,
  visible = true,
  onDismiss,
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ scale: 0.6, opacity: 0, y: -20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: -12 }}
          transition={{ type: 'spring', stiffness: 400, damping: 24 }}
          onClick={onDismiss}
          className="fixed top-[env(safe-area-inset-top,0px)] left-4 right-4 z-[9999] mt-3 cursor-pointer"
        >
          <div className="flex items-center gap-3 rounded-2xl bg-stone-950 px-5 py-4 shadow-xl">
            {/* Icon circle */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-100">
              <Award size={20} className="text-stone-950" strokeWidth={2} />
            </div>
            {/* Text */}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">
                Logro desbloqueado
              </p>
              <p className="text-sm font-semibold text-stone-50 truncate">
                {name}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
