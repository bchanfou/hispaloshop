import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CONSENT_KEY = 'hispaloshop_consent_v1';

export function getConsentStatus() {
  try {
    return localStorage.getItem(CONSENT_KEY) || 'pending';
  } catch {
    return 'pending';
  }
}

export function hasConsent() {
  return getConsentStatus() === 'accepted';
}

export default function ConsentBanner({ onConsent }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (getConsentStatus() === 'pending') setVisible(true);
  }, []);

  const accept = () => {
    try { localStorage.setItem(CONSENT_KEY, 'accepted'); } catch (e) { /* noop */ }
    setVisible(false);
    onConsent(true);
  };

  const reject = () => {
    try { localStorage.setItem(CONSENT_KEY, 'rejected'); } catch (e) { /* noop */ }
    setVisible(false);
    onConsent(false);
  };

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 38 }}
          className="fixed bottom-[calc(58px+env(safe-area-inset-bottom,0px))] left-3 right-3 z-[45] flex flex-col gap-3 rounded-2xl bg-stone-950 p-4 shadow-[0_8px_40px_rgba(0,0,0,0.30)]"
        >
          <p className="m-0 text-[13px] leading-relaxed text-stone-200">
            Usamos cookies de analítica para mejorar la experiencia.
            Nunca vendemos tus datos.{' '}
            <a href="/privacy" className="text-stone-400 underline underline-offset-2 hover:text-white">
              Política de privacidad
            </a>
          </p>
          <div className="flex gap-2">
            <button
              onClick={reject}
              className="flex-1 rounded-full border border-white/20 bg-transparent py-2.5 text-[13px] font-medium text-stone-200 transition-colors hover:bg-white/10"
            >
              Solo esenciales
            </button>
            <button
              onClick={accept}
              className="flex-1 rounded-full border-none bg-white py-2.5 text-[13px] font-semibold text-stone-950 transition-colors hover:bg-stone-100"
            >
              Aceptar
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
