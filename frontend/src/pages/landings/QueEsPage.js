import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Package, Star, Globe } from 'lucide-react';
import { InfoNav, Hero, FooterCTA, FadeUp } from '../../components/info/shared';

export default function QueEsPage() {
  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <InfoNav activePage="/que-es-hispaloshop" />

      <Hero
        eyebrow="La plataforma de alimentación sana"
        headline="Donde el producto artesano encuentra su comprador"
        sub="Una sola plataforma para descubrir, compartir y comprar alimentos auténticos. Productores, influencers, importadores y consumidores, conectados."
        cta="Explorar Hispaloshop"
        ctaHref="/feed"
      />

      {/* Que es — explicacion en 2 columnas */}
      <section style={{
        background: '#fafaf9',
        padding: 'clamp(56px, 8vw, 96px) 24px',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <FadeUp>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: 32,
            }}>
              <div>
                <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 36px)',
                              fontWeight: 700, color: '#0c0a09',
                              letterSpacing: '-0.02em', marginBottom: 16 }}>
                  Instagram se encontró con Amazon. Nació Hispaloshop.
                </h2>
                <p style={{ fontSize: 16, color: '#78716c', lineHeight: 1.7 }}>
                  Hispaloshop es una plataforma de social commerce especializada
                  en alimentos saludables y artesanales. Los productores publican
                  su historia, sus productos y su proceso. Los consumidores
                  descubren, siguen y compran directamente.
                </p>
              </div>
              <div>
                <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 36px)',
                              fontWeight: 700, color: '#0c0a09',
                              letterSpacing: '-0.02em', marginBottom: 16 }}>
                  Con una IA que conoce lo que comes.
                </h2>
                <p style={{ fontSize: 16, color: '#78716c', lineHeight: 1.7 }}>
                  David AI aprende tus preferencias, alergias y objetivos de
                  salud. Te recomienda productos reales del catálogo, crea recetas
                  y puede añadirlos al carrito por ti. El asistente más personal
                  que ha tenido tu cocina.
                </p>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* Los 4 roles */}
      <section style={{
        background: '#ffffff',
        padding: 'clamp(56px, 8vw, 96px) 24px',
      }}>
        <FadeUp>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 700,
                        textAlign: 'center', color: '#0c0a09',
                        letterSpacing: '-0.02em', marginBottom: 48 }}>
            Una plataforma, cuatro roles
          </h2>
        </FadeUp>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16, maxWidth: 900, margin: '0 auto',
        }}>
          {[
            { icon: <ShoppingCart size={20} className="text-stone-950" />, role: 'Consumidor', desc: 'Descubre productos auténticos, sigue a tus productores favoritos y compra con la ayuda de David AI.', href: '/registro' },
            { icon: <Package size={20} className="text-stone-950" />, role: 'Productor',  desc: 'Vende directamente, construye tu comunidad y exporta al mundo con el Agente Comercial IA.', href: '/productor' },
            { icon: <Star size={20} className="text-stone-950" />, role: 'Influencer', desc: 'Comparte lo que usas, gana comisiones reales y conecta con marcas que encajan con tu audiencia.', href: '/influencer' },
            { icon: <Globe size={20} className="text-stone-950" />, role: 'Importador', desc: 'Accede al catálogo español verificado, gestiona certificados y automatiza las órdenes de compra.', href: '/importador' },
          ].map((r, i) => (
            <FadeUp key={r.role} delay={i * 0.08}>
              <Link to={r.href} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: '#fafaf9',
                  borderRadius: 18, padding: '28px 22px',
                  border: '0.5px solid rgba(0,0,0,0.07)',
                  cursor: 'pointer', height: '100%',
                  transition: 'all 0.25s ease',
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.09)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ marginBottom: 14, display: 'flex' }}>{r.icon}</div>
                  <p style={{ fontSize: 18, fontWeight: 700, color: '#0c0a09',
                               marginBottom: 10 }}>{r.role}</p>
                  <p style={{ fontSize: 13, color: '#78716c',
                               lineHeight: 1.6, margin: 0 }}>{r.desc}</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0c0a09',
                               margin: '14px 0 0' }}>
                    Saber más →
                  </p>
                </div>
              </Link>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* Por que Espana */}
      <section style={{
        background: '#0c0a09',
        padding: 'clamp(56px, 8vw, 96px) 24px',
        textAlign: 'center',
      }}>
        <FadeUp>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em',
                       textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)',
                       marginBottom: 16 }}>
            Por qué España
          </p>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 700,
                        color: '#ffffff', maxWidth: 620, margin: '0 auto 20px',
                        letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            El 4º exportador agroalimentario de Europa
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)',
                       maxWidth: 500, margin: '0 auto 40px', lineHeight: 1.6 }}>
            España exporta más de 74.000 millones de euros en alimentos cada año.
            Hispaloshop es el canal digital que conecta ese producto con el mundo.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center',
                         gap: 'clamp(24px, 5vw, 64px)', flexWrap: 'wrap' }}>
            {[['€74B', 'exportados en 2024'], ['30.000', 'empresas exportadoras'], ['190', 'países destino']].map(([n, l]) => (
              <div key={l}>
                <p style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800,
                             color: '#ffffff', letterSpacing: '-0.03em', margin: 0 }}>{n}</p>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)',
                             margin: '4px 0 0' }}>{l}</p>
              </div>
            ))}
          </div>
        </FadeUp>
      </section>

      <FooterCTA
        headline="El mejor alimento artesano está aquí"
        cta="Empezar gratis"
        ctaHref="/registro"
      />
    </div>
  );
}
