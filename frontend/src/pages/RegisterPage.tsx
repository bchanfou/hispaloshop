// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Check, X as XIcon, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { authApi, getAuthErrorMessage } from '../lib/authApi';
import { setToken } from '../lib/auth';
import apiClient from '../services/api/client';
import { useTranslation } from 'react-i18next';
import { trackEvent } from '../utils/analytics';

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

/* ── Role config ── */
const ROLES = [
  { key: 'customer', label: 'Consumidor', backendRole: 'customer' },
  { key: 'producer', label: 'Productor', backendRole: 'producer' },
  { key: 'influencer', label: 'Influencer', backendRole: 'influencer' },
  { key: 'importer', label: 'Importador', backendRole: 'importer' },
];

/* ── Countries (ISO 3166-1 alpha-2) ── */
const COUNTRIES = [
  { code: 'ES', name: 'España' },
  { code: 'MX', name: 'México' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CO', name: 'Colombia' },
  { code: 'CL', name: 'Chile' },
  { code: 'PE', name: 'Perú' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'PA', name: 'Panamá' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'HN', name: 'Honduras' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'DO', name: 'Rep. Dominicana' },
  { code: 'CU', name: 'Cuba' },
  { code: 'PR', name: 'Puerto Rico' },
  { code: 'US', name: 'Estados Unidos' },
  { code: 'CA', name: 'Canadá' },
  { code: 'BR', name: 'Brasil' },
  { code: 'PT', name: 'Portugal' },
  { code: 'FR', name: 'Francia' },
  { code: 'IT', name: 'Italia' },
  { code: 'DE', name: 'Alemania' },
  { code: 'GB', name: 'Reino Unido' },
  { code: 'NL', name: 'Países Bajos' },
  { code: 'BE', name: 'Bélgica' },
  { code: 'CH', name: 'Suiza' },
  { code: 'AT', name: 'Austria' },
  { code: 'SE', name: 'Suecia' },
  { code: 'NO', name: 'Noruega' },
  { code: 'DK', name: 'Dinamarca' },
  { code: 'FI', name: 'Finlandia' },
  { code: 'IE', name: 'Irlanda' },
  { code: 'PL', name: 'Polonia' },
  { code: 'CZ', name: 'Chequia' },
  { code: 'RO', name: 'Rumanía' },
  { code: 'GR', name: 'Grecia' },
  { code: 'HR', name: 'Croacia' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'HU', name: 'Hungría' },
  { code: 'SK', name: 'Eslovaquia' },
  { code: 'SI', name: 'Eslovenia' },
  { code: 'LT', name: 'Lituania' },
  { code: 'LV', name: 'Letonia' },
  { code: 'EE', name: 'Estonia' },
  { code: 'MT', name: 'Malta' },
  { code: 'CY', name: 'Chipre' },
  { code: 'LU', name: 'Luxemburgo' },
  { code: 'MA', name: 'Marruecos' },
  { code: 'DZ', name: 'Argelia' },
  { code: 'TN', name: 'Túnez' },
  { code: 'EG', name: 'Egipto' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'ZA', name: 'Sudáfrica' },
  { code: 'KE', name: 'Kenia' },
  { code: 'GH', name: 'Ghana' },
  { code: 'SN', name: 'Senegal' },
  { code: 'CI', name: 'Costa de Marfil' },
  { code: 'CM', name: 'Camerún' },
  { code: 'TR', name: 'Turquía' },
  { code: 'SA', name: 'Arabia Saudí' },
  { code: 'AE', name: 'Emiratos Árabes' },
  { code: 'IL', name: 'Israel' },
  { code: 'LB', name: 'Líbano' },
  { code: 'JO', name: 'Jordania' },
  { code: 'IQ', name: 'Irak' },
  { code: 'IR', name: 'Irán' },
  { code: 'PK', name: 'Pakistán' },
  { code: 'IN', name: 'India' },
  { code: 'BD', name: 'Bangladés' },
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'CN', name: 'China' },
  { code: 'JP', name: 'Japón' },
  { code: 'KR', name: 'Corea del Sur' },
  { code: 'TW', name: 'Taiwán' },
  { code: 'TH', name: 'Tailandia' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'PH', name: 'Filipinas' },
  { code: 'MY', name: 'Malasia' },
  { code: 'SG', name: 'Singapur' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'Nueva Zelanda' },
  { code: 'RU', name: 'Rusia' },
  { code: 'UA', name: 'Ucrania' },
  { code: 'RS', name: 'Serbia' },
  { code: 'BA', name: 'Bosnia' },
  { code: 'AL', name: 'Albania' },
  { code: 'MK', name: 'Macedonia del Norte' },
  { code: 'GE', name: 'Georgia' },
  { code: 'AM', name: 'Armenia' },
  { code: 'AZ', name: 'Azerbaiyán' },
  { code: 'KZ', name: 'Kazajistán' },
  { code: 'UZ', name: 'Uzbekistán' },
];

/* ── Input style helper ── */
const inputClass = (hasError) =>
  `w-full h-12 px-4 text-[15px] text-stone-950 placeholder:text-stone-400 bg-white border rounded-xl outline-none transition-colors ${
    hasError ? 'border-stone-500' : 'border-stone-200 focus:border-stone-400'
  }`;

const selectClass = (hasError) =>
  `w-full h-12 px-4 text-[15px] text-stone-950 bg-white border rounded-xl outline-none transition-colors appearance-none ${
    hasError ? 'border-stone-500' : 'border-stone-200 focus:border-stone-400'
  }`;

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { t } = useTranslation();

  const [activeRole, setActiveRole] = useState('customer');
  const [form, setForm] = useState({
    fullName: '', email: '', username: '', password: '',
    birthDay: '', birthMonth: '', birthYear: '',
    country: 'ES',
    // Producer / Importer
    companyName: '', companyVat: '',
    // Influencer
    instagram: '', tiktok: '',
    instagramFollowers: '', tiktokFollowers: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [ageBlocked, setAgeBlocked] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [countryWarning, setCountryWarning] = useState(false);  // non-active country modal
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);

  // Username availability
  const [usernameStatus, setUsernameStatus] = useState(null);
  const usernameTimer = useRef(null);

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  // Debounced username check
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const checkUsername = useCallback(async (value) => {
    // Validación igual al backend: solo minúsculas, números, guiones, puntos y guiones bajos
    const clean = value.trim().toLowerCase().replace(/[^a-z0-9_.\-]/g, '');
    if (clean.length < 3) {
      setUsernameStatus('short');
      return;
    }
    // Validación igual al backend: ^[a-z0-9_.\-]{3,20}$
    if (!/^[a-z0-9_.\-]{3,20}$/.test(clean)) {
      setUsernameStatus('invalid');
      return;
    }
    // No consecutive dots, cannot start/end with dot or hyphen
    if (/^[.\-]|[.\-]$|\.\./.test(clean)) {
      setUsernameStatus('invalid');
      return;
    }
    setUsernameStatus('checking');
    try {
      const res = await apiClient.get(`/users/check-username/${clean}`);
      if (mountedRef.current) {
        setUsernameStatus(res?.available ?? res?.data?.available ? 'available' : 'taken');
      }
    } catch {
      if (mountedRef.current) setUsernameStatus(null);
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
    // Validate the date is real (e.g., Feb 30 is invalid)
    const birth = new Date(y, m - 1, d);
    if (birth.getFullYear() !== y || birth.getMonth() !== m - 1 || birth.getDate() !== d) return false;
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const monthDiff = now.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age--;
    return age >= 16;
  };

  const validate = () => {
    const e = {};
    if (!form.fullName.trim()) e.fullName = t('register.elNombreEsObligatorio', 'El nombre es obligatorio');
    if (!form.email.match(/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/)) e.email = t('register.emailNoValido', 'Email no válido');
    const cleanUsername = form.username.trim().toLowerCase().replace(/[^a-z0-9_.\-]/g, '');
    if (!form.username.trim() || cleanUsername.length < 3) {
      e.username = t('register.minimo3Caracteres', 'Mínimo 3 caracteres');
    } else if (!/^[a-z0-9_.\-]{3,20}$/.test(cleanUsername)) {
      e.username = t('register.usernameInvalido', 'Solo letras minúsculas, números, puntos, guiones y guiones bajos (3-20 caracteres)');
    } else if (/^[.\-]|[.\-]$|\.\./.test(cleanUsername)) {
      e.username = t('usernameFormatoInvalido', 'No puede empezar/terminar con punto o guion, ni tener puntos consecutivos');
    } else if (usernameStatus === 'taken') {
      e.username = t('register.esteUsuarioYaEstaEnUso', 'Este usuario ya está en uso');
    }
    if (form.password.length < 8) e.password = t('register.minimo8Caracteres', 'Mínimo 8 caracteres');
    if (!form.country) e.country = t('register.selectCountry', 'Selecciona tu país');
    if (!form.birthDay || !form.birthMonth || !form.birthYear) {
      e.birthDate = t('register.laFechaDeNacimientoEsObligatoria', 'La fecha de nacimiento es obligatoria');
    } else if (!checkAge()) {
      setAgeBlocked(true);
      return false;
    }
    if (!termsAccepted) e.terms = t('register.debesAceptarLosTerminos', 'Debes aceptar los términos');

    // Role-specific validation
    if (activeRole === 'producer' || activeRole === 'importer') {
      if (!form.companyName.trim()) e.companyName = t('register.elNombreDeEmpresaEsObligatorio', 'El nombre de empresa es obligatorio');
    }
    if (activeRole === 'influencer') {
      if (!form.instagram.trim() && !form.tiktok.trim()) {
        e.instagram = t('register.introduceAlMenosUnaRedSocial', 'Introduce al menos una red social');
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const doRegister = async () => {
    setIsLoading(true);
    if (activeRole === 'producer' || activeRole === 'importer') {
      trackEvent('producer_registration_started', { role: activeRole, country: form.country });
    }

    const birthDate = `${form.birthYear}-${form.birthMonth.padStart(2, '0')}-${form.birthDay.padStart(2, '0')}`;
    const roleConfig = ROLES.find(r => r.key === activeRole);

    const payload = {
      name: form.fullName,
      email: form.email,
      username: form.username.trim().toLowerCase().replace(/[^a-z0-9_.\-]/g, ''),
      password: form.password,
      birth_date: birthDate,
      role: roleConfig.backendRole,
      country: form.country,
      analytics_consent: termsAccepted, // Consentimiento GDPR obligatorio
      marketing_consent: false, // Por defecto false, el usuario puede activar luego
      consent_version: '1.0',
      language: navigator.language?.split('-')[0] || 'es',
    };

    // Role-specific fields
    if (activeRole === 'producer' || activeRole === 'importer') {
      payload.company_name = form.companyName.trim();
      if (form.companyVat.trim()) payload.vat_cif = form.companyVat.trim();
    }
    if (activeRole === 'influencer') {
      if (form.instagram.trim()) payload.instagram = form.instagram.trim().replace(/^@/, '');
      if (form.tiktok.trim()) payload.tiktok = form.tiktok.trim().replace(/^@/, '');
      const totalFollowers = (parseInt(form.instagramFollowers, 10) || 0) + (parseInt(form.tiktokFollowers, 10) || 0);
      if (totalFollowers > 0) payload.followers = String(totalFollowers);
    }

    try {
      const data = await register(payload);
      if (data?.user) {
        if (data.session_token || data.access_token) {
          setToken(data.session_token || data.access_token, data.refresh_token);
        }
        if (activeRole === 'producer' || activeRole === 'importer') {
          trackEvent('producer_registration_completed', { role: activeRole, country: form.country });
        }
        // Navigate based on role
        const destinations = {
          customer: '/onboarding',
          producer: '/producer/verification',
          influencer: '/influencer/fiscal-setup',
          importer: '/producer/verification',
        };
        navigate(destinations[activeRole] || '/onboarding', { replace: true });
      }
    } catch (err) {
      const detail = err?.response?.data?.detail;
      // Handle age requirement
      if (detail?.error === 'age_requirement' || (typeof detail === 'string' && detail.includes('age_requirement'))) {
        setAgeBlocked(true);
        return;
      }
      // Handle Pydantic validation errors (array of objects)
      if (Array.isArray(detail)) {
        const fieldErrors = {};
        for (const d of detail) {
          const field = d.loc?.[d.loc.length - 1]; // e.g., "password", "email"
          const pydanticMsg = d.msg || '';
          if (field === 'password') fieldErrors.password = t('register.laContrasenaDebeTenerAlMenos8Cara', 'La contraseña debe tener al menos 8 caracteres');
          else if (field === 'email') fieldErrors.email = t('register.elEmailNoEsValido', 'El email no es válido');
          else if (field === 'name') fieldErrors.fullName = t('register.elNombreEsObligatorio', 'El nombre es obligatorio');
          else if (field === 'username') fieldErrors.username = t('register.elNombreDeUsuarioNoEsValido', 'El nombre de usuario no es válido');
          else toast.error(pydanticMsg || t('register.errorDeValidacion', 'Error de validación'));
        }
        if (Object.keys(fieldErrors).length > 0) { setErrors(fieldErrors); return; }
      }
      // Handle 429 rate limit error
      if (err?.response?.status === 429) {
        toast.error(
          t('register.rateLimitError', 'Demasiados intentos. Por favor, espera unos minutos o contacta con soporte.'),
          { duration: 6000 }
        );
        return;
      }
      
      // Handle string error messages
      const msg = typeof detail === 'string' ? detail : getAuthErrorMessage(err, t('register.errorAlCrearLaCuenta', 'Error al crear la cuenta.'));
      if (msg.toLowerCase().includes('email')) {
        setErrors({ email: msg });
      } else if (msg.toLowerCase().includes('username') || msg.toLowerCase().includes('usuario')) {
        setErrors({ username: msg });
      } else if (msg.toLowerCase().includes('demasiados') || msg.includes('429')) {
        toast.error(msg, { duration: 6000 });
      } else {
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    // For producers/importers, check if country is active before proceeding
    if (activeRole === 'producer' || activeRole === 'importer') {
      try {
        const countryStatus = await apiClient.get(`/verification/country-status/${form.country}`);
        if (!countryStatus?.is_active) {
          setCountryWarning(true);
          return;
        }
      } catch {
        // If check fails, proceed anyway (non-blocking)
      }
    }

    await doRegister();
  };

  const handleGoogleRegister = async () => {
    try {
      const data = await authApi.getGoogleAuthUrl();
      if (data.auth_url && (data.auth_url.startsWith('https://') || data.auth_url.startsWith('http://'))) window.location.href = data.auth_url;
      else toast.error(t('register.errorAlConectarConGoogle', 'Error al conectar con Google.'));
    } catch (error) {
      toast.error(getAuthErrorMessage(error, t('register.errorAlConectarConGoogle', 'Error al conectar con Google.')));
    }
  };

  const canSubmit = form.fullName && form.email && form.username &&
    form.password.length >= 8 && form.birthDay && form.birthMonth &&
    form.birthYear && form.country && termsAccepted &&
    usernameStatus !== 'taken' && usernameStatus !== 'checking';

  const strength = getPasswordStrength(form.password);
  const strengthWidth = `${(strength.level / 3) * 100}%`;

  // Waitlist confirmation screen
  if (waitlistSubmitted) {
    return (
      <div className="text-center py-10">
        <div className="w-[72px] h-[72px] rounded-full mx-auto mb-5 bg-stone-100 flex items-center justify-center">
          <Check size={32} className="text-stone-950" />
        </div>
        <h1 className="text-[22px] font-bold text-stone-950 mb-2">
          {t('register.waitlistTitle', 'Te avisaremos')}
        </h1>
        <p className="text-[15px] text-stone-500 mb-6 leading-relaxed max-w-xs mx-auto">
          {t('register.waitlistMsg', 'Cuando tu pais este completamente configurado, te enviaremos un email para que completes tu registro.')}
        </p>
        <button
          onClick={() => { setWaitlistSubmitted(false); setCountryWarning(false); }}
          className="px-8 h-12 bg-stone-950 text-white rounded-full text-[15px] font-semibold hover:bg-stone-800 transition-colors"
        >
          {t('register.goBack', 'Volver')}
        </button>
      </div>
    );
  }

  // Age-blocked screen
  if (ageBlocked) {
    return (
      <div className="text-center py-10">
        <div className="w-[72px] h-[72px] rounded-full mx-auto mb-5 bg-stone-100 flex items-center justify-center">
          <XIcon size={32} className="text-stone-950" />
        </div>
        <h1 className="text-[22px] font-bold text-stone-950 mb-2">
          {t('register.mustBe16', 'Debes tener al menos 16 años')}
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
      {/* Country warning modal for non-active countries */}
      {countryWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h2 className="text-lg font-bold text-stone-950 mb-3">
              {t('register.countryWarningTitle', 'Pais no completamente configurado')}
            </h2>
            <p className="text-sm text-stone-600 mb-5 leading-relaxed">
              {t('register.countryWarningMsg', 'Tu pais aun no esta completamente configurado en Hispaloshop. Puedes registrarte y listar productos, pero ten en cuenta que los pagos se procesaran manualmente y pueden tardar mas de lo habitual.')}
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={async () => {
                  setCountryWarning(false);
                  await doRegister();
                }}
                className="w-full py-3 text-sm font-bold bg-stone-950 text-white rounded-full hover:bg-stone-800 transition-colors"
              >
                {t('register.countryWarningContinue', 'Si, continuar')}
              </button>
              <button
                onClick={() => { setCountryWarning(false); setWaitlistSubmitted(true); }}
                className="w-full py-3 text-sm font-semibold border border-stone-200 text-stone-950 rounded-full hover:bg-stone-50 transition-colors"
              >
                {t('register.countryWarningWaitlist', 'Avisarme cuando mi pais este listo')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <h1 className="text-2xl font-bold text-stone-950 text-center mb-1">
        Crear cuenta
      </h1>
      <p className="text-base text-stone-500 text-center mb-6">
        Únete a la plataforma artesanal
      </p>

      {/* ── Role tabs ── */}
      <div className="flex rounded-xl border border-stone-200 overflow-hidden mb-6">
        {ROLES.map((role) => (
          <button
            key={role.key}
            type="button"
            onClick={() => setActiveRole(role.key)}
            aria-label={`Registrarse como ${role.label}`}
            aria-pressed={activeRole === role.key}
            className={`flex-1 py-2.5 text-[12px] font-semibold transition-colors ${
              activeRole === role.key
                ? 'bg-stone-950 text-white'
                : 'bg-white text-stone-500 hover:text-stone-950 hover:bg-stone-50'
            }`}
          >
            {role.label}
          </button>
        ))}
      </div>

      {/* Google — only for consumers */}
      {activeRole === 'customer' && (
        <>
          <button
            type="button"
            onClick={handleGoogleRegister}
            aria-label="Registrarse con Google"
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
          <div className="flex items-center gap-4 my-5">
            <div className="flex-1 h-px bg-stone-200" />
            <span className="text-[13px] text-stone-500">o</span>
            <div className="flex-1 h-px bg-stone-200" />
          </div>
        </>
      )}

      {/* ── Form ── */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        {/* Name */}
        <div>
          <label className="block text-[13px] font-semibold text-stone-950 mb-1.5">Nombre completo</label>
          <input
            value={form.fullName}
            onChange={e => updateForm('fullName', e.target.value)}
            placeholder={t('register.mariaGarcia', 'María García')}
            autoComplete="name"
            className={inputClass(errors.fullName)}
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
            className={inputClass(errors.email)}
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
                const val = e.target.value.replace(/[^a-zA-Z0-9_.\-]/g, '').slice(0, 20);
                updateForm('username', val);
              }}
              placeholder="tu_usuario"
              autoComplete="username"
              maxLength={20}
              className={`w-full h-12 pl-8 pr-10 text-[15px] text-stone-950 placeholder:text-stone-400 bg-white border rounded-xl outline-none transition-colors ${
                errors.username ? 'border-stone-500' : 'border-stone-200 focus:border-stone-400'
              }`}
            />
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
          <p className="text-[11px] text-stone-400 mt-1">
            {t('register.usernameHint', 'Letras, números, puntos y guiones bajos (máximo 20 caracteres)')}
          </p>
          {usernameStatus === 'taken' && (
            <p className="text-xs text-stone-600 mt-1">{t('register.esteUsuarioYaEstaEnUso', 'Este usuario ya está en uso')}</p>
          )}
          {errors.username && <p className="text-xs text-stone-600 mt-1">{errors.username}</p>}
        </div>

        {/* Password */}
        <div>
          <label className="block text-[13px] font-semibold text-stone-950 mb-1.5">{t('auth.password', 'Contraseña')}</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={e => updateForm('password', e.target.value)}
              placeholder={t('register.minimo8Caracteres', 'Mínimo 8 caracteres')}
              autoComplete="new-password"
              className={`w-full h-12 px-4 pr-12 text-[15px] text-stone-950 placeholder:text-stone-400 bg-white border rounded-xl outline-none transition-colors ${
                errors.password ? 'border-stone-500' : 'border-stone-200 focus:border-stone-400'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-950 transition-colors p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
              tabIndex={-1}
              aria-label={showPassword ? t('login.ocultarContrasena', 'Ocultar contraseña') : t('login.mostrarContrasena', 'Mostrar contraseña')}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
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

        {/* Country */}
        <div>
          <label className="block text-[13px] font-semibold text-stone-950 mb-1.5">{t('register.country', 'País')}</label>
          <div className="relative">
            <select
              value={form.country}
              onChange={e => updateForm('country', e.target.value)}
              className={selectClass(errors.country)}
            >
              <option value="">{t('register.seleccionarPais', 'Seleccionar país')}</option>
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          </div>
          {errors.country && <p className="text-xs text-stone-600 mt-1">{errors.country}</p>}
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
              <option value="">{t('register.day', 'Día')}</option>
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
              <option value="">{t('register.month', 'Mes')}</option>
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
              <option value="">{t('register.year', 'Año')}</option>
              {Array.from({ length: 100 }, (_, i) => {
                const y = new Date().getFullYear() - i;
                return <option key={y} value={String(y)}>{y}</option>;
              })}
            </select>
          </div>
          {errors.birthDate && <p className="text-xs text-stone-600 mt-1">{errors.birthDate}</p>}
        </div>

        {/* ── ROLE-SPECIFIC FIELDS ── */}

        {/* Producer / Importer — company fields */}
        {(activeRole === 'producer' || activeRole === 'importer') && (
          <div className="pt-2 border-t border-stone-100">
            <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-3">
              Datos de empresa
            </p>
            <div className="flex flex-col gap-3.5">
              <div>
                <label className="block text-[13px] font-semibold text-stone-950 mb-1.5">Nombre de empresa</label>
                <input
                  value={form.companyName}
                  onChange={e => updateForm('companyName', e.target.value)}
                  placeholder="Mi Empresa S.L."
                  className={inputClass(errors.companyName)}
                />
                {errors.companyName && <p className="text-xs text-stone-600 mt-1">{errors.companyName}</p>}
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-stone-950 mb-1.5">CIF / NIF de empresa</label>
                <input
                  value={form.companyVat}
                  onChange={e => updateForm('companyVat', e.target.value.toUpperCase())}
                  placeholder="B12345678"
                  className={inputClass(errors.companyVat)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Influencer — social fields */}
        {activeRole === 'influencer' && (
          <div className="pt-2 border-t border-stone-100">
            <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-3">
              Redes sociales
            </p>
            <div className="flex flex-col gap-3.5">
              {/* Instagram */}
              <div>
                <label className="block text-[13px] font-semibold text-stone-950 mb-1.5">Instagram</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[15px] text-stone-500">@</span>
                    <input
                      value={form.instagram}
                      onChange={e => updateForm('instagram', e.target.value.replace(/[^a-zA-Z0-9._]/g, ''))}
                      placeholder="tu_perfil"
                      className={`w-full h-12 pl-8 pr-4 text-[15px] text-stone-950 placeholder:text-stone-400 bg-white border rounded-xl outline-none transition-colors ${
                        errors.instagram ? 'border-stone-500' : 'border-stone-200 focus:border-stone-400'
                      }`}
                    />
                  </div>
                  <input
                    type="number"
                    value={form.instagramFollowers}
                    onChange={e => updateForm('instagramFollowers', e.target.value)}
                    placeholder="Seguidores"
                    min="0"
                    className="w-[120px] h-12 px-3 text-[15px] text-stone-950 placeholder:text-stone-400 bg-white border border-stone-200 rounded-xl outline-none focus:border-stone-400 transition-colors"
                  />
                </div>
                {errors.instagram && <p className="text-xs text-stone-600 mt-1">{errors.instagram}</p>}
              </div>
              {/* TikTok */}
              <div>
                <label className="block text-[13px] font-semibold text-stone-950 mb-1.5">TikTok</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[15px] text-stone-500">@</span>
                    <input
                      value={form.tiktok}
                      onChange={e => updateForm('tiktok', e.target.value.replace(/[^a-zA-Z0-9._]/g, ''))}
                      placeholder="tu_perfil"
                      className="w-full h-12 pl-8 pr-4 text-[15px] text-stone-950 placeholder:text-stone-400 bg-white border border-stone-200 rounded-xl outline-none focus:border-stone-400 transition-colors"
                    />
                  </div>
                  <input
                    type="number"
                    value={form.tiktokFollowers}
                    onChange={e => updateForm('tiktokFollowers', e.target.value)}
                    placeholder="Seguidores"
                    min="0"
                    className="w-[120px] h-12 px-3 text-[15px] text-stone-950 placeholder:text-stone-400 bg-white border border-stone-200 rounded-xl outline-none focus:border-stone-400 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Terms checkbox */}
        <label className="flex items-start gap-2.5 cursor-pointer text-[13px] text-stone-600 leading-relaxed mt-1">
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
            {t('register.consentCopy', 'Acepto los')}{' '}
            <Link to="/terms" className="text-stone-950 underline">
              {t('register.termsShort', 'términos')}
            </Link>
            {' '}{t('register.andThe', 'y la')}{' '}
            <Link to="/privacy" className="text-stone-950 underline">
              {t('register.privacyShort', 'política de privacidad')}
            </Link>.{' '}
            <span className="text-stone-400">
              {t('register.consentWithdraw', 'Puedes retirar este consentimiento cuando quieras desde tu perfil.')}
            </span>
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
        {t('auth.hasAccount', '¿Ya tienes cuenta?')}{' '}
        <Link to="/login" className="text-stone-950 font-semibold no-underline hover:underline">
          {t('auth.login', 'Entrar')}
        </Link>
      </p>
    </>
  );
}
