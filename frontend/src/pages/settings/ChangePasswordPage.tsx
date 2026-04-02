// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api/client';
import { useTranslation } from 'react-i18next';

function getStrength(pw) {
  if (!pw || pw.length < 6) return { level: 0, label: 'Muy corta', weak: true };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 1, label: 'Debil', weak: true };
  if (score === 2) return { level: 2, label: 'Buena', weak: false };
  return { level: 3, label: 'Fuerte', weak: false };
}

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [current, setCurrent] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isGoogleUser = user?.auth_provider === 'google' && !user?.has_password;
  const strength = useMemo(() => getStrength(newPw), [newPw]);
  const mismatch = confirm.length > 0 && newPw !== confirm;

  const canSubmit = isGoogleUser
    ? newPw.length >= 6 && strength.level >= 2 && newPw === confirm
    : current.length > 0 && newPw.length >= 6 && strength.level >= 2 && newPw === confirm;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      if (isGoogleUser) {
        await apiClient.post('/auth/add-password', { new_password: newPw });
      } else {
        await apiClient.put('/customer/password', {
          current_password: current,
          new_password: newPw,
        });
      }
      toast.success(t('change_password.contrasenaActualizada', 'Contraseña actualizada'));
      navigate('/settings');
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401) {
        toast.error(t('change_password.contrasenaActualIncorrecta', 'Contraseña actual incorrecta'));
      } else {
        toast.error(err?.response?.data?.detail || t('change_password.errorAlCambiarContrasena', 'Error al cambiar contraseña'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const eyeBtn = (show, toggle) => (
    <button
      onClick={toggle}
      aria-label={show ? t('login.ocultarContrasena', 'Ocultar contraseña') : 'Mostrar contraseña'}
      className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer p-1 flex"
    >
      {show ? <EyeOff size={18} className="text-stone-500" /> : <Eye size={18} className="text-stone-500" />}
    </button>
  );

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Topbar */}
      <div className="sticky top-0 z-40 bg-white border-b border-stone-200 flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => navigate('/settings')}
          className="bg-transparent border-none cursor-pointer p-1 flex"
        >
          <ArrowLeft size={22} className="text-stone-950" />
        </button>
        <span className="text-[17px] font-bold text-stone-950">{t('auth.password', 'Contraseña')}</span>
      </div>

      <div className="max-w-[400px] mx-auto px-4 pt-6 pb-[100px]">
        {/* Google user card */}
        {isGoogleUser && (
          <div className="bg-stone-100 shadow-sm rounded-2xl p-4 mb-6">
            <p className="text-sm font-semibold text-stone-950 mb-1">
              Cuenta con Google
            </p>
            <p className="text-[13px] text-stone-500 leading-relaxed">
              Tu cuenta usa Google para iniciar sesión. No tienes contraseña configurada.
              Puedes añadir una a continuación.
            </p>
          </div>
        )}

        {/* Current password (skip for Google users) */}
        {!isGoogleUser && (
          <div className="mb-5">
            <label className="text-[13px] font-semibold text-stone-950 mb-1.5 block">
              Contraseña actual
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={current}
                onChange={e => setCurrent(e.target.value)}
                className="w-full h-12 px-3.5 pr-11 border border-stone-200 rounded-xl text-sm text-stone-950 outline-none focus:border-stone-400 transition-colors box-border"
              />
              {eyeBtn(showCurrent, () => setShowCurrent(!showCurrent))}
            </div>
          </div>
        )}

        {/* New password */}
        <div className="mb-5">
          <label className="text-[13px] font-semibold text-stone-950 mb-1.5 block">
            Nueva contraseña
          </label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              value={newPw}
              onChange={e => setNewPw(e.target.value)}
              className="w-full h-12 px-3.5 pr-11 border border-stone-200 rounded-xl text-sm text-stone-950 outline-none focus:border-stone-400 transition-colors box-border"
            />
            {eyeBtn(showNew, () => setShowNew(!showNew))}
          </div>
          {/* Strength indicator */}
          {newPw.length > 0 && (
            <div className="mt-2">
              <div className="flex gap-1 mb-1">
                {[0, 1, 2, 3].map(i => (
                  <div
                    key={i}
                    className={`flex-1 h-[3px] rounded-sm transition-all duration-300 ease-out ${
                      i <= strength.level
                        ? strength.weak ? 'bg-stone-500' : 'bg-stone-950'
                        : 'bg-stone-200'
                    }`}
                  />
                ))}
              </div>
              <p className={`text-xs ${strength.weak ? 'text-stone-500' : 'text-stone-950'}`}>
                {strength.label}
              </p>
            </div>
          )}
        </div>

        {/* Confirm password */}
        <div className="mb-6">
          <label className="text-[13px] font-semibold text-stone-950 mb-1.5 block">
            Repetir nueva contraseña
          </label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className={`w-full h-12 px-3.5 pr-11 border rounded-xl text-sm text-stone-950 outline-none focus:border-stone-400 transition-colors box-border ${
                mismatch ? 'border-stone-950' : 'border-stone-200'
              }`}
            />
            {eyeBtn(showConfirm, () => setShowConfirm(!showConfirm))}
          </div>
          {mismatch && (
            <p className="text-xs text-stone-600 mt-1">
              Las contraseñas no coinciden
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className={`w-full h-12 rounded-full text-[15px] font-semibold flex items-center justify-center gap-2 transition-colors ${
            canSubmit && !submitting
              ? 'bg-stone-950 text-white cursor-pointer hover:bg-stone-800'
              : 'bg-stone-100 text-stone-500 cursor-default'
          }`}
        >
          {submitting ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <>
              <Lock size={18} />
              {isGoogleUser ? t('change_password.anadirContrasena', 'Añadir contraseña') : 'Cambiar contraseña'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
