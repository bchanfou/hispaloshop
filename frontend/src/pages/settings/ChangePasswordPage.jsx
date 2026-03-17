import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api/client';

function getStrength(pw) {
  if (!pw || pw.length < 6) return { level: 0, label: 'Muy corta', color: 'var(--color-red)' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 1, label: 'Débil', color: 'var(--color-stone)' };
  if (score === 2) return { level: 2, label: 'Buena', color: 'var(--color-black)' };
  return { level: 3, label: 'Fuerte', color: 'var(--color-black)' };
}

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [current, setCurrent] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isGoogleUser = user?.auth_provider === 'google' && !user?.has_password;
  const strength = useMemo(() => getStrength(newPw), [newPw]);
  const mismatch = confirm.length > 0 && newPw !== confirm;
  const font = { fontFamily: 'var(--font-sans)' };

  const canSubmit = isGoogleUser
    ? newPw.length >= 6 && strength.level >= 2 && newPw === confirm
    : current.length > 0 && newPw.length >= 6 && strength.level >= 2 && newPw === confirm;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      if (isGoogleUser) {
        await apiClient.post('/auth/add-password', { new_password: newPw });
      } else {
        await apiClient.put('/customer/password', {
          current_password: current,
          new_password: newPw,
        });
      }
      toast.success('Contraseña actualizada');
      navigate('/settings');
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401) {
        toast.error('Contraseña actual incorrecta');
      } else {
        toast.error(err?.response?.data?.detail || 'Error al cambiar contraseña');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    width: '100%', height: 44, padding: '0 44px 0 14px',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    fontSize: 14, color: 'var(--color-black)',
    outline: 'none', boxSizing: 'border-box', ...font,
  };

  const eyeBtn = (show, toggle) => (
    <button onClick={toggle}
      style={{
        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
        background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex',
      }}>
      {show ? <EyeOff size={18} color="var(--color-stone)" /> : <Eye size={18} color="var(--color-stone)" />}
    </button>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-cream)', ...font }}>
      {/* Topbar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'var(--color-white)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
      }}>
        <button onClick={() => navigate('/settings')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
          <ArrowLeft size={22} color="var(--color-black)" />
        </button>
        <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-black)' }}>Contraseña</span>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px 100px' }}>
        {/* Google user card */}
        {isGoogleUser && (
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: 16, marginBottom: 24,
          }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-black)', margin: '0 0 4px' }}>
              Cuenta con Google
            </p>
            <p style={{ fontSize: 13, color: 'var(--color-stone)', margin: 0, lineHeight: 1.5 }}>
              Tu cuenta usa Google para iniciar sesión. No tienes contraseña configurada.
              Puedes añadir una a continuación.
            </p>
          </div>
        )}

        {/* Current password (skip for Google users) */}
        {!isGoogleUser && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-black)', marginBottom: 6, display: 'block', ...font }}>
              Contraseña actual
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showCurrent ? 'text' : 'password'}
                value={current}
                onChange={e => setCurrent(e.target.value)}
                style={inputStyle}
              />
              {eyeBtn(showCurrent, () => setShowCurrent(!showCurrent))}
            </div>
          </div>
        )}

        {/* New password */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-black)', marginBottom: 6, display: 'block', ...font }}>
            {isGoogleUser ? 'Nueva contraseña' : 'Nueva contraseña'}
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showNew ? 'text' : 'password'}
              value={newPw}
              onChange={e => setNewPw(e.target.value)}
              style={inputStyle}
            />
            {eyeBtn(showNew, () => setShowNew(!showNew))}
          </div>
          {/* Strength indicator */}
          {newPw.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                {[0, 1, 2, 3].map(i => (
                  <div key={i} style={{
                    flex: 1, height: 3, borderRadius: 2,
                    background: i <= strength.level ? strength.color : 'var(--color-border)',
                    transition: 'background 200ms',
                  }} />
                ))}
              </div>
              <p style={{ fontSize: 12, color: strength.color, margin: 0, ...font }}>{strength.label}</p>
            </div>
          )}
        </div>

        {/* Confirm password */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-black)', marginBottom: 6, display: 'block', ...font }}>
            Repetir nueva contraseña
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              style={{
                ...inputStyle,
                borderColor: mismatch ? 'var(--color-red)' : 'var(--color-border)',
              }}
            />
            {eyeBtn(showConfirm, () => setShowConfirm(!showConfirm))}
          </div>
          {mismatch && (
            <p style={{ fontSize: 12, color: 'var(--color-red)', margin: '4px 0 0', ...font }}>
              Las contraseñas no coinciden
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          style={{
            width: '100%', height: 48,
            background: canSubmit && !submitting ? 'var(--color-black)' : 'var(--color-surface)',
            color: canSubmit && !submitting ? 'var(--color-white)' : 'var(--color-stone)',
            border: 'none', borderRadius: 'var(--radius-xl)',
            fontSize: 15, fontWeight: 600, cursor: canSubmit ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            ...font,
          }}
        >
          {submitting ? (
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <>
              <Lock size={18} />
              {isGoogleUser ? 'Añadir contraseña' : 'Cambiar contraseña'}
            </>
          )}
        </button>
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
