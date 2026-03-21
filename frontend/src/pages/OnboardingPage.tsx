// @ts-nocheck
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Loader2, Check, UserPlus, ShoppingCart, Wheat, Star, Globe,
  Camera, MapPin, Building2, Instagram, Youtube, Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api/client';

/* ── Constants ── */
const TOTAL_STEPS = 6;

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

const COMPANY_SIZES = [
  { id: 'artesano', label: 'Artesano' },
  { id: 'pequeno', label: 'Pequeño' },
  { id: 'mediano', label: 'Mediano' },
  { id: 'grande', label: 'Grande' },
];

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: <Instagram size={18} /> },
  { id: 'tiktok', label: 'TikTok', icon: <Users size={18} /> },
  { id: 'youtube', label: 'YouTube', icon: <Youtube size={18} /> },
];

const FOLLOWER_RANGES = ['1K–5K', '5K–25K', '25K–100K', '100K+'];

const IMPORTER_COUNTRIES = [
  'España', 'Francia', 'Alemania', 'Italia', 'Portugal',
  'Reino Unido', 'Países Bajos', 'Bélgica', 'Suiza', 'EE.UU.',
];

const ROLE_LABELS = {
  producer: 'Productor', influencer: 'Influencer', consumer: 'Consumidor', importer: 'Importador',
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

const PrimaryButton = ({ onClick, disabled, loading, children }) => (
  <button
    onClick={onClick}
    disabled={disabled || loading}
    className="w-full rounded-full bg-stone-950 text-white font-semibold text-base cursor-pointer border-none flex items-center justify-center gap-2 transition-colors hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed"
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

  // Step 1: Profile photo
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState(null);

  // Step 2: Role
  const [selectedRole, setSelectedRole] = useState('');

  // Step 3: Interests
  const [selectedInterests, setSelectedInterests] = useState([]);

  // Step 4: Suggested accounts
  const [suggestions, setSuggestions] = useState([]);
  const [sugLoading, setSugLoading] = useState(false);
  const [followedIds, setFollowedIds] = useState(new Set());
  const sugFetched = useRef(false);

  // Step 5: Role config
  const [roleConfig, setRoleConfig] = useState({
    city: '', country: 'España',
    companyName: '', companySize: '',
    platforms: [], followerRange: '',
    importerCompany: '', importerCountries: [],
  });

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

  // Fetch suggestions when reaching step 4
  useEffect(() => {
    if (step !== 4 || sugFetched.current) return;
    sugFetched.current = true;
    setSugLoading(true);
    const prefs = selectedInterests.map(i => i.toLowerCase().replace(/\//g, '-')).join(',');
    apiClient.get(`/discovery/suggested-users?context=onboarding&limit=8${prefs ? `&preferences=${prefs}` : ''}`)
      .then(data => setSuggestions(data?.users || []))
      .catch(() => setSuggestions([]))
      .finally(() => setSugLoading(false));
  }, [step, selectedInterests]);

  const handleFollow = useCallback(async (userId) => {
    try {
      await apiClient.post(`/users/${userId}/follow`, {});
      setFollowedIds(prev => new Set([...prev, userId]));
    } catch {
      toast.error('No se pudo seguir a este usuario');
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

      await apiClient.post('/auth/set-role', {
        role: selectedRole,
        preferences: selectedInterests.map(i => i.toLowerCase().replace(/\//g, '-')),
        role_config: roleConfig,
      });
      await saveProgress({ step: 6, completed: true });
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
  }, [profilePhoto, selectedRole, selectedInterests, roleConfig, saveProgress, checkAuth, navigate]);

  const handleSkip = useCallback(() => {
    // Skip jumps to next step, or finishes if on last content step
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

  /* ═══════════════ STEP 1: Profile Photo ═══════════════ */
  const Step1 = (
    <StepShell step={1} onSkip={() => { saveProgress({ step: 1, skipped: true }); goTo(2); }}>
      <div className="flex-1 flex flex-col items-center justify-center">
        <label className="cursor-pointer group" htmlFor="avatar-upload">
          <div
            className="w-[120px] h-[120px] rounded-full bg-stone-100 border-2 border-dashed border-stone-200 flex items-center justify-center overflow-hidden transition-colors group-hover:border-stone-400"
          >
            {profilePhotoPreview ? (
              <img src={profilePhotoPreview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <Camera size={36} className="text-stone-400" />
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

        <h2 className="text-2xl font-bold text-stone-950 text-center mt-8 mb-2">
          Añadir foto de perfil
        </h2>
        <p className="text-sm text-stone-500 text-center mb-10">
          Ayuda a que la gente te reconozca
        </p>

        {profilePhotoPreview && (
          <button
            onClick={() => { setProfilePhoto(null); setProfilePhotoPreview(null); }}
            className="text-sm text-stone-500 bg-transparent border-none cursor-pointer mb-6"
            style={{ fontFamily: 'inherit' }}
          >
            Eliminar foto
          </button>
        )}
      </div>

      <PrimaryButton onClick={() => { saveProgress({ step: 1, photo: !!profilePhoto }); goTo(2); }}>
        {profilePhotoPreview ? 'Siguiente' : 'Continuar sin foto'}
      </PrimaryButton>
    </StepShell>
  );

  /* ═══════════════ STEP 2: Role Selection ═══════════════ */
  const Step2 = (
    <StepShell step={2} onBack={() => goTo(1)} onSkip={null}>
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
                  selected ? 'border-stone-950' : 'border-stone-200 hover:border-stone-300'
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
          onClick={() => { saveProgress({ step: 2, role: selectedRole }); goTo(3); }}
          disabled={!selectedRole}
        >
          Siguiente
        </PrimaryButton>
      </div>
    </StepShell>
  );

  /* ═══════════════ STEP 3: Interests ═══════════════ */
  const toggleInterest = (name) => {
    setSelectedInterests(prev =>
      prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]
    );
  };

  const Step3 = (
    <StepShell step={3} onBack={() => goTo(2)} onSkip={() => { setSelectedInterests([]); saveProgress({ step: 3, skipped: true }); goTo(4); }}>
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
          onClick={() => { saveProgress({ step: 3, interests: selectedInterests }); goTo(4); }}
          disabled={selectedInterests.length < 3}
        >
          Siguiente
        </PrimaryButton>
      </div>
    </StepShell>
  );

  /* ═══════════════ STEP 4: Suggested Accounts ═══════════════ */

  const Step4 = (
    <StepShell step={4} onBack={() => goTo(3)} onSkip={() => { saveProgress({ step: 4, skipped: true }); goTo(5); }}>
      <div className="flex-1 flex flex-col items-center pt-6">
        <h2 className="text-2xl font-bold text-stone-950 text-center mb-1">
          Cuentas sugeridas
        </h2>
        <p className="text-sm text-stone-500 text-center mb-8">
          Sigue a creadores y productores para llenar tu feed
        </p>

        {sugLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={24} className="text-stone-400 animate-spin" />
          </div>
        ) : suggestions.length === 0 ? (
          <p className="text-center text-sm text-stone-500 py-12">
            No hay sugerencias disponibles ahora
          </p>
        ) : (
          <div className="w-full space-y-3">
            {suggestions.map(u => {
              const isFollowed = followedIds.has(u.user_id);
              return (
                <div key={u.user_id} className="flex items-center gap-3 w-full">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-stone-100 flex-shrink-0">
                    {u.profile_image ? (
                      <img src={u.profile_image} alt={u.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg font-bold text-stone-500">
                        {(u.name || '?')[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-stone-950 truncate">{u.name}</p>
                    <p className="text-xs text-stone-500">
                      {u.username ? `@${u.username}` : (ROLE_LABELS[u.role] || u.role)}
                    </p>
                  </div>
                  <button
                    onClick={() => !isFollowed && handleFollow(u.user_id)}
                    disabled={isFollowed}
                    className={`flex-shrink-0 h-9 px-5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                      isFollowed
                        ? 'bg-stone-950 text-white border-stone-950'
                        : 'bg-transparent text-stone-950 border-stone-200 hover:border-stone-400'
                    }`}
                    style={{ fontFamily: 'inherit' }}
                  >
                    {isFollowed ? 'Siguiendo' : 'Seguir'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-8">
        <PrimaryButton onClick={() => { saveProgress({ step: 4, followed: [...followedIds] }); goTo(5); }}>
          {followedIds.size > 0 ? `Siguiente (${followedIds.size} seguidos)` : 'Siguiente'}
        </PrimaryButton>
      </div>
    </StepShell>
  );

  /* ═══════════════ STEP 5: Role Config ═══════════════ */
  const updateConfig = (key, val) => setRoleConfig(prev => ({ ...prev, [key]: val }));

  const toggleArrayItem = (key, val) => {
    setRoleConfig(prev => {
      const arr = prev[key];
      return { ...prev, [key]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] };
    });
  };

  const ConsumerConfig = (
    <>
      <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mb-6 mx-auto">
        <MapPin size={24} className="text-stone-700" />
      </div>
      <h2 className="text-2xl font-bold text-stone-950 text-center mb-1">
        ¿Dónde te gustaría recibir pedidos?
      </h2>
      <p className="text-sm text-stone-500 text-center mb-8">
        Para mostrarte productores cercanos
      </p>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-stone-500 mb-1.5 block">País</label>
          <input
            type="text"
            value={roleConfig.country}
            onChange={e => updateConfig('country', e.target.value)}
            className="w-full h-12 px-4 rounded-2xl border border-stone-200 bg-white text-stone-950 text-sm focus:outline-none focus:border-stone-400"
            style={{ fontFamily: 'inherit' }}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-stone-500 mb-1.5 block">Ciudad</label>
          <input
            type="text"
            value={roleConfig.city}
            onChange={e => updateConfig('city', e.target.value)}
            placeholder="Ej: Sevilla"
            className="w-full h-12 px-4 rounded-2xl border border-stone-200 bg-white text-stone-950 text-sm focus:outline-none focus:border-stone-400 placeholder:text-stone-400"
            style={{ fontFamily: 'inherit' }}
          />
        </div>
      </div>
    </>
  );

  const ProducerConfig = (
    <>
      <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mb-6 mx-auto">
        <Building2 size={24} className="text-stone-700" />
      </div>
      <h2 className="text-2xl font-bold text-stone-950 text-center mb-1">
        Cuéntanos sobre tu negocio
      </h2>
      <p className="text-sm text-stone-500 text-center mb-8">
        Esto nos ayuda a personalizar tu experiencia
      </p>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-stone-500 mb-1.5 block">Nombre de empresa</label>
          <input
            type="text"
            value={roleConfig.companyName}
            onChange={e => updateConfig('companyName', e.target.value)}
            placeholder="Ej: Aceites del Sur"
            className="w-full h-12 px-4 rounded-2xl border border-stone-200 bg-white text-stone-950 text-sm focus:outline-none focus:border-stone-400 placeholder:text-stone-400"
            style={{ fontFamily: 'inherit' }}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-stone-500 mb-1.5 block">Tamaño</label>
          <div className="grid grid-cols-2 gap-2">
            {COMPANY_SIZES.map(s => (
              <button
                key={s.id}
                onClick={() => updateConfig('companySize', s.id)}
                className={`h-11 rounded-2xl text-sm font-medium cursor-pointer border transition-all ${
                  roleConfig.companySize === s.id
                    ? 'bg-stone-950 text-white border-stone-950'
                    : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400'
                }`}
                style={{ fontFamily: 'inherit' }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );

  const InfluencerConfig = (
    <>
      <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mb-6 mx-auto">
        <Star size={24} className="text-stone-700" />
      </div>
      <h2 className="text-2xl font-bold text-stone-950 text-center mb-1">
        Tu perfil de creador
      </h2>
      <p className="text-sm text-stone-500 text-center mb-8">
        Cuéntanos dónde creas contenido
      </p>
      <div className="space-y-6">
        <div>
          <label className="text-xs font-medium text-stone-500 mb-2 block">Plataformas</label>
          <div className="flex gap-2">
            {PLATFORMS.map(p => (
              <button
                key={p.id}
                onClick={() => toggleArrayItem('platforms', p.id)}
                className={`flex-1 h-11 rounded-2xl text-sm font-medium cursor-pointer border transition-all flex items-center justify-center gap-2 ${
                  roleConfig.platforms.includes(p.id)
                    ? 'bg-stone-950 text-white border-stone-950'
                    : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400'
                }`}
                style={{ fontFamily: 'inherit' }}
              >
                {p.icon} {p.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-stone-500 mb-2 block">Rango de seguidores</label>
          <div className="grid grid-cols-2 gap-2">
            {FOLLOWER_RANGES.map(r => (
              <button
                key={r}
                onClick={() => updateConfig('followerRange', r)}
                className={`h-11 rounded-2xl text-sm font-medium cursor-pointer border transition-all ${
                  roleConfig.followerRange === r
                    ? 'bg-stone-950 text-white border-stone-950'
                    : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400'
                }`}
                style={{ fontFamily: 'inherit' }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );

  const ImporterConfig = (
    <>
      <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mb-6 mx-auto">
        <Globe size={24} className="text-stone-700" />
      </div>
      <h2 className="text-2xl font-bold text-stone-950 text-center mb-1">
        Tu empresa importadora
      </h2>
      <p className="text-sm text-stone-500 text-center mb-8">
        Información básica para empezar
      </p>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-stone-500 mb-1.5 block">Nombre de empresa</label>
          <input
            type="text"
            value={roleConfig.importerCompany}
            onChange={e => updateConfig('importerCompany', e.target.value)}
            placeholder="Ej: Global Foods S.L."
            className="w-full h-12 px-4 rounded-2xl border border-stone-200 bg-white text-stone-950 text-sm focus:outline-none focus:border-stone-400 placeholder:text-stone-400"
            style={{ fontFamily: 'inherit' }}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-stone-500 mb-2 block">Países de interés</label>
          <div className="flex flex-wrap gap-2">
            {IMPORTER_COUNTRIES.map(c => (
              <button
                key={c}
                onClick={() => toggleArrayItem('importerCountries', c)}
                className={`px-3.5 py-2 rounded-full text-xs font-medium cursor-pointer border transition-all ${
                  roleConfig.importerCountries.includes(c)
                    ? 'bg-stone-950 text-white border-stone-950'
                    : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400'
                }`}
                style={{ fontFamily: 'inherit' }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );

  const roleConfigContent = {
    consumer: ConsumerConfig,
    producer: ProducerConfig,
    influencer: InfluencerConfig,
    importer: ImporterConfig,
  };

  const Step5 = (
    <StepShell step={5} onBack={() => goTo(4)} onSkip={() => { saveProgress({ step: 5, skipped: true }); goTo(6); }}>
      <div className="flex-1 flex flex-col pt-6">
        {roleConfigContent[selectedRole] || roleConfigContent.consumer}
      </div>
      <div className="mt-8">
        <PrimaryButton onClick={() => { saveProgress({ step: 5, roleConfig }); goTo(6); }}>
          Siguiente
        </PrimaryButton>
      </div>
    </StepShell>
  );

  /* ═══════════════ STEP 6: All Done ═══════════════ */
  const Step6 = (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-6" style={{ fontFamily: 'inherit' }}>
      <ProgressBar step={6} />

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 15, stiffness: 200, delay: 0.1 }}
        className="w-20 h-20 rounded-full bg-stone-950 flex items-center justify-center mb-8 ring-8 ring-stone-200"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.35, type: 'spring', damping: 12, stiffness: 200 }}
        >
          <Check size={36} color="#fff" strokeWidth={2.5} />
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
        className="text-sm text-stone-500 text-center mb-12"
      >
        Tu feed personalizado te espera
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="w-full max-w-md"
      >
        <PrimaryButton onClick={handleFinish} loading={saving}>
          Empezar
        </PrimaryButton>
      </motion.div>
    </div>
  );

  /* ═══════════════ Render ═══════════════ */
  const steps = { 1: Step1, 2: Step2, 3: Step3, 4: Step4, 5: Step5, 6: Step6 };

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
