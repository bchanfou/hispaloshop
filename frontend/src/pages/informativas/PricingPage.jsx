import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useScrollReveal } from '../../hooks/useScrollReveal';

const PLANS = [
  {
    name: 'FREE',
    price: '0',
    period: '/mes',
    badge: null,
    border: 'var(--color-border)',
    bg: 'var(--color-white)',
    features: [
      { text: 'Publicar hasta 10 productos', ok: true },
      { text: 'Comisión del 20%', ok: true },
      { text: 'Dashboard básico', ok: true },
      { text: 'Envío gratis', ok: false },
      { text: 'Acceso B2B', ok: false },
      { text: 'Hispal AI', ok: false },
    ],
    cta: 'Empezar gratis',
    ctaBg: 'transparent',
    ctaColor: 'var(--color-black)',
    ctaBorder: '1px solid var(--color-black)',
  },
  {
    name: 'PRO',
    price: '79',
    period: '/mes + IVA',
    badge: 'Más popular',
    border: 'var(--color-black)',
    bg: 'var(--color-white)',
    features: [
      { text: 'Productos ilimitados', ok: true },
      { text: 'Comisión del 18%', ok: true },
      { text: 'Envío gratis desde 30€', ok: true },
      { text: 'Acceso B2B básico', ok: true },
      { text: 'Hispal AI básico', ok: true },
      { text: 'Analytics avanzados', ok: true },
    ],
    cta: 'Empezar con PRO →',
    ctaBg: 'var(--color-black)',
    ctaColor: '#fff',
    ctaBorder: 'none',
  },
  {
    name: 'ELITE',
    price: '249',
    period: '/mes + IVA',
    badge: 'Para escalar',
    border: 'var(--color-black)',
    bg: 'var(--color-surface)',
    features: [
      { text: 'Todo lo de PRO', ok: true },
      { text: 'Comisión del 15%', ok: true },
      { text: 'Envío gratis desde 20€', ok: true },
      { text: 'B2B completo con contratos', ok: true },
      { text: 'Agente Comercial IA', ok: true },
      { text: 'Soporte prioritario', ok: true },
      { text: 'Acceso anticipado a novedades', ok: true },
    ],
    cta: 'Hablar con ventas',
    ctaBg: 'var(--color-black)',
    ctaColor: '#fff',
    ctaBorder: 'none',
  },
];

export default function PricingPage() {
  const navigate = useNavigate();
  usePageTitle();
  useScrollReveal();

  return (
    <div style={{ background: 'var(--color-cream)', minHeight: '100vh', fontFamily: 'var(--font-sans)' }}>
      {/* Hero */}
      <section style={{ paddingTop: 120, textAlign: 'center', padding: '120px 16px 0' }}>
        <p className="info-eyebrow hero-animate-in" style={{ color: 'var(--color-stone)', marginBottom: 16 }}>
          PLANES Y PRECIOS
        </p>
        <h1 className="info-h1 hero-animate-in-delay-1" style={{
          color: 'var(--color-black)',
          maxWidth: 600,
          margin: '0 auto 16px',
          whiteSpace: 'pre-line',
        }}>
          {'Empieza gratis.\nCrece cuando quieras.'}
        </h1>
        <p className="info-lead hero-animate-in-delay-2" style={{
          color: 'var(--color-stone)',
          maxWidth: 500,
          margin: '0 auto',
        }}>
          Sin permanencia. Sin sorpresas. Cancela cuando quieras.
        </p>
      </section>

      {/* Cards */}
      <section style={{ maxWidth: 960, margin: '64px auto 0', padding: '0 16px 80px' }}>
        <div className="pricing-grid">
          <style>{`
            .pricing-grid {
              display: grid;
              grid-template-columns: 1fr;
              gap: 24px;
            }
            @media (min-width: 1024px) {
              .pricing-grid {
                grid-template-columns: repeat(3, 1fr);
              }
            }
          `}</style>

          {PLANS.map((plan, i) => (
            <div
              key={plan.name}
              className="reveal"
              style={{
                transitionDelay: `${i * 100}ms`,
                background: plan.bg,
                border: `1.5px solid ${plan.border}`,
                borderRadius: 'var(--radius-xl)',
                padding: '32px 24px',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {plan.badge && (
                <span style={{
                  position: 'absolute',
                  top: -12,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: plan.name === 'ELITE' ? 'var(--color-black)' : 'var(--color-black)',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '4px 14px',
                  borderRadius: 'var(--radius-full)',
                  whiteSpace: 'nowrap',
                }}>
                  {plan.badge}
                </span>
              )}

              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-stone)', letterSpacing: '0.08em', marginBottom: 16 }}>
                {plan.name}
              </p>

              <div style={{ marginBottom: 24 }}>
                <span style={{ fontSize: 48, fontWeight: 700, color: 'var(--color-black)', lineHeight: 1 }}>
                  {plan.price}€
                </span>
                <span style={{ fontSize: 14, color: 'var(--color-stone)', marginLeft: 4 }}>
                  {plan.period}
                </span>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', flex: 1 }}>
                {plan.features.map((f, j) => (
                  <li key={j} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 0',
                    fontSize: 14,
                    color: f.ok ? 'var(--color-black)' : 'var(--color-stone)',
                    textDecoration: f.ok ? 'none' : 'line-through',
                  }}>
                    {f.ok
                      ? <Check size={16} color="var(--color-black)" strokeWidth={2} />
                      : <X size={16} color="var(--color-stone)" strokeWidth={1.5} />
                    }
                    {f.text}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => plan.name === 'ELITE' ? navigate('/contacto') : navigate('/register')}
                style={{
                  width: '100%',
                  height: 48,
                  borderRadius: 'var(--radius-full)',
                  background: plan.ctaBg,
                  color: plan.ctaColor,
                  border: plan.ctaBorder,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  transition: 'opacity 0.15s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section style={{
        background: '#0A0A0A',
        padding: '64px 16px',
        textAlign: 'center',
      }}>
        <div className="reveal" style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 className="info-h2" style={{ color: '#fff', marginBottom: 16 }}>
            ¿Tienes dudas?
          </h2>
          <button
            onClick={() => navigate('/contacto')}
            style={{
              height: 52,
              padding: '0 36px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-black)',
              color: '#fff',
              fontSize: 15,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Contactar
          </button>
        </div>
      </section>
    </div>
  );
}
