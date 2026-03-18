import React from 'react';
import FocusTrap from 'focus-trap-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ShoppingBag, TrendingUp, Wand2, Globe } from 'lucide-react';
import { ROLE_CONFIG } from './useHIChat';

const ROLE_META = {
  consumer: { icon: ShoppingBag, label: 'David', badge: null },
  producer: { icon: TrendingUp, label: 'Pedro', badge: 'PRO' },
  influencer: { icon: Wand2, label: 'Hispal Creativo', badge: 'PRO' },
  importer: { icon: Globe, label: 'Pedro', badge: 'PRO' },
};

function RoleSelector({ activeRole, onSwitch, isOpen, onClose, availableRoles }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <>
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
        />

        <FocusTrap focusTrapOptions={{ escapeDeactivates: false, allowOutsideClick: true, returnFocusOnDeactivate: true }}>
        <motion.div
          key="sheet"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          className="fixed inset-x-0 bottom-0 z-50 rounded-t-[32px] bg-[rgba(250,248,244,0.98)] px-5 pb-10 pt-4 shadow-[0_-20px_50px_rgba(15,15,15,0.15)] backdrop-blur-xl"
        >
          <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-stone-200" />
          <h2 className="mb-6 text-xl font-semibold text-stone-950">Elegir asistente</h2>

          <div className="space-y-2.5">
            {(availableRoles || ['consumer']).map((roleId) => {
              const meta = ROLE_META[roleId] || ROLE_META.consumer;
              const config = ROLE_CONFIG[roleId] || ROLE_CONFIG.consumer;
              const Icon = meta.icon;
              const isActive = activeRole === roleId;

              return (
                <motion.button
                  key={roleId}
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    onSwitch(roleId);
                    onClose();
                  }}
                  className={`flex w-full items-center gap-4 rounded-2xl border px-4 py-3.5 text-left transition-all duration-150 ${
                    isActive
                      ? 'border-stone-950 bg-stone-50'
                      : 'border-stone-100 bg-white hover:border-stone-300 hover:bg-stone-50'
                  }`}
                >
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
                    isActive ? 'bg-stone-950' : 'bg-stone-100'
                  }`}>
                    <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-stone-600'}`} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-stone-950">{meta.label}</p>
                      {meta.badge ? (
                        <span className="rounded-full bg-stone-950 px-2 py-0.5 text-[10px] font-semibold text-white">
                          {meta.badge}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-sm leading-snug text-stone-500">{config.description}</p>
                  </div>

                  {isActive ? <CheckCircle2 className="h-5 w-5 shrink-0 text-stone-950" /> : null}
                </motion.button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-6 w-full rounded-full border border-stone-200 py-3 text-sm font-medium text-stone-500 transition-colors hover:bg-stone-50"
          >
            Cerrar
          </button>
        </motion.div>
        </FocusTrap>
      </>
    </AnimatePresence>
  );
}

export default RoleSelector;
