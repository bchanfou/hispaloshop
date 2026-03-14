import React from 'react';
import { InfoNav, Hero, FeatureGrid, FooterCTA } from '../../components/info/shared';

const FEATURES = [
  { icon: '💰', title: 'Comisiones reales', desc: 'Gana entre el 3% y el 7% de cada venta generada con tu enlace de afiliado. Liquidación mensual automática.' },
  { icon: '🏪', title: 'Tu tienda de productos', desc: 'Crea tu selección personalizada de productos favoritos. Tus seguidores compran directamente desde tu perfil.' },
  { icon: '📈', title: 'Analytics completo', desc: 'Ve exactamente qué contenido genera clics, qué convierte en venta y cuánto has ganado en tiempo real.' },
  { icon: '🤝', title: 'Matching con marcas', desc: 'Los productores te encuentran directamente si tu audiencia coincide con su nicho. Sin agencias, sin comisiones.' },
  { icon: '🔗', title: 'Links de afiliado', desc: 'Un link único por producto. Compártelo en bio, historias o reels. El tracking funciona automáticamente.' },
  { icon: '🌱', title: 'Solo productos auténticos', desc: 'Hispaloshop es exclusivamente alimentos artesanales y saludables. Contenido que tu audiencia de salud agradece.' },
];

export default function InfluencerPage() {
  return (
    <div style={{ fontFamily: 'var(--hs-font, -apple-system, BlinkMacSystemFont, sans-serif)' }}>
      <InfoNav activePage="/influencer" />

      <Hero
        eyebrow="Para creadores de contenido"
        headline="Monetiza tu pasión por la alimentación sana"
        sub="Comparte productos que realmente usas y gana una comisión por cada venta. Sin contratos, sin mínimos."
        cta="Unirme como influencer"
        ctaHref="/registro?rol=influencer"
      />

      <FeatureGrid features={FEATURES} />

      {/* Como funciona — 3 pasos */}
      <section style={{
        background: '#FFFFFF',
        padding: 'clamp(56px, 8vw, 96px) 24px',
      }}>
        <h2 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 700,
                      textAlign: 'center', color: '#1D1D1F',
                      letterSpacing: '-0.02em', marginBottom: 56 }}>
          Así de sencillo
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 0, maxWidth: 800, margin: '0 auto',
          position: 'relative',
        }}>
          {[
            { n: '01', title: 'Crea tu perfil', desc: 'Regístrate como influencer, conecta tus redes y elige los productos que encajan con tu estilo de vida.' },
            { n: '02', title: 'Comparte con tu enlace', desc: 'Cada producto tiene tu link único. Publícalo donde quieras: bio, stories, reels o newsletters.' },
            { n: '03', title: 'Cobra cada mes', desc: 'Cada venta generada suma a tu balance. Liquidamos automáticamente el día 1 de cada mes.' },
          ].map((step, i) => (
            <div key={step.n} style={{
              padding: '0 32px 32px',
              borderRight: i < 2 ? '0.5px solid rgba(0,0,0,0.08)' : 'none',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: 56, fontWeight: 800, color: '#F5F5F7',
                           letterSpacing: '-0.04em', lineHeight: 1,
                           marginBottom: 16 }}>
                {step.n}
              </p>
              <p style={{ fontSize: 18, fontWeight: 600, color: '#1D1D1F',
                           marginBottom: 10 }}>
                {step.title}
              </p>
              <p style={{ fontSize: 14, color: '#6E6E73',
                           lineHeight: 1.6, margin: 0 }}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Comisiones */}
      <section style={{
        background: 'var(--hs-bg, #F5F5F7)',
        padding: 'clamp(48px, 7vw, 80px) 24px',
        textAlign: 'center',
      }}>
        <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 700,
                      color: '#1D1D1F', marginBottom: 12,
                      letterSpacing: '-0.02em' }}>
          Comisiones transparentes
        </h2>
        <p style={{ fontSize: 16, color: '#6E6E73', marginBottom: 40 }}>
          Sin letra pequeña. Sin mínimos de ventas.
        </p>
        <div style={{
          display: 'flex', justifyContent: 'center',
          gap: 16, flexWrap: 'wrap',
        }}>
          {[
            { range: 'Hércules', pct: '3%', label: 'de comisión' },
            { range: 'Atenea', pct: '5%', label: 'de comisión' },
            { range: 'Zeus', pct: '7%', label: 'de comisión' },
          ].map(tier => (
            <div key={tier.range} style={{
              background: '#FFFFFF', borderRadius: 18,
              border: '0.5px solid rgba(0,0,0,0.08)',
              padding: '28px 32px', minWidth: 200,
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            }}>
              <p style={{ fontSize: 13, color: '#AEAEB2',
                           marginBottom: 8 }}>{tier.range}</p>
              <p style={{ fontSize: 44, fontWeight: 800, color: '#34C759',
                           letterSpacing: '-0.03em', margin: 0 }}>
                {tier.pct}
              </p>
              <p style={{ fontSize: 13, color: '#6E6E73',
                           margin: '4px 0 0' }}>{tier.label}</p>
            </div>
          ))}
        </div>
      </section>

      <FooterCTA
        headline="Convierte tu contenido en ingresos reales"
        cta="Unirme como influencer"
        ctaHref="/registro?rol=influencer"
      />
    </div>
  );
}
