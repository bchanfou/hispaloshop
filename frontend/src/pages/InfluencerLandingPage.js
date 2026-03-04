import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { Button } from '../components/ui/button';
import { ArrowRight, Sparkles, DollarSign, Users, TrendingUp, Award, Shield, Crown, CheckCircle, Share2 } from 'lucide-react';
import BackButton from '../components/BackButton';

function EarningsCalculator() {
  const [gmv, setGmv] = useState(2000);
  const [tierRate, setTierRate] = useState(0.05);
  const commission = Math.round(gmv * tierRate * 100) / 100;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6" data-testid="earnings-calculator">
      <h3 className="font-heading text-lg font-semibold text-[#1C1C1C] mb-4 text-center">Calculadora de comisiones</h3>
      <div className="mb-5">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-text-muted">GMV mensual generado</span>
          <span className="font-semibold">{gmv.toLocaleString()} EUR</span>
        </div>
        <input
          type="range"
          min="500"
          max="50000"
          step="500"
          value={gmv}
          onChange={(e) => setGmv(+e.target.value)}
          className="w-full accent-amber-600"
        />
        <div className="flex justify-between text-[10px] text-text-muted mt-1">
          <span>500 EUR</span>
          <span>50,000 EUR</span>
        </div>
      </div>
      <div className="mb-4">
        <label className="text-xs text-text-muted">Tier de ejemplo</label>
        <select
          value={tierRate}
          onChange={(e) => setTierRate(Number(e.target.value))}
          className="w-full mt-1 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
        >
          <option value={0.03}>Perseo (3%)</option>
          <option value={0.04}>Aquiles (4%)</option>
          <option value={0.05}>Hercules (5%)</option>
          <option value={0.06}>Apolo (6%)</option>
          <option value={0.07}>Zeus (7%)</option>
        </select>
      </div>

      <div className="bg-amber-50 rounded-xl p-5 text-center">
        <p className="text-xs text-amber-700 mb-2">Comision estimada mensual</p>
        <p className="text-4xl font-bold text-amber-700">{commission.toLocaleString('es-ES')} EUR</p>
        <p className="text-[10px] text-amber-600 mt-2">Estimacion basada en el porcentaje del tier seleccionado.</p>
      </div>
    </div>
  );
}

export default function InfluencerLandingPage() {
  const tiers = [
    { key: 'PERSEO', icon: Award, label: 'Perseo', rate: '3%', desc: 'Nivel de entrada', color: 'text-stone-500 bg-stone-50 border-stone-200', reqs: '0-499 EUR GMV' },
    { key: 'AQUILES', icon: Shield, label: 'Aquiles', rate: '4%', desc: 'Primer nivel de crecimiento', color: 'text-[#2D5A27] bg-emerald-50 border-emerald-200', reqs: '500+ EUR GMV' },
    { key: 'HERCULES', icon: Sparkles, label: 'Hercules', rate: '5%', desc: 'Rendimiento consistente', color: 'text-blue-600 bg-blue-50 border-blue-200', reqs: '2,000+ EUR GMV' },
    { key: 'APOLO', icon: TrendingUp, label: 'Apolo', rate: '6%', desc: 'Partner avanzado', color: 'text-amber-700 bg-amber-50 border-amber-200', reqs: '7,500+ EUR GMV' },
    { key: 'ZEUS', icon: Crown, label: 'Zeus', rate: '7%', desc: 'Nivel elite', color: 'text-purple-700 bg-purple-50 border-purple-200', reqs: '20,000+ EUR GMV' },
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <SEO
        title="Programa de Influencers Hispaloshop"
        description="Sube de Perseo a Zeus y escala tu comision del 3% al 7% con sistema de tiers por GMV."
        url="https://www.hispaloshop.com/influencers"
      />
      <Header />
      <div className="max-w-3xl mx-auto px-4 pt-2">
        <BackButton />
      </div>

      <section className="pt-10 pb-8 md:pt-16 md:pb-12" data-testid="influencer-hero">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-widest mb-3">Programa de Influencers</p>
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-semibold text-[#1C1C1C] mb-4 leading-tight">
            Monetiza contenido con tiers reales
          </h1>
          <p className="text-base text-[#555] max-w-xl mx-auto mb-6">
            Sistema de 5 niveles con progresion automatica por GMV acumulado: Perseo, Aquiles, Hercules, Apolo y Zeus.
          </p>
          <Link to="/influencers/registro">
            <Button className="bg-amber-600 hover:bg-amber-700 text-white rounded-full px-7 h-12 text-sm" data-testid="influencer-cta-main">
              <Sparkles className="w-4 h-4 mr-1.5" /> Solicitar acceso
            </Button>
          </Link>
        </div>
      </section>

      <section className="py-10 md:py-14 bg-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-heading text-2xl font-semibold text-[#1C1C1C] mb-8">Como funciona</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Users, label: 'Registro', desc: 'Crea tu perfil' },
              { icon: Share2, label: 'Contenido', desc: 'Comparte enlaces y publicaciones' },
              { icon: Sparkles, label: 'Conversion', desc: 'Genera ventas verificadas' },
              { icon: DollarSign, label: 'Comision', desc: 'Escala de 3% a 7%' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mx-auto mb-2">
                  <s.icon className="w-5 h-5 text-amber-600" />
                </div>
                <p className="text-sm font-semibold text-[#1C1C1C]">{s.label}</p>
                <p className="text-xs text-[#666] mt-0.5">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10 md:py-14">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EarningsCalculator />
            <div>
              <h3 className="font-heading text-lg font-semibold text-[#1C1C1C] mb-4">Tiers activos</h3>
              <div className="space-y-3">
                {tiers.map((tier) => (
                  <div key={tier.key} className={`rounded-xl border p-4 ${tier.color}`} data-testid={`tier-${tier.key}`}>
                    <div className="flex items-center gap-3 mb-1">
                      <tier.icon className="w-5 h-5" />
                      <span className="font-heading text-lg font-semibold">{tier.label}</span>
                      <span className="ml-auto text-lg font-bold">{tier.rate}</span>
                    </div>
                    <p className="text-xs opacity-80">{tier.desc}</p>
                    <p className="text-[10px] opacity-60 mt-1">{tier.reqs}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-10 md:py-14 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="font-heading text-2xl font-semibold text-[#1C1C1C] mb-6 text-center">Que incluye</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              'Codigo personal para atribucion de ventas',
              'Panel de conversiones y evolucion de tier',
              'Registro de comisiones por operacion',
              'Historico de rendimiento por periodo',
              'Soporte de contenido para campanas',
              'Escalado automatico por umbrales de GMV',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 p-3 bg-amber-50/50 rounded-xl">
                <CheckCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-sm text-[#444]">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16 bg-[#1C1C1C]">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="font-heading text-2xl md:text-3xl font-semibold text-white mb-3">Empieza en Perseo y escala hasta Zeus</h2>
          <p className="text-sm text-stone-400 mb-6">Comisiones activas por tier: 3%, 4%, 5%, 6% y 7%.</p>
          <Link to="/influencers/registro">
            <Button className="bg-amber-600 hover:bg-amber-500 text-white rounded-full px-7 h-11 text-sm">
              <Sparkles className="w-4 h-4 mr-1.5" /> Aplicar al programa <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
