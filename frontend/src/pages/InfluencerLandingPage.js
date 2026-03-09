import React, { useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BarChart3,
  Calculator,
  CheckCircle2,
  ChevronDown,
  Crown,
  Handshake,
  Link2,
  MessageCircle,
  ShoppingBag,
  Sparkles,
  Star,
  TrendingUp,
} from 'lucide-react';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import SEO from '../components/SEO';
import LandingSectionNav from '../components/landings/LandingSectionNav';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Slider } from '../components/ui/slider';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { API } from '../utils/api';

const ACTIVITY_OPTIONS = [
  { id: 'casual', label: 'Casual', description: '1-2 recomendaciones/semana', conversion: { min: 0.005, max: 0.015 }, multiplier: 0.5 },
  { id: 'regular', label: 'Regular', description: '3-4 publicaciones activas', conversion: { min: 0.015, max: 0.025 }, multiplier: 1 },
  { id: 'muy-activo', label: 'Muy activo', description: 'Contenido constante, UGC', conversion: { min: 0.025, max: 0.04 }, multiplier: 1.8 },
];

const LEVELS = [
  { name: 'HERCULES', rate: 3, description: 'Nivel de entrada', requirement: 'Desde EUR 0/mes y 0 seguidores', border: 'border-green-200', bg: 'bg-green-50', iconBg: 'bg-green-200', iconColor: 'text-green-600', icon: Award },
  { name: 'ATENEA', rate: 5, description: 'Primer salto relevante', requirement: 'Desde EUR 5,000/mes y 2,500 seguidores', border: 'border-amber-200', bg: 'bg-amber-50', iconBg: 'bg-amber-200', iconColor: 'text-amber-700', icon: Crown },
  { name: 'ZEUS', rate: 7, description: 'Nivel elite', requirement: 'Desde EUR 20,000/mes y 10,000 seguidores', border: 'border-purple-300', bg: 'bg-gradient-to-br from-purple-50 to-pink-50', iconBg: 'bg-gradient-to-br from-purple-400 to-pink-400', iconColor: 'text-white', icon: Star, featured: true },
];

const TESTIMONIALS = [
  { name: 'Maria', handle: '@mariacocina', followers: '12.4K seguidores', quote: 'En 3 meses he sacado un extra con productos que ya encajaban con mis recetas. HI AI Creativo me desbloquea ideas.', tag: 'Instagram recetas', result: 'EUR 640/mes', image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&crop=face' },
  { name: 'Carlos', handle: '@vinosconcarlos', followers: '8.1K seguidores', quote: 'Comparto historias, veo ventas en tiempo real y he abierto colaboraciones directas con bodegas.', tag: 'Catas y vino', result: 'EUR 410/mes', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&crop=face' },
];

const TOOLS = [
  { title: 'Links automaticos con tracking', description: 'Cada clic y venta queda atribuido de forma clara en cualquier canal.', icon: Link2, color: 'text-pink-500', bg: 'bg-gray-50' },
  { title: 'Dashboard en tiempo real', description: 'Pedidos, conversion y comision actualizados al instante.', icon: BarChart3, color: 'text-purple-500', bg: 'bg-gray-50' },
  { title: 'HI AI Creativo', description: 'Ideas para stories, reels, posts y blogs entrenadas para gastronomia.', icon: Sparkles, color: 'text-purple-500', bg: 'bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100' },
  { title: 'Soporte prioritario WhatsApp', description: 'Respuesta rapida para dudas de enlaces, productos o cobros.', icon: MessageCircle, color: 'text-green-500', bg: 'bg-gray-50' },
];

const FAQS = [
  { question: 'Necesito muchos seguidores?', answer: 'No. Aceptamos desde 1,000 seguidores si tu engagement es real y tu nicho encaja.' },
  { question: 'Tengo que comprar los productos?', answer: 'No es obligatorio, aunque probarlos suele mejorar credibilidad y conversion.' },
  { question: 'Como se que no me enganan con las ventas?', answer: 'Tienes dashboard en tiempo real con clics, conversiones, pedidos y comision trazada.' },
  { question: 'Cuanto tardan en pagar?', answer: '15 dias desde la venta. Despues puedes retirar por Stripe o transferencia bancaria.' },
  { question: 'Puedo promocionar la plataforma en si?', answer: 'Si. Tambien puedes abrir colaboraciones directas con productores e importadores.' },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.55 },
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

function FloatingCard({ className, children }) {
  return <div className={`absolute rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-md shadow-[0_30px_90px_-45px_rgba(0,0,0,0.6)] ${className}`}>{children}</div>;
}

export default function InfluencerLandingPage() {
  const calculatorRef = useRef(null);
  const formRef = useRef(null);
  const [followers, setFollowers] = useState([17800]);
  const [commission, setCommission] = useState([5]);
  const [activity, setActivity] = useState('regular');
  const [openFaq, setOpenFaq] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    social: '',
    followers: '',
    niche: 'Alimentacion y contenido gastronomico',
    content: '',
  });

  const currentActivity = ACTIVITY_OPTIONS.find((item) => item.id === activity) || ACTIVITY_OPTIONS[1];
  const calculator = useMemo(() => {
    const followerCount = followers[0];
    const commissionRate = commission[0];
    const baseReach = followerCount * currentActivity.multiplier;
    const ordersMin = Math.floor(baseReach * currentActivity.conversion.min);
    const ordersMax = Math.floor(baseReach * currentActivity.conversion.max);
    const gmvMin = ordersMin * 50;
    const gmvMax = ordersMax * 50;
    return {
      followers: followerCount,
      commission: commissionRate,
      ordersMin,
      ordersMax,
      gmvAverage: Math.floor((gmvMin + gmvMax) / 2),
      earningsMin: Math.floor(gmvMin * (commissionRate / 100)),
      earningsMax: Math.floor(gmvMax * (commissionRate / 100)),
      conversionLabel: `${(currentActivity.conversion.min * 100).toFixed(1)}-${(currentActivity.conversion.max * 100).toFixed(1)}%`,
    };
  }, [followers, commission, currentActivity]);

  const scrollToCalculator = () => calculatorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const scrollToApplication = () => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const submitApplication = async (event) => {
    event.preventDefault();
    if (!formData.name || !formData.email || !formData.social || !formData.followers) {
      toast.error('Completa nombre, email, red social principal y seguidores aproximados.');
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
        message: formData.content.trim(),
      });
      toast.success('Solicitud enviada. Te contactamos en menos de 48 horas.');
      setFormData({ name: '', email: '', social: '', followers: '', niche: 'Alimentacion y contenido gastronomico', content: '' });
    } catch (error) {
      const detail = error?.response?.data?.detail;
      if (detail === 'Application already pending' || detail === 'Already registered or has pending application') {
        toast.error('Ya existe una solicitud pendiente con este email.');
      } else {
        toast.error('No se pudo enviar la solicitud. Intentalo de nuevo.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#111827]">
      <SEO
        title="Gana Dinero con tu Audiencia - Programa de Influencers Hispaloshop"
        description="Gana entre EUR 100 y EUR 2,000/mes recomendando productos artesanales. 3-7% de comision, HI AI Creativo y cero costes de entrada."
        url="https://www.hispaloshop.com/influencer"
      />
      <Header />
      <LandingSectionNav />

      <main>
        <section className="relative min-h-[680px] sm:min-h-[760px] bg-gradient-to-br from-gray-900 via-black to-gray-950 text-white overflow-hidden flex items-center">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-20 left-20 h-72 w-72 rounded-full bg-pink-500 blur-3xl animate-pulse" />
            <div className="absolute bottom-20 right-20 h-72 w-72 rounded-full bg-purple-500 blur-3xl animate-pulse [animation-delay:1s]" />
          </div>
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 w-full">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
              <div>
                <motion.span {...fadeUp} className="inline-flex items-center px-4 py-2 rounded-full bg-pink-500/20 text-pink-200 text-sm font-medium mb-6 border border-pink-400/30"><TrendingUp className="w-4 h-4 mr-2" />1,240 influencers ya ganando</motion.span>
                <motion.h1 {...fadeUp} transition={{ duration: 0.55, delay: 0.05 }} className="font-heading text-4xl sm:text-5xl lg:text-7xl font-bold leading-[0.95] mb-6 text-white">Tu opinion vale<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-fuchsia-300 to-purple-200 drop-shadow-[0_8px_28px_rgba(236,72,153,0.35)]">dinero real</span></motion.h1>
                <motion.p {...fadeUp} transition={{ duration: 0.55, delay: 0.1 }} className="text-lg sm:text-xl text-gray-200 mb-8 leading-relaxed max-w-lg">Gana entre <span className="text-white font-bold">EUR 100 y EUR 2,000</span> al mes recomendando productos artesanales que si comprarias. Sin inversion, sin stock, con total libertad creativa.</motion.p>
                <motion.div {...fadeUp} transition={{ duration: 0.55, delay: 0.15 }} className="flex flex-wrap gap-6 md:gap-8 mb-10">
                  <div><p className="text-3xl font-bold text-white">3%-7%</p><p className="text-sm text-gray-300">Comision por venta</p></div>
                  <div><p className="text-3xl font-bold text-white">&lt;48h</p><p className="text-sm text-gray-300">Respuesta de aprobacion</p></div>
                  <div><p className="text-3xl font-bold text-white">0 EUR</p><p className="text-sm text-gray-300">Coste de inscripcion</p></div>
                </motion.div>
                <motion.div {...fadeUp} transition={{ duration: 0.55, delay: 0.2 }} className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <button onClick={scrollToCalculator} className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 sm:px-8 py-4 rounded-full font-semibold text-base sm:text-lg hover:shadow-lg hover:shadow-pink-500/25 transition-all hover:scale-[1.02] flex items-center justify-center gap-2"><Calculator className="w-5 h-5" />Calcular mis ganancias</button>
                  <button onClick={scrollToApplication} className="px-6 sm:px-8 py-4 rounded-full font-semibold text-base sm:text-lg border-2 border-white/50 text-white hover:bg-white/10 transition-all">Solicitar mi cuenta</button>
                </motion.div>
              </div>
              <motion.div {...fadeUp} transition={{ duration: 0.65, delay: 0.2 }} className="relative hidden lg:block h-[600px]">
                <FloatingCard className="top-0 right-0 w-64 rotate-3 hover:rotate-0 transition-transform"><div className="flex items-center gap-3 mb-3"><img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50&h=50&fit=crop&crop=face" className="w-10 h-10 rounded-full object-cover" alt="Influencer" /><div><p className="text-sm font-semibold">@maria_cocina</p><p className="text-xs text-gray-400">12.4K seguidores</p></div></div><p className="text-2xl font-bold text-green-400">+EUR 640 este mes</p><p className="text-xs text-gray-400">48 pedidos generados</p></FloatingCard>
                <FloatingCard className="top-32 left-0 w-56 -rotate-2 hover:rotate-0 transition-transform"><p className="text-xs text-gray-400 mb-2">Codigo de descuento</p><p className="text-xl font-mono font-bold text-pink-400">MARIA10</p><p className="text-xs text-gray-400 mt-2">10% descuento para sus seguidores</p></FloatingCard>
                <div className="absolute bottom-20 right-10 w-72 rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-6 backdrop-blur-md shadow-[0_30px_90px_-45px_rgba(0,0,0,0.6)]"><div className="flex items-center gap-2 mb-3"><Sparkles className="w-5 h-5 text-purple-400" /><span className="text-sm font-semibold text-purple-300">HI AI Creativo</span></div><p className="text-sm text-gray-300">Ideas para reel: mostrar el behind the scenes de como usas el producto en tu rutina diaria.</p></div>
              </motion.div>
            </div>
          </div>
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce"><ChevronDown className="w-6 h-6 text-white/50" /></div>
        </section>

        <section ref={calculatorRef} id="calculadora" className="py-16 sm:py-24 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} className="text-center mb-12"><h2 className="font-heading text-4xl font-bold text-gray-900 mb-4">Calcula cuanto podrias ganar</h2><p className="text-gray-700">Ajusta los parametros y descubre tu potencial</p></motion.div>
            <motion.div {...fadeUp} transition={{ duration: 0.55, delay: 0.05 }} className="bg-gray-50 rounded-3xl p-5 sm:p-8 lg:p-12 shadow-xl">
              <div className="space-y-8 mb-10">
                <div><div className="flex justify-between mb-3 gap-3"><Label className="font-medium text-gray-800">Cuantos seguidores tienes?</Label><span className="font-bold text-pink-600 text-lg">{new Intl.NumberFormat('es-ES').format(calculator.followers)}</span></div><Slider value={followers} min={1000} max={500000} step={1000} onValueChange={setFollowers} className="[&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:border-pink-500 [&_[role=slider]]:bg-pink-500 [&_.bg-primary]:bg-pink-500" /><div className="flex justify-between text-xs text-gray-500 mt-2"><span>1K</span><span>500K</span></div></div>
                <div><Label className="font-medium text-gray-800 mb-3 block">Que tan activo eres?</Label><div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{ACTIVITY_OPTIONS.map((option) => <button key={option.id} type="button" onClick={() => setActivity(option.id)} className={`p-4 rounded-xl border-2 text-center transition-all ${activity === option.id ? 'border-pink-500 bg-pink-50' : 'border-gray-200 hover:border-pink-300'}`}><p className="font-semibold text-gray-800">{option.label}</p><p className="text-xs text-gray-600 mt-1">{option.description}</p></button>)}</div></div>
                <div><div className="flex justify-between mb-3 gap-3"><Label className="font-medium text-gray-800">Tu nivel de comision</Label><span className="font-bold text-purple-600 text-lg">{calculator.commission}%</span></div><Slider value={commission} min={3} max={7} step={2} onValueChange={setCommission} className="[&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:border-purple-500 [&_[role=slider]]:bg-purple-500 [&_.bg-primary]:bg-gradient-to-r [&_.bg-primary]:from-green-400 [&_.bg-primary]:via-yellow-400 [&_.bg-primary]:to-purple-500" /><div className="grid grid-cols-3 gap-2 text-[11px] text-gray-500 mt-2"><span>Hercules 3%</span><span className="text-center">Atenea 5%</span><span className="text-right">Zeus 7%</span></div><p className="text-xs text-gray-600 mt-2">Subes de nivel automaticamente segun GMV mensual y seguidores verificados.</p></div>
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl"><div className="flex items-center gap-3"><ShoppingBag className="w-5 h-5 text-blue-600" /><span className="text-gray-700">Ticket medio estimado</span></div><span className="font-bold text-blue-600">EUR 50</span></div>
              </div>
              <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-6 sm:p-8 text-white text-center relative overflow-hidden"><div className="absolute top-0 right-0 w-32 h-32 bg-pink-500 rounded-full blur-3xl opacity-30" /><p className="text-gray-300 mb-2">Podrias ganar estimado</p><div className="flex items-baseline justify-center gap-2 mb-4 flex-wrap"><span className="text-3xl sm:text-4xl lg:text-5xl font-bold">{formatCurrency(calculator.earningsMin)}</span><span className="text-gray-300">-</span><span className="text-3xl sm:text-4xl lg:text-5xl font-bold">{formatCurrency(calculator.earningsMax)}</span><span className="text-gray-300 text-lg sm:text-xl">/mes</span></div><div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm border-t border-white/10 pt-6"><div><p className="font-bold text-lg">{calculator.ordersMin}-{calculator.ordersMax}</p><p className="text-gray-300">Pedidos estimados/mes</p></div><div><p className="font-bold text-lg text-green-400">{calculator.conversionLabel}</p><p className="text-gray-300">Conversion esperada</p></div><div><p className="font-bold text-lg">{formatCurrency(calculator.gmvAverage)}</p><p className="text-gray-300">GMV generado</p></div></div></div>
              <p className="text-xs text-gray-600 text-center mt-4">Estimacion basada en conversion del 2-4% segun actividad y ticket promedio de EUR 50.</p>
            </motion.div>
          </div>
        </section>
        <section className="py-24 bg-[#f5f3ef]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} className="text-center mb-16"><h2 className="font-heading text-4xl font-bold text-gray-900 mb-4">Tres pasos. Cero friccion.</h2></motion.div>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { step: '01', title: 'Elige', description: 'Selecciona productos que encajan con tu audiencia dentro del catalogo.', colors: 'bg-pink-100 text-pink-600' },
                { step: '02', title: 'Comparte', description: 'Usa tu link unico en Instagram, TikTok, WhatsApp, newsletter o blog.', colors: 'bg-purple-100 text-purple-600' },
                { step: '03', title: 'Cobra', description: 'La comision entra sola y se retira a los 15 dias por Stripe o transferencia.', colors: 'bg-green-100 text-green-600' },
              ].map((item, index) => (
                <motion.article key={item.step} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.55, delay: index * 0.08 }} className="bg-white rounded-2xl p-8 text-center shadow-card hover:shadow-card-hover transition-all">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${item.colors}`}><span className="text-2xl font-bold">{item.step}</span></div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} className="flex flex-col md:flex-row md:items-end md:justify-between mb-12 gap-4">
              <div><h2 className="font-heading text-4xl font-bold text-gray-900 mb-2">Subes de Hercules a Zeus segun lo que vendes</h2><p className="text-gray-600">Cuanto mas generas y crece tu audiencia, mas ganas. Automatico.</p></div>
              <button onClick={scrollToApplication} className="text-pink-600 font-semibold hover:text-pink-700 flex items-center gap-1">Quiero entrar al programa <ArrowRight className="w-4 h-4" /></button>
            </motion.div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {LEVELS.map((level, index) => {
                const Icon = level.icon;
                return (
                  <motion.article key={level.name} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.55, delay: index * 0.05 }} className={`relative rounded-2xl p-6 border-2 transition-all hover:-translate-y-1 ${level.bg} ${level.border}`}>
                    {level.featured && <div className="absolute -top-3 -right-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-3 py-1 rounded-full font-bold">TOP</div>}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${level.iconBg}`}><Icon className={`w-6 h-6 ${level.iconColor}`} /></div>
                    <h3 className="font-bold text-gray-900 mb-1">{level.name}</h3>
                    <p className={`text-2xl font-bold mb-2 ${level.name === 'ZEUS' ? 'text-purple-600' : 'text-gray-900'}`}>{level.rate}%</p>
                    <p className="text-xs text-gray-600 mb-3">{level.description}</p>
                    <div className={`pt-3 border-t ${level.border.replace('border-2 ', '')}`}><p className="text-xs text-gray-500">{level.requirement}</p></div>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-24 bg-gray-900 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              <div className="text-center"><p className="text-4xl lg:text-5xl font-bold text-pink-300 mb-2">1,240</p><p className="text-gray-300 text-sm">Influencers activos moviendo producto real</p></div>
              <div className="text-center"><p className="text-4xl lg:text-5xl font-bold text-purple-300 mb-2">EUR 50</p><p className="text-gray-300 text-sm">Ticket promedio usado en la estimacion</p></div>
              <div className="text-center"><p className="text-4xl lg:text-5xl font-bold text-green-300 mb-2">4.8/5</p><p className="text-gray-300 text-sm">Satisfaccion media del programa interno</p></div>
            </motion.div>
            <div className="grid md:grid-cols-2 gap-8">
              {TESTIMONIALS.map((item, index) => (
                <motion.article key={item.handle} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.55, delay: index * 0.08 }} className="bg-white/10 rounded-2xl p-6 sm:p-8 border border-white/15">
                  <div className="flex items-center gap-4 mb-4"><img src={item.image} className="w-12 h-12 rounded-full object-cover" alt={item.name} /><div><p className="font-semibold">{item.name}</p><p className="text-sm text-gray-300">{item.handle}</p></div></div>
                  <p className="text-gray-200 mb-4">{item.quote}</p>
                  <div className="flex items-center gap-2 text-sm flex-wrap"><span className={`px-2 py-1 rounded ${index === 0 ? 'bg-green-500/20 text-green-300' : 'bg-purple-500/20 text-purple-300'}`}>{item.tag}</span><span className="text-gray-300">{item.followers}</span></div>
                  <p className="text-pink-400 font-bold mt-4">{item.result}</p>
                </motion.article>
              ))}
            </div>
          </div>
        </section>
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} className="text-center mb-16"><p className="text-pink-600 font-semibold mb-2">HERRAMIENTAS INCLUIDAS</p><h2 className="font-heading text-4xl font-bold text-gray-900 mb-4">Todo lo necesario para monetizar contenido sin montar una operacion</h2></motion.div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {TOOLS.map((tool, index) => {
                const Icon = tool.icon;
                return (
                  <motion.article key={tool.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.55, delay: index * 0.05 }} className={`${tool.bg} rounded-2xl p-6 hover:shadow-lg transition-all`}>
                    <Icon className={`w-10 h-10 ${tool.color} mb-4`} />
                    <h3 className="font-bold text-gray-900 mb-2">{tool.title}</h3>
                    <p className="text-sm text-gray-600">{tool.description}</p>
                  </motion.article>
                );
              })}
            </div>
            <motion.div {...fadeUp} transition={{ duration: 0.55, delay: 0.1 }} className="mt-12 rounded-2xl border border-[#DCE8DE] bg-[#EEF7F0] p-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4"><div className="w-14 h-14 bg-[#DCE8DE] rounded-full flex items-center justify-center"><Handshake className="w-7 h-7 text-[#2D5A3D]" /></div><div><h3 className="font-bold text-gray-900">Contacto directo con productores e importadores</h3><p className="text-gray-600">Negocia colaboraciones libremente. Sin intermediarios, sin comisiones extra.</p></div></div>
                <span className="text-[#2D5A3D] font-semibold">Incluido gratis</span>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="py-24 bg-[#f5f3ef]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12">
              <motion.div {...fadeUp}><p className="text-pink-600 font-semibold mb-2">FAQ</p><h2 className="font-heading text-4xl font-bold text-gray-900 mb-4">Objeciones resueltas antes de aplicar</h2><p className="text-gray-600">La barrera de entrada es baja a proposito: sin stock, sin inversion y con seguimiento transparente.</p></motion.div>
              <motion.div {...fadeUp} transition={{ duration: 0.55, delay: 0.05 }} className="space-y-4">
                {FAQS.map((item, index) => {
                  const isOpen = openFaq === index;
                  return (
                    <div key={item.question} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <button type="button" onClick={() => setOpenFaq(isOpen ? -1 : index)} className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50">
                        <span className="font-medium text-gray-900">{item.question}</span>
                        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isOpen && <div className="px-6 pb-4 text-gray-600">{item.answer}</div>}
                    </div>
                  );
                })}
              </motion.div>
            </div>
          </div>
        </section>

        <section className="py-24 bg-gray-900 relative overflow-hidden">
          <div className="absolute inset-0 opacity-30"><img src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200&h=800&fit=crop" className="w-full h-full object-cover" alt="Creator working" /></div>
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/95 to-gray-900/80" />
          <div ref={formRef} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div {...fadeUp}>
                <p className="text-pink-400 font-semibold mb-4">URGENCIA SUAVE</p>
                <h2 className="font-heading text-4xl lg:text-5xl font-bold text-white mb-6">Tu audiencia quiere escucharte. Tu bolsillo tambien.</h2>
                <p className="text-gray-300 text-lg mb-8">Si tu audiencia conecta con gastronomia, recetas, producto gourmet o consumo consciente, este programa esta hecho para ti.</p>
                <ul className="space-y-4 mb-8">
                  {['Sin inversion inicial', 'Sin gestionar envios ni incidencias', 'Comision visible desde el primer clic', 'Libertad total de colaboraciones'].map((point) => (
                    <li key={point} className="flex items-center gap-3 text-gray-300"><CheckCircle2 className="w-5 h-5 text-green-400" />{point}</li>
                  ))}
                </ul>
              </motion.div>
              <motion.div {...fadeUp} transition={{ duration: 0.55, delay: 0.05 }} className="bg-white rounded-2xl p-8 shadow-2xl">
                <div className="mb-6"><h3 className="text-xl font-bold text-gray-900 mb-2">Solicitar mi cuenta de influencer</h3><p className="text-sm text-gray-500">Las plazas son limitadas por zona para no saturar audiencias con las mismas recomendaciones.</p></div>
                <form onSubmit={submitApplication} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><Label htmlFor="name">Nombre</Label><Input id="name" name="name" value={formData.name} onChange={handleChange} required className="mt-1 h-11 rounded-lg" /></div>
                    <div><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required className="mt-1 h-11 rounded-lg" /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><Label htmlFor="social">Red social principal</Label><Input id="social" name="social" value={formData.social} onChange={handleChange} placeholder="@usuario o enlace" required className="mt-1 h-11 rounded-lg" /></div>
                    <div><Label htmlFor="followersInput">Seguidores aprox</Label><Input id="followersInput" name="followers" value={formData.followers} onChange={handleChange} placeholder="Ej: 12500" required className="mt-1 h-11 rounded-lg" /></div>
                  </div>
                  <div>
                    <Label htmlFor="niche">Nicho</Label>
                    <select id="niche" name="niche" value={formData.niche} onChange={handleChange} className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent h-11 bg-white">
                      <option>Alimentacion y contenido gastronomico</option>
                      <option>Lifestyle y bienestar</option>
                      <option>Sostenibilidad y consumo consciente</option>
                      <option>Fitness y nutricion</option>
                      <option>Otro</option>
                    </select>
                  </div>
                  <div><Label htmlFor="content">Que tipo de contenido haces?</Label><Textarea id="content" name="content" value={formData.content} onChange={handleChange} placeholder="Recetas, reviews, maridajes, cocina diaria, food styling..." rows={3} className="mt-1 rounded-lg" /></div>
                  <button type="submit" disabled={submitting} className="w-full bg-gray-900 text-white py-4 rounded-lg font-semibold hover:bg-gray-800 transition-all hover:scale-[1.01]">{submitting ? 'Enviando solicitud...' : 'Solicitar mi cuenta de influencer'}</button>
                  <p className="text-xs text-gray-500 text-center">Respuesta en menos de 48 horas. Sin compromiso.</p>
                </form>
              </motion.div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-black text-gray-400 py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex gap-6 text-sm flex-wrap justify-center">
              <Link to="/terms" className="hover:text-white transition-colors">Terminos del programa</Link>
              <button onClick={() => setOpenFaq(0)} className="hover:text-white transition-colors">FAQ completo</button>
              <Link to="/help" className="hover:text-white transition-colors">Contactar equipo</Link>
            </div>
            <div className="text-sm">Canonical: <span className="text-gray-500">/influencer</span></div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm"><p>&copy; 2026 Hispaloshop. Todos los derechos reservados.</p></div>
        </div>
      </footer>
    </div>
  );
}
