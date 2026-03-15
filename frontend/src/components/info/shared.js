import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

// -- Animacion de entrada al scroll --
export const FadeUp = ({ children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-60px' }}
    transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1], delay }}
  >
    {children}
  </motion.div>
);

// -- Seccion hero --
export const Hero = ({ eyebrow, headline, sub, cta, ctaHref, ctaColor = '#0A0A0A', visual }) => (
  <section style={{
    background: '#FFFFFF',
    padding: 'clamp(72px, 10vw, 120px) 24px clamp(56px, 8vw, 96px)',
    textAlign: 'center',
    overflow: 'hidden',
  }}>
    <FadeUp>
      {eyebrow && (
        <p style={{
          fontSize: 13, fontWeight: 600, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: '#6E6E73',
          marginBottom: 16,
        }}>
          {eyebrow}
        </p>
      )}
      <h1 style={{
        fontSize: 'clamp(34px, 6vw, 64px)',
        fontWeight: 700, lineHeight: 1.05,
        letterSpacing: '-0.02em',
        color: '#1D1D1F',
        maxWidth: 720, margin: '0 auto 20px',
      }}>
        {headline}
      </h1>
      <p style={{
        fontSize: 'clamp(16px, 2vw, 20px)',
        color: '#6E6E73', lineHeight: 1.6,
        maxWidth: 520, margin: '0 auto 40px',
      }}>
        {sub}
      </p>
      <a href={ctaHref || '/registro'} style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '15px 32px',
        borderRadius: 9999,
        background: ctaColor,
        color: ctaColor === '#FFFFFF' ? '#0A0A0A' : '#FFFFFF',
        fontSize: 16, fontWeight: 600,
        textDecoration: 'none',
        boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
        transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
      }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.18)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.12)'; }}
      >
        {cta} →
      </a>
    </FadeUp>
    {visual && (
      <FadeUp delay={0.15}>
        <div style={{ marginTop: 56 }}>{visual}</div>
      </FadeUp>
    )}
  </section>
);

// -- Grid de features --
export const FeatureGrid = ({ features }) => (
  <section style={{
    background: 'var(--color-cream, #F5F5F7)',
    padding: 'clamp(56px, 8vw, 96px) 24px',
  }}>
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
      gap: 16, maxWidth: 1080, margin: '0 auto',
    }}>
      {features.map((f, i) => (
        <FadeUp key={f.title} delay={i * 0.07}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 18,
            border: '0.5px solid rgba(0,0,0,0.07)',
            padding: '28px 24px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            height: '100%',
          }}>
            <div style={{ fontSize: 36, marginBottom: 14 }}>{f.icon}</div>
            <p style={{ fontSize: 17, fontWeight: 600,
                         color: '#1D1D1F', marginBottom: 8 }}>
              {f.title}
            </p>
            <p style={{ fontSize: 14, color: '#6E6E73',
                         lineHeight: 1.6, margin: 0 }}>
              {f.desc}
            </p>
          </div>
        </FadeUp>
      ))}
    </div>
  </section>
);

// -- Pricing card --
export const PricingCard = ({
  name, tagline, price, period = '/mes', features,
  cta, ctaHref, accentColor, isPopular, isDark,
}) => (
  <FadeUp>
    <div style={{
      background:    isDark ? '#0A0A0A' : '#FFFFFF',
      borderRadius:  22,
      border:        isPopular
        ? `2px solid ${accentColor}`
        : `0.5px solid rgba(0,0,0,${isDark ? 0.0 : 0.08})`,
      padding:       '32px 28px',
      position:      'relative',
      boxShadow:     isPopular
        ? `0 8px 40px ${accentColor}28`
        : '0 2px 16px rgba(0,0,0,0.07)',
      transform:     isPopular ? 'scale(1.03)' : 'scale(1)',
      transition:    'transform 0.3s ease, box-shadow 0.3s ease',
      height:        '100%',
      display:       'flex',
      flexDirection: 'column',
    }}>
      {isPopular && (
        <div style={{
          position: 'absolute', top: -14, left: '50%',
          transform: 'translateX(-50%)',
          background: accentColor, color: '#FFFFFF',
          fontSize: 11, fontWeight: 700,
          padding: '5px 16px', borderRadius: 9999,
          letterSpacing: '0.06em', textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}>
          Más popular
        </div>
      )}

      {/* Plan name */}
      <p style={{
        fontSize: 12, fontWeight: 700, letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: isDark ? 'rgba(255,255,255,0.5)' : '#AEAEB2',
        marginBottom: 6,
      }}>
        {name}
      </p>
      <p style={{
        fontSize: 15, color: isDark ? 'rgba(255,255,255,0.8)' : '#6E6E73',
        marginBottom: 20, lineHeight: 1.4,
      }}>
        {tagline}
      </p>

      {/* Precio */}
      <div style={{ marginBottom: 24 }}>
        <span style={{
          fontSize: 48, fontWeight: 700, lineHeight: 1,
          color: isDark ? '#FFFFFF' : '#1D1D1F',
          letterSpacing: '-0.03em',
        }}>
          {price === 0 ? 'Gratis' : `${price}€`}
        </span>
        {price > 0 && (
          <span style={{
            fontSize: 14, color: isDark ? 'rgba(255,255,255,0.5)' : '#AEAEB2',
            marginLeft: 4,
          }}>
            + IVA{period}
          </span>
        )}
      </div>

      {/* Features */}
      <ul style={{ listStyle: 'none', padding: 0,
                   flex: 1, marginBottom: 24 }}>
        {features.map((f) => (
          <li key={f} style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '7px 0',
            borderBottom: `0.5px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'}`,
            fontSize: 14,
            color: isDark ? 'rgba(255,255,255,0.85)' : '#1D1D1F',
            lineHeight: 1.45,
          }}>
            <Check size={15}
              color={accentColor}
              style={{ flexShrink: 0, marginTop: 2 }} />
            {f}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <a href={ctaHref || '/registro'}
        style={{
          display: 'block', textAlign: 'center',
          padding: '14px 24px', borderRadius: 9999,
          background: isDark ? '#FFFFFF' : accentColor,
          color: isDark ? '#0A0A0A' : '#FFFFFF',
          fontSize: 15, fontWeight: 600,
          textDecoration: 'none',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
      >
        {cta}
      </a>
    </div>
  </FadeUp>
);

// -- Seccion de pricing (3 cards) --
export const PricingSection = ({ title, sub, plans }) => (
  <section style={{
    background: '#FFFFFF',
    padding: 'clamp(56px, 8vw, 96px) 24px',
  }}>
    <FadeUp>
      <h2 style={{
        fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700,
        textAlign: 'center', color: '#1D1D1F',
        letterSpacing: '-0.02em', marginBottom: 12,
      }}>
        {title}
      </h2>
      {sub && (
        <p style={{
          fontSize: 17, color: '#6E6E73', textAlign: 'center',
          maxWidth: 480, margin: '0 auto 56px',
        }}>
          {sub}
        </p>
      )}
    </FadeUp>
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: 20, maxWidth: 960, margin: '0 auto',
      alignItems: 'center',
    }}>
      {plans.map((p) => <PricingCard key={p.name} {...p} />)}
    </div>
  </section>
);

// -- Footer CTA --
export const FooterCTA = ({ headline, cta, ctaHref, ctaColor = '#0A0A0A' }) => (
  <section style={{
    background: '#0A0A0A',
    padding: 'clamp(56px, 8vw, 96px) 24px',
    textAlign: 'center',
  }}>
    <FadeUp>
      <h2 style={{
        fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700,
        color: '#FFFFFF', letterSpacing: '-0.02em',
        maxWidth: 580, margin: '0 auto 36px', lineHeight: 1.1,
      }}>
        {headline}
      </h2>
      <a href={ctaHref || '/registro'} style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '15px 36px', borderRadius: 9999,
        background: '#FFFFFF', color: '#0A0A0A',
        fontSize: 16, fontWeight: 700,
        textDecoration: 'none',
        transition: 'all 0.25s ease',
      }}>
        {cta} →
      </a>
    </FadeUp>
  </section>
);

// -- Navbar de paginas informativas --
export const InfoNav = ({ activePage }) => (
  <nav style={{
    position: 'sticky', top: 0, zIndex: 200,
    background: 'rgba(255,255,255,0.85)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderBottom: '0.5px solid rgba(0,0,0,0.08)',
    padding: '0 24px',
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
  }}>
    <a href="/" style={{ textDecoration: 'none' }}>
      <span style={{ fontSize: 18, fontWeight: 700,
                      color: '#1D1D1F', letterSpacing: '-0.01em' }}>
        Hispaloshop
      </span>
    </a>
    <div style={{ display: 'flex', gap: 4 }}>
      {[
        { href: '/que-es-hispaloshop', label: 'Qué es' },
        { href: '/productor',  label: 'Productor'  },
        { href: '/importador', label: 'Importador' },
        { href: '/influencer', label: 'Influencer' },
      ].map(({ href, label }) => (
        <a key={href} href={href} style={{
          padding: '6px 12px', borderRadius: 9999,
          background: activePage === href
            ? '#0A0A0A' : 'transparent',
          color: activePage === href ? '#FFFFFF' : '#6E6E73',
          fontSize: 13, fontWeight: 500,
          textDecoration: 'none',
          transition: 'all 0.2s ease',
          whiteSpace: 'nowrap',
        }}>
          {label}
        </a>
      ))}
    </div>
    <a href="/login" style={{
      padding: '8px 18px', borderRadius: 9999,
      background: '#0A0A0A', color: '#FFFFFF',
      fontSize: 13, fontWeight: 600,
      textDecoration: 'none',
    }}>
      Entrar
    </a>
  </nav>
);
