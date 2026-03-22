// @ts-nocheck
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Loader2, Check, ShoppingCart, Wheat, Star, Globe,
  Camera, MapPin,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api/client';

/* ── Constants ── */
const TOTAL_STEPS = 4;

const ROLES = [
  { id: 'consumer', icon: <ShoppingCart size={24} />, label: 'Consumidor', desc: 'Descubrir y comprar productos artesanales' },
  { id: 'producer', icon: <Wheat size={24} />, label: 'Productor', desc: 'Vender tus productos artesanales' },
  { id: 'influencer', icon: <Star size={24} />, label: 'Influencer', desc: 'Crear contenido y ganar comisiones' },
  { id: 'importer', icon: <Globe size={24} />, label: 'Importador', desc: 'Importar o distribuir productos' },
];

const INTERESTS = [
  'Aceites', 'Mieles', 'Quesos', 'Vinos', 'Conservas', 'Embutidos',
  'Especias', 'Frutas', 'Verduras', 'Panadería', 'Repostería', 'Bebidas',
  'Snacks', 'Superfoods', 'Bio/Ecológico', 'Sin gluten',
];

const ROLE_WELCOME_SUBTITLES = {
  consumer: 'Descubre productos artesanales únicos de productores locales.',
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
          className="flex items-center gap-1 text-sm text-stone-500 bg-transparent border-none cursor-pointer p-0"
          style={{ fontFamily: 'inherit' }}
        >
          <ArrowLeft size={18} /> Atrás
        </button>
      ) : <div />}
      {onSkip ? (
        <button
          onClick={onSkip}
          className="text-sm text-stone-500 bg-transparent border-none cursor-pointer p-0"
          style={{ fontFamily: 'inherit' }}
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

  // Step 1: Role
  const [selectedRole, setSelectedRole] = useState('');

  // Step 2: Interests
  const [selectedInterests, setSelectedInterests] = useState([]);

  // Step 3: Profile personalization
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');

  // Redirect if not authenticated or already onboarded
  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login', { replace: true }); return; }
    if (user.role && user.role !== 'customer') { navigate('/', { replace: true }); return; }
    if (user.role === 'customer' && user.onboarding_completed) { navigate('/', { replace: true }); }
  }, [user, authLoading, navigate]);

  const goTo = useCallback((s) => {
    setDirection(s > step ? 1 : -1);
    setStep(s);
  }, [step]);

  // Save progress to API silently
  const saveProgress = useCallback(async (data) => {
    try {
      await apiClient.post('/users/me/onboarding', data);
    } catch {
      // silent — best effort
    }
  }, []);

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

      // Save profile details if provided
      const profileData = {};
      if (displayName.trim()) profileData.display_name = displayName.trim();
      if (bio.trim()) profileData.bio = bio.trim();
      if (location.trim()) profileData.location = location.trim();

      if (Object.keys(profileData).length > 0) {
        try {
          await apiClient.patch('/users/me', profileData);
        } catch {
          // non-blocking
        }
      }

      await apiClient.post('/auth/set-role', {
        role: selectedRole,
        preferences: selectedInterests.map(i => i.toLowerCase().replace(/\//g, '-')),
      });
      await saveProgress({ step: 4, completed: true });
      await checkAuth();

      if (selectedRole === 'producer') {
        navigate('/producer/verification', { replace: true });
      } else if (selectedRole === 'influencer') {
        navigate('/influencer/fiscal-setup', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Error al guardar tu perfil. Inténtalo de nuevo.');
      navigate('/', { replace: true });
    } finally {
      setSaving(false);
    }
  }, [profilePhoto, displayName, bio, location, selectedRole, selectedInterests, saveProgress, checkAuth, navigate]);

  const handleSkip = useCallback(() => {
    if (step < TOTAL_STEPS) {
      saveProgress({ step, skipped: true });
      goTo(step + 1);
    }
  }, [step, goTo, saveProgress]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-950">
        <Loader2 size={32} color="#fff" className="animate-spin" />
      </div>
    );
  }

  /* ═══════════════ STEP 1: Role Selection ═══════════════ */
  const Step1 = (
    <StepShell step={1} onBack={null} onSkip={null}>
      <div className="flex-1 flex flex-col items-center pt-6">
        <h2 className="text-2xl font-bold text-stone-950 text-center mb-1">
          ¿Cómo quieres participar?
        </h2>
        <p className="text-sm text-stone-500 text-center mb-8">
          Siempre puedes cambiar esto más adelante
        </p>

        <div className="grid grid-cols-2 gap-3 w-full">
          {ROLES.map(role => {
            const selected = selectedRole === role.id;
            return (
              <motion.button
                key={role.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelectedRole(role.id)}
                className={`relative flex flex-col items-center text-center rounded-2xl p-5 cursor-pointer transition-all border-2 bg-white ${
                  selected ? 'border-stone-950' : 'border-stone-200 hover:border-stone-200'
                }`}
                style={{ fontFamily: 'inherit' }}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                  selected ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-700'
                }`}>
                  {role.icon}
                </div>
                <span className="text-sm font-semibold text-stone-950">{role.label}</span>
                <span className="text-xs text-stone-500 mt-1 leading-snug">{role.desc}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="mt-8">
        <PrimaryButton
          onClick={() => { saveProgress({ step: 1, role: selectedRole }); goTo(2); }}
          disabled={!selectedRole}
        >
          Siguiente
        </PrimaryButton>
      </div>
    </StepShell>
  );

  /* ═══════════════ STEP 2: Interests / Preferences ═══════════════ */
  const toggleInterest = (name) => {
    setSelectedInterests(prev =>
      prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]
    );
  };

  const Step2 = (
    <StepShell step={2} onBack={() => goTo(1)} onSkip={() => { setSelectedInterests([]); saveProgress({ step: 2, skipped: true }); goTo(3); }}>
      <div className="flex-1 flex flex-col items-center pt-6">
        <h2 className="text-2xl font-bold text-stone-950 text-center mb-1">
          ¿Qué te interesa?
        </h2>
        <p className="text-sm text-stone-500 text-center mb-8">
          Selecciona al menos 3 categorías
        </p>

        <div className="flex flex-wrap gap-2.5 justify-center">
          {INTERESTS.map(name => {
            const selected = selectedInterests.includes(name);
            return (
              <motion.button
                key={name}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleInterest(name)}
                className={`px-4 py-2.5 rounded-full text-sm font-medium cursor-pointer border transition-all ${
                  selected
                    ? 'bg-stone-950 text-white border-stone-950'
                    : 'bg-stone-100 text-stone-700 border-transparent hover:bg-stone-200'
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
          onClick={() => { saveProgress({ step: 2, interests: selectedInterests }); goTo(3); }}
          disabled={selectedInterests.length < 3}
        >
          Siguiente
        </PrimaryButton>
      </div>
    </StepShell>
  );

  /* ═══════════════ STEP 3: Personalización ═══════════════ */
  const Step3 = (
    <StepShell step={3} onBack={() => goTo(2)} onSkip={() => { saveProgress({ step: 3, skipped: true }); goTo(4); }}>
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
            className="text-xs text-stone-500 bg-transparent border-none cursor-pointer mb-4"
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
            placeholder="Cuéntanos algo sobre ti..."
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
        <PrimaryButton onClick={() => { saveProgress({ step: 3, displayName, bio, location }); goTo(4); }}>
          Siguiente
        </PrimaryButton>
      </div>
    </StepShell>
  );

  /* ═══════════════ STEP 4: Bienvenida ═══════════════ */
  const Step4 = (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-6" style={{ fontFamily: 'inherit' }}>
      <ProgressBar step={4} />

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
        ¡Bienvenido a HispaloShop!
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-sm text-stone-500 text-center mb-12 max-w-xs"
      >
        {ROLE_WELCOME_SUBTITLES[selectedRole] || ROLE_WELCOME_SUBTITLES.consumer}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <button
          onClick={handleFinish}
          disabled={saving}
          className="bg-stone-950 text-white rounded-full px-12 py-3 text-base font-semibold border-none cursor-pointer transition-colors hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ fontFamily: 'inherit' }}
        >
          {saving ? <Loader2 size={20} className="animate-spin" /> : 'Empezar'}
        </button>
      </motion.div>
    </div>
  );

  /* ═══════════════ Render ═══════════════ */
  const steps = { 1: Step1, 2: Step2, 3: Step3, 4: Step4 };

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
