// @ts-nocheck
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import SEO from '../../components/SEO';

const Section = ({ dark, children, className = '' }: { dark: boolean; children: React.ReactNode; className?: string }) => (
  <section className={`${dark ? 'bg-[#0A0A0A]' : 'bg-stone-50'} py-20 px-4 font-inherit ${className}`}>
    <div className="max-w-[1200px] mx-auto">{children}</div>
  </section>
);

export default function ForInfluencers() {
  const navigate = useNavigate();
  useScrollReveal();
  usePageTitle();

  return (
    <div>
      <SEO title="Soy Influencer \u2014 HispaloShop" description="Gana comisiones reales recomendando productos artesanales. C\u00f3digo de afiliado, cobros mensuales y tiers de comisi\u00f3n del 3% al 7%." />
      {/* ══════ SECCIÓN 1 — HERO (negro) ══════ */}
      <section className="min-h-screen bg-[#0A0A0A] flex items-start pt-[120px] pb-20 px-4">
        <div className="max-w-[1200px] mx-auto w-full">
          <div className="max-w-[820px]">
            <p className="info-eyebrow hero-animate-in text-stone-500 mb-4">
              PARA CREADORES DE CONTENIDO
            </p>
            <h1 className="info-h1 hero-animate-in-delay-1 text-white whitespace-pre-line mb-6">
              {'No vendes productos.\nApoyas a productores\nreales de tu país.'}
            </h1>
            <p className="info-lead hero-animate-in-delay-2 text-white/65 max-w-[580px] mb-10">
              En Corea conocí a creadores con decenas de miles de
              seguidores que tenían que aceptar trabajos mal pagados
              para sobrevivir. Rebeca, de Zaragoza, con 2.000 seguidores
              y el sueño de vivir de lo que creaba. Alberto, canario,
              con 100.000 seguidores y sin poder pagar el alquiler.
              Diseñé Hispaloshop pensando en ellos. Y en ti.
            </p>
            <div className="hero-animate-in-delay-3 flex gap-3 flex-wrap">
              <button
                onClick={() => navigate('/influencer/aplicar')}
                className="h-[46px] px-7 rounded-full bg-stone-950 text-white text-sm font-semibold border-none cursor-pointer"
              >
                Solicitar ser influencer →
              </button>
              <button
                onClick={() => document.querySelector('#como-funciona')?.scrollIntoView({ behavior: 'smooth' })}
                className="h-[46px] px-7 rounded-full bg-transparent text-white text-sm font-semibold border border-white/25 cursor-pointer"
              >
                ¿Cómo funciona?
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ══════ SECCIÓN 2 — PROPÓSITO (crema) ══════ */}
      <Section dark={false}>
        <div className="reveal">
          <p className="uppercase-label mb-4">POR QUÉ IMPORTA</p>
          <h2 className="info-h2 whitespace-pre-line mb-6">
            {'Tu recomendación puede cambiar\nla vida de un productor.'}
          </h2>
          <p className="info-body text-stone-500 max-w-[680px] mb-0">
            Cuando recomiendas un producto de Hispaloshop, no estás
            empujando una marca de un fondo de inversión. Estás
            ayudando a una cooperativa de Úbeda a llegar a más familias.
            A una productora de galletas sin azúcar de Almoster a que
            su negocio sobreviva. A un olivarero de tercera generación
            a competir sin agacharse.
          </p>

          <div className="h-px bg-stone-200 my-8" />

          <h3 className="info-h3 mb-4">Y de paso, cobras por ello.</h3>
          <p className="info-body text-stone-500">
            Una comisión real, por cada venta. No publicidad de dos
            semanas y a olvidarse. Un link permanente que trabaja por
            ti mientras tú duermes.
          </p>
        </div>
      </Section>

      {/* ══════ SECCIÓN 3 — TIERS (negro) ══════ */}
      <Section dark={true}>
        <div className="reveal">
          <p className="info-eyebrow text-stone-500 mb-4">TU PROGRESIÓN</p>
          <h2 className="info-h2 text-white mb-12">
            Cuanto más vendes, más cobras.
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
            {/* Hércules */}
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-8 reveal">
              <span className="inline-block px-2.5 py-1 rounded-full bg-white/[0.08] text-white/50 text-[11px] font-semibold mb-4">
                Tier de entrada
              </span>
              <h3 className="info-h3 text-white mb-3">Hércules</h3>
              <p className="text-[60px] font-bold text-white mb-3 leading-none">3%</p>
              <p className="text-[15px] text-white/65 mb-2 leading-relaxed">
                Para empezar. Sin cuota. Sin riesgo.
              </p>
              <p className="text-[13px] text-white/40 m-0">
                Requisito: 1.000 seguidores
              </p>
            </div>

            {/* Atenea — highlighted */}
            <div className="bg-white/[0.04] border-2 border-stone-950 rounded-2xl p-8 reveal [transition-delay:100ms]">
              <span className="inline-block px-2.5 py-1 rounded-full bg-stone-100 text-stone-950 text-[11px] font-semibold mb-4">
                El más frecuente
              </span>
              <h3 className="info-h3 text-white mb-3">Atenea</h3>
              <p className="text-[60px] font-bold text-white mb-3 leading-none">5%</p>
              <p className="text-[15px] text-white/65 mb-2 leading-relaxed">
                Ya tienes tracción. La plataforma te premia.
              </p>
              <p className="text-[13px] text-white/40 m-0">
                Requisito: 50 ventas en 90 días
              </p>
            </div>

            {/* Zeus */}
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-8 reveal [transition-delay:200ms]">
              <span className="inline-block px-2.5 py-1 rounded-full bg-stone-100 text-stone-950 text-[11px] font-semibold mb-4">
                La élite
              </span>
              <h3 className="info-h3 text-white mb-3">Zeus</h3>
              <p className="text-[60px] font-bold text-white mb-3 leading-none">7%</p>
              <p className="text-[15px] text-white/65 mb-2 leading-relaxed">
                El 7% de una venta de 50€ son 3.50€.
                Con 5 ventas diarias son 630€ al mes.
              </p>
              <p className="text-[13px] text-white/40 m-0">
                Requisito: 200 ventas en 90 días
              </p>
            </div>
          </div>

          <p className="text-center text-sm text-white/50 mt-8">
            Los tiers son automáticos. La plataforma sube tu porcentaje
            sin que tengas que pedir nada.
          </p>

          {/* ── Income calculator ── */}
          <div className="mt-16 reveal">
            <h3 className="info-h3 text-white text-center mb-3">¿Cuánto puedes ganar?</h3>
            <p className="text-center text-[15px] text-white/65 mb-8 max-w-[500px] mx-auto">
              Si recomiendas un aceite de €25 y generas 5 ventas al día...
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { tier: 'Hércules', pct: 3, daily: 3.75, monthly: 112, badge: 'bg-white/[0.08] text-white/50' },
                { tier: 'Atenea', pct: 5, daily: 6.25, monthly: 187, badge: 'bg-stone-100 text-stone-950' },
                { tier: 'Zeus', pct: 7, daily: 8.75, monthly: 262, badge: 'bg-stone-100 text-stone-950' },
              ].map((t, i) => (
                <div
                  key={i}
                  className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 text-center reveal"
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
                  <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold mb-3 ${t.badge}`}>
                    {t.tier} ({t.pct}%)
                  </span>
                  <p className="text-sm text-white/65 mb-1">
                    €25 × {t.pct}% × 5 = €{t.daily.toFixed(2)}/día
                  </p>
                  <p className="text-2xl font-bold text-white">€{t.monthly}/mes</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ══════ SECCIÓN 4 — CÓMO FUNCIONA (crema) ══════ */}
      <Section dark={false}>
        <div className="reveal" id="como-funciona">
          <p className="uppercase-label mb-4">EL PROCESO</p>
          <h2 className="info-h2 mb-12">
            De cero a cobrar en menos de una semana.
          </h2>

          <div className="flex flex-col max-w-[600px]">
            {[
              { num: 1, title: 'Solicita ser influencer', body: 'Rellena el formulario, conecta tus redes, sube tu certificado de residencia fiscal. Te confirmamos en 48h.' },
              { num: 2, title: 'Genera tus links de afiliado', body: 'Elige los productos que te gusten. Genera un link único. Compártelo en tu contenido. Automático.' },
              { num: 3, title: 'Cobra cada mes', body: 'Acumulas comisiones. Solicitas el cobro cuando quieras (mínimo 20€ netos). Recibes la transferencia.' },
            ].map((step, i, arr) => (
              <div key={i} className="flex gap-4 relative">
                {i < arr.length - 1 && (
                  <div className="absolute left-[13px] top-9 bottom-[-8px] w-0.5 bg-stone-200" />
                )}
                <div className="w-7 h-7 rounded-full bg-stone-950 text-white flex items-center justify-center text-[13px] font-bold shrink-0 z-[1]">
                  {step.num}
                </div>
                <div className="pb-8">
                  <p className="text-base font-semibold text-stone-950 mb-1">
                    {step.title}
                  </p>
                  <p className="text-sm text-stone-500 m-0 leading-relaxed">
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* IRPF card */}
          <div className="mt-6 p-8 bg-stone-100 rounded-2xl border border-stone-200 max-w-[600px]">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="text-2xl">📋</span>
              <h4 className="info-h4">Sobre el IRPF</h4>
            </div>
            <p className="info-body text-stone-500 m-0">
              Si resides en España, Hispaloshop retiene el 15% de tus
              comisiones y lo declara a Hacienda en tu nombre. Recibirás
              el certificado de retenciones en enero para tu declaración.
              Si resides fuera de España, sin retención.
            </p>
          </div>
        </div>
      </Section>

      {/* ══════ SECCIÓN 5 — COLLAB (negro) ══════ */}
      <Section dark={true}>
        <div className="reveal">
          <p className="info-eyebrow text-stone-500 mb-4">MÁS QUE AFILIACIÓN</p>
          <h2 className="info-h2 text-white mb-4">
            Los productores vienen a buscarte a ti.
          </h2>
          <p className="text-[15px] text-white/65 max-w-[600px] leading-[1.7] mb-8">
            Con el sistema Collab, los productores pueden enviarte
            propuestas de colaboración directamente desde el chat.
            Comisión especial, muestras enviadas a tu puerta,
            acuerdo formal. Todo en la plataforma. Sin emails.
            Sin contratos en Word. Sin llamadas incómodas.
          </p>

          <div className="flex flex-col gap-4">
            {[
              'Propuesta formal con comisión especial',
              'Muestra enviada con tracking incluido',
              'Acuerdo registrado en la plataforma',
              'Link de afiliado exclusivo para la collab',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <Check size={18} className="text-white/80" strokeWidth={2.5} />
                <span className="text-[15px] text-white/80">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ══════ SECCIÓN 6 — CTA (negro) ══════ */}
      <Section dark={true} className="!py-[100px]">
        <div className="text-center reveal">
          <h2 className="info-h2 text-white mb-4">¿Eres tú?</h2>
          <p className="info-lead text-white/55 max-w-[520px] mx-auto mb-8">
            Mínimo 1.000 seguidores reales en Instagram o TikTok.
            Contenido sobre alimentación, gastronomía, estilo de vida
            saludable o cultura local. Ganas de apoyar algo real.
          </p>
          <button
            onClick={() => navigate('/influencer/aplicar')}
            className="h-14 px-10 rounded-full bg-stone-950 text-white text-base font-semibold border-none cursor-pointer"
          >
            Solicitar unirme como influencer →
          </button>
          <p className="text-sm text-white/35 mt-3">
            Sin tarjeta de crédito. Sin compromiso.
          </p>
        </div>
      </Section>
    </div>
  );
}
