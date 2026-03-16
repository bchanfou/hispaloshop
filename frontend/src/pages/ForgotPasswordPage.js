import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import apiClient from '../services/api/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;
    setLoading(true);
    try {
      await apiClient.post('/auth/forgot-password', { email });
    } catch {
      // Always show success to prevent email enumeration
    } finally {
      setLoading(false);
      setSent(true);
    }
  };

  const inputStyle = {
    width: '100%', height: 48, padding: '0 16px',
    fontSize: 15, fontFamily: 'var(--font-sans)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    background: 'var(--color-white)',
    color: 'var(--color-black)',
    outline: 'none', boxSizing: 'border-box',
  };

  // Step 2: Confirmation
  if (sent) {
    return (
      <div style={{ textAlign: 'center', fontFamily: 'var(--font-sans)' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
          background: 'var(--color-surface, #f5f5f4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, color: 'var(--color-green, #16a34a)',
        }}>
          ✉️
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-black)', marginBottom: 8 }}>
          Revisa tu email
        </h2>
        <p style={{ fontSize: 15, color: 'var(--color-stone)', lineHeight: 1.5, marginBottom: 8 }}>
          Hemos enviado un enlace a <strong style={{ color: 'var(--color-black)' }}>{email}</strong>.
          Puede tardar unos minutos.
        </p>

        <button
          type="button"
          onClick={() => { setSent(false); handleSubmit({ preventDefault: () => {} }); }}
          style={{
            width: '100%', height: 48, marginTop: 24,
            background: 'var(--color-white)',
            color: 'var(--color-black)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            fontSize: 15, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'var(--font-sans)',
          }}
        >
          Reenviar email
        </button>

        <p style={{ marginTop: 20, fontSize: 14, color: 'var(--color-stone)' }}>
          <Link to="/login" style={{ color: 'var(--color-black)', fontWeight: 600, textDecoration: 'none' }}>
            Volver al login
          </Link>
        </p>
      </div>
    );
  }

  // Step 1: Email form
  return (
    <>
      <h1 style={{
        fontSize: 'var(--text-2xl, 24px)', fontWeight: 600,
        color: 'var(--color-black)', textAlign: 'center',
        margin: 0, fontFamily: 'var(--font-sans)',
      }}>
        Recuperar contraseña
      </h1>
      <p style={{
        fontSize: 'var(--text-base, 16px)', color: 'var(--color-stone)',
        textAlign: 'center', marginTop: 4, marginBottom: 32,
        fontFamily: 'var(--font-sans)',
      }}>
        Te enviaremos un enlace para restablecer tu contraseña.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 20 }}>
          <label style={{
            display: 'block', fontSize: 13, fontWeight: 600,
            color: 'var(--color-black)', marginBottom: 6,
            fontFamily: 'var(--font-sans)',
          }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="hola@ejemplo.com"
            required
            autoComplete="email"
            style={inputStyle}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%', height: 48,
            background: 'var(--color-black)',
            color: 'var(--color-white)',
            border: 'none', borderRadius: 'var(--radius-lg)',
            fontSize: 15, fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontFamily: 'var(--font-sans)',
          }}
        >
          {loading ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : 'Enviar enlace'}
        </button>
      </form>

      <p style={{
        textAlign: 'center', marginTop: 24,
        fontSize: 14, color: 'var(--color-stone)',
        fontFamily: 'var(--font-sans)',
      }}>
        <Link to="/login" style={{ color: 'var(--color-black)', fontWeight: 600, textDecoration: 'none' }}>
          Volver al login
        </Link>
      </p>
    </>
  );
}
