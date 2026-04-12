import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Shield, X, Globe } from 'lucide-react';
import apiClient from '../../services/api/client';
import i18n from '../../locales/i18n';

const CONSENT_KEY = 'hispaloshop_consent_v2';
const COOKIE_ID_KEY = 'hispaloshop_cookie_id';

const DEFAULT_CONSENTS = {
  essential: true,
  analytics: false,
  marketing: false,
  ai_processing: false,
};

function getCookieId() {
  try {
    let id = localStorage.getItem(COOKIE_ID_KEY);
    if (!id) {
      id = `ck_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(COOKIE_ID_KEY, id);
    }
    return id;
  } catch {
    return `ck_fallback_${Date.now()}`;
  }
}

export function getConsentState() {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getConsentStatus() {
  return getConsentState() ? 'accepted' : 'pending';
}

export function hasConsent() {
  return getConsentState() !== null;
}

export function hasAnalyticsConsent() {
  const state = getConsentState();
  return state?.analytics === true;
}

export function hasMarketingConsent() {
  const state = getConsentState();
  return state?.marketing === true;
}

export function hasAiConsent() {
  const state = getConsentState();
  return state?.ai_processing === true;
}

async function syncConsentsToBackend(consents) {
  const cookieId = getCookieId();
  try {
    await apiClient.post('/consent', {
      cookie_id: cookieId,
      consents: Object.entries(consents).map(([type, granted]) => ({ type, granted })),
    });
  } catch {
    // Non-blocking — localStorage is the primary store for immediate UI
  }
}

export async function linkConsentToUser() {
  const cookieId = getCookieId();
  try {
    await apiClient.put('/consent/link-user', { cookie_id: cookieId });
  } catch {
    // Non-blocking
  }
}

/* ── Granular consent modal ── */
function ConsentConfigModal({ consents, onSave, onClose }) {
  const [local, setLocal] = useState({ ...consents });

  const toggles = [
    {
      key: 'essential',
      label: i18n.t('consent_banner.essential', 'Esenciales'),
      desc: i18n.t('consent_banner.essential_desc', 'Sesion, autenticacion, carrito. Necesarias para el funcionamiento del sitio.'),
      locked: true,
    },
    {
      key: 'analytics',
      label: i18n.t('consent_banner.analytics', 'Analitica'),
      desc: i18n.t('consent_banner.analytics_desc', 'Nos ayudan a entender como usas la plataforma para mejorarla. Incluye reporte de errores (Sentry).'),
      locked: false,
    },
    {
      key: 'marketing',
      label: 'Marketing',
      desc: i18n.t('consent_banner.marketing_desc', 'Futuras integraciones de remarketing. Actualmente no usamos cookies de marketing.'),
      locked: false,
    },
    {
      key: 'ai_processing',
      label: i18n.t('consent_banner.ai_processing', 'Procesamiento IA'),
      desc: i18n.t('consent_banner.ai_processing_desc', 'Nuestros asistentes IA (David, Rebeca, Pedro, Iris) procesan tus datos para ofrecerte recomendaciones personalizadas.'),
      locked: false,
    },
  ];

  return (
    <div className="fixed inset-0 z-[999] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 38 }}
        className="bg-white w-full sm:max-w-[420px] sm:rounded-2xl rounded-t-2xl shadow-[0_-8px_40px_rgba(0,0,0,0.15)] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center">
              <Shield size={16} className="text-stone-700" />
            </div>
            <h3 className="text-[16px] font-semibold text-stone-950">
              {i18n.t('consent_banner.config_title', 'Configurar cookies')}
            </h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-stone-100 flex items-center justify-center transition-colors">
            <X size={16} className="text-stone-500" />
          </button>
        </div>

        {/* Toggles */}
        <div className="px-5 pb-2 space-y-3 max-h-[60vh] overflow-y-auto">
          {toggles.map(t => (
            <div key={t.key} className="flex items-start justify-between gap-3 py-2.5 border-b border-stone-100 last:border-b-0">
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-stone-950">{t.label}</p>
                <p className="text-[12px] text-stone-500 leading-relaxed mt-0.5">{t.desc}</p>
              </div>
              <button
                onClick={() => !t.locked && setLocal(prev => ({ ...prev, [t.key]: !prev[t.key] }))}
                disabled={t.locked}
                aria-label={`Toggle ${t.label}`}
                className={`relative w-[44px] h-[26px] rounded-full flex-shrink-0 transition-colors duration-200 mt-0.5 ${
                  local[t.key] ? 'bg-stone-950' : 'bg-stone-200'
                } ${t.locked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span className={`absolute top-[3px] w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${
                  local[t.key] ? 'left-[21px]' : 'left-[3px]'
                }`} />
              </button>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-stone-100 flex gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-full border border-stone-200 text-[13px] font-semibold text-stone-950 hover:bg-stone-50 transition-colors active:scale-95"
          >
            {i18n.t('common.cancel', 'Cancelar')}
          </button>
          <button
            onClick={() => onSave(local)}
            className="flex-1 py-3 rounded-full bg-stone-950 text-[13px] font-semibold text-white hover:bg-stone-800 transition-colors active:scale-95"
          >
            {i18n.t('consent_banner.save_prefs', 'Guardar preferencias')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function ConsentBanner({ onConsent }) {
  const [visible, setVisible] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    if (!getConsentState()) setVisible(true);
  }, []);

  const saveAndClose = useCallback((consents) => {
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(consents));
    } catch { /* noop */ }
    setVisible(false);
    setShowConfig(false);
    syncConsentsToBackend(consents);
    if (onConsent) onConsent(consents.analytics);
  }, [onConsent]);

  const acceptAll = () => {
    saveAndClose({ essential: true, analytics: true, marketing: true, ai_processing: true });
  };

  const essentialOnly = () => {
    saveAndClose({ ...DEFAULT_CONSENTS });
  };

  return (
    <>
      <AnimatePresence>
        {visible && !showConfig ? (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            className="fixed bottom-[calc(58px+env(safe-area-inset-bottom,0px))] left-3 right-3 z-[45] flex flex-col gap-3 rounded-2xl bg-stone-950 p-4 shadow-[0_8px_40px_rgba(0,0,0,0.30)]"
          >
            <p className="m-0 text-[13px] leading-relaxed text-stone-200">
              {i18n.t('consent_banner.message', 'Usamos cookies esenciales para el funcionamiento del sitio. Puedes aceptar cookies opcionales para mejorar tu experiencia.')}{' '}
              <a href="/legal/privacidad" className="text-stone-400 underline underline-offset-2 hover:text-white">
                {i18n.t('register.politicaDePrivacidad', 'Politica de privacidad')}
              </a>
            </p>
            <div className="flex gap-2">
              <button
                onClick={essentialOnly}
                className="flex-1 rounded-full border border-white/20 bg-transparent py-2.5 text-[13px] font-medium text-stone-200 transition-colors hover:bg-white/10"
              >
                {i18n.t('consent_banner.essential_only', 'Solo esenciales')}
              </button>
              <button
                onClick={() => setShowConfig(true)}
                className="w-11 rounded-full border border-white/20 bg-transparent flex items-center justify-center transition-colors hover:bg-white/10"
                aria-label={i18n.t('consent_banner.configure', 'Configurar')}
              >
                <Settings size={15} className="text-stone-300" />
              </button>
              <button
                onClick={acceptAll}
                className="flex-1 rounded-full border-none bg-white py-2.5 text-[13px] font-semibold text-stone-950 transition-colors hover:bg-stone-100"
              >
                {i18n.t('consent_banner.accept_all', 'Aceptar todas')}
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showConfig && (
          <ConsentConfigModal
            consents={getConsentState() || DEFAULT_CONSENTS}
            onSave={saveAndClose}
            onClose={() => setShowConfig(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export function CrossBorderNotice({ userCountry }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show for EU/KR users, not US
    if (!userCountry || userCountry === 'US') return;
    try {
      if (localStorage.getItem('hsp_cross_border_accepted')) return;
    } catch { /* noop */ }
    setVisible(true);
  }, [userCountry]);

  const accept = async () => {
    try { localStorage.setItem('hsp_cross_border_accepted', 'true'); } catch { /* noop */ }
    setVisible(false);
    // Log consent
    const cookieId = getCookieId();
    try {
      await apiClient.post('/consent', {
        cookie_id: cookieId,
        consents: [{ type: 'cross_border_transfer', granted: true }],
      });
    } catch { /* noop */ }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[998] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl max-w-[400px] w-full p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center">
            <Globe size={20} className="text-stone-700" />
          </div>
          <h3 className="text-[16px] font-semibold text-stone-950">Transferencia internacional de datos</h3>
        </div>
        <p className="text-[13px] leading-relaxed text-stone-600 mb-4">
          {i18n.t('cross_border.message', 'Tus datos personales se almacenan y procesan en servidores ubicados en Estados Unidos. HispaloShop LLC esta registrada en Florida, USA. Tus datos estan protegidos conforme al RGPD (UE) 2016/679.')}
        </p>
        <a href="/legal/privacidad" className="text-[12px] text-stone-500 underline underline-offset-2 hover:text-stone-700 mb-5 inline-block">
          {i18n.t('cross_border.more_info', 'Mas informacion')}
        </a>
        <button
          onClick={accept}
          className="w-full py-3 rounded-full bg-stone-950 text-[14px] font-semibold text-white hover:bg-stone-800 transition-colors"
        >
          {i18n.t('cross_border.accept', 'Aceptar y continuar')}
        </button>
      </motion.div>
    </div>
  );
}
