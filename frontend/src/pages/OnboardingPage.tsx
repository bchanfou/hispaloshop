// @ts-nocheck
/**
 * OnboardingPage — 6-step consumer onboarding (section 1.1 of the launch roadmap).
 *
 * Steps:
 *   1. Welcome       — "Hola [nombre]. HispaloShop te conecta con quien alimenta tu mesa."
 *   2. Profile       — avatar + 1-line bio (skippable)
 *   3. Location      — country (auto-detected by IP) + city optional (required)
 *   4. Interests     — 16 categories, min 3 (required)
 *   5. Discovery     — personalized / popular / local / rated (skippable — defaults to personalized)
 *   6. Confirm       — "¡Listo!" + spring checkmark + CTA to feed
 *
 * Copy follows the HispaloShop DNA: cercano, tuteo, toca la fibra.
 * All strings are i18n-ready via useTranslation.
 * Analytics: every step fires trackEvent() (consent-gated).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Loader2, Check, Camera, MapPin,
  Sparkles, TrendingUp, Star, Globe,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api/client';
import { useTranslation } from 'react-i18next';
import { trackEvent } from '../utils/analytics';
import { useIpGeo } from '../hooks/useIpGeo';

const TOTAL_STEPS = 6;

const INTERESTS = [
  'aceites', 'miel', 'conservas', 'panaderia',
  'quesos', 'embutidos', 'salsas', 'especias',
  'legumbres', 'frutos_secos', 'infusiones', 'vinos',
  'frutas', 'verduras', 'reposteria', 'bebidas',
];

const COUNTRIES = [
  { code: 'ES', name: 'España' },
  { code: 'KR', name: '대한민국' },
  { code: 'US', name: 'United States' },
  { code: 'MX', name: 'México' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CO', name: 'Colombia' },
  { code: 'CL', name: 'Chile' },
  { code: 'PE', name: 'Perú' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italia' },
  { code: 'DE', name: 'Deutschland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'JP', name: '日本' },
  { code: 'BR', name: 'Brasil' },
];

const slideVariants = {
  enter: (dir) => ({ x: dir > 0 ? 64 : -64, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir < 0 ? 64 : -64, opacity: 0 }),
};

/* ── Shared UI primitives ── */

const ProgressBar = ({ step }) => (
  <div className="flex justify-center gap-1.5 py-4" aria-label="Progreso del onboarding">
    {Array.from({ length: TOTAL_STEPS }, (_, i) => (
      <motion.div
        key={i}
        animate={{
          width: i + 1 === step ? 28 : 6,
          backgroundColor: i + 1 <= step ? '#0c0a09' : '#e7e5e4',
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="h-1.5 rounded-full"
      />
    ))}
  </div>
);

const StepShell = ({ step, onBack, onSkip, children }) => (
  <div className="min-h-screen bg-stone-50 flex flex-col">
    <div className="flex items-center justify-between px-6 pt-[max(16px,env(safe-area-inset-top))]">
      {onBack ? (
        <button type="button" onClick={onBack} aria-label="Volver" className="flex items-center gap-1 text-sm text-stone-500 bg-transparent border-none cursor-pointer py-2 px-3 min-h-[44px]" data-testid="onboarding-back">
          <ArrowLeft size={18} /> Atrás
        </button>
      ) : <div className="min-h-[44px] min-w-[44px]" />}
      {onSkip ? (
        <button type="button" onClick={onSkip} aria-label="Saltar este paso" className="text-sm text-stone-500 bg-transparent border-none cursor-pointer py-2 px-3 min-h-[44px]" data-testid="onboarding-skip">
          Saltar
        </button>
      ) : <div className="min-h-[44px] min-w-[44px]" />}
    </div>
    <ProgressBar step={step} />
    <div className="flex-1 flex flex-col px-6 pb-[max(24px,env(safe-area-inset-bottom))] max-w-md mx-auto w-full lg:max-w-lg">
      {children}
    </div>
  </div>
);

const PrimaryButton = ({ onClick, disabled, loading, children, testId }) => (
  <button type="button" onClick={onClick} disabled={disabled || loading} aria-disabled={disabled || loading} data-testid={testId} className="w-full h-[52px] px-6 rounded-full bg-stone-950 text-white font-semibold text-base cursor-pointer border-none flex items-center justify-center gap-2 transition-colors hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed">
    {loading ? <Loader2 size={20} className="animate-spin" /> : children}
  </button>
);

/* ── Main component ── */

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, checkAuth } = useAuth();
  const { t } = useTranslation();
  const { geo } = useIpGeo();

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [saving, setSaving] = useState(false);

  // State per step
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState(null);
  const [bio, setBio] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [discoveryMethod, setDiscoveryMethod] = useState('personalized');

  // Track onboarding start once
  const startedRef = useRef(false);
  useEffect(() => {
    if (!startedRef.current && user) { startedRef.current = true; trackEvent('onboarding_started'); }
  }, [user]);

  // Auto-fill country from IP geo
  useEffect(() => {
    if (geo?.country && !country) setCountry(geo.country);
    if (geo?.city && !city) setCity(geo.city);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo]);

  // Redirect if not auth, already onboarded, or email not verified
  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login', { replace: true }); return; }
    if (user.onboarding_completed) { navigate('/', { replace: true }); return; }
    // Require email verification before onboarding
    if (!user.email_verified) { navigate('/verify-email', { replace: true }); return; }
  }, [user, authLoading, navigate]);

  const goTo = useCallback((n) => { setDirection(n > step ? 1 : -1); setStep(n); }, [step]);
  const advance = useCallback((ev, p = {}) => { trackEvent(ev, { ...p, step }); goTo(step + 1); }, [goTo, step]);
  const skipStep = useCallback(() => { trackEvent('onboarding_step_skipped', { step }); goTo(step + 1); }, [step, goTo]);

  const handlePhotoSelect = useCallback((e) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error(t('onboarding.imagesOnly', 'Solo se permiten imágenes')); e.target.value = ''; return; }
    if (file.size > 5 * 1024 * 1024) { toast.error(t('onboarding.imageTooLarge', 'La imagen no puede superar 5 MB')); e.target.value = ''; return; }
    setProfilePhoto(file);
    const reader = new FileReader(); reader.onload = (ev) => setProfilePhotoPreview(ev.target.result); reader.readAsDataURL(file);
  }, [t]);

  const toggleInterest = (key) => setSelectedInterests((p) => p.includes(key) ? p.filter((i) => i !== key) : [...p, key]);

  const handleFinish = useCallback(async () => {
    if (saving) return; setSaving(true);
    try {
      if (profilePhoto) { try { const fd = new FormData(); fd.append('file', profilePhoto); await apiClient.post('/users/upload-avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } }); } catch { toast.error(t('onboarding.avatarFailed', 'No se pudo subir la foto, pero continuamos.')); } }
      if (country) { try { await apiClient.post('/onboarding/location', { country, city: city.trim() }); } catch { /* best-effort */ } }
      if (selectedInterests.length >= 3) { try { await apiClient.post('/onboarding/interests', { interests: selectedInterests }); } catch { /* best-effort */ } }
      const patch = { onboarding_completed: true }; if (bio.trim()) patch.bio = bio.trim(); if (discoveryMethod) patch.discovery_method = discoveryMethod;
      await apiClient.patch('/users/me', patch);
      try { await apiClient.post('/onboarding/complete'); } catch { /* non-fatal */ }
      trackEvent('onboarding_completed', { interests_count: selectedInterests.length, discovery_method: discoveryMethod, has_avatar: Boolean(profilePhoto), country });
      try { await checkAuth(); } catch { /* ignore */ }
      navigate('/', { replace: true });
    } catch (err) {
      const d = err?.response?.data?.detail;
      toast.error(typeof d === 'string' ? d : t('onboarding.saveError', 'Algo no salió bien. Inténtalo de nuevo.'));
    } finally { setSaving(false); }
  }, [saving, profilePhoto, bio, country, city, selectedInterests, discoveryMethod, checkAuth, navigate, t]);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-stone-50"><Loader2 size={32} className="animate-spin text-stone-950" /></div>;

  const firstName = (user?.name || '').split(' ')[0] || '';

  // ═══ STEP 1 — Welcome ═══
  const Step1 = (
    <StepShell step={1} onBack={null} onSkip={null}>
      <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 16, stiffness: 180 }} className="w-20 h-20 rounded-full bg-stone-950 flex items-center justify-center mb-8 ring-8 ring-stone-200">
          <Globe size={36} strokeWidth={1.8} className="text-white" />
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="text-2xl md:text-3xl font-bold text-stone-950 mb-3">
          {firstName ? t('onboarding.hello_name', 'Hola {{name}}.', { name: firstName }) : t('onboarding.hello', 'Hola.')}
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-base text-stone-600 max-w-sm mb-2">
          {t('onboarding.tagline', 'HispaloShop te conecta con quien alimenta tu mesa.')}
        </motion.p>
        <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }} className="text-sm text-stone-500 max-w-sm">
          {t('onboarding.intro', 'Vamos a personalizar tu experiencia en menos de un minuto.')}
        </motion.p>
      </div>
      <div className="pt-4">
        <PrimaryButton onClick={() => advance('onboarding_step_1_completed')} testId="onboarding-step1-next">
          {t('onboarding.letsGo', 'Empezamos')} <ArrowRight size={18} />
        </PrimaryButton>
      </div>
    </StepShell>
  );

  // ═══ STEP 2 — Profile (optional) ═══
  const Step2 = (
    <StepShell step={2} onBack={() => goTo(1)} onSkip={skipStep}>
      <div className="flex-1 flex flex-col items-center pt-4">
        <h2 className="text-2xl font-bold text-stone-950 text-center mb-2">{t('onboarding.profileTitle', 'Ponle cara a tu cuenta')}</h2>
        <p className="text-sm text-stone-500 text-center mb-8 max-w-xs">{t('onboarding.profileSubtitle', 'Opcional. Puedes añadir foto y bio ahora o más tarde.')}</p>
        <label className="cursor-pointer group mb-4" htmlFor="avatar-upload">
          <div className="w-28 h-28 rounded-full bg-stone-100 border-2 border-dashed border-stone-200 flex items-center justify-center overflow-hidden transition-colors group-hover:border-stone-400">
            {profilePhotoPreview ? <img src={profilePhotoPreview} alt="Preview" className="w-full h-full object-cover" /> : <Camera size={28} className="text-stone-400" />}
          </div>
        </label>
        <input id="avatar-upload" type="file" accept="image/*" capture="user" className="hidden" onChange={handlePhotoSelect} />
        {profilePhotoPreview && <button type="button" onClick={() => { setProfilePhoto(null); setProfilePhotoPreview(null); }} className="text-xs text-stone-500 bg-transparent border-none cursor-pointer mb-4 py-2 px-3 min-h-[44px]">{t('onboarding.removePhoto', 'Quitar foto')}</button>}
        <div className="w-full mt-2">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-stone-500" htmlFor="bio">{t('onboarding.bioLabel', 'Bio (opcional)')}</label>
            <span className={`text-xs ${bio.length > 130 ? 'text-stone-950 font-semibold' : 'text-stone-400'}`}>{bio.length}/140</span>
          </div>
          <input id="bio" type="text" value={bio} onChange={(e) => { if (e.target.value.length <= 140) setBio(e.target.value); }} placeholder={t('onboarding.bioPlaceholder', 'Una línea sobre ti')} className="w-full h-12 px-4 rounded-xl border border-stone-200 bg-white text-stone-950 text-sm focus:outline-none focus:border-stone-400 placeholder:text-stone-400" />
        </div>
      </div>
      <div className="pt-6">
        <PrimaryButton onClick={() => advance('onboarding_step_2_completed', { has_avatar: Boolean(profilePhoto) })} testId="onboarding-step2-next">
          {t('onboarding.continue', 'Continuar')} <ArrowRight size={18} />
        </PrimaryButton>
      </div>
    </StepShell>
  );

  // ═══ STEP 3 — Location (required) ═══
  const Step3 = (
    <StepShell step={3} onBack={() => goTo(2)} onSkip={null}>
      <div className="flex-1 flex flex-col pt-4">
        <h2 className="text-2xl font-bold text-stone-950 text-center mb-2">{t('onboarding.locationTitle', '¿Dónde comes?')}</h2>
        <p className="text-sm text-stone-500 text-center mb-8 max-w-xs mx-auto">{t('onboarding.locationSubtitle', 'Así podemos mostrarte productores cerca de ti.')}</p>
        <div className="space-y-4">
          <div>
            <label htmlFor="onboarding-country" className="text-xs font-medium text-stone-500 mb-1.5 block">{t('onboarding.country', 'País')} *</label>
            <div className="relative">
              <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
              <select id="onboarding-country" value={country} onChange={(e) => setCountry(e.target.value)} data-testid="onboarding-country" className="w-full h-12 pl-10 pr-4 rounded-xl border border-stone-200 bg-white text-stone-950 text-sm focus:outline-none focus:border-stone-400 appearance-none">
                <option value="">{t('onboarding.selectCountry', 'Selecciona tu país')}</option>
                {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </div>
            {geo?.source === 'ipapi' && geo?.country === country && <p className="text-xs text-stone-500 mt-1.5">{t('onboarding.autoDetected', 'Detectamos este país automáticamente. Puedes cambiarlo.')}</p>}
          </div>
          <div>
            <label htmlFor="onboarding-city" className="text-xs font-medium text-stone-500 mb-1.5 block">{t('onboarding.cityOptional', 'Ciudad (opcional)')}</label>
            <input id="onboarding-city" type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder={t('onboarding.cityPlaceholder', 'Tu ciudad')} data-testid="onboarding-city" className="w-full h-12 px-4 rounded-xl border border-stone-200 bg-white text-stone-950 text-sm focus:outline-none focus:border-stone-400 placeholder:text-stone-400" />
          </div>
        </div>
      </div>
      <div className="pt-6">
        <PrimaryButton onClick={() => advance('onboarding_step_3_completed', { country })} disabled={!country} testId="onboarding-step3-next">
          {t('onboarding.continue', 'Continuar')} <ArrowRight size={18} />
        </PrimaryButton>
      </div>
    </StepShell>
  );

  // ═══ STEP 4 — Interests (required, min 3) ═══
  const Step4 = (
    <StepShell step={4} onBack={() => goTo(3)} onSkip={null}>
      <div className="flex-1 flex flex-col pt-4">
        <h2 className="text-2xl font-bold text-stone-950 text-center mb-2">{t('onboarding.interestsTitle', '¿Qué te apasiona comer?')}</h2>
        <p className="text-sm text-stone-500 text-center mb-2 max-w-xs mx-auto">{t('onboarding.interestsSubtitle', 'Elige al menos 3. Puedes cambiarlo cuando quieras.')}</p>
        <p className="text-xs text-stone-400 text-center mb-6">
          {selectedInterests.length >= 3
            ? t('onboarding.selectedN', '{{n}} seleccionados', { n: selectedInterests.length })
            : t('onboarding.selectMore', '{{n}} de 3 mínimo', { n: selectedInterests.length })}
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          {INTERESTS.map((key) => {
            const selected = selectedInterests.includes(key);
            return (
              <motion.button key={key} type="button" whileTap={{ scale: 0.97 }} onClick={() => toggleInterest(key)} aria-pressed={selected} data-testid={`onboarding-interest-${key}`} className={`min-h-[48px] px-4 py-3 rounded-2xl text-sm font-medium cursor-pointer border transition-colors ${selected ? 'bg-stone-950 text-white border-stone-950' : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300'}`}>
                {t(`onboarding.interest.${key}`, key)}
              </motion.button>
            );
          })}
        </div>
      </div>
      <div className="pt-6">
        <PrimaryButton onClick={() => advance('onboarding_step_4_completed', { interests_count: selectedInterests.length })} disabled={selectedInterests.length < 3} testId="onboarding-step4-next">
          {t('onboarding.continue', 'Continuar')} <ArrowRight size={18} />
        </PrimaryButton>
      </div>
    </StepShell>
  );

  // ═══ STEP 5 — Discovery (skippable) ═══
  const DISCOVERY_OPTIONS = useMemo(() => [
    { value: 'personalized', label: t('onboarding.discoveryPersonalized', 'Personalizado'), description: t('onboarding.discoveryPersonalizedDesc', 'Sugerencias que encajan con lo que te gusta.'), icon: Sparkles },
    { value: 'popular', label: t('onboarding.discoveryPopular', 'Popular'), description: t('onboarding.discoveryPopularDesc', 'Lo que más gusta a la comunidad.'), icon: TrendingUp },
    { value: 'local', label: t('onboarding.discoveryLocal', 'Local'), description: t('onboarding.discoveryLocalDesc', 'Productores cerca de ti.'), icon: MapPin },
    { value: 'rated', label: t('onboarding.discoveryRated', 'Valorado'), description: t('onboarding.discoveryRatedDesc', 'Primero lo mejor puntuado.'), icon: Star },
  ], [t]);

  const Step5 = (
    <StepShell step={5} onBack={() => goTo(4)} onSkip={() => advance('onboarding_step_5_skipped')}>
      <div className="flex-1 flex flex-col pt-4">
        <h2 className="text-2xl font-bold text-stone-950 text-center mb-2">{t('onboarding.discoveryTitle', '¿Cómo quieres empezar?')}</h2>
        <p className="text-sm text-stone-500 text-center mb-6 max-w-xs mx-auto">{t('onboarding.discoverySubtitle', 'Así ordenamos tu primer feed. Lo cambias cuando quieras.')}</p>
        <div className="space-y-3">
          {DISCOVERY_OPTIONS.map((opt) => {
            const Icon = opt.icon; const sel = discoveryMethod === opt.value;
            return (
              <button key={opt.value} type="button" onClick={() => setDiscoveryMethod(opt.value)} aria-pressed={sel} data-testid={`onboarding-discovery-${opt.value}`} className={`w-full flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors ${sel ? 'border-stone-950 bg-stone-100' : 'border-stone-200 bg-white hover:border-stone-300'}`}>
                <div className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl ${sel ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-700'}`}><Icon size={20} /></div>
                <div className="flex-1"><p className="font-semibold text-stone-950">{opt.label}</p><p className="mt-0.5 text-sm text-stone-500">{opt.description}</p></div>
              </button>
            );
          })}
        </div>
      </div>
      <div className="pt-6">
        <PrimaryButton onClick={() => advance('onboarding_step_5_completed', { discovery_method: discoveryMethod })} testId="onboarding-step5-next">
          {t('onboarding.continue', 'Continuar')} <ArrowRight size={18} />
        </PrimaryButton>
      </div>
    </StepShell>
  );

  // ═══ STEP 6 — Confirm ═══
  const Step6 = (
    <StepShell step={6} onBack={() => goTo(5)} onSkip={null}>
      <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 14, stiffness: 200, delay: 0.1 }} className="w-20 h-20 rounded-full bg-stone-950 flex items-center justify-center mb-8 ring-8 ring-stone-200">
          <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35, type: 'spring', damping: 12, stiffness: 200 }}>
            <Check size={36} color="#fff" strokeWidth={2.6} />
          </motion.div>
        </motion.div>
        <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="text-2xl md:text-3xl font-bold text-stone-950 mb-3">{t('onboarding.readyTitle', '¡Listo!')}</motion.h2>
        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="text-base text-stone-600 max-w-sm mb-2">{t('onboarding.readySubtitle', 'Tu HispaloShop ya está personalizado.')}</motion.p>
        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.58 }} className="text-sm text-stone-500 max-w-sm">{t('onboarding.readyHint', 'Lo siguiente es explorar productores y descubrir sus historias.')}</motion.p>
      </div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}>
        <PrimaryButton onClick={handleFinish} loading={saving} testId="onboarding-finish">
          {t('onboarding.startExploring', 'Empezar a explorar')}
        </PrimaryButton>
      </motion.div>
    </StepShell>
  );

  // ═══ Render ═══
  const steps = { 1: Step1, 2: Step2, 3: Step3, 4: Step4, 5: Step5, 6: Step6 };
  return (
    <div className="overflow-hidden">
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div key={step} custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ type: 'spring', damping: 25, stiffness: 200 }}>
          {steps[step]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
