import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  const font = { fontFamily: 'var(--font-sans)' };

  return (
    <main
      role="main"
      aria-label="Página no encontrada"
      style={{
        minHeight: '100vh', background: 'var(--color-cream)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px', ...font,
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        {/* Logo */}
        <div
          aria-hidden="true"
          style={{
            width: 64, height: 64, borderRadius: 'var(--radius-full, 999px)',
            background: 'var(--color-black)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 32px',
          }}
        >
          <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-white)', letterSpacing: '-0.03em' }}>
            H
          </span>
        </div>

        {/* 404 */}
        <h1 style={{
          fontSize: 80, fontWeight: 700, color: 'var(--color-black)',
          margin: '0 0 8px', letterSpacing: '-0.03em', lineHeight: 1,
        }}>
          404
        </h1>

        <h2 style={{
          fontSize: 24, fontWeight: 500, color: 'var(--color-black)',
          margin: '0 0 12px',
        }}>
          Página no encontrada
        </h2>

        <p style={{
          fontSize: 15, color: 'var(--color-stone)',
          lineHeight: 1.5, margin: '0 0 32px',
        }}>
          La página que buscas no existe o ha sido movida.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Link
            to="/"
            aria-label="Volver a la página de inicio"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: 48, background: 'var(--color-black)', color: 'var(--color-white)',
              borderRadius: 'var(--radius-lg)',
              fontSize: 15, fontWeight: 600, textDecoration: 'none',
            }}
          >
            Volver al inicio
          </Link>
          <Link
            to="/discover"
            aria-label="Explorar el catálogo de productos"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: 48, background: 'var(--color-white)', color: 'var(--color-black)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              fontSize: 15, fontWeight: 600, textDecoration: 'none',
            }}
          >
            Explorar productos
          </Link>
        </div>
      </div>
    </main>
  );
}
