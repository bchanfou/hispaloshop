import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Award,
  BarChart3,
  Calculator,
  Check,
  Crown,
  DollarSign,
  Headphones,
  Link2,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import SEOHead from '../../components/landings/SEOHead';
import NavbarLanding from '../../components/landings/NavbarLanding';
import FooterLanding from '../../components/landings/FooterLanding';

const TIERS = [
  { icon: Award, name: 'HERCULES', rate: '3%', rule: 'Desde EUR 0/mes y 0 seguidores', feature: 'Entrada al programa' },
  { icon: Crown, name: 'ATENEA', rate: '5%', rule: 'Desde EUR 5k/mes y 2.5k seguidores', feature: 'Mayor visibilidad y payout superior' },
  { icon: Star, name: 'ZEUS', rate: '7%', rule: 'Desde EUR 20k/mes y 10k seguidores', feature: 'Nivel elite con soporte prioritario' },
];

const TOOLS = [
  { icon: Link2, title: 'Links con tracking', desc: 'Cada venta queda atribuida a tu codigo o enlace.' },
  { icon: BarChart3, title: 'Dashboard en tiempo real', desc: 'Clicks, pedidos y comisiones visibles sin hojas manuales.' },
  { icon: Sparkles, title: 'Creatividad asistida', desc: 'Ideas de contenido para mover catalogo real, no publicidad vacia.' },
  { icon: Headphones, title: 'Soporte prioritario', desc: 'Ayuda rapida para validacion, cobros y dudas operativas.' },
];

const REQUIREMENTS = [
  'Perfil publico en Instagram, TikTok o YouTube',
  '1,000+ seguidores reales',
  'Contenido alineado con gastronomia, lifestyle o consumo consciente',
  'Residencia en un mercado operativo del marketplace',
];

export default function InfluencerLanding() {
  const navigate = useNavigate();
  const [followers, setFollowers] = useState(25000);
  const [engagement, setEngagement] = useState(3.5);
  const [commissionRate, setCommissionRate] = useState(5);

  const estimate = useMemo(() => {
    const baseClicks = followers * (engagement / 100);
    const ordersMin = Math.round(baseClicks * 0.02);
    const ordersMax = Math.round(baseClicks * 0.04);
    const ticket = 50;
    const gmvMin = ordersMin * ticket;
    const gmvMax = ordersMax * ticket;
    return {
      min: Math.round(gmvMin * (commissionRate / 100)),
      max: Math.round(gmvMax * (commissionRate / 100)),
      ordersMin,
      ordersMax,
    };
  }, [commissionRate, engagement, followers]);

  return (
    <div className="min-h-screen bg-white">
      <SEOHead
        title="Programa de Influencers Hispaloshop"
        description="Monetiza contenido con el programa de influencers Hispaloshop. Solo 3 tiers activos: Hercules, Atenea y Zeus."
        keywords="influencer, afiliados, comisiones, creators, gastronomia"
      />
      <NavbarLanding variant="dark" />

      <section className="bg-[#2D5A3D] pt-20 pb-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <p className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/90 text-sm mb-6">
                <Users className="w-4 h-4" />
                3 tiers activos y una sola logica de atribucion
              </p>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                Monetiza contenido con reglas claras
              </h1>
              <p className="text-lg text-white/80 mb-8 leading-relaxed">
                Recomienda productos que encajan con tu audiencia y cobra entre 3% y 7%
                sin inventario, sin stock y con tracking consistente.
              </p>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => navigate('/register/influencer')}
                  className="flex items-center gap-2 px-6 py-3 bg-[#E6A532] text-white rounded-full font-medium hover:bg-[#d4952b] transition-colors"
                >
                  <DollarSign className="w-5 h-5" />
                  Solicitar acceso
                </button>
                <button
                  onClick={() => document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' })}
                  className="px-6 py-3 border-2 border-white text-white rounded-full font-medium hover:bg-white/10 transition-colors"
                >
                  Ver calculadora
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/10 rounded-3xl p-8 backdrop-blur-sm border border-white/10"
            >
              <p className="text-white/70 text-sm mb-2">Ejemplo de payout mensual</p>
              <p className="text-4xl font-bold text-white mb-2">EUR 640</p>
              <p className="text-white/75 mb-6">48 pedidos atribuidos con ticket medio de EUR 50</p>
              <div className="grid grid-cols-3 gap-3 text-center">
                {TIERS.map((tier) => (
                  <div key={tier.name} className="rounded-2xl bg-white/10 p-4">
                    <p className="text-xs text-white/60">{tier.name}</p>
                    <p className="text-xl font-bold text-white">{tier.rate}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#F5F1E8]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-[#1A1A1A] mb-12">Sistema de tiers simplificado</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {TIERS.map((tier, index) => {
              const Icon = tier.icon;
              return (
                <motion.div
                  key={tier.name}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08 }}
                  className="bg-white rounded-2xl p-6 text-center shadow-sm"
                >
                  <Icon className="w-8 h-8 mx-auto mb-3 text-[#E6A532]" />
                  <h3 className="font-bold text-[#1A1A1A]">{tier.name}</h3>
                  <p className="text-3xl font-bold text-[#2D5A3D] my-2">{tier.rate}</p>
                  <p className="text-sm text-[#6B7280]">{tier.rule}</p>
                  <p className="text-xs text-[#6B7280] mt-2">{tier.feature}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="calculator" className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#F8FAF8] rounded-3xl p-8 shadow-sm border border-[#E6ECE7]">
            <div className="flex items-center gap-3 mb-6">
              <Calculator className="w-6 h-6 text-[#2D5A3D]" />
              <h2 className="text-2xl font-bold text-[#1A1A1A]">Calculadora de ingresos</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                  Seguidores
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
                  Engagement rate
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
                <p className="text-center font-semibold text-[#2D5A3D] mt-2">{engagement}%</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                  Tier estimado
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[3, 5, 7].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setCommissionRate(rate)}
                      className={`rounded-xl px-4 py-3 border text-sm font-medium transition-colors ${
                        commissionRate === rate
                          ? 'border-[#2D5A3D] bg-[#2D5A3D] text-white'
                          : 'border-[#D7DED8] bg-white text-[#1A1A1A]'
                      }`}
                    >
                      {rate}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 bg-[#2D5A3D]/5 rounded-2xl p-6 text-center">
              <p className="text-sm text-[#6B7280] mb-2">Estimacion mensual</p>
              <p className="text-4xl font-bold text-[#2D5A3D]">
                EUR {estimate.min.toLocaleString()} - EUR {estimate.max.toLocaleString()}
              </p>
              <p className="text-xs text-[#6B7280] mt-2">
                Basado en {estimate.ordersMin}-{estimate.ordersMax} pedidos estimados al mes.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#F5F1E8]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-[#1A1A1A] mb-12">Herramientas incluidas</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {TOOLS.map((tool, index) => {
              const Icon = tool.icon;
              return (
                <motion.div
                  key={tool.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-start gap-4 p-5 bg-white rounded-2xl shadow-sm"
                >
                  <div className="w-11 h-11 rounded-xl bg-[#2D5A3D]/10 flex items-center justify-center flex-shrink-0">
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

      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-[#1A1A1A] mb-10">Requisitos de entrada</h2>
          <div className="space-y-4 max-w-xl mx-auto text-left">
            {REQUIREMENTS.map((req) => (
              <div key={req} className="flex items-center gap-3">
                <Check className="w-5 h-5 text-[#16A34A] flex-shrink-0" />
                <span className="text-[#1A1A1A]">{req}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate('/register/influencer')}
            className="mt-10 inline-flex items-center gap-2 px-8 py-4 bg-[#2D5A3D] text-white rounded-full font-semibold hover:bg-[#234a31] transition-colors"
          >
            Aplicar como influencer
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      <FooterLanding />
    </div>
  );
}
