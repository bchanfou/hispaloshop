import React, { useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeEuro,
  BarChart3,
  CheckCircle2,
  CircleHelp,
  Gift,
  Instagram,
  MessageCircle,
  Sparkles,
  Star,
  TrendingUp,
  Users,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import BackButton from '../components/BackButton';
import InfluencerTierLadder from '../components/influencer/InfluencerTierLadder';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Slider } from '../components/ui/slider';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '../components/ui/carousel';
import { toast } from 'sonner';
import { API } from '../utils/api';

const FOLLOWER_MARKS = [
  { value: 0, label: '1k' },
  { value: 25, label: '10k' },
  { value: 50, label: '25k' },
  { value: 75, label: '50k' },
  { value: 100, label: '100k+' },
];

const ACTIVITY_LEVELS = [
  { id: 'casual', label: 'Casual', multiplier: 0.5, posts: '1-2 recomendaciones por semana' },
  { id: 'regular', label: 'Regular', multiplier: 1, posts: '3-4 publicaciones y stories activas' },
  { id: 'muy-activo', label: 'Muy activo', multiplier: 1.6, posts: 'Contenido constante, UGC y respuestas' },
];

const TIERS = [
  { name: 'Perseo', rate: '3%', salesLabel: 'Empiezas cobrando 3%', requirement: 'Hasta EUR 499 en ventas mensuales', accent: 'linear-gradient(135deg, #78716c, #44403c)' },
  { name: 'Aquiles', rate: '4%', salesLabel: 'Primer salto de comision', requirement: 'A partir de EUR 500 en ventas mensuales', accent: 'linear-gradient(135deg, #166534, #15803d)' },
  { name: 'Hercules', rate: '5%', salesLabel: 'Ritmo estable y rentable', requirement: 'A partir de EUR 2,000 en ventas mensuales', accent: 'linear-gradient(135deg, #1d4ed8, #2563eb)' },
  { name: 'Apolo', rate: '6%', salesLabel: 'Partner avanzado', requirement: 'A partir de EUR 7,500 en ventas mensuales', accent: 'linear-gradient(135deg, #b45309, #f59e0b)' },
  { name: 'Zeus', rate: '7%', salesLabel: 'Nivel elite de la red', requirement: 'A partir de EUR 20,000 en ventas mensuales', accent: 'linear-gradient(135deg, #7c3aed, #4f46e5)' },
];

const TESTIMONIALS = [
  { name: 'Maria', handle: '@mariacocina', followers: '12.4k', quote: 'En 3 meses he sacado un extra con productos que ya encajaban con mis recetas.', result: 'EUR 640/mes', tag: 'Instagram recetas' },
  { name: 'Carlos', handle: '@vinosconcarlos', followers: '8.1k', quote: 'Marco productos, comparto la historia y el dashboard me dice exactamente que entra.', result: 'EUR 410/mes', tag: 'Catas y vino' },
  { name: 'Lucia', handle: '@luciafoodjournal', followers: '31k', quote: 'Lo mejor es que no gestiono stock ni envios. Solo selecciono lo que recomendaria de verdad.', result: 'EUR 1,280/mes', tag: 'TikTok comida' },
  { name: 'Sergio', handle: '@sergiotapea', followers: '5.3k', quote: 'Pensaba que con pocos seguidores no daba. El programa esta hecho justo para microinfluencers.', result: 'EUR 230/mes', tag: 'Planes locales' },
  { name: 'Ana', handle: '@anayqueso', followers: '18.7k', quote: 'Mis seguidores valoran que sean productos artesanales. La conversion sale mucho mejor que con links genericos.', result: 'EUR 890/mes', tag: 'Especialista gourmet' },
];

const FAQS = [
  { question: 'Necesito muchos seguidores?', answer: 'No. Aceptamos micro-influencers desde 1.000 seguidores si la audiencia encaja con alimentacion, recetas, vino, gourmet o lifestyle con foco real en producto.' },
  { question: 'Tengo que comprar los productos?', answer: 'No es obligatorio. Aun asi, recomendar productos que has probado suele mejorar la conversion y la confianza de tu audiencia.' },
  { question: 'Como se que no me enganan con las ventas?', answer: 'Tienes tracking por enlace, clicks, ventas atribuidas y comision acumulada. El panel se actualiza en tiempo real y deja trazabilidad por pedido.' },
  { question: 'Cuanto tardan en pagar?', answer: 'La comision se consolida automaticamente y la transferencia se procesa de forma periodica una vez validada la venta.' },
];

const HERO_CARDS = [
  { name: 'Clara', product: '/images/demo/aceite-reserva.svg', note: 'Reel de brunch + aceite premium' },
  { name: 'Diego', product: '/images/demo/queso-curado.svg', note: 'Story tasting de queso curado' },
  { name: 'Nuria', product: '/images/demo/vino-reserva.svg', note: 'Maridaje con vino artesano' },
  { name: 'Pablo', product: '/images/demo/pasta-artesanal.svg', note: 'Receta express con pasta artesana' },
  { name: 'Elena', product: '/images/demo/omega-premium.svg', note: 'Review honesta de producto gourmet' },
  { name: 'Marta', product: '/images/demo/aceite-reserva.svg', note: 'UGC de cocina diaria' },
];

const formatEuro = (value) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

const getFollowersFromSlider = (value) => {
  const v = Number(value);
  if (v <= 25) return Math.round(1000 + (v / 25) * 9000);
  if (v <= 50) return Math.round(10000 + ((v - 25) / 25) * 15000);
  if (v <= 75) return Math.round(25000 + ((v - 50) / 25) * 25000);
  return Math.round(50000 + ((v - 75) / 25) * 50000);
};

const getTierRate = (estimatedSales) => {
  if (estimatedSales >= 20000) return 0.07;
  if (estimatedSales >= 7500) return 0.06;
  if (estimatedSales >= 2000) return 0.05;
  if (estimatedSales >= 500) return 0.04;
  return 0.03;
};

function EarningsCalculator({ compact = false }) {
  const [followersSlider, setFollowersSlider] = useState([38]);
  const [activity, setActivity] = useState('regular');

  const activeLevel = ACTIVITY_LEVELS.find((level) => level.id === activity) || ACTIVITY_LEVELS[1];

  const calculation = useMemo(() => {
    const followers = getFollowersFromSlider(followersSlider[0]);
    const engagedAudience = followers * 0.18;
    const monthlyClicks = engagedAudience * activeLevel.multiplier * 0.38;
    const estimatedOrders = Math.max(1, monthlyClicks * 0.02);
    const averageTicket = 35;
    const monthlySales = estimatedOrders * averageTicket;
    const commissionRate = getTierRate(monthlySales);
    const baseCommission = monthlySales * commissionRate;

    return {
      followers,
      estimatedOrders: Math.round(estimatedOrders),
      monthlySales,
      commissionRate,
      min: Math.round(baseCommission * 0.82),
      max: Math.round(baseCommission * 1.28),
      averageTicket,
    };
  }, [followersSlider, activeLevel]);

  return (
    <div className={`rounded-[32px] border border-stone-200 bg-white ${compact ? 'p-5' : 'p-6 md:p-8'} shadow-[0_30px_120px_-60px_rgba(28,28,28,0.55)]`} data-testid="earnings-calculator">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">Calculadora</p>
          <h3 className="mt-2 font-heading text-2xl font-semibold text-[#1C1C1C]">Cuanto podria ganar tu audiencia contigo</h3>
        </div>
        <div className="rounded-full bg-stone-900 px-3 py-1 text-xs font-semibold text-white">2% conversion</div>
      </div>

      <div className="mt-8 space-y-7">
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <Label className="text-sm font-medium text-stone-700">Cuantos seguidores tienes?</Label>
            <span className="text-sm font-semibold text-stone-900">{new Intl.NumberFormat('es-ES').format(calculation.followers)}</span>
          </div>
          <Slider value={followersSlider} min={0} max={100} step={1} onValueChange={setFollowersSlider} className="[&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:border-stone-900 [&_[role=slider]]:bg-stone-900 [&_.bg-primary]:bg-stone-900" />
          <div className="mt-3 flex justify-between text-xs text-stone-400">
            {FOLLOWER_MARKS.map((mark) => (
              <span key={mark.value}>{mark.label}</span>
            ))}
          </div>
        </div>

        <div>
          <Label className="mb-3 block text-sm font-medium text-stone-700">Que tan activo eres?</Label>
          <div className="grid gap-3 md:grid-cols-3">
            {ACTIVITY_LEVELS.map((level) => (
              <button key={level.id} type="button" onClick={() => setActivity(level.id)} className={`rounded-2xl border p-4 text-left transition-all ${activity === level.id ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-300'}`}>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{level.label}</span>
                  {activity === level.id && <CheckCircle2 className="h-4 w-4" />}
                </div>
                <p className={`mt-2 text-xs ${activity === level.id ? 'text-stone-300' : 'text-stone-500'}`}>{level.posts}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] bg-[linear-gradient(135deg,#111827,#1f2937_55%,#b45309)] p-6 text-white">
          <p className="text-sm text-stone-300">Podrias ganar estimado</p>
          <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-2">
            <span className="font-heading text-4xl font-semibold">{formatEuro(calculation.min)} - {formatEuro(calculation.max)}</span>
            <span className="pb-1 text-sm text-stone-300">/ mes</span>
          </div>
          <div className="mt-4 grid gap-3 rounded-2xl bg-white/8 p-4 text-sm md:grid-cols-3">
            <div>
              <p className="text-stone-400">Pedidos estimados</p>
              <p className="mt-1 font-semibold text-white">{calculation.estimatedOrders}/mes</p>
            </div>
            <div>
              <p className="text-stone-400">Nivel probable</p>
              <p className="mt-1 font-semibold text-white">{Math.round(calculation.commissionRate * 100)}%</p>
            </div>
            <div>
              <p className="text-stone-400">Ventas generadas</p>
              <p className="mt-1 font-semibold text-white">{formatEuro(calculation.monthlySales)}</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-stone-300">Basado en conversion del 2% y ticket promedio EUR {calculation.averageTicket}.</p>
        </div>
      </div>
    </div>
  );
}

function HeroPhotoGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {HERO_CARDS.map((card, index) => (
        <div key={`${card.name}-${index}`} className={`rounded-[26px] border border-white/60 bg-white p-3 shadow-[0_20px_70px_-45px_rgba(28,28,28,0.55)] ${index % 3 === 1 ? 'translate-y-6' : ''}`}>
          <div className="relative overflow-hidden rounded-[20px] bg-[radial-gradient(circle_at_top,#fef3c7,#f5f5f4_58%,#d6d3d1)] p-3">
            <div className="absolute right-3 top-3 rounded-full bg-black/85 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">UGC</div>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-900 text-sm font-semibold text-white">{card.name.charAt(0)}</div>
              <div>
                <p className="text-sm font-semibold text-stone-900">{card.name}</p>
                <p className="text-xs text-stone-500">Food creator</p>
              </div>
            </div>
            <img src={card.product} alt={card.note} className="mx-auto h-24 w-24 object-contain" loading="lazy" />
          </div>
          <p className="mt-3 text-xs leading-5 text-stone-600">{card.note}</p>
        </div>
      ))}
    </div>
  );
}

function ApplicationForm() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    instagram: '',
    followers: '',
    niche: 'Alimentacion y contenido gastronomico',
    message: '',
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.name || !formData.email || !formData.instagram || !formData.followers) {
      toast.error('Completa nombre, email, red social principal y seguidores aproximados.');
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${API}/influencer/apply`, {
        name: formData.name.trim(),
        email: formData.email.trim(),
        instagram: formData.instagram.trim(),
        followers: formData.followers.trim(),
        niche: formData.niche.trim(),
        message: formData.message.trim(),
      });

      toast.success('Solicitud enviada. El equipo revisara tu perfil y te contactara por email.');
      setFormData({
        name: '',
        email: '',
        instagram: '',
        followers: '',
        niche: 'Alimentacion y contenido gastronomico',
        message: '',
      });
    } catch (error) {
      const detail = error?.response?.data?.detail;
      if (detail === 'Application already pending' || detail === 'Already registered or has pending application') {
        toast.error('Ya existe una solicitud pendiente con este email.');
      } else {
        toast.error('No se pudo enviar la solicitud. Intentalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-[32px] border border-stone-200 bg-white p-6 md:p-8 shadow-[0_30px_100px_-60px_rgba(28,28,28,0.55)]" data-testid="influencer-application-form">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">Solicitud</p>
        <h3 className="mt-2 font-heading text-2xl font-semibold text-[#1C1C1C]">Solicitar mi cuenta de influencer</h3>
        <p className="mt-2 text-sm text-stone-600">Las plazas son limitadas por zona para no saturar audiencias con las mismas recomendaciones.</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <Label htmlFor="name">Nombre</Label>
          <Input id="name" name="name" value={formData.name} onChange={handleChange} className="mt-2 h-12 rounded-2xl" />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} className="mt-2 h-12 rounded-2xl" />
        </div>
        <div>
          <Label htmlFor="instagram">Red social principal</Label>
          <Input id="instagram" name="instagram" value={formData.instagram} onChange={handleChange} placeholder="@tuusuario o enlace" className="mt-2 h-12 rounded-2xl" />
        </div>
        <div>
          <Label htmlFor="followers">Seguidores aprox</Label>
          <Input id="followers" name="followers" value={formData.followers} onChange={handleChange} placeholder="Ej. 12.500" className="mt-2 h-12 rounded-2xl" />
        </div>
      </div>

      <div className="mt-5">
        <Label htmlFor="niche">Nicho</Label>
        <Input id="niche" name="niche" value={formData.niche} onChange={handleChange} className="mt-2 h-12 rounded-2xl" />
      </div>

      <div className="mt-5">
        <Label htmlFor="message">Que tipo de contenido haces?</Label>
        <Textarea id="message" name="message" value={formData.message} onChange={handleChange} placeholder="Recetas, reviews, maridajes, cocina diaria, food styling..." className="mt-2 min-h-[120px] rounded-2xl" />
      </div>

      <Button type="submit" disabled={loading} className="mt-6 h-12 w-full rounded-full bg-black text-white hover:bg-stone-800">
        {loading ? 'Enviando solicitud...' : 'Solicitar Mi Cuenta de Influencer'}
      </Button>
    </form>
  );
}

export default function InfluencerLandingPage() {
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  const jobPostingSchema = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: 'Influencer de alimentacion',
    description: 'Oportunidad para ganar dinero recomendando productos artesanales en Instagram, TikTok, WhatsApp y blog con comision variable del 3% al 7% segun ventas.',
    datePosted: '2026-03-07',
    employmentType: 'CONTRACTOR',
    hiringOrganization: {
      '@type': 'Organization',
      name: 'Hispaloshop',
      sameAs: 'https://www.hispaloshop.com',
      logo: 'https://www.hispaloshop.com/logo.png',
    },
    applicantLocationRequirements: { '@type': 'Country', name: 'Spain' },
    jobLocationType: 'TELECOMMUTE',
    baseSalary: {
      '@type': 'MonetaryAmount',
      currency: 'EUR',
      value: { '@type': 'QuantitativeValue', minValue: 100, maxValue: 2000, unitText: 'MONTH' },
    },
    directApply: true,
    url: 'https://www.hispaloshop.com/influencer',
  };

  return (
    <div className="min-h-screen bg-[#f6f1ea] text-[#1C1C1C]">
      <SEO title="Gana Dinero Recomendando Productos Artesanales | Hispaloshop" description="Unete a 1,240 influencers. Gana del 3% al 7% por ventas. Sin inversion, sin stock, sin complicaciones. Aplica ahora." url="https://www.hispaloshop.com/influencer" structuredData={[jobPostingSchema]} />
      <Header />

      <div className="mx-auto max-w-7xl px-4 pt-2">
        <BackButton />
      </div>

      <main>
        <section className="overflow-hidden px-4 pb-16 pt-8 md:pb-24 md:pt-14">
          <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-stone-600">
                <Sparkles className="h-4 w-4" />
                Ganar dinero recomendando productos
              </div>
              <h1 className="mt-6 max-w-3xl font-heading text-4xl font-semibold leading-tight md:text-6xl">Tu Opinion Vale Dinero Real</h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-600 md:text-xl">Gana entre EUR 100 y EUR 2,000 al mes recomendando productos artesanales que si comprarias.</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button type="button" onClick={() => setIsCalculatorOpen(true)} className="h-12 rounded-full bg-black px-7 text-white hover:bg-stone-800">
                  Calcular Cuanto Podria Ganar
                </Button>
                <Button asChild variant="outline" className="h-12 rounded-full border-stone-400 bg-transparent px-7 text-stone-900 hover:bg-white">
                  <a href="#beneficios">Ver Todos los Beneficios</a>
                </Button>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                <div className="rounded-[24px] border border-stone-200 bg-white/80 p-4">
                  <p className="text-3xl font-semibold">1,240</p>
                  <p className="mt-1 text-sm text-stone-500">influencers activos</p>
                </div>
                <div className="rounded-[24px] border border-stone-200 bg-white/80 p-4">
                  <p className="text-3xl font-semibold">3%-7%</p>
                  <p className="mt-1 text-sm text-stone-500">comision por nivel</p>
                </div>
                <div className="rounded-[24px] border border-stone-200 bg-white/80 p-4">
                  <p className="text-3xl font-semibold">&lt; 48h</p>
                  <p className="mt-1 text-sm text-stone-500">respuesta habitual</p>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-3 text-sm text-stone-600">
                <span className="rounded-full bg-white px-4 py-2">ser influencer de alimentacion</span>
                <span className="rounded-full bg-white px-4 py-2">monetizar instagram comida</span>
                <span className="rounded-full bg-white px-4 py-2">afiliados productos artesanales</span>
              </div>
            </div>

            <HeroPhotoGrid />
          </div>
        </section>

        <section id="calculadora" className="px-4 py-10 md:py-16">
          <div className="mx-auto max-w-5xl">
            <EarningsCalculator />
          </div>
        </section>

        <section className="bg-white px-4 py-14 md:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">Como funciona</p>
              <h2 className="mt-3 font-heading text-3xl font-semibold md:text-4xl">Tres pasos. Cero friccion.</h2>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {[
                { step: '01', title: 'Elige', desc: 'Selecciona productos que de verdad encajen con tu audiencia dentro del catalogo.', icon: Gift },
                { step: '02', title: 'Comparte', desc: 'Usa tu link unico en Instagram, TikTok, WhatsApp, newsletter o blog.', icon: Instagram },
                { step: '03', title: 'Cobra', desc: 'La comision entra sola en tu cuenta y se liquida de forma automatica.', icon: BadgeEuro },
              ].map((item) => (
                <article key={item.step} className="rounded-[30px] border border-stone-200 bg-[#f9f6f1] p-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-stone-400">{item.step}</span>
                    <item.icon className="h-5 w-5 text-stone-900" />
                  </div>
                  <h3 className="mt-8 font-heading text-2xl font-semibold">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-stone-600">{item.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-14 md:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">Sistema de niveles</p>
                <h2 className="mt-3 font-heading text-3xl font-semibold md:text-4xl">Subes de Perseo a Zeus segun lo que vendes</h2>
              </div>
              <a href="#formulario" className="inline-flex items-center gap-2 text-sm font-semibold text-stone-900">
                Quiero entrar al programa <ArrowRight className="h-4 w-4" />
              </a>
            </div>
            <div className="mt-10">
              <InfluencerTierLadder tiers={TIERS} />
            </div>
          </div>
        </section>

        <section className="bg-[#161616] px-4 py-14 text-white md:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
                <Users className="h-6 w-6 text-amber-300" />
                <p className="mt-5 text-4xl font-semibold">1,240</p>
                <p className="mt-2 text-sm text-stone-300">influencers activos moviendo producto real</p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
                <TrendingUp className="h-6 w-6 text-amber-300" />
                <p className="mt-5 text-4xl font-semibold">EUR 35</p>
                <p className="mt-2 text-sm text-stone-300">ticket promedio usado en la estimacion</p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
                <Star className="h-6 w-6 text-amber-300" />
                <p className="mt-5 text-4xl font-semibold">4.8/5</p>
                <p className="mt-2 text-sm text-stone-300">satisfaccion media del programa interno</p>
              </div>
            </div>

            <div className="mt-12 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <h2 className="font-heading text-3xl font-semibold">Prueba social que reduce objeciones</h2>
                <div className="relative mt-8 px-10 md:px-14">
                  <Carousel opts={{ align: 'start', loop: true }}>
                    <CarouselContent>
                      {TESTIMONIALS.map((item) => (
                        <CarouselItem key={item.handle} className="md:basis-1/2">
                          <article className="h-full rounded-[30px] border border-white/10 bg-white/6 p-6">
                            <div className="flex items-center gap-4">
                              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-lg font-semibold text-white">
                                {item.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-semibold">{item.name}</p>
                                <p className="text-sm text-stone-300">{item.handle}</p>
                              </div>
                            </div>
                            <p className="mt-5 text-base leading-7 text-stone-100">"{item.quote}"</p>
                            <div className="mt-6 flex items-center justify-between text-sm">
                              <span className="rounded-full bg-amber-300/15 px-3 py-1 text-amber-200">{item.tag}</span>
                              <span className="font-semibold text-white">{item.result}</span>
                            </div>
                            <p className="mt-3 text-xs uppercase tracking-[0.22em] text-stone-400">{item.followers} seguidores</p>
                          </article>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <CarouselPrevious className="left-0 border-white/20 bg-white/10 text-white hover:bg-white/20" />
                    <CarouselNext className="right-0 border-white/20 bg-white/10 text-white hover:bg-white/20" />
                  </Carousel>
                </div>
              </div>

              <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(160deg,#292524,#171717)] p-6 shadow-[0_30px_90px_-60px_rgba(0,0,0,0.7)]">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">Dashboard</p>
                <h3 className="mt-3 font-heading text-2xl font-semibold">Vista anonimizada de ingresos</h3>
                <div className="mt-6 rounded-[26px] border border-white/10 bg-black/25 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-stone-400">Comision acumulada</p>
                      <p className="mt-1 text-3xl font-semibold">EUR 1,184</p>
                    </div>
                    <div className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">+18% este mes</div>
                  </div>
                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    {[
                      ['Clicks', '3,482'],
                      ['Ventas', '96'],
                      ['Conversion', '2.7%'],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-2xl bg-white/5 p-4">
                        <p className="text-xs text-stone-400">{label}</p>
                        <p className="mt-2 text-lg font-semibold">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 rounded-2xl bg-white/5 p-4">
                    <div className="mb-3 flex items-center justify-between text-xs text-stone-400">
                      <span>Ultimos 30 dias</span>
                      <span>Nivel actual: Apolo</span>
                    </div>
                    <div className="flex h-28 items-end gap-2">
                      {[28, 41, 37, 58, 49, 72, 64, 85, 78, 92, 89, 100].map((bar, index) => (
                        <div key={bar + index} className="flex-1 rounded-t-2xl bg-gradient-to-t from-amber-500 to-amber-200" style={{ height: `${bar}%` }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="beneficios" className="bg-white px-4 py-14 md:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">Herramientas incluidas</p>
              <h2 className="mt-3 font-heading text-3xl font-semibold md:text-4xl">Todo lo necesario para monetizar contenido sin montar una operacion</h2>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {[
                { icon: MessageCircle, title: 'Links automaticos con tracking', desc: 'Cada clic y venta queda atribuido de forma clara.' },
                { icon: BarChart3, title: 'Dashboard en tiempo real', desc: 'Ve rendimiento, pedidos, conversion y comision sin esperar reportes.' },
                { icon: Sparkles, title: 'Biblioteca de fotos pro', desc: 'Creatividades listas para stories, posts, reels y blog.' },
                { icon: CircleHelp, title: 'Soporte prioritario por WhatsApp', desc: 'Respuesta rapida para dudas de enlaces, productos o cobros.' },
              ].map((item) => (
                <article key={item.title} className="rounded-[28px] border border-stone-200 bg-[#f8f4ee] p-6">
                  <item.icon className="h-6 w-6 text-stone-900" />
                  <h3 className="mt-5 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-stone-600">{item.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-14 md:py-20">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">FAQ</p>
              <h2 className="mt-3 font-heading text-3xl font-semibold md:text-4xl">Objeciones resueltas antes de aplicar</h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-stone-600">La barrera de entrada es baja a proposito: sin stock, sin inversion y con seguimiento transparente.</p>
            </div>
            <Accordion type="single" collapsible className="space-y-4">
              {FAQS.map((faq) => (
                <AccordionItem key={faq.question} value={faq.question} className="rounded-[24px] border border-stone-200 bg-white px-6">
                  <AccordionTrigger className="py-5 text-left text-base font-semibold text-stone-900 hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="pb-5 text-sm leading-7 text-stone-600">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        <section id="formulario" className="bg-[linear-gradient(135deg,#1c1917,#292524_52%,#92400e)] px-4 py-14 text-white md:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200">Urgencia suave</p>
                <h2 className="mt-3 font-heading text-3xl font-semibold md:text-5xl">Entramos pocos perfiles por zona para proteger tu capacidad de conversion</h2>
                <p className="mt-5 max-w-xl text-base leading-8 text-stone-200">Si tu audiencia conecta con gastronomia, recetas, producto gourmet o consumo consciente, este programa esta hecho para ti.</p>
                <div className="mt-8 space-y-3 text-sm text-stone-200">
                  {['Sin inversion inicial', 'Sin gestionar envios ni incidencias', 'Comision visible desde el primer clic'].map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-amber-300" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <ApplicationForm />
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-8">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 text-sm text-stone-500 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-4">
              <Link to="/terms" className="hover:text-stone-900">Terminos del programa</Link>
              <a href="#formulario" className="hover:text-stone-900">FAQ completo</a>
              <Link to="/help" className="hover:text-stone-900">Contactar equipo</Link>
            </div>
            <p>Canonical: /influencer</p>
          </div>
        </section>
      </main>

      <Footer />

      <Dialog open={isCalculatorOpen} onOpenChange={setIsCalculatorOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[32px] border-stone-200 bg-[#f6f1ea] p-0 sm:max-w-3xl">
          <DialogHeader className="px-6 pb-0 pt-6 md:px-8">
            <DialogTitle className="font-heading text-2xl text-stone-900">Calcula tu potencial antes de aplicar</DialogTitle>
            <DialogDescription className="text-sm text-stone-600">Estimacion orientativa para monetizar Instagram comida, TikTok food o recomendaciones gourmet.</DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6 pt-4 md:px-8 md:pb-8">
            <EarningsCalculator compact />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
