import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Lock, Mail } from 'lucide-react';
import { authApi, getAuthErrorMessage } from '../lib/authApi';
import { redirectAfterAuth } from '../lib/navigation';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [loginMethod, setLoginMethod] = useState('email');
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const intendedRoute = useMemo(() => {
    const redirectParam = new URLSearchParams(location.search).get('redirect');
    return redirectParam || location.state?.from?.pathname || null;
  }, [location.search, location.state]);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await login({
        email: formData.email.trim(),
        password: formData.password,
      });

      if (data?.user) {
        if (data.user.role === 'customer' && !data.user.onboarding_completed) {
          navigate('/onboarding', { replace: true });
        } else {
          redirectAfterAuth(data.user, navigate, intendedRoute);
        }
      }

      toast.success(t('auth.loginSuccess', 'Has iniciado sesión correctamente.'));
    } catch (error) {
      toast.error(getAuthErrorMessage(error, t('auth.loginError', 'No hemos podido iniciar tu sesión.')));
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

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
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
        <div className="w-full max-w-md">
          <div className="mb-5 px-1 text-center md:mb-8">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.32em] text-stone-500">
              Acceso
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-stone-950 md:text-4xl">
              Vuelve a tu cuenta
            </h1>
            <p className="mt-3 text-sm leading-6 text-stone-600 md:text-base">
              Entra para seguir comprando con contexto, guardar productores y retomar tus conversaciones.
            </p>
          </div>

          <section
            className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm md:p-8"
            data-testid="login-form"
          >
            <div className="mb-6 flex items-center justify-center gap-3 md:mb-8">
              <img src="/logo.png" alt="Hispaloshop" className="h-9 w-9 object-contain" />
              <div className="text-left">
                <p className="text-sm font-semibold text-stone-950">Hispaloshop</p>
                <p className="text-xs text-stone-500">Comida real, trazabilidad y comunidad</p>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-stone-100 p-1">
              <button
                type="button"
                onClick={() => setLoginMethod('email')}
                className={`rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
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
                className={`rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
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
                <div>
                  <label htmlFor="email" className="text-sm font-medium text-stone-800">
                    {t('auth.emailOrUsername', 'Email o usuario')}
                  </label>
                  <div className="relative mt-2">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                    <input
                      id="email"
                      type="text"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full h-12 rounded-2xl border border-stone-200 bg-white pl-10 text-base outline-none focus:border-stone-950 transition-colors md:h-11 md:text-sm"
                      placeholder="tu@email.com o tu_usuario"
                      data-testid="email-input"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="text-sm font-medium text-stone-800">
                    {t('auth.password', 'Contraseña')}
                  </label>
                  <div className="relative mt-2">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                    <input
                      id="password"
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full h-12 rounded-2xl border border-stone-200 bg-white pl-10 text-base outline-none focus:border-stone-950 transition-colors md:h-11 md:text-sm"
                      placeholder="Introduce tu contraseña"
                      data-testid="password-input"
                    />
                  </div>
                  <div className="mt-2 text-right">
                    <Link
                      to="/forgot-password"
                      className="text-sm text-stone-500 transition-colors hover:text-stone-950"
                    >
                      {t('auth.forgotPassword', '¿Has olvidado tu contraseña?')}
                    </Link>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="h-12 w-full rounded-full bg-stone-950 text-base font-medium text-white transition-colors hover:bg-black disabled:opacity-50 md:h-11 md:text-sm"
                  data-testid="email-login-button"
                >
                  {loading ? t('common.loading', 'Cargando...') : t('auth.login', 'Iniciar sesión')}
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-stone-200 bg-white text-base font-medium text-stone-950 transition-colors hover:bg-stone-50 md:h-11 md:text-sm"
                data-testid="google-login-button"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#1c1917" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#1c1917" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#1c1917" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#1c1917" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {t('auth.signInWithGoogle', 'Entrar con Google')}
              </button>
            )}

            <div className="mt-6 space-y-3 border-t border-stone-200 pt-6 text-center">
              <p className="text-sm text-stone-600">
                {t('auth.noAccount', '¿Aún no tienes cuenta?')}{' '}
                <Link
                  to="/register/new"
                  className="font-medium text-stone-950 transition-colors hover:text-black"
                  data-testid="register-link"
                >
                  {t('auth.register', 'Crear cuenta')}
                </Link>
              </p>
              <p className="text-sm text-stone-600">
                ¿Eres productor?{' '}
                <Link
                  to="/productor"
                  className="font-medium text-stone-950 transition-colors hover:text-black"
                  data-testid="producer-signup-link"
                >
                  Solicita acceso aquí
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
