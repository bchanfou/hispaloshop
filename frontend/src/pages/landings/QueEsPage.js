import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Search, MessageCircle, Package, Leaf, User, Cpu, Droplets, Milk, Beef, Cookie, Coffee, Baby, Dog, Nut } from 'lucide-react';
import SEOHead from '../../components/landings/SEOHead';
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
  { icon: Cookie, label: 'Panadería', color: '#D97706' },
  { icon: Coffee, label: 'Bebidas', color: '#7C3AED' },
  { icon: Baby, label: 'Bebés', color: '#EC4899' },
  { icon: Dog, label: 'Mascotas', color: '#059669' },
  { icon: Nut, label: 'Snacks', color: '#EA580C' },
];

const FEATURES = [
  {
    icon: Leaf,
    title: 'Real',
    description: 'Productos de verdad, hechos por gente de verdad. Sin intermediarios, sin historias inventadas.',
    color: '#16A34A'
  },
  {
    icon: User,
    title: 'Personal',
    description: 'HI AI conoce tus gustos y necesidades. Recomendaciones que mejoran cada día.',
    color: '#E6A532'
  },
  {
    icon: Cpu,
    title: 'Inteligente',
    description: 'Tecnología que simplifica. Desde búsqueda hasta seguimiento de pedidos.',
    color: '#2D5A3D'
  }
];

const STEPS = [
  {
    icon: Search,
    title: 'Explora',
    description: 'Navega productos por categoría o descubre lo que hay cerca de ti.'
  },
  {
    icon: MessageCircle,
    title: 'Conecta',
    description: 'Lee historias de productores, chatea directamente, conoce quién hace tu comida.'
  },
  {
    icon: Package,
    title: 'Disfruta',
    description: 'Recibe en casa con seguridad. Pagos protegidos y envíos trackeados.'
  }
];

const TESTIMONIALS = [
  {
    quote: 'Por fin sé quién hace mi aceite. María me saluda en los comentarios de sus posts.',
    name: 'Laura',
    role: 'Consumidora desde 2023',
    image: 'https://i.pravatar.cc/150?u=laura'
  },
  {
    quote: 'Compro el queso de la misma quesería desde hace un año. Siento que apoyo a una familia.',
    name: 'Carlos',
    role: 'Cliente habitual',
    image: 'https://i.pravatar.cc/150?u=carlos'
  },
  {
    quote: 'La calidad es increíble. Nunca había probado una miel tan buena.',
    name: 'Ana',
    role: 'Nueva usuaria',
    image: 'https://i.pravatar.cc/150?u=ana'
  }
];

const FAQS = [
  {
    question: '¿Es seguro comprar?',
    answer: 'Sí. Pagos protegidos por Stripe, envíos trackeados, garantía de satisfacción. Tu dinero está seguro hasta que recibas el producto.'
  },
  {
    question: '¿Cuánto tarda el envío?',
    answer: '1-3 días en península, 3-5 en islas. Cada vendedor indica sus tiempos exactos en su perfil.'
  },
  {
    question: '¿Puedo contactar al vendedor?',
    answer: 'Sí. Chat directo, perfil social completo, transparencia total. Conoce quién hace tu comida.'
  },
  {
    question: '¿Qué pasa si no me gusta el producto?',
    answer: 'Tienes 14 días para devolverlo si no estás satisfecho. Garantía de calidad en todos los productos.'
  }
];

const QueEsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      <SEOHead
        title="Hispaloshop - Tu mercado local de productos artesanales"
        description="Descubre y compra productos artesanales directo de productores. Aceites, quesos, embutidos y más con envío a domicilio."
        keywords="productos artesanales, comprar online, aceite oliva, queso artesano, gastronomía española"
      />
      
      <NavbarLanding />

      {/* Hero */}
      <section className="bg-[#F5F1E8] pt-12 pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#1A1A1A] leading-tight mb-6">
                Tu mercado local,{' '}
                <span className="text-[#2D5A3D]">sin límites</span>
              </h1>
              <p className="text-lg text-[#6B7280] mb-8 leading-relaxed">
                Descubre productos artesanales de personas reales. 
                Compra directo, conoce la historia detrás de cada sabor.
              </p>
              <div className="flex flex-wrap gap-4">
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

      {/* Problem Section */}
      <section className="bg-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-[#1A1A1A] mb-6">
            ¿Te cansaste de no saber de dónde viene tu comida?
          </h2>
          <div className="grid md:grid-cols-2 gap-6 text-left mb-8">
            <div className="space-y-4 text-[#6B7280]">
              <p>• Etiquetas que no entiendes</p>
              <p>• Productos que viajan miles de km</p>
            </div>
            <div className="space-y-4 text-[#6B7280]">
              <p>• Sabores industrializados</p>
              <p>• Historias inventadas en marketing</p>
            </div>
          </div>
          <p className="text-xl text-[#2D5A3D] font-medium">
            Hispaloshop nace de una pregunta simple:<br />
            <span className="text-[#1A1A1A]">¿Y si conocieras a quien hace tu comida?</span>
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="bg-[#F5F1E8] py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-[#1A1A1A] mb-12">
            Cómo funciona
          </h2>
          <StepProcess steps={STEPS} layout="horizontal" />
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-[#1A1A1A] mb-12">
            Nuestros 3 pilares
          </h2>
          <FeatureGrid features={FEATURES} columns={3} />
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-[#F5F1E8] py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-[#1A1A1A] mb-12">
            Lo que dicen nuestros usuarios
          </h2>
          <TestimonialCarousel testimonials={TESTIMONIALS} />
        </div>
      </section>

      {/* Categories */}
      <section className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-[#1A1A1A] mb-4">
            Descubre por categoría
          </h2>
          <p className="text-center text-[#6B7280] mb-12">
            Sin productos frescos ni alcohol. Calidad que dura.
          </p>
          
          <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
            {CATEGORIES.map((cat, index) => {
              const Icon = cat.icon;
              return (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => navigate('/discover')}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div 
                    className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${cat.color}15` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: cat.color }} />
                  </div>
                  <span className="text-xs font-medium text-[#1A1A1A]">{cat.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[#F5F1E8] py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-[#1A1A1A] mb-12">
            Preguntas frecuentes
          </h2>
          <FAQAccordion faqs={FAQS} />
        </div>
      </section>

      {/* CTA Final */}
      <section className="bg-[#2D5A3D] py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Únete a la comunidad
          </h2>
          <p className="text-white/80 mb-8 text-lg">
            Descubre productos únicos y apoya a productores locales
          </p>
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
