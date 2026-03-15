import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';

function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add('visible');
      }),
      { threshold: 0.1 }
    );
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

const Section = ({ dark, children, style = {} }) => (
  <section style={{
    background: dark ? '#0A0A0A' : 'var(--color-cream)',
    padding: '80px 16px',
    fontFamily: 'var(--font-sans)',
    ...style,
  }}>
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>{children}</div>
  </section>
);

export default function ForInfluencers() {
  const navigate = useNavigate();
  useScrollReveal();

  return (
    <div>
      {/* ══════ SECCIÓN 1 — HERO (negro) ══════ */}
      <section style={{
        minHeight: '100vh',
        background: '#0A0A0A',
        display: 'flex',
        alignItems: 'flex-start',
        padding: '120px 16px 80px',
        fontFamily: 'var(--font-sans)',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
          <div style={{ maxWidth: 820 }}>
            <p className="info-eyebrow" style={{ color: 'var(--color-stone)', marginBottom: 16 }}>
              PARA CREADORES DE CONTENIDO
            </p>
            <h1 className="info-h1" style={{ color: '#fff', whiteSpace: 'pre-line', marginBottom: 24 }}>
              {'No vendes productos.\nApoyas a productores\nreales de tu país.'}
            </h1>
            <p className="info-lead" style={{ color: 'rgba(255,255,255,0.65)', maxWidth: 580, marginBottom: 40 }}>
              En Corea conocí a creadores con decenas de miles de
              seguidores que tenían que aceptar trabajos mal pagados
              para sobrevivir. Rebeca, de Zaragoza, con 2.000 seguidores
              y el sueño de vivir de lo que creaba. Alberto, canario,
              con 100.000 seguidores y sin poder pagar el alquiler.
              Diseñé Hispaloshop pensando en ellos. Y en ti.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button onClick={() => navigate('/influencer/aplicar')} style={{
                height: 46, padding: '0 28px', borderRadius: 'var(--radius-full)',
                background: 'var(--color-green)', color: '#fff',
                fontSize: 'var(--text-sm)', fontWeight: 600,
                border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)',
              }}>
                Solicitar ser influencer →
              </button>
              <button onClick={() => document.querySelector('#como-funciona')?.scrollIntoView({ behavior: 'smooth' })} style={{
                height: 46, padding: '0 28px', borderRadius: 'var(--radius-full)',
                background: 'transparent', color: '#fff',
                fontSize: 'var(--text-sm)', fontWeight: 600,
                border: '1px solid rgba(255,255,255,0.25)',
                cursor: 'pointer', fontFamily: 'var(--font-sans)',
              }}>
                ¿Cómo funciona?
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ══════ SECCIÓN 2 — PROPÓSITO (crema) ══════ */}
      <Section dark={false}>
        <div className="reveal">
          <p className="uppercase-label" style={{ marginBottom: 16 }}>POR QUÉ IMPORTA</p>
          <h2 className="info-h2" style={{ whiteSpace: 'pre-line', marginBottom: 24 }}>
            {'Tu recomendación puede cambiar\nla vida de un productor.'}
          </h2>
          <p className="info-body" style={{ color: 'var(--color-stone)', maxWidth: 680, marginBottom: 0 }}>
            Cuando recomiendas un producto de Hispaloshop, no estás
            empujando una marca de un fondo de inversión. Estás
            ayudando a una cooperativa de Úbeda a llegar a más familias.
            A una productora de galletas sin azúcar de Almoster a que
            su negocio sobreviva. A un olivarero de tercera generación
            a competir sin agacharse.
          </p>

          <div style={{ height: 1, background: 'var(--color-border)', margin: '32px 0' }} />

          <h3 className="info-h3" style={{ marginBottom: 16 }}>Y de paso, cobras por ello.</h3>
          <p className="info-body" style={{ color: 'var(--color-stone)' }}>
            Una comisión real, por cada venta. No publicidad de dos
            semanas y a olvidarse. Un link permanente que trabaja por
            ti mientras tú duermes.
          </p>
        </div>
      </Section>

      {/* ══════ SECCIÓN 3 — TIERS (negro) ══════ */}
      <Section dark={true}>
        <div className="reveal">
          <p className="info-eyebrow" style={{ color: 'var(--color-stone)', marginBottom: 16 }}>TU PROGRESIÓN</p>
          <h2 className="info-h2" style={{ color: '#fff', marginBottom: 48 }}>
            Cuanto más vendes, más cobras.
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
          }}>
            {/* Hércules */}
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 'var(--radius-xl)',
              padding: 32,
            }} className="reveal">
              <span style={{
                display: 'inline-block', padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.5)',
                fontSize: 11, fontWeight: 600, marginBottom: 16,
              }}>Tier de entrada</span>
              <h3 className="info-h3" style={{ color: '#fff', marginBottom: 12 }}>Hércules</h3>
              <p style={{ fontSize: 60, fontWeight: 700, color: 'var(--color-green)', margin: '0 0 12px', lineHeight: 1 }}>3%</p>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', margin: '0 0 8px', lineHeight: 1.6 }}>
                Para empezar. Sin cuota. Sin riesgo.
              </p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                Requisito: 1.000 seguidores
              </p>
            </div>

            {/* Atenea — highlighted */}
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              border: '2px solid var(--color-green)',
              borderRadius: 'var(--radius-xl)',
              padding: 32,
              transitionDelay: '100ms',
            }} className="reveal">
              <span style={{
                display: 'inline-block', padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--color-green-light)',
                color: 'var(--color-green)',
                fontSize: 11, fontWeight: 600, marginBottom: 16,
              }}>El más frecuente</span>
              <h3 className="info-h3" style={{ color: '#fff', marginBottom: 12 }}>Atenea</h3>
              <p style={{ fontSize: 60, fontWeight: 700, color: 'var(--color-green)', margin: '0 0 12px', lineHeight: 1 }}>5%</p>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', margin: '0 0 8px', lineHeight: 1.6 }}>
                Ya tienes tracción. La plataforma te premia.
              </p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                Requisito: 50 ventas en 90 días
              </p>
            </div>

            {/* Zeus */}
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 'var(--radius-xl)',
              padding: 32,
              transitionDelay: '200ms',
            }} className="reveal">
              <span style={{
                display: 'inline-block', padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--color-amber-light)',
                color: 'var(--color-amber-dark)',
                fontSize: 11, fontWeight: 600, marginBottom: 16,
              }}>La élite</span>
              <h3 className="info-h3" style={{ color: '#fff', marginBottom: 12 }}>Zeus</h3>
              <p style={{ fontSize: 60, fontWeight: 700, color: 'var(--color-green)', margin: '0 0 12px', lineHeight: 1 }}>7%</p>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', margin: '0 0 8px', lineHeight: 1.6 }}>
                El 7% de una venta de 50€ son 3.50€.
                Con 5 ventas diarias son 630€ al mes.
              </p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                Requisito: 200 ventas en 90 días
              </p>
            </div>
          </div>

          <p style={{
            textAlign: 'center',
            fontSize: 'var(--text-sm)',
            color: 'rgba(255,255,255,0.5)',
            marginTop: 32,
          }}>
            Los tiers son automáticos. La plataforma sube tu porcentaje
            sin que tengas que pedir nada.
          </p>
        </div>
      </Section>

      {/* ══════ SECCIÓN 4 — CÓMO FUNCIONA (crema) ══════ */}
      <Section dark={false}>
        <div className="reveal" id="como-funciona">
          <p className="uppercase-label" style={{ marginBottom: 16 }}>EL PROCESO</p>
          <h2 className="info-h2" style={{ marginBottom: 48 }}>
            De cero a cobrar en menos de una semana.
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxWidth: 600 }}>
            {[
              { num: 1, title: 'Solicita ser influencer', body: 'Rellena el formulario, conecta tus redes, sube tu certificado de residencia fiscal. Te confirmamos en 48h.' },
              { num: 2, title: 'Genera tus links de afiliado', body: 'Elige los productos que te gusten. Genera un link único. Compártelo en tu contenido. Automático.' },
              { num: 3, title: 'Cobra cada mes', body: 'Acumulas comisiones. Solicitas el cobro cuando quieras (mínimo 20€ netos). Recibes la transferencia.' },
            ].map((step, i, arr) => (
              <div key={i} style={{ display: 'flex', gap: 16, position: 'relative' }}>
                {i < arr.length - 1 && (
                  <div style={{
                    position: 'absolute', left: 13, top: 36, bottom: -8,
                    width: 2, background: 'var(--color-border)',
                  }} />
                )}
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'var(--color-black)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, flexShrink: 0, zIndex: 1,
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

          {/* IRPF card */}
          <div style={{
            marginTop: 24,
            padding: 32,
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--color-border)',
            maxWidth: 600,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 24 }}>📋</span>
              <h4 className="info-h4">Sobre el IRPF</h4>
            </div>
            <p className="info-body" style={{ color: 'var(--color-stone)', margin: 0 }}>
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
          <p className="info-eyebrow" style={{ color: 'var(--color-stone)', marginBottom: 16 }}>MÁS QUE AFILIACIÓN</p>
          <h2 className="info-h2" style={{ color: '#fff', marginBottom: 16 }}>
            Los productores vienen a buscarte a ti.
          </h2>
          <p style={{
            fontSize: 15, color: 'rgba(255,255,255,0.65)',
            maxWidth: 600, lineHeight: 1.7, marginBottom: 32,
          }}>
            Con el sistema Collab, los productores pueden enviarte
            propuestas de colaboración directamente desde el chat.
            Comisión especial, muestras enviadas a tu puerta,
            acuerdo formal. Todo en la plataforma. Sin emails.
            Sin contratos en Word. Sin llamadas incómodas.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              'Propuesta formal con comisión especial',
              'Muestra enviada con tracking incluido',
              'Acuerdo registrado en la plataforma',
              'Link de afiliado exclusivo para la collab',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Check size={18} color="var(--color-green)" strokeWidth={2.5} />
                <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ══════ SECCIÓN 6 — CTA (negro) ══════ */}
      <Section dark={true} style={{ padding: '100px 16px' }}>
        <div style={{ textAlign: 'center' }} className="reveal">
          <h2 className="info-h2" style={{ color: '#fff', marginBottom: 16 }}>¿Eres tú?</h2>
          <p className="info-lead" style={{
            color: 'rgba(255,255,255,0.55)',
            maxWidth: 520,
            margin: '0 auto 32px',
          }}>
            Mínimo 1.000 seguidores reales en Instagram o TikTok.
            Contenido sobre alimentación, gastronomía, estilo de vida
            saludable o cultura local. Ganas de apoyar algo real.
          </p>
          <button
            onClick={() => navigate('/influencer/aplicar')}
            style={{
              height: 56, padding: '0 40px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-green)', color: '#fff',
              fontSize: 'var(--text-md)', fontWeight: 600,
              border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}
          >
            Solicitar unirme como influencer →
          </button>
          <p style={{
            fontSize: 'var(--text-sm)',
            color: 'rgba(255,255,255,0.35)',
            marginTop: 12,
          }}>
            Sin cuota mensual · Cobras cuando vendes
          </p>
        </div>
      </Section>
    </div>
  );
}
