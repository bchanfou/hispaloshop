import React, { useState, useEffect, useRef } from 'react';
import { Mail, RefreshCw, CheckCircle, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../services/api/client';
import { useTranslation } from 'react-i18next';
import i18n from "../../locales/i18n";
export default function VerifyEmailWall({
  email,
  onVerified,
  onLogout
}) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCount, setResendCount] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const [verified, setVerified] = useState(false);
  const inputRefs = useRef([]);
  const cooldownRef = useRef(null);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    cooldownRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(cooldownRef.current);
  }, [cooldown]);

  // Auto-verify when all 6 digits entered (debounced to prevent duplicate calls on paste)
  const autoVerifyRef = useRef(null);
  useEffect(() => {
    clearTimeout(autoVerifyRef.current);
    const fullCode = code.join('');
    if (fullCode.length === 6 && /^\d{6}$/.test(fullCode)) {
      autoVerifyRef.current = setTimeout(() => handleVerify(fullCode), 50);
    }
    return () => clearTimeout(autoVerifyRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);
  const handleDigitChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newCode = [...code];
      if (code[index]) {
        // Clear current digit
        newCode[index] = '';
        setCode(newCode);
      } else if (index > 0) {
        // Move to previous and clear it
        newCode[index - 1] = '';
        setCode(newCode);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };
  const handlePaste = e => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const newCode = [...code];
      for (let i = 0; i < Math.min(pasted.length, 6); i++) {
        newCode[i] = pasted[i];
      }
      setCode(newCode);
      const focusIdx = Math.min(pasted.length, 5);
      inputRefs.current[focusIdx]?.focus();
    }
  };
  const handleVerify = async fullCode => {
    if (isVerifying) return;
    setIsVerifying(true);
    try {
      await apiClient.post(`/auth/verify-email?code=${encodeURIComponent(fullCode)}`);
      setVerified(true);
      toast.success('Email verificado correctamente');
      setTimeout(() => onVerified?.(), 1500);
    } catch (err) {
      const msg = err?.response?.data?.detail || i18n.t('verify_email_wall.codigoIncorrectoOExpirado', 'Código incorrecto o expirado');
      toast.error(typeof msg === 'string' ? msg : i18n.t('verify_email_wall.codigoIncorrecto', 'Código incorrecto'));
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };
  const handleResend = async () => {
    if (isResending || cooldown > 0 || resendCount >= 3) return;
    setIsResending(true);
    try {
      await apiClient.post('/auth/resend-verification');
      setResendCount(prev => prev + 1);
      setCooldown(60);
      toast.success(i18n.t('verify_email_wall.codigoReenviadoATuEmail', 'Código reenviado a tu email'));
    } catch (err) {
      toast.error(i18n.t('verify_email_wall.noSePudoReenviarElCodigo', 'No se pudo reenviar el código'));
    } finally {
      setIsResending(false);
    }
  };
  const maskedEmail = email ? email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => a + '*'.repeat(Math.min(b.length, 6)) + c) : '';
  if (verified) {
    return <div className="fixed inset-0 bg-white z-[9999] flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-16 h-16 rounded-full bg-stone-950 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-stone-950 mb-2">Email verificado</h1>
          <p className="text-sm text-stone-500">Entrando a Hispaloshop...</p>
        </div>
      </div>;
  }
  return <div className="fixed inset-0 bg-white z-[9999] flex items-center justify-center">
      <div className="w-full max-w-sm px-6 text-center">
        {/* Icon */}
        <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-6">
          <Mail size={28} className="text-stone-950" />
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold text-stone-950 mb-2">
          Verifica tu email
        </h1>
        <p className="text-sm text-stone-500 mb-8 leading-relaxed">
          Hemos enviado un código de 6 dígitos a<br />
          <span className="font-semibold text-stone-950">{maskedEmail}</span>
        </p>

        {/* 6-digit code input */}
        <div className="flex justify-center gap-2.5 mb-6">
          {code.map((digit, i) => <input key={i} ref={el => {
          inputRefs.current[i] = el;
        }} type="text" inputMode="numeric" maxLength={1} value={digit} onChange={e => handleDigitChange(i, e.target.value)} onKeyDown={e => handleKeyDown(i, e)} onPaste={handlePaste} aria-label={`Dígito ${i + 1} de 6`} className="w-11 h-14 text-center text-xl font-bold text-stone-950 bg-white border-2 border-stone-200 rounded-xl outline-none focus:border-stone-950 transition-colors" autoFocus={i === 0} />)}
        </div>

        {/* Verifying indicator */}
        {isVerifying && <p className="text-sm text-stone-500 mb-4">Verificando...</p>}

        {/* Resend */}
        <div className="mb-8">
          {resendCount >= 3 ? <p className="text-xs text-stone-400">
              Máximo de reenvíos alcanzado. Revisa tu carpeta de spam.
            </p> : cooldown > 0 ? <p className="text-xs text-stone-400">
              Reenviar en {cooldown}s
            </p> : <button onClick={handleResend} disabled={isResending} className="text-sm font-semibold text-stone-950 hover:underline disabled:opacity-50 flex items-center gap-1.5 mx-auto min-h-[44px] px-4" aria-label={i18n.t('verify_email_wall.reenviarCodigoDeVerificacion', 'Reenviar código de verificación')}>
              <RefreshCw size={14} className={isResending ? 'animate-spin' : ''} />
              Reenviar código
            </button>}
          {resendCount > 0 && resendCount < 3 && <p className="text-[11px] text-stone-400 mt-1">
              {3 - resendCount} {3 - resendCount === 1 ? 'reenvío' : 'reenvíos'} restante{3 - resendCount === 1 ? '' : 's'}
            </p>}
        </div>

        {/* Logout */}
        <button onClick={onLogout} className="text-xs text-stone-400 hover:text-stone-950 flex items-center gap-1.5 mx-auto transition-colors min-h-[44px] px-4" aria-label={i18n.t('common.logout', 'Cerrar sesión')}>
          <LogOut size={12} />
          Cerrar sesión
        </button>
      </div>
    </div>;
}