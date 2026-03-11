import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ShoppingBag, TrendingUp, Wand2, Globe } from 'lucide-react';
import { ROLE_CONFIG } from './useHIChat';

const ROLE_META = {
  consumer:   { icon: ShoppingBag, label: 'Hispal AI',       badge: null },
  producer:   { icon: TrendingUp,  label: 'Hispal Ventas',   badge: 'PRO' },
  influencer: { icon: Wand2,       label: 'Hispal Creativo', badge: 'PRO' },
  importer:   { icon: Globe,       label: 'Hispal Ventas',   badge: 'PRO' },
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

        <motion.div
          key="sheet"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          className="fixed inset-x-0 bottom-0 z-50 rounded-t-[28px] bg-white px-5 pb-10 pt-4"
        >
          {/* Handle */}
          <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-stone-200" />

          {/* Header */}
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-stone-400">
            Hispal AI
          </p>
          <h2 className="text-xl font-semibold text-stone-950">Elegir asistente</h2>
          <p className="mt-1 mb-6 text-sm text-stone-500">
            Cada modo está especializado para ayudarte mejor.
          </p>

          <div className="space-y-2.5">
            {(availableRoles || ['consumer']).map((roleId) => {
              const meta   = ROLE_META[roleId] || ROLE_META.consumer;
              const config = ROLE_CONFIG[roleId] || ROLE_CONFIG.consumer;
              const Icon   = meta.icon;
              const isActive = activeRole === roleId;

              return (
                <motion.button
                  key={roleId}
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { onSwitch(roleId); onClose(); }}
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
                      {meta.badge && (
                        <span className="rounded-full bg-stone-950 px-2 py-0.5 text-[10px] font-semibold text-white">
                          {meta.badge}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-stone-500 leading-snug">
                      {config.description}
                    </p>
                  </div>

                  {isActive && (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-stone-950" />
                  )}
                </motion.button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-6 w-full rounded-full border border-stone-200 py-3 text-sm font-medium text-stone-500 transition-colors hover:bg-stone-50"
          >
            Cancelar
          </button>
        </motion.div>
      </>
    </AnimatePresence>
  );
}

export default RoleSelector;
