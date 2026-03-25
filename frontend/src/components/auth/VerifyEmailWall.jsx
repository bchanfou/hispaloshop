import React, { useState, useEffect, useRef } from 'react';
import { Mail, RefreshCw, CheckCircle, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../services/api/client';

export default function VerifyEmailWall({ email, onVerified, onLogout }) {
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
        if (prev <= 1) { clearInterval(cooldownRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(cooldownRef.current);
  }, [cooldown]);

  // Auto-verify when all 6 digits entered
  useEffect(() => {
    const fullCode = code.join('');
    if (fullCode.length === 6 && /^\d{6}$/.test(fullCode)) {
      handleVerify(fullCode);
    }
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
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async (fullCode) => {
    if (isVerifying) return;
    setIsVerifying(true);
    try {
      await apiClient.post(`/auth/verify-email?code=${fullCode}`);
      setVerified(true);
      toast.success('Email verificado correctamente');
      setTimeout(() => onVerified?.(), 1500);
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Codigo incorrecto o expirado';
      toast.error(typeof msg === 'string' ? msg : 'Codigo incorrecto');
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
      toast.success('Codigo reenviado a tu email');
    } catch (err) {
      toast.error('No se pudo reenviar el codigo');
    } finally {
      setIsResending(false);
    }
  };

  const maskedEmail = email
    ? email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => a + '*'.repeat(Math.min(b.length, 6)) + c)
    : '';

  if (verified) {
    return (
      <div className="fixed inset-0 bg-white z-[9999] flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-16 h-16 rounded-full bg-stone-950 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-stone-950 mb-2">Email verificado</h1>
          <p className="text-sm text-stone-500">Entrando a Hispaloshop...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-[9999] flex items-center justify-center">
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
          Hemos enviado un codigo de 6 digitos a<br />
          <span className="font-semibold text-stone-700">{maskedEmail}</span>
        </p>

        {/* 6-digit code input */}
        <div className="flex justify-center gap-2.5 mb-6" onPaste={handlePaste}>
          {code.map((digit, i) => (
            <input
              key={i}
              ref={el => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleDigitChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              className="w-11 h-14 text-center text-xl font-bold text-stone-950 bg-white border-2 border-stone-200 rounded-xl outline-none focus:border-stone-950 transition-colors"
              autoFocus={i === 0}
            />
          ))}
        </div>

        {/* Verifying indicator */}
        {isVerifying && (
          <p className="text-sm text-stone-500 mb-4">Verificando...</p>
        )}

        {/* Resend */}
        <div className="mb-8">
          {resendCount >= 3 ? (
            <p className="text-xs text-stone-400">
              Maximo de reenvios alcanzado. Revisa tu carpeta de spam.
            </p>
          ) : cooldown > 0 ? (
            <p className="text-xs text-stone-400">
              Reenviar en {cooldown}s
            </p>
          ) : (
            <button
              onClick={handleResend}
              disabled={isResending}
              className="text-sm font-semibold text-stone-950 hover:underline disabled:opacity-50 flex items-center gap-1.5 mx-auto"
            >
              <RefreshCw size={14} className={isResending ? 'animate-spin' : ''} />
              Reenviar codigo
            </button>
          )}
          {resendCount > 0 && resendCount < 3 && (
            <p className="text-[11px] text-stone-400 mt-1">
              {3 - resendCount} {3 - resendCount === 1 ? 'reenvio' : 'reenvios'} restante{3 - resendCount === 1 ? '' : 's'}
            </p>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="text-xs text-stone-400 hover:text-stone-600 flex items-center gap-1.5 mx-auto transition-colors"
        >
          <LogOut size={12} />
          Cerrar sesion
        </button>
      </div>
    </div>
  );
}
