import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Eye, EyeOff, Lock, Mail, Loader2 } from 'lucide-react';
import { authApi, getAuthErrorMessage } from '../lib/authApi';

const ROLE_DESTINATIONS = {
  customer:    '/feed',
  producer:    '/producer',
  importer:    '/importer/dashboard',
  influencer:  '/influencer/dashboard',
  admin:       '/admin',
  super_admin: '/super-admin',
};

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [loginMethod, setLoginMethod] = useState('email');
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [loginError, setLoginError] = useState('');

  const intendedRoute = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('next') || params.get('redirect') || location.state?.from?.pathname || null;
  }, [location.search, location.state]);

  const validate = () => {
    const e = {};
    if (!formData.email.trim()) {
      e.email = 'El email es obligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim()) && !formData.email.includes('@')) {
      e.email = 'Email no válido';
    }
    if (!formData.password) {
      e.password = 'La contraseña es obligatoria';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleEmailLogin = async (e) => {
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
        toast.success(t('auth.loginSuccess', 'Has iniciado sesión correctamente.'));

        if (intendedRoute) {
          navigate(intendedRoute, { replace: true });
          return;
        }

        if (data.user.role === 'customer' && !data.user.onboarding_completed) {
          navigate('/onboarding', { replace: true });
          return;
        }

        const dest = ROLE_DESTINATIONS[data.user.role] || '/feed';
        navigate(dest, { replace: true });
      }
    } catch (error) {
      const msg = getAuthErrorMessage(error, t('auth.loginError', 'No hemos podido iniciar tu sesión.'));
      setLoginError('Email o contraseña incorrectos');
      toast.error(msg);
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

  return (
    <div className="flex min-h-screen flex-col" style={{ background: 'var(--hs-bg)' }}>
      <div className="safe-area-top sticky top-0 z-40 border-b border-stone-200 bg-white/95 backdrop-blur-md md:hidden">
        <div className="flex h-14 items-center px-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            aria-label="Volver al inicio"
            className="-ml-2 rounded-full p-2 text-stone-950 transition-colors hover:bg-stone-100"
            data-testid="mobile-back-btn"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="pr-8 text-center text-sm font-medium text-stone-950 flex-1">
            {t('auth.login', 'Iniciar sesión')}
          </h1>
        </div>
      </div>

      <div className="hidden md:block">
        <Header />
      </div>

      <main className="flex flex-1 items-center justify-center px-4 py-6 md:py-12">
        <div className="w-full" style={{ maxWidth: 400 }}>
          <section
            className="bg-white p-6 md:p-8"
            style={{
              borderRadius: 'var(--hs-r-xl)',
              border: '0.5px solid var(--hs-border)',
              boxShadow: 'var(--hs-shadow-lg)',
            }}
            data-testid="login-form"
          >
            {/* Logo */}
            <div className="mb-7 text-center">
              <span style={{
                fontSize: 28, fontWeight: 800,
                letterSpacing: '-0.03em',
                color: 'var(--hs-black)',
              }}>
                hispaloshop
              </span>
            </div>

            <h1 style={{
              fontSize: 22, fontWeight: 700,
              letterSpacing: '-0.02em',
              color: 'var(--hs-text-1)',
              marginBottom: 4,
              textAlign: 'center',
            }}>
              Bienvenido
            </h1>
            <p style={{
              fontSize: 15, color: 'var(--hs-text-2)',
              textAlign: 'center', marginBottom: 24,
            }}>
              Inicia sesión para continuar
            </p>

            <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-stone-100 p-1">
              <button
                type="button"
                onClick={() => setLoginMethod('email')}
                className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                  loginMethod === 'email'
                    ? 'bg-stone-950 text-white'
                    : 'text-stone-600 hover:bg-white hover:text-stone-950'
                }`}
                data-testid="email-tab"
              >
                Email
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod('google')}
                className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                  loginMethod === 'google'
                    ? 'bg-stone-950 text-white'
                    : 'text-stone-600 hover:bg-white hover:text-stone-950'
                }`}
                data-testid="google-tab"
              >
                Google
              </button>
            </div>

            {loginMethod === 'email' ? (
              <form onSubmit={handleEmailLogin} className="space-y-4">
                {/* Email */}
                <div>
                  <label htmlFor="email" style={{
                    display: 'block', fontSize: 13, fontWeight: 600,
                    color: 'var(--hs-text-1)', marginBottom: 6,
                  }}>
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    className="hs-input"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="tu@email.com"
                    autoComplete="email"
                    data-testid="email-input"
                    style={errors.email ? { borderColor: 'var(--hs-red)' } : {}}
                  />
                  {errors.email && (
                    <p style={{ fontSize: 12, color: 'var(--hs-red)', marginTop: 4 }}>
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* Password with toggle */}
                <div>
                  <label htmlFor="password" style={{
                    display: 'block', fontSize: 13, fontWeight: 600,
                    color: 'var(--hs-text-1)', marginBottom: 6,
                  }}>
                    Contraseña
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      className="hs-input"
                      value={formData.password}
                      onChange={(e) => handleChange('password', e.target.value)}
                      placeholder="Introduce tu contraseña"
                      autoComplete="current-password"
                      data-testid="password-input"
                      style={{
                        paddingRight: 44,
                        ...(errors.password ? { borderColor: 'var(--hs-red)' } : {}),
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute', right: 12, top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--hs-text-3)', padding: 4,
                      }}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p style={{ fontSize: 12, color: 'var(--hs-red)', marginTop: 4 }}>
                      {errors.password}
                    </p>
                  )}
                  <div className="mt-2 text-right">
                    <Link
                      to="/forgot-password"
                      className="text-sm transition-colors hover:text-stone-950"
                      style={{ color: 'var(--hs-text-2)' }}
                    >
                      {t('auth.forgotPassword', '¿Olvidaste tu contraseña?')}
                    </Link>
                  </div>
                </div>

                {/* Login error */}
                {loginError && (
                  <p style={{
                    fontSize: 13, color: 'var(--hs-red)',
                    textAlign: 'center', padding: '8px 12px',
                    background: 'var(--hs-red-bg)',
                    borderRadius: 'var(--hs-r-md)',
                  }}>
                    {loginError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="hs-btn-primary"
                  style={{ width: '100%', height: 48 }}
                  data-testid="email-login-button"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    t('auth.login', 'Iniciar sesión')
                  )}
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="hs-btn-secondary"
                style={{ width: '100%', height: 48 }}
                data-testid="google-login-button"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#0A0A0A" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#0A0A0A" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#0A0A0A" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#0A0A0A" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {t('auth.signInWithGoogle', 'Entrar con Google')}
              </button>
            )}

            {/* Separator + register link */}
            <div className="mt-6 border-t pt-6 text-center" style={{ borderColor: 'var(--hs-border)' }}>
              <p style={{ fontSize: 14, color: 'var(--hs-text-2)' }}>
                ¿Aún no tienes cuenta?{' '}
                <Link
                  to="/register"
                  style={{ color: 'var(--hs-black)', fontWeight: 600, textDecoration: 'none' }}
                  data-testid="register-link"
                >
                  Crear cuenta →
                </Link>
              </p>
            </div>
          </section>
        </div>
      </main>

      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}
