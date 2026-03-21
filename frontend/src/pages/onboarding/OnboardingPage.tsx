// @ts-nocheck
/**
 * Onboarding Page v2 — 3 Screens
 * 1. Welcome & Register
 * 2. Food Preferences (diet + allergies + interests)
 * 3. Choose Role
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Wheat, Star, Globe, Droplets, Package, Leaf, UtensilsCrossed, Baby, PawPrint, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { useSaveOnboardingMutation } from '../../features/onboarding/queries';

// -- Helpers --

function getCountrySubtitle() {
  const lang = (navigator.language || 'es').toLowerCase();
  if (lang.startsWith('es')) return 'La alimentación artesanal española';
  if (lang.startsWith('fr')) return "L'alimentation artisanale française";
  if (lang.startsWith('ko')) return '한국 전통 식품';
  try {
    const region = new Intl.Locale(navigator.language).region;
    if (region) {
      const name = new Intl.DisplayNames([navigator.language], { type: 'region' }).of(region);
      return `Artisan food from ${name}`;
    }
  } catch { /* fallback */ }
  return 'Artisan food, delivered';
}

function toggleInArray(arr, id) {
  return arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id];
}

// -- Progress Dots --

function ProgressDots({ current, total }) {
  return (
    <div className="flex items-center justify-center gap-2 py-5">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i === current ? 'w-5 bg-stone-950' : 'w-1.5 bg-stone-200'
          }`}
        />
      ))}
    </div>
  );
}

// -- Toggle Pill --

function TogglePill({ emoji, icon, label, selected, variant, onClick }) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      animate={{ scale: selected ? 1.05 : 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      onClick={onClick}
      className={`rounded-full py-2 px-4 text-[13px] font-medium cursor-pointer inline-flex items-center gap-1.5 border transition-all ${
        selected
          ? 'bg-stone-950 border-stone-950 text-white'
          : 'bg-white border-stone-200 text-stone-700'
      }`}
    >
      {selected ? (
        <Check size={12} strokeWidth={3} className="shrink-0" />
      ) : (
        <span className="text-[15px] inline-flex items-center">{icon || emoji}</span>
      )}
      {label}
    </motion.button>
  );
}

// -- Data --

const DIETS = [
  { id: 'vegano', emoji: '\uD83C\uDF31', label: 'Vegano' },
  { id: 'vegetariano', emoji: '\uD83E\uDD57', label: 'Vegetariano' },
  { id: 'omnivoro', emoji: '\uD83E\uDD69', label: 'Omnívoro' },
  { id: 'keto', emoji: '\uD83E\uDEC0', label: 'Keto' },
  { id: 'deportista', emoji: '\uD83C\uDFC3', label: 'Deportista' },
  { id: 'sin_restricciones', emoji: '\uD83C\uDF7D\uFE0F', label: 'Sin restricciones' },
];

const ALLERGIES = [
  { id: 'sin_gluten', emoji: '\u26A0\uFE0F', label: 'Sin gluten' },
  { id: 'sin_lactosa', emoji: '\u26A0\uFE0F', label: 'Sin lactosa' },
  { id: 'sin_frutos_secos', emoji: '\u26A0\uFE0F', label: 'Sin frutos secos' },
  { id: 'sin_marisco', emoji: '\u26A0\uFE0F', label: 'Sin marisco' },
  { id: 'sin_huevo', emoji: '\u26A0\uFE0F', label: 'Sin huevo' },
];

const INTERESTS = [
  { id: 'aceites', icon: <Droplets size={15} className="text-stone-950" />, label: 'Aceites' },
  { id: 'mieles', emoji: '\uD83C\uDF6F', label: 'Mieles' },
  { id: 'quesos', emoji: '\uD83E\uDDC0', label: 'Quesos' },
  { id: 'conservas', icon: <Package size={15} className="text-stone-950" />, label: 'Conservas' },
  { id: 'especias', emoji: '\uD83C\uDF36\uFE0F', label: 'Especias' },
  { id: 'recetas', emoji: '\uD83D\uDC68\u200D\uD83C\uDF73', label: 'Recetas' },
  { id: 'embutidos', emoji: '\uD83E\uDD69', label: 'Embutidos' },
  { id: 'otros', emoji: '\uD83C\uDF77', label: 'Otros' },
];

const ROLES = [
  {
    id: 'customer',
    icon: <ShoppingCart size={24} className="text-stone-950" />,
    title: 'Consumidor',
    description: 'Descubre y compra productos artesanales',
  },
  {
    id: 'producer',
    icon: <Wheat size={24} className="text-stone-950" />,
    title: 'Productor',
    description: 'Vende tus productos artesanales',
  },
  {
    id: 'influencer',
    icon: <Star size={24} className="text-stone-950" />,
    title: 'Influencer',
    description: 'Gana comisión recomendando productos',
  },
  {
    id: 'importer',
    icon: <Globe size={24} className="text-stone-950" />,
    title: 'Importador',
    description: 'Importa productos en volumen mayorista',
  },
];

// -- Screen 1: Welcome & Register --

function ScreenWelcome({ onNext }) {
  const navigate = useNavigate();
  const subtitle = useMemo(() => getCountrySubtitle(), []);

  return (
    <div className="flex flex-col items-center px-6">
      {/* App icon */}
      <div className="w-20 h-20 rounded-3xl bg-stone-950 flex items-center justify-center mb-5">
        <span className="text-4xl">{'\uD83C\uDF3F'}</span>
      </div>

      {/* Title */}
      <h1 className="text-[22px] font-medium tracking-tight text-stone-950 m-0 mb-1.5">
        hispaloshop
      </h1>

      {/* Dynamic subtitle */}
      <p className="text-sm text-stone-500 m-0 mb-4">
        {subtitle}
      </p>

      {/* Description */}
      <p className="text-[13px] text-stone-500 leading-relaxed text-center m-0 mb-8 max-w-[320px]">
        Conectamos productores artesanales con personas que valoran la alimentación auténtica y de calidad.
      </p>

      {/* Progress dots */}
      <ProgressDots current={0} total={3} />

      {/* Buttons */}
      <div className="w-full flex flex-col gap-3 max-w-[360px] mt-3">
        {/* Registrarme */}
        <button
          onClick={onNext}
          className="w-full h-12 rounded-full bg-stone-950 text-white border-none text-[15px] font-medium cursor-pointer"
        >
          Registrarme
        </button>

        {/* Ya tengo cuenta */}
        <button
          onClick={() => navigate('/login')}
          className="w-full h-12 rounded-full bg-stone-100 text-stone-950 border-none text-[15px] font-medium cursor-pointer"
        >
          Ya tengo cuenta
        </button>

        {/* Separator */}
        <div className="flex items-center gap-3 my-1">
          <div className="flex-1 h-px bg-stone-200" />
          <span className="text-xs text-stone-500">
            o continúa con
          </span>
          <div className="flex-1 h-px bg-stone-200" />
        </div>

        {/* Social row */}
        <div className="flex gap-3">
          {/* Google */}
          <button
            onClick={() => toast('Google Sign-In próximamente')}
            className="flex-1 flex items-center justify-center gap-2 h-12 rounded-full bg-white border border-stone-200 text-sm font-medium text-stone-950 cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 0 0 0 12c0 1.94.46 3.77 1.28 5.39l3.56-2.84.01-.46z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </button>

          {/* Apple */}
          <button
            onClick={() => toast('Apple Sign-In próximamente')}
            className="flex-1 flex items-center justify-center gap-2 h-12 rounded-full bg-stone-950 border-none text-sm font-medium text-white cursor-pointer"
          >
            <svg width="16" height="18" viewBox="0 0 17 20" fill="white">
              <path d="M13.54 10.58c-.01-1.63.72-2.86 2.2-3.76-.83-1.2-2.08-1.86-3.72-1.98-1.56-.12-3.27.92-3.89.92-.66 0-2.13-.88-3.27-.88C2.78 4.92.5 6.88.5 10.79c0 1.15.21 2.34.63 3.57.56 1.62 2.58 5.6 4.7 5.54 1.1-.03 1.87-.78 3.28-.78 1.36 0 2.08.78 3.27.76 2.15-.04 3.94-3.63 4.47-5.25-2.85-1.35-2.82-3.96-2.8-4.05zM11.04 3.45C12.22 2.06 12.1.8 12.07.5c-1.07.06-2.31.74-3.03 1.57-.78.88-1.24 1.97-1.14 3.2 1.17.09 2.24-.53 3.14-1.82z"/>
            </svg>
            Apple
          </button>
        </div>
      </div>
    </div>
  );
}

// -- Screen 2: Food Preferences --

function ScreenFoodPreferences({ data, onUpdate, onNext, onBack }) {
  const [diet, setDiet] = useState(data.diet || []);
  const [allergies, setAllergies] = useState(data.allergies || []);
  const [interests, setInterests] = useState(data.interests || []);

  const handleContinue = () => {
    onUpdate({ diet, allergies, interests });
    onNext();
  };

  return (
    <div className="px-6">
      {/* Progress dots */}
      <ProgressDots current={1} total={3} />

      {/* Title */}
      <h2 className="text-[19px] font-medium text-stone-950 m-0 mb-1.5 text-center">
        ¿Cómo comes?
      </h2>

      {/* Subtitle */}
      <p className="text-xs text-stone-500 text-center m-0 mb-7 leading-normal">
        Personalizamos tu feed y ocultamos productos que no son para ti.
      </p>

      {/* DIET section */}
      <p className="text-[10px] font-semibold tracking-wider uppercase text-stone-500 m-0 mb-2.5">DIETA</p>
      <div className="flex flex-wrap gap-2 mb-6">
        {DIETS.map(d => (
          <TogglePill
            key={d.id}
            emoji={d.emoji}
            label={d.label}
            selected={diet.includes(d.id)}
            variant="diet"
            onClick={() => setDiet(prev => toggleInArray(prev, d.id))}
          />
        ))}
      </div>

      {/* ALLERGIES section */}
      <p className="text-[10px] font-semibold tracking-wider uppercase text-stone-500 m-0 mb-2.5">ALERGIAS</p>
      <div className="flex flex-wrap gap-2 mb-6">
        {ALLERGIES.map(a => (
          <TogglePill
            key={a.id}
            emoji={a.emoji}
            label={a.label}
            selected={allergies.includes(a.id)}
            variant="allergy"
            onClick={() => setAllergies(prev => toggleInArray(prev, a.id))}
          />
        ))}
      </div>

      {/* INTERESTS section */}
      <p className="text-[10px] font-semibold tracking-wider uppercase text-stone-500 m-0 mb-2.5">INTERESES</p>
      <div className="flex flex-wrap gap-2 mb-8">
        {INTERESTS.map(item => (
          <TogglePill
            key={item.id}
            emoji={item.emoji}
            icon={item.icon}
            label={item.label}
            selected={interests.includes(item.id)}
            variant="interest"
            onClick={() => setInterests(prev => toggleInArray(prev, item.id))}
          />
        ))}
      </div>

      {/* Continue button */}
      <button
        onClick={handleContinue}
        className="w-full h-12 rounded-full bg-stone-950 text-white border-none text-[15px] font-medium cursor-pointer"
      >
        Continuar
      </button>

      {/* Back link */}
      {onBack && (
        <button
          onClick={onBack}
          className="block w-full mt-3 bg-transparent border-none text-[13px] text-stone-500 cursor-pointer p-2"
        >
          ← Atrás
        </button>
      )}
    </div>
  );
}

// -- Screen 3: Choose Role --

function ScreenChooseRole({ data, onUpdate, onFinish, onBack, saving }) {
  const [selectedRole, setSelectedRole] = useState(data.role || '');

  const handleStart = () => {
    if (!selectedRole) {
      toast.error('Selecciona cómo quieres usar Hispaloshop');
      return;
    }
    onUpdate({ role: selectedRole });
    onFinish(selectedRole);
  };

  return (
    <div className="px-6">
      {/* Progress dots */}
      <ProgressDots current={2} total={3} />

      {/* Title */}
      <h2 className="text-[19px] font-medium text-stone-950 m-0 mb-6 text-center">
        ¿Cómo quieres usar Hispaloshop?
      </h2>

      {/* Role cards */}
      <div className="flex flex-col gap-3 mb-8">
        {ROLES.map(role => {
          const isSelected = selectedRole === role.id;
          return (
            <motion.button
              key={role.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedRole(role.id)}
              className={`flex items-center gap-4 w-full p-4 rounded-xl bg-white cursor-pointer text-left transition-all duration-200 ${
                isSelected ? 'border border-stone-950' : 'border border-stone-200'
              }`}
            >
              <span className="text-[28px] shrink-0 inline-flex items-center">{role.icon}</span>
              <div>
                <p className="text-[13px] font-medium text-stone-950 m-0 mb-0.5">
                  {role.title}
                </p>
                <p className="text-[11px] text-stone-500 m-0 leading-snug">
                  {role.description}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Start button */}
      <button
        onClick={handleStart}
        disabled={!selectedRole || saving}
        className={`w-full h-12 rounded-full border-none text-[15px] font-medium transition-all duration-200 ${
          selectedRole
            ? 'bg-stone-950 text-white cursor-pointer'
            : 'bg-stone-200 text-stone-500 cursor-not-allowed'
        }`}
      >
        {saving ? 'Guardando...' : 'Empezar'}
      </button>

      {/* Back link */}
      {onBack && (
        <button
          onClick={onBack}
          className="block w-full mt-3 bg-transparent border-none text-[13px] text-stone-500 cursor-pointer p-2"
        >
          ← Atrás
        </button>
      )}
    </div>
  );
}

// -- Main Onboarding Page --

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const saveOnboardingMutation = useSaveOnboardingMutation();
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState({
    diet: [],
    allergies: [],
    interests: [],
    role: '',
  });
  const saving = saveOnboardingMutation.isPending;

  const updateData = useCallback((newData) => {
    setData(prev => ({ ...prev, ...newData }));
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep(prev => prev + 1);
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => prev - 1);
  }, []);

  const handleFinish = useCallback(async (selectedRole) => {
    try {
      await saveOnboardingMutation.mutateAsync({
        interests: data.interests,
        diet: data.diet,
        allergies: data.allergies,
        role: selectedRole,
      });

      setUser(prev => ({
        ...prev,
        onboardingCompleted: true,
        preferences: {
          ...prev.preferences,
          interests: data.interests,
          diet: data.diet,
          allergies: data.allergies,
        },
      }));

      toast.success('¡Perfil configurado correctamente!');

      // Navigate based on role
      const destinations = {
        customer: '/',
        producer: '/onboarding/producer',
        influencer: '/onboarding/influencer',
        importer: '/onboarding/importer',
      };
      navigate(destinations[selectedRole] || '/', { replace: true });
    } catch (error) {
      toast.error('Error guardando preferencias');
    }
  }, [data, saveOnboardingMutation, setUser, navigate]);

  // If onboarding already completed, redirect
  useEffect(() => {
    if (user?.onboardingCompleted) {
      navigate('/', { replace: true });
    }
  }, [user?.onboardingCompleted, navigate]);

  const slideVariants = {
    enter: { opacity: 0, x: 40 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -40 },
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50">
      <div className="w-full max-w-[420px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            {currentStep === 0 && (
              <ScreenWelcome onNext={nextStep} />
            )}
            {currentStep === 1 && (
              <ScreenFoodPreferences
                data={data}
                onUpdate={updateData}
                onNext={nextStep}
                onBack={prevStep}
              />
            )}
            {currentStep === 2 && (
              <ScreenChooseRole
                data={data}
                onUpdate={updateData}
                onFinish={handleFinish}
                onBack={prevStep}
                saving={saving}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {saving && (
        <div className="fixed inset-0 flex items-center justify-center bg-stone-950/40 z-50">
          <div className="flex flex-col items-center gap-3 bg-white p-6 rounded-xl">
            <div className="w-8 h-8 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-stone-950 m-0">Guardando...</p>
          </div>
        </div>
      )}
    </div>
  );
}
