// @ts-nocheck
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader2, ArrowLeft, Mail } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../services/api/client';
import { getToken } from '../lib/auth';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { trackEvent } from '../utils/analytics';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * VerifyEmailPage — two modes:
 *
 *  1. Query-param mode (?code=XXXXXX): legacy link click from the email.
 *     Auto-verifies immediately and redirects. Backward compatible with the
 *     email template that still ships a "Verificar email" button.
 *
 *  2. Manual-input mode (no query param): 6 single-digit inputs with
 *     auto-advance, paste support, resend-with-cooldown. This is the
 *     primary UX introduced in section 1.1 of the launch roadmap — more
 *     secure than a link (avoids email-client rendering surface) and
 *     friendlier on mobile where copying codes is the norm.
 */
export default function VerifyEmailPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, checkAuth } = useAuth();

  const queryCode = searchParams.get('code') || searchParams.get('token') || '';
  const autoMode = queryCode.length > 0;

  // status: idle | verifying | success | error
  const [status, setStatus] = useState(autoMode ? 'verifying' : 'idle');
  const [message, setMessage] = useState('');
  const [digits, setDigits] = useState(() => Array(CODE_LENGTH).fill(''));
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const inputsRef = useRef([]);

  const verifyCode = useCallback(async (code) => {
    if (!code || code.length !== CODE_LENGTH) {
      setStatus('error');
      setMessage(t('verify_email.invalidCode', 'Código inválido. Debe tener 6 dígitos.'));
      return;
    }
    setStatus('verifying');
    try {
      const data = await apiClient.post(
        `/auth/verify-email?code=${encodeURIComponent(code)}`,
      );
      setStatus('success');
      setMessage(data?.message || t('verify_email.success', 'Email verificado. Bienvenido.'));
      trackEvent('email_verified');
      toast.success(t('verify_email.successToast', 'Email verificado'));
      // Refresh auth context so user.email_verified is up to date
      if (getToken()) {
        try { await checkAuth(); } catch { /* non-critical */ }
      }
      setTimeout(() => {
        const hasSession = Boolean(getToken());
        navigate(hasSession ? '/onboarding' : '/login', { replace: true });
      }, 1400);
    } catch (error) {
      const detail = error?.response?.data?.detail;
      setStatus('error');
      setMessage(typeof detail === 'string' ? detail : t('verify_email.errorGeneric', 'El código no es válido o ha expirado'));
      setDigits(Array(CODE_LENGTH).fill(''));
      // Re-focus first input so the user can retry immediately
      setTimeout(() => inputsRef.current[0]?.focus(), 50);
    }
  }, [checkAuth, navigate, t]);

  // Auto-verify when arriving from an email link
  useEffect(() => {
    if (autoMode) {
      verifyCode(queryCode);
    } else {
      // Focus the first digit input on mount in manual mode
      setTimeout(() => inputsRef.current[0]?.focus(), 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const id = setInterval(() => {
      setResendCooldown((n) => Math.max(0, n - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  const handleDigitChange = (index, rawValue) => {
    const value = rawValue.replace(/\D/g, '').slice(-1); // last digit only
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    if (value && index < CODE_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
    // If all digits are filled, auto-submit
    if (value && index === CODE_LENGTH - 1) {
      const fullCode = next.join('');
      if (fullCode.length === CODE_LENGTH) {
        verifyCode(fullCode);
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = (e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    const next = Array(CODE_LENGTH).fill('');
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    const focusIndex = Math.min(pasted.length, CODE_LENGTH - 1);
    inputsRef.current[focusIndex]?.focus();
    if (pasted.length === CODE_LENGTH) {
      verifyCode(pasted);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    try {
      await apiClient.post('/auth/resend-verification');
      toast.success(t('verify_email.codeSent', 'Código enviado. Revisa tu email.'));
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setStatus('idle');
      setMessage('');
      setDigits(Array(CODE_LENGTH).fill(''));
      setTimeout(() => inputsRef.current[0]?.focus(), 50);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : t('verify_email.resendError', 'No se pudo reenviar el código. Inténtalo de nuevo en unos minutos.'));
    } finally {
      setResending(false);
    }
  };

  const emailHint = user?.email
    ? t('verify_email.sentTo', 'Enviamos un código de 6 dígitos a {{email}}', { email: user.email })
    : t('verify_email.checkInbox', 'Revisa tu email para ver el código de 6 dígitos.');

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {/* Mobile header */}
      <div className="md:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200">
        <div className="flex items-center h-14 px-4">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="p-2 -ml-2 text-stone-950 rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={t('common.back', 'Volver')}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center font-medium text-stone-950 pr-8">
            {status === 'success'
              ? t('verify_email.verified', 'Email verificado')
              : t('verify_email.title', 'Verifica tu email')}
          </h1>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-6 md:py-12">
        <div className="w-full max-w-[420px]">

          {/* SUCCESS card */}
          {status === 'success' && (
            <div
              className="bg-white p-6 md:p-8 rounded-[28px] border border-stone-200 shadow-sm text-center"
              data-testid="verify-success"
            >
              <div className="w-16 h-16 md:w-20 md:h-20 bg-stone-950 ring-8 ring-stone-100 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                <CheckCircle className="w-8 h-8 md:w-10 md:h-10 text-white" strokeWidth={2.5} />
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-stone-950 mb-3">
                {t('verify_email.verified', '¡Email verificado!')}
              </h1>
              <p className="text-sm md:text-base text-stone-600 mb-2">{message}</p>
              <p className="text-xs md:text-sm text-stone-500">
                {t('verify_email.continuing', 'Continuando al onboarding...')}
              </p>
            </div>
          )}

          {/* VERIFYING (auto mode) card */}
          {status === 'verifying' && autoMode && (
            <div
              className="bg-white p-6 md:p-8 rounded-[28px] border border-stone-200 shadow-sm text-center"
              data-testid="verify-loading"
            >
              <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Loader2 className="w-8 h-8 text-stone-950 animate-spin" />
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-stone-950 mb-3">
                {t('verify_email.verifying', 'Verificando tu email...')}
              </h1>
              <p className="text-sm text-stone-500">
                {t('verify_email.hold', 'Un momento, casi estamos.')}
              </p>
            </div>
          )}

          {/* MANUAL INPUT card (idle, verifying-manual, error) */}
          {(status === 'idle' || status === 'error' || (status === 'verifying' && !autoMode)) && (
            <div
              className="bg-white p-6 md:p-8 rounded-[28px] border border-stone-200 shadow-sm"
              data-testid="verify-input"
            >
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-7 h-7 text-stone-950" />
                </div>
                <h1 className="text-xl md:text-2xl font-bold text-stone-950 mb-2">
                  {t('verify_email.title', 'Verifica tu email')}
                </h1>
                <p className="text-sm text-stone-500">{emailHint}</p>
              </div>

              {/* 6-digit inputs */}
              <div
                className="flex items-center justify-center gap-2 md:gap-3 mb-4"
                onPaste={handlePaste}
              >
                {digits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputsRef.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="\d*"
                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    disabled={status === 'verifying'}
                    aria-label={t('verify_email.digitN', 'Dígito {{n}}', { n: index + 1 })}
                    className="w-11 h-14 md:w-12 md:h-14 text-center text-2xl font-bold bg-stone-50 border border-stone-200 rounded-xl text-stone-950 focus:outline-none focus:border-stone-950 focus:bg-white disabled:opacity-50 transition-colors"
                    data-testid={`verify-digit-${index}`}
                  />
                ))}
              </div>

              {/* Error message */}
              {status === 'error' && (
                <div className="flex items-start gap-2 mb-4 p-3 bg-stone-50 border border-stone-200 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-stone-950 shrink-0 mt-0.5" />
                  <p className="text-sm text-stone-950 font-medium">{message}</p>
                </div>
              )}

              {/* Verifying spinner inline */}
              {status === 'verifying' && !autoMode && (
                <div className="flex items-center justify-center gap-2 mb-4 text-stone-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">{t('verify_email.verifying', 'Verificando...')}</span>
                </div>
              )}

              {/* Resend */}
              <div className="text-center mt-6">
                <p className="text-sm text-stone-500 mb-2">
                  {t('verify_email.didntGetIt', '¿No has recibido el código?')}
                </p>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || resending}
                  className="text-sm font-semibold text-stone-950 disabled:text-stone-400 disabled:cursor-not-allowed underline-offset-4 hover:underline"
                  data-testid="verify-resend"
                >
                  {resendCooldown > 0
                    ? t('verify_email.resendIn', 'Reenviar en {{s}}s', { s: resendCooldown })
                    : resending
                      ? t('verify_email.resending', 'Enviando...')
                      : t('verify_email.resend', 'Enviar nuevo código')}
                </button>
              </div>
            </div>
          )}

          {/* Footer link */}
          <div className="text-center mt-6">
            <Link
              to="/login"
              className="text-sm text-stone-500 hover:text-stone-950"
            >
              {t('verify_email.backToLogin', 'Volver al login')}
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
