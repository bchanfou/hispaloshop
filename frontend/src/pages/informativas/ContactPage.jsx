import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import apiClient from '../../services/api/client';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useScrollReveal } from '../../hooks/useScrollReveal';

const ROLES = ['Consumidor', 'Productor', 'Influencer', 'Importador', 'Prensa'];

export default function ContactPage() {
  const navigate = useNavigate();
  useScrollReveal();
  usePageTitle();

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
    fontSize: '14px',
    border: '1px solid #e7e5e4',
    borderRadius: '12px',
    background: '#ffffff',
    outline: 'none',
    color: '#0c0a09',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  };

  return (
    <div style={{
      background: '#fafaf9',
      paddingTop: 64,
      minHeight: '100vh',
      fontFamily: 'inherit',
    }}>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '60px 16px 80px' }}>
        <h1 className="info-h1 hero-animate-in" style={{ color: '#0c0a09', marginBottom: 12 }}>Hablemos.</h1>
        <p className="info-lead hero-animate-in-delay-1" style={{ color: '#78716c', marginBottom: 48 }}>
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
            background: '#ffffff',
            border: '1px solid #e7e5e4',
            borderRadius: '16px',
            padding: 32,
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
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
                        borderRadius: '9999px',
                        fontSize: '11px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        transition: 'all all 0.15s ease',
                        border: role === r ? 'none' : '1px solid #e7e5e4',
                        background: role === r ? '#0c0a09' : '#ffffff',
                        color: role === r ? '#fff' : '#78716c',
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
                  borderRadius: '9999px',
                  background: '#0c0a09',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: sending ? 'default' : 'pointer',
                  fontFamily: 'inherit',
                  opacity: sending ? 0.6 : 1,
                  transition: 'opacity all 0.15s ease',
                }}
              >
                {sending ? 'Enviando...' : 'Enviar mensaje'}
              </button>
            </form>
          </div>

          {/* ── Right: Info ── */}
          <div>
            <h3 className="info-h3" style={{ marginBottom: 8 }}>Hispaloshop SL</h3>
            <p className="info-body" style={{ color: '#78716c', marginBottom: 24 }}>
              Reus, Tarragona, España
            </p>

            <p className="info-body" style={{ color: '#78716c', margin: '0 0 4px' }}>hola@hispaloshop.com</p>
            <p className="info-body" style={{ color: '#78716c', margin: '0 0 4px' }}>@hispaloshop (Instagram)</p>
            <p className="info-body" style={{ color: '#78716c', margin: '0 0 0' }}>@bchanfuah (fundador)</p>

            <div style={{
              marginTop: 32,
              padding: 24,
              background: '#f5f5f4',
              borderRadius: '16px',
              border: '1px solid #e7e5e4',
            }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#0c0a09', margin: '0 0 12px' }}>
                ¿Eres productor y quieres unirte?
              </p>
              <button
                onClick={() => navigate('/register')}
                style={{
                  width: '100%',
                  height: 40,
                  borderRadius: '9999px',
                  background: '#0c0a09',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
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
  fontSize: '14px',
  fontWeight: 500,
  color: '#0c0a09',
  marginBottom: 6,
  fontFamily: 'inherit',
};
