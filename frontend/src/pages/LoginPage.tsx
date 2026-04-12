// @ts-nocheck
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { authApi, getAuthErrorMessage } from '../lib/authApi';
import { setToken } from '../lib/auth';
import { useTranslation } from 'react-i18next';
import { initGoogleSignIn, initAppleSignIn, isHybridApp, setupDeepLinkListener } from '../lib/mobileAuth';

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
  const { login, checkAuth } = useAuth();
  const { t } = useTranslation();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [loginError, setLoginError] = useState('');
  const [oauthLoading, setOauthLoading] = useState({ google: false, apple: false });
  const [googleAuthConfigured, setGoogleAuthConfigured] = useState(true);
  const [appleAuthConfigured, setAppleAuthConfigured] = useState(true);

  const intendedRoute = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const raw = params.get('redirect') || params.get('next') || location.state?.from?.pathname || null;
    // Only allow relative paths to prevent open redirect attacks
    if (raw && raw.startsWith('/') && !raw.startsWith('//')) return raw;
    return null;
  }, [location.search, location.state]);

  const addAccount = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('add_account') === 'true';
  }, [location.search]);

  const sessionExpired = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const v = params.get('expired');
    return v === '1' || v === 'true';
  }, [location.search]);

  // Setup deep link listener for OAuth callbacks
  useEffect(() => {
    const cleanup = setupDeepLinkListener({
      onAuthSuccess: async ({ token }) => {
        // Token received from deep link, validate it
        if (token) {
          setToken(token);
          const user = await checkAuth();
          if (user) {
            toast.success(t('login.bienvenido', 'Bienvenido'));
            if (!user.onboarding_completed) {
              navigate('/onboarding', { replace: true });
            } else {
              const dest = ROLE_DESTINATIONS[user.role] || '/';
              navigate(dest, { replace: true });
            }
          }
        }
      },
      onAuthError: (error) => {
        toast.error(error.message || t('login.errorDeAutenticacion', 'Error de autenticación'));
      },
    });

    return cleanup;
  }, [checkAuth, navigate, t]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const data = await authApi.getGoogleAuthStatus();
        if (!mounted) return;
        setGoogleAuthConfigured(Boolean(data?.configured));
      } catch {
        if (!mounted) return;
        // Keep enabled as fallback for older backends.
        setGoogleAuthConfigured(true);
      }

      try {
        const data = await authApi.getAppleAuthStatus();
        if (!mounted) return;
        setAppleAuthConfigured(Boolean(data?.configured));
      } catch {
        if (!mounted) return;
        // Keep enabled as fallback for older backends.
        setAppleAuthConfigured(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const validate = () => {
    const e = {};
    if (!formData.email.trim()) e.email = t('login.elEmailEsObligatorio', 'El email es obligatorio');
    if (!formData.password) e.password = t('login.laContrasenaEsObligatoria', 'La contraseña es obligatoria');
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
        // GDPR 4.1: Show reactivation toast if account was pending deletion
        if (data.reactivated) {
          const { toast } = await import('sonner');
          toast.success('Tu cuenta ha sido reactivada.');
        }

        // setToken stores the token in localStorage (TOKEN_KEY) for API client Bearer headers.
        // AuthContext.login() only stores it in hsp_accounts — this call is NOT redundant.
        if (data.session_token || data.access_token) {
          setToken(data.session_token || data.access_token, data.refresh_token);
        }

        if (addAccount) {
          let accounts = [];
          try { accounts = JSON.parse(localStorage.getItem('hsp_accounts') || '[]'); } catch { accounts = []; }
          const userId = data.user.user_id || data.user.id;
          const newToken = data.session_token || data.access_token || localStorage.getItem('hsp_token') || '';
          const idx = accounts.findIndex(a => String(a.user_id) === String(userId));
          const accObj = {
            token: newToken,
            user_id: userId,
            username: data.user.username,
            name: data.user.name || data.user.full_name,
            avatar_url: data.user.profile_image || data.user.avatar_url || data.user.picture,
            email: data.user.email,
            role: data.user.role,
          };
          if (idx >= 0) accounts[idx] = accObj;
          else accounts.push(accObj);
          localStorage.setItem('hsp_accounts', JSON.stringify(accounts));
          // Skip onboarding — this is an existing user adding their account
          navigate('/', { replace: true });
          return;
        }

        // O-01: Check onboarding BEFORE intendedRoute to prevent bypassing setup
        if (!data.user.role) {
          navigate('/onboarding', { replace: true });
          return;
        }

        if (data.user.role === 'customer' && !data.user.onboarding_completed) {
          navigate('/onboarding', { replace: true });
          return;
        }

        if (intendedRoute) {
          navigate(intendedRoute, { replace: true });
          return;
        }

        const dest = ROLE_DESTINATIONS[data.user.role] || '/';
        navigate(dest, { replace: true });
      }
    } catch (error) {
      const status = error?.response?.status;
      if (status === 401) {
        setLoginError(t('login.emailOContrasenaIncorrectos', 'Email o contraseña incorrectos'));
      } else if (status === 403) {
        const detail = error?.response?.data?.detail;
        if (typeof detail === 'string' && detail.includes('16')) {
          setLoginError(t('login.tuCuentaEstaRestringidaPorEdad', 'Tu cuenta está restringida por edad'));
        } else {
          setLoginError(getAuthErrorMessage(error, 'Acceso denegado'));
        }
      } else {
        const msg = getAuthErrorMessage(error, t('login.noHemosPodidoIniciarTuSesion', 'No hemos podido iniciar tu sesión.'));
        setLoginError(msg);
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!googleAuthConfigured) {
      toast.info(t('login.googleNoDisponible', 'Google no está disponible temporalmente.'));
      return;
    }

    setOauthLoading(prev => ({ ...prev, google: true }));
    try {
      await initGoogleSignIn({
        onSuccess: async (data) => {
          if (data?.token) {
            setToken(data.token);
            const user = await checkAuth();
            if (user) {
              toast.success(t('login.bienvenido', 'Bienvenido'));
              if (!user.onboarding_completed) {
                navigate('/onboarding', { replace: true });
              } else {
                const dest = ROLE_DESTINATIONS[user.role] || '/';
                navigate(dest, { replace: true });
              }
            }
          }
        },
        onError: (error) => {
          toast.error(getAuthErrorMessage(error, t('login.errorAlIniciarSesionConGoogle', 'Error al iniciar sesión con Google.')));
        },
        onCancel: () => {
          // User cancelled, no error message needed
        },
      });
    } catch (error) {
      // Fallback to legacy method
      try {
        const data = await authApi.getGoogleAuthUrl();
        if (data.auth_url && (data.auth_url.startsWith('https://') || data.auth_url.startsWith('http://'))) {
          window.location.href = data.auth_url;
        } else {
          toast.error(t('login.errorAlIniciarSesionConGoogle', 'Error al iniciar sesión con Google.'));
        }
      } catch (fallbackError) {
        toast.error(getAuthErrorMessage(fallbackError, t('register.errorAlConectarConGoogle', 'Error al conectar con Google.')));
      }
    } finally {
      setOauthLoading(prev => ({ ...prev, google: false }));
    }
  };

  const handleAppleLogin = async () => {
    if (!appleAuthConfigured) {
      toast.info(t('login.appleSignInNoDisponible', 'Apple Sign-In no está disponible en este momento.'));
      return;
    }

    setOauthLoading(prev => ({ ...prev, apple: true }));
    try {
      await initAppleSignIn({
        onSuccess: async (data) => {
          if (data?.token || data?.session_token) {
            setToken(data.token || data.session_token, data.refresh_token);
            const user = await checkAuth();
            if (user) {
              toast.success(t('login.bienvenido', 'Bienvenido'));
              if (!user.onboarding_completed) {
                navigate('/onboarding', { replace: true });
              } else {
                const dest = ROLE_DESTINATIONS[user.role] || '/';
                navigate(dest, { replace: true });
              }
            }
          }
        },
        onError: (error) => {
          toast.error(getAuthErrorMessage(error, t('login.errorAlIniciarSesionConApple', 'Error al iniciar sesión con Apple.')));
        },
      });
    } catch (error) {
      // Apple Sign-In may not be fully configured yet
      toast.error(t('login.appleSignInNoDisponible', 'Apple Sign-In no está disponible en este momento.'));
    } finally {
      setOauthLoading(prev => ({ ...prev, apple: false }));
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
    if (loginError) setLoginError('');
  };

  const isHybrid = isHybridApp();

  return (
    <>
      {/* Heading */}
      <h1 className="text-2xl font-bold tracking-tight text-stone-950 text-center mb-1">
        Bienvenido
      </h1>
      <p className="text-sm text-stone-500 text-center mb-8">
        Entra en tu cuenta
      </p>

      {/* Session expired message */}
      {sessionExpired && (
        <p className="text-sm text-stone-950 text-center px-4 py-3 mb-6 bg-stone-100 rounded-2xl">
          Tu sesión ha expirado. Inicia sesión de nuevo.
        </p>
      )}

      {/* Hybrid app indicator (debug) */}
      {process.env.NODE_ENV === 'development' && isHybrid && (
        <p className="text-xs text-stone-400 text-center mb-4">
          Modo app móvil detectado
        </p>
      )}

      {/* Social login — Google */}
      <motion.button
        type="button"
        onClick={handleGoogleLogin}
        disabled={oauthLoading.google || !googleAuthConfigured}
        aria-label="Continuar con Google"
        className="w-full flex items-center justify-center gap-3 px-4 h-12 mb-3 bg-white border border-stone-200 rounded-full text-sm font-medium text-stone-950 hover:bg-stone-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        whileTap={{ scale: 0.97 }}
      >
        {oauthLoading.google ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
        )}
        {oauthLoading.google ? 'Conectando...' : 'Continuar con Google'}
      </motion.button>
      {!googleAuthConfigured && (
        <p className="text-xs text-stone-500 text-center mb-4">
          {t('login.googleNoDisponible', 'Google no está disponible temporalmente.')}
        </p>
      )}

      {/* Social login — Apple */}
      <motion.button
        type="button"
        onClick={handleAppleLogin}
        disabled={oauthLoading.apple || !appleAuthConfigured}
        aria-label="Continuar con Apple"
        className="w-full flex items-center justify-center gap-3 px-4 h-12 mb-6 bg-stone-950 text-white rounded-full text-sm font-medium hover:bg-stone-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        whileTap={{ scale: 0.97 }}
      >
        {oauthLoading.apple ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <svg width="16" height="18" viewBox="0 0 17 20" fill="currentColor" aria-hidden="true">
            <path d="M13.54 10.58c-.01-1.63.72-2.86 2.2-3.76-.83-1.2-2.08-1.86-3.72-1.98-1.56-.12-3.27.92-3.89.92-.66 0-2.13-.88-3.27-.88C2.78 4.92.5 6.88.5 10.79c0 1.15.21 2.34.63 3.57.56 1.62 2.58 5.6 4.7 5.54 1.1-.03 1.87-.78 3.28-.78 1.36 0 2.08.78 3.27.76 2.15-.04 3.94-3.63 4.47-5.25-2.85-1.35-2.82-3.96-2.8-4.05zM11.04 3.45C12.22 2.06 12.1.8 12.07.5c-1.07.06-2.31.74-3.03 1.57-.78.88-1.24 1.97-1.14 3.2 1.17.09 2.24-.53 3.14-1.82z" />
          </svg>
        )}
        {oauthLoading.apple ? 'Conectando...' : 'Continuar con Apple'}
      </motion.button>
      {!appleAuthConfigured && (
        <p className="text-xs text-stone-500 text-center mb-4">
          {t('login.appleSignInNoDisponible', 'Apple Sign-In no está disponible en este momento.')}
        </p>
      )}

      {/* Divider */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 h-px bg-stone-200" />
        <span className="text-xs text-stone-400">{t('login.oContinuaConEmail', 'o continúa con email')}</span>
        <div className="flex-1 h-px bg-stone-200" />
      </div>

      {/* Form */}
      <motion.form
        onSubmit={handleSubmit}
        noValidate
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.35 }}
        className="flex flex-col gap-4"
      >
        {/* Email */}
        <div>
          <label className="block text-xs font-semibold text-stone-950 mb-1.5 tracking-wide uppercase">
            Email o usuario
          </label>
          <input
            type="text"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="hola@ejemplo.com"
            autoComplete="email"
            className={`w-full h-12 px-4 text-[15px] text-stone-950 placeholder:text-stone-400 bg-white border rounded-xl outline-none transition-colors ${
              errors.email
                ? 'border-stone-500'
                : 'border-stone-200 focus:border-stone-400'
            }`}
          />
          {errors.email && (
            <p className="text-xs text-stone-600 mt-1.5">{errors.email}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-semibold text-stone-950 mb-1.5 tracking-wide uppercase">
            Contraseña
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              placeholder={t('login.tuContrasena', 'Tu contraseña')}
              autoComplete="current-password"
              className={`w-full h-12 px-4 pr-11 text-[15px] text-stone-950 placeholder:text-stone-400 bg-white border rounded-xl outline-none transition-colors ${
                errors.password
                  ? 'border-stone-500'
                  : 'border-stone-200 focus:border-stone-400'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-950 transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? t('login.ocultarContrasena', 'Ocultar contraseña') : t('login.mostrarContrasena', 'Mostrar contraseña')}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-stone-600 mt-1.5">{errors.password}</p>
          )}
          <div className="text-right mt-2">
            <Link
              to="/forgot-password"
              className="text-xs text-stone-500 hover:text-stone-950 transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </div>

        {/* Login error */}
        <AnimatePresence mode="wait">
          {loginError && (
            <motion.p
              key={loginError}
              className="text-sm text-stone-950 text-center px-4 py-3 bg-stone-100 rounded-2xl"
              animate={{ x: [0, -6, 6, -4, 4, 0] }}
              transition={{ duration: 0.4 }}
            >
              {loginError}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Submit */}
        <motion.button
          type="submit"
          disabled={loading}
          className="w-full bg-stone-950 text-white h-12 rounded-full font-semibold text-[15px] flex items-center justify-center gap-2 hover:bg-stone-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : 'Entrar'}
        </motion.button>
      </motion.form>

      {/* Footer */}
      <p className="text-center mt-6 text-sm text-stone-500">
        ¿No tienes cuenta?{' '}
        <Link
          to="/register"
          className="text-stone-950 font-semibold hover:underline"
        >
          Regístrate
        </Link>
      </p>
    </>
  );
}
