import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import apiClient from '../../services/api/client';

const ROLES = ['Consumidor', 'Productor', 'Influencer', 'Importador', 'Prensa'];

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

export default function ContactPage() {
  const navigate = useNavigate();
  useScrollReveal();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Consumidor');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error('Completa todos los campos');
      return;
    }
    setSending(true);
    try {
      await apiClient.post('/contact', { name, email, role, message });
      toast.success('Mensaje enviado. Te responderemos pronto.');
      setName(''); setEmail(''); setMessage('');
    } catch {
      toast.error('Error al enviar. Inténtalo de nuevo.');
    } finally {
      setSending(false);
    }
  };

  const inputStyle = {
    width: '100%',
    height: 44,
    padding: '0 14px',
    fontSize: 'var(--text-sm)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    background: 'var(--color-white)',
    outline: 'none',
    color: 'var(--color-black)',
    fontFamily: 'var(--font-sans)',
    boxSizing: 'border-box',
  };

  return (
    <div style={{
      background: 'var(--color-cream)',
      paddingTop: 64,
      minHeight: '100vh',
      fontFamily: 'var(--font-sans)',
    }}>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '60px 16px 80px' }}>
        <h1 className="info-h1" style={{ color: 'var(--color-black)', marginBottom: 12 }}>Hablemos.</h1>
        <p className="info-lead" style={{ color: 'var(--color-stone)', marginBottom: 48 }}>
          Para dudas sobre la plataforma, colaboraciones o prensa.
          Respondemos en menos de 24 horas.
        </p>

        <div className="reveal contact-grid" style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: 64,
        }}>
          <style>{`
            @media (min-width: 768px) {
              .contact-grid { grid-template-columns: 1fr 1fr !important; }
            }
          `}</style>

          {/* ── Left: Form ── */}
          <div style={{
            background: 'var(--color-white)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: 32,
            boxShadow: 'var(--shadow-xs)',
          }}>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Nombre</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Tu nombre"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Soy</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {ROLES.map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 500,
                        cursor: 'pointer',
                        fontFamily: 'var(--font-sans)',
                        transition: 'all var(--transition-fast)',
                        border: role === r ? 'none' : '1px solid var(--color-border)',
                        background: role === r ? 'var(--color-black)' : 'var(--color-white)',
                        color: role === r ? '#fff' : 'var(--color-stone)',
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Mensaje</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="¿En qué podemos ayudarte?"
                  rows={5}
                  style={{
                    ...inputStyle,
                    height: 'auto',
                    minHeight: 120,
                    padding: 14,
                    resize: 'vertical',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                style={{
                  width: '100%',
                  height: 46,
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--color-black)',
                  color: '#fff',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 600,
                  border: 'none',
                  cursor: sending ? 'default' : 'pointer',
                  fontFamily: 'var(--font-sans)',
                  opacity: sending ? 0.6 : 1,
                  transition: 'opacity var(--transition-fast)',
                }}
              >
                {sending ? 'Enviando...' : 'Enviar mensaje'}
              </button>
            </form>
          </div>

          {/* ── Right: Info ── */}
          <div>
            <h3 className="info-h3" style={{ marginBottom: 8 }}>Hispaloshop SL</h3>
            <p className="info-body" style={{ color: 'var(--color-stone)', marginBottom: 24 }}>
              Reus, Tarragona, España
            </p>

            <p className="info-body" style={{ color: 'var(--color-stone)', margin: '0 0 4px' }}>hola@hispaloshop.com</p>
            <p className="info-body" style={{ color: 'var(--color-stone)', margin: '0 0 4px' }}>@hispaloshop (Instagram)</p>
            <p className="info-body" style={{ color: 'var(--color-stone)', margin: '0 0 0' }}>@bchanfuah (fundador)</p>

            <div style={{
              marginTop: 32,
              padding: 24,
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--color-border)',
            }}>
              <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-black)', margin: '0 0 12px' }}>
                ¿Eres productor y quieres unirte?
              </p>
              <button
                onClick={() => navigate('/register')}
                style={{
                  width: '100%',
                  height: 40,
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--color-black)',
                  color: '#fff',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                Crear cuenta gratuita →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: 'var(--text-sm)',
  fontWeight: 500,
  color: 'var(--color-black)',
  marginBottom: 6,
  fontFamily: 'var(--font-sans)',
};
