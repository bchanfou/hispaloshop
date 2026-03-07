import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, DollarSign, Users, TrendingUp, Check, Calculator, Camera, Link2, BarChart3, Gift, Headphones, Star, Trophy, Award, Crown } from 'lucide-react';
import SEOHead from '../../components/landings/SEOHead';
import NavbarLanding from '../../components/landings/NavbarLanding';
import FooterLanding from '../../components/landings/FooterLanding';
import PricingTable from '../../components/landings/PricingTable';
import TestimonialCarousel from '../../components/landings/TestimonialCarousel';

const TIERS = [
  { icon: Star, name: 'PERSEO', rate: '3%', range: '€0-1k/mes', feature: 'Acceso básico' },
  { icon: Trophy, name: 'AQUILES', rate: '4%', range: '€1k-5k/mes', feature: 'Badge bronce' },
  { icon: Award, name: 'HÉRCULES', rate: '5%', range: '€5k-15k/mes', feature: 'Early access' },
  { icon: Crown, name: 'ZEUS', rate: '7%', range: '>€15k/mes', feature: 'Manager dedicado' },
];

const TOOLS = [
  { icon: Link2, title: 'Links personalizados', desc: 'Tracking de cada conversión' },
  { icon: BarChart3, title: 'Analytics real-time', desc: 'Dashboard completo' },
  { icon: Camera, title: 'HI AI Creator', desc: 'Genera contenido con IA' },
  { icon: Gift, title: 'Catálogo con muestras', desc: 'Prueba antes de promocionar' },
  { icon: DollarSign, title: 'Pagos automáticos', desc: 'Semanal o mensual' },
  { icon: Headphones, title: 'Soporte prioritario', desc: 'Atención especializada' },
];

const TESTIMONIALS = [
  {
    quote: 'He ganado €1,200 este mes recomendando quesos que compro igualmente.',
    name: '@maria_foodie',
    role: 'Influencer gastronómica',
    image: 'https://i.pravatar.cc/150?u=maria'
  },
  {
    quote: 'Mi engagement subió un 40% desde que comparto contenido de productores reales.',
    name: '@carlos_eats',
    role: 'Food blogger',
    image: 'https://i.pravatar.cc/150?u=carlos2'
  }
];

const InfluencerLanding = () => {
  const navigate = useNavigate();
  const [followers, setFollowers] = useState(25000);
  const [engagement, setEngagement] = useState(3.5);
  
  const estimatedMin = Math.round(followers * (engagement / 100) * 0.02 * 10);
  const estimatedMax = Math.round(followers * (engagement / 100) * 0.04 * 10);

  return (
    <div className="min-h-screen">
      <SEOHead
        title="Monetiza tu contenido como influencer en Hispaloshop"
        description="Gana dinero recomendando productos artesanales. Programa de afiliados con comisiones del 3% al 7%. Sin inventarios, sin compromisos."
        keywords="influencer marketing, monetizar instagram, programa afiliados, food blogger"
      />
      
      <NavbarLanding variant="dark" />

      {/* Hero */}
      <section className="bg-[#2D5A3D] pt-20 pb-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                Monetiza tu paladar
              </h1>
              <p className="text-lg text-white/80 mb-8 leading-relaxed">
                Gana dinero compartiendo productos que te gustan de verdad. 
                Sin inventarios, sin compromisos, sin drama.
              </p>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => navigate('/register/influencer')}
                  className="flex items-center gap-2 px-6 py-3 bg-[#E6A532] text-white rounded-full font-medium hover:bg-[#d4952b] transition-colors"
                >
                  <DollarSign className="w-5 h-5" />
                  Quiero empezar
                </button>
                <button
                  onClick={() => document.getElementById('calculator').scrollIntoView({ behavior: 'smooth' })}
                  className="px-6 py-3 border-2 border-white text-white rounded-full font-medium hover:bg-white/10 transition-colors"
                >
                  Ver calculadora
                </button>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/10 rounded-2xl p-6 backdrop-blur-sm"
            >
              <p className="text-white/90 italic mb-4">
                "He ganado €1,200 este mes recomendando quesos que compro igualmente"
              </p>
              <div className="flex items-center gap-3">
                <img
                  src="https://i.pravatar.cc/150?u=maria"
                  alt="@maria_foodie"
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <p className="text-white font-medium">@maria_foodie</p>
                  <p className="text-white/60 text-sm">12.5k seguidores</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Model */}
      <section className="bg-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-[#1A1A1A] mb-12">Así de simple</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {['Descubre productos', 'Crea contenido', 'Comparte tu link', 'Gana comisión'].map((step, i) => (
              <div key={i} className="relative">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#2D5A3D] text-white flex items-center justify-center font-bold">
                  {i + 1}
                </div>
                <p className="font-medium text-[#1A1A1A]">{step}</p>
                {i < 3 && (
                  <div className="hidden md:block absolute top-6 left-[60%] w-full h-0.5 bg-[#2D5A3D]/20" />
                )}
              </div>
            ))}
          </div>
          <p className="mt-8 text-[#6B7280]">
            No vendas lo que no comprarías. Tu credibilidad es tu activo.
          </p>
        </div>
      </section>

      {/* Tiers */}
      <section className="bg-[#F5F1E8] py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-[#1A1A1A] mb-12">
            Sistema de niveles
          </h2>
          <div className="grid md:grid-cols-4 gap-4">
            {TIERS.map((tier, index) => {
              const Icon = tier.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-2xl p-6 text-center"
                >
                  <Icon className="w-8 h-8 mx-auto mb-3 text-[#E6A532]" />
                  <h3 className="font-bold text-[#1A1A1A]">{tier.name}</h3>
                  <p className="text-3xl font-bold text-[#2D5A3D] my-2">{tier.rate}</p>
                  <p className="text-sm text-[#6B7280]">{tier.range}</p>
                  <p className="text-xs text-[#6B7280] mt-2">{tier.feature}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Tools */}
      <section className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-[#1A1A1A] mb-12">
            Herramientas incluidas
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {TOOLS.map((tool, index) => {
              const Icon = tool.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-4 p-4"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#2D5A3D]/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-[#2D5A3D]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#1A1A1A]">{tool.title}</h3>
                    <p className="text-sm text-[#6B7280]">{tool.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Calculator */}
      <section id="calculator" className="bg-[#F5F1E8] py-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Calculator className="w-6 h-6 text-[#2D5A3D]" />
              <h2 className="text-2xl font-bold text-[#1A1A1A]">Calculadora de ingresos</h2>
            </div>
            
            <div className="space-y-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                  ¿Cuántos seguidores tienes?
                </label>
                <input
                  type="range"
                  min="1000"
                  max="500000"
                  step="1000"
                  value={followers}
                  onChange={(e) => setFollowers(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <p className="text-center font-semibold text-[#2D5A3D] mt-2">
                  {followers.toLocaleString()} personas
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                  ¿Cuál es tu engagement rate?
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.1"
                  value={engagement}
                  onChange={(e) => setEngagement(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <p className="text-center font-semibold text-[#2D5A3D] mt-2">
                  {engagement}%
                </p>
              </div>
            </div>
            
            <div className="bg-[#2D5A3D]/5 rounded-xl p-6 text-center">
              <p className="text-sm text-[#6B7280] mb-2">Estimación mensual:</p>
              <p className="text-4xl font-bold text-[#2D5A3D]">
                €{estimatedMin.toLocaleString()} - €{estimatedMax.toLocaleString()}
              </p>
              <p className="text-xs text-[#6B7280] mt-2">
                Basado en conversión promedio 2-4%
              </p>
            </div>
            
            <button
              onClick={() => navigate('/register/influencer')}
              className="w-full mt-6 py-3 bg-[#2D5A3D] text-white rounded-xl font-medium hover:bg-[#234a31] transition-colors"
            >
              Empezar ahora
            </button>
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="bg-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-[#1A1A1A] mb-12">
            Para unirte
          </h2>
          <div className="space-y-4 max-w-lg mx-auto">
            {[
              'Perfil público en Instagram/TikTok/YouTube',
              '1,000+ seguidores reales',
              'Contenido relacionado con gastronomía/lifestyle',
              'Mayor de edad y residencia UE'
            ].map((req, i) => (
              <div key={i} className="flex items-center gap-3">
                <Check className="w-5 h-5 text-[#16A34A] flex-shrink-0" />
                <span className="text-[#1A1A1A]">{req}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-[#6B7280] mt-6">
            Proceso de aprobación: 24-48h
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#2D5A3D] py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Tu audiencia confía en ti
          </h2>
          <p className="text-white/80 mb-8">
            Recomiéndales lo mejor
          </p>
          <button
            onClick={() => navigate('/register/influencer')}
            className="px-8 py-4 bg-[#E6A532] text-white rounded-full font-semibold hover:bg-[#d4952b] transition-colors"
          >
            Aplicar como influencer
          </button>
        </div>
      </section>

      <FooterLanding />
    </div>
  );
};

export default InfluencerLanding;
