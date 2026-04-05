import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, CircleCheckBig, CreditCard, Loader2, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';
import { redirectAfterAuth } from '../../lib/navigation';
import apiClient from '../../services/api/client';
import { useTranslation } from 'react-i18next';
import i18n from "../../locales/i18n";
const STORAGE_KEY = 'hispaloshop_importer_onboarding_v2';
const PLAN_META = {
  free: {
    name: 'FREE',
    price: '0€/mes',
    badge: 'Empieza hoy',
    commission: '20%',
    summary: "Validación de mercado y primeras ventas."
  },
  pro: {
    name: 'PRO',
    price: '79€ + IVA/mes',
    badge: 'Recomendado',
    commission: '18%',
    summary: 'IA, pricing y matching local.'
  },
  elite: {
    name: 'ELITE',
    price: '249€ + IVA/mes',
    badge: 'Empresas',
    commission: '15%',
    summary: "IA comercial avanzada y generación de contratos."
  }
};
const PHONE_PREFIXES = [{
  value: '+34',
  label: 'ES +34'
}, {
  value: '+33',
  label: 'FR +33'
}, {
  value: '+39',
  label: 'IT +39'
}, {
  value: '+49',
  label: 'DE +49'
}, {
  value: '+44',
  label: 'UK +44'
}, {
  value: '+1',
  label: 'US +1'
}, {
  value: '+82',
  label: 'KR +82'
}];
const PRODUCT_TYPES = ['Alimentación', 'Bebidas', 'Gourmet', 'Orgánico', 'Snacks', 'Congelado', 'Premium', 'Retail'];
const VOLUME_OPTIONS = ['< 100 unidades', '100-1000', '1000-10000', '10000+'];
const CONFETTI = Array.from({
  length: 12
}, (_, index) => ({
  id: index,
  left: `${10 + index * 7}%`,
  delay: index * 0.12,
  duration: 2.6 + index % 3 * 0.35,
  color: ['#0c0a09', '#1c1917', '#44403c', '#78716c'][index % 4]
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
    acceptCommission: false
  };
}
function readStoredState(defaultCountry, initialPlan) {
  const fallback = buildInitialState(defaultCountry, initialPlan);
  if (typeof window === 'undefined') return {
    step: 1,
    formData: fallback
  };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {
      step: 1,
      formData: fallback
    };
    const parsed = JSON.parse(raw);
    return {
      step: parsed?.step >= 1 && parsed?.step <= 3 ? parsed.step : 1,
      formData: {
        ...fallback,
        ...(parsed?.formData || {}),
        password: '',
        country: parsed?.formData?.country || fallback.country,
        plan: normalizePlan(parsed?.formData?.plan || initialPlan),
        productTypes: Array.isArray(parsed?.formData?.productTypes) ? parsed.formData.productTypes : []
      }
    };
  } catch {
    return {
      step: 1,
      formData: fallback
    };
  }
}
function loadStripeJs() {
  if (typeof window === 'undefined') return Promise.reject(new Error(i18n.t('onboarding.stripeNoEstaDisponible', 'Stripe no está disponible')));
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
  if (hasError) return 'border-stone-700 focus:outline-none focus:border-stone-950';
  if (isValid) return 'border-stone-400 focus:outline-none focus:border-stone-950';
  return 'border-stone-200 focus:outline-none focus:border-stone-950';
}
function StatusIcon({
  valid
}) {
  if (!valid) return null;
  return <CheckCircle2 className="pointer-events-none absolute right-3 top-11 h-4 w-4 text-stone-500" aria-hidden="true" />;
}
export default function OnboardingModal({
  open,
  onOpenChange,
  initialPlan = 'free'
}) {
  const navigate = useNavigate();
  const {
    register,
    user
  } = useAuth();
  const {
    country,
    countries
  } = useLocale();
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
  const countryOptions = useMemo(() => Object.entries(countries || {}).map(([code, data]) => ({
    code,
    name: data?.name || code
  })).sort((left, right) => left.name.localeCompare(right.name, 'es', {
    sensitivity: 'base'
  })), [countries]);
  const validity = {
    fullName: formData.fullName.trim().length >= 2,
    email: isValidEmail(formData.email),
    password: formData.password.length >= 6,
    phoneNumber: sanitizePhone(formData.phoneNumber).length >= 6,
    country: Boolean(formData.country),
    companyName: formData.companyName.trim().length >= 2,
    fiscalAddress: formData.fiscalAddress.trim().length >= 8,
    vatCif: formData.vatCif.trim().length >= 4
  };
  useEffect(() => {
    if (!open) return;
    setFormData(current => ({
      ...current,
      country: current.country || country || 'ES',
      plan: normalizePlan(initialPlan || current.plan)
    }));
  }, [open, country, initialPlan]);
  useEffect(() => {
    if (!open || successState || typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      step,
      formData: {
        ...formData,
        password: ''
      }
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
          const data = await apiClient.get(`/sellers/plans`);
          key = data?.stripe_publishable_key || '';
          if (!key) {
            throw new Error(i18n.t('onboarding.stripeNoEstaConfiguradoTodavia', 'Stripe no está configurado todavía.'));
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
              colorPrimary: '#0c0a09',
              colorText: '#0c0a09',
              colorDanger: '#0c0a09',
              borderRadius: '12px'
            }
          }
        });
        const card = elements.create('card', {
          hidePostalCode: true
        });
        card.on('change', event => {
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
          setStripeError(error.message || i18n.t('onboarding.noPudimosPrepararElPago', 'No pudimos preparar el pago.'));
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
    setFormData(current => ({
      ...current,
      [field]: value
    }));
    setErrors(current => ({
      ...current,
      [field]: ''
    }));
    setPaymentNotice('');
  };
  const markTouched = fields => {
    setTouched(current => fields.reduce((acc, field) => ({
      ...acc,
      [field]: true
    }), current));
  };
  const toggleProductType = value => {
    setFormData(current => ({
      ...current,
      productTypes: current.productTypes.includes(value) ? current.productTypes.filter(item => item !== value) : [...current.productTypes, value]
    }));
    setErrors(current => ({
      ...current,
      productTypes: ''
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
    setFormData(buildInitialState(country, initialPlan));
  };
  const validateStep = targetStep => {
    const nextErrors = {};
    if (targetStep === 1) {
      if (!validity.fullName) nextErrors.fullName = 'Necesitamos tu nombre completo.';
      if (!validity.email) nextErrors.email = i18n.t('onboarding.introduceUnEmailValido', 'Introduce un email válido.');
      if (!validity.password) nextErrors.password = i18n.t('onboarding.creaUnaContrasenaDeAlMenos6Caract', 'Crea una contraseña de al menos 6 caracteres.');
      if (!validity.phoneNumber) nextErrors.phoneNumber = i18n.t('onboarding.necesitamosUnTelefonoOperativo', 'Necesitamos un teléfono operativo.');
      if (!validity.country) nextErrors.country = i18n.t('onboarding.seleccionaElPaisDondeVasAOperar', 'Selecciona el país donde vas a operar.');
      if (Object.keys(nextErrors).length > 0) {
        markTouched(['fullName', 'email', 'password', 'phoneNumber', 'country']);
      }
    }
    if (targetStep === 2) {
      if (!formData.tradeStage) nextErrors.tradeStage = i18n.t('onboarding.seleccionaTuPuntoDePartida', 'Selecciona tu punto de partida.');
      if (formData.productTypes.length === 0) nextErrors.productTypes = i18n.t('onboarding.eligeAlMenosUnTipoDeProducto', 'Elige al menos un tipo de producto.');
      if (!formData.monthlyVolume) nextErrors.monthlyVolume = 'Indica tu volumen estimado.';
      if (!validity.companyName) nextErrors.companyName = 'Necesitamos el nombre fiscal o comercial.';
      if (!validity.fiscalAddress) nextErrors.fiscalAddress = i18n.t('onboarding.necesitamosUnaDireccionFiscalValida', 'Necesitamos una dirección fiscal válida.');
      if (!validity.vatCif) nextErrors.vatCif = i18n.t('onboarding.necesitamosVatCifONifParaDarteDe', 'Necesitamos VAT, CIF o NIF para darte de alta.');
      if (Object.keys(nextErrors).length > 0) {
        markTouched(['companyName', 'fiscalAddress', 'vatCif']);
      }
    }
    if (targetStep === 3) {
      if (selectedPlan === 'free' && !formData.acceptCommission) {
        nextErrors.acceptCommission = 'Debes aceptar la comisión del 20% sobre ventas.';
      }
      if (isPaidPlan(selectedPlan)) {
        if (stripeLoading) nextErrors.card = 'Estamos preparando Stripe. Espera un segundo.';else if (stripeError) nextErrors.card = stripeError;else if (!cardReady || !cardComplete) nextErrors.card = i18n.t('onboarding.completaLosDatosDeLaTarjetaParaCo', 'Completa los datos de la tarjeta para continuar.');
      }
    }
    setErrors(current => ({
      ...current,
      ...nextErrors
    }));
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
    vat_cif: formData.vatCif.trim()
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
      throw new Error(i18n.t('onboarding.stripeNoEstaListoTodavia', 'Stripe no está listo todavía.'));
    }
    const paymentMethodResult = await stripe.createPaymentMethod({
      type: 'card',
      card,
      billing_details: {
        name: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: combinedPhone
      }
    });
    if (paymentMethodResult.error) {
      throw new Error(paymentMethodResult.error.message || i18n.t('onboarding.noSePudoValidarLaTarjeta', 'No se pudo validar la tarjeta.'));
    }
    const subscribeData = await apiClient.post(`/sellers/me/plan/subscribe-inline`, {
      plan: selectedPlan.toUpperCase(),
      payment_method_id: paymentMethodResult.paymentMethod.id,
      billing_name: formData.fullName.trim(),
      billing_email: formData.email.trim().toLowerCase(),
      billing_phone: combinedPhone
    });
    if (subscribeData?.requires_action && subscribeData?.client_secret) {
      const confirmation = await stripe.confirmCardPayment(subscribeData.client_secret);
      if (confirmation.error) {
        if (confirmation.error.type === 'card_error' || confirmation.error.type === 'validation_error') {
          throw new Error(confirmation.error.message || i18n.t('onboarding.tuBancoRechazoLaOperacion', 'Tu banco rechazó la operación.'));
        }
        throw new Error(i18n.t('onboarding.haOcurridoUnErrorConElPagoPorFa', 'Ha ocurrido un error con el pago. Por favor inténtalo de nuevo.'));
      }
      if (confirmation.paymentIntent?.status === 'requires_payment_method') {
        throw new Error(i18n.t('onboarding.elMetodoDePagoFueRechazadoPorFav', 'El método de pago fue rechazado. Por favor usa otra tarjeta.'));
      }
      await apiClient.post(`/sellers/me/plan/subscribe-inline/confirm`, {
        subscription_id: subscribeData.subscription_id,
        plan: selectedPlan.toUpperCase()
      });
    }
  };
  const submitFlow = async () => {
    if (!validateStep(3)) {
      toast.error(i18n.t('onboarding.revisaLosDatosAntesDeContinuar', 'Revisa los datos antes de continuar.'));
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
      setSuccessState({
        user: createdUser || user,
        plan: selectedPlan
      });
      setErrors({});
      setTouched({});
    } catch (error) {
      const message = error.message || i18n.t('onboarding.noPudimosCompletarElAlta', 'No pudimos completar el alta.');
      if (user?.role === 'importer' || message.toLowerCase().includes('email already registered')) {
        setPaymentNotice(i18n.t('onboarding.tuCuentaYaEstaCreadaSoloFaltaAct', 'Tu cuenta ya está creada. Solo falta activar el plan o terminar la suscripción.'));
      }
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };
  const proceed = () => {
    if (!validateStep(step)) {
      toast.error(i18n.t('onboarding.completaLosCamposObligatoriosParaAv', 'Completa los campos obligatorios para avanzar.'));
      return;
    }
    setStep(current => Math.min(current + 1, 3));
  };
  const renderError = field => errors[field] ? <p className="mt-2 text-sm text-stone-600" role="alert">{errors[field]}</p> : null;
  const closeModal = () => {
    if (successState) {
      clearFlow();
    }
    onOpenChange(false);
  };
  const renderStepOne = () => <div className="grid gap-5 md:grid-cols-2">
      <div className="relative md:col-span-2">
        <label htmlFor="importer-full-name" className="text-[12px] font-semibold uppercase tracking-[0.24em] text-stone-500">Nombre completo</label>
        <input id="importer-full-name" ref={firstRef} value={formData.fullName} onChange={event => updateField('fullName', event.target.value)} onBlur={() => setTouched(current => ({
        ...current,
        fullName: true
      }))} placeholder="Tu nombre y apellidos" className={`mt-2 h-12 w-full rounded-2xl border bg-white pr-10 text-base ${fieldClass(Boolean(errors.fullName), touched.fullName && validity.fullName)}`} />
        <StatusIcon valid={touched.fullName && validity.fullName} />
        {renderError('fullName')}
      </div>

      <div className="relative">
        <label htmlFor="importer-email" className="text-[12px] font-semibold uppercase tracking-[0.24em] text-stone-500">Email</label>
        <input id="importer-email" type="email" value={formData.email} onChange={event => updateField('email', event.target.value)} onBlur={() => setTouched(current => ({
        ...current,
        email: true
      }))} placeholder="tu@empresa.com" className={`mt-2 h-12 w-full rounded-2xl border bg-white pr-10 text-base ${fieldClass(Boolean(errors.email), touched.email && validity.email)}`} />
        <StatusIcon valid={touched.email && validity.email} />
        {renderError('email')}
      </div>

      <div className="relative">
        <label htmlFor="importer-password" className="text-[12px] font-semibold uppercase tracking-[0.24em] text-stone-500">{i18n.t('auth.password', 'Contraseña')}</label>
        <input id="importer-password" type="password" value={formData.password} onChange={event => updateField('password', event.target.value)} onBlur={() => setTouched(current => ({
        ...current,
        password: true
      }))} placeholder={i18n.t('common.minCharacters', 'Mínimo 6 caracteres')} className={`mt-2 h-12 w-full rounded-2xl border bg-white pr-10 text-base ${fieldClass(Boolean(errors.password), touched.password && validity.password)}`} />
        <StatusIcon valid={touched.password && validity.password} />
        {renderError('password')}
      </div>

      <div>
        <label htmlFor="importer-phone" className="text-[12px] font-semibold uppercase tracking-[0.24em] text-stone-500">{i18n.t('common.phone', 'Teléfono')}</label>
        <div className="mt-2 grid gap-3 sm:grid-cols-[140px_1fr]">
          <select value={formData.phonePrefix} onChange={event => updateField('phonePrefix', event.target.value)} className="h-12 rounded-2xl border border-stone-200 bg-white px-4 text-base text-stone-950 focus:outline-none focus:border-stone-950">
            {PHONE_PREFIXES.map(prefix => <option key={prefix.value} value={prefix.value}>{prefix.label}</option>)}
          </select>
          <div className="relative">
            <input id="importer-phone" inputMode="numeric" value={formData.phoneNumber} onChange={event => updateField('phoneNumber', sanitizePhone(event.target.value))} onBlur={() => setTouched(current => ({
            ...current,
            phoneNumber: true
          }))} placeholder={i18n.t('onboarding.numeroSinEspacios', 'Número sin espacios')} className={`h-12 w-full rounded-2xl border bg-white pr-10 text-base ${fieldClass(Boolean(errors.phoneNumber), touched.phoneNumber && validity.phoneNumber)}`} />
            <StatusIcon valid={touched.phoneNumber && validity.phoneNumber} />
          </div>
        </div>
        {renderError('phoneNumber')}
      </div>

      <div>
        <label htmlFor="importer-country" className="text-[12px] font-semibold uppercase tracking-[0.24em] text-stone-500">{i18n.t('onboarding.paisDondeOperaras', 'País donde operarás')}</label>
        <select id="importer-country" value={formData.country} onChange={event => updateField('country', event.target.value)} onBlur={() => setTouched(current => ({
        ...current,
        country: true
      }))} className={`mt-2 h-12 w-full rounded-2xl border bg-white px-4 text-base text-stone-950 focus:outline-none ${fieldClass(Boolean(errors.country), touched.country && validity.country)}`}>
          <option value="">{i18n.t('onboarding.seleccionaTuPaisPrincipal', 'Selecciona tu país principal')}</option>
          {countryOptions.map(option => <option key={option.code} value={option.code}>{option.name}</option>)}
        </select>
        {renderError('country')}
      </div>
    </div>;
  const renderStepTwo = () => <div className="space-y-8">
      <div>
        <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-stone-500">Ya importas o quieres empezar</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {['Ya tengo stock', 'Buscando productos'].map((option, index) => <button key={option} ref={index === 0 ? secondRef : undefined} type="button" onClick={() => updateField('tradeStage', option)} className={`rounded-2xl border px-4 py-4 text-left text-sm font-semibold transition ${formData.tradeStage === option ? 'border-stone-950 bg-stone-100 text-stone-900' : 'border-stone-200 bg-white text-stone-700 hover:border-stone-200'}`}>
              {option}
            </button>)}
        </div>
        {renderError('tradeStage')}
      </div>

      <div>
        <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-stone-500">Tipo de productos principales</p>
        <div className="mt-3 flex flex-wrap gap-3">
          {PRODUCT_TYPES.map(type => {
          const active = formData.productTypes.includes(type);
          return <button key={type} type="button" onClick={() => toggleProductType(type)} className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${active ? 'border-stone-950 bg-stone-950 text-white' : 'border-stone-200 bg-white text-stone-700 hover:border-stone-200'}`}>
                {type}
              </button>;
        })}
        </div>
        {renderError('productTypes')}
      </div>

      <div>
        <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-stone-500">Volumen estimado mensual</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {VOLUME_OPTIONS.map(option => <button key={option} type="button" onClick={() => updateField('monthlyVolume', option)} className={`rounded-2xl border px-4 py-4 text-left text-sm font-semibold transition ${formData.monthlyVolume === option ? 'border-stone-950 bg-stone-100 text-stone-900' : 'border-stone-200 bg-white text-stone-700 hover:border-stone-200'}`}>
              {option}
            </button>)}
        </div>
        {renderError('monthlyVolume')}
      </div>

      <div className="rounded-[28px] border border-stone-200 bg-stone-50 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-stone-500">Empresa constituida</p>
              <p className="mt-2 text-sm text-stone-600">{i18n.t('onboarding.loUsamosParaFacturacionYAprobacion', 'Lo usamos para facturación y aprobación comercial.')}</p>
          </div>
          <div className="inline-flex rounded-full border border-stone-200 bg-white p-1">
            {[{
            label: 'Si',
            value: true
          }, {
            label: 'No',
            value: false
          }].map(option => <button key={option.label} type="button" onClick={() => updateField('hasCompany', option.value)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${formData.hasCompany === option.value ? 'bg-stone-950 text-white' : 'text-stone-600'}`}>
                {option.label}
              </button>)}
          </div>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="relative">
          <label htmlFor="importer-company" className="text-[12px] font-semibold uppercase tracking-[0.24em] text-stone-500">Empresa o autonomo</label>
            <input id="importer-company" value={formData.companyName} onChange={event => updateField('companyName', event.target.value)} onBlur={() => setTouched(current => ({
            ...current,
            companyName: true
          }))} placeholder="Nombre fiscal o comercial" className={`mt-2 h-12 w-full rounded-2xl border bg-white pr-10 text-base ${fieldClass(Boolean(errors.companyName), touched.companyName && validity.companyName)}`} />
            <StatusIcon valid={touched.companyName && validity.companyName} />
            {renderError('companyName')}
          </div>

          <div className="relative">
          <label htmlFor="importer-vat" className="text-[12px] font-semibold uppercase tracking-[0.24em] text-stone-500">VAT / CIF / NIF</label>
            <input id="importer-vat" value={formData.vatCif} onChange={event => updateField('vatCif', event.target.value)} onBlur={() => setTouched(current => ({
            ...current,
            vatCif: true
          }))} placeholder="Identificacion fiscal" className={`mt-2 h-12 w-full rounded-2xl border bg-white pr-10 text-base ${fieldClass(Boolean(errors.vatCif), touched.vatCif && validity.vatCif)}`} />
            <StatusIcon valid={touched.vatCif && validity.vatCif} />
            {renderError('vatCif')}
          </div>

          <div className="relative md:col-span-2">
          <label htmlFor="importer-address" className="text-[12px] font-semibold uppercase tracking-[0.24em] text-stone-500">{i18n.t('onboarding.direccionFiscal', 'Dirección fiscal')}</label>
            <input id="importer-address" value={formData.fiscalAddress} onChange={event => updateField('fiscalAddress', event.target.value)} onBlur={() => setTouched(current => ({
            ...current,
            fiscalAddress: true
          }))} placeholder={i18n.t('onboarding.direccionCompletaParaFacturacion', 'Dirección completa para facturación')} className={`mt-2 h-12 w-full rounded-2xl border bg-white pr-10 text-base ${fieldClass(Boolean(errors.fiscalAddress), touched.fiscalAddress && validity.fiscalAddress)}`} />
            <StatusIcon valid={touched.fiscalAddress && validity.fiscalAddress} />
            {renderError('fiscalAddress')}
          </div>
        </div>
      </div>
    </div>;
  const renderStepThree = () => <div className="space-y-8">
      <div>
        <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-stone-500">Elige tu plan</p>
        <div className="mt-3 grid gap-3 xl:grid-cols-3">
          {Object.entries(PLAN_META).map(([key, plan]) => <button key={key} ref={key === 'free' ? thirdRef : undefined} type="button" onClick={() => updateField('plan', key)} className={`rounded-[26px] border px-5 py-5 text-left transition ${selectedPlan === key ? key === 'elite' ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-950 bg-stone-100' : 'border-stone-200 bg-white text-stone-700 hover:border-stone-200'}`}>
              <div className="flex items-center justify-between gap-3">
                <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${key === 'elite' ? 'bg-white/10 text-white' : 'bg-stone-100 text-stone-700'}`}>
                  {plan.badge}
                </span>
                <span className="text-sm font-semibold">{plan.name}</span>
              </div>
              <p className="mt-4 text-3xl font-extrabold tracking-[-0.03em]">{plan.price}</p>
              <p className={`mt-3 text-sm leading-7 ${selectedPlan === key && key === 'elite' ? 'text-white/75' : 'text-stone-600'}`}>{plan.summary}</p>
            </button>)}
        </div>
      </div>

      <div className="rounded-[28px] border border-stone-200 bg-stone-50 p-5">
        <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-stone-500">Resumen</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-4">
            <p className="text-sm text-stone-500">Plan</p>
            <p className="mt-2 text-2xl font-extrabold text-stone-900">{activePlan.name}</p>
            <p className="mt-1 text-sm text-stone-600">{activePlan.price}</p>
          </div>
          <div className="rounded-2xl bg-white p-4">
            <p className="text-sm text-stone-500">Perfil</p>
            <p className="mt-2 text-lg font-bold text-stone-900">{formData.companyName || 'Importador en construcción'}</p>
            <p className="mt-1 text-sm text-stone-600">{formData.country || 'Sin país'}</p>
          </div>
        </div>
      </div>

      {selectedPlan === 'free' ? <div className="rounded-[28px] border border-stone-200 bg-stone-50 p-5">
          <div className="flex items-start gap-3">
            <input type="checkbox" id="accept-commission" checked={formData.acceptCommission} onChange={e => updateField('acceptCommission', e.target.checked)} className="mt-1 h-5 w-5 rounded accent-stone-950 cursor-pointer" />
            <div>
              <label htmlFor="accept-commission" className="text-sm font-semibold text-stone-950">Acepto comisión del 20% sobre ventas</label>
              <p className="mt-2 text-sm leading-7 text-stone-700">{i18n.t('onboarding.empezamosSinCuotaFijaSiElMercado', 'Empezamos sin cuota fija. Si el mercado responde, luego decides si subes a PRO o ELITE.')}</p>
              {renderError('acceptCommission')}
            </div>
          </div>
        </div> : <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-[0_18px_40px_-26px_rgba(15,23,42,0.18)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-stone-500">Pago seguro</p>
              <h4 className="mt-2 text-xl font-extrabold tracking-[-0.02em] text-stone-900">Tarjeta segura inline</h4>
              <p className="mt-2 text-sm leading-7 text-stone-600">{i18n.t('onboarding.pagoSeguroCancelaCuandoQuierasNo', 'Pago seguro. Cancela cuando quieras. No te sacamos del flujo.')}</p>
            </div>
            <div className="rounded-2xl bg-stone-100 p-3 text-stone-600">
              <CreditCard className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4">
            {stripeLoading ? <div className="flex items-center gap-3 text-sm text-stone-500"><Loader2 className="h-4 w-4 animate-spin" />Preparando Stripe Elements...</div> : null}
            <div ref={cardMountRef} className={`${stripeLoading ? 'hidden' : 'block'} min-h-[48px]`} />
          </div>
          {renderError('card')}
          {stripeError && !errors.card ? <p className="mt-3 text-sm text-stone-600">{stripeError}</p> : null}
        </div>}
    </div>;
  const renderSuccess = () => <motion.div key="success" initial={{
    opacity: 0,
    y: 24
  }} animate={{
    opacity: 1,
    y: 0
  }} exit={{
    opacity: 0,
    y: -24
  }} className="relative overflow-hidden rounded-[32px] border border-stone-200 bg-white p-8 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.28)] sm:p-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {CONFETTI.map(piece => <motion.span key={piece.id} initial={{
        opacity: 0,
        y: -20,
        rotate: 0
      }} animate={{
        opacity: [0, 1, 0],
        y: [0, 260],
        rotate: [0, 120, 200]
      }} transition={{
        duration: piece.duration,
        delay: piece.delay,
        repeat: Infinity,
        ease: 'easeInOut'
      }} style={{
        left: piece.left,
        backgroundColor: piece.color
      }} className="absolute top-0 h-3 w-3 rounded-full" />)}
      </div>
      <div className="relative z-10 max-w-2xl">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-stone-100 text-stone-500"><CircleCheckBig className="h-9 w-9" /></div>
                <h3 className="mt-6 text-4xl font-extrabold tracking-[-0.03em] text-stone-900">{i18n.t('onboarding.bienvenidoALaRevolucion', 'Bienvenido a la revolución.')}</h3>
        <p className="mt-4 text-lg leading-8 text-stone-600">{i18n.t('onboarding.revisaTuEmailParaVerificarTuCuenta', 'Revisa tu email para verificar tu cuenta. Ya tienes la infraestructura que a mi me habria ahorrado perder dinero y tiempo.')}</p>
        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          <button type="button" onClick={() => {
          const activeUser = successState?.user || user;
          onOpenChange(false);
          clearFlow();
          redirectAfterAuth(activeUser, navigate);
        }} className="rounded-2xl bg-stone-950 px-6 py-4 text-sm font-semibold text-white transition hover:bg-stone-900">
            Ir a mi Dashboard
          </button>
          <button type="button" onClick={() => {
          onOpenChange(false);
          clearFlow();
          navigate('/b2b/marketplace');
        }} className="rounded-2xl border border-stone-200 px-6 py-4 text-sm font-semibold text-stone-700 transition hover:border-stone-900 hover:text-stone-900">
            Ver catálogo de productores disponibles
          </button>
        </div>
      </div>
    </motion.div>;
  return <Dialog open={open} onOpenChange={nextOpen => {
    if (!nextOpen) closeModal();else onOpenChange(true);
  }}>
      <DialogContent className="left-0 top-0 h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 rounded-none border-0 bg-white p-0">
        <DialogTitle className="sr-only">Alta de importador Hispaloshop</DialogTitle>
        <div className="flex h-full flex-col">
          <div className="border-b border-stone-200 px-4 py-4 sm:px-6 lg:px-10">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-400">Onboarding importador</p>
                <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-stone-900">{successState ? 'Infraestructura activada' : step === 1 ? 'Quien eres' : step === 2 ? 'Tu negocio' : 'Confirma tu plan'}</h2>
              </div>
              <button type="button" onClick={closeModal} className="rounded-full border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-600 transition hover:border-stone-200 hover:text-stone-900">Cerrar</button>
            </div>
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
                <span>Paso {successState ? 'final' : step} de 3</span>
                <span>{progress}%</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-stone-200">
                <motion.div initial={false} animate={{
                width: `${progress}%`
              }} transition={{
                duration: 0.35,
                ease: 'easeOut'
              }} className="h-2 rounded-full bg-gradient-to-r from-stone-700 to-stone-950" />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-stone-50">
            <div className="mx-auto flex h-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:flex-row lg:gap-12 lg:px-10 lg:py-10">
              <aside className="w-full rounded-[28px] bg-stone-900 p-6 text-white lg:max-w-[340px]">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-400">Plan elegido</p>
                <h3 className="mt-4 text-3xl font-extrabold tracking-[-0.03em]">{successState ? 'Listo para salir al mercado' : activePlan.name}</h3>
                  <p className="mt-4 text-sm leading-7 text-white/78">{successState ? 'La cuenta ya está creada y ahora tienes una infraestructura real para vender sin intermediarios.' : activePlan.summary}</p>
                <div className="mt-8 rounded-[24px] border border-white/10 bg-white/5 p-5">
                  <p className="text-sm font-semibold text-white/70">Precio</p>
                  <p className="mt-3 text-4xl font-extrabold">{activePlan.price}</p>
                  <p className="mt-2 text-sm text-white/70">Comisión sobre ventas: {activePlan.commission}</p>
                </div>
                <div className="mt-6 space-y-3 text-sm text-white/72">
                  <div className="flex items-start gap-3"><ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-stone-400" /><p>{i18n.t('onboarding.sinAlertsAgresivosYConGuardadoLoca', 'Sin alerts agresivos y con guardado local del progreso.')}</p></div>
                  <div className="flex items-start gap-3"><LockKeyhole className="mt-1 h-4 w-4 shrink-0 text-stone-400" /><p>{i18n.t('onboarding.tuContrasenaNoSePersisteEnLocalsto', 'Tu contraseña no se persiste en localStorage.')}</p></div>
                  <div className="flex items-start gap-3"><CreditCard className="mt-1 h-4 w-4 shrink-0 text-stone-400" /><p>{i18n.t('onboarding.proYEliteUsanStripeInlineFreeCre', 'PRO y ELITE usan Stripe inline. FREE crea la cuenta al instante.')}</p></div>
                </div>
              </aside>

              <section className="flex-1">
                <AnimatePresence mode="wait">
                  {successState ? renderSuccess() : <motion.div key={`step-${step}`} initial={{
                  opacity: 0,
                  x: 28
                }} animate={{
                  opacity: 1,
                  x: 0
                }} exit={{
                  opacity: 0,
                  x: -28
                }} transition={{
                  duration: 0.28,
                  ease: 'easeOut'
                }} className="rounded-[32px] border border-stone-200 bg-white p-6 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.24)] sm:p-8">
                      {paymentNotice ? <div className="mb-6 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">{paymentNotice}</div> : null}
                      {step === 1 ? renderStepOne() : null}
                      {step === 2 ? renderStepTwo() : null}
                      {step === 3 ? renderStepThree() : null}

                      <div className="mt-10 flex flex-col gap-3 border-t border-stone-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-sm text-stone-500">{step === 1 ? 'Te pedimos solo lo necesario para no empezar con fricción.' : step === 2 ? 'Esto nos permite darte de alta como importador real.' : 'Configurando tu infraestructura comercial.'}</div>
                        <div className="flex flex-col gap-3 sm:flex-row">
                          {step > 1 ? <button type="button" onClick={() => setStep(current => Math.max(current - 1, 1))} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-stone-200 px-5 py-3 text-sm font-semibold text-stone-700 transition hover:border-stone-900 hover:text-stone-900"><ArrowLeft className="h-4 w-4" />{i18n.t('user_profile.atras', 'Atrás')}</button> : null}
                          {step < 3 ? <button type="button" onClick={proceed} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-900">
                              Continuar
                              <ArrowRight className="h-4 w-4" />
                            </button> : <button type="button" onClick={submitFlow} disabled={submitting} className="inline-flex min-w-[250px] items-center justify-center gap-2 rounded-2xl bg-stone-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-70">
                              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" />Configurando tu infraestructura...</> : selectedPlan === 'free' ? 'Crear mi cuenta GRATIS' : <><Sparkles className="h-4 w-4" />Completar suscripción y crear cuenta</>}
                            </button>}
                        </div>
                      </div>
                    </motion.div>}
                </AnimatePresence>
              </section>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>;
}