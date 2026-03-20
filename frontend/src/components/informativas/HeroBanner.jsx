import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Logo from '../brand/Logo';

export default function HeroBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('banner_dismissed') === 'true') {
      setDismissed(true);
    }
  }, []);

  if (user || dismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem('banner_dismissed', 'true');
    setDismissed(true);
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: '45',
      height: 72,
      background: 'rgba(10,10,10,0.92)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderTop: '0.5px solid rgba(255,255,255,0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      fontFamily: 'inherit',
    }}>
      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <Logo variant="icon" theme="dark" size={28} />
        <div style={{ minWidth: 0 }}>
          <p style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: 500,
            color: '#fff',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            Únete a hispaloshop
          </p>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: 'rgba(255,255,255,0.5)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            Descubre productores artesanales
          </p>
        </div>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <button
          onClick={() => navigate('/register')}
          style={{
            height: 40,
            padding: '0 20px',
            borderRadius: '9999px',
            background: '#0c0a09',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'background all 0.15s ease',
          }}
        >
          Crear cuenta
        </button>
        <button
          onClick={handleDismiss}
          aria-label="Cerrar"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '9999px',
            background: 'transparent',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.6)',
          }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
