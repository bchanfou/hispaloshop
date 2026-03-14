import React from 'react';
import { InfoNav, Hero, FeatureGrid, PricingSection, FooterCTA } from '../../components/info/shared';

const FEATURES = [
  { icon: '🔍', title: 'Catálogo verificado', desc: 'Todos los productores están verificados. Certificados de origen, ecológico, halal y otros disponibles para filtrar.' },
  { icon: '💬', title: 'Chat directo B2B', desc: 'Contacta directamente con los productores. Sin intermediarios, sin formularios, respuesta en menos de 24 horas.' },
  { icon: '📜', title: 'Gestión de certificados', desc: 'Centraliza y verifica los certificados de tus proveedores. Alertas automáticas cuando están próximos a vencer.' },
  { icon: '📦', title: 'Pedidos integrados', desc: 'Gestiona órdenes de compra, seguimiento y logística desde un solo panel.' },
  { icon: '🤖', title: 'IA para importadores', desc: 'El plan ELITE incluye alertas de desabastecimiento, análisis de precios y contratos automatizados.' },
  { icon: '🌐', title: 'Acceso a productores ELITE', desc: 'Los productores con plan internacional priorizan a los importadores de la plataforma para sus exportaciones.' },
];

const PLANS = [
  {
    name: 'Básico',
    tagline: 'Para explorar el catálogo',
    price: 0,
    accentColor: '#34C759',
    features: [
      'Acceso al catálogo español',
      'Hasta 5 consultas de precio/mes',
      'Perfil de empresa verificado',
      'Chat limitado (3 conversaciones)',
    ],
    cta: 'Registrarme gratis',
    ctaHref: '/registro?rol=importador&plan=basico',
  },
  {
    name: 'Distribuidor',
    tagline: 'Para distribuidores activos',
    price: 99,
    accentColor: '#FF9500',
    isPopular: true,
    features: [
      'Catálogo completo sin límites',
      'Chat directo con todos los productores',
      'Gestión de certificados completa',
      'Alertas de vencimiento de certificados',
      'Analítica de precios del mercado',
      'Órdenes de compra integradas',
      'Soporte prioritario',
    ],
    cta: 'Elegir Distribuidor',
    ctaHref: '/registro?rol=importador&plan=distribuidor',
  },
  {
    name: 'Global',
    tagline: 'Para importadores internacionales',
    price: 199,
    accentColor: '#5856D6',
    isDark: true,
    features: [
      'Todo lo del Distribuidor',
      'Hispal AI para importadores',
      'Matching automático con productores',
      'Alertas de desabastecimiento',
      'Análisis de precios por origen',
      'Órdenes de compra automatizadas',
      'Contratos B2B generados por IA',
      'Gestor de cuenta dedicado',
      'Acceso a productores plan ELITE',
    ],
    cta: 'Importar con IA',
    ctaHref: '/registro?rol=importador&plan=global',
  },
];

export default function ImportadorPage() {
  return (
    <div style={{ fontFamily: 'var(--hs-font, -apple-system, BlinkMacSystemFont, sans-serif)' }}>
      <InfoNav activePage="/importador" />

      <Hero
        eyebrow="Para importadores y distribuidores"
        headline="El mejor producto español, sin fricciones"
        sub="Conecta directamente con los productores. Verifica certificados, negocia precios y gestiona pedidos en un solo lugar."
        cta="Registrarme como importador"
        ctaHref="/registro?rol=importador"
      />

      <FeatureGrid features={FEATURES} />

      <PricingSection
        title="Elige tu plan"
        sub="Sin permanencia. Cambia de plan cuando quieras."
        plans={PLANS}
      />

      {/* Trust section */}
      <section style={{
        background: 'var(--hs-bg, #F5F5F7)',
        padding: 'clamp(48px, 7vw, 80px) 24px',
        textAlign: 'center',
      }}>
        <h2 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 700,
                      color: '#1D1D1F', marginBottom: 40,
                      letterSpacing: '-0.02em' }}>
          Certificaciones verificadas en la plataforma
        </h2>
        <div style={{
          display: 'flex', flexWrap: 'wrap',
          justifyContent: 'center', gap: 12,
        }}>
          {['🌿 Ecológico EU', '☪️ Halal', '🌱 Vegano', '🌾 Sin gluten',
            '🥛 Sin lactosa', '🇪🇸 DO España', '🏆 IGP/DOP', '♻️ Packaging sostenible'].map(cert => (
            <div key={cert} style={{
              padding: '10px 20px', borderRadius: 9999,
              background: '#FFFFFF', border: '0.5px solid rgba(0,0,0,0.08)',
              fontSize: 14, fontWeight: 500, color: '#1D1D1F',
              boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
            }}>
              {cert}
            </div>
          ))}
        </div>
      </section>

      <FooterCTA
        headline="El producto español te está esperando"
        cta="Acceder al catálogo"
        ctaHref="/registro?rol=importador"
      />
    </div>
  );
}
