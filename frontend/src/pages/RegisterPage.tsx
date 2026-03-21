// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Check, X as XIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { authApi, getAuthErrorMessage } from '../lib/authApi';
import { setToken } from '../lib/auth';
import apiClient from '../services/api/client';

/* ── Password strength helper ── */
function getPasswordStrength(pw) {
  if (pw.length < 8) return { level: 0, label: 'Muy corta' };
  const hasUpper = /[A-Z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
  const hasSpecial = /[^A-Za-z0-9]/.test(pw);
  if (pw.length >= 12 && hasUpper && hasNumber && hasSpecial)
    return { level: 3, label: 'Fuerte' };
  if (hasUpper && hasNumber)
    return { level: 2, label: 'Buena' };
  return { level: 1, label: 'Débil' };
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    fullName: '', email: '', username: '', password: '',
    birthDay: '', birthMonth: '', birthYear: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [ageBlocked, setAgeBlocked] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Username availability
  const [usernameStatus, setUsernameStatus] = useState(null); // null | 'checking' | 'available' | 'taken' | 'short'
  const usernameTimer = useRef(null);

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  // Debounced username check
  const checkUsername = useCallback(async (value) => {
    const clean = value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (clean.length < 3) {
      setUsernameStatus('short');
      return;
    }
    setUsernameStatus('checking');
    try {
      const res = await apiClient.get(`/users/check-username/${clean}`);
      setUsernameStatus(res?.available ?? res?.data?.available ? 'available' : 'taken');
    } catch {
      setUsernameStatus(null);
    }
  }, []);

  useEffect(() => {
    if (usernameTimer.current) clearTimeout(usernameTimer.current);
    if (!form.username.trim()) { setUsernameStatus(null); return; }
    usernameTimer.current = setTimeout(() => checkUsername(form.username), 500);
    return () => clearTimeout(usernameTimer.current);
  }, [form.username, checkUsername]);

  // Age validation
  const checkAge = () => {
    const y = parseInt(form.birthYear, 10);
    const m = parseInt(form.birthMonth, 10);
    const d = parseInt(form.birthDay, 10);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return false;
    const birth = new Date(y, m - 1, d);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const monthDiff = now.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age--;
    return age >= 16;
  };

  const validate = () => {
    const e = {};
    if (!form.fullName.trim()) e.fullName = 'El nombre es obligatorio';
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = 'Email no válido';
    if (!form.username.trim() || form.username.trim().length < 3) e.username = 'Mínimo 3 caracteres';
    else if (usernameStatus === 'taken') e.username = 'Este usuario ya está en uso';
    if (form.password.length < 8) e.password = 'Mínimo 8 caracteres';
    if (!form.birthDay || !form.birthMonth || !form.birthYear) {
      e.birthDate = 'La fecha de nacimiento es obligatoria';
    } else if (!checkAge()) {
      setAgeBlocked(true);
      return false;
    }
    if (!termsAccepted) e.terms = 'Debes aceptar los términos';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);

    const birthDate = `${form.birthYear}-${form.birthMonth.padStart(2, '0')}-${form.birthDay.padStart(2, '0')}`;
    try {
      const data = await register({
        name: form.fullName,
        email: form.email,
        username: form.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''),
        password: form.password,
        birth_date: birthDate,
        analytics_consent: true,
        consent_version: 1,
      });

      if (data?.user) {
        if (data.session_token || data.access_token) {
          setToken(data.session_token || data.access_token, data.refresh_token);
        }
        navigate('/onboarding', { replace: true });
      }
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (detail?.error === 'age_requirement' || (typeof detail === 'string' && detail.includes('age_requirement'))) {
        setAgeBlocked(true);
        return;
      }
      const msg = getAuthErrorMessage(err, 'Error al crear la cuenta.');
      if (msg.toLowerCase().includes('email')) {
        setErrors({ email: 'Este email ya está registrado' });
      } else if (msg.toLowerCase().includes('username') || msg.toLowerCase().includes('usuario')) {
        setErrors({ username: msg });
      } else {
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    try {
      const data = await authApi.getGoogleAuthUrl();
      if (data.auth_url) window.location.href = data.auth_url;
      else toast.error('Error al conectar con Google.');
    } catch (error) {
      toast.error(getAuthErrorMessage(error, 'Error al conectar con Google.'));
    }
  };

  const canSubmit = form.fullName && form.email && form.username &&
    form.password.length >= 8 && form.birthDay && form.birthMonth &&
    form.birthYear && termsAccepted && usernameStatus !== 'taken' &&
    usernameStatus !== 'checking';

  const strength = getPasswordStrength(form.password);
  const strengthWidth = `${((strength.level + 1) / 4) * 100}%`;

  // Age-blocked screen
  if (ageBlocked) {
    return (
      <div className="text-center py-10">
        <div className="w-[72px] h-[72px] rounded-full mx-auto mb-5 bg-stone-100 flex items-center justify-center text-4xl">
          🔒
        </div>
        <h1 className="text-[22px] font-bold text-stone-950 mb-2">
          Debes tener al menos 16 años
        </h1>
        <p className="text-[15px] text-stone-500 mb-6 leading-relaxed">
          para usar Hispaloshop
        </p>
        <button
          onClick={() => setAgeBlocked(false)}
          className="px-8 h-12 bg-stone-950 text-white rounded-full text-[15px] font-semibold hover:bg-stone-800 transition-colors"
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <h1 className="text-2xl font-bold text-stone-950 text-center mb-1">
        Crear cuenta
      </h1>
      <p className="text-base text-stone-500 text-center mb-8">
        Únete a la plataforma artesanal
      </p>

      {/* Google */}
      <button
        type="button"
        onClick={handleGoogleRegister}
        className="w-full h-12 flex items-center justify-center gap-2.5 bg-white border border-stone-200 rounded-full text-[15px] font-semibold text-stone-950 hover:bg-stone-50 transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Continuar con Google
      </button>

      {/* Divider */}
      <div className="flex items-center gap-4 my-5">
        <div className="flex-1 h-px bg-stone-200" />
        <span className="text-[13px] text-stone-500">o</span>
        <div className="flex-1 h-px bg-stone-200" />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        {/* Name */}
        <div>
          <label className="block text-[13px] font-semibold text-stone-950 mb-1.5">Nombre completo</label>
          <input
            value={form.fullName}
            onChange={e => updateForm('fullName', e.target.value)}
            placeholder="María García"
            autoComplete="name"
            className={`w-full h-12 px-4 text-[15px] text-stone-950 placeholder:text-stone-400 bg-white border rounded-xl outline-none transition-colors ${
              errors.fullName ? 'border-stone-500' : 'border-stone-200 focus:border-stone-400'
            }`}
          />
          {errors.fullName && <p className="text-xs text-stone-600 mt-1">{errors.fullName}</p>}
        </div>

        {/* Email */}
        <div>
          <label className="block text-[13px] font-semibold text-stone-950 mb-1.5">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={e => updateForm('email', e.target.value)}
            placeholder="hola@ejemplo.com"
            autoComplete="email"
            className={`w-full h-12 px-4 text-[15px] text-stone-950 placeholder:text-stone-400 bg-white border rounded-xl outline-none transition-colors ${
              errors.email ? 'border-stone-500' : 'border-stone-200 focus:border-stone-400'
            }`}
          />
          {errors.email && <p className="text-xs text-stone-600 mt-1">{errors.email}</p>}
        </div>

        {/* Username */}
        <div>
          <label className="block text-[13px] font-semibold text-stone-950 mb-1.5">Usuario</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[15px] text-stone-500">@</span>
            <input
              value={form.username}
              onChange={e => {
                const val = e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 30);
                updateForm('username', val);
              }}
              placeholder="tu_usuario"
              autoComplete="username"
              className={`w-full h-12 pl-8 pr-10 text-[15px] text-stone-950 placeholder:text-stone-400 bg-white border rounded-xl outline-none transition-colors ${
                errors.username ? 'border-stone-500' : 'border-stone-200 focus:border-stone-400'
              }`}
            />
            {/* Status icon */}
            {form.username.length >= 3 && usernameStatus && usernameStatus !== 'checking' && (
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 flex">
                {usernameStatus === 'available'
                  ? <Check size={18} className="text-stone-950" />
                  : <XIcon size={18} className="text-stone-500" />
                }
              </span>
            )}
            {usernameStatus === 'checking' && (
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
                <Loader2 size={16} className="text-stone-500 animate-spin" />
              </span>
            )}
          </div>
          {usernameStatus === 'taken' && (
            <p className="text-xs text-stone-600 mt-1">Este usuario ya está en uso</p>
          )}
          {errors.username && <p className="text-xs text-stone-600 mt-1">{errors.username}</p>}
        </div>

        {/* Password */}
        <div>
          <label className="block text-[13px] font-semibold text-stone-950 mb-1.5">Contraseña</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={e => updateForm('password', e.target.value)}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              className={`w-full h-12 px-4 pr-12 text-[15px] text-stone-950 placeholder:text-stone-400 bg-white border rounded-xl outline-none transition-colors ${
                errors.password ? 'border-stone-500' : 'border-stone-200 focus:border-stone-400'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors p-1 flex"
              tabIndex={-1}
              aria-label={showPassword ? 'Ocultar' : 'Mostrar'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {/* Strength indicator */}
          {form.password.length > 0 && (
            <div className="mt-1.5">
              <div className="h-[3px] rounded-sm bg-stone-200 overflow-hidden">
                <div
                  className="h-full rounded-sm bg-stone-950 transition-all duration-300"
                  style={{ width: strengthWidth }}
                />
              </div>
              <p className="text-[11px] text-stone-500 mt-1">{strength.label}</p>
            </div>
          )}
          {errors.password && <p className="text-xs text-stone-600 mt-1">{errors.password}</p>}
        </div>

        {/* Birth date */}
        <div>
          <label className="block text-[13px] font-semibold text-stone-950 mb-1.5">Fecha de nacimiento</label>
          <div className="flex gap-2">
            <select
              value={form.birthDay}
              onChange={e => updateForm('birthDay', e.target.value)}
              className={`flex-1 h-12 px-2 text-[15px] text-stone-950 bg-white border rounded-xl outline-none transition-colors appearance-none ${
                errors.birthDate ? 'border-stone-500' : 'border-stone-200 focus:border-stone-400'
              }`}
            >
              <option value="">Día</option>
              {Array.from({ length: 31 }, (_, i) => (
                <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
              ))}
            </select>
            <select
              value={form.birthMonth}
              onChange={e => updateForm('birthMonth', e.target.value)}
              className={`flex-[1.3] h-12 px-2 text-[15px] text-stone-950 bg-white border rounded-xl outline-none transition-colors appearance-none ${
                errors.birthDate ? 'border-stone-500' : 'border-stone-200 focus:border-stone-400'
              }`}
            >
              <option value="">Mes</option>
              {['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'].map((m, i) => (
                <option key={i + 1} value={String(i + 1)}>{m}</option>
              ))}
            </select>
            <select
              value={form.birthYear}
              onChange={e => updateForm('birthYear', e.target.value)}
              className={`flex-[1.3] h-12 px-2 text-[15px] text-stone-950 bg-white border rounded-xl outline-none transition-colors appearance-none ${
                errors.birthDate ? 'border-stone-500' : 'border-stone-200 focus:border-stone-400'
              }`}
            >
              <option value="">Año</option>
              {Array.from({ length: 100 }, (_, i) => {
                const y = new Date().getFullYear() - i;
                return <option key={y} value={String(y)}>{y}</option>;
              })}
            </select>
          </div>
          {errors.birthDate && <p className="text-xs text-stone-600 mt-1">{errors.birthDate}</p>}
        </div>

        {/* Terms checkbox */}
        <label className="flex items-start gap-2.5 cursor-pointer text-[13px] text-stone-500 leading-relaxed">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={e => {
              setTermsAccepted(e.target.checked);
              if (errors.terms) setErrors(prev => ({ ...prev, terms: '' }));
            }}
            className="w-[18px] h-[18px] mt-0.5 accent-stone-950 cursor-pointer flex-shrink-0"
          />
          <span>
            Acepto los{' '}
            <Link to="/terms" className="text-stone-950 underline">
              Términos y condiciones
            </Link>
            {' '}y la{' '}
            <Link to="/privacy" className="text-stone-950 underline">
              Política de privacidad
            </Link>
          </span>
        </label>
        {errors.terms && <p className="text-xs text-stone-600 -mt-1.5">{errors.terms}</p>}

        {/* Submit */}
        <button
          type="submit"
          disabled={!canSubmit || isLoading}
          className="w-full h-12 mt-2 bg-stone-950 text-white rounded-full text-[15px] font-semibold flex items-center justify-center gap-2 hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Crear cuenta'}
        </button>
      </form>

      {/* Footer */}
      <p className="text-center mt-6 text-sm text-stone-500">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className="text-stone-950 font-semibold no-underline hover:underline">
          Entrar
        </Link>
      </p>
    </>
  );
}
