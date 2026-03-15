import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '../brand/Logo';

/**
 * AuthLayout — centered layout for auth pages (login, register, verify, etc.)
 * Logo at top, centered card, no nav.
 */
export default function AuthLayout({ children }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      background: 'var(--color-cream)',
      fontFamily: 'var(--font-sans)',
    }}>
      {/* Logo */}
      <div style={{
        padding: '32px 0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <Logo variant="full" theme="light" size={120} />
        </Link>
      </div>

      {/* Content card */}
      <main style={{
        width: '100%',
        maxWidth: 440,
        padding: '0 var(--space-4)',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {children}
      </main>

      {/* Footer links */}
      <div style={{
        padding: '24px 16px',
        display: 'flex',
        gap: 16,
        justifyContent: 'center',
        flexWrap: 'wrap',
      }}>
        {[
          { label: 'Términos', to: '/terms' },
          { label: 'Privacidad', to: '/privacy' },
          { label: 'Ayuda', to: '/help' },
        ].map(link => (
          <Link
            key={link.to}
            to={link.to}
            style={{
              fontSize: 12,
              color: 'var(--color-stone)',
              textDecoration: 'none',
            }}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
