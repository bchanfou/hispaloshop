import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { getAuthErrorMessage } from '../lib/authApi';

const ROLES = [
  {
    id: 'customer',
    emoji: '\uD83D\uDED2',
    title: 'Comprador',
    desc: 'Descubre y compra productos artesanales',
    color: 'var(--color-blue)',
    colorBg: 'var(--color-blue-light)',
  },
  {
    id: 'producer',
    emoji: '\uD83E\uDED9',
    title: 'Productor',
    desc: 'Vende tus productos en España y exporta',
    color: 'var(--color-green)',
    colorBg: 'var(--color-green-light)',
  },
  {
    id: 'influencer',
    emoji: '\u2B50',
    title: 'Influencer',
    desc: 'Comparte y gana comisiones reales',
    color: 'var(--color-amber)',
    colorBg: 'var(--color-amber-light)',
  },
  {
    id: 'importer',
    emoji: '\uD83C\uDF0D',
    title: 'Importador',
    desc: 'Importa, distribuye y vende en tu país',
    color: 'var(--color-blue)',
    colorBg: 'var(--color-blue-light)',
  },
];

const COUNTRY_OPTIONS = [
  { code: 'ES', flag: '\uD83C\uDDEA\uD83C\uDDF8', name: 'España' },
  { code: 'DE', flag: '\uD83C\uDDE9\uD83C\uDDEA', name: 'Alemania' },
  { code: 'FR', flag: '\uD83C\uDDEB\uD83C\uDDF7', name: 'Francia' },
  { code: 'IT', flag: '\uD83C\uDDEE\uD83C\uDDF9', name: 'Italia' },
  { code: 'PT', flag: '\uD83C\uDDF5\uD83C\uDDF9', name: 'Portugal' },
  { code: 'GB', flag: '\uD83C\uDDEC\uD83C\uDDE7', name: 'Reino Unido' },
  { code: 'US', flag: '\uD83C\uDDFA\uD83C\uDDF8', name: 'Estados Unidos' },
  { code: 'MX', flag: '\uD83C\uDDF2\uD83C\uDDFD', name: 'México' },
  { code: 'CO', flag: '\uD83C\uDDE8\uD83C\uDDF4', name: 'Colombia' },
  { code: 'AR', flag: '\uD83C\uDDE6\uD83C\uDDF7', name: 'Argentina' },
  { code: 'JP', flag: '\uD83C\uDDEF\uD83C\uDDF5', name: 'Japón' },
  { code: 'KR', flag: '\uD83C\uDDF0\uD83C\uDDF7', name: 'Corea del Sur' },
  { code: 'CN', flag: '\uD83C\uDDE8\uD83C\uDDF3', name: 'China' },
  { code: 'AE', flag: '\uD83C\uDDE6\uD83C\uDDEA', name: 'Emiratos Árabes Unidos' },
];

const labelStyle = {
  display: 'block', fontSize: 13, fontWeight: 600,
  color: 'var(--color-black)', marginBottom: 6,
};

function ErrorMsg({ children, style }) {
  if (!children) return null;
  return (
    <p style={{ fontSize: 12, color: 'var(--color-red)', marginTop: 4, ...style }}>
      {children}
    </p>
  );
}

function PasswordInput({ value, onChange, error }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input
        className="hs-input"
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Mínimo 8 caracteres"
        autoComplete="new-password"
        style={{
          paddingRight: 44,
          ...(error ? { borderColor: 'var(--color-red)' } : {}),
        }}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        style={{
          position: 'absolute', right: 12, top: '50%',
          transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--color-stone)', padding: 4,
        }}
        tabIndex={-1}
        aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get('role');

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', country: '', role: roleParam || '',
    birthDay: '', birthMonth: '', birthYear: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [ageBlocked, setAgeBlocked] = useState(false);

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validateStep1 = () => {
    const e = {};
    if (!form.fullName.trim()) e.fullName = 'El nombre es obligatorio';
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = 'Email no válido';
    if (form.password.length < 8) e.password = 'Mínimo 8 caracteres';
    else if (!/[0-9]/.test(form.password)) e.password = 'Debe incluir al menos un número';
    if (!form.country) e.country = 'Selecciona tu país';
    if (!form.birthDay || !form.birthMonth || !form.birthYear) {
      e.birthDate = 'La fecha de nacimiento es obligatoria';
    } else {
      const y = parseInt(form.birthYear, 10);
      const m = parseInt(form.birthMonth, 10);
      const d = parseInt(form.birthDay, 10);
      if (isNaN(y) || isNaN(m) || isNaN(d) || y < 1900 || y > new Date().getFullYear() || m < 1 || m > 12 || d < 1 || d > 31) {
        e.birthDate = 'Fecha de nacimiento no válida';
      }
    }
    setErrors(e);
    if (Object.keys(e).length === 0) setStep(2);
  };

  const handleRegister = async () => {
    if (!form.role) {
      setErrors({ role: 'Elige cómo quieres usar Hispaloshop' });
      return;
    }
    setIsLoading(true);
    const birthDate = `${form.birthYear}-${form.birthMonth.padStart(2, '0')}-${form.birthDay.padStart(2, '0')}`;
    try {
      const data = await register({
        name: form.fullName,
        email: form.email,
        password: form.password,
        country: form.country,
        role: form.role,
        birth_date: birthDate,
      });

      if (data?.user) {
        navigate(`/onboarding/${form.role}`, { replace: true });
      } else {
        toast.success('Cuenta creada. Revisa tu email para verificar.');
        navigate(`/onboarding/${form.role}`, { replace: true });
      }
    } catch (err) {
      // Check for age requirement error
      const detail = err?.response?.data?.detail;
      if (detail?.error === 'age_requirement' || (typeof detail === 'string' && detail.includes('age_requirement'))) {
        setAgeBlocked(true);
        return;
      }
      const msg = getAuthErrorMessage(err, 'Error al crear la cuenta. Inténtalo de nuevo.');
      if (msg.toLowerCase().includes('email')) {
        setErrors({ email: 'Este email ya está registrado' });
        setStep(1);
      } else {
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const ProgressBar = () => (
    <div style={{
      height: 3, background: 'var(--color-cream)',
      borderRadius: 2, marginBottom: 32,
    }}>
      <div style={{
        height: '100%', borderRadius: 2,
        background: 'var(--color-black)',
        width: step === 1 ? '50%' : '100%',
        transition: 'width 0.35s ease',
      }} />
    </div>
  );

  // Age-blocked screen
  if (ageBlocked) {
    return (
      <div style={{
        minHeight: '100dvh', background: 'var(--color-cream)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px',
      }}>
        <div style={{
          width: '100%', maxWidth: 400, textAlign: 'center',
          background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)',
          border: '0.5px solid var(--color-divider)', padding: 'clamp(32px, 5vw, 48px)',
          boxShadow: 'var(--shadow-lg)',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
            background: '#F0EDE8', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28,
          }}>
            🔒
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: 'var(--color-black)' }}>
            Lo sentimos
          </h1>
          <p style={{ fontSize: 15, color: 'var(--color-stone)', marginBottom: 8, lineHeight: 1.5 }}>
            Debes tener al menos 16 años para usar Hispaloshop.
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-stone)', marginBottom: 28, lineHeight: 1.5 }}>
            Si tienes 16 años o más y crees que esto es un error, comprueba que has introducido tu fecha de nacimiento correctamente.
          </p>
          <Link
            to="/"
            style={{
              display: 'inline-block', padding: '12px 32px', background: 'var(--color-black)',
              color: '#fff', borderRadius: 12, fontSize: 15, fontWeight: 600, textDecoration: 'none',
            }}
          >
            Volver
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--color-cream)',
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '24px 16px',
    }}>
      <div style={{
        width: '100%', maxWidth: 440,
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-xl)',
        border: '0.5px solid var(--color-divider)',
        padding: 'clamp(24px, 5vw, 40px)',
        boxShadow: 'var(--shadow-lg)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <span style={{
            fontSize: 26, fontWeight: 800,
            letterSpacing: '-0.03em',
            color: 'var(--color-black)',
          }}>
            hispaloshop
          </span>
        </div>

        <ProgressBar />

        {step === 1 ? (
          <div>
            <h1 style={{
              fontSize: 24, fontWeight: 700,
              letterSpacing: '-0.02em', marginBottom: 4,
            }}>
              Crear cuenta
            </h1>
            <p style={{
              fontSize: 15, color: 'var(--color-stone)',
              marginBottom: 28,
            }}>
              Ya somos más de 8.000 productores. Únete.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={labelStyle}>Nombre completo</label>
                <input
                  className="hs-input"
                  value={form.fullName}
                  onChange={e => updateForm('fullName', e.target.value)}
                  placeholder="María García"
                  autoComplete="name"
                  style={errors.fullName ? { borderColor: 'var(--color-red)' } : {}}
                />
                <ErrorMsg>{errors.fullName}</ErrorMsg>
              </div>

              <div>
                <label style={labelStyle}>Email</label>
                <input
                  className="hs-input"
                  type="email"
                  value={form.email}
                  onChange={e => updateForm('email', e.target.value)}
                  placeholder="tu@email.com"
                  autoComplete="email"
                  style={errors.email ? { borderColor: 'var(--color-red)' } : {}}
                />
                <ErrorMsg>{errors.email}</ErrorMsg>
              </div>

              <div>
                <label style={labelStyle}>Contraseña</label>
                <PasswordInput
                  value={form.password}
                  onChange={val => updateForm('password', val)}
                  error={errors.password}
                />
                <p style={{
                  fontSize: 11, color: 'var(--color-stone)', marginTop: 4,
                }}>
                  Mínimo 8 caracteres, 1 número y 1 carácter especial
                </p>
                <ErrorMsg>{errors.password}</ErrorMsg>
              </div>

              <div>
                <label style={labelStyle}>País</label>
                <select
                  className="hs-input"
                  value={form.country}
                  onChange={e => updateForm('country', e.target.value)}
                  style={errors.country ? { borderColor: 'var(--color-red)' } : {}}
                >
                  <option value="">Selecciona tu país</option>
                  {COUNTRY_OPTIONS.map(c => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.name}
                    </option>
                  ))}
                </select>
                <ErrorMsg>{errors.country}</ErrorMsg>
              </div>

              <div>
                <label style={labelStyle}>Fecha de nacimiento</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select
                    className="hs-input"
                    value={form.birthDay}
                    onChange={e => updateForm('birthDay', e.target.value)}
                    style={{ flex: 1, ...(errors.birthDate ? { borderColor: 'var(--color-red)' } : {}) }}
                  >
                    <option value="">Día</option>
                    {Array.from({ length: 31 }, (_, i) => (
                      <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
                    ))}
                  </select>
                  <select
                    className="hs-input"
                    value={form.birthMonth}
                    onChange={e => updateForm('birthMonth', e.target.value)}
                    style={{ flex: 1.2, ...(errors.birthDate ? { borderColor: 'var(--color-red)' } : {}) }}
                  >
                    <option value="">Mes</option>
                    {['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'].map((m, i) => (
                      <option key={i + 1} value={String(i + 1)}>{m}</option>
                    ))}
                  </select>
                  <select
                    className="hs-input"
                    value={form.birthYear}
                    onChange={e => updateForm('birthYear', e.target.value)}
                    style={{ flex: 1.2, ...(errors.birthDate ? { borderColor: 'var(--color-red)' } : {}) }}
                  >
                    <option value="">Año</option>
                    {Array.from({ length: 100 }, (_, i) => {
                      const y = new Date().getFullYear() - i;
                      return <option key={y} value={String(y)}>{y}</option>;
                    })}
                  </select>
                </div>
                <ErrorMsg>{errors.birthDate}</ErrorMsg>
              </div>
            </div>

            <button
              className="hs-btn-primary"
              onClick={validateStep1}
              style={{ width: '100%', marginTop: 24, height: 48 }}
            >
              Continuar →
            </button>

            <p style={{
              textAlign: 'center', marginTop: 20,
              fontSize: 14, color: 'var(--color-stone)',
            }}>
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" style={{
                color: 'var(--color-black)', fontWeight: 600, textDecoration: 'none',
              }}>
                Iniciar sesión
              </Link>
            </p>
          </div>
        ) : (
          <div>
            <button
              onClick={() => setStep(1)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-stone)', fontSize: 14,
                display: 'flex', alignItems: 'center', gap: 6,
                marginBottom: 20, padding: 0,
              }}
            >
              ← Volver
            </button>

            <h2 style={{
              fontSize: 22, fontWeight: 700,
              letterSpacing: '-0.02em', marginBottom: 6,
            }}>
              ¿Cómo quieres usar Hispaloshop?
            </h2>
            <p style={{
              fontSize: 14, color: 'var(--color-stone)', marginBottom: 24,
            }}>
              Puedes cambiar esto más adelante desde tu perfil.
            </p>

            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
            }}>
              {ROLES.map(role => (
                <motion.button
                  key={role.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => updateForm('role', role.id)}
                  style={{
                    background: form.role === role.id
                      ? role.colorBg : 'var(--color-surface)',
                    border: form.role === role.id
                      ? `2px solid ${role.color}`
                      : '1.5px solid var(--color-divider)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '18px 14px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'var(--transition-base)',
                  }}
                >
                  <div style={{ fontSize: 32, marginBottom: 8 }}>
                    {role.emoji}
                  </div>
                  <p style={{
                    fontSize: 15, fontWeight: 700,
                    color: 'var(--color-black)', margin: '0 0 4px',
                  }}>
                    {role.title}
                  </p>
                  <p style={{
                    fontSize: 12, color: 'var(--color-stone)',
                    margin: 0, lineHeight: 1.4,
                  }}>
                    {role.desc}
                  </p>
                  {form.role === role.id && (
                    <div style={{
                      marginTop: 8, fontSize: 11, fontWeight: 700,
                      color: role.color,
                    }}>
                      ✓ Seleccionado
                    </div>
                  )}
                </motion.button>
              ))}
            </div>
            <ErrorMsg style={{ marginTop: 8 }}>{errors.role}</ErrorMsg>

            <p style={{
              fontSize: 12, color: 'var(--color-stone)',
              textAlign: 'center', marginTop: 16, lineHeight: 1.5,
            }}>
              Todos los planes empiezan gratis. Actualiza cuando estés listo.
            </p>

            <button
              className="hs-btn-primary"
              onClick={handleRegister}
              disabled={!form.role || isLoading}
              style={{ width: '100%', marginTop: 16, height: 48 }}
            >
              {isLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Creando cuenta...</>
              ) : (
                'Crear mi cuenta →'
              )}
            </button>

            <p style={{
              fontSize: 11, color: 'var(--color-stone)',
              textAlign: 'center', marginTop: 14, lineHeight: 1.6,
            }}>
              Al crear una cuenta aceptas los{' '}
              <Link to="/terms" style={{ color: 'var(--color-stone)' }}>
                Términos de uso
              </Link>{' '}
              y la{' '}
              <Link to="/privacy" style={{ color: 'var(--color-stone)' }}>
                Política de privacidad
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
