import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const NAV_LINKS = [
  { label: 'Qué es',       to: '/about' },
  { label: 'Productores',  to: '/productor' },
  { label: 'Influencers',  to: '/influencer' },
  { label: 'Precios',      to: '/pricing' },
  { label: 'Blog',         to: '/blog' },
];

export default function InfoHeader() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef(null);

  // Scroll-aware: transparent → dark blur
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  // Close drawer on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setDrawerOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const headerBg = scrolled
    ? 'rgba(10,10,10,0.85)'
    : 'transparent';
  const headerBorder = scrolled
    ? '1px solid rgba(255,255,255,0.08)'
    : '1px solid transparent';
  const textColor = '#FFFFFF';

  return (
    <>
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 'var(--z-sticky)',
        background: headerBg,
        borderBottom: headerBorder,
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
        transition: 'background 0.3s ease, border-color 0.3s ease, backdrop-filter 0.3s ease',
        fontFamily: 'var(--font-sans)',
      }}>
        {/* ── Mobile ── */}
        <div className="lg:hidden" style={{
          height: 52,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 var(--space-4)',
        }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <img src="/logo.png" alt="Hispaloshop" style={{ height: 26, width: 26, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
            <span style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: textColor }}>
              Hispaloshop
            </span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link to="/login" style={{
              padding: '7px 14px',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              color: textColor,
              textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 'var(--radius-full)',
              background: 'transparent',
              transition: 'background 0.15s ease',
            }}>
              Entrar
            </Link>

            {/* Hamburger */}
            <button
              onClick={() => setDrawerOpen(v => !v)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 38,
                height: 38,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: textColor,
              }}
              aria-label={drawerOpen ? 'Cerrar menú' : 'Abrir menú'}
            >
              {drawerOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* ── Desktop ── */}
        <div className="hidden lg:grid" style={{
          height: 60,
          gridTemplateColumns: '200px 1fr 200px',
          alignItems: 'center',
          maxWidth: 'var(--max-width)',
          margin: '0 auto',
          padding: '0 var(--space-4)',
        }}>
          {/* Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <img src="/logo.png" alt="Hispaloshop" style={{ height: 28, width: 28, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
            <span style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: textColor }}>
              Hispaloshop
            </span>
          </Link>

          {/* Nav links */}
          <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            {NAV_LINKS.map(link => (
              <Link
                key={link.to}
                to={link.to}
                style={{
                  padding: '8px 16px',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.8)',
                  textDecoration: 'none',
                  borderRadius: 'var(--radius-full)',
                  transition: 'color 0.15s ease, background 0.15s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = '#fff';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* CTA buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
            <Link to="/login" style={{
              padding: '8px 18px',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              color: textColor,
              textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 'var(--radius-full)',
              background: 'transparent',
              transition: 'background 0.15s ease, border-color 0.15s ease',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)';
              }}
            >
              Entrar
            </Link>
            <Link to="/register" style={{
              padding: '8px 18px',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              color: '#fff',
              textDecoration: 'none',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-green)',
              border: '1px solid var(--color-green)',
              transition: 'background 0.15s ease',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-green-dark)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--color-green)'}
            >
              Empieza gratis
            </Link>
          </div>
        </div>
      </header>

      {/* ── Mobile Drawer ── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setDrawerOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                zIndex: 'var(--z-drawer)',
              }}
            />

            {/* Drawer panel */}
            <motion.div
              ref={drawerRef}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              style={{
                position: 'fixed',
                top: 0,
                right: 0,
                bottom: 0,
                width: 280,
                background: 'var(--color-white)',
                zIndex: 'calc(var(--z-drawer) + 1)',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: 'var(--shadow-xl)',
              }}
            >
              {/* Drawer header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderBottom: '1px solid var(--color-divider)',
              }}>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-black)' }}>
                  Menú
                </span>
                <button
                  onClick={() => setDrawerOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 32, height: 32, border: 'none', background: 'var(--color-surface)',
                    borderRadius: 'var(--radius-full)', cursor: 'pointer',
                  }}
                >
                  <X size={16} color="var(--color-black)" />
                </button>
              </div>

              {/* Links */}
              <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
                {NAV_LINKS.map(link => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setDrawerOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 12px',
                      borderRadius: 'var(--radius-md)',
                      textDecoration: 'none',
                      fontSize: 'var(--text-base)',
                      fontWeight: 500,
                      color: 'var(--color-black)',
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    {link.label}
                    <ChevronRight size={16} color="var(--color-stone)" />
                  </Link>
                ))}
              </nav>

              {/* CTA */}
              <div style={{ padding: 16, borderTop: '1px solid var(--color-divider)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Link
                  to="/register"
                  onClick={() => setDrawerOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 44,
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--color-green)',
                    color: '#fff',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 600,
                    textDecoration: 'none',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  Empieza gratis
                </Link>
                <Link
                  to="/login"
                  onClick={() => setDrawerOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 44,
                    borderRadius: 'var(--radius-full)',
                    background: 'transparent',
                    color: 'var(--color-black)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 600,
                    textDecoration: 'none',
                    border: '1px solid var(--color-border)',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  Iniciar sesión
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
