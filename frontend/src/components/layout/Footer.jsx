import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const COUNTRIES = [
  { code: 'ES', flag: '🇪🇸', name: 'España', active: true },
  { code: 'FR', flag: '🇫🇷', name: 'France', active: true },
  { code: 'KR', flag: '🇰🇷', name: '한국', active: false, label: 'Beta' },
  { code: 'IT', flag: '🇮🇹', name: 'Italia', active: false },
  { code: 'PT', flag: '🇵🇹', name: 'Portugal', active: false },
  { code: 'DE', flag: '🇩🇪', name: 'Deutschland', active: false },
];

const LEGAL_LINKS = [
  { label: 'Privacidad', to: '/privacy' },
  { label: 'Términos', to: '/terms' },
  { label: 'Cookies', to: '/terms' },
  { label: 'Contacto', to: '/contact' },
];

export default function Footer() {
  const [country, setCountry] = useState(() => {
    try { return localStorage.getItem('hsp_country') || 'ES'; } catch { return 'ES'; }
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedCountry = COUNTRIES.find(c => c.code === country) || COUNTRIES[0];

  const selectCountry = (code) => {
    setCountry(code);
    try { localStorage.setItem('hsp_country', code); } catch { /* */ }
    setDropdownOpen(false);
  };

  useEffect(() => {
    if (!dropdownOpen) return;
    const close = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [dropdownOpen]);

  return (
    <footer style={{
      background: '#0A0A0A',
      borderTop: '0.5px solid #1A1A1A',
      padding: '40px 16px',
      fontFamily: 'var(--font-sans)',
    }}>
      <div className="footer-container" style={{ maxWidth: 1200, margin: '0 auto' }}>
        <style>{`
          .footer-grid {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 24px;
            text-align: center;
          }
          @media (min-width: 768px) {
            .footer-grid {
              display: grid !important;
              grid-template-columns: 200px 1fr 200px !important;
              align-items: center;
              text-align: left;
              gap: 0;
            }
          }
        `}</style>

        <div className="footer-grid">
          {/* Logo + wordmark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img
              src="/logo.png"
              alt="Hispaloshop"
              style={{ height: 24, objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
            />
            <span style={{ fontSize: 17, fontWeight: 600, color: '#fff' }}>
              hispaloshop
            </span>
          </div>

          {/* Legal links */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            flexWrap: 'wrap',
          }}>
            {LEGAL_LINKS.map((link, i) => (
              <React.Fragment key={link.to + i}>
                <Link
                  to={link.to}
                  style={{
                    fontSize: 'var(--text-sm)',
                    color: 'rgba(255,255,255,0.4)',
                    textDecoration: 'none',
                    transition: 'color var(--transition-fast)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
                >
                  {link.label}
                </Link>
                {i < LEGAL_LINKS.length - 1 && (
                  <span style={{ color: 'rgba(255,255,255,0.2)', margin: '0 4px' }}>·</span>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Country + Social */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            justifyContent: 'flex-end',
          }}>
            {/* Country selector */}
            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setDropdownOpen(v => !v)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-full)',
                  background: 'rgba(255,255,255,0.05)',
                  border: '0.5px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: 'var(--text-sm)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {selectedCountry.flag} {selectedCountry.name} ▼
              </button>

              {dropdownOpen && (
                <div style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 8px)',
                  right: 0,
                  width: 200,
                  background: '#1A1A1A',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  zIndex: 50,
                  boxShadow: 'var(--shadow-lg)',
                }}>
                  {COUNTRIES.map(c => (
                    <button
                      key={c.code}
                      onClick={() => selectCountry(c.code)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        width: '100%',
                        padding: '10px 12px',
                        border: 'none',
                        background: country === c.code ? 'rgba(255,255,255,0.08)' : 'transparent',
                        cursor: c.active ? 'pointer' : 'default',
                        opacity: c.active ? 1 : 0.5,
                        fontFamily: 'var(--font-sans)',
                        fontSize: 'var(--text-sm)',
                        color: c.active ? '#fff' : 'rgba(255,255,255,0.5)',
                        fontWeight: c.active ? 600 : 400,
                        textAlign: 'left',
                      }}
                    >
                      <span>{c.flag}</span>
                      <span style={{ flex: 1 }}>{c.name}</span>
                      {!c.active && (
                        <span style={{
                          fontSize: 10, fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-full)',
                          background: 'rgba(255,255,255,0.1)',
                          color: 'rgba(255,255,255,0.4)',
                        }}>
                          {c.label || 'Próx.'}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Social icons */}
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { label: 'Instagram', path: 'M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 3.5a2.5 2.5 0 00-2.5 2.5v4a2.5 2.5 0 005 0V8A2.5 2.5 0 0012 5.5z' },
                { label: 'TikTok', path: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z' },
                { label: 'LinkedIn', path: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z' },
              ].map((social, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label={social.label}
                  style={{
                    color: 'rgba(255,255,255,0.4)',
                    transition: 'color var(--transition-fast)',
                    display: 'flex',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
                >
                  <span style={{ fontSize: 18 }}>
                    {social.label === 'Instagram' ? '📷' :
                     social.label === 'TikTok' ? '🎵' : '💼'}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* App Store + Google Play (mobile-centered) */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 12,
          marginTop: 32,
        }}>
          <div style={{
            width: 140, height: 40,
            borderRadius: 'var(--radius-md)',
            border: '0.5px solid rgba(255,255,255,0.15)',
            background: '#0A0A0A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}>
            <span style={{ fontSize: 16 }}>🍎</span>
            <span style={{ fontSize: 12, color: '#fff', fontWeight: 500 }}>App Store</span>
          </div>
          <div style={{
            width: 140, height: 40,
            borderRadius: 'var(--radius-md)',
            border: '0.5px solid rgba(255,255,255,0.15)',
            background: '#0A0A0A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}>
            <span style={{ fontSize: 16 }}>▶</span>
            <span style={{ fontSize: 12, color: '#fff', fontWeight: 500 }}>Google Play</span>
          </div>
        </div>
        <p style={{
          textAlign: 'center',
          fontSize: 11,
          color: 'rgba(255,255,255,0.2)',
          marginTop: 8,
          marginBottom: 0,
        }}>
          Próximamente
        </p>

        {/* Copyright */}
        <p style={{
          textAlign: 'center',
          fontSize: 'var(--text-xs)',
          color: 'rgba(255,255,255,0.25)',
          marginTop: 24,
          marginBottom: 0,
        }}>
          © 2026 Hispaloshop SL · Todos los derechos reservados
        </p>
      </div>
    </footer>
  );
}
