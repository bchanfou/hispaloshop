import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { authApi, getAuthErrorMessage } from '../lib/authApi';
import { setToken } from '../lib/auth';

const ROLE_DESTINATIONS = {
  customer:    '/',
  producer:    '/producer',
  importer:    '/importer/dashboard',
  influencer:  '/influencer/dashboard',
  admin:       '/admin',
  super_admin: '/super-admin',
};

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [loginError, setLoginError] = useState('');

  const intendedRoute = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('redirect') || params.get('next') || location.state?.from?.pathname || null;
  }, [location.search, location.state]);

  const addAccount = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('add_account') === 'true';
  }, [location.search]);

  const validate = () => {
    const e = {};
    if (!formData.email.trim()) e.email = 'El email es obligatorio';
    if (!formData.password) e.password = 'La contraseña es obligatoria';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    if (!validate()) return;
    setLoading(true);

    try {
      const data = await login({
        email: formData.email.trim(),
        password: formData.password,
      });

      if (data?.user) {
        // Save token for API client Bearer header — cookie is set automatically by server
        // NOTE: token in localStorage is accessible via XSS; cookie (httpOnly) is not.
        // This is kept for backward compatibility with the Bearer auth path.
        if (data.session_token) {
          setToken(data.session_token);
        }

        // Multi-account support
        if (addAccount) {
          let accounts = [];
          try { accounts = JSON.parse(localStorage.getItem('hsp_accounts') || '[]'); } catch { accounts = []; }
          const userId = data.user.user_id || data.user.id;
          if (!accounts.find(a => a.user_id === userId)) {
            accounts.push({ user_id: userId, email: data.user.email, name: data.user.name });
            localStorage.setItem('hsp_accounts', JSON.stringify(accounts));
          }
        }

        // Redirect logic
        if (intendedRoute) {
          navigate(intendedRoute, { replace: true });
          return;
        }

        if (!data.user.role) {
          navigate('/onboarding', { replace: true });
          return;
        }

        if (data.user.role === 'customer' && !data.user.onboarding_completed) {
          navigate('/onboarding', { replace: true });
          return;
        }

        const dest = ROLE_DESTINATIONS[data.user.role] || '/';
        navigate(dest, { replace: true });
      }
    } catch (error) {
      const status = error?.response?.status;
      if (status === 401) {
        setLoginError('Email o contraseña incorrectos');
      } else if (status === 403) {
        const detail = error?.response?.data?.detail;
        if (typeof detail === 'string' && detail.includes('16')) {
          setLoginError('Tu cuenta está restringida por edad');
        } else {
          setLoginError(getAuthErrorMessage(error, 'Acceso denegado'));
        }
      } else {
        const msg = getAuthErrorMessage(error, 'No hemos podido iniciar tu sesión.');
        setLoginError(msg);
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const data = await authApi.getGoogleAuthUrl();
      if (data.auth_url) {
        window.location.href = data.auth_url;
      } else {
        toast.error('Error al iniciar sesión con Google.');
      }
    } catch (error) {
      toast.error(getAuthErrorMessage(error, 'Error al conectar con Google.'));
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
    if (loginError) setLoginError('');
  };

  const inputStyle = {
    width: '100%', height: 48, padding: '0 16px',
    fontSize: 15, fontFamily: 'var(--font-sans)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    background: 'var(--color-white)',
    color: 'var(--color-black)',
    outline: 'none',
    transition: 'var(--transition-fast)',
  };

  const labelStyle = {
    display: 'block', fontSize: 13, fontWeight: 600,
    color: 'var(--color-black)', marginBottom: 6,
    fontFamily: 'var(--font-sans)',
  };

  return (
    <>
      {/* Header */}
      <h1 style={{
        fontSize: 'var(--text-2xl, 24px)', fontWeight: 600,
        color: 'var(--color-black)', textAlign: 'center',
        margin: 0, fontFamily: 'var(--font-sans)',
      }}>
        Bienvenido
      </h1>
      <p style={{
        fontSize: 'var(--text-base, 16px)', color: 'var(--color-stone)',
        textAlign: 'center', marginTop: 4, marginBottom: 32,
        fontFamily: 'var(--font-sans)',
      }}>
        Entra en tu cuenta
      </p>

      {/* Google OAuth */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        style={{
          width: '100%', height: 48,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          background: 'var(--color-white)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          fontSize: 15, fontWeight: 600,
          color: 'var(--color-black)',
          cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
          transition: 'var(--transition-fast)',
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
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        margin: '20px 0',
      }}>
        <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
        <span style={{ fontSize: 13, color: 'var(--color-stone)', fontFamily: 'var(--font-sans)' }}>o</span>
        <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        {/* Email */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Email o usuario</label>
          <input
            type="text"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="hola@ejemplo.com"
            autoComplete="email"
            style={{
              ...inputStyle,
              ...(errors.email ? { borderColor: 'var(--color-red)' } : {}),
            }}
          />
          {errors.email && (
            <p style={{ fontSize: 12, color: 'var(--color-red)', marginTop: 4 }}>{errors.email}</p>
          )}
        </div>

        {/* Password */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Contraseña</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              placeholder="Tu contraseña"
              autoComplete="current-password"
              style={{
                ...inputStyle,
                paddingRight: 48,
                ...(errors.password ? { borderColor: 'var(--color-red)' } : {}),
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute', right: 14, top: '50%',
                transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-stone)', padding: 4, display: 'flex',
              }}
              tabIndex={-1}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && (
            <p style={{ fontSize: 12, color: 'var(--color-red)', marginTop: 4 }}>{errors.password}</p>
          )}
          <div style={{ textAlign: 'right', marginTop: 8 }}>
            <Link
              to="/forgot-password"
              style={{
                fontSize: 'var(--text-sm, 14px)', color: 'var(--color-stone)',
                textDecoration: 'none', fontFamily: 'var(--font-sans)',
              }}
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </div>

        {/* Login error */}
        {loginError && (
          <p style={{
            fontSize: 13, color: 'var(--color-red)',
            textAlign: 'center', padding: '10px 14px', marginBottom: 16,
            background: 'var(--color-red-light)',
            borderRadius: 'var(--radius-md)',
            fontFamily: 'var(--font-sans)',
          }}>
            {loginError}
          </p>
        )}

        {/* Submit */}
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
            transition: 'var(--transition-fast)',
          }}
        >
          {loading ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : 'Entrar'}
        </button>
      </form>

      {/* Footer */}
      <p style={{
        textAlign: 'center', marginTop: 24,
        fontSize: 'var(--text-sm, 14px)', color: 'var(--color-stone)',
        fontFamily: 'var(--font-sans)',
      }}>
        ¿No tienes cuenta?{' '}
        <Link
          to="/register"
          style={{ color: 'var(--color-black)', fontWeight: 600, textDecoration: 'none' }}
        >
          Crear cuenta
        </Link>
      </p>
    </>
  );
}
