import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Store, CreditCard, Truck, Share2, Cpu, BarChart3, Check, Star, Zap, Gem, Quote } from 'lucide-react';
import SEOHead from '../../components/landings/SEOHead';
import NavbarLanding from '../../components/landings/NavbarLanding';
import FooterLanding from '../../components/landings/FooterLanding';
import PricingTable from '../../components/landings/PricingTable';
import StepProcess from '../../components/landings/StepProcess';

const FEATURES = [
  { icon: Store, title: 'Tienda digital', desc: 'Tu propio escaparate online' },
  { icon: CreditCard, title: 'Pagos seguros', desc: 'Stripe integrado, sin complicaciones' },
  { icon: Truck, title: 'Logística', desc: 'Integrada o externa, tú decides' },
  { icon: Share2, title: 'Red social', desc: 'Posts y reels integrados' },
  { icon: Cpu, title: 'HI AI', desc: 'Asistente de ventas inteligente' },
  { icon: BarChart3, title: 'Analytics', desc: 'Datos en tiempo real' },
];

const PLANS = [
  {
    name: 'FREE',
    price: '€0',
    period: '/mes',
    commission: '20% comisión',
    features: [
      'Hasta 50 productos',
      'Tienda básica',
      'Soporte email',
      'Acceso a comunidad'
    ],
    cta: 'Empezar gratis',
    onCta: () => window.location.href = '/register/producer'
  },
  {
    name: 'PRO',
    price: '€79',
    period: '/mes',
    commission: '18% comisión',
    features: [
      'Productos ilimitados',
      'Destacados en búsqueda',
      'HI AI avanzado',
      'Soporte prioritario'
    ],
    cta: 'Elegir PRO',
    onCta: () => window.location.href = '/register/producer'
  },
  {
    name: 'ELITE',
    price: '€149',
    period: '/mes',
    commission: '17% comisión',
    features: [
      'Todo lo de PRO',
      'Manager dedicado',
      'Envío gratuito incluido',
      'API acceso'
    ],
    cta: 'Contactar ventas',
    onCta: () => window.location.href = '/register/producer'
  }
];

const TESTIMONIALS = [
  {
    quote: 'Dejé de depender de los intermediarios. Ahora decido yo cuánto vale mi trabajo.',
    name: 'José',
    role: 'Cortijo Andaluz',
    image: 'https://i.pravatar.cc/150?u=jose'
  },
  {
    quote: 'Crecí un 300% en 6 meses. La visibilidad que me dio Hispaloshop fue increíble.',
    name: 'María',
    role: 'Quesería La Antigua',
    image: 'https://i.pravatar.cc/150?u=maria2'
  },
  {
    quote: 'Exporto a Alemania desde mi pueblo. Nunca imaginé tener clientes internacionales.',
    name: 'Antonio',
    role: 'Miel del Sur',
    image: 'https://i.pravatar.cc/150?u=antonio'
  }
];

const ProductorLanding = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <SEOHead
        title="Vende directo online como productor en Hispaloshop"
        description="Crea tu tienda digital y vende directo a consumidores. Controla tu precio y marca. Comisión desde solo el 17%."
        keywords="vender productos artesanales, tienda online productores, ecommerce alimentación"
      />
      
      <NavbarLanding />

      {/* Hero */}
      <section className="relative bg-[#2D5A3D] pt-20 pb-24">
        <div className="absolute inset-0 opacity-20">
          <img
            src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200"
            alt="Olivar"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                Tu granja, tu tienda, tus reglas
              </h1>
              <p className="text-lg text-white/80 mb-8 leading-relaxed">
                Vende directo a consumidores e importadores. Controla tu precio, tu marca, tu futuro.
              </p>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => navigate('/register/producer')}
                  className="flex items-center gap-2 px-6 py-3 bg-[#E6A532] text-white rounded-full font-medium hover:bg-[#d4952b] transition-colors"
                >
                  <ArrowRight className="w-5 h-5" />
                  Crear mi tienda
                </button>
                <button
                  onClick={() => navigate('/help')}
                  className="px-6 py-3 border-2 border-white text-white rounded-full font-medium hover:bg-white/10 transition-colors"
                >
                  Hablar con equipo
                </button>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/10 rounded-2xl p-6 backdrop-blur-sm"
            >
              <Quote className="w-8 h-8 text-[#E6A532] mb-4" />
              <p className="text-white/90 italic mb-4">
                "Dejé de depender de los intermediarios. Ahora decido yo cuánto vale mi trabajo"
              </p>
              <div className="flex items-center gap-3">
                <img
                  src="https://i.pravatar.cc/150?u=jose"
                  alt="José"
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <p className="text-white font-medium">José</p>
                  <p className="text-white/60 text-sm">Cortijo Andaluz</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="bg-[#F5F1E8] py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-[#1A1A1A] mb-12">
            El modelo tradicional vs Hispaloshop
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl p-6">
              <h3 className="font-semibold text-[#DC2626] mb-4">El modelo antiguo</h3>
              <p className="text-[#6B7280] text-sm mb-4">Tú → Cooperativa → Distribuidor → Supermercado → Cliente</p>
              <div className="text-3xl font-bold text-[#DC2626]">Tu margen: 15-20%</div>
            </div>
            <div className="bg-[#2D5A3D] rounded-2xl p-6 text-white">
              <h3 className="font-semibold text-[#E6A532] mb-4">Hispaloshop</h3>
              <p className="text-white/70 text-sm mb-4">Tú → Cliente directo</p>
              <div className="text-3xl font-bold">Tu margen: 80-85%</div>
              <p className="text-white/60 text-sm mt-2">(menos comisión 15-20%)</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-[#1A1A1A] mb-12">
            Todo incluido
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-[#F5F1E8] rounded-2xl p-6 text-center"
                >
                  <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#2D5A3D] flex items-center justify-center">
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="font-semibold text-[#1A1A1A] mb-2">{feature.title}</h3>
                  <p className="text-sm text-[#6B7280]">{feature.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-[#F5F1E8] py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-[#1A1A1A] mb-4">
            Elige tu plan
          </h2>
          <p className="text-center text-[#6B7280] mb-12">
            Sin permanencia. Cambia o cancela cuando quieras.
          </p>
          <PricingTable plans={PLANS} highlighted={1} />
        </div>
      </section>

      {/* Requirements */}
      <section className="bg-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-[#1A1A1A] mb-12">
            Requisitos para vender
          </h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {[
              'Registro sanitario (RGSEAA)',
              'Seguro de responsabilidad civil',
              'Cuenta bancaria para cobros',
              'Compromiso de calidad'
            ].map((req, i) => (
              <div key={i} className="flex items-center gap-3">
                <Check className="w-5 h-5 text-[#16A34A]" />
                <span className="text-[#1A1A1A]">{req}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-[#6B7280] mt-8">
            Te ayudamos con la documentación si es necesario.
          </p>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-[#F5F1E8] py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-[#1A1A1A] mb-12">
            Historias de éxito
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl p-6"
              >
                <Quote className="w-8 h-8 text-[#E6A532] mb-4" />
                <p className="text-[#1A1A1A] mb-4 italic">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <img src={t.image} alt={t.name} className="w-10 h-10 rounded-full" />
                  <div>
                    <p className="font-semibold text-[#1A1A1A]">{t.name}</p>
                    <p className="text-sm text-[#6B7280]">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#2D5A3D] py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Tu producto merece ser encontrado
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => navigate('/register/producer')}
              className="px-8 py-4 bg-[#E6A532] text-white rounded-full font-semibold hover:bg-[#d4952b] transition-colors"
            >
              Crear tienda gratis
            </button>
            <button
              onClick={() => navigate('/help')}
              className="px-8 py-4 border-2 border-white text-white rounded-full font-semibold hover:bg-white/10 transition-colors"
            >
              Solicitar llamada
            </button>
          </div>
        </div>
      </section>

      <FooterLanding />
    </div>
  );
};

export default ProductorLanding;
