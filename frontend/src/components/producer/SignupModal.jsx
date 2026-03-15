import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleCheckBig,
  CreditCard,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  MapPinned,
  Phone,
  ShieldCheck,
  Sparkles,
  Store,
  UserRound,
  Wheat,
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import { useAuth } from '../../context/AuthContext';
import { redirectAfterAuth } from '../../lib/navigation';
import apiClient from '../../services/api/client';

const STORAGE_KEY = 'hispalo_producer_signup';

export const PRODUCER_PLANS = {
  free: {
    key: 'free',
    name: 'FREE',
    badge: 'Empieza hoy',
    price: '0€ / mes',
    chargeLabel: 'No pagarás nada hasta que vendas.',
    commission: '20%',
    accentClass: 'border-stone-400 bg-white',
    buttonClass: 'bg-stone-950 text-white hover:bg-stone-800',
    summary: 'Para productores que quieren empezar a vender sin riesgo.',
    features: [
      'Tienda virtual personalizada con tu historia y origen',
      'Hasta 30 productos en catálogo',
      'Acceso a comunidad de productores',
      'Visibilidad nacional en España',
      'Comisión del 20% solo sobre ventas realizadas',
    ],
  },
  pro: {
    key: 'pro',
    name: 'PRO',
    badge: 'Para crecer',
    price: '79€ + IVA / mes',
    chargeLabel: '79€ + IVA (95,59€) mensuales',
    commission: '18%',
    accentClass: 'border-stone-600 bg-white shadow-[0_26px_60px_-38px_rgba(80,80,80,0.45)] lg:scale-[1.04]',
    buttonClass: 'bg-stone-950 text-white hover:bg-stone-800',
    summary: 'Para productores serios que quieren escalar sin locura.',
    features: [
      'Herramientas de IA para marketing',
      'Genera copy, optimiza fotos y traduce a 5 idiomas',
      'Recomendaciones dinámicas de precio por zona geográfica',
      'Analítica avanzada de ventas',
      'Matching automático con hasta 5 influencers locales',
      'Comisión reducida al 18%',
      'Soporte prioritario por email',
    ],
  },
  elite: {
    key: 'elite',
    name: 'ELITE',
    badge: 'Exporta al mundo',
    price: '249€ + IVA / mes',
    chargeLabel: '249€ + IVA (301,29€) mensuales',
    commission: '17%',
    accentClass: 'border-stone-500 bg-white',
    buttonClass: 'bg-stone-950 text-white hover:bg-stone-800',
    summary: 'Para cooperativas y productores con ambición global.',
    features: [
      'Todo lo del PRO',
      'Hispal AI Agente Comercial Internacional',
      'Predicción de demanda por país y temporada',
      'Análisis de mercados internacionales (precio, competencia, oportunidad)',
      'Detección preventiva de riesgo de desabastecimiento',
      'Matching directo con importadores verificados de otros países',
      'Generación automática de contratos B2B en PDF',
      'Análisis de regulaciones y aranceles por mercado destino',
      'Creación de dossieres de exportación',
      'Prioridad absoluta de visibilidad en la plataforma',
      'Comisión reducida al 17%',
      'Soporte telefónico directo',
    ],
  },
};

const PHONE_PREFIXES = [
  { value: '+34', label: 'ES +34' },
  { value: '+33', label: 'FR +33' },
  { value: '+39', label: 'IT +39' },
  { value: '+49', label: 'DE +49' },
  { value: '+44', label: 'UK +44' },
  { value: '+1', label: 'US +1' },
  { value: '+81', label: 'JP +81' },
  { value: '+82', label: 'KR +82' },
];

const PRODUCT_TYPES = [
  'Conservas',
  'Aceites',
  'Embutidos',
  'Quesos',
  'Panadería',
  'Bebidas',
  'Orgánico',
  'Otros',
];

const EXPORT_OPTIONS = [
  'Solo vendo en España',
  'Ya exporto a algún país',
  'Quiero empezar a exportar',
];

const REFERENCE_OPTIONS = [
  '1-5 productos',
  '6-20',
  'Más de 20',
];

const REGIONS = [
  'Andalucía',
  'Aragón',
  'Asturias',
  'Baleares',
  'Canarias',
  'Cantabria',
  'Castilla-La Mancha',
  'Castilla y León',
  'Cataluña',
  'Ceuta',
  'Comunidad Valenciana',
  'Extremadura',
  'Galicia',
  'La Rioja',
  'Madrid',
  'Melilla',
  'Murcia',
  'Navarra',
  'País Vasco',
];

let stripeLoader;

export function normalizeProducerPlan(plan) {
  const value = String(plan || 'free').toLowerCase();
  if (value === 'pro' || value === 'elite') {
    return value;
  }
  return 'free';
}

function isPaidPlan(plan) {
  return normalizeProducerPlan(plan) !== 'free';
}

function sanitizePhone(value) {
  return String(value || '').replace(/[^\d]/g, '');
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function getPasswordStrength(password) {
  const value = String(password || '');
  let score = 0;

  if (value.length >= 6) score += 1;
  if (/[A-Z]/.test(value)) score += 1;
  if (/[0-9]/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;

  if (score <= 1) {
    return { label: 'Baja', color: 'var(--color-red)', width: '33%' };
  }
  if (score === 2 || score === 3) {
    return { label: 'Media', color: 'var(--color-amber)', width: '66%' };
  }
  return { label: 'Alta', color: 'var(--color-green)', width: '100%' };
}

function loadStripeJs() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Stripe no está disponible.'));
  }
  if (window.Stripe) {
    return Promise.resolve(window.Stripe);
  }
  if (!stripeLoader) {
    stripeLoader = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.async = true;
      script.onload = () => resolve(window.Stripe);
      script.onerror = () => reject(new Error('No se pudo cargar Stripe.js.'));
      document.body.appendChild(script);
    });
  }
  return stripeLoader;
}

function buildInitialState(initialPlan) {
  return {
    fullName: '',
    email: '',
    phonePrefix: '+34',
    phoneNumber: '',
    password: '',
    acceptLegal: false,
    brandName: '',
    productTypes: [],
    exportStage: '',
    region: '',
    references: '',
    plan: normalizeProducerPlan(initialPlan),
    acceptCommission: false,
  };
}

function readStoredState(initialPlan) {
  const fallback = buildInitialState(initialPlan);
  if (typeof window === 'undefined') {
    return { step: 1, formData: fallback };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { step: 1, formData: fallback };
    }

    const parsed = JSON.parse(raw);
    return {
      step: parsed?.step >= 1 && parsed?.step <= 3 ? parsed.step : 1,
      formData: {
        ...fallback,
        ...(parsed?.formData || {}),
        password: '',
        plan: normalizeProducerPlan(parsed?.formData?.plan || initialPlan),
        productTypes: Array.isArray(parsed?.formData?.productTypes) ? parsed.formData.productTypes : [],
      },
    };
  } catch {
    return { step: 1, formData: fallback };
  }
}

function fieldClass(hasError, isValid) {
  if (hasError) {
    return 'border-stone-700 focus:outline-none focus:border-stone-950';
  }
  if (isValid) {
    return 'border-stone-400 focus:outline-none focus:border-stone-950';
  }
  return 'border-stone-300 focus:outline-none focus:border-stone-950';
}

function StatusIcon({ valid }) {
  if (!valid) {
    return null;
  }
  return <CheckCircle2 className="pointer-events-none absolute right-3 top-[42px] h-4 w-4 text-stone-500" aria-hidden="true" />;
}

function PlanPill({ label, selected, accent }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${selected ? accent : 'bg-stone-100 text-stone-600'}`}>
      {label}
    </span>
  );
}

function ProgressDots({ step, success }) {
  const progress = success ? 100 : step === 1 ? 33 : step === 2 ? 66 : 100;
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-400">
        <span>{success ? 'Completado' : `Paso ${step} de 3`}</span>
        <span>{progress}%</span>
      </div>
      <div className="relative mt-4">
        <div className="absolute left-0 right-0 top-4 h-[2px] rounded-full bg-stone-200" />
        <motion.div
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.32, ease: 'easeOut' }}
          className="absolute left-0 top-4 h-[2px] rounded-full bg-gradient-to-r from-stone-700 to-stone-950"
        />
        <div className="relative flex items-center justify-between">
          {[1, 2, 3].map((point) => {
            const active = success || step >= point;
            const label = point === 1 ? 'Quién eres' : point === 2 ? 'Tu producción' : 'Confirma tu plan';
            return (
              <div key={label} className="flex flex-col items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold transition ${active ? 'border-stone-950 bg-stone-950 text-white' : 'border-stone-300 bg-white text-stone-500'}`}>
                  {point}
                </div>
                <span className={`hidden text-[11px] font-medium sm:block ${active ? 'text-stone-700' : 'text-stone-400'}`}>{label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function InlineError({ message }) {
  if (!message) {
    return null;
  }
  return <p className="mt-2 text-sm text-stone-600">{message}</p>;
}

export default function SignupModal({ open, onOpenChange, initialPlan = 'free' }) {
  const navigate = useNavigate();
  const { register, user } = useAuth();
  const storedState = useMemo(() => readStoredState(initialPlan), [initialPlan]);

  const [step, setStep] = useState(storedState.step);
  const [formData, setFormData] = useState(storedState.formData);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successState, setSuccessState] = useState(null);
  const [paymentNotice, setPaymentNotice] = useState('');
  const [stripeKey, setStripeKey] = useState('');
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeError, setStripeError] = useState('');
  const [cardReady, setCardReady] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);

  const firstRef = useRef(null);
  const secondRef = useRef(null);
  const thirdRef = useRef(null);
  const cardMountRef = useRef(null);
  const stripeRef = useRef(null);
  const cardRef = useRef(null);

  const selectedPlan = normalizeProducerPlan(formData.plan);
  const activePlan = PRODUCER_PLANS[selectedPlan];
  const passwordStrength = getPasswordStrength(formData.password);
  const combinedPhone = `${formData.phonePrefix}${sanitizePhone(formData.phoneNumber)}`;

  const validity = {
    fullName: formData.fullName.trim().length >= 2,
    email: isValidEmail(formData.email),
    phoneNumber: sanitizePhone(formData.phoneNumber).length >= 6,
    password: formData.password.length >= 6,
    brandName: formData.brandName.trim().length >= 2,
    productTypes: formData.productTypes.length > 0,
    exportStage: Boolean(formData.exportStage),
    region: Boolean(formData.region),
    references: Boolean(formData.references),
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    const nextState = readStoredState(initialPlan);
    setStep(nextState.step);
    setFormData(nextState.formData);
    setErrors({});
    setTouched({});
    setPaymentNotice('');
    setStripeError('');
    setCardReady(false);
    setCardComplete(false);
  }, [open, initialPlan]);

  useEffect(() => {
    if (!open || successState || typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        step,
        formData: {
          ...formData,
          password: '',
        },
      }),
    );
  }, [formData, open, step, successState]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const target = step === 1 ? firstRef : step === 2 ? secondRef : thirdRef;
    const frame = window.requestAnimationFrame(() => {
      target.current?.focus?.();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, step, successState]);

  useEffect(() => {
    if (!open || step !== 3 || !isPaidPlan(selectedPlan)) {
      setCardReady(false);
      setCardComplete(false);
      setStripeError('');
      return undefined;
    }

    let active = true;

    const mountCard = async () => {
      try {
        setStripeLoading(true);
        setStripeError('');

        let key = stripeKey;
        if (!key) {
          const data = await apiClient.get(`/sellers/plans`);
          key = data?.stripe_publishable_key || '';
          if (!key) {
            throw new Error('Stripe no está configurado todavía.');
          }
          if (active) {
            setStripeKey(key);
          }
        }

        const StripeCtor = await loadStripeJs();
        if (!active || !cardMountRef.current) {
          return;
        }

        const stripe = StripeCtor(key);
        const elements = stripe.elements({
          appearance: {
            theme: 'stripe',
            variables: {
              colorPrimary: 'var(--color-black)',
              colorText: 'var(--color-black)',
              colorDanger: 'var(--color-red)',
              borderRadius: '12px',
            },
          },
        });
        const card = elements.create('card', { hidePostalCode: true });
        card.on('change', (event) => {
          if (!active) {
            return;
          }
          setCardComplete(Boolean(event.complete));
          setStripeError(event.error?.message || '');
        });
        card.mount(cardMountRef.current);
        stripeRef.current = stripe;
        cardRef.current = card;
        setCardReady(true);
      } catch (error) {
        if (active) {
          setStripeError(error.message || 'No pudimos preparar el pago seguro.');
        }
      } finally {
        if (active) {
          setStripeLoading(false);
        }
      }
    };

    mountCard();

    return () => {
      active = false;
      if (cardRef.current) {
        cardRef.current.unmount();
        cardRef.current.destroy?.();
        cardRef.current = null;
      }
    };
  }, [open, selectedPlan, step, stripeKey]);

  const updateField = (field, value) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
    setErrors((current) => ({
      ...current,
      [field]: '',
    }));
    setPaymentNotice('');
  };

  const markTouched = (fields) => {
    setTouched((current) => fields.reduce((accumulator, field) => ({
      ...accumulator,
      [field]: true,
    }), current));
  };

  const toggleProductType = (value) => {
    setFormData((current) => ({
      ...current,
      productTypes: current.productTypes.includes(value)
        ? current.productTypes.filter((item) => item !== value)
        : [...current.productTypes, value],
    }));
    setErrors((current) => ({
      ...current,
      productTypes: '',
    }));
  };

  const clearFlow = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setStep(1);
    setErrors({});
    setTouched({});
    setPaymentNotice('');
    setSuccessState(null);
    setStripeError('');
    setCardReady(false);
    setCardComplete(false);
    setShowPassword(false);
    setFormData(buildInitialState(initialPlan));
  };

  const validateStep = (targetStep) => {
    const nextErrors = {};

    if (targetStep === 1) {
      if (!validity.fullName) nextErrors.fullName = 'Necesitamos tu nombre para darte de alta.';
      if (!validity.email) nextErrors.email = 'Introduce un email válido.';
      if (!validity.phoneNumber) nextErrors.phoneNumber = 'Necesitamos un teléfono operativo.';
      if (!validity.password) nextErrors.password = 'Tu contraseña debe tener al menos 6 caracteres.';
      if (!formData.acceptLegal) nextErrors.acceptLegal = 'Debes aceptar la política de privacidad y los términos.';
      if (Object.keys(nextErrors).length > 0) {
        markTouched(['fullName', 'email', 'phoneNumber', 'password', 'acceptLegal']);
      }
    }

    if (targetStep === 2) {
      if (!validity.brandName) nextErrors.brandName = 'Cuéntanos cómo se llama tu marca o cooperativa.';
      if (!validity.productTypes) nextErrors.productTypes = 'Selecciona al menos un tipo de producto.';
      if (!validity.exportStage) nextErrors.exportStage = 'Indícanos si ya exportas o quieres empezar.';
      if (!validity.region) nextErrors.region = 'Selecciona tu región de producción.';
      if (!validity.references) nextErrors.references = 'Necesitamos un rango aproximado de referencias.';
      if (Object.keys(nextErrors).length > 0) {
        markTouched(['brandName', 'productTypes', 'exportStage', 'region', 'references']);
      }
    }

    if (targetStep === 3) {
      if (selectedPlan === 'free' && !formData.acceptCommission) {
        nextErrors.acceptCommission = 'Debes confirmar la comisión del 20% para continuar.';
      }
      if (isPaidPlan(selectedPlan)) {
        if (stripeLoading) nextErrors.card = 'Estamos preparando Stripe. Espera un segundo.';
        else if (stripeError) nextErrors.card = stripeError;
        else if (!cardReady || !cardComplete) nextErrors.card = 'Completa los datos de la tarjeta para continuar.';
      }
    }

    setErrors((current) => ({
      ...current,
      ...nextErrors,
    }));
    return Object.keys(nextErrors).length === 0;
  };

  const buildPayload = () => ({
    email: formData.email.trim().toLowerCase(),
    password: formData.password,
    name: formData.fullName.trim(),
    role: 'producer',
    country: 'ES',
    language: 'es',
    company_name: formData.brandName.trim(),
    phone: combinedPhone,
    whatsapp: combinedPhone,
    contact_person: formData.fullName.trim(),
    fiscal_address: formData.region ? `${formData.region}, España` : '',
    vat_cif: '',
  });

  const ensureProducerSession = async () => {
    if (user?.role === 'producer') {
      return user;
    }
    const response = await register(buildPayload());
    return response?.user || null;
  };

  const subscribeInline = async () => {
    const stripe = stripeRef.current;
    const card = cardRef.current;

    if (!stripe || !card) {
      throw new Error('Stripe no está listo todavía.');
    }

    const paymentMethodResult = await stripe.createPaymentMethod({
      type: 'card',
      card,
      billing_details: {
        name: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: combinedPhone,
      },
    });

    if (paymentMethodResult.error) {
      throw new Error(paymentMethodResult.error.message || 'No pudimos validar la tarjeta.');
    }

    const subscribeData = await apiClient.post(
      `/sellers/me/plan/subscribe-inline`,
      {
        plan: selectedPlan.toUpperCase(),
        payment_method_id: paymentMethodResult.paymentMethod.id,
        billing_name: formData.fullName.trim(),
        billing_email: formData.email.trim().toLowerCase(),
        billing_phone: combinedPhone,
      }
    );

    if (subscribeData?.requires_action && subscribeData?.client_secret) {
      const confirmation = await stripe.confirmCardPayment(subscribeData.client_secret);
      if (confirmation.error) {
        if (confirmation.error.type === 'card_error' || confirmation.error.type === 'validation_error') {
          throw new Error(confirmation.error.message || 'Tu banco rechazó la operación.');
        }
        throw new Error('Ha ocurrido un error con el pago. Por favor inténtalo de nuevo.');
      }

      if (confirmation.paymentIntent?.status === 'requires_payment_method') {
        throw new Error('El método de pago fue rechazado. Por favor usa otra tarjeta.');
      }

      await apiClient.post(
        `/sellers/me/plan/subscribe-inline/confirm`,
        {
          subscription_id: subscribeData.subscription_id,
          plan: selectedPlan.toUpperCase(),
        }
      );
    }
  };

  const submitFlow = async () => {
    if (!validateStep(3)) {
      toast.error('Revisa los datos antes de continuar.');
      return;
    }

    setSubmitting(true);
    setPaymentNotice('');

    try {
      const createdUser = await ensureProducerSession();
      if (isPaidPlan(selectedPlan)) {
        await subscribeInline();
      }

      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(STORAGE_KEY);
      }

      setSuccessState({
        user: createdUser || user,
        plan: selectedPlan,
      });
      setErrors({});
      setTouched({});
    } catch (error) {
      const message = error.message || 'No pudimos completar el alta del productor.';

      if (message.toLowerCase().includes('email already registered')) {
        setPaymentNotice('Tu cuenta ya existe. Si ya se creo, solo falta terminar el plan o revisar tu acceso.');
      }

      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const proceed = () => {
    if (!validateStep(step)) {
      toast.error('Completa los campos obligatorios para avanzar.');
      return;
    }
    setStep((current) => Math.min(current + 1, 3));
  };

  const closeModal = () => {
    if (successState) {
      clearFlow();
    }
    onOpenChange(false);
  };

  const renderStepOne = () => (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="relative lg:col-span-2">
        <label htmlFor="producer-full-name" className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">
          Nombre del responsable
        </label>
        <UserRound className="pointer-events-none absolute left-4 top-[43px] h-4 w-4 text-stone-400" />
        <input
          id="producer-full-name"
          ref={firstRef}
          value={formData.fullName}
          onChange={(event) => updateField('fullName', event.target.value)}
          onBlur={() => setTouched((current) => ({ ...current, fullName: true }))}
          placeholder="Tu nombre y apellidos"
          className={`mt-2 h-12 w-full rounded-[10px] border bg-white pl-11 pr-10 text-base shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)] ${fieldClass(Boolean(errors.fullName), touched.fullName && validity.fullName)}`}
        />
        <StatusIcon valid={touched.fullName && validity.fullName} />
        <InlineError message={errors.fullName} />
      </div>

      <div className="relative">
        <label htmlFor="producer-email" className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">
          Email de contacto
        </label>
        <Mail className="pointer-events-none absolute left-4 top-[43px] h-4 w-4 text-stone-400" />
        <input
          id="producer-email"
          type="email"
          value={formData.email}
          onChange={(event) => updateField('email', event.target.value)}
          onBlur={() => setTouched((current) => ({ ...current, email: true }))}
          placeholder="tu@obrador.com"
          className={`mt-2 h-12 w-full rounded-[10px] border bg-white pl-11 pr-10 text-base shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)] ${fieldClass(Boolean(errors.email), touched.email && validity.email)}`}
        />
        <StatusIcon valid={touched.email && validity.email} />
        <InlineError message={errors.email} />
      </div>

      <div>
        <label htmlFor="producer-phone" className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">
          Teléfono
        </label>
        <div className="mt-2 grid gap-3 sm:grid-cols-[128px_1fr]">
          <select
            value={formData.phonePrefix}
            onChange={(event) => updateField('phonePrefix', event.target.value)}
            className="h-12 rounded-[10px] border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-700 shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)] focus:outline-none focus:border-stone-950"
          >
            {PHONE_PREFIXES.map((prefix) => (
              <option key={prefix.value} value={prefix.value}>
                {prefix.label}
              </option>
            ))}
          </select>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-4 top-[15px] h-4 w-4 text-stone-400" />
            <input
              id="producer-phone"
              value={formData.phoneNumber}
              onChange={(event) => updateField('phoneNumber', event.target.value)}
              onBlur={() => setTouched((current) => ({ ...current, phoneNumber: true }))}
              placeholder="600 000 000"
              className={`h-12 w-full rounded-[10px] border bg-white pl-11 pr-10 text-base shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)] ${fieldClass(Boolean(errors.phoneNumber), touched.phoneNumber && validity.phoneNumber)}`}
            />
            <StatusIcon valid={touched.phoneNumber && validity.phoneNumber} />
          </div>
        </div>
        <InlineError message={errors.phoneNumber} />
      </div>

      <div className="relative">
        <label htmlFor="producer-password" className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">
          Contraseña
        </label>
        <LockKeyhole className="pointer-events-none absolute left-4 top-[43px] h-4 w-4 text-stone-400" />
        <input
          id="producer-password"
          type={showPassword ? 'text' : 'password'}
          value={formData.password}
          onChange={(event) => updateField('password', event.target.value)}
          onBlur={() => setTouched((current) => ({ ...current, password: true }))}
              placeholder="Mínimo 6 caracteres"
          className={`mt-2 h-12 w-full rounded-[10px] border bg-white pl-11 pr-12 text-base shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)] ${fieldClass(Boolean(errors.password), touched.password && validity.password)}`}
        />
        <button
          type="button"
          onClick={() => setShowPassword((current) => !current)}
          className="absolute right-3 top-[38px] rounded-full p-1 text-stone-500 transition hover:bg-stone-100 hover:text-stone-800"
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded-full bg-stone-200">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: passwordStrength.width, backgroundColor: passwordStrength.color }}
            />
          </div>
          <p className="mt-2 text-xs font-medium text-stone-500">
            Fortaleza: <span style={{ color: passwordStrength.color }}>{passwordStrength.label}</span>
          </p>
        </div>
        <InlineError message={errors.password} />
      </div>

        <div className="lg:col-span-2 rounded-[18px] border border-stone-200 bg-stone-50 px-4 py-4">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="producer-legal"
            checked={formData.acceptLegal}
            onChange={(e) => updateField('acceptLegal', e.target.checked)}
            className="mt-1 h-5 w-5 rounded accent-stone-950 cursor-pointer"
          />
          <div>
            <label htmlFor="producer-legal" className="mb-0 text-sm font-semibold text-stone-800">
              Acepto la política de privacidad y los términos
            </label>
            <p className="mt-1 text-sm text-stone-600">
              Puedes revisarlos antes de seguir en{' '}
              <Link to="/legal" target="_blank" className="font-semibold text-stone-950 underline underline-offset-2">
                /legal
              </Link>
              .
            </p>
            <InlineError message={errors.acceptLegal} />
          </div>
        </div>
      </div>
    </div>
  );

  const renderStepTwo = () => (
    <div className="space-y-6">
      <div className="relative">
        <label htmlFor="producer-brand" className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">
          Marca o cooperativa
        </label>
        <Store className="pointer-events-none absolute left-4 top-[43px] h-4 w-4 text-stone-400" />
        <input
          id="producer-brand"
          ref={secondRef}
          value={formData.brandName}
          onChange={(event) => updateField('brandName', event.target.value)}
          onBlur={() => setTouched((current) => ({ ...current, brandName: true }))}
          placeholder="Nombre de tu obrador, marca o cooperativa"
          className={`mt-2 h-12 w-full rounded-[10px] border bg-white pl-11 pr-10 text-base shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)] ${fieldClass(Boolean(errors.brandName), touched.brandName && validity.brandName)}`}
        />
        <StatusIcon valid={touched.brandName && validity.brandName} />
        <InlineError message={errors.brandName} />
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">Tipo de producto</p>
        <div className="mt-3 flex flex-wrap gap-3">
          {PRODUCT_TYPES.map((type) => {
            const active = formData.productTypes.includes(type);
            return (
              <button
                key={type}
                type="button"
                onClick={() => toggleProductType(type)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${active ? 'border-stone-950 bg-stone-950 text-white' : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'}`}
              >
                {type}
              </button>
            );
          })}
        </div>
        <InlineError message={errors.productTypes} />
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">Exportación actual</p>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          {EXPORT_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => updateField('exportStage', option)}
              className={`rounded-[18px] border px-4 py-4 text-left text-sm font-semibold transition ${formData.exportStage === option ? 'border-stone-950 bg-stone-100 text-stone-900' : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'}`}
            >
              {option}
            </button>
          ))}
        </div>
        <InlineError message={errors.exportStage} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div>
        <label htmlFor="producer-region" className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">
            Región de producción
          </label>
          <div className="relative">
            <MapPinned className="pointer-events-none absolute left-4 top-[15px] h-4 w-4 text-stone-400" />
            <select
              id="producer-region"
              value={formData.region}
              onChange={(event) => updateField('region', event.target.value)}
              className={`mt-2 h-12 w-full rounded-[10px] bg-white pl-11 pr-4 text-base shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)] ${fieldClass(Boolean(errors.region), touched.region && validity.region)}`}
            >
              <option value="">Selecciona tu región</option>
              {REGIONS.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </div>
          <InlineError message={errors.region} />
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">Número de referencias</p>
          <div className="mt-3 space-y-3">
            {REFERENCE_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => updateField('references', option)}
                className={`flex w-full items-center justify-between rounded-[14px] border px-4 py-3 text-sm font-semibold transition ${formData.references === option ? 'border-stone-950 bg-stone-100 text-stone-900' : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'}`}
              >
                <span>{option}</span>
                <span className={`h-3 w-3 rounded-full border ${formData.references === option ? 'border-stone-950 bg-stone-950' : 'border-stone-300 bg-white'}`} />
              </button>
            ))}
          </div>
          <InlineError message={errors.references} />
        </div>
      </div>
    </div>
  );

  const renderStepThree = () => (
    <div className="space-y-7">
      <div>
        <div className="grid h-auto w-full grid-cols-3 rounded-[18px] bg-stone-100 p-1">
          {Object.values(PRODUCER_PLANS).map((plan) => (
            <button
              key={plan.key}
              type="button"
              ref={plan.key === 'free' ? thirdRef : undefined}
              onClick={() => updateField('plan', plan.key)}
              className={`rounded-[14px] px-3 py-3 text-left transition ${selectedPlan === plan.key ? 'bg-white shadow-[0_12px_24px_-22px_rgba(0,0,0,0.25)]' : ''}`}
            >
              <div className="flex w-full flex-col items-start gap-2">
                <PlanPill
                  label={plan.badge}
                  selected={selectedPlan === plan.key}
                  accent={plan.key === 'pro' ? 'bg-stone-200 text-stone-700' : plan.key === 'elite' ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-800'}
                />
                <div>
                  <p className="text-base font-bold text-stone-900">{plan.name}</p>
                  <p className="text-xs text-stone-500">{plan.price}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {Object.values(PRODUCER_PLANS).map((plan) => (
          selectedPlan === plan.key ? (
            <div key={plan.key} className="mt-6">
              <div className={`rounded-[26px] border p-6 transition ${plan.accentClass}`}>
                <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
                  <div>
                    <PlanPill
                      label={plan.badge}
                      selected={true}
                      accent={plan.key === 'pro' ? 'bg-stone-200 text-stone-700' : plan.key === 'elite' ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-800'}
                    />
                    <h3 className="mt-4 text-3xl font-bold tracking-[-0.03em] text-stone-900">{plan.name}</h3>
                    <p className="mt-2 text-sm leading-7 text-stone-600">{plan.summary}</p>
                    <div className="mt-5 rounded-[18px] border border-stone-200 bg-stone-50 p-4">
                      <p className="text-sm font-semibold text-stone-500">Cargo o comisión</p>
                      <p className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-stone-900">{plan.chargeLabel}</p>
                      <p className="mt-2 text-sm text-stone-600">Comisión de plataforma: {plan.commission}</p>
                    </div>
                  </div>
                  <div className="rounded-[18px] border border-stone-200 bg-white p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">Incluye</p>
                    <ul className="mt-4 space-y-3">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3 text-sm leading-7 text-stone-700">
                          <Wheat className="mt-1 h-4 w-4 shrink-0 text-stone-500" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : null
        ))}
      </div>

      {selectedPlan === 'free' ? (
        <div className="rounded-[22px] border border-stone-200 bg-stone-50 p-5">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="producer-commission"
              checked={formData.acceptCommission}
              onChange={(e) => updateField('acceptCommission', e.target.checked)}
              className="mt-1 h-5 w-5 rounded accent-stone-950 cursor-pointer"
            />
            <div>
              <label htmlFor="producer-commission" className="mb-0 text-sm font-semibold text-stone-950">
                Entiendo que Hispaloshop retiene un 20% de comisión por venta
              </label>
              <p className="mt-2 text-sm leading-7 text-stone-700">
                No pagarás nada hasta que vendas. Cuando vendas, te quedarás con el 80%.
              </p>
              <InlineError message={errors.acceptCommission} />
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-[22px] border border-stone-200 bg-white p-5 shadow-[0_22px_50px_-34px_rgba(0,0,0,0.18)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">Pago seguro</p>
              <h4 className="mt-2 text-xl font-bold tracking-[-0.02em] text-stone-900">Stripe Elements integrado</h4>
              <p className="mt-2 text-sm leading-7 text-stone-600">
                Pago seguro por Stripe. Cancela cuando quieras desde tu panel.
              </p>
            </div>
            <div className="rounded-2xl bg-stone-100 p-3 text-stone-600">
              <CreditCard className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-5 rounded-[18px] border border-stone-200 bg-stone-50 px-4 py-4">
            {stripeLoading ? (
              <div className="flex items-center gap-3 text-sm text-stone-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Preparando Stripe Elements...
              </div>
            ) : null}
            <div ref={cardMountRef} className={`${stripeLoading ? 'hidden' : 'block'} min-h-[48px]`} />
          </div>

          <p className="mt-3 text-xs leading-6 text-stone-500">
            Pago seguro por Stripe. Si tu banco pide una confirmación extra, la resolvemos aquí mismo sin sacarte de la página.
          </p>
          <InlineError message={errors.card} />
          {stripeError && !errors.card ? <p className="mt-3 text-sm text-stone-600">{stripeError}</p> : null}
        </div>
      )}
    </div>
  );

  const renderSuccess = () => {
    const activeUser = successState?.user || user;
    return (
      <motion.div
        key="producer-success"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -24 }}
        className="rounded-[32px] border border-stone-200 bg-white p-8 shadow-[0_28px_70px_-40px_rgba(0,0,0,0.22)] sm:p-10"
      >
        <div className="mx-auto max-w-2xl">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-stone-100 text-stone-500 shadow-[0_18px_44px_-26px_rgba(28,28,28,0.25)]">
            <CircleCheckBig className="h-10 w-10" />
          </div>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-stone-300 bg-stone-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
            <Sparkles className="h-4 w-4 text-stone-500" />
            Infraestructura activada
          </div>
          <h3 className="mt-6 text-4xl font-extrabold tracking-[-0.04em] text-stone-900">
            Bienvenido a la revolución de los productores honestos.
          </h3>
          <p className="mt-4 text-lg leading-8 text-stone-600">
            Revisa tu email para verificar tu cuenta y accede a tu panel para completar tu perfil.
          </p>
          <div className="mt-8 rounded-[22px] border border-stone-200 bg-stone-50 p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-stone-400" />
              <p className="text-sm leading-7 text-stone-600">
                Si tu alta queda pendiente de revisión, verás primero el estado de aprobación. Desde ahí sigues el proceso sin perder nada.
              </p>
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                clearFlow();
                redirectAfterAuth(activeUser, navigate);
              }}
              className="rounded-2xl bg-stone-950 px-6 py-4 text-sm font-semibold text-white transition hover:bg-stone-800"
            >
              Ir a mi panel de control
            </button>
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                clearFlow();
                navigate('/producer/products');
              }}
              className="rounded-2xl border border-stone-300 px-6 py-4 text-sm font-semibold text-stone-700 transition hover:border-stone-900 hover:text-stone-900"
            >
              Ver guía rápida para subir mi primer producto
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          closeModal();
          return;
        }
        onOpenChange(true);
      }}
    >
      <DialogContent className="left-0 top-0 h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 rounded-none border-0 bg-white p-0 [&>button]:hidden">
        <DialogTitle className="sr-only">Registro de productor Hispaloshop</DialogTitle>
        <div className="flex h-full flex-col">
          <div className="border-b border-stone-200 px-4 py-4 sm:px-6 lg:px-10">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-stone-400">Productor Hispaloshop</p>
                <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-stone-900">
                  {successState ? 'Alta completada' : step === 1 ? 'Quién eres' : step === 2 ? 'Tu producción' : 'Confirma tu plan'}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-600 transition hover:border-stone-300 hover:text-stone-900"
              >
                Cerrar
              </button>
            </div>
            <div className="mt-5">
              <ProgressDots step={step} success={Boolean(successState)} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-hs-bg">
            <div className="mx-auto flex h-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:flex-row lg:gap-12 lg:px-10 lg:py-10">
              <aside className="w-full rounded-[28px] bg-hs-black p-6 text-white shadow-[0_24px_70px_-36px_rgba(44,36,27,0.6)] lg:max-w-[360px]">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-400">Lo que te llevas</p>
                <h3 className="mt-4 text-3xl font-extrabold tracking-[-0.04em] text-white">
                  {successState ? 'Ya tienes la escalera construida.' : activePlan.name}
                </h3>
                <p className="mt-4 text-sm leading-7 text-white/78">
                  {successState
                    ? 'Tu cuenta ya existe y el siguiente paso es verificar el email y terminar de preparar tu perfil.'
                    : activePlan.summary}
                </p>
                <div className="mt-7 rounded-[22px] border border-white/10 bg-white/5 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">Precio</p>
                  <p className="mt-3 text-4xl font-extrabold tracking-[-0.04em] text-white">{activePlan.price}</p>
                  <p className="mt-2 text-sm text-white/70">Comisión vigente: {activePlan.commission}</p>
                </div>
                <div className="mt-6 space-y-4 text-sm text-white/74">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-stone-400" />
                    <p>Guardamos el progreso en localStorage con la clave `hispalo_producer_signup`.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-stone-400" />
                    <p>La contraseña no se guarda en localStorage, así evitas dejar un secreto expuesto.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CreditCard className="mt-1 h-4 w-4 shrink-0 text-stone-400" />
                    <p>FREE crea la cuenta al instante. PRO y ELITE activan Stripe inline sin salir del flujo.</p>
                  </div>
                </div>
              </aside>

              <section className="flex-1">
                <AnimatePresence mode="wait">
                  {successState ? (
                    renderSuccess()
                  ) : (
                    <motion.div
                      key={`producer-step-${step}`}
                      initial={{ opacity: 0, x: 28 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -28 }}
                      transition={{ duration: 0.28, ease: 'easeOut' }}
                      className="rounded-[32px] border border-stone-200 bg-white p-6 shadow-[0_28px_70px_-42px_rgba(0,0,0,0.22)] sm:p-8"
                    >
                      {paymentNotice ? (
                        <div className="mb-6 rounded-[18px] border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
                          {paymentNotice}
                        </div>
                      ) : null}

                      {step === 1 ? renderStepOne() : null}
                      {step === 2 ? renderStepTwo() : null}
                      {step === 3 ? renderStepThree() : null}

                      <div className="mt-10 flex flex-col gap-4 border-t border-stone-200 pt-6 lg:flex-row lg:items-center lg:justify-between">
                        <div className="text-sm leading-7 text-stone-500">
                          {step === 1
                            ? 'Empezamos por lo mínimo para no ponerte otra barrera más.'
                            : step === 2
                              ? 'Esto nos ayuda a entender tu realidad y orientarte mejor.'
                              : 'Estamos a un paso de abrir tu tienda y dejar la infraestructura preparada.'}
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                          {step > 1 ? (
                            <button
                              type="button"
                              onClick={() => setStep((current) => Math.max(current - 1, 1))}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 transition hover:border-stone-900 hover:text-stone-900"
                            >
                              <ArrowLeft className="h-4 w-4" />
                              Atrás
                            </button>
                          ) : null}

                          {step < 3 ? (
                            <button
                              type="button"
                              onClick={proceed}
                              disabled={step === 1 && !formData.acceptLegal}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-300"
                            >
                              Continuar
                              <ArrowRight className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={submitFlow}
                              disabled={submitting}
                              className="inline-flex min-w-[250px] items-center justify-center gap-2 rounded-2xl bg-stone-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              {submitting ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Configurando tu infraestructura...
                                </>
                              ) : selectedPlan === 'free' ? (
                                'Crear mi cuenta y empezar'
                              ) : (
                                <>
                                  <Sparkles className="h-4 w-4" />
                                  Completar suscripción y abrir mi tienda
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

