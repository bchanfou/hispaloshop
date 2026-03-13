import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { CheckCircle, AlertCircle, Eye, EyeOff, ArrowLeft, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import apiClient from '../services/api/client';

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error(t('resetPassword.minLength', 'La contraseña debe tener al menos 8 caracteres'));
      return;
    }

    if (password !== confirmPassword) {
      toast.error(t('resetPassword.passwordMismatch', 'Las contraseñas no coinciden'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      await apiClient.post('/auth/reset-password', {
        token,
        new_password: password
      });
      setSuccess(true);
      toast.success(t('resetPassword.success', '¡Contraseña restablecida correctamente!'));

      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      const errorMsg = error.message || t('resetPassword.error', 'Error al restablecer la contraseña');
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Invalid token screen
  if (error && !token) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col">
        <div className="md:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 safe-area-top">
          <div className="flex items-center h-14 px-4">
            <button
              onClick={() => navigate('/login')}
              className="p-2 -ml-2 text-stone-950 hover:bg-stone-100 rounded-full transition-colors"
              data-testid="mobile-back-btn"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="flex-1 text-center font-medium text-stone-950 pr-8">
              {t('resetPassword.invalidLink', 'Enlace no válido')}
            </h1>
          </div>
        </div>

        <div className="hidden md:block">
          <Header />
        </div>

        <div className="flex-1 flex items-center justify-center px-4 py-6 md:py-12">
          <div className="w-full max-w-md text-center">
            <div className="bg-white p-6 md:p-8 rounded-[28px] border border-stone-200 shadow-sm" data-testid="invalid-token-card">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                <AlertCircle className="w-8 h-8 md:w-10 md:h-10 text-stone-700" />
              </div>
              <h1 className="text-xl md:text-3xl font-bold text-stone-950 mb-3 md:mb-4">
                {t('resetPassword.invalidLink', 'Enlace no válido')}
              </h1>
              <p className="text-sm md:text-base text-stone-600 mb-6 md:mb-8 px-2">
                {t('resetPassword.invalidLinkDesc', 'Este enlace de recuperación de contraseña no es válido o ha expirado.')}
              </p>
              <Link
                to="/forgot-password"
                className="flex w-full items-center justify-center rounded-full bg-stone-950 h-12 md:h-11 text-base md:text-sm font-medium text-white transition-colors hover:bg-stone-800"
                data-testid="request-new-link-btn"
              >
                {t('resetPassword.requestNewLink', 'Solicitar nuevo enlace')}
              </Link>
            </div>
          </div>
        </div>

        <div className="hidden md:block">
          <Footer />
        </div>
      </div>
    );
  }

  // Success screen
  if (success) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col">
        <div className="md:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 safe-area-top">
          <div className="flex items-center h-14 px-4">
            <div className="w-9"></div>
            <h1 className="flex-1 text-center font-medium text-stone-950">
              {t('resetPassword.successTitle', '¡Listo!')}
            </h1>
            <div className="w-9"></div>
          </div>
        </div>

        <div className="hidden md:block">
          <Header />
        </div>

        <div className="flex-1 flex items-center justify-center px-4 py-6 md:py-12">
          <div className="w-full max-w-md text-center">
            <div className="bg-white p-6 md:p-8 rounded-[28px] border border-stone-200 shadow-sm" data-testid="success-card">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                <CheckCircle className="w-8 h-8 md:w-10 md:h-10 text-stone-700" />
              </div>
              <h1 className="text-2xl md:text-4xl font-bold text-stone-950 mb-3 md:mb-4">
                {t('resetPassword.passwordUpdated', '¡Contraseña actualizada!')}
              </h1>
              <p className="text-sm md:text-base text-stone-600 mb-4 md:mb-6">
                {t('resetPassword.passwordUpdatedDesc', 'Tu contraseña ha sido restablecida correctamente.')}
              </p>
              <p className="text-xs md:text-sm text-stone-500 mb-6 md:mb-8">
                {t('resetPassword.redirecting', 'Redirigiendo al login...')}
              </p>
              <Link
                to="/login"
                className="flex w-full items-center justify-center rounded-full bg-stone-950 h-12 md:h-11 text-base md:text-sm font-medium text-white transition-colors hover:bg-stone-800"
                data-testid="go-to-login-btn"
              >
                {t('resetPassword.goToLogin', 'Ir al Login')}
              </Link>
            </div>
          </div>
        </div>

        <div className="hidden md:block">
          <Footer />
        </div>
      </div>
    );
  }

  // Main form screen
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <div className="md:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 safe-area-top">
        <div className="flex items-center h-14 px-4">
          <button
            onClick={() => navigate('/login')}
            className="p-2 -ml-2 text-stone-950 hover:bg-stone-100 rounded-full transition-colors"
            data-testid="mobile-back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center font-medium text-stone-950 pr-8">
            {t('resetPassword.title', 'Nueva Contraseña')}
          </h1>
        </div>
      </div>

      <div className="hidden md:block">
        <Header />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-6 md:py-12">
        <div className="w-full max-w-md">
          <div className="bg-white p-6 md:p-8 rounded-[28px] border border-stone-200 shadow-sm" data-testid="reset-password-form">
            <div className="md:hidden w-14 h-14 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-stone-950" />
            </div>

            <h1 className="text-xl md:text-3xl font-bold text-stone-950 mb-1 md:mb-2 text-center md:text-left">
              {t('resetPassword.titleFull', 'Restablecer Contraseña')}
            </h1>
            <p className="text-sm md:text-base text-stone-500 mb-6 md:mb-8 text-center md:text-left">
              {t('resetPassword.description', 'Ingresa tu nueva contraseña.')}
            </p>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-stone-950 mb-2">
                  {t('resetPassword.newPassword', 'Nueva Contraseña')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 md:hidden" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('resetPassword.enterNewPassword', 'Ingresa tu nueva contraseña')}
                    required
                    minLength={8}
                    className="w-full pl-10 md:pl-3 pr-10 h-12 md:h-10 rounded-2xl border border-stone-200 bg-white text-base md:text-sm outline-none focus:border-stone-950 transition-colors"
                    data-testid="password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-950 transition-colors"
                    data-testid="toggle-password-btn"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  {t('resetPassword.minChars', 'Mínimo 8 caracteres')}
                </p>
              </div>

              <div className="mb-5 md:mb-6">
                <label className="block text-sm font-medium text-stone-950 mb-2">
                  {t('resetPassword.confirmPassword', 'Confirmar Contraseña')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 md:hidden" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('resetPassword.confirmNewPassword', 'Confirma tu nueva contraseña')}
                    required
                    className="w-full pl-10 md:pl-3 h-12 md:h-10 rounded-2xl border border-stone-200 bg-white text-base md:text-sm outline-none focus:border-stone-950 transition-colors"
                    data-testid="confirm-password-input"
                  />
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-700" data-testid="error-message">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-stone-950 h-12 md:h-11 text-base md:text-sm font-medium text-white transition-colors hover:bg-stone-800 disabled:opacity-50 active:scale-[0.98]"
                data-testid="submit-btn"
              >
                {loading ? t('common.processing', 'Procesando...') : t('resetPassword.resetButton', 'Restablecer Contraseña')}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}
