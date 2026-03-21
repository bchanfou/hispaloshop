// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Check, X as XIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { authApi, getAuthErrorMessage } from '../lib/authApi';
import { setToken } from '../lib/auth';
import apiClient from '../services/api/client';

/* ── Password strength helper ── */
function getPasswordStrength(pw) {
  if (pw.length < 8) return { level: 0, label: 'Muy corta', color: '#dc2626' };
  const hasUpper = /[A-Z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
  const hasSpecial = /[^A-Za-z0-9]/.test(pw);
  if (pw.length >= 12 && hasUpper && hasNumber && hasSpecial)
    return { level: 3, label: 'Fuerte', color: '#0c0a09' };
  if (hasUpper && hasNumber)
    return { level: 2, label: 'Buena', color: '#0c0a09' };
  return { level: 1, label: 'Débil', color: '#78716c' };
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    fullName: '', email: '', username: '', password: '',
    birthDay: '', birthMonth: '', birthYear: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [ageBlocked, setAgeBlocked] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Username availability
  const [usernameStatus, setUsernameStatus] = useState(null); // null | 'checking' | 'available' | 'taken' | 'short'
  const usernameTimer = useRef(null);

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  // Debounced username check
  const checkUsername = useCallback(async (value) => {
    const clean = value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (clean.length < 3) {
      setUsernameStatus('short');
      return;
    }
    setUsernameStatus('checking');
    try {
      const res = await apiClient.get(`/users/check-username/${clean}`);
      // apiClient already unwraps .data — check res directly
      setUsernameStatus(res?.available ?? res?.data?.available ? 'available' : 'taken');
    } catch {
      setUsernameStatus(null);
    }
  }, []);

  useEffect(() => {
    if (usernameTimer.current) clearTimeout(usernameTimer.current);
    if (!form.username.trim()) { setUsernameStatus(null); return; }
    usernameTimer.current = setTimeout(() => checkUsername(form.username), 500);
    return () => clearTimeout(usernameTimer.current);
  }, [form.username, checkUsername]);

  // Age validation
  const checkAge = () => {
    const y = parseInt(form.birthYear, 10);
    const m = parseInt(form.birthMonth, 10);
    const d = parseInt(form.birthDay, 10);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return false;
    const birth = new Date(y, m - 1, d);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const monthDiff = now.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age--;
    return age >= 16;
  };

  const validate = () => {
    const e = {};
    if (!form.fullName.trim()) e.fullName = 'El nombre es obligatorio';
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = 'Email no válido';
    if (!form.username.trim() || form.username.trim().length < 3) e.username = 'Mínimo 3 caracteres';
    else if (usernameStatus === 'taken') e.username = 'Este usuario ya está en uso';
    if (form.password.length < 8) e.password = 'Mínimo 8 caracteres';
    if (!form.birthDay || !form.birthMonth || !form.birthYear) {
      e.birthDate = 'La fecha de nacimiento es obligatoria';
    } else if (!checkAge()) {
      setAgeBlocked(true);
      return false;
    }
    if (!termsAccepted) e.terms = 'Debes aceptar los términos';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);

    const birthDate = `${form.birthYear}-${form.birthMonth.padStart(2, '0')}-${form.birthDay.padStart(2, '0')}`;
    try {
      const data = await register({
        name: form.fullName,
        email: form.email,
        username: form.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''),
        password: form.password,
        birth_date: birthDate,
        analytics_consent: true,
        consent_version: 1,
      });

      if (data?.user) {
        // Save auth token so subsequent API calls are authenticated
        if (data.session_token || data.access_token) {
          setToken(data.session_token || data.access_token, data.refresh_token);
        }
        navigate('/onboarding', { replace: true });
      }
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (detail?.error === 'age_requirement' || (typeof detail === 'string' && detail.includes('age_requirement'))) {
        setAgeBlocked(true);
        return;
      }
      const msg = getAuthErrorMessage(err, 'Error al crear la cuenta.');
      if (msg.toLowerCase().includes('email')) {
        setErrors({ email: 'Este email ya está registrado' });
      } else if (msg.toLowerCase().includes('username') || msg.toLowerCase().includes('usuario')) {
        setErrors({ username: msg });
      } else {
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    try {
      const data = await authApi.getGoogleAuthUrl();
      if (data.auth_url) window.location.href = data.auth_url;
      else toast.error('Error al conectar con Google.');
    } catch (error) {
      toast.error(getAuthErrorMessage(error, 'Error al conectar con Google.'));
    }
  };

  const canSubmit = form.fullName && form.email && form.username &&
    form.password.length >= 8 && form.birthDay && form.birthMonth &&
    form.birthYear && termsAccepted && usernameStatus !== 'taken' &&
    usernameStatus !== 'checking';

  const strength = getPasswordStrength(form.password);

  const inputStyle = {
    width: '100%', height: 48, padding: '0 16px',
    fontSize: 15, fontFamily: 'inherit',
    border: '1px solid #e7e5e4',
    borderRadius: '14px',
    background: '#ffffff',
    color: '#0c0a09',
    outline: 'none',
    transition: 'all 0.15s ease',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'block', fontSize: 13, fontWeight: 600,
    color: '#0c0a09', marginBottom: 6,
    fontFamily: 'inherit',
  };

  // Age-blocked screen
  if (ageBlocked) {
    return (
      <div style={{
        textAlign: 'center', padding: '40px 0',
        fontFamily: 'inherit',
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px',
          background: '#f5f5f4',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 36,
        }}>
          🔒
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: '#0c0a09' }}>
          Debes tener al menos 16 años
        </h1>
        <p style={{ fontSize: 15, color: '#78716c', marginBottom: 24, lineHeight: 1.5 }}>
          para usar Hispaloshop
        </p>
        <button
          onClick={() => setAgeBlocked(false)}
          style={{
            padding: '12px 32px', background: '#0c0a09',
            color: '#ffffff', border: 'none',
            borderRadius: '14px', fontSize: 15, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <h1 style={{
        fontSize: '24px', fontWeight: 600,
        color: '#0c0a09', textAlign: 'center',
        margin: 0, fontFamily: 'inherit',
      }}>
        Crear cuenta
      </h1>
      <p style={{
        fontSize: '16px', color: '#78716c',
        textAlign: 'center', marginTop: 4, marginBottom: 32,
        fontFamily: 'inherit',
      }}>
        Únete a la plataforma artesanal
      </p>

      {/* Google */}
      <button
        type="button"
        onClick={handleGoogleRegister}
        style={{
          width: '100%', height: 48,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          background: '#ffffff',
          border: '1px solid #e7e5e4',
          borderRadius: '14px',
          fontSize: 15, fontWeight: 600,
          color: '#0c0a09',
          cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Continuar con Google
      </button>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '20px 0' }}>
        <div style={{ flex: 1, height: 1, background: '#e7e5e4' }} />
        <span style={{ fontSize: 13, color: '#78716c', fontFamily: 'inherit' }}>o</span>
        <div style={{ flex: 1, height: 1, background: '#e7e5e4' }} />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Name */}
          <div>
            <label style={labelStyle}>Nombre completo</label>
            <input
              value={form.fullName}
              onChange={e => updateForm('fullName', e.target.value)}
              placeholder="María García"
              autoComplete="name"
              style={{ ...inputStyle, ...(errors.fullName ? { borderColor: '#dc2626' } : {}) }}
            />
            {errors.fullName && <p style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>{errors.fullName}</p>}
          </div>

          {/* Email */}
          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => updateForm('email', e.target.value)}
              placeholder="hola@ejemplo.com"
              autoComplete="email"
              style={{ ...inputStyle, ...(errors.email ? { borderColor: '#dc2626' } : {}) }}
            />
            {errors.email && <p style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>{errors.email}</p>}
          </div>

          {/* Username */}
          <div>
            <label style={labelStyle}>Usuario</label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
                fontSize: 15, color: '#78716c', fontFamily: 'inherit',
              }}>@</span>
              <input
                value={form.username}
                onChange={e => {
                  const val = e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 30);
                  updateForm('username', val);
                }}
                placeholder="tu_usuario"
                autoComplete="username"
                style={{
                  ...inputStyle,
                  paddingLeft: 32,
                  paddingRight: 40,
                  ...(errors.username ? { borderColor: '#dc2626' } : {}),
                }}
              />
              {/* Status icon */}
              {form.username.length >= 3 && usernameStatus && usernameStatus !== 'checking' && (
                <span style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  display: 'flex',
                }}>
                  {usernameStatus === 'available'
                    ? <Check size={18} color="#0c0a09" />
                    : <XIcon size={18} color="#dc2626" />
                  }
                </span>
              )}
              {usernameStatus === 'checking' && (
                <span style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                }}>
                  <Loader2 size={16} color="#78716c" style={{ animation: 'spin 1s linear infinite' }} />
                </span>
              )}
            </div>
            {usernameStatus === 'taken' && (
              <p style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>Este usuario ya está en uso</p>
            )}
            {errors.username && <p style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>{errors.username}</p>}
          </div>

          {/* Password */}
          <div>
            <label style={labelStyle}>Contraseña</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={e => updateForm('password', e.target.value)}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
                style={{
                  ...inputStyle,
                  paddingRight: 48,
                  ...(errors.password ? { borderColor: '#dc2626' } : {}),
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#78716c', padding: 4, display: 'flex',
                }}
                tabIndex={-1}
                aria-label={showPassword ? 'Ocultar' : 'Mostrar'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {/* Strength indicator */}
            {form.password.length > 0 && (
              <div style={{ marginTop: 6 }}>
                <div style={{
                  height: 3, borderRadius: 2,
                  background: '#f5f5f4',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', borderRadius: 2,
                    background: strength.color,
                    width: `${((strength.level + 1) / 4) * 100}%`,
                    transition: 'width 0.3s ease',
                  }} />
                </div>
                <p style={{ fontSize: 11, color: strength.color, marginTop: 3 }}>{strength.label}</p>
              </div>
            )}
            {errors.password && <p style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>{errors.password}</p>}
          </div>

          {/* Birth date */}
          <div>
            <label style={labelStyle}>Fecha de nacimiento</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <select
                value={form.birthDay}
                onChange={e => updateForm('birthDay', e.target.value)}
                style={{
                  ...inputStyle, flex: 1, padding: '0 8px',
                  ...(errors.birthDate ? { borderColor: '#dc2626' } : {}),
                }}
              >
                <option value="">Día</option>
                {Array.from({ length: 31 }, (_, i) => (
                  <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
                ))}
              </select>
              <select
                value={form.birthMonth}
                onChange={e => updateForm('birthMonth', e.target.value)}
                style={{
                  ...inputStyle, flex: 1.3, padding: '0 8px',
                  ...(errors.birthDate ? { borderColor: '#dc2626' } : {}),
                }}
              >
                <option value="">Mes</option>
                {['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'].map((m, i) => (
                  <option key={i + 1} value={String(i + 1)}>{m}</option>
                ))}
              </select>
              <select
                value={form.birthYear}
                onChange={e => updateForm('birthYear', e.target.value)}
                style={{
                  ...inputStyle, flex: 1.3, padding: '0 8px',
                  ...(errors.birthDate ? { borderColor: '#dc2626' } : {}),
                }}
              >
                <option value="">Año</option>
                {Array.from({ length: 100 }, (_, i) => {
                  const y = new Date().getFullYear() - i;
                  return <option key={y} value={String(y)}>{y}</option>;
                })}
              </select>
            </div>
            {errors.birthDate && <p style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>{errors.birthDate}</p>}
          </div>

          {/* Terms checkbox */}
          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            cursor: 'pointer', fontSize: 13, color: '#78716c',
            fontFamily: 'inherit', lineHeight: 1.5,
          }}>
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={e => {
                setTermsAccepted(e.target.checked);
                if (errors.terms) setErrors(prev => ({ ...prev, terms: '' }));
              }}
              style={{
                width: 18, height: 18, marginTop: 2,
                accentColor: '#0c0a09',
                cursor: 'pointer', flexShrink: 0,
              }}
            />
            <span>
              Acepto los{' '}
              <Link to="/terms" style={{ color: '#0c0a09', textDecoration: 'underline' }}>
                Términos y condiciones
              </Link>
              {' '}y la{' '}
              <Link to="/privacy" style={{ color: '#0c0a09', textDecoration: 'underline' }}>
                Política de privacidad
              </Link>
            </span>
          </label>
          {errors.terms && <p style={{ fontSize: 12, color: '#dc2626', marginTop: -6 }}>{errors.terms}</p>}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!canSubmit || isLoading}
          style={{
            width: '100%', height: 48, marginTop: 24,
            background: canSubmit ? '#0c0a09' : '#78716c',
            color: '#ffffff',
            border: 'none', borderRadius: '14px',
            fontSize: 15, fontWeight: 600,
            cursor: canSubmit && !isLoading ? 'pointer' : 'not-allowed',
            opacity: canSubmit ? 1 : 0.5,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontFamily: 'inherit',
            transition: 'all 0.15s ease',
          }}
        >
          {isLoading ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : 'Crear cuenta'}
        </button>
      </form>

      {/* Footer */}
      <p style={{
        textAlign: 'center', marginTop: 24,
        fontSize: '14px', color: '#78716c',
        fontFamily: 'inherit',
      }}>
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" style={{ color: '#0c0a09', fontWeight: 600, textDecoration: 'none' }}>
          Entrar
        </Link>
      </p>
    </>
  );
}
