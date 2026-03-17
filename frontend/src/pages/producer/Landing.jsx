import React from 'react';
import { InfoNav, Hero, FeatureGrid, PricingSection, FooterCTA } from '../../components/info/shared';

const FEATURES = [
  { icon: '🫙', title: 'Tu tienda en 5 minutos', desc: 'Sube tus productos, añade tu historia y empieza a vender sin comisión fija. Solo pagas cuando vendes.' },
  { icon: '📲', title: 'Social commerce nativo', desc: 'Publica posts, reels y stories directamente desde el panel. Tus productos aparecen etiquetados en el contenido.' },
  { icon: '🤖', title: 'Hispal AI trabaja por ti', desc: 'El asistente de IA recomienda tus productos a compradores con el perfil exacto. 24 horas al día, sin intervención.' },
  { icon: '📊', title: 'Analítica de verdad', desc: 'Ve qué productos generan más ventas, qué contenido convierte y desde dónde te llegan los compradores.' },
  { icon: '🌍', title: 'Exporta sin intermediarios', desc: 'Con el plan ELITE, el Agente Comercial IA conecta tu producto con importadores de más de 40 países.' },
  { icon: '💳', title: 'Cobros automáticos', desc: 'Stripe gestiona los pagos, las comisiones y las liquidaciones. Tú recibes tu dinero sin papeleo.' },
];

const PLANS = [
  {
    name: 'Free',
    tagline: 'Para empezar a vender',
    price: 0,
    accentColor: '#0A0A0A',
    features: [
      'Hasta 30 productos',
      'Tienda personalizada con historia',
      'Visibilidad nacional en España',
      'Comisión del 20% sobre ventas',
      'Acceso a comunidad de productores',
      'Hispal AI (consumidores)',
    ],
    cta: 'Crear mi tienda',
    ctaHref: '/registro?plan=free',
  },
  {
    name: 'PRO',
    tagline: 'Para crecer en España',
    price: 79,
    accentColor: '#57534e',
    isPopular: true,
    features: [
      'Productos ilimitados',
      'IA de marketing: copy y traducción a 5 idiomas',
      'Precios dinámicos por zona geográfica',
      'Matching con hasta 5 influencers',
      'Analítica avanzada de ventas',
      'Comisión reducida al 18%',
      'Soporte prioritario por email',
      'Asistente IA de ventas B2C',
    ],
    cta: 'Elegir PRO',
    ctaHref: '/registro?plan=pro',
  },
  {
    name: 'ELITE',
    tagline: 'Para exportar al mundo',
    price: 249,
    accentColor: '#0A0A0A',
    isDark: true,
    features: [
      'Todo lo del PRO',
      'Agente Comercial IA internacional',
      'Predicción de demanda por país',
      'Análisis de mercados internacionales',
      'Detección de riesgo de desabastecimiento',
      'Matching con importadores globales',
      'Contratos B2B generados por IA',
      'Análisis de regulaciones y aranceles',
      'Dossieres de exportación en PDF',
      'Soporte telefónico directo',
      'Prioridad absoluta de visibilidad',
    ],
    cta: 'Exportar con ELITE',
    ctaHref: '/registro?plan=elite',
  },
];

export default function ProductorPage() {
  return (
    <div style={{ fontFamily: 'var(--font-sans, -apple-system, BlinkMacSystemFont, sans-serif)' }}>
      <InfoNav activePage="/productor" />

      <Hero
        eyebrow="Para productores artesanos"
        headline="Tu producto merece llegar lejos"
        sub="Vende en España y exporta al mundo con una plataforma que trabaja contigo las 24 horas."
        cta="Crear mi tienda gratis"
        ctaHref="/registro?rol=productor"
      />

      <FeatureGrid features={FEATURES} />

      {/* Stats strip */}
      <section style={{
        background: '#0A0A0A', padding: '40px 24px',
        display: 'flex', justifyContent: 'center', gap: 'clamp(32px, 6vw, 80px)',
        flexWrap: 'wrap',
      }}>
        {[
          { n: '+8.000', label: 'productores activos' },
          { n: '42', label: 'países de exportación' },
          { n: '0€', label: 'para empezar' },
          { n: '24/7', label: 'Hispal AI trabajando' },
        ].map(s => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700,
                         color: '#FFFFFF', letterSpacing: '-0.02em', margin: 0 }}>
              {s.n}
            </p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: '4px 0 0' }}>
              {s.label}
            </p>
          </div>
        ))}
      </section>

      <PricingSection
        title="Un plan para cada momento"
        sub="Empieza gratis. Crece cuando estés listo."
        plans={PLANS}
      />

      {/* Seccion ELITE especial */}
      <section style={{
        background: 'linear-gradient(135deg, #1c1917 0%, #0c0a09 50%, #0A0A0A 100%)',
        padding: 'clamp(56px, 8vw, 96px) 24px',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em',
                     textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)',
                     marginBottom: 16 }}>
          Plan ELITE · Agente Comercial IA
        </p>
        <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 700,
                      color: '#FFFFFF', maxWidth: 580, margin: '0 auto 20px',
                      letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          Un representante comercial que nunca duerme
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)',
                     maxWidth: 480, margin: '0 auto 48px', lineHeight: 1.6 }}>
          El Agente Comercial IA analiza mercados internacionales,
          detecta oportunidades y conecta tu producto con los
          importadores adecuados — en cualquier país.
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12, maxWidth: 800, margin: '0 auto 48px',
        }}>
          {[
            { icon: '🌍', text: 'Análisis de 40+ mercados' },
            { icon: '📈', text: 'Predicción de demanda por país' },
            { icon: '🤝', text: 'Matching con importadores' },
            { icon: '📋', text: 'Contratos B2B en PDF' },
            { icon: '⚠️', text: 'Alertas de desabastecimiento' },
            { icon: '📊', text: 'Análisis de regulaciones' },
          ].map(item => (
            <div key={item.text} style={{
              background: 'rgba(255,255,255,0.06)',
              border: '0.5px solid rgba(255,255,255,0.12)',
              borderRadius: 14, padding: '16px 18px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 22 }}>{item.icon}</span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)',
                              fontWeight: 500 }}>
                {item.text}
              </span>
            </div>
          ))}
        </div>
        <a href="/registro?plan=elite" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '15px 36px', borderRadius: 9999,
          background: '#FFFFFF', color: '#0A0A0A',
          fontSize: 16, fontWeight: 700, textDecoration: 'none',
        }}>
          Empezar con ELITE · 249€/mes →
        </a>
      </section>

      <FooterCTA
        headline="Tu producto artesano tiene mercado global"
        cta="Crear mi tienda gratis"
        ctaHref="/registro?rol=productor"
      />
    </div>
  );
}
