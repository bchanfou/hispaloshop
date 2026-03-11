import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Sparkles, TrendingUp, Wand2, Globe } from 'lucide-react';
import { ROLE_CONFIG } from './useHIChat';

const ROLE_META = {
  consumer:   { icon: Sparkles,  label: 'HI AI',       badge: null },
  producer:   { icon: TrendingUp, label: 'HI Ventas',  badge: 'PRO' },
  influencer: { icon: Wand2,     label: 'HI Creativo', badge: 'PRO' },
  importer:   { icon: Globe,     label: 'HI Ventas',   badge: 'PRO' },
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
          className="fixed inset-0 z-50 bg-black/40"
        />

        <motion.div
          key="sheet"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="fixed inset-x-0 bottom-0 z-50 rounded-t-[28px] bg-white px-5 pb-10 pt-4"
        >
          <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-stone-200" />

          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-stone-400">
            Modo HI
          </p>
          <h2 className="text-xl font-semibold text-stone-950">Cambiar asistente</h2>
          <p className="mt-1 mb-6 text-sm text-stone-500">
            Selecciona el modo según lo que necesites ahora.
          </p>

          <div className="space-y-2.5">
            {(availableRoles || ['consumer']).map((roleId) => {
              const meta = ROLE_META[roleId] || ROLE_META.consumer;
              const config = ROLE_CONFIG[roleId] || ROLE_CONFIG.consumer;
              const Icon = meta.icon;
              const isActive = activeRole === roleId;

              return (
                <button
                  key={roleId}
                  type="button"
                  onClick={() => {
                    onSwitch(roleId);
                    onClose();
                  }}
                  className={`flex w-full items-center gap-4 rounded-2xl border px-4 py-3.5 text-left transition-all duration-150 ${
                    isActive
                      ? 'border-stone-950 bg-stone-50'
                      : 'border-stone-100 bg-white hover:border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-stone-100">
                    <Icon className="h-5 w-5 text-stone-700" />
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
                    <p className="mt-0.5 text-xs text-stone-500">{config.description}</p>
                  </div>
                  {isActive ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-stone-950" />
                  ) : null}
                </button>
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
