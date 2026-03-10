import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleCheckBig,
  CreditCard,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';
import { redirectAfterAuth } from '../../lib/navigation';
import { API } from '../../utils/api';

const STORAGE_KEY = 'hispaloshop_importer_onboarding_v2';
const PLAN_META = {
  free: { name: 'FREE', price: '0€/mes', badge: 'Empieza hoy', commission: '20%', summary: 'Validacion de mercado y primeras ventas.' },
  pro: { name: 'PRO', price: '79€ + IVA/mes', badge: 'Recomendado', commission: '18%', summary: 'IA, pricing y matching local.' },
  elite: { name: 'ELITE', price: '149€ + IVA/mes', badge: 'Empresas', commission: '17%', summary: 'Analisis global y prioridad total.' },
};
const PHONE_PREFIXES = [
  { value: '+34', label: 'ES +34' },
  { value: '+33', label: 'FR +33' },
  { value: '+39', label: 'IT +39' },
  { value: '+49', label: 'DE +49' },
  { value: '+44', label: 'UK +44' },
  { value: '+1', label: 'US +1' },
  { value: '+82', label: 'KR +82' },
];
const PRODUCT_TYPES = ['Alimentacion', 'Bebidas', 'Gourmet', 'Organico', 'Snacks', 'Congelado', 'Premium', 'Retail'];
const VOLUME_OPTIONS = ['< 100 unidades', '100-1000', '1000-10000', '10000+'];
const CONFETTI = Array.from({ length: 12 }, (_, index) => ({
  id: index,
  left: `${10 + index * 7}%`,
  delay: index * 0.12,
  duration: 2.6 + (index % 3) * 0.35,
  color: ['#f59e0b', '#3b82f6', '#10b981', '#fb7185'][index % 4],
}));

let stripeLoader;

function normalizePlan(plan) {
  const value = String(plan || 'free').toLowerCase();
  return value === 'pro' || value === 'elite' ? value : 'free';
}

function isPaidPlan(plan) {
  return normalizePlan(plan) !== 'free';
}

function sanitizePhone(value) {
  return String(value || '').replace(/[^\d]/g, '');
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function buildInitialState(defaultCountry, initialPlan) {
  return {
    fullName: '',
    email: '',
    password: '',
    phonePrefix: '+34',
    phoneNumber: '',
    country: defaultCountry || 'ES',
    tradeStage: 'Ya tengo stock',
    productTypes: [],
    monthlyVolume: '100-1000',
    hasCompany: true,
    companyName: '',
    fiscalAddress: '',
    vatCif: '',
    plan: normalizePlan(initialPlan),
    acceptCommission: false,
  };
}

function readStoredState(defaultCountry, initialPlan) {
  const fallback = buildInitialState(defaultCountry, initialPlan);
  if (typeof window === 'undefined') return { step: 1, formData: fallback };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { step: 1, formData: fallback };
    const parsed = JSON.parse(raw);
    return {
      step: parsed?.step >= 1 && parsed?.step <= 3 ? parsed.step : 1,
      formData: {
        ...fallback,
        ...(parsed?.formData || {}),
        password: '',
        country: parsed?.formData?.country || fallback.country,
        plan: normalizePlan(parsed?.formData?.plan || initialPlan),
        productTypes: Array.isArray(parsed?.formData?.productTypes) ? parsed.formData.productTypes : [],
      },
    };
  } catch {
    return { step: 1, formData: fallback };
  }
}

function loadStripeJs() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Stripe no esta disponible'));
  if (window.Stripe) return Promise.resolve(window.Stripe);
  if (!stripeLoader) {
    stripeLoader = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.async = true;
      script.onload = () => resolve(window.Stripe);
      script.onerror = () => reject(new Error('No se pudo cargar Stripe.js'));
      document.body.appendChild(script);
    });
  }
  return stripeLoader;
}

function fieldClass(hasError, isValid) {
  if (hasError) return 'border-red-500 focus-visible:border-red-500 focus-visible:ring-2 focus-visible:ring-red-500/20';
  if (isValid) return 'border-emerald-500 focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20';
  return 'border-slate-300 focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20';
}

function StatusIcon({ valid }) {
  if (!valid) return null;
  return <CheckCircle2 className="pointer-events-none absolute right-3 top-11 h-4 w-4 text-emerald-500" aria-hidden="true" />;
}

export default function OnboardingModal({ open, onOpenChange, initialPlan = 'free' }) {
  const navigate = useNavigate();
  const { register, user } = useAuth();
  const { country, countries } = useLocale();
  const storedState = useMemo(() => readStoredState(country, initialPlan), [country, initialPlan]);

  const [step, setStep] = useState(storedState.step);
  const [formData, setFormData] = useState(storedState.formData);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
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

  const selectedPlan = normalizePlan(formData.plan);
  const activePlan = PLAN_META[selectedPlan];
  const progress = successState ? 100 : step === 1 ? 25 : step === 2 ? 50 : 75;
  const combinedPhone = `${formData.phonePrefix}${sanitizePhone(formData.phoneNumber)}`;
  const countryOptions = useMemo(
    () => Object.entries(countries || {})
      .map(([code, data]) => ({ code, name: data?.name || code }))
      .sort((left, right) => left.name.localeCompare(right.name, 'es', { sensitivity: 'base' })),
    [countries]
  );

  const validity = {
    fullName: formData.fullName.trim().length >= 2,
    email: isValidEmail(formData.email),
    password: formData.password.length >= 6,
    phoneNumber: sanitizePhone(formData.phoneNumber).length >= 6,
    country: Boolean(formData.country),
    companyName: formData.companyName.trim().length >= 2,
    fiscalAddress: formData.fiscalAddress.trim().length >= 8,
    vatCif: formData.vatCif.trim().length >= 4,
  };

  useEffect(() => {
    if (!open) return;
    setFormData((current) => ({
      ...current,
      country: current.country || country || 'ES',
      plan: normalizePlan(initialPlan || current.plan),
    }));
  }, [open, country, initialPlan]);

  useEffect(() => {
    if (!open || successState || typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      step,
      formData: { ...formData, password: '' },
    }));
  }, [formData, open, step, successState]);

  useEffect(() => {
    if (!open) return;
    const target = step === 1 ? firstRef : step === 2 ? secondRef : thirdRef;
    const id = window.requestAnimationFrame(() => target.current?.focus?.());
    return () => window.cancelAnimationFrame(id);
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
          const response = await axios.get(`${API}/sellers/plans`);
          key = response.data?.stripe_publishable_key || '';
          if (!key) {
            throw new Error('Stripe no esta configurado todavia.');
          }
          if (active) {
            setStripeKey(key);
          }
        }

        const StripeCtor = await loadStripeJs();
        if (!active || !cardMountRef.current) return;

        const stripe = StripeCtor(key);
        const elements = stripe.elements({
          appearance: {
            theme: 'stripe',
            variables: {
              colorPrimary: '#3b82f6',
              colorText: '#0f172a',
              colorDanger: '#ef4444',
              borderRadius: '12px',
            },
          },
        });
        const card = elements.create('card', { hidePostalCode: true });
        card.on('change', (event) => {
          if (!active) return;
          setCardComplete(Boolean(event.complete));
          setStripeError(event.error?.message || '');
        });
        card.mount(cardMountRef.current);
        stripeRef.current = stripe;
        cardRef.current = card;
        setCardReady(true);
      } catch (error) {
        if (active) {
          setStripeError(error.message || 'No pudimos preparar el pago.');
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
  }, [open, step, selectedPlan, stripeKey]);

  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
    setPaymentNotice('');
  };

  const markTouched = (fields) => {
    setTouched((current) => fields.reduce((acc, field) => ({ ...acc, [field]: true }), current));
  };

  const toggleProductType = (value) => {
    setFormData((current) => ({
      ...current,
      productTypes: current.productTypes.includes(value)
        ? current.productTypes.filter((item) => item !== value)
        : [...current.productTypes, value],
    }));
    setErrors((current) => ({ ...current, productTypes: '' }));
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
    setFormData(buildInitialState(country, initialPlan));
  };

  const validateStep = (targetStep) => {
    const nextErrors = {};

    if (targetStep === 1) {
      if (!validity.fullName) nextErrors.fullName = 'Necesitamos tu nombre completo.';
      if (!validity.email) nextErrors.email = 'Introduce un email valido.';
      if (!validity.password) nextErrors.password = 'Crea una contrasena de al menos 6 caracteres.';
      if (!validity.phoneNumber) nextErrors.phoneNumber = 'Necesitamos un telefono operativo.';
      if (!validity.country) nextErrors.country = 'Selecciona el pais donde vas a operar.';
      if (Object.keys(nextErrors).length > 0) {
        markTouched(['fullName', 'email', 'password', 'phoneNumber', 'country']);
      }
    }

    if (targetStep === 2) {
      if (!formData.tradeStage) nextErrors.tradeStage = 'Selecciona tu punto de partida.';
      if (formData.productTypes.length === 0) nextErrors.productTypes = 'Elige al menos un tipo de producto.';
      if (!formData.monthlyVolume) nextErrors.monthlyVolume = 'Indica tu volumen estimado.';
      if (!validity.companyName) nextErrors.companyName = 'Necesitamos el nombre fiscal o comercial.';
      if (!validity.fiscalAddress) nextErrors.fiscalAddress = 'Necesitamos una direccion fiscal valida.';
      if (!validity.vatCif) nextErrors.vatCif = 'Necesitamos VAT, CIF o NIF para darte de alta.';
      if (Object.keys(nextErrors).length > 0) {
        markTouched(['companyName', 'fiscalAddress', 'vatCif']);
      }
    }

    if (targetStep === 3) {
      if (selectedPlan === 'free' && !formData.acceptCommission) {
        nextErrors.acceptCommission = 'Debes aceptar la comision del 20% sobre ventas.';
      }
      if (isPaidPlan(selectedPlan)) {
        if (stripeLoading) nextErrors.card = 'Estamos preparando Stripe. Espera un segundo.';
        else if (stripeError) nextErrors.card = stripeError;
        else if (!cardReady || !cardComplete) nextErrors.card = 'Completa los datos de la tarjeta para continuar.';
      }
    }

    setErrors((current) => ({ ...current, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  };

  const buildPayload = () => ({
    email: formData.email.trim().toLowerCase(),
    password: formData.password,
    name: formData.fullName.trim(),
    role: 'importer',
    country: formData.country,
    language: 'es',
    company_name: formData.companyName.trim(),
    phone: combinedPhone,
    whatsapp: combinedPhone,
    contact_person: formData.fullName.trim(),
    fiscal_address: formData.fiscalAddress.trim(),
    vat_cif: formData.vatCif.trim(),
  });

  const ensureImporterSession = async () => {
    if (user?.role === 'importer') return user;
    const response = await register(buildPayload());
    return response?.user || null;
  };

  const subscribeInline = async () => {
    const stripe = stripeRef.current;
    const card = cardRef.current;

    if (!stripe || !card) {
      throw new Error('Stripe no esta listo todavia.');
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
      throw new Error(paymentMethodResult.error.message || 'No se pudo validar la tarjeta.');
    }

    const subscribeResponse = await axios.post(
      `${API}/sellers/me/plan/subscribe-inline`,
      {
        plan: selectedPlan.toUpperCase(),
        payment_method_id: paymentMethodResult.paymentMethod.id,
        billing_name: formData.fullName.trim(),
        billing_email: formData.email.trim().toLowerCase(),
        billing_phone: combinedPhone,
      },
      { withCredentials: true }
    );

    if (subscribeResponse.data?.requires_action && subscribeResponse.data?.client_secret) {
      const confirmation = await stripe.confirmCardPayment(subscribeResponse.data.client_secret);
      if (confirmation.error) {
        throw new Error(confirmation.error.message || 'No pudimos confirmar el pago con tu banco.');
      }

      await axios.post(
        `${API}/sellers/me/plan/subscribe-inline/confirm`,
        {
          subscription_id: subscribeResponse.data.subscription_id,
          plan: selectedPlan.toUpperCase(),
        },
        { withCredentials: true }
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
      const createdUser = await ensureImporterSession();
      if (isPaidPlan(selectedPlan)) {
        await subscribeInline();
      }
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(STORAGE_KEY);
      }
      setSuccessState({ user: createdUser || user, plan: selectedPlan });
      setErrors({});
      setTouched({});
    } catch (error) {
      const detail = error?.response?.data?.detail;
      const message = typeof detail === 'string' ? detail : error.message || 'No pudimos completar el alta.';
      if (user?.role === 'importer' || message.toLowerCase().includes('email already registered')) {
        setPaymentNotice('Tu cuenta ya esta creada. Solo falta activar el plan o terminar la suscripcion.');
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

  const renderError = (field) => (
    errors[field] ? <p className="mt-2 text-sm text-red-500" role="alert">{errors[field]}</p> : null
  );

  const closeModal = () => {
    if (successState) {
      clearFlow();
    }
    onOpenChange(false);
  };

  const renderStepOne = () => (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="relative md:col-span-2">
        <Label htmlFor="importer-full-name" className="text-[12px] font-semibold uppercase tracking-[0.24em] text-slate-500">Nombre completo</Label>
        <Input
          id="importer-full-name"
          ref={firstRef}
          value={formData.fullName}
          onChange={(event) => updateField('fullName', event.target.value)}
          onBlur={() => setTouched((current) => ({ ...current, fullName: true }))}
          placeholder="Tu nombre y apellidos"
          className={`mt-2 h-12 rounded-xl bg-white pr-10 text-base ${fieldClass(Boolean(errors.fullName), touched.fullName && validity.fullName)}`}
        />
        <StatusIcon valid={touched.fullName && validity.fullName} />
        {renderError('fullName')}
      </div>

      <div className="relative">
        <Label htmlFor="importer-email" className="text-[12px] font-semibold uppercase tracking-[0.24em] text-slate-500">Email</Label>
        <Input
          id="importer-email"
          type="email"
          value={formData.email}
          onChange={(event) => updateField('email', event.target.value)}
          onBlur={() => setTouched((current) => ({ ...current, email: true }))}
          placeholder="tu@empresa.com"
          className={`mt-2 h-12 rounded-xl bg-white pr-10 text-base ${fieldClass(Boolean(errors.email), touched.email && validity.email)}`}
        />
        <StatusIcon valid={touched.email && validity.email} />
        {renderError('email')}
      </div>

      <div className="relative">
        <Label htmlFor="importer-password" className="text-[12px] font-semibold uppercase tracking-[0.24em] text-slate-500">Contrasena</Label>
        <Input
          id="importer-password"
          type="password"
          value={formData.password}
          onChange={(event) => updateField('password', event.target.value)}
          onBlur={() => setTouched((current) => ({ ...current, password: true }))}
          placeholder="Minimo 6 caracteres"
          className={`mt-2 h-12 rounded-xl bg-white pr-10 text-base ${fieldClass(Boolean(errors.password), touched.password && validity.password)}`}
        />
        <StatusIcon valid={touched.password && validity.password} />
        {renderError('password')}
      </div>

      <div>
        <Label htmlFor="importer-phone" className="text-[12px] font-semibold uppercase tracking-[0.24em] text-slate-500">Telefono</Label>
        <div className="mt-2 grid gap-3 sm:grid-cols-[140px_1fr]">
          <select
            value={formData.phonePrefix}
            onChange={(event) => updateField('phonePrefix', event.target.value)}
            className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {PHONE_PREFIXES.map((prefix) => <option key={prefix.value} value={prefix.value}>{prefix.label}</option>)}
          </select>
          <div className="relative">
            <Input
              id="importer-phone"
              inputMode="numeric"
              value={formData.phoneNumber}
              onChange={(event) => updateField('phoneNumber', sanitizePhone(event.target.value))}
              onBlur={() => setTouched((current) => ({ ...current, phoneNumber: true }))}
              placeholder="Numero sin espacios"
              className={`h-12 rounded-xl bg-white pr-10 text-base ${fieldClass(Boolean(errors.phoneNumber), touched.phoneNumber && validity.phoneNumber)}`}
            />
            <StatusIcon valid={touched.phoneNumber && validity.phoneNumber} />
          </div>
        </div>
        {renderError('phoneNumber')}
      </div>

      <div>
        <Label htmlFor="importer-country" className="text-[12px] font-semibold uppercase tracking-[0.24em] text-slate-500">Pais donde operaras</Label>
        <select
          id="importer-country"
          value={formData.country}
          onChange={(event) => updateField('country', event.target.value)}
          onBlur={() => setTouched((current) => ({ ...current, country: true }))}
          className={`mt-2 h-12 w-full rounded-xl border bg-white px-4 text-base text-slate-900 focus:outline-none ${fieldClass(Boolean(errors.country), touched.country && validity.country)}`}
        >
          <option value="">Selecciona tu pais principal</option>
          {countryOptions.map((option) => <option key={option.code} value={option.code}>{option.name}</option>)}
        </select>
        {renderError('country')}
      </div>
    </div>
  );

  const renderStepTwo = () => (
    <div className="space-y-8">
      <div>
        <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-slate-500">Ya importas o quieres empezar</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {['Ya tengo stock', 'Buscando productos'].map((option, index) => (
            <button
              key={option}
              ref={index === 0 ? secondRef : undefined}
              type="button"
              onClick={() => updateField('tradeStage', option)}
              className={`rounded-2xl border px-4 py-4 text-left text-sm font-semibold transition ${formData.tradeStage === option ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}
            >
              {option}
            </button>
          ))}
        </div>
        {renderError('tradeStage')}
      </div>

      <div>
        <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-slate-500">Tipo de productos principales</p>
        <div className="mt-3 flex flex-wrap gap-3">
          {PRODUCT_TYPES.map((type) => {
            const active = formData.productTypes.includes(type);
            return (
              <button
                key={type}
                type="button"
                onClick={() => toggleProductType(type)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}
              >
                {type}
              </button>
            );
          })}
        </div>
        {renderError('productTypes')}
      </div>

      <div>
        <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-slate-500">Volumen estimado mensual</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {VOLUME_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => updateField('monthlyVolume', option)}
              className={`rounded-2xl border px-4 py-4 text-left text-sm font-semibold transition ${formData.monthlyVolume === option ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}
            >
              {option}
            </button>
          ))}
        </div>
        {renderError('monthlyVolume')}
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-slate-500">Empresa constituida</p>
            <p className="mt-2 text-sm text-slate-600">Lo usamos para facturacion y aprobacion comercial.</p>
          </div>
          <div className="inline-flex rounded-full border border-slate-300 bg-white p-1">
            {[{ label: 'Si', value: true }, { label: 'No', value: false }].map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => updateField('hasCompany', option.value)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${formData.hasCompany === option.value ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="relative">
            <Label htmlFor="importer-company" className="text-[12px] font-semibold uppercase tracking-[0.24em] text-slate-500">Empresa o autonomo</Label>
            <Input
              id="importer-company"
              value={formData.companyName}
              onChange={(event) => updateField('companyName', event.target.value)}
              onBlur={() => setTouched((current) => ({ ...current, companyName: true }))}
              placeholder="Nombre fiscal o comercial"
              className={`mt-2 h-12 rounded-xl bg-white pr-10 text-base ${fieldClass(Boolean(errors.companyName), touched.companyName && validity.companyName)}`}
            />
            <StatusIcon valid={touched.companyName && validity.companyName} />
            {renderError('companyName')}
          </div>

          <div className="relative">
            <Label htmlFor="importer-vat" className="text-[12px] font-semibold uppercase tracking-[0.24em] text-slate-500">VAT / CIF / NIF</Label>
            <Input
              id="importer-vat"
              value={formData.vatCif}
              onChange={(event) => updateField('vatCif', event.target.value)}
              onBlur={() => setTouched((current) => ({ ...current, vatCif: true }))}
              placeholder="Identificacion fiscal"
              className={`mt-2 h-12 rounded-xl bg-white pr-10 text-base ${fieldClass(Boolean(errors.vatCif), touched.vatCif && validity.vatCif)}`}
            />
            <StatusIcon valid={touched.vatCif && validity.vatCif} />
            {renderError('vatCif')}
          </div>

          <div className="relative md:col-span-2">
            <Label htmlFor="importer-address" className="text-[12px] font-semibold uppercase tracking-[0.24em] text-slate-500">Direccion fiscal</Label>
            <Input
              id="importer-address"
              value={formData.fiscalAddress}
              onChange={(event) => updateField('fiscalAddress', event.target.value)}
              onBlur={() => setTouched((current) => ({ ...current, fiscalAddress: true }))}
              placeholder="Direccion completa para facturacion"
              className={`mt-2 h-12 rounded-xl bg-white pr-10 text-base ${fieldClass(Boolean(errors.fiscalAddress), touched.fiscalAddress && validity.fiscalAddress)}`}
            />
            <StatusIcon valid={touched.fiscalAddress && validity.fiscalAddress} />
            {renderError('fiscalAddress')}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStepThree = () => (
    <div className="space-y-8">
      <div>
        <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-slate-500">Elige tu plan</p>
        <div className="mt-3 grid gap-3 xl:grid-cols-3">
          {Object.entries(PLAN_META).map(([key, plan]) => (
            <button
              key={key}
              ref={key === 'free' ? thirdRef : undefined}
              type="button"
              onClick={() => updateField('plan', key)}
              className={`rounded-[26px] border px-5 py-5 text-left transition ${selectedPlan === key ? key === 'pro' ? 'border-blue-500 bg-blue-50' : key === 'elite' ? 'border-slate-900 bg-slate-900 text-white' : 'border-amber-500 bg-amber-50' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${key === 'pro' ? 'bg-blue-100 text-blue-600' : key === 'elite' ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  {plan.badge}
                </span>
                <span className="text-sm font-semibold">{plan.name}</span>
              </div>
              <p className="mt-4 text-3xl font-extrabold tracking-[-0.03em]">{plan.price}</p>
              <p className={`mt-3 text-sm leading-7 ${selectedPlan === key && key === 'elite' ? 'text-white/75' : 'text-slate-600'}`}>{plan.summary}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
        <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-slate-500">Resumen</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-4">
            <p className="text-sm text-slate-500">Plan</p>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">{activePlan.name}</p>
            <p className="mt-1 text-sm text-slate-600">{activePlan.price}</p>
          </div>
          <div className="rounded-2xl bg-white p-4">
            <p className="text-sm text-slate-500">Perfil</p>
            <p className="mt-2 text-lg font-bold text-slate-900">{formData.companyName || 'Importador en construccion'}</p>
            <p className="mt-1 text-sm text-slate-600">{formData.country || 'Sin pais'}</p>
          </div>
        </div>
      </div>

      {selectedPlan === 'free' ? (
        <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <Checkbox
              id="accept-commission"
              checked={formData.acceptCommission}
              onCheckedChange={(checked) => updateField('acceptCommission', Boolean(checked))}
              className="mt-1 h-5 w-5 rounded-md border-amber-300 data-[state=checked]:bg-amber-500 data-[state=checked]:text-gray-900"
            />
            <div>
              <Label htmlFor="accept-commission" className="text-sm font-semibold text-amber-950">Acepto comision del 20% sobre ventas</Label>
              <p className="mt-2 text-sm leading-7 text-amber-900/80">Empezamos sin cuota fija. Si el mercado responde, luego decides si subes a PRO o ELITE.</p>
              {renderError('acceptCommission')}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_-26px_rgba(15,23,42,0.18)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-slate-500">Pago seguro</p>
              <h4 className="mt-2 text-xl font-extrabold tracking-[-0.02em] text-slate-900">Tarjeta segura inline</h4>
              <p className="mt-2 text-sm leading-7 text-slate-600">Pago seguro. Cancela cuando quieras. No te sacamos del flujo.</p>
            </div>
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
              <CreditCard className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            {stripeLoading ? <div className="flex items-center gap-3 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Preparando Stripe Elements...</div> : null}
            <div ref={cardMountRef} className={`${stripeLoading ? 'hidden' : 'block'} min-h-[48px]`} />
          </div>
          {renderError('card')}
          {stripeError && !errors.card ? <p className="mt-3 text-sm text-red-500">{stripeError}</p> : null}
        </div>
      )}
    </div>
  );

  const renderSuccess = () => (
    <motion.div key="success" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -24 }} className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.28)] sm:p-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {CONFETTI.map((piece) => (
          <motion.span key={piece.id} initial={{ opacity: 0, y: -20, rotate: 0 }} animate={{ opacity: [0, 1, 0], y: [0, 260], rotate: [0, 120, 200] }} transition={{ duration: piece.duration, delay: piece.delay, repeat: Infinity, ease: 'easeInOut' }} style={{ left: piece.left, backgroundColor: piece.color }} className="absolute top-0 h-3 w-3 rounded-full" />
        ))}
      </div>
      <div className="relative z-10 max-w-2xl">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-emerald-500"><CircleCheckBig className="h-9 w-9" /></div>
        <h3 className="mt-6 text-4xl font-extrabold tracking-[-0.03em] text-slate-900">Bienvenido a la revolucion.</h3>
        <p className="mt-4 text-lg leading-8 text-slate-600">Revisa tu email para verificar tu cuenta. Ya tienes la infraestructura que a mi me habria ahorrado perder dinero y tiempo.</p>
        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              const activeUser = successState?.user || user;
              onOpenChange(false);
              clearFlow();
              redirectAfterAuth(activeUser, navigate);
            }}
            className="rounded-2xl bg-slate-900 px-6 py-4 text-sm font-semibold text-white transition hover:bg-slate-950"
          >
            Ir a mi Dashboard
          </button>
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              clearFlow();
              navigate('/b2b/marketplace');
            }}
            className="rounded-2xl border border-slate-300 px-6 py-4 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
          >
            Ver catalogo de productores disponibles
          </button>
        </div>
      </div>
    </motion.div>
  );

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) closeModal(); else onOpenChange(true); }}>
      <DialogContent className="left-0 top-0 h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 rounded-none border-0 bg-white p-0">
        <DialogTitle className="sr-only">Alta de importador Hispaloshop</DialogTitle>
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-200 px-4 py-4 sm:px-6 lg:px-10">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Onboarding importador</p>
                <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-slate-900">{successState ? 'Infraestructura activada' : step === 1 ? 'Quien eres' : step === 2 ? 'Tu negocio' : 'Confirma tu plan'}</h2>
              </div>
              <button type="button" onClick={closeModal} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900">Cerrar</button>
            </div>
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                <span>Paso {successState ? 'final' : step} de 3</span>
                <span>{progress}%</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-200">
                <motion.div initial={false} animate={{ width: `${progress}%` }} transition={{ duration: 0.35, ease: 'easeOut' }} className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-amber-500" />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-50">
            <div className="mx-auto flex h-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:flex-row lg:gap-12 lg:px-10 lg:py-10">
              <aside className="w-full rounded-[28px] bg-slate-900 p-6 text-white lg:max-w-[340px]">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-500">Plan elegido</p>
                <h3 className="mt-4 text-3xl font-extrabold tracking-[-0.03em]">{successState ? 'Listo para salir al mercado' : activePlan.name}</h3>
                <p className="mt-4 text-sm leading-7 text-white/78">{successState ? 'La cuenta ya esta creada y ahora tienes una infraestructura real para vender sin intermediarios.' : activePlan.summary}</p>
                <div className="mt-8 rounded-[24px] border border-white/10 bg-white/5 p-5">
                  <p className="text-sm font-semibold text-white/70">Precio</p>
                  <p className="mt-3 text-4xl font-extrabold">{activePlan.price}</p>
                  <p className="mt-2 text-sm text-white/70">Comision sobre ventas: {activePlan.commission}</p>
                </div>
                <div className="mt-6 space-y-3 text-sm text-white/72">
                  <div className="flex items-start gap-3"><ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-emerald-500" /><p>Sin alerts agresivos y con guardado local del progreso.</p></div>
                  <div className="flex items-start gap-3"><LockKeyhole className="mt-1 h-4 w-4 shrink-0 text-[#3b82f6]" /><p>Tu contrasena no se persiste en localStorage.</p></div>
                  <div className="flex items-start gap-3"><CreditCard className="mt-1 h-4 w-4 shrink-0 text-amber-500" /><p>PRO y ELITE usan Stripe inline. FREE crea la cuenta al instante.</p></div>
                </div>
              </aside>

              <section className="flex-1">
                <AnimatePresence mode="wait">
                  {successState ? (
                    renderSuccess()
                  ) : (
                    <motion.div key={`step-${step}`} initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -28 }} transition={{ duration: 0.28, ease: 'easeOut' }} className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.24)] sm:p-8">
                      {paymentNotice ? <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{paymentNotice}</div> : null}
                      {step === 1 ? renderStepOne() : null}
                      {step === 2 ? renderStepTwo() : null}
                      {step === 3 ? renderStepThree() : null}

                      <div className="mt-10 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-sm text-slate-500">{step === 1 ? 'Te pedimos solo lo necesario para no empezar con friccion.' : step === 2 ? 'Esto nos permite darte de alta como importador real.' : 'Configurando tu infraestructura comercial.'}</div>
                        <div className="flex flex-col gap-3 sm:flex-row">
                          {step > 1 ? <button type="button" onClick={() => setStep((current) => Math.max(current - 1, 1))} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-900"><ArrowLeft className="h-4 w-4" />Atras</button> : null}
                          {step < 3 ? (
                            <button type="button" onClick={proceed} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-950">
                              Continuar
                              <ArrowRight className="h-4 w-4" />
                            </button>
                          ) : (
                            <button type="button" onClick={submitFlow} disabled={submitting} className="inline-flex min-w-[250px] items-center justify-center gap-2 rounded-2xl bg-amber-500 px-6 py-3 text-sm font-semibold text-[#1a1a1a] transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-70">
                              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" />Configurando tu infraestructura...</> : selectedPlan === 'free' ? 'Crear mi cuenta GRATIS' : <><Sparkles className="h-4 w-4" />Completar suscripcion y crear cuenta</>}
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
