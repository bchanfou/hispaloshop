// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, Loader2, Lock, CheckCircle } from 'lucide-react';
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
      setError(t('reset_password.enlaceDeRecuperacionNoValido', 'Enlace de recuperación no válido'));
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
      toast.success(t('resetPassword.success', 'Contraseña restablecida correctamente'));

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
      <div className="text-center py-6">
        <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <AlertCircle size={28} className="text-stone-950" />
        </div>
        <h1 className="text-xl font-bold text-stone-950 mb-2">
          {t('resetPassword.invalidLink', 'Enlace no válido')}
        </h1>
        <p className="text-sm text-stone-500 mb-6 leading-relaxed">
          {t('resetPassword.invalidLinkDesc', 'Este enlace de recuperación de contraseña no es válido o ha expirado.')}
        </p>
        <Link
          to="/forgot-password"
          className="flex w-full items-center justify-center rounded-full bg-stone-950 h-12 text-[15px] font-semibold text-white transition-colors hover:bg-stone-800"
        >
          {t('resetPassword.requestNewLink', 'Solicitar nuevo enlace')}
        </Link>
      </div>
    );
  }

  // Success screen
  if (success) {
    return (
      <div className="text-center py-6">
        <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle size={28} className="text-stone-950" />
        </div>
        <h1 className="text-xl font-bold text-stone-950 mb-2">
          {t('resetPassword.passwordUpdated', 'Contraseña actualizada')}
        </h1>
        <p className="text-sm text-stone-500 mb-2">
          {t('resetPassword.passwordUpdatedDesc', 'Tu contraseña ha sido restablecida correctamente.')}
        </p>
        <p className="text-xs text-stone-400 mb-6">
          {t('resetPassword.redirecting', 'Redirigiendo al login...')}
        </p>
        <Link
          to="/login"
          className="flex w-full items-center justify-center rounded-full bg-stone-950 h-12 text-[15px] font-semibold text-white transition-colors hover:bg-stone-800"
        >
          {t('resetPassword.goToLogin', 'Ir al Login')}
        </Link>
      </div>
    );
  }

  // Main form screen
  return (
    <>
      <div className="w-14 h-14 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Lock size={22} className="text-stone-950" />
      </div>

      <h1 className="text-2xl font-bold text-stone-950 mb-1 text-center">
        {t('resetPassword.titleFull', 'Restablecer Contraseña')}
      </h1>
      <p className="text-sm text-stone-500 mb-8 text-center">
        {t('resetPassword.description', 'Ingresa tu nueva contraseña.')}
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-[13px] font-semibold text-stone-950 mb-1.5">
            {t('resetPassword.newPassword', 'Nueva Contraseña')}
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('resetPassword.enterNewPassword', 'Ingresa tu nueva contraseña')}
              required
              minLength={8}
              className="w-full h-12 px-4 pr-11 text-[15px] text-stone-950 placeholder:text-stone-400 bg-white border border-stone-200 rounded-xl outline-none transition-colors focus:border-stone-400"
              data-testid="password-input"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-950 transition-colors"
              aria-label={showPassword ? t('login.ocultarContrasena', 'Ocultar contraseña') : 'Mostrar contraseña'}
              data-testid="toggle-password-btn"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            {t('resetPassword.minChars', 'Mínimo 8 caracteres')}
          </p>
        </div>

        <div>
          <label className="block text-[13px] font-semibold text-stone-950 mb-1.5">
            {t('resetPassword.confirmPassword', 'Confirmar Contraseña')}
          </label>
          <input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder={t('resetPassword.confirmNewPassword', 'Confirma tu nueva contraseña')}
            required
            className="w-full h-12 px-4 text-[15px] text-stone-950 placeholder:text-stone-400 bg-white border border-stone-200 rounded-xl outline-none transition-colors focus:border-stone-400"
            data-testid="confirm-password-input"
          />
        </div>

        {error && (
          <div className="p-3 bg-stone-100 border border-stone-200 rounded-2xl text-sm text-stone-950" data-testid="error-message">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          aria-label={t('reset_password.restablecerContrasena', 'Restablecer contraseña')}
          className="w-full h-12 bg-stone-950 text-white rounded-full text-[15px] font-semibold flex items-center justify-center gap-2 hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          data-testid="submit-btn"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : t('resetPassword.resetButton', 'Restablecer Contraseña')}
        </button>
      </form>
    </>
  );
}
