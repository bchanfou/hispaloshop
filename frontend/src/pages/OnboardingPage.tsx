// @ts-nocheck
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Loader2, Check, Camera, MapPin,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api/client';

/* ── Constants ── */
const TOTAL_STEPS = 3;

const INTERESTS = [
  'Aceites', 'Mieles', 'Quesos', 'Vinos', 'Conservas', 'Embutidos',
  'Especias', 'Frutas', 'Verduras', 'Panadería', 'Repostería', 'Bebidas',
  'Snacks', 'Superfoods', 'Bio/Ecológico', 'Sin gluten',
];

const ROLE_WELCOME_SUBTITLES = {
  consumer: 'Descubre productos artesanales únicos de productores locales.',
  customer: 'Descubre productos artesanales únicos de productores locales.',
  producer: 'Tu tienda está lista. Empieza a vender tus productos artesanales.',
  influencer: 'Conecta con marcas y empieza a crear contenido que inspira.',
  importer: 'Explora el marketplace B2B y encuentra los mejores productores.',
};

const slideVariants = {
  enter: (dir) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir < 0 ? 80 : -80, opacity: 0 }),
};

/* ── Shared Components ── */
const ProgressBar = ({ step }) => (
  <div className="flex justify-center gap-1.5 py-4">
    {Array.from({ length: TOTAL_STEPS }, (_, i) => (
      <motion.div
        key={i}
        animate={{
          width: i + 1 === step ? 24 : 6,
          backgroundColor: i + 1 <= step ? '#0c0a09' : '#e7e5e4',
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="h-1.5 rounded-full"
      />
    ))}
  </div>
);

const StepShell = ({ step, onBack, onSkip, children }) => (
  <div className="min-h-screen bg-stone-50 flex flex-col" style={{ fontFamily: 'inherit' }}>
    {/* Header row */}
    <div className="flex items-center justify-between px-6 pt-4 pb-0">
      {onBack ? (
        <button
          onClick={onBack}
          aria-label="Volver al paso anterior"
          className="flex items-center gap-1 text-sm text-stone-500 bg-transparent border-none cursor-pointer py-2 px-3 min-h-[44px]"
          style={{ fontFamily: 'inherit' }}
        >
          <ArrowLeft size={18} /> Atrás
        </button>
      ) : <div />}
      {onSkip ? (
        <button
          onClick={onSkip}
          className="text-sm text-stone-500 bg-transparent border-none cursor-pointer py-2 px-3 min-h-[44px]"
          style={{ fontFamily: 'inherit' }}
          aria-label="Saltar este paso"
        >
          Saltar
        </button>
      ) : <div />}
    </div>
    <ProgressBar step={step} />
    <div className="flex-1 flex flex-col px-6 pb-10 max-w-md mx-auto w-full">
      {children}
    </div>
  </div>
);

const PrimaryButton = ({ onClick, disabled, loading, children, className = '' }) => (
  <button
    onClick={onClick}
    disabled={disabled || loading}
    aria-disabled={disabled || loading}
    className={`w-full rounded-full bg-stone-950 text-white font-semibold text-base cursor-pointer border-none flex items-center justify-center gap-2 transition-colors hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    style={{ fontFamily: 'inherit', height: 52, padding: '0 24px' }}
  >
    {loading ? <Loader2 size={20} className="animate-spin" /> : children}
  </button>
);

/* ── Main Component ── */
export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, checkAuth } = useAuth();

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 2: Interests
  const [selectedInterests, setSelectedInterests] = useState([]);

  // Step 1: Profile personalization
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');

  // Redirect if not authenticated or already onboarded
  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login', { replace: true }); return; }
    if (user.onboarding_completed) { navigate('/', { replace: true }); }
  }, [user, authLoading, navigate]);

  const goTo = useCallback((s) => {
    setDirection(s > step ? 1 : -1);
    setStep(s);
  }, [step]);

  const handlePhotoSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfilePhoto(file);
    const reader = new FileReader();
    reader.onload = (ev) => setProfilePhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  }, []);

  const handleFinish = useCallback(async () => {
    setSaving(true);
    try {
      // Upload photo if selected
      if (profilePhoto) {
        const formData = new FormData();
        formData.append('file', profilePhoto);
        try {
          await apiClient.post('/users/me/avatar', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch {
          // non-blocking
        }
      }

      // Save profile details + interests + mark onboarding complete (single call)
      const patchData = { onboarding_completed: true };
      if (displayName.trim()) patchData.display_name = displayName.trim();
      if (bio.trim()) patchData.bio = bio.trim();
      if (location.trim()) patchData.location = location.trim();
      if (selectedInterests.length > 0) {
        patchData.food_preferences = selectedInterests.map(i => i.toLowerCase().replace(/\//g, '-'));
      }

      await apiClient.patch('/users/me', patchData);

      try { await checkAuth(); } catch { /* ignore — token already set */ }

      const role = user?.role || 'customer';
      const roleDestinations = {
        producer:   '/producer/verification',
        influencer: '/influencer/fiscal-setup',
        importer:   '/importer/dashboard',
        customer:   '/discover',
      };
      navigate(roleDestinations[role] || '/', { replace: true });
    } catch (err) {
      toast.error(typeof err?.response?.data?.detail === 'string' ? err.response.data.detail : 'Error al guardar tu perfil. Inténtalo de nuevo.');
      setSaving(false);
      return;
    }
  }, [profilePhoto, displayName, bio, location, selectedInterests, checkAuth, navigate, user]);

  const handleSkip = useCallback(() => {
    if (step < TOTAL_STEPS) {
      goTo(step + 1);
    }
  }, [step, goTo]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-950">
        <Loader2 size={32} color="#fff" className="animate-spin" />
      </div>
    );
  }

  /* ═══════════════ STEP 1: Personalización ═══════════════ */
  const Step1 = (
    <StepShell step={1} onBack={null} onSkip={() => goTo(2)}>
      <div className="flex-1 flex flex-col items-center pt-6">
        <h2 className="text-2xl font-bold text-stone-950 text-center mb-1">
          Personaliza tu perfil
        </h2>
        <p className="text-sm text-stone-500 text-center mb-8">
          Esto es lo que verán otros usuarios
        </p>

        {/* Avatar upload */}
        <label className="cursor-pointer group mb-6" htmlFor="avatar-upload">
          <div className="w-24 h-24 rounded-full bg-stone-100 border-2 border-dashed border-stone-200 flex items-center justify-center overflow-hidden transition-colors group-hover:border-stone-400">
            {profilePhotoPreview ? (
              <img src={profilePhotoPreview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <Camera size={28} className="text-stone-400" />
            )}
          </div>
        </label>
        <input
          id="avatar-upload"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoSelect}
        />

        {profilePhotoPreview && (
          <button
            onClick={() => { setProfilePhoto(null); setProfilePhotoPreview(null); }}
            aria-label="Eliminar foto de perfil"
            className="text-xs text-stone-500 bg-transparent border-none cursor-pointer mb-4 py-2 px-3 min-h-[44px] flex items-center"
            style={{ fontFamily: 'inherit' }}
          >
            Eliminar foto
          </button>
        )}

        {/* Display name */}
        <div className="w-full mb-4">
          <label className="text-xs font-medium text-stone-500 mb-1.5 block">Nombre visible</label>
          <input
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Tu nombre o alias"
            className="w-full h-12 px-4 rounded-xl border border-stone-200 bg-white text-stone-950 text-sm focus:outline-none focus:border-stone-400 placeholder:text-stone-400"
            style={{ fontFamily: 'inherit' }}
          />
        </div>

        {/* Bio */}
        <div className="w-full mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-stone-500">Bio</label>
            <span className={`text-xs ${bio.length > 140 ? 'text-stone-950 font-semibold' : 'text-stone-400'}`}>
              {bio.length}/150
            </span>
          </div>
          <textarea
            value={bio}
            onChange={e => { if (e.target.value.length <= 150) setBio(e.target.value); }}
            placeholder="Cuentanos algo sobre ti..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-950 text-sm focus:outline-none focus:border-stone-400 placeholder:text-stone-400 resize-none"
            style={{ fontFamily: 'inherit' }}
          />
        </div>

        {/* Location */}
        <div className="w-full">
          <label className="text-xs font-medium text-stone-500 mb-1.5 block">Ubicación (opcional)</label>
          <div className="relative">
            <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Tu ciudad"
              className="w-full h-12 pl-10 pr-4 rounded-xl border border-stone-200 bg-white text-stone-950 text-sm focus:outline-none focus:border-stone-400 placeholder:text-stone-400"
              style={{ fontFamily: 'inherit' }}
            />
          </div>
        </div>
      </div>

      <div className="mt-8">
        <PrimaryButton onClick={() => goTo(2)}>
          Siguiente
        </PrimaryButton>
      </div>
    </StepShell>
  );

  /* ═══════════════ STEP 2: Intereses ═══════════════ */
  const toggleInterest = (name) => {
    setSelectedInterests(prev =>
      prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]
    );
  };

  const Step2 = (
    <StepShell step={2} onBack={() => goTo(1)} onSkip={() => { setSelectedInterests([]); goTo(3); }}>
      <div className="flex-1 flex flex-col items-center pt-6">
        <h2 className="text-2xl font-bold text-stone-950 text-center mb-1">
          Que te interesa?
        </h2>
        <p className="text-sm text-stone-500 text-center mb-8">
          Selecciona al menos 3 categorias
        </p>

        <div className="flex flex-wrap gap-2.5 justify-center">
          {INTERESTS.map(name => {
            const selected = selectedInterests.includes(name);
            return (
              <motion.button
                key={name}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleInterest(name)}
                aria-label={`${selected ? 'Quitar' : 'Seleccionar'} ${name}`}
                aria-pressed={selected}
                className={`px-4 py-3 min-h-[44px] rounded-full text-sm font-medium cursor-pointer border transition-all ${
                  selected
                    ? 'bg-stone-950 text-white border-stone-950'
                    : 'bg-stone-100 text-stone-600 border-transparent hover:bg-stone-200'
                }`}
                style={{ fontFamily: 'inherit' }}
              >
                {name}
              </motion.button>
            );
          })}
        </div>

        {selectedInterests.length > 0 && (
          <p className="text-sm text-stone-500 mt-4">
            {selectedInterests.length} seleccionados
          </p>
        )}
      </div>

      <div className="mt-8">
        <PrimaryButton
          onClick={() => goTo(3)}
          disabled={selectedInterests.length < 3}
        >
          Siguiente
        </PrimaryButton>
      </div>
    </StepShell>
  );

  /* ═══════════════ STEP 3: Bienvenida ═══════════════ */
  const userRole = user?.role || 'customer';

  const Step3 = (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-6" style={{ fontFamily: 'inherit' }}>
      <ProgressBar step={3} />

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 15, stiffness: 200, delay: 0.1 }}
        className="w-16 h-16 rounded-full bg-stone-950 flex items-center justify-center mb-8 ring-8 ring-stone-200"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.35, type: 'spring', damping: 12, stiffness: 200 }}
        >
          <Check size={32} color="#fff" strokeWidth={2.5} />
        </motion.div>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-2xl font-bold text-stone-950 text-center mb-2"
      >
        Bienvenido a HispaloShop!
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-sm text-stone-500 text-center mb-12 max-w-xs"
      >
        {ROLE_WELCOME_SUBTITLES[userRole] || ROLE_WELCOME_SUBTITLES.customer}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <button
          onClick={handleFinish}
          disabled={saving}
          aria-disabled={saving}
          aria-label="Empezar a usar Hispaloshop"
          className="bg-stone-950 text-white rounded-full px-12 py-3 min-h-[44px] text-base font-semibold border-none cursor-pointer transition-colors hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ fontFamily: 'inherit' }}
        >
          {saving ? <Loader2 size={20} className="animate-spin" /> : 'Empezar'}
        </button>
      </motion.div>
    </div>
  );

  /* ═══════════════ Render ═══════════════ */
  const steps = { 1: Step1, 2: Step2, 3: Step3 };

  return (
    <div className="overflow-hidden">
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        >
          {steps[step]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
