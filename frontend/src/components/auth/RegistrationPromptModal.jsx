// Section 3.6.7 — Bloque 2
// Global registration prompt modal. Fires when a non-logged user tries an
// action that requires auth (like, comment, follow, save, buy). Listens to
// the custom event 'auth:prompt_registration' dispatched by the API client
// interceptor when it receives a 401 and there's no token (i.e. the user
// was never logged in, not "logged in but expired").
//
// Full-screen on mobile, centered modal on desktop. Closable with X.
// After successful registration, retries the action that triggered the modal.

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';

const ACTION_HEADLINES = {
  like: 'auth.registration.headlineLike',
  comment: 'auth.registration.headlineComment',
  follow: 'auth.registration.headlineFollow',
  save: 'auth.registration.headlineSave',
  buy: 'auth.registration.headlineBuy',
  default: 'auth.registration.headlineDefault',
};

const ACTION_DEFAULTS = {
  like: 'Unete para dar like',
  comment: 'Unete para comentar',
  follow: 'Unete para seguir',
  save: 'Unete para guardar',
  buy: 'Unete para comprar',
  default: 'Unete a HispaloShop',
};

export default function RegistrationPromptModal() {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState('default');
  const [context, setContext] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const { register, user, initialized } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Don't render until auth state is resolved (Bug 1 fix)
  // Close if user becomes logged in (e.g. via another tab)
  useEffect(() => {
    if (user && open) setOpen(false);
  }, [user, open]);
  if (!initialized) return null;

  // Listen for the global event dispatched by the API client
  useEffect(() => {
    const handler = (e) => {
      if (user) return; // Already logged in, ignore
      setAction(e.detail?.action || 'default');
      setContext(e.detail?.context || null);
      setOpen(true);
    };
    window.addEventListener('auth:prompt_registration', handler);
    return () => window.removeEventListener('auth:prompt_registration', handler);
  }, [user]);

  const handleClose = useCallback(() => {
    setOpen(false);
    setName('');
    setEmail('');
    setPassword('');
    setBusy(false);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) return;
    setBusy(true);
    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        role: 'customer',
        country: localStorage.getItem('hsp_region_override') || 'ES',
      });
      toast.success(t('auth.registration.success', 'Cuenta creada'));
      handleClose();
      // The action that triggered the modal will auto-retry now that the user
      // is authenticated (the component that called the API will re-render
      // with the new auth state and the user can click again).
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.detail || err?.message;
      toast.error(msg || t('auth.registration.error', 'Error al crear cuenta'));
    } finally {
      setBusy(false);
    }
  };

  const headlineKey = ACTION_HEADLINES[action] || ACTION_HEADLINES.default;
  const headlineDefault = ACTION_DEFAULTS[action] || ACTION_DEFAULTS.default;
  const headline = context?.username
    ? t(headlineKey, headlineDefault).replace('{username}', context.username)
    : t(headlineKey, headlineDefault);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="reg-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-[100] bg-black/50"
          />
          <motion.div
            key="reg-modal"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed inset-0 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-[101] bg-white md:rounded-2xl md:shadow-2xl md:max-w-md md:w-[calc(100vw-32px)] overflow-y-auto"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-stone-100">
              <h2 className="text-lg font-bold text-stone-950">
                {headline}
              </h2>
              <button
                type="button"
                onClick={handleClose}
                className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center bg-transparent border-none cursor-pointer text-stone-400 hover:text-stone-700 transition-colors"
                aria-label={t('common.close', 'Cerrar')}
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-stone-700 mb-1.5">
                  {t('auth.registration.name', 'Nombre')}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  className="w-full h-11 rounded-xl border border-stone-200 px-3.5 text-sm text-stone-950 bg-white outline-none focus:border-stone-400"
                  placeholder={t('auth.registration.namePlaceholder', 'Tu nombre')}
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-stone-700 mb-1.5">
                  {t('auth.registration.email', 'Email')}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full h-11 rounded-xl border border-stone-200 px-3.5 text-sm text-stone-950 bg-white outline-none focus:border-stone-400"
                  placeholder="email@ejemplo.com"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-stone-700 mb-1.5">
                  {t('auth.registration.password', 'Contraseña')}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full h-11 rounded-xl border border-stone-200 px-3.5 text-sm text-stone-950 bg-white outline-none focus:border-stone-400"
                  placeholder={t('auth.registration.passwordPlaceholder', 'Minimo 8 caracteres')}
                />
              </div>

              <button
                type="submit"
                disabled={busy || !name.trim() || !email.trim() || !password.trim()}
                className="w-full h-12 rounded-full bg-stone-950 text-white text-[15px] font-semibold border-none cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-2 transition-colors hover:bg-stone-800"
              >
                {busy && <Loader2 size={16} className="animate-spin" />}
                {t('auth.registration.submit', 'Crear cuenta gratis')}
              </button>

              <p className="text-center text-[13px] text-stone-500">
                {t('auth.registration.hasAccount', '¿Ya tienes cuenta?')}{' '}
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
                    navigate(`/login?redirect=${returnUrl}`);
                  }}
                  className="text-stone-950 font-semibold bg-transparent border-none cursor-pointer p-0 hover:underline"
                >
                  {t('auth.registration.login', 'Inicia sesion')}
                </button>
              </p>

              <p className="text-[11px] text-stone-400 text-center leading-relaxed">
                {t('auth.registration.privacy', 'Al crear tu cuenta aceptas nuestros terminos de servicio y politica de privacidad.')}
              </p>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
