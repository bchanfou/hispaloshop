// @ts-nocheck
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Mail } from 'lucide-react';
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

  // Step 2: Confirmation
  if (sent) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-full mx-auto mb-5 bg-stone-100 flex items-center justify-center">
          <Mail size={28} className="text-stone-950" />
        </div>
        <h2 className="text-[22px] font-bold text-stone-950 mb-2">
          Revisa tu email
        </h2>
        <p className="text-[15px] text-stone-500 leading-relaxed mb-2">
          Hemos enviado un enlace a <strong className="text-stone-950">{email}</strong>.
          Puede tardar unos minutos.
        </p>

        <button
          type="button"
          onClick={() => { setSent(false); handleSubmit({ preventDefault: () => {} }); }}
          className="w-full h-12 mt-6 bg-white text-stone-950 border border-stone-200 rounded-full text-[15px] font-semibold hover:bg-stone-50 transition-colors"
        >
          Reenviar email
        </button>

        <p className="mt-5 text-sm">
          <Link to="/login" className="text-stone-950 font-semibold no-underline hover:underline">
            Volver al login
          </Link>
        </p>
      </div>
    );
  }

  // Step 1: Email form
  return (
    <>
      <h1 className="text-2xl font-bold text-stone-950 text-center mb-1">
        Recuperar contraseña
      </h1>
      <p className="text-base text-stone-500 text-center mb-8">
        Te enviaremos un enlace para restablecer tu contraseña.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="mb-5">
          <label className="block text-[13px] font-semibold text-stone-950 mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="hola@ejemplo.com"
            required
            autoComplete="email"
            className="w-full h-12 px-4 text-[15px] text-stone-950 placeholder:text-stone-400 bg-white border border-stone-200 rounded-xl outline-none transition-colors focus:border-stone-400"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-stone-950 text-white rounded-full text-[15px] font-semibold flex items-center justify-center gap-2 hover:bg-stone-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 size={20} className="animate-spin" /> : 'Enviar enlace'}
        </button>
      </form>

      <p className="text-center mt-6 text-sm">
        <Link to="/login" className="text-stone-950 font-semibold no-underline hover:underline">
          Volver al login
        </Link>
      </p>
    </>
  );
}
