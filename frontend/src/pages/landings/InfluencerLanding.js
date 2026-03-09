import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  Calculator,
  CheckCircle2,
  ChevronDown,
  Gift,
  MessageCircle,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import SEOHead from '../../components/landings/SEOHead';
import NavbarLanding from '../../components/landings/NavbarLanding';
import FooterLanding from '../../components/landings/FooterLanding';
import LandingSectionNav from '../../components/landings/LandingSectionNav';
import { toast } from 'sonner';
import { API } from '../../utils/api';

const NAV_ITEMS = [
  { label: 'Resumen', href: '#hero' },
  { label: 'Ganancias', href: '#calculator' },
  { label: 'Niveles', href: '#tiers' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Solicitud', href: '#apply' },
];

const ACTIVITY_OPTIONS = [
  { id: 'light', label: 'Ligero', helper: '1 o 2 piezas por semana', multiplier: 0.55, conversionMin: 0.007, conversionMax: 0.013 },
  { id: 'steady', label: 'Constante', helper: 'Contenido regular y CTA claro', multiplier: 1, conversionMin: 0.013, conversionMax: 0.024 },
  { id: 'heavy', label: 'Muy activo', helper: 'Stories, reels y remarketing', multiplier: 1.65, conversionMin: 0.021, conversionMax: 0.036 },
];

const LEVELS = [
  {
    key: 'hercules',
    name: 'Hercules',
    rate: 3,
    description: 'Entrada flexible para microcreadores y perfiles nicho.',
    requirement: 'Ideal desde 1.000 seguidores con engagement real.',
  },
  {
    key: 'atenea',
    name: 'Atenea',
    rate: 5,
    description: 'Para cuentas que ya convierten y publican de forma estable.',
    requirement: 'Suele encajar desde 5.000 seguidores y venta recurrente.',
  },
  {
    key: 'zeus',
    name: 'Zeus',
    rate: 7,
    description: 'Nivel alto para perfiles con comunidad caliente y buen GMV.',
    requirement: 'Pensado para cuentas de alto impacto y colaboraciones activas.',
  },
];

const BENEFITS = [
  {
    icon: Gift,
    title: 'Links y codigos listos',
    description: 'Tu contenido sale con tracking y atribucion desde el primer dia.',
  },
  {
    icon: BarChart3,
    title: 'Dashboard claro',
    description: 'Ventas, clicks, conversion y comision en tiempo real.',
  },
  {
    icon: Sparkles,
    title: 'Ideas para contenido',
    description: 'Recibes guias, ganchos y propuestas para activar a tu audiencia.',
  },
  {
    icon: Wallet,
    title: 'Cobro sencillo',
    description: 'Retiras comisiones cuando toca sin perseguir marcas una a una.',
  },
];

const FAQS = [
  {
    question: 'Necesito muchos seguidores?',
    answer: 'No. Priorizamos audiencia real, nicho y capacidad de recomendar bien el producto.',
  },
  {
    question: 'Tengo exclusividad con Hispaloshop?',
    answer: 'No. Puedes seguir trabajando con otras marcas y canales.',
  },
  {
    question: 'Cuanto tardais en responder?',
    answer: 'La revision inicial suele quedar cerrada en menos de 48 horas laborables.',
  },
  {
    question: 'Puedo entrar si estoy empezando?',
    answer: 'Si tu comunidad es afin y el contenido encaja con gastronomia, lifestyle o producto local, si.',
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.5 },
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);

export default function InfluencerLanding() {
  const navigate = useNavigate();
  const formRef = useRef(null);
  const [followers, setFollowers] = useState(12000);
  const [commission, setCommission] = useState(5);
  const [activity, setActivity] = useState('steady');
  const [openFaq, setOpenFaq] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    social: '',
    followers: '',
    niche: 'Gastronomia, lifestyle o producto local',
    message: '',
  });

  const currentActivity = ACTIVITY_OPTIONS.find((item) => item.id === activity) || ACTIVITY_OPTIONS[1];
  const calculator = useMemo(() => {
    const estimatedReach = followers * currentActivity.multiplier;
    const ordersMin = Math.max(1, Math.floor(estimatedReach * currentActivity.conversionMin));
    const ordersMax = Math.max(ordersMin + 1, Math.floor(estimatedReach * currentActivity.conversionMax));
    const avgBasket = 46;
    const salesMin = ordersMin * avgBasket;
    const salesMax = ordersMax * avgBasket;

    return {
      ordersMin,
      ordersMax,
      salesMin,
      salesMax,
      earningsMin: Math.round(salesMin * (commission / 100)),
      earningsMax: Math.round(salesMax * (commission / 100)),
    };
  }, [followers, commission, currentActivity]);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLevelSelect = (rate) => {
    setCommission(rate);
    scrollTo('calculator');
  };

  const submitApplication = async (event) => {
    event.preventDefault();

    if (!formData.name.trim() || !formData.email.trim() || !formData.social.trim() || !formData.followers.trim()) {
      toast.error('Completa nombre, email, red principal y seguidores aproximados.');
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    setSubmitting(true);

    try {
      await axios.post(`${API}/influencer/apply`, {
        name: formData.name.trim(),
        email: formData.email.trim(),
        instagram: formData.social.trim(),
        followers: formData.followers.trim(),
        niche: formData.niche.trim(),
        message: formData.message.trim(),
      });

      toast.success('Solicitud enviada. Revisamos tu perfil y te contactamos pronto.');
      setFormData({
        name: '',
        email: '',
        social: '',
        followers: '',
        niche: 'Gastronomia, lifestyle o producto local',
        message: '',
      });
    } catch (error) {
      const detail = error?.response?.data?.detail;
      if (detail === 'Application already pending' || detail === 'Already registered or has pending application') {
        toast.error('Ya existe una solicitud pendiente con este email.');
      } else {
        toast.error('No se pudo enviar la solicitud. Intentalo otra vez.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f1e8] text-[#1a1a1a]">
      <SEOHead
        title="Programa influencer Hispaloshop"
        description="Landing informativa para creadores que quieren monetizar recomendando productos artesanales y locales."
        keywords="influencer gastronomia, afiliados ecommerce, comisiones creadores, hispaloshop influencer"
      />

      <NavbarLanding extraLinks={[{ label: 'Ganancias', href: '#calculator' }, { label: 'Solicitud', href: '#apply' }]} />
      <LandingSectionNav items={NAV_ITEMS} />

      <main>
        <section id="hero" className="relative overflow-hidden bg-[#111827] text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(236,72,153,0.28),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(34,197,94,0.20),_transparent_28%)]" />
          <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
            <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
              <div>
                <motion.p {...fadeUp} className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white/80">
                  <TrendingUp className="h-4 w-4" />
                  Programa para creadores que venden sin perder credibilidad
                </motion.p>
                <motion.h1 {...fadeUp} transition={{ duration: 0.5, delay: 0.05 }} className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
                  Monetiza tu comunidad con producto real, comision clara y herramientas que si ayudan.
                </motion.h1>
                <motion.p {...fadeUp} transition={{ duration: 0.5, delay: 0.1 }} className="mt-5 max-w-2xl text-lg text-white/75">
                  Hispaloshop conecta creadores con productores e importadores. Recomendacion, atribucion y cobro en un solo flujo.
                </motion.p>

                <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.15 }} className="mt-8 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => scrollTo('apply')}
                    className="rounded-full bg-[#e6a532] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#d4952b]"
                  >
                    Solicitar acceso
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollTo('calculator')}
                    className="rounded-full border border-white/25 px-6 py-3 font-semibold text-white transition-colors hover:bg-white/10"
                  >
                    Calcular ingresos
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/register/influencer')}
                    className="rounded-full border border-transparent px-6 py-3 font-semibold text-white/80 transition-colors hover:text-white"
                  >
                    Crear cuenta completa
                  </button>
                </motion.div>

                <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.2 }} className="mt-10 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                    <p className="text-3xl font-bold">3% a 7%</p>
                    <p className="mt-1 text-sm text-white/70">Comision segun nivel y rendimiento.</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                    <p className="text-3xl font-bold">48h</p>
                    <p className="mt-1 text-sm text-white/70">Revision de solicitud y primer contacto.</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                    <p className="text-3xl font-bold">0 EUR</p>
                    <p className="mt-1 text-sm text-white/70">Alta sin coste ni permanencia.</p>
                  </div>
                </motion.div>
              </div>

              <motion.div {...fadeUp} transition={{ duration: 0.55, delay: 0.15 }} className="rounded-[28px] border border-white/10 bg-white/10 p-6 backdrop-blur">
                <div className="rounded-2xl bg-white p-5 text-[#111827] shadow-xl">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-4">
                    <div>
                      <p className="text-sm font-medium text-stone-500">Simulacion realista</p>
                      <h2 className="mt-1 text-2xl font-bold">Cuenta tipo de 12K seguidores</h2>
                    </div>
                    <div className="rounded-full bg-[#fef3c7] p-3 text-[#b45309]">
                      <Calculator className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="mt-5 space-y-4">
                    <div className="flex items-center justify-between rounded-2xl bg-stone-50 p-4">
                      <span className="text-sm text-stone-600">Pedidos mensuales estimados</span>
                      <span className="text-lg font-semibold">18 a 33</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-stone-50 p-4">
                      <span className="text-sm text-stone-600">GMV aproximado</span>
                      <span className="text-lg font-semibold">828 EUR a 1.518 EUR</span>
                    </div>
                    <div className="rounded-2xl bg-[#111827] p-5 text-white">
                      <p className="text-sm text-white/65">Comision recomendada</p>
                      <p className="mt-1 text-3xl font-bold">5%</p>
                      <p className="mt-2 text-sm text-white/70">Ingreso estimado: 41 EUR a 76 EUR al mes con actividad media.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => scrollTo('apply')}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-[#2d5a3d] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#234a31]"
                    >
                      Quiero mi revision
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/55">
            <ChevronDown className="h-6 w-6 animate-bounce" />
          </div>
        </section>

        <section id="calculator" className="bg-white py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} className="text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#2d5a3d]">Calculadora</p>
              <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Cuanto puede ganar tu comunidad contigo?</h2>
              <p className="mx-auto mt-4 max-w-2xl text-stone-600">
                Ajusta seguidores, actividad y comision para estimar un escenario realista.
              </p>
            </motion.div>

            <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.05 }} className="mt-12 grid gap-8 rounded-[30px] border border-stone-200 bg-[#f8f5ef] p-6 shadow-sm lg:grid-cols-[1fr_0.9fr] lg:p-8">
              <div className="space-y-8">
                <div>
                  <div className="flex items-center justify-between gap-4">
                    <label htmlFor="followers-range" className="text-sm font-semibold text-stone-700">
                      Seguidores aproximados
                    </label>
                    <span className="text-lg font-bold text-[#111827]">{new Intl.NumberFormat('es-ES').format(followers)}</span>
                  </div>
                  <input
                    id="followers-range"
                    type="range"
                    min="1000"
                    max="250000"
                    step="1000"
                    value={followers}
                    onChange={(event) => setFollowers(Number(event.target.value))}
                    className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-stone-200 accent-[#2d5a3d]"
                  />
                  <div className="mt-2 flex justify-between text-xs text-stone-500">
                    <span>1K</span>
                    <span>250K</span>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-stone-700">Intensidad de activacion</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {ACTIVITY_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setActivity(option.id)}
                        className={`rounded-2xl border p-4 text-left transition-colors ${
                          activity === option.id ? 'border-[#2d5a3d] bg-[#eef5ef]' : 'border-stone-200 bg-white hover:border-stone-300'
                        }`}
                      >
                        <p className="font-semibold text-stone-900">{option.label}</p>
                        <p className="mt-1 text-sm text-stone-600">{option.helper}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-4">
                    <label htmlFor="commission-range" className="text-sm font-semibold text-stone-700">
                      Nivel de comision
                    </label>
                    <span className="text-lg font-bold text-[#111827]">{commission}%</span>
                  </div>
                  <input
                    id="commission-range"
                    type="range"
                    min="3"
                    max="7"
                    step="2"
                    value={commission}
                    onChange={(event) => setCommission(Number(event.target.value))}
                    className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-stone-200 accent-[#e6a532]"
                  />
                  <div className="mt-2 flex justify-between text-xs text-stone-500">
                    <span>Hercules 3%</span>
                    <span>Atenea 5%</span>
                    <span>Zeus 7%</span>
                  </div>
                </div>
              </div>

              <div className="rounded-[26px] bg-[#111827] p-6 text-white">
                <p className="text-sm text-white/65">Ingreso mensual estimado</p>
                <p className="mt-3 text-4xl font-bold">
                  {formatCurrency(calculator.earningsMin)} - {formatCurrency(calculator.earningsMax)}
                </p>
                <div className="mt-8 grid gap-4">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-white/65">Pedidos potenciales</p>
                    <p className="mt-1 text-2xl font-semibold">{calculator.ordersMin} - {calculator.ordersMax}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-white/65">Ventas generadas</p>
                    <p className="mt-1 text-2xl font-semibold">{formatCurrency(calculator.salesMin)} - {formatCurrency(calculator.salesMax)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-white/65">Ticket medio aplicado</p>
                    <p className="mt-1 text-2xl font-semibold">46 EUR</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => scrollTo('apply')}
                  className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-[#e6a532] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#d4952b]"
                >
                  Quiero esta estimacion en mi cuenta
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="bg-[#f5f1e8] py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} className="grid gap-6 md:grid-cols-4">
              {BENEFITS.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-[24px] bg-white p-6 shadow-sm">
                    <div className="inline-flex rounded-2xl bg-[#eef5ef] p-3 text-[#2d5a3d]">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-4 text-xl font-semibold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-stone-600">{item.description}</p>
                  </div>
                );
              })}
            </motion.div>
          </div>
        </section>

        <section id="tiers" className="bg-white py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#2d5a3d]">Niveles</p>
                <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Subes de nivel segun impacto real</h2>
              </div>
              <button
                type="button"
                onClick={() => scrollTo('apply')}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#2d5a3d] transition-colors hover:text-[#234a31]"
              >
                Revisar mi caso
                <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>

            <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.05 }} className="mt-10 grid gap-5 lg:grid-cols-3">
              {LEVELS.map((level) => (
                <article
                  key={level.key}
                  className={`rounded-[28px] border p-6 ${
                    level.rate === 7 ? 'border-[#111827] bg-[#111827] text-white' : 'border-stone-200 bg-[#faf7f2]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${level.rate === 7 ? 'bg-white/10 text-white' : 'bg-[#eef5ef] text-[#2d5a3d]'}`}>
                      {level.name}
                    </div>
                    <Star className={`h-5 w-5 ${level.rate === 7 ? 'text-[#fbbf24]' : 'text-[#2d5a3d]'}`} />
                  </div>
                  <p className="mt-5 text-4xl font-bold">{level.rate}%</p>
                  <p className={`mt-3 text-sm leading-6 ${level.rate === 7 ? 'text-white/75' : 'text-stone-600'}`}>{level.description}</p>
                  <p className={`mt-5 text-sm ${level.rate === 7 ? 'text-white/70' : 'text-stone-500'}`}>{level.requirement}</p>
                  <button
                    type="button"
                    onClick={() => handleLevelSelect(level.rate)}
                    className={`mt-8 w-full rounded-full px-5 py-3 font-semibold transition-colors ${
                      level.rate === 7
                        ? 'bg-white text-[#111827] hover:bg-stone-100'
                        : 'bg-[#2d5a3d] text-white hover:bg-[#234a31]'
                    }`}
                  >
                    Probar este nivel
                  </button>
                </article>
              ))}
            </motion.div>
          </div>
        </section>

        <section id="faq" className="bg-[#f5f1e8] py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} className="text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#2d5a3d]">FAQ</p>
              <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Dudas habituales antes de aplicar</h2>
            </motion.div>

            <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.05 }} className="mt-10 space-y-4">
              {FAQS.map((item, index) => {
                const isOpen = openFaq === index;
                return (
                  <div key={item.question} className="rounded-[24px] border border-stone-200 bg-white p-5">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? -1 : index)}
                      className="flex w-full items-center justify-between gap-4 text-left"
                    >
                      <span className="text-lg font-semibold text-stone-900">{item.question}</span>
                      <ChevronDown className={`h-5 w-5 shrink-0 text-stone-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && <p className="mt-4 pr-8 text-sm leading-6 text-stone-600">{item.answer}</p>}
                  </div>
                );
              })}
            </motion.div>
          </div>
        </section>

        <section id="apply" ref={formRef} className="bg-white py-20">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8">
            <motion.div {...fadeUp} className="rounded-[30px] bg-[#111827] p-8 text-white">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white/80">
                <Users className="h-4 w-4" />
                Alta manual y revision real
              </p>
              <h2 className="mt-6 text-3xl font-bold">Solicita tu acceso al programa</h2>
              <p className="mt-4 text-white/72">
                Si prefieres entrar con una revision previa antes del registro completo, deja aqui tus datos.
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#86efac]" />
                  <div>
                    <p className="font-semibold">Encaje de perfil</p>
                    <p className="mt-1 text-sm text-white/70">Revisamos nicho, comunidad y tipo de contenido.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#fbbf24]" />
                  <div>
                    <p className="font-semibold">Siguiente paso claro</p>
                    <p className="mt-1 text-sm text-white/70">Te contestamos con aprobacion, feedback o la ruta de registro adecuada.</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/register/influencer')}
                  className="rounded-full bg-[#e6a532] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#d4952b]"
                >
                  Ir al registro completo
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/contact')}
                  className="rounded-full border border-white/15 px-5 py-3 font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Hablar con el equipo
                </button>
              </div>
            </motion.div>

            <motion.form {...fadeUp} transition={{ duration: 0.5, delay: 0.05 }} onSubmit={submitApplication} className="rounded-[30px] border border-stone-200 bg-[#faf7f2] p-6 shadow-sm sm:p-8">
              <div className="grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-stone-700">Nombre</span>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none transition-colors focus:border-[#2d5a3d]"
                    placeholder="Tu nombre"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-stone-700">Email</span>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none transition-colors focus:border-[#2d5a3d]"
                    placeholder="tu@email.com"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-stone-700">Perfil principal</span>
                  <input
                    type="text"
                    name="social"
                    value={formData.social}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none transition-colors focus:border-[#2d5a3d]"
                    placeholder="@usuario o URL"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-stone-700">Seguidores</span>
                  <input
                    type="text"
                    name="followers"
                    value={formData.followers}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none transition-colors focus:border-[#2d5a3d]"
                    placeholder="Ej: 12500"
                  />
                </label>
              </div>

              <label className="mt-5 block">
                <span className="mb-2 block text-sm font-medium text-stone-700">Nicho</span>
                <input
                  type="text"
                  name="niche"
                  value={formData.niche}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none transition-colors focus:border-[#2d5a3d]"
                  placeholder="Gastronomia, hogar, lifestyle..."
                />
              </label>

              <label className="mt-5 block">
                <span className="mb-2 block text-sm font-medium text-stone-700">Que tipo de contenido haces?</span>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows="5"
                  className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none transition-colors focus:border-[#2d5a3d]"
                  placeholder="Explica tu audiencia, formatos y por que encajas en Hispaloshop."
                />
              </label>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2d5a3d] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#234a31] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? 'Enviando...' : 'Enviar solicitud'}
                  {!submitting && <ArrowRight className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/register/influencer')}
                  className="rounded-full border border-stone-300 px-6 py-3 font-semibold text-stone-700 transition-colors hover:bg-stone-50"
                >
                  Prefiero registrarme ahora
                </button>
              </div>
            </motion.form>
          </div>
        </section>
      </main>

      <FooterLanding />
    </div>
  );
}
