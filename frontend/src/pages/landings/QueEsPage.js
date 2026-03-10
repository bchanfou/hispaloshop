import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Search,
  MessageCircle,
  Package,
  Leaf,
  User,
  Cpu,
  Droplets,
  Milk,
  Beef,
  Cookie,
  Coffee,
  Baby,
  Dog,
  Nut,
  Globe,
  Globe2,
  MapPin,
  HeartHandshake,
  Bell,
  Users,
  Star,
  Compass,
} from 'lucide-react';
import SEOHead from '../../components/landings/SEOHead';
import LandingSectionNav from '../../components/landings/LandingSectionNav';
import NavbarLanding from '../../components/landings/NavbarLanding';
import FooterLanding from '../../components/landings/FooterLanding';
import FeatureGrid from '../../components/landings/FeatureGrid';
import TestimonialCarousel from '../../components/landings/TestimonialCarousel';
import FAQAccordion from '../../components/landings/FAQAccordion';
import StepProcess from '../../components/landings/StepProcess';

const CATEGORIES = [
  { icon: Droplets, label: 'Aceites', color: '#16A34A' },
  { icon: Milk, label: 'Quesos', color: '#E6A532' },
  { icon: Beef, label: 'Embutidos', color: '#DC2626' },
  { icon: Cookie, label: 'Panaderia', color: '#D97706' },
  { icon: Coffee, label: 'Bebidas', color: '#7C3AED' },
  { icon: Baby, label: 'Bebes', color: '#EC4899' },
  { icon: Dog, label: 'Mascotas', color: '#059669' },
  { icon: Nut, label: 'Snacks', color: '#EA580C' },
];

const FEATURES = [
  {
    icon: Leaf,
    title: 'Real',
    description: 'Productos de verdad, hechos por gente de verdad. Sin intermediarios, sin historias inventadas.',
    color: '#16A34A',
  },
  {
    icon: User,
    title: 'Personal',
    description: 'HI AI conoce tus gustos y necesidades. Recomendaciones que mejoran cada dia.',
    color: '#E6A532',
  },
  {
    icon: Cpu,
    title: 'Inteligente',
    description: 'Tecnologia que simplifica. Desde busqueda hasta seguimiento de pedidos.',
    color: '#2D5A3D',
  },
];

const STEPS = [
  {
    icon: Search,
    title: 'Explora',
    description: 'Navega productos por categoria o descubre lo que hay cerca de ti.',
  },
  {
    icon: MessageCircle,
    title: 'Conecta',
    description: 'Lee historias de productores, chatea directamente y conoce quien hace tu comida.',
  },
  {
    icon: Package,
    title: 'Disfruta',
    description: 'Recibe en casa con seguridad. Pagos protegidos y envios trackeados.',
  },
];

const TESTIMONIALS = [
  {
    quote: 'Por fin se quien hace mi aceite. Maria me saluda en los comentarios de sus posts.',
    name: 'Laura',
    role: 'Consumidora desde 2023',
    image: 'https://i.pravatar.cc/150?u=laura',
  },
  {
    quote: 'Compro el queso de la misma queseria desde hace un ano. Siento que apoyo a una familia.',
    name: 'Carlos',
    role: 'Cliente habitual',
    image: 'https://i.pravatar.cc/150?u=carlos',
  },
  {
    quote: 'La calidad es increible. Nunca habia probado una miel tan buena.',
    name: 'Ana',
    role: 'Nueva usuaria',
    image: 'https://i.pravatar.cc/150?u=ana',
  },
];

const FAQS = [
  {
    question: 'Es seguro comprar?',
    answer: 'Si. Pagos protegidos por Stripe, envios trackeados y garantia de satisfaccion. Tu dinero esta seguro hasta que recibas el producto.',
  },
  {
    question: 'Cuanto tarda el envio?',
    answer: '1-3 dias en peninsula y 3-5 en islas. Cada vendedor indica sus tiempos exactos en su perfil.',
  },
  {
    question: 'Puedo contactar al vendedor?',
    answer: 'Si. Chat directo, perfil social completo y transparencia total. Conoce quien hace tu comida.',
  },
  {
    question: 'Que pasa si no me gusta el producto?',
    answer: 'Tienes 14 dias para devolverlo si no estas satisfecho. Garantia de calidad en todos los productos.',
  },
];

const MARKET_FOLLOWING = [
  {
    code: 'ES',
    name: 'Carolina',
    location: 'Barcelona, Espana',
    status: 'Disponible',
    statusClass: 'bg-green-500/20 text-green-300',
    avatarClass: 'bg-green-100 text-green-700',
    dimmed: false,
  },
  {
    code: 'IT',
    name: 'Olio Benedetto',
    location: 'Toscana, Italia',
    status: 'Siguiendo',
    statusClass: 'bg-purple-500/20 text-purple-300',
    avatarClass: 'bg-purple-100 text-purple-700',
    dimmed: false,
  },
  {
    code: 'MX',
    name: 'Miel de Oaxaca',
    location: 'Oaxaca, Mexico',
    status: 'No disponible',
    statusClass: 'bg-gray-500/20 text-gray-300',
    avatarClass: 'bg-yellow-100 text-yellow-700',
    dimmed: true,
  },
];

const COUNTRY_MARKETS = [
  { code: 'ES', name: 'Espana', flag: 'ES' },
  { code: 'IT', name: 'Italia', flag: 'IT' },
  { code: 'MX', name: 'Mexico', flag: 'MX' },
  { code: 'CO', name: 'Colombia', flag: 'CO' },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.55, ease: 'easeOut' },
};

const QueEsPage = () => {
  const navigate = useNavigate();
  const [detectedMarket, setDetectedMarket] = useState(null);

  const multimarketNav = useMemo(() => ([
    { label: 'Multimarket', href: '#multimarket' },
  ]), []);

  const detectCountry = () => {
    const locale = typeof navigator !== 'undefined' ? navigator.language || 'es-ES' : 'es-ES';
    const [, region = 'ES'] = locale.split('-');
    const detected = COUNTRY_MARKETS.find((country) => country.code === region.toUpperCase()) || COUNTRY_MARKETS[0];

    setDetectedMarket(detected);
    navigate(`/discover?market=${detected.code.toLowerCase()}`);
  };

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      <SEOHead
        title="Hispaloshop - Tu mercado local de productos artesanales"
        description="Descubre y compra productos artesanales directo de productores. Aceites, quesos, embutidos y mas con envio a domicilio."
        keywords="productos artesanales, comprar online, aceite oliva, queso artesano, gastronomia espanola"
      />

      <NavbarLanding extraLinks={multimarketNav} />
      <LandingSectionNav />

      <section className="bg-[#F5F1E8] pt-10 sm:pt-12 pb-16 sm:pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#1A1A1A] leading-tight mb-6">
                Tu mercado local, <span className="text-[#2D5A3D]">sin limites</span>
              </h1>
              <p className="text-lg text-[#6B7280] mb-8 leading-relaxed">
                Descubre productos artesanales de personas reales. Compra directo y conoce la historia detras de cada sabor.
              </p>
              <div className="flex flex-col sm:flex-row flex-wrap gap-4">
                <button
                  onClick={() => navigate('/register/new')}
                  className="flex items-center gap-2 px-6 py-3 bg-[#2D5A3D] text-white rounded-full font-medium hover:bg-[#234a31] transition-colors"
                >
                  Explorar productos
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => navigate('/discover')}
                  className="px-6 py-3 border-2 border-[#2D5A3D] text-[#2D5A3D] rounded-full font-medium hover:bg-[#2D5A3D] hover:text-white transition-colors"
                >
                  Descargar app
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative"
            >
              <div className="grid grid-cols-2 gap-4">
                <img
                  src="https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400"
                  alt="Aceite de oliva"
                  className="rounded-2xl shadow-lg"
                />
                <img
                  src="https://images.unsplash.com/photo-1552767059-ce182ead6c1b?w=400"
                  alt="Queso artesanal"
                  className="rounded-2xl shadow-lg mt-8"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-[#1A1A1A] mb-6">
            Te cansaste de no saber de donde viene tu comida?
          </h2>
          <div className="grid md:grid-cols-2 gap-6 text-left mb-8">
            <div className="space-y-4 text-[#6B7280]">
              <p>- Etiquetas que no entiendes</p>
              <p>- Productos que viajan miles de km</p>
            </div>
            <div className="space-y-4 text-[#6B7280]">
              <p>- Sabores industrializados</p>
              <p>- Historias inventadas en marketing</p>
            </div>
          </div>
          <p className="text-xl text-[#2D5A3D] font-medium">
            Hispaloshop nace de una pregunta simple:
            <br />
            <span className="text-[#1A1A1A]">Y si conocieras a quien hace tu comida?</span>
          </p>
        </div>
      </section>

      <section className="bg-[#1A1A1A] py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#9CC3A6] mb-3">La historia detrás</p>
            <h2 className="text-3xl font-bold text-white mb-4">Por qué existe Hispaloshop</h2>
            <p className="text-[#9a9a9a] text-lg">No es una empresa. Es una respuesta a algo que vi con mis propios ojos.</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-6 sm:p-8 border border-white/10 space-y-5 text-[#d1d5db] text-base leading-8">
            <p>
              Tenía 24 años y recorría España de fábrica en fábrica. Conocí a productores increíbles: la{' '}
              <strong className="text-white">Cooperativa La Carrera</strong> en Úbeda,{' '}
              <strong className="text-white">Anaconda Foods</strong> en Madrid,{' '}
              <strong className="text-white">Carolina Honest</strong> en Reus. Gente que se partía el lomo para
              hacer algo con alma. Y nadie los veía. Sus productos se perdían entre estanterías de supermercados
              que se quedaban el 50% del margen y los pagaban cuando les daba la gana.
            </p>
            <p>
              Intenté llevar esos productos al mundo. Fracasé. Perdí 15.000€ y lloré en un parque de Seúl.
              Pero entendí algo que no se olvida: <strong className="text-white">el problema no era el producto.
              Era la falta de un canal directo entre quien hace la comida y quien la come.</strong>
            </p>
            <p>
              Hispaloshop existe para eso. Para que tú sepas exactamente quién hace lo que comes. Para que el
              productor honesto no sea invisible. Para que la calidad de verdad llegue directamente a tu mesa,
              sin intermediarios que inflan el precio y borran la historia.
            </p>
            <div className="pt-2 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#2D5A3D] flex items-center justify-center text-white font-bold text-xs shrink-0">BC</div>
              <div>
                <p className="text-white font-semibold text-sm">Bil Chanfou — Fundador</p>
                <a href="https://instagram.com/bchanfuah" target="_blank" rel="noopener noreferrer" className="text-xs text-[#9CC3A6] hover:text-white transition-colors">@bchanfuah</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#F5F1E8] py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-[#1A1A1A] mb-12">Cómo funciona</h2>
          <StepProcess steps={STEPS} layout="horizontal" />
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-[#1A1A1A] mb-12">Nuestros 3 pilares</h2>
          <FeatureGrid features={FEATURES} columns={3} />
        </div>
      </section>

      <section id="multimarket" className="py-24 bg-white relative overflow-hidden scroll-mt-24">
        <div className="absolute inset-0 pointer-events-none opacity-[0.035]">
          <div className="absolute left-1/2 top-16 h-[420px] w-[820px] -translate-x-1/2 rounded-full border border-[#2D5A3D]" />
          <div className="absolute left-1/2 top-28 h-[300px] w-[620px] -translate-x-1/2 rounded-full border border-[#2D5A3D]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div {...fadeUp} className="text-center mb-16">
            <span className="inline-flex items-center px-4 py-2 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-4">
              <Globe className="w-4 h-4 mr-2" />
              Infraestructura global
            </span>
            <h2 className="font-heading text-4xl lg:text-5xl font-bold text-[#1A1A1A] mb-4">
              Un mercado, mil historias locales
            </h2>
            <p className="text-xl text-[#6B7280] max-w-3xl mx-auto">
              Hispaloshop conecta productores y consumidores en todo el mundo, con la inteligencia de mostrarte solo lo que puedes disfrutar donde vives.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <motion.div
              {...fadeUp}
              className="rounded-2xl p-8 border border-blue-100 bg-gradient-to-br from-blue-50 to-white shadow-card hover:-translate-y-1 hover:shadow-card-hover transition-all duration-300"
            >
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <Globe2 className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-[#1A1A1A] mb-3">Red global</h3>
              <p className="text-[#6B7280] leading-relaxed">
                Productores de Espana, Italia, Mexico, Colombia y mas. Una comunidad mundial de artesanos alimentarios compartiendo su trabajo.
              </p>
            </motion.div>

            <motion.div
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: 0.08 }}
              className="rounded-2xl p-8 border border-[#DCE8DE] bg-gradient-to-br from-[#EEF7F0] to-white shadow-card hover:-translate-y-1 hover:shadow-card-hover transition-all duration-300"
            >
              <div className="w-14 h-14 bg-[#DCE8DE] rounded-xl flex items-center justify-center mb-6">
                <MapPin className="w-7 h-7 text-[#2D5A3D]" />
              </div>
              <h3 className="text-xl font-bold text-[#1A1A1A] mb-3">Compra local</h3>
              <p className="text-[#6B7280] leading-relaxed">
                Ves solo productos disponibles en tu pais. Envios nacionales garantizados, frescura real y apoyo a la economia local. Sin sorpresas de aduanas ni envios imposibles.
              </p>
            </motion.div>

            <motion.div
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: 0.16 }}
              className="rounded-2xl p-8 border border-purple-100 bg-gradient-to-br from-purple-50 to-white shadow-card hover:-translate-y-1 hover:shadow-card-hover transition-all duration-300"
            >
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                <HeartHandshake className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-[#1A1A1A] mb-3">Conexion sin fronteras</h3>
              <p className="text-[#6B7280] leading-relaxed">
                Sigue a un productor italiano hoy. Cuando venda en tu pais, <span className="font-semibold text-purple-700">HI AI te avisa automaticamente</span>. Conecta global, consume local.
              </p>
            </motion.div>
          </div>

          <motion.div
            {...fadeUp}
            className="bg-[#111827] rounded-3xl p-8 lg:p-12 text-white relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full mix-blend-screen blur-3xl opacity-20" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#2D5A3D] rounded-full mix-blend-screen blur-3xl opacity-25" />

            <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="font-heading text-3xl font-bold mb-6">Como funciona el Multimarket?</h3>

                <div className="space-y-6">
                  {[
                    {
                      title: 'Registro inteligente',
                      text: 'Detectamos tu pais automaticamente. Tu experiencia se personaliza para tu mercado local.',
                    },
                    {
                      title: 'Catalogo filtrado',
                      text: 'Solo ves productos con envio disponible a tu ubicacion. Precios en tu moneda y tiempos reales de entrega.',
                    },
                    {
                      title: 'Red social global',
                      text: 'Sigue productores de cualquier pais. Ves su contenido. Cuando expanden a tu mercado, HI AI te lo comunica.',
                    },
                  ].map((step, index) => (
                    <div key={step.title} className="flex gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg mb-1">{step.title}</h4>
                        <p className="text-gray-300">{step.text}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 inline-flex items-center rounded-full bg-white/10 px-4 py-2 text-sm text-gray-200 border border-white/10">
                  Geobloqueo inteligente por frescura, no por exclusion.
                </div>
              </div>

              <div className="bg-white/10 rounded-2xl p-6 backdrop-blur-sm border border-white/15">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10 gap-4">
                  <span className="text-sm font-medium text-gray-200">Tu ubicacion:</span>
                  <span className="flex items-center gap-2 bg-[#2D5A3D]/30 px-3 py-1 rounded-full text-[#B7E0BF] text-sm">
                    <MapPin className="w-4 h-4" />
                    {detectedMarket?.name || 'Espana'}
                  </span>
                </div>

                <div className="space-y-3">
                  {MARKET_FOLLOWING.map((producer) => (
                    <div
                      key={producer.name}
                      className={`flex items-center justify-between gap-3 p-3 bg-white/10 rounded-lg ${producer.dimmed ? 'opacity-70' : ''}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${producer.avatarClass}`}>
                          {producer.code}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{producer.name}</p>
                          <p className="text-xs text-gray-300 truncate">{producer.location}</p>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded whitespace-nowrap ${producer.statusClass}`}>
                        {producer.status}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20 animate-pulse-slow">
                  <p className="text-sm text-blue-200 flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    HI AI te avisara cuando Miel de Oaxaca envie a {detectedMarket?.name || 'Espana'}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            {...fadeUp}
            className="mt-16 bg-[#EEF7F0] rounded-3xl p-8 lg:p-12 border border-[#DCE8DE]"
          >
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="flex-shrink-0">
                  <img
                    src="https://images.unsplash.com/photo-1589156280159-27698a70f29e?w=200&h=200&fit=crop&crop=face"
                    alt="Helena Rodriguez - Fundadora de Carolina"
                    className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                  />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <div className="text-4xl text-[#9CC3A6] font-heading mb-2">"</div>
                  <p className="text-lg text-[#4A4A4A] leading-relaxed mb-4">
                    Gracias al modelo multimarket, mis clientes espanoles disfrutan de mis galletas frescas, pero tambien tengo seguidores en Italia que esperan que Carolina expanda. HI AI les avisara el dia que enviemos alli. Es como tener una comunidad global que respeta lo local.
                  </p>
                  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                    <p className="font-bold text-[#1A1A1A]">Helena Rodriguez</p>
                    <span className="hidden md:inline text-gray-400">|</span>
                    <p className="text-[#2D5A3D] font-medium">Fundadora, Carolina Honest Food</p>
                  </div>
                  <div className="mt-3 flex items-center justify-center md:justify-start gap-4 text-sm text-[#6B7280] flex-wrap">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      25.000 seguidores
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500" />
                      4.9/5 valoracion
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div {...fadeUp} className="mt-12 text-center">
            <p className="text-[#6B7280] mb-4">Quieres saber que productores hay en tu pais?</p>
            <button
              onClick={detectCountry}
              className="bg-[#2D5A3D] text-white px-8 py-3 rounded-full font-semibold inline-flex items-center gap-2 hover:bg-[#234a31] transition-colors"
            >
              <Compass className="w-5 h-5" />
              Explorar mi mercado local
            </button>
            {detectedMarket && (
              <p className="mt-4 text-sm text-[#2D5A3D]">
                Mercado detectado: {detectedMarket.name}. Conecta con productores globales, compra solo lo disponible en tu pais.
              </p>
            )}
          </motion.div>
        </div>
      </section>

      <section className="bg-[#F5F1E8] py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-[#1A1A1A] mb-12">Lo que dicen nuestros usuarios</h2>
          <TestimonialCarousel testimonials={TESTIMONIALS} />
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-[#1A1A1A] mb-4">Descubre por categoria</h2>
          <p className="text-center text-[#6B7280] mb-12">Sin productos frescos ni alcohol. Calidad que dura.</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-4">
            {CATEGORIES.map((cat, index) => {
              const Icon = cat.icon;

              return (
                <motion.button
                  key={cat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => navigate('/discover')}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: `${cat.color}15` }}>
                    <Icon className="w-6 h-6" style={{ color: cat.color }} />
                  </div>
                  <span className="text-xs font-medium text-[#1A1A1A] text-center">{cat.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#F5F1E8] py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-[#1A1A1A] mb-12">Preguntas frecuentes</h2>
          <FAQAccordion faqs={FAQS} />
        </div>
      </section>

      <section className="bg-[#2D5A3D] py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Unete a la comunidad</h2>
          <p className="text-white/80 mb-8 text-lg">Descubre productos unicos y apoya a productores locales</p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => navigate('/register/new')}
              className="px-8 py-4 bg-white text-[#2D5A3D] rounded-full font-semibold hover:bg-gray-100 transition-colors"
            >
              Registrarme gratis
            </button>
            <button
              onClick={() => navigate('/discover')}
              className="px-8 py-4 border-2 border-white text-white rounded-full font-semibold hover:bg-white/10 transition-colors"
            >
              Explorar sin cuenta
            </button>
          </div>
        </div>
      </section>

      <FooterLanding />
    </div>
  );
};

export default QueEsPage;
