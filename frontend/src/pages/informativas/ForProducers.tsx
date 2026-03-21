// @ts-nocheck
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useScrollReveal } from '../../hooks/useScrollReveal';

const Section = ({ dark, children, style = {} }) => (
  <section style={{
    background: dark ? '#0A0A0A' : '#fafaf9',
    padding: '80px 16px',
    fontFamily: 'inherit',
    ...style,
  }}>
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>{children}</div>
  </section>
);

export default function ForProducers() {
  const navigate = useNavigate();
  useScrollReveal();
  usePageTitle();

  return (
    <div>
      {/* ══════ SECCIÓN 1 — HERO ══════ */}
      <section style={{
        minHeight: '100vh',
        background: '#0A0A0A',
        display: 'flex',
        alignItems: 'flex-start',
        paddingTop: 64,
        padding: '120px 16px 80px',
        fontFamily: 'inherit',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
          <div style={{ maxWidth: 820 }}>
            <p className="info-eyebrow hero-animate-in" style={{ color: '#78716c', marginBottom: 16 }}>
              PARA PRODUCTORES ARTESANALES
            </p>

            <h1 className="info-h1 hero-animate-in-delay-1" style={{ color: '#fff', whiteSpace: 'pre-line', marginBottom: 24 }}>
              {'Tienes un producto increíble.\nYa es hora de que\nel país lo sepa.'}
            </h1>

            <p className="info-lead hero-animate-in-delay-2" style={{
              color: 'rgba(255,255,255,0.65)',
              maxWidth: 620,
              marginBottom: 40,
            }}>
              He recorrido España de pueblo en pueblo buscando productores
              como tú. Os he visto trabajar con una dedicación que ninguna
              multinacional puede replicar. El problema nunca fue vuestro
              producto. El problema era que no había una plataforma
              a vuestra medida.
            </p>

            <div className="hero-animate-in-delay-3" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/registro')}
                style={{
                  height: 46, padding: '0 28px',
                  borderRadius: '9999px',
                  background: '#0c0a09',
                  color: '#fff', fontSize: '14px', fontWeight: 600,
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Empezar gratis →
              </button>
              <button
                onClick={() => document.querySelector('#como-funciona')?.scrollIntoView({ behavior: 'smooth' })}
                style={{
                  height: 46, padding: '0 28px',
                  borderRadius: '9999px',
                  background: 'transparent',
                  color: '#fff', fontSize: '14px', fontWeight: 600,
                  border: '1px solid rgba(255,255,255,0.25)',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Ver cómo funciona
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ══════ SECCIÓN 2 — EL PROBLEMA (crema) ══════ */}
      <Section dark={false}>
        <div className="reveal">
          <p className="uppercase-label" style={{ marginBottom: 16 }}>EL PROBLEMA</p>
          <h2 className="info-h2" style={{ whiteSpace: 'pre-line', marginBottom: 16 }}>
            {'Te han cobrado demasiado\ndurante demasiado tiempo.'}
          </h2>
          <p className="info-lead" style={{ color: '#78716c', maxWidth: 600, marginBottom: 48 }}>
            Amazon cobra entre el 15% y el 40%. Las marketplaces
            genéricas no entienden tu producto. Las redes sociales te
            dan visibilidad pero no ventas. Y los importadores te dicen
            que eres demasiado pequeño.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
          }}>
            {[
              { emoji: '💸', title: 'Comisiones abusivas', body: 'Pagar el 30% de cada venta a una plataforma que no conoce tu historia ni tu producto.' },
              { emoji: '👻', title: 'Invisibilidad', body: 'Tu aceite gana premios internacionales y apenas lo conocen fuera de tu provincia.' },
              { emoji: '🔗', title: 'Dependencia', body: 'Si mañana Amazon decide cambiar sus algoritmos, tus ventas desaparecen de un día para otro.' },
            ].map((card, i) => (
              <div key={i} style={{
                background: '#ffffff',
                border: '1px solid #e7e5e4',
                borderRadius: '16px',
                padding: 32,
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                transitionDelay: `${i * 100}ms`,
              }} className="reveal">
                <span style={{ fontSize: 32, display: 'block', marginBottom: 12 }}>{card.emoji}</span>
                <h4 className="info-h4" style={{ marginBottom: 8 }}>{card.title}</h4>
                <p style={{ fontSize: 15, color: '#78716c', margin: 0, lineHeight: 1.6 }}>{card.body}</p>
              </div>
            ))}
          </div>

          <div style={{ height: 1, background: '#e7e5e4', margin: '48px 0' }} />

          <h3 className="info-h3" style={{ marginBottom: 16 }}>En Hispaloshop, tú tienes el control.</h3>
          <p className="info-body" style={{ color: '#78716c', maxWidth: 600 }}>
            Sin exclusividades. Sin letra pequeña. Sin comisiones que
            se coman tu margen. Solo tu producto, tu historia y tus clientes.
          </p>
        </div>
      </Section>

      {/* ══════ SECCIÓN 3 — CÓMO FUNCIONA (negro) ══════ */}
      <Section dark={true}>
        <div className="reveal" id="como-funciona">
          <p className="info-eyebrow" style={{ color: '#78716c', marginBottom: 16 }}>CÓMO FUNCIONA</p>
          <h2 className="info-h2" style={{ color: '#fff', whiteSpace: 'pre-line', marginBottom: 48 }}>
            {'Publicar tu primer producto\ntarda menos de 60 segundos.'}
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 32,
          }}>
            {[
              { num: 1, day: 'Día 1', title: 'Regístrate y verifica tu cuenta', body: 'Sube tu CIF, una foto de tu instalación y tus certificados. La IA lo revisa en minutos.' },
              { num: 2, day: 'Día 1', title: 'Publica tus productos', body: 'Añade fotos, descripción, precio y stock. O graba un reel directo desde tu obrador.' },
              { num: 3, day: 'Cuando llegan pedidos', title: 'Gestiona y envía', body: 'Recibes el pedido, preparas el envío, confirmas el tracking. Todo desde tu móvil.' },
              { num: 4, day: 'Cada 15 días', title: 'Cobras sin condiciones', body: 'Transferencia directa a tu cuenta. Sin esperar 60 días. Sin sorpresas.' },
            ].map((step, i) => (
              <div key={i} style={{ transitionDelay: `${i * 100}ms` }} className="reveal">
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: '#0c0a09',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, fontWeight: 700, color: '#fff',
                  marginBottom: 12,
                }}>
                  {step.num}
                </div>
                <p className="info-eyebrow" style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
                  {step.day}
                </p>
                <h4 className="info-h4" style={{ color: '#fff', marginBottom: 8 }}>{step.title}</h4>
                <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', margin: 0, lineHeight: 1.6 }}>
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ══════ SECCIÓN 4 — PLANES (crema) ══════ */}
      <Section dark={false}>
        <div className="reveal">
          <p className="uppercase-label" style={{ marginBottom: 16 }}>LO QUE CUESTA</p>
          <h2 className="info-h2" style={{ marginBottom: 48 }}>Empieza gratis. Crece cuando quieras.</h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: 16,
          }}>
            {[
              { name: 'Free', price: '0€/mes', desc: '20% comisión' },
              { name: 'Pro', price: '79€/mes', desc: '18% comisión · Envío gratis desde 30€' },
              { name: 'Elite', price: '249€/mes', desc: '15% comisión · Envío gratis desde 20€' },
            ].map((plan, i) => (
              <div key={i} style={{
                background: '#ffffff',
                border: '1px solid #e7e5e4',
                borderRadius: '16px',
                padding: 32,
                textAlign: 'center',
                transitionDelay: `${i * 100}ms`,
              }} className="reveal">
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#0c0a09', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {plan.name}
                </p>
                <p style={{ fontSize: '24px', fontWeight: 700, color: '#0c0a09', margin: '0 0 8px' }}>
                  {plan.price}
                </p>
                <p style={{ fontSize: '14px', color: '#78716c', margin: 0 }}>
                  {plan.desc}
                </p>
              </div>
            ))}
          </div>

          <p className="info-body" style={{ color: '#78716c', marginTop: 24, marginBottom: 12 }}>
            ¿Por qué cobramos comisión? Porque solo ganamos cuando
            tú ganas. Si no vendes, no pagamos nada. Si vendes mucho,
            pagamos menos.
          </p>

          <Link to="/productor" style={{
            fontSize: '14px', fontWeight: 600,
            color: '#0c0a09', textDecoration: 'none',
          }}>
            Ver comparativa completa →
          </Link>
        </div>
      </Section>

      {/* ══════ SECCIÓN 5 — B2B (negro) ══════ */}
      <Section dark={true}>
        <div className="reveal">
          <p className="info-eyebrow" style={{ color: '#78716c', marginBottom: 16 }}>MÁS QUE B2C</p>
          <h2 className="info-h2" style={{ color: '#fff', whiteSpace: 'pre-line', marginBottom: 16 }}>
            {'Vende también a importadores\nde todo el mundo.'}
          </h2>
          <p style={{
            fontSize: 15, color: 'rgba(255,255,255,0.65)',
            maxWidth: 600, lineHeight: 1.7, marginBottom: 32,
          }}>
            He tocado puertas de importadoras en Corea, Japón y China.
            Sé exactamente qué buscan y qué les frena. En Hispaloshop,
            los importadores llegan a ti. Tú pones las condiciones.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              'Ofertas formales con Incoterms integrados',
              'Contratos digitales con firma electrónica',
              'Documentación aduanera generada por IA',
              'Pagos seguros con retención de fondos',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Check size={18} color="rgba(255,255,255,0.8)" strokeWidth={2.5} />
                <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ══════ SECCIÓN 6 — CTA (negro) ══════ */}
      <Section dark={true} style={{ padding: '100px 16px' }}>
        <div style={{ textAlign: 'center' }} className="reveal">
          <h2 className="info-h2" style={{ color: '#fff', marginBottom: 16 }}>
            Tu producto merece llegar más lejos.
          </h2>
          <p className="info-lead" style={{ color: 'rgba(255,255,255,0.55)', maxWidth: 500, margin: '0 auto 32px' }}>
            Únete a más de 1.200 productores que ya venden.
          </p>
          <button
            onClick={() => navigate('/registro')}
            style={{
              height: 56, padding: '0 40px',
              borderRadius: '9999px',
              background: '#0c0a09', color: '#fff',
              fontSize: '16px', fontWeight: 600,
              border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Publicar mis primeros productos →
          </button>
          <div style={{ marginTop: 16 }}>
            <Link to="/contacto" style={{
              fontSize: '14px', color: 'rgba(255,255,255,0.35)', textDecoration: 'none',
            }}>
              Tengo preguntas · Contactar
            </Link>
          </div>
        </div>
      </Section>
    </div>
  );
}
