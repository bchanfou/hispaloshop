import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Lock, AtSign } from 'lucide-react';
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

      toast.success(t('auth.loginSuccess'));
    } catch (error) {
      toast.error(getAuthErrorMessage(error, t('auth.loginError')));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      // Use our own Google OAuth endpoint
      const data = await authApi.getGoogleAuthUrl();
      if (data.auth_url) {
        window.location.href = data.auth_url;
      } else {
        toast.error('Error al iniciar sesión con Google');
      }
    } catch (error) {
      console.error('Google login error:', error);
      toast.error('Error al conectar con Google');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="md:hidden sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-stone-200 safe-area-top">
        <div className="flex items-center h-14 px-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 -ml-2 text-text-primary hover:bg-stone-100 rounded-full transition-colors"
            data-testid="mobile-back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center text-sm font-medium text-text-primary pr-8">
            {t('auth.login', 'Iniciar sesion')}
          </h1>
        </div>
      </div>

      <div className="hidden md:block">
        <Header />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-6 md:py-12">
        <div className="w-full max-w-md">
          <div className="bg-white p-6 md:p-8 rounded-2xl border border-stone-200 shadow-sm" data-testid="login-form">
            <div className="flex items-center justify-center gap-2 mb-1 md:mb-2">
              <img src="/logo.png" alt="Hispaloshop" className="w-8 h-8 object-contain" />
              <h1 className="font-heading text-2xl md:text-3xl font-bold text-text-primary" data-testid="login-title">
                {t('auth.welcomeBack', 'Bienvenido')}
              </h1>
            </div>
            <p className="text-sm md:text-base text-text-secondary text-center mb-6 md:mb-8">
              {t('auth.signInToAccount', 'Inicia sesion para acceder a tu cuenta')}
            </p>

            <div className="flex gap-2 mb-5 md:mb-6">
              <button
                type="button"
                onClick={() => setLoginMethod('email')}
                className={`flex-1 py-3 md:py-2 rounded-xl md:rounded-lg font-medium transition-colors text-sm md:text-base ${
                  loginMethod === 'email'
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-text-secondary hover:bg-stone-200 active:bg-stone-300'
                }`}
                data-testid="email-tab"
              >
                {t('auth.email')}
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod('google')}
                className={`flex-1 py-3 md:py-2 rounded-xl md:rounded-lg font-medium transition-colors text-sm md:text-base ${
                  loginMethod === 'google'
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-text-secondary hover:bg-stone-200 active:bg-stone-300'
                }`}
                data-testid="google-tab"
              >
                Google
              </button>
            </div>

            {loginMethod === 'email' ? (
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-sm font-medium">
                    {t('auth.emailOrUsername', 'Email o @usuario')}
                  </Label>
                  <div className="relative mt-2">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted md:hidden" />
                    <Input
                      id="email"
                      type="text"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="pl-10 md:pl-3 h-12 md:h-10 text-base md:text-sm rounded-xl md:rounded-lg"
                      placeholder="tu@email.com o @usuario"
                      data-testid="email-input"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="password" className="text-sm font-medium">
                    {t('auth.password')}
                  </Label>
                  <div className="relative mt-2">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted md:hidden" />
                    <Input
                      id="password"
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="pl-10 md:pl-3 h-12 md:h-10 text-base md:text-sm rounded-xl md:rounded-lg"
                      placeholder="********"
                      data-testid="password-input"
                    />
                  </div>
                  <div className="mt-2 text-right">
                    <Link to="/forgot-password" className="text-sm text-text-muted hover:text-text-primary transition-colors">
                      {t('auth.forgotPassword')}
                    </Link>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-stone-900 hover:bg-stone-800 text-white rounded-full h-12 md:h-11 text-base md:text-sm font-medium shadow-sm hover:shadow-md transition-all duration-300 active:scale-[0.98]"
                  data-testid="email-login-button"
                >
                  {loading ? t('common.loading', 'Cargando...') : t('auth.login')}
                </Button>
              </form>
            ) : (
              <Button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full bg-white hover:bg-stone-50 text-text-primary border border-stone-200 rounded-full h-12 md:h-11 text-base md:text-sm font-medium shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.98]"
                data-testid="google-login-button"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {t('auth.signInWithGoogle')}
              </Button>
            )}

            <div className="mt-6 md:mt-8 text-center">
              <p className="text-sm text-text-muted">
                {t('auth.noAccount')}{' '}
                <Link to="/register" className="text-primary hover:text-primary-hover font-medium" data-testid="register-link">
                  {t('auth.register')}
                </Link>
              </p>
            </div>

            <div className="mt-4 md:mt-6 text-center">
              <Link
                to="/register?role=producer"
                className="inline-block text-sm text-primary hover:text-primary-hover py-2 px-4 rounded-lg hover:bg-primary/5 transition-colors"
                data-testid="producer-signup-link"
              >
                {t('auth.areYouProducer', 'Eres productor? Registrate aqui')}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}
