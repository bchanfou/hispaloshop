import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, BadgeCheck, Crown, Gem, Instagram, Link2, Sparkles, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../components/ui/dialog';
import apiClient from '../../services/api/client';
import { useTranslation } from 'react-i18next';
import i18n from "../../locales/i18n";
const STEPS = [{
  id: 1,
  label: 'Identidad',
  title: "Quién eres"
}, {
  id: 2,
  label: 'Audiencia',
  title: 'Tu tribu'
}, {
  id: 3,
  label: "Confirmación",
  title: 'Elige tu camino'
}];
const COUNTRY_OPTIONS = ["España", "México", 'Argentina', 'Colombia', 'Chile', 'Perú', 'Estados Unidos', 'Reino Unido', 'Francia', 'Alemania', 'Italia', 'Corea del Sur', 'Otro'];
const AGE_OPTIONS = ['18-24', '25-34', '35-44', '45-54', '55+'];
const NICHE_OPTIONS = ['Food', 'Wellness', 'Fitness', 'Lifestyle', 'Sostenibilidad', 'Mamás', 'Viajes', 'Otro'];
const FOLLOWER_OPTIONS = ['1k-10k', '10k-50k', '50k-200k', '200k-1M', '1M+'];
const TIERS = [{
  key: 'hercules',
  title: 'Quiero empezar como HERCULES (3%)',
  subtitle: 'Aprender y crecer',
  helper: "Recomendado para la mayoría.",
  icon: Gem
}, {
  key: 'atenea',
  title: 'Aplicar directamente a ATENEA (5%)',
  subtitle: 'Ya tengo experiencia en afiliados',
  helper: "Pide revisión manual prioritaria.",
  icon: BadgeCheck
}, {
  key: 'zeus',
  title: 'Solicitar evaluacion para ZEUS (7%)',
  subtitle: 'Soy top en mi nicho',
  helper: "Para perfiles con una comunidad muy activa.",
  icon: Crown
}];
const INITIAL_FORM = {
  artistName: '',
  email: '',
  instagram: '',
  phone: '',
  residenceCountry: '',
  residenceCity: '',
  ageRange: '',
  niches: [],
  followerRange: '',
  audienceCountry: '',
  bestContentUrl: '',
  motivation: '',
  desiredTier: 'hercules',
  agreementCommission: false,
  agreementTracking: false,
  agreementEthical: false,
  agreementTerms: false
};
const SLIDE_VARIANTS = {
  enter: direction => ({
    opacity: 0,
    x: direction > 0 ? 56 : -56
  }),
  center: {
    opacity: 1,
    x: 0
  },
  exit: direction => ({
    opacity: 0,
    x: direction > 0 ? -56 : 56
  })
};
const INSTAGRAM_PATTERN = /^@?[A-Za-z0-9._]{1,30}$/;
function normalizeInstagram(value) {
  const normalized = value.trim().replace(/^@+/, '');
  return normalized ? `@${normalized}` : '';
}
function isValidUrl(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}
function FieldLabel({
  children,
  optional = false
}) {
  return <div className="mb-2 flex items-center justify-between gap-3">
      <span className="text-sm font-semibold text-stone-950">{children}</span>
      {optional && <span className="text-xs uppercase tracking-[0.24em] text-stone-400">Opcional</span>}
    </div>;
}
function FieldError({
  children
}) {
  if (!children) {
    return null;
  }
  return <p className="mt-2 text-sm text-stone-700">{children}</p>;
}
export default function ApplicationModal({
  open,
  onOpenChange
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedTier, setSubmittedTier] = useState('hercules');
  const progressValue = useMemo(() => step / STEPS.length * 100, [step]);
  const referredBy = searchParams.get('referred_by') || searchParams.get('ref') || '';
  useEffect(() => {
    if (!open) {
      setStep(1);
      setDirection(1);
      setErrors({});
      setSubmitting(false);
      setSubmitted(false);
      setSubmittedTier('hercules');
      setForm(INITIAL_FORM);
    }
  }, [open]);
  const updateField = (field, value) => {
    setForm(current => ({
      ...current,
      [field]: value
    }));
    setErrors(current => ({
      ...current,
      [field]: undefined
    }));
  };
  const toggleNiche = value => {
    setForm(current => {
      const exists = current.niches.includes(value);
      return {
        ...current,
        niches: exists ? current.niches.filter(item => item !== value) : [...current.niches, value]
      };
    });
    setErrors(current => ({
      ...current,
      niches: undefined
    }));
  };
  const validateStep = stepId => {
    const nextErrors = {};
    if (stepId === 1) {
      if (!form.artistName.trim()) nextErrors.artistName = i18n.t('application.necesitamosSaberComoTeConocen', 'Necesitamos saber cómo te conocen.');
      if (!form.email.trim()) {
        nextErrors.email = i18n.t('application.tuEmailProfesionalEsObligatorio', 'Tu email profesional es obligatorio.');
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
        nextErrors.email = i18n.t('application.eseEmailNoPareceValido', 'Ese email no parece válido.');
      }
      if (!form.instagram.trim()) {
        nextErrors.instagram = i18n.t('application.tuInstagramPrincipalEsObligatorio', 'Tu Instagram principal es obligatorio.');
      } else if (!INSTAGRAM_PATTERN.test(form.instagram.trim())) {
        nextErrors.instagram = 'Usa un formato tipo @tuusuario.';
      }
      if (!form.phone.trim()) nextErrors.phone = i18n.t('application.necesitamosUnaViaRealParaContactart', 'Necesitamos una vía real para contactarte.');
      if (!form.residenceCity.trim()) nextErrors.residenceCity = 'Indica tu ciudad.';
      if (!form.residenceCountry.trim()) nextErrors.residenceCountry = i18n.t('application.seleccionaTuPais', 'Selecciona tu país.');
    }
    if (stepId === 2) {
      if (form.niches.length === 0) nextErrors.niches = i18n.t('application.eligeAlMenosUnNicho', 'Elige al menos un nicho.');
      if (!form.followerRange) nextErrors.followerRange = i18n.t('application.seleccionaTuRangoDeSeguidores', 'Selecciona tu rango de seguidores.');
      if (!form.audienceCountry) nextErrors.audienceCountry = i18n.t('application.seleccionaElPaisPrincipalDeTuAudie', 'Selecciona el país principal de tu audiencia.');
      if (!form.motivation.trim()) {
        nextErrors.motivation = i18n.t('application.cuentanosPorQueQuieresEntrar', 'Cuéntanos por qué quieres entrar.');
      } else if (form.motivation.trim().length < 140) {
        nextErrors.motivation = i18n.t('application.necesitamosAlMenos140CaracteresPara', 'Necesitamos al menos 140 caracteres para filtrar humo.');
      }
      if (!isValidUrl(form.bestContentUrl.trim())) {
        nextErrors.bestContentUrl = i18n.t('application.eseEnlaceNoPareceValido', 'Ese enlace no parece válido.');
      }
    }
    if (stepId === 3) {
      if (!form.desiredTier) nextErrors.desiredTier = 'Elige el tier que quieres solicitar.';
      if (!form.agreementCommission) nextErrors.agreementCommission = i18n.t('application.debesAceptarEstaCondicion', 'Debes aceptar esta condición.');
      if (!form.agreementTracking) nextErrors.agreementTracking = i18n.t('application.debesAceptarEstaCondicion', 'Debes aceptar esta condición.');
      if (!form.agreementEthical) nextErrors.agreementEthical = i18n.t('application.debesAceptarEstaCondicion', 'Debes aceptar esta condición.');
      if (!form.agreementTerms) nextErrors.agreementTerms = i18n.t('application.debesAceptarEstaCondicion', 'Debes aceptar esta condición.');
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };
  const goToNextStep = () => {
    if (!validateStep(step)) {
      return;
    }
    setDirection(1);
    setStep(current => Math.min(current + 1, STEPS.length));
  };
  const goToPreviousStep = () => {
    setDirection(-1);
    setStep(current => Math.max(current - 1, 1));
  };
  const handleSubmit = async event => {
    event.preventDefault();
    if (!validateStep(3)) {
      return;
    }
    const payload = {
      name: form.artistName.trim(),
      email: form.email.trim().toLowerCase(),
      instagram: normalizeInstagram(form.instagram),
      followers: form.followerRange,
      niche: form.niches.join(', '),
      message: form.motivation.trim(),
      artist_name: form.artistName.trim(),
      instagram_handle: normalizeInstagram(form.instagram),
      phone: form.phone.trim(),
      residence_country: form.residenceCountry,
      residence_city: form.residenceCity.trim(),
      age_range: form.ageRange || null,
      niches: form.niches,
      follower_range: form.followerRange,
      audience_country: form.audienceCountry,
      best_content_url: form.bestContentUrl.trim() || null,
      desired_tier: form.desiredTier,
      agreements: {
        commission_post_shipping_taxes: form.agreementCommission,
        tracking_18_months: form.agreementTracking,
        ethical_promotion_only: form.agreementEthical,
        terms_accepted: form.agreementTerms
      },
      referred_by: referredBy || null,
      application_source: 'influencer_landing_2026',
      requested_path: location.pathname
    };
    setSubmitting(true);
    try {
      await apiClient.post(`/influencers/apply`, payload);
      setSubmittedTier(form.desiredTier);
      setSubmitted(true);
    } catch (error) {
      const detail = error?.message;
      if (detail === 'Application already pending' || detail === 'Already registered or has pending application') {
        toast.error(i18n.t('application.yaExisteUnaSolicitudOCuentaConEst', 'Ya existe una solicitud o cuenta con este email.'));
      } else {
        toast.error(i18n.t('application.noPudimosEnviarLaSolicitudIntental', 'No pudimos enviar la solicitud. Intentalo de nuevo.'));
      }
    } finally {
      setSubmitting(false);
    }
  };
  const finalButtonLabel = form.desiredTier === 'hercules' ? 'Enviar solicitud' : i18n.t('application.solicitarRevision', 'Solicitar revisión');
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="left-0 top-0 h-screen w-screen max-w-none translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-none border-0 bg-transparent p-0 shadow-none [&>button]:right-5 [&>button]:top-5 [&>button]:rounded-full [&>button]:border [&>button]:border-stone-200 [&>button]:bg-stone-100 [&>button]:p-2 [&>button]:text-stone-700 [&>button]:opacity-100">
        <DialogTitle className="sr-only">{i18n.t('application.aplicacionInfluencerHispaloshop', 'Aplicación influencer Hispaloshop')}</DialogTitle>
        <DialogDescription className="sr-only">
          Formulario de tres pasos para aplicar al programa de influencers de Hispaloshop.
        </DialogDescription>
        <div className="grid h-full bg-white lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="hidden overflow-hidden bg-stone-950 p-10 text-stone-100 lg:flex lg:flex-col">
            <div className="flex items-center gap-3 text-sm uppercase tracking-[0.28em] text-stone-400">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Programa de influencers Hispaloshop
            </div>

            <div className="mt-10 max-w-md">
              <p className="text-sm uppercase tracking-[0.28em] text-stone-400">{i18n.t('application.aplicacionReal', 'Aplicación real')}</p>
              <h2 className="mt-4 text-4xl font-black leading-tight text-white">
                No es un formulario corporativo. Es tu puerta de salida.
              </h2>
              <p className="mt-5 text-base leading-7 text-stone-300">
                Tres pasos. Sin pago. Sin humo. Si eliges Hércules, entramos en activación rápida. Si apuntas a
                Atenea o Zeus, hacemos revisión humana en 24-48h.
              </p>
            </div>

            <div className="mt-10 space-y-4">
              <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur">
                <p className="text-sm font-semibold text-white">Lo que miramos</p>
                <ul className="mt-3 space-y-3 text-sm leading-6 text-stone-300">
                  <li>Engagement real, no seguidores inflados.</li>
                  <li>{i18n.t('application.siTuVozEncajaConComidaWellnessL', 'Si tu voz encaja con comida, wellness, lifestyle o sostenibilidad.')}</li>
                  <li>{i18n.t('application.siQuieresRecomendarCosasQueDeVerda', 'Si quieres recomendar cosas que de verdad podrías usar.')}</li>
                </ul>
              </div>

              <div className="rounded-[28px] border border-stone-600 bg-stone-800 p-5">
                <p className="text-sm font-semibold text-white">Tracking que importa</p>
                <p className="mt-3 text-sm leading-6 text-stone-300">
                  Cada compra que conectes se queda atribuida durante 18 meses. No necesitas vivir esclavizado al
                  próximo reel.
                </p>
              </div>
            </div>

            <div className="mt-auto rounded-[30px] border border-white/10 bg-white/5 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-700 text-stone-300">
                  <Instagram className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">@bchanfuah</p>
                  <p className="text-sm text-stone-300">{i18n.t('application.siQuieresComprobarQueSoyRealAhiM', 'Si quieres comprobar que soy real, ahí me tienes.')}</p>
                </div>
              </div>
            </div>
          </aside>

          <section className="relative flex min-h-screen flex-col overflow-hidden bg-white">
            <div className="border-b border-stone-200 px-5 py-4 sm:px-8">
              <div className="mx-auto w-full max-w-3xl">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.32em] text-stone-950">Aplicacion influencer</p>
                    <p className="mt-2 text-sm text-stone-500">Identidad - Audiencia - Confirmacion</p>
                  </div>
                  {referredBy && <div className="rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-stone-700">
                      Referido por {referredBy}
                    </div>}
                </div>

                {!submitted && <>
                    <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-stone-100">
                      <div className="h-full rounded-full bg-stone-950 transition-all" style={{
                    width: `${progressValue}%`
                  }} />
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3 text-xs uppercase tracking-[0.24em] text-stone-400">
                      {STEPS.map(item => <div key={item.id} className={step >= item.id ? 'text-stone-950' : undefined}>
                          {item.label}
                        </div>)}
                    </div>
                  </>}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-8 sm:py-8">
              <div className="mx-auto w-full max-w-3xl">
                {submitted ? <div className="overflow-hidden rounded-[34px] border border-stone-200 bg-stone-950 p-8 text-white shadow-[0_30px_80px_rgba(28,28,28,0.28)] sm:p-10">
                    <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-white/80">
                      Bienvenido a la resistencia
                    </div>
                    <h3 className="mt-6 text-3xl font-black leading-tight sm:text-4xl">
                      Bienvenido a la resistencia. Revisa tu email para acceder a tu dashboard de influencer.
                    </h3>
                    <p className="mt-5 max-w-2xl text-base leading-7 text-white/80">
                      {submittedTier === 'hercules' ? i18n.t('application.herculesEntraPorViaRapidaHemosMar', 'Hércules entra por vía rápida. Hemos marcado tu perfil para activación inmediata y siguientes pasos.') : i18n.t('application.tuPerfilPasaARevisionHumanaSiApl', 'Tu perfil pasa a revisión humana. Si aplicaste a Atenea o Zeus, te responderemos en 24-48h con una decisión real, no automática.')}
                    </p>

                    <div className="mt-8 grid gap-4 md:grid-cols-2">
                      <a href="https://instagram.com/bchanfuah" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-stone-950 transition-transform hover:scale-[1.02]">
                        <Instagram className="h-4 w-4" aria-hidden="true" />
                        Seguir a @bchanfuah
                      </a>
                      <button type="button" onClick={() => {
                    onOpenChange(false);
                    navigate('/products');
                  }} className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-6 py-3 font-semibold text-white transition-colors hover:bg-white/15">
                        <Link2 className="h-4 w-4" aria-hidden="true" />
                        Ver catálogo para promocionar
                      </button>
                    </div>

                    <button type="button" onClick={() => onOpenChange(false)} className="mt-6 text-sm font-medium text-white/80 underline-offset-4 hover:text-white hover:underline">
                      Volver a la landing
                    </button>
                  </div> : <form onSubmit={handleSubmit}>
                    <AnimatePresence custom={direction} mode="wait">
                      <motion.div key={step} custom={direction} variants={SLIDE_VARIANTS} initial="enter" animate="center" exit="exit" transition={{
                    duration: 0.24,
                    ease: 'easeOut'
                  }} className="rounded-[34px] border border-stone-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8">
                        {step === 1 && <div>
                            <div className="max-w-2xl">
                              <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Paso 1</p>
                              <h3 className="mt-3 text-3xl font-black text-stone-950">Quien eres?</h3>
                              <p className="mt-3 text-base leading-7 text-stone-600">
                                Tu tarjeta de presentacion, sin trajes ni palabras huecas.
                              </p>
                            </div>

                            <div className="mt-8 grid gap-5 md:grid-cols-2">
                              <label className="block">
                                <FieldLabel>Nombre artistico / Como te conocen</FieldLabel>
                                <input value={form.artistName} onChange={event => updateField('artistName', event.target.value)} placeholder="Ej: Lara Come Bonito" className="h-12 w-full rounded-2xl border border-stone-200 px-4 text-base text-stone-950 focus:outline-none focus:border-stone-950" />
                                <FieldError>{errors.artistName}</FieldError>
                              </label>

                              <label className="block">
                                <FieldLabel>Email profesional</FieldLabel>
                                <input type="email" value={form.email} onChange={event => updateField('email', event.target.value)} placeholder="hola@tuestudio.com" className="h-12 w-full rounded-2xl border border-stone-200 px-4 text-base text-stone-950 focus:outline-none focus:border-stone-950" />
                                <FieldError>{errors.email}</FieldError>
                              </label>

                              <label className="block">
                                <FieldLabel>Tu Instagram principal</FieldLabel>
                                <div className="relative">
                                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-stone-400">@</span>
                                  <input value={form.instagram.replace(/^@/, '')} onChange={event => updateField('instagram', event.target.value)} placeholder="tuusuario" className="h-12 w-full rounded-2xl border border-stone-200 px-10 text-base text-stone-950 focus:outline-none focus:border-stone-950" />
                                </div>
                                <FieldError>{errors.instagram}</FieldError>
                              </label>

                              <label className="block">
                                <FieldLabel>{i18n.t('common.phone', 'Teléfono')}</FieldLabel>
                                <input value={form.phone} onChange={event => updateField('phone', event.target.value)} placeholder="+34 600 000 000" className="h-12 w-full rounded-2xl border border-stone-200 px-4 text-base text-stone-950 focus:outline-none focus:border-stone-950" />
                                <FieldError>{errors.phone}</FieldError>
                              </label>

                              <label className="block">
                                <FieldLabel>Ciudad donde resides</FieldLabel>
                                <input value={form.residenceCity} onChange={event => updateField('residenceCity', event.target.value)} placeholder={i18n.t('application.reusSeulCiudadDeMexico', 'Reus, Seúl, Ciudad de México...')} className="h-12 w-full rounded-2xl border border-stone-200 px-4 text-base text-stone-950 focus:outline-none focus:border-stone-950" />
                                <FieldError>{errors.residenceCity}</FieldError>
                              </label>

                              <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
                                <label className="block">
                                  <FieldLabel>País</FieldLabel>
                                  <select value={form.residenceCountry} onChange={e => updateField('residenceCountry', e.target.value)} className="h-12 w-full rounded-2xl border border-stone-200 bg-white px-4 text-base text-stone-950 focus:outline-none focus:border-stone-950">
                                    <option value="">{i18n.t('application.seleccionaPais', 'Selecciona país')}</option>
                                    {COUNTRY_OPTIONS.map(country => <option key={country} value={country}>{country}</option>)}
                                  </select>
                                  <FieldError>{errors.residenceCountry}</FieldError>
                                </label>

                                <label className="block">
                                  <FieldLabel optional>Edad</FieldLabel>
                                  <select value={form.ageRange} onChange={e => updateField('ageRange', e.target.value)} className="h-12 w-full rounded-2xl border border-stone-200 bg-white px-4 text-base text-stone-950 focus:outline-none focus:border-stone-950">
                                    <option value="">Rango</option>
                                    {AGE_OPTIONS.map(age => <option key={age} value={age}>{age}</option>)}
                                  </select>
                                </label>
                              </div>
                            </div>
                          </div>}

                        {step === 2 && <div>
                            <div className="max-w-2xl">
                              <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Paso 2</p>
                              <h3 className="mt-3 text-3xl font-black text-stone-950">Tu tribu</h3>
                              <p className="mt-3 text-base leading-7 text-stone-600">
                                Queremos saber qué tipo de comunidad has construido y por qué te seguirían hasta algo
                                más honesto.
                              </p>
                            </div>

                            <div className="mt-8 grid gap-6">
                              <div>
                                <FieldLabel>Nicho principal</FieldLabel>
                                <div className="flex flex-wrap gap-3">
                                  {NICHE_OPTIONS.map(niche => {
                              const selected = form.niches.includes(niche);
                              return <button key={niche} type="button" onClick={() => toggleNiche(niche)} className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${selected ? 'border-stone-950 bg-stone-100 text-stone-950' : 'border-stone-200 bg-white text-stone-600 hover:border-stone-400 hover:text-stone-950'}`}>
                                        {niche}
                                      </button>;
                            })}
                                </div>
                                <FieldError>{errors.niches}</FieldError>
                              </div>

                              <div>
                                <FieldLabel>Rango de seguidores</FieldLabel>
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                                  {FOLLOWER_OPTIONS.map(range => {
                              const selected = form.followerRange === range;
                              return <button key={range} type="button" onClick={() => updateField('followerRange', range)} className={`rounded-[22px] border px-4 py-4 text-left transition-all ${selected ? 'border-stone-950 bg-stone-100' : 'border-stone-200 bg-white hover:border-stone-400'}`}>
                                        <p className="font-semibold text-stone-950">{range}</p>
                                      </button>;
                            })}
                                </div>
                                <FieldError>{errors.followerRange}</FieldError>
                              </div>

                              <div className="grid gap-5 md:grid-cols-2">
                                <label className="block">
                                  <FieldLabel>{i18n.t('application.paisPrincipalDeTuAudiencia', 'País principal de tu audiencia')}</FieldLabel>
                                  <select value={form.audienceCountry} onChange={e => updateField('audienceCountry', e.target.value)} className="h-12 w-full rounded-2xl border border-stone-200 bg-white px-4 text-base text-stone-950 focus:outline-none focus:border-stone-950">
                                    <option value="">{i18n.t('application.seleccionaPais', 'Selecciona país')}</option>
                                    {COUNTRY_OPTIONS.map(country => <option key={country} value={country}>{country}</option>)}
                                  </select>
                                  <FieldError>{errors.audienceCountry}</FieldError>
                                </label>

                                <label className="block">
                                  <FieldLabel optional>Link a tu mejor contenido</FieldLabel>
                                  <input type="url" value={form.bestContentUrl} onChange={event => updateField('bestContentUrl', event.target.value)} placeholder="https://instagram.com/reel/..." className="h-12 w-full rounded-2xl border border-stone-200 px-4 text-base text-stone-950 focus:outline-none focus:border-stone-950" />
                                  <FieldError>{errors.bestContentUrl}</FieldError>
                                </label>
                              </div>

                              <label className="block">
                                <FieldLabel>¿Por qué quieres unirte?</FieldLabel>
                                <textarea value={form.motivation} onChange={event => updateField('motivation', event.target.value)} rows={6} placeholder={i18n.t('application.cuentanosLaVerdadQueTipoDeEstabil', 'Cuéntanos la verdad: qué tipo de estabilidad buscas, por qué te quemaste de ciertas marcas y cómo tratarías a tu comunidad.')} className="w-full min-h-[180px] rounded-[24px] border border-stone-200 px-4 py-4 text-base leading-7 text-stone-950 focus:outline-none focus:border-stone-950 resize-none" />
                                <div className="mt-2 flex items-center justify-between gap-4">
                                  <FieldError>{errors.motivation}</FieldError>
                                  <p className="text-sm text-stone-400">{form.motivation.trim().length} / 140 mínimo</p>
                                </div>
                              </label>
                            </div>
                          </div>}

                        {step === 3 && <div>
                            <div className="max-w-2xl">
                              <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Paso 3</p>
                              <h3 className="mt-3 text-3xl font-black text-stone-950">Elige tu camino</h3>
                              <p className="mt-3 text-base leading-7 text-stone-600">
                                La comisión es transparente: Hércules 3%, Atenea 5%, Zeus 7%, con tracking de 18 meses.
                              </p>
                            </div>

                            <div className="mt-8 space-y-4">
                              {TIERS.map(tier => {
                          const Icon = tier.icon;
                          const selected = form.desiredTier === tier.key;
                          return <button key={tier.key} type="button" onClick={() => updateField('desiredTier', tier.key)} className={`w-full rounded-[28px] border p-5 text-left transition-all ${selected ? 'border-stone-950 bg-stone-100' : 'border-stone-200 bg-white hover:border-stone-400'}`}>
                                    <div className="flex items-start gap-4">
                                      <div className={`mt-0.5 flex h-12 w-12 items-center justify-center rounded-2xl ${selected ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-600'}`} aria-label={tier.subtitle} role="img">
                                        <Icon className="h-5 w-5" aria-hidden="true" />
                                      </div>
                                      <div>
                                        <p className="text-lg font-semibold text-stone-950">{tier.title}</p>
                                        <p className="mt-1 text-sm font-medium text-stone-700">{tier.subtitle}</p>
                                        <p className="mt-2 text-sm leading-6 text-stone-600">{tier.helper}</p>
                                      </div>
                                    </div>
                                  </button>;
                        })}
                              <FieldError>{errors.desiredTier}</FieldError>
                            </div>

                            <div className="mt-8 space-y-4 rounded-[30px] border border-stone-200 bg-stone-50 p-5">
                              <label className="flex items-start gap-3 rounded-2xl px-1 py-1">
                                <input type="checkbox" checked={form.agreementCommission} onChange={e => updateField('agreementCommission', e.target.checked)} className="mt-1 h-5 w-5 rounded accent-stone-950 cursor-pointer" />
                                <span className="text-sm leading-6 text-stone-700">
                                  Entiendo que la comisión se paga sobre el valor postenvío e impuestos.
                                </span>
                              </label>
                              <FieldError>{errors.agreementCommission}</FieldError>

                              <label className="flex items-start gap-3 rounded-2xl px-1 py-1">
                                <input type="checkbox" checked={form.agreementTracking} onChange={e => updateField('agreementTracking', e.target.checked)} className="mt-1 h-5 w-5 rounded accent-stone-950 cursor-pointer" />
                                <span className="text-sm leading-6 text-stone-700">
                                  Entiendo que el tracking de 18 meses es desde la primera compra del usuario.
                                </span>
                              </label>
                              <FieldError>{errors.agreementTracking}</FieldError>

                              <label className="flex items-start gap-3 rounded-2xl px-1 py-1">
                                <input type="checkbox" checked={form.agreementEthical} onChange={e => updateField('agreementEthical', e.target.checked)} className="mt-1 h-5 w-5 rounded accent-stone-950 cursor-pointer" />
                                <span className="text-sm leading-6 text-stone-700">
                                  Acepto promover solo productos que realmente probaría o probaré.
                                </span>
                              </label>
                              <FieldError>{errors.agreementEthical}</FieldError>

                              <label className="flex items-start gap-3 rounded-2xl px-1 py-1">
                                <input type="checkbox" checked={form.agreementTerms} onChange={e => updateField('agreementTerms', e.target.checked)} className="mt-1 h-5 w-5 rounded accent-stone-950 cursor-pointer" />
                                <span className="text-sm leading-6 text-stone-700">
                                  He leído y acepto los términos del programa de influencers.
                                </span>
                              </label>
                              <FieldError>{errors.agreementTerms}</FieldError>
                            </div>
                          </div>}
                      </motion.div>
                    </AnimatePresence>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3 text-sm text-stone-500">
                        <UserRound className="h-4 w-4" aria-hidden="true" />
                        {step === 3 ? i18n.t('application.solicitudGratuitaNingunPasoDePago', 'Solicitud gratuita. Ningún paso de pago.') : 'No tardarás más de 3 minutos.'}
                      </div>

                      <div className="flex flex-col-reverse gap-3 sm:flex-row">
                        {step > 1 && <button type="button" onClick={goToPreviousStep} className="h-12 rounded-full border border-stone-200 px-6 text-sm font-semibold text-stone-700 hover:bg-stone-50 transition-colors">
                            <ArrowLeft className="h-4 w-4 inline mr-2" aria-hidden="true" />
                            Atrás
                          </button>}

                        {step < 3 ? <button type="button" onClick={goToNextStep} className="h-12 rounded-full bg-stone-950 px-6 text-sm font-semibold text-white hover:bg-stone-800 transition-colors">
                            Siguiente
                            <ArrowRight className="h-4 w-4 inline ml-2" aria-hidden="true" />
                          </button> : <button type="submit" disabled={submitting} className="h-12 rounded-full bg-stone-950 px-6 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50 transition-colors">
                            {submitting ? 'Enviando...' : finalButtonLabel}
                            {!submitting && <ArrowRight className="h-4 w-4 inline ml-2" aria-hidden="true" />}
                          </button>}
                      </div>
                    </div>
                  </form>}
              </div>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>;
}