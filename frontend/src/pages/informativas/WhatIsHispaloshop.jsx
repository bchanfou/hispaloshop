import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../../components/brand/Logo';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { useCountUp } from '../../hooks/useCountUp';

/* ── Section wrapper ── */
const Section = ({ dark, children, style = {} }) => (
  <section
    style={{
      background: dark ? '#0A0A0A' : 'var(--color-cream)',
      padding: '80px 16px',
      fontFamily: 'var(--font-sans)',
      ...style,
    }}
    className="info-section"
  >
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {children}
    </div>
  </section>
);

/* ── Logo Atlas fallback ── */
const LogoAtlas = ({ size = 72 }) => (
  <div style={{
    width: size, height: size, margin: '0 auto 24px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
    <Logo variant="icon" theme="dark" size={size} />
  </div>
);

export default function WhatIsHispaloshop() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('consumidor');
  const [showIndicator, setShowIndicator] = useState(true);
  useScrollReveal();
  usePageTitle();

  const { count: producers, ref: ref1 } = useCountUp(1200, 1500);
  const { count: countries, ref: ref2 } = useCountUp(7, 800);
  const { count: users, ref: ref3 } = useCountUp(48000, 2000);
  const { count: gmv, ref: ref4 } = useCountUp(847, 1500);

  React.useEffect(() => {
    const handleScroll = () => setShowIndicator(window.scrollY < 100);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div>
      {/* ══════ SECCIÓN 1 — HERO (negro) ══════ */}
      <section style={{
        minHeight: '100vh',
        background: '#0A0A0A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 64,
        padding: '64px 16px 80px',
        fontFamily: 'var(--font-sans)',
      }}>
        <div style={{ textAlign: 'center', maxWidth: 820, margin: '0 auto' }}>
          <div className="hero-animate-in">
            <LogoAtlas size={72} />
          </div>

          <p className="info-eyebrow hero-animate-in-delay-1" style={{ color: 'var(--color-stone)', marginBottom: 16 }}>
            LA PLATAFORMA DE ALIMENTACIÓN LOCAL
          </p>

          <h1 className="info-h1 hero-animate-in-delay-2" style={{ color: '#fff', maxWidth: 820, margin: '16px auto', whiteSpace: 'pre-line' }}>
            {'Lo que me hubiera\ngustado encontrar\ndesde el principio.'}
          </h1>

          <div className="hero-animate-in-delay-3">
            <p className="info-lead" style={{
              color: 'rgba(255,255,255,0.65)',
              maxWidth: 580,
              margin: '24px auto',
            }}>
              Soy Bil. Emigré a Corea con 22 años, perdí mis ahorros
              intentando conectar productores españoles con el mundo,
              y volví a casa con 200 euros y una idea que no me dejaba
              dormir. Hispaloshop es esa idea.
            </p>

            {/* Green separator */}
            <div style={{
              width: 40, height: 3,
              background: 'var(--color-black)',
              margin: '32px auto',
              borderRadius: 'var(--radius-full)',
            }} />
          </div>

          {/* Scroll indicator */}
          {showIndicator && (
            <div
              className="scroll-indicator"
              onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
              style={{
                fontSize: 24,
                color: '#fff',
                marginTop: 32,
                transition: 'opacity 0.3s ease',
              }}
            >
              ↓
            </div>
          )}
        </div>
      </section>

      {/* ══════ SECCIÓN 2 — LA HISTORIA (crema) ══════ */}
      <Section dark={false}>
        <div className="reveal">
          <p className="uppercase-label" style={{ marginBottom: 16 }}>POR QUÉ EXISTE HISPALOSHOP</p>

          <h2 className="info-h2" style={{ maxWidth: 700, whiteSpace: 'pre-line', marginBottom: 32 }}>
            {'No soy un tecnólogo.\nSoy alguien que lo vivió.'}
          </h2>

          <div style={{ maxWidth: 680 }}>
            <p className="info-body" style={{ color: 'var(--color-black)', marginBottom: 24 }}>
              En Corea conocí a Alberto, un canario con más de 100.000
              seguidores en redes sociales que tenía que aceptar trabajos
              mal pagados para pagar el alquiler. Y a Rebeca, de Zaragoza,
              con 2.000 seguidores y el sueño de vivir de lo que creaba,
              compaginando todo con un trabajo a tiempo parcial. Ambos
              hacían contenido genuino, auténtico. Y el sistema no les
              daba nada a cambio.
            </p>

            <div style={{ height: 1, background: 'var(--color-border)', margin: '32px 0' }} />

            <p className="info-body" style={{ color: 'var(--color-black)', marginBottom: 24 }}>
              Después intenté importar productos de pequeños productores
              españoles a Corea y Japón. Viajé de pueblo en pueblo cargando
              muestras. Visité cooperativas en Úbeda, obradores en Madrid,
              productoras en Almoster. Productos increíbles que nadie fuera
              de España conocía.
            </p>

            <p className="info-body" style={{ color: 'var(--color-black)', marginBottom: 24 }}>
              Los importadores decían siempre lo mismo: demasiado pequeños,
              sin tiempo, precios altos, formatos no adaptados. Así que
              decidí hacerlo yo mismo. Importé un contenedor de palomitas
              orgánicas, monté una tienda en Shopify, busqué influencers
              en eventos... y perdí más de 15.000 euros.
            </p>

            {/* Pull quote */}
            <div style={{
              padding: 32,
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--color-border)',
              margin: '40px 0',
            }}>
              <p className="info-lead" style={{
                fontStyle: 'italic',
                color: 'var(--color-black)',
                margin: 0,
              }}>
                "Volví a España con 200 euros prestados por mi hermano
                y una pregunta que no podía quitarme de la cabeza:
                ¿y si existiera una plataforma que conectara todo esto?"
              </p>
            </div>

            <p className="info-body" style={{ color: 'var(--color-black)', marginBottom: 24 }}>
              Hispaloshop es la respuesta a esa pregunta. Es la plataforma
              que me hubiera gustado tener cuando era influencer, cuando
              ayudaba a productores a exportar, cuando importé por primera
              vez sin tener ni idea, cuando buscaba creadores de contenido
              para promocionar mis productos y cuando quería vender
              directamente al consumidor final.
            </p>

            <p className="info-body" style={{ fontWeight: 600, color: 'var(--color-black)' }}>
              Pedí otro préstamo para construirla. Porque antes que muera
              este sueño, que se muera mi cuerpo en el intento.
            </p>
          </div>
        </div>
      </Section>

      {/* ══════ SECCIÓN 3 — QUÉ ES (negro) ══════ */}
      <Section dark={true}>
        <div className="reveal">
          <p className="info-eyebrow" style={{ color: 'var(--color-stone)', marginBottom: 16 }}>LA PLATAFORMA</p>

          <h2 className="info-h2" style={{ color: '#fff', whiteSpace: 'pre-line', marginBottom: 16 }}>
            {'El Instagram de los productores\nartesanales de tu país.'}
          </h2>

          <p className="info-lead" style={{
            color: 'rgba(255,255,255,0.65)',
            maxWidth: 600,
            marginBottom: 48,
          }}>
            Una sola plataforma para descubrir, comprar, vender, colaborar
            e importar alimentación artesanal local. Sin intermediarios.
            Sin comisiones abusivas. Con orgullo.
          </p>

          {/* 3-card grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
          }}>
            {[
              {
                emoji: '🛒',
                title: 'Compra directa',
                body: 'Consume de productores de tu región. Sabes quién lo hace, cómo lo hace y dónde está su finca. Sin middlemen.',
              },
              {
                emoji: '📱',
                title: 'Social commerce nativo',
                body: 'Reels, stories, recetas. El contenido y la compra en el mismo lugar. Como Instagram, pero cada producto que ves se puede comprar.',
              },
              {
                emoji: '🌍',
                title: 'Local en cada país',
                body: 'En España somos la plataforma española. En Francia, la francesa. En Corea, la coreana. El orgullo local no entiende de fronteras.',
              },
            ].map((card, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 'var(--radius-xl)',
                padding: 32,
                transitionDelay: `${i * 100}ms`,
              }} className="reveal">
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'var(--color-black)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, marginBottom: 16,
                }}>
                  {card.emoji}
                </div>
                <h4 className="info-h4" style={{ color: '#fff', marginBottom: 8 }}>{card.title}</h4>
                <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', margin: 0, lineHeight: 1.6 }}>
                  {card.body}
                </p>
              </div>
            ))}
          </div>

          {/* Stats grid */}
          <div className="reveal-scale stats-grid" style={{
            display: 'grid',
            marginTop: 64,
            textAlign: 'center',
          }}>
            <style>{`
              .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 24px; }
              @media (min-width: 768px) {
                .stats-grid { grid-template-columns: repeat(4, 1fr); gap: 0; }
              }
            `}</style>
            <div ref={ref1} style={{ padding: '16px 0', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
              <p className="info-h1" style={{ color: '#fff', marginBottom: 8, fontSize: 'var(--text-3xl)' }}>
                {producers.toLocaleString()}+
              </p>
              <p className="uppercase-label" style={{ color: 'rgba(255,255,255,0.4)', margin: 0 }}>Productores</p>
            </div>
            <div ref={ref2} style={{ padding: '16px 0', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
              <p className="info-h1" style={{ color: '#fff', marginBottom: 8, fontSize: 'var(--text-3xl)' }}>
                {countries}
              </p>
              <p className="uppercase-label" style={{ color: 'rgba(255,255,255,0.4)', margin: 0 }}>Países</p>
            </div>
            <div ref={ref3} style={{ padding: '16px 0', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
              <p className="info-h1" style={{ color: '#fff', marginBottom: 8, fontSize: 'var(--text-3xl)' }}>
                {users.toLocaleString()}+
              </p>
              <p className="uppercase-label" style={{ color: 'rgba(255,255,255,0.4)', margin: 0 }}>Usuarios</p>
            </div>
            <div ref={ref4} style={{ padding: '16px 0' }}>
              <p className="info-h1" style={{ color: '#fff', marginBottom: 8, fontSize: 'var(--text-3xl)' }}>
                {gmv}k€
              </p>
              <p className="uppercase-label" style={{ color: 'rgba(255,255,255,0.4)', margin: 0 }}>GMV este mes</p>
            </div>
          </div>
        </div>
      </Section>

      {/* ══════ SECCIÓN 4 — CÓMO FUNCIONA (crema) ══════ */}
      <Section dark={false}>
        <div className="reveal">
          <p className="uppercase-label" style={{ marginBottom: 16 }}>PARA CADA ROL</p>
          <h2 className="info-h2" style={{ marginBottom: 12 }}>Uno para todos. Todos para uno.</h2>
          <p className="info-lead" style={{ color: 'var(--color-stone)', maxWidth: 560, marginBottom: 40 }}>
            Somos productores, influencers, importadores y consumidores.
            Cada uno tiene su lugar.
          </p>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 40 }}>
            {['consumidor', 'productor', 'influencer', 'importador'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '8px 20px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'var(--transition-fast)',
                  fontFamily: 'var(--font-sans)',
                  border: activeTab === tab ? 'none' : '1px solid var(--color-border)',
                  background: activeTab === tab ? 'var(--color-black)' : 'var(--color-white)',
                  color: activeTab === tab ? '#fff' : 'var(--color-stone)',
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: 40,
            alignItems: 'center',
          }} className="tab-content-grid">
            <style>{`
              @media (min-width: 768px) {
                .tab-content-grid { grid-template-columns: 1fr 240px !important; }
              }
            `}</style>

            <div key={activeTab} className="tab-content">
              <TabSteps tab={activeTab} />
            </div>

            {/* Phone mockup */}
            <div style={{
              width: 200, height: 260,
              background: 'var(--color-black)',
              borderRadius: 24,
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-xl)',
            }}>
              <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 14, fontFamily: 'var(--font-sans)' }}>
                {activeTab === 'consumidor' ? '🛒' :
                 activeTab === 'productor' ? '🏭' :
                 activeTab === 'influencer' ? '📱' : '🌍'}
              </span>
            </div>
          </div>
        </div>
      </Section>

      {/* ══════ SECCIÓN 5 — PRUEBA SOCIAL (negro) ══════ */}
      <Section dark={true}>
        <div className="reveal">
          <p className="info-eyebrow" style={{ color: 'var(--color-stone)', marginBottom: 16 }}>LO QUE DICEN</p>
          <h2 className="info-h2" style={{ color: '#fff', marginBottom: 48 }}>
            Productores que ya confían en nosotros.
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
          }}>
            {[
              {
                quote: 'Por fin una plataforma que entiende lo que es ser pequeño. En dos semanas recibí más pedidos que en todo el mes anterior.',
                name: 'Cooperativa La Carrera',
                location: 'Úbeda, Jaén',
              },
              {
                quote: 'Llevo años recomendando productos que me apasionan. Por primera vez cobro por ello de verdad.',
                name: '@foodie_bcn',
                location: '42.000 seguidores',
              },
              {
                quote: 'Descubrí un productor de miel a 30 kilómetros de mi casa que lleva 40 años produciendo. Ahora soy cliente fijo.',
                name: 'María G.',
                location: 'Madrid',
              },
            ].map((item, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 'var(--radius-xl)',
                padding: 32,
                transitionDelay: `${i * 100}ms`,
              }} className="reveal">
                <span style={{ fontSize: 48, lineHeight: 1, color: 'rgba(255,255,255,0.15)', display: 'block', marginBottom: 12 }}>"</span>
                <p style={{
                  fontSize: 'var(--text-md)',
                  fontStyle: 'italic',
                  color: 'rgba(255,255,255,0.85)',
                  lineHeight: 1.6,
                  margin: '0 0 24px',
                }}>
                  {item.quote}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, color: 'rgba(255,255,255,0.4)',
                  }}>
                    {item.name.charAt(0)}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#fff' }}>{item.name}</p>
                    <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{item.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* App download buttons */}
          <div style={{ textAlign: 'center', marginTop: 64 }} className="reveal">
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 12 }}>
              <AppStoreButton store="App Store" icon="🍎" />
              <AppStoreButton store="Google Play" icon="▶" />
            </div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
              Disponible próximamente en iOS y Android
            </p>
          </div>
        </div>
      </Section>

      {/* ══════ SECCIÓN 6 — CTA FINAL (negro) ══════ */}
      <Section dark={true} style={{ padding: '100px 16px' }}>
        <div style={{ textAlign: 'center' }} className="reveal">
          <LogoAtlas size={56} />

          <h2 className="info-h2" style={{ color: '#fff', whiteSpace: 'pre-line', marginBottom: 16 }}>
            {'Empieza hoy.\nEs gratis.'}
          </h2>

          <p className="info-lead" style={{
            color: 'rgba(255,255,255,0.55)',
            maxWidth: 500,
            margin: '0 auto 32px',
          }}>
            Únete a los productores de tu país que ya venden
            en Hispaloshop.
          </p>

          <button
            onClick={() => navigate('/register')}
            style={{
              height: 56,
              padding: '0 40px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-black)',
              color: '#fff',
              fontSize: 'var(--text-md)',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              transition: 'background var(--transition-fast)',
            }}
          >
            Crear cuenta gratuita →
          </button>

          <div style={{ marginTop: 16 }}>
            <Link to="/login" style={{
              fontSize: 'var(--text-sm)',
              color: 'rgba(255,255,255,0.35)',
              textDecoration: 'none',
            }}>
              Ya tengo cuenta · Entrar
            </Link>
          </div>
        </div>
      </Section>
    </div>
  );
}

/* ── Tab steps content ── */
const TAB_STEPS = {
  consumidor: [
    { num: 1, title: 'Descubre', body: 'Explora productores de tu región por categoría, proximidad o recomendación.' },
    { num: 2, title: 'Compra', body: 'Añade al carrito, paga con tarjeta o Bizum. Envío directo del productor.' },
    { num: 3, title: 'Recibe', body: 'Recibe en casa productos frescos y artesanales con trazabilidad completa.' },
  ],
  productor: [
    { num: 1, title: 'Verifica', body: 'Sube tu CIF, fotos de tu instalación y certificados. La IA lo valida en minutos.' },
    { num: 2, title: 'Publica', body: 'Añade tus productos con fotos, precio y stock. O graba un reel desde tu obrador.' },
    { num: 3, title: 'Gestiona', body: 'Recibe pedidos, gestiona envíos y cobra cada 15 días en tu cuenta.' },
  ],
  influencer: [
    { num: 1, title: 'Solicita', body: 'Rellena el formulario, conecta tus redes. Te confirmamos en 48 horas.' },
    { num: 2, title: 'Genera links', body: 'Elige productos, genera un link de afiliado único y compártelo en tu contenido.' },
    { num: 3, title: 'Cobra', body: 'Acumulas comisiones por cada venta. Solicita el cobro cuando quieras.' },
  ],
  importador: [
    { num: 1, title: 'Explora', body: 'Accede al catálogo B2B con filtros por categoría, certificación y país de origen.' },
    { num: 2, title: 'Negocia', body: 'Contacta directamente con el productor. Negocia precios, volúmenes e Incoterms.' },
    { num: 3, title: 'Recibe', body: 'Firma el contrato digital, paga con seguridad y recibe la mercancía con tracking.' },
  ],
};

function TabSteps({ tab }) {
  const steps = TAB_STEPS[tab] || [];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {steps.map((step, i) => (
        <div key={step.num} style={{ display: 'flex', gap: 16, position: 'relative' }}>
          {/* Connector line */}
          {i < steps.length - 1 && (
            <div style={{
              position: 'absolute',
              left: 13,
              top: 36,
              bottom: -8,
              width: 2,
              background: 'var(--color-border)',
            }} />
          )}
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'var(--color-black)',
            color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, flexShrink: 0,
            zIndex: 1,
          }}>
            {step.num}
          </div>
          <div style={{ paddingBottom: 32 }}>
            <p style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--color-black)', margin: '0 0 4px' }}>
              {step.title}
            </p>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-stone)', margin: 0, lineHeight: 1.6 }}>
              {step.body}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── App store button ── */
function AppStoreButton({ store, icon }) {
  return (
    <div style={{
      width: 140, height: 40,
      borderRadius: 'var(--radius-md)',
      border: '0.5px solid rgba(255,255,255,0.15)',
      background: '#0A0A0A',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      cursor: 'pointer',
    }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ fontSize: 12, color: '#fff', fontWeight: 500 }}>{store}</span>
    </div>
  );
}
