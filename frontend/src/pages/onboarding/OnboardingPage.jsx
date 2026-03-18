/**
 * Onboarding Page v2 — 3 Screens
 * 1. Welcome & Register
 * 2. Food Preferences (diet + allergies + interests)
 * 3. Choose Role
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Wheat, Star, Globe, Droplets, Package, Leaf, UtensilsCrossed, Baby, PawPrint } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { useSaveOnboardingMutation } from '../../features/onboarding/queries';

// ── Helpers ──────────────────────────────────────────────

function getCountrySubtitle() {
  const lang = (navigator.language || 'es').toLowerCase();
  if (lang.startsWith('es')) return 'La alimentación artesanal española';
  if (lang.startsWith('fr')) return "L'alimentation artisanale française";
  if (lang.startsWith('ko')) return '한국 전통 식품';
  // Attempt to get country name from locale
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

// ── Progress Dots ────────────────────────────────────────

function ProgressDots({ current, total }) {
  return (
    <div className="flex items-center justify-center gap-2" style={{ padding: '20px 0' }}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            width: i === current ? 20 : 6,
            height: 6,
            borderRadius: 'var(--radius-full)',
            background: i === current ? 'var(--color-black)' : 'var(--color-border)',
            transition: 'all 0.3s ease',
          }}
        />
      ))}
    </div>
  );
}

// ── Toggle Pill ──────────────────────────────────────────

function TogglePill({ emoji, icon, label, selected, variant, onClick }) {
  const styles = useMemo(() => {
    if (!selected) {
      return {
        background: 'var(--color-white)',
        border: '1px solid var(--color-border)',
        color: 'var(--color-black)',
      };
    }
    if (variant === 'diet') {
      return {
        background: 'var(--color-black)',
        border: '1px solid var(--color-black)',
        color: '#fff',
      };
    }
    if (variant === 'allergy') {
      return {
        background: 'var(--color-surface-alt, #f5f5f4)',
        border: '1px solid var(--color-black)',
        color: 'var(--color-black)',
      };
    }
    // interests
    return {
      background: 'var(--color-surface-alt, #f5f5f4)',
      border: '1px solid var(--color-border, #e7e5e4)',
      color: 'var(--color-black)',
    };
  }, [selected, variant]);

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      style={{
        ...styles,
        borderRadius: 'var(--radius-full)',
        padding: '8px 16px',
        fontSize: 13,
        fontWeight: 500,
        fontFamily: 'var(--font-sans)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <span style={{ fontSize: 15, display: 'inline-flex', alignItems: 'center' }}>{icon || emoji}</span>
      {label}
    </motion.button>
  );
}

// ── Data ─────────────────────────────────────────────────

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

// ── Screen 1: Welcome & Register ─────────────────────────

function ScreenWelcome({ onNext }) {
  const navigate = useNavigate();
  const subtitle = useMemo(() => getCountrySubtitle(), []);

  return (
    <div className="flex flex-col items-center" style={{ padding: '0 24px' }}>
      {/* App icon */}
      <div
        className="flex items-center justify-center"
        style={{
          width: 80,
          height: 80,
          borderRadius: 24,
          background: 'var(--color-black)',
          marginBottom: 20,
        }}
      >
        <span style={{ fontSize: 36 }}>{'\uD83C\uDF3F'}</span>
      </div>

      {/* Title */}
      <h1
        style={{
          fontSize: 22,
          fontWeight: 500,
          letterSpacing: '-0.03em',
          color: 'var(--color-black)',
          fontFamily: 'var(--font-sans)',
          margin: '0 0 6px',
        }}
      >
        hispaloshop
      </h1>

      {/* Dynamic subtitle */}
      <p
        style={{
          fontSize: 14,
          color: 'var(--color-stone)',
          fontFamily: 'var(--font-sans)',
          margin: '0 0 16px',
        }}
      >
        {subtitle}
      </p>

      {/* Description */}
      <p
        style={{
          fontSize: 13,
          color: 'var(--color-stone)',
          lineHeight: 1.6,
          fontFamily: 'var(--font-sans)',
          textAlign: 'center',
          margin: '0 0 32px',
          maxWidth: 320,
        }}
      >
        Conectamos productores artesanales con personas que valoran la alimentación auténtica y de calidad.
      </p>

      {/* Progress dots */}
      <ProgressDots current={0} total={3} />

      {/* Buttons */}
      <div className="w-full flex flex-col gap-3" style={{ maxWidth: 360, marginTop: 12 }}>
        {/* Registrarme */}
        <button
          onClick={onNext}
          style={{
            width: '100%',
            height: 48,
            borderRadius: 'var(--radius-full)',
            background: 'var(--color-black)',
            color: 'var(--color-white)',
            border: 'none',
            fontSize: 15,
            fontWeight: 500,
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer',
          }}
        >
          Registrarme
        </button>

        {/* Ya tengo cuenta */}
        <button
          onClick={() => navigate('/login')}
          style={{
            width: '100%',
            height: 48,
            borderRadius: 'var(--radius-full)',
            background: 'var(--color-surface)',
            color: 'var(--color-black)',
            border: 'none',
            fontSize: 15,
            fontWeight: 500,
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer',
          }}
        >
          Ya tengo cuenta
        </button>

        {/* Separator */}
        <div className="flex items-center gap-3" style={{ margin: '4px 0' }}>
          <div className="flex-1" style={{ height: 1, background: 'var(--color-border)' }} />
          <span style={{ fontSize: 12, color: 'var(--color-stone)', fontFamily: 'var(--font-sans)' }}>
            o continúa con
          </span>
          <div className="flex-1" style={{ height: 1, background: 'var(--color-border)' }} />
        </div>

        {/* Social row */}
        <div className="flex gap-3">
          {/* Google */}
          <button
            onClick={() => toast('Google Sign-In próximamente')}
            className="flex-1 flex items-center justify-center gap-2"
            style={{
              height: 48,
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-white)',
              border: '1px solid var(--color-border)',
              fontSize: 14,
              fontWeight: 500,
              fontFamily: 'var(--font-sans)',
              color: 'var(--color-black)',
              cursor: 'pointer',
            }}
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
            className="flex-1 flex items-center justify-center gap-2"
            style={{
              height: 48,
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-black)',
              border: 'none',
              fontSize: 14,
              fontWeight: 500,
              fontFamily: 'var(--font-sans)',
              color: 'var(--color-white)',
              cursor: 'pointer',
            }}
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

// ── Screen 2: Food Preferences ───────────────────────────

function ScreenFoodPreferences({ data, onUpdate, onNext, onBack }) {
  const [diet, setDiet] = useState(data.diet || []);
  const [allergies, setAllergies] = useState(data.allergies || []);
  const [interests, setInterests] = useState(data.interests || []);

  const handleContinue = () => {
    onUpdate({ diet, allergies, interests });
    onNext();
  };

  const sectionLabelStyle = {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--color-stone)',
    fontFamily: 'var(--font-sans)',
    margin: '0 0 10px',
  };

  return (
    <div style={{ padding: '0 24px' }}>
      {/* Progress dots */}
      <ProgressDots current={1} total={3} />

      {/* Title */}
      <h2
        style={{
          fontSize: 19,
          fontWeight: 500,
          color: 'var(--color-black)',
          fontFamily: 'var(--font-sans)',
          margin: '0 0 6px',
          textAlign: 'center',
        }}
      >
        ¿Cómo comes?
      </h2>

      {/* Subtitle */}
      <p
        style={{
          fontSize: 12,
          color: 'var(--color-stone)',
          fontFamily: 'var(--font-sans)',
          textAlign: 'center',
          margin: '0 0 28px',
          lineHeight: 1.5,
        }}
      >
        Personalizamos tu feed y ocultamos productos que no son para ti.
      </p>

      {/* DIET section */}
      <p style={sectionLabelStyle}>DIETA</p>
      <div className="flex flex-wrap gap-2" style={{ marginBottom: 24 }}>
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
      <p style={sectionLabelStyle}>ALERGIAS</p>
      <div className="flex flex-wrap gap-2" style={{ marginBottom: 24 }}>
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
      <p style={sectionLabelStyle}>INTERESES</p>
      <div className="flex flex-wrap gap-2" style={{ marginBottom: 32 }}>
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
        style={{
          width: '100%',
          height: 48,
          borderRadius: 'var(--radius-full)',
          background: 'var(--color-black)',
          color: 'var(--color-white)',
          border: 'none',
          fontSize: 15,
          fontWeight: 500,
          fontFamily: 'var(--font-sans)',
          cursor: 'pointer',
        }}
      >
        Continuar
      </button>

      {/* Back link */}
      {onBack && (
        <button
          onClick={onBack}
          style={{
            display: 'block',
            width: '100%',
            marginTop: 12,
            background: 'none',
            border: 'none',
            fontSize: 13,
            color: 'var(--color-stone)',
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer',
            padding: 8,
          }}
        >
          ← Atrás
        </button>
      )}
    </div>
  );
}

// ── Screen 3: Choose Role ────────────────────────────────

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
    <div style={{ padding: '0 24px' }}>
      {/* Progress dots */}
      <ProgressDots current={2} total={3} />

      {/* Title */}
      <h2
        style={{
          fontSize: 19,
          fontWeight: 500,
          color: 'var(--color-black)',
          fontFamily: 'var(--font-sans)',
          margin: '0 0 24px',
          textAlign: 'center',
        }}
      >
        ¿Cómo quieres usar Hispaloshop?
      </h2>

      {/* Role cards */}
      <div className="flex flex-col gap-3" style={{ marginBottom: 32 }}>
        {ROLES.map(role => {
          const isSelected = selectedRole === role.id;
          return (
            <motion.button
              key={role.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedRole(role.id)}
              className="flex items-center gap-4"
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-white)',
                border: isSelected
                  ? '1px solid var(--color-black)'
                  : '0.5px solid var(--color-border)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{ fontSize: 28, flexShrink: 0, display: 'inline-flex', alignItems: 'center' }}>{role.icon}</span>
              <div>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--color-black)',
                    fontFamily: 'var(--font-sans)',
                    margin: '0 0 2px',
                  }}
                >
                  {role.title}
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: 'var(--color-stone)',
                    fontFamily: 'var(--font-sans)',
                    margin: 0,
                    lineHeight: 1.4,
                  }}
                >
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
        style={{
          width: '100%',
          height: 48,
          borderRadius: 'var(--radius-full)',
          background: selectedRole ? 'var(--color-black)' : 'var(--color-border)',
          color: selectedRole ? 'var(--color-white)' : 'var(--color-stone)',
          border: 'none',
          fontSize: 15,
          fontWeight: 500,
          fontFamily: 'var(--font-sans)',
          cursor: selectedRole ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s ease',
        }}
      >
        {saving ? 'Guardando...' : 'Empezar'}
      </button>

      {/* Back link */}
      {onBack && (
        <button
          onClick={onBack}
          style={{
            display: 'block',
            width: '100%',
            marginTop: 12,
            background: 'none',
            border: 'none',
            fontSize: 13,
            color: 'var(--color-stone)',
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer',
            padding: 8,
          }}
        >
          ← Atrás
        </button>
      )}
    </div>
  );
}

// ── Main Onboarding Page ─────────────────────────────────

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
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{
        background: 'var(--color-cream)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <div className="w-full" style={{ maxWidth: 420 }}>
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
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ background: 'rgba(10,10,10,0.4)', zIndex: 'var(--z-modal)' }}
        >
          <div
            className="flex flex-col items-center gap-3"
            style={{
              background: 'var(--color-white)',
              padding: 24,
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                border: '2px solid var(--color-black)',
                borderTopColor: 'transparent',
                borderRadius: '50%',
              }}
              className="animate-spin"
            />
            <p style={{ fontSize: 14, color: 'var(--color-black)', margin: 0 }}>Guardando...</p>
          </div>
        </div>
      )}
    </div>
  );
}
