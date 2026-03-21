// @ts-nocheck
import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Loader2, Sparkles } from 'lucide-react';

const Step5Welcome = ({ data, onComplete, isSubmitting }) => {
  const firstName = data.firstName || '';

  return (
    <div className="space-y-6 py-6 text-center">
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-stone-950 text-white"
      >
        <CheckCircle className="h-12 w-12" />
      </motion.div>

      <div>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-2xl font-semibold text-stone-950"
        >
          Cuenta lista{firstName ? `, ${firstName}` : ''}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="mt-2 text-sm leading-6 text-stone-600"
        >
          El siguiente paso es completar tu onboarding para que el feed, el catálogo y las sugerencias empiecen con más sentido.
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.26 }}
        className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-left"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-stone-700">
            <Sparkles className="h-5 w-5" />
          </div>
          <p className="text-sm leading-6 text-stone-700">
            Cuando termines el onboarding te enseñaremos primero productores, categorías y cuentas que encajen mejor contigo.
          </p>
        </div>
      </motion.div>

      <motion.button
        type="button"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.34 }}
        onClick={onComplete}
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-stone-950 py-3 font-medium text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:bg-stone-300"
      >
        {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
        {isSubmitting ? 'Creando cuenta...' : 'Ir al onboarding'}
      </motion.button>
    </div>
  );
};

export default Step5Welcome;
