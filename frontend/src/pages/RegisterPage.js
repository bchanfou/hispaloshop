import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { Shield, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { ConsentSummary, ConsentFullDisclosure } from '../components/ConsentLayers';
import { useLocale } from '../context/LocaleContext';
import { useAuth } from '../context/AuthContext';
import { authApi, getAuthErrorMessage } from '../lib/authApi';
import { redirectAfterAuth } from '../lib/navigation';

const baseSchema = z.object({
  email: z.string().email('Email no válido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  name: z.string().min(1, 'El nombre es obligatorio'),
  country: z.string().min(1, 'El país es obligatorio'),
});

const customerSchema = baseSchema.extend({
  analytics_consent: z.literal(true, {
    errorMap: () => ({ message: 'Debes aceptar el tratamiento de datos para continuar.' }),
  }),
});

const producerSchema = baseSchema.extend({
  company_name: z.string().min(1, 'El nombre de la empresa es obligatorio'),
  phone: z.string().min(1, 'El teléfono es obligatorio'),
  fiscal_address: z.string().min(5, 'La dirección fiscal es obligatoria'),
  vat_cif: z.string().min(1, 'El CIF/NIF es obligatorio'),
});

const influencerSchema = baseSchema.extend({
  followers: z.preprocess(
    (value) => parseInt(String(value).replace(/[^0-9]/g, ''), 10),
    z.number({ invalid_type_error: 'Número de seguidores requerido' }).min(1000, 'Necesitas al menos 1.000 seguidores')
  ),
});

const getSchemaForRole = (role) => {
  if (role === 'producer' || role === 'importer') return producerSchema;
  if (role === 'influencer') return influencerSchema;
  return customerSchema;
};

const COUNTRY_OPTIONS = ['España', 'Portugal', 'Francia', 'Alemania', 'Italia', 'Reino Unido', 'Estados Unidos', 'México', 'Argentina', 'Colombia', 'Chile', 'Perú', 'Brasil', 'Japón', 'Corea del Sur', 'China', 'India', 'Australia'];

const FIELD_MESSAGES = {
  email: 'Introduce un email válido.',
  password: 'La contraseña debe tener al menos 6 caracteres.',
  name: 'El nombre es obligatorio.',
  username: 'Revisa el nombre de usuario.',
  country: 'El país es obligatorio.',
  company_name: 'El nombre de la empresa es obligatorio.',
  phone: 'El teléfono es obligatorio.',
  fiscal_address: 'La dirección fiscal es obligatoria.',
  vat_cif: 'El CIF/NIF es obligatorio.',
  followers: 'Necesitas al menos 1.000 seguidores.',
  analytics_consent: 'Debes aceptar el tratamiento de datos para continuar.',
};

const backendMessageToField = (message = '') => {
  const text = message.toLowerCase();

  if (text.includes('email')) return 'email';
  if (text.includes('password') || text.includes('contrasena') || text.includes('contraseña')) return 'password';
  if (text.includes('username') || text.includes('usuario')) return 'username';
  if (text.includes('country') || text.includes('pais') || text.includes('país')) return 'country';
  if (text.includes('company')) return 'company_name';
  if (text.includes('phone') || text.includes('telefono') || text.includes('teléfono')) return 'phone';
  if (text.includes('fiscal')) return 'fiscal_address';
  if (text.includes('vat') || text.includes('cif') || text.includes('nif')) return 'vat_cif';
  if (text.includes('followers') || text.includes('seguidores')) return 'followers';
  if (text.includes('consent') || text.includes('tratamiento de datos')) return 'analytics_consent';
  if (text.includes('name')) return 'name';

  return null;
};

const ROLE_COPY = {
  customer: ['Cuenta personal', 'Crea tu cuenta', 'Empieza a guardar productos, seguir productores y comprar con más contexto desde el primer día.'],
  influencer: ['Acceso influencer', 'Solicita tu acceso como influencer', 'Cuéntanos quién eres y revisamos tu perfil antes de activar tu espacio dentro de la plataforma.'],
  importer: ['Acceso importador', 'Abre tu acceso como importador', 'Déjanos tus datos para que puedas validar productores y ordenar mejor tus oportunidades.'],
  producer: ['Acceso productor', 'Registro de productor', 'Este acceso se gestiona desde la landing de productor para mantener el proceso comercial completo.'],
};

const inputClass = (hasError) =>
  `mt-2 h-12 w-full rounded-2xl border bg-white px-3 text-base outline-none focus:border-stone-950 transition-colors md:h-11 md:text-sm ${hasError ? 'border-stone-400' : 'border-stone-200'}`;

const renderField = ({ id, label, required, error, children }) => (
  <div>
    <label htmlFor={id} className="text-sm font-medium text-stone-800">
      {label}{required ? ' *' : ''}
    </label>
    {children}
    {error ? <p className="mt-1 text-xs text-stone-700 md:text-sm">{error}</p> : null}
  </div>
);

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { i18n, t } = useTranslation();
  const { language } = useLocale();
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get('role');
  const intendedRoute = searchParams.get('redirect');
  const pathName = typeof window !== 'undefined' ? window.location.pathname : '';
  const pathRole = pathName.includes('/vender') ? 'producer' : pathName.includes('/influencers') ? 'influencer' : pathName.includes('/importer') || pathName.includes('/importador') ? 'importer' : null;
  const fixedRole = pathRole || roleParam || 'customer';
  const currentLanguage = i18n.language || language || 'es';
  const [badge, title, description] = ROLE_COPY[fixedRole] || ROLE_COPY.customer;

  const [formData, setFormData] = useState({
    email: '', password: '', name: '', username: '', role: fixedRole, country: '',
    company_name: '', phone: '', whatsapp: '', contact_person: '', fiscal_address: '', vat_cif: '',
    instagram: '', tiktok: '', youtube: '', twitter: '', followers: '', niche: '',
    analytics_consent: false, consent_version: '1.0', language: currentLanguage,
  });
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [showConsentModal, setShowConsentModal] = useState(false);

  useEffect(() => {
    setFormData((prev) => ({ ...prev, role: fixedRole, language: currentLanguage }));
  }, [fixedRole, currentLanguage]);

  useEffect(() => {
    if (fixedRole === 'producer') navigate('/productor/registro', { replace: true });
  }, [fixedRole, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const schema = getSchemaForRole(formData.role);
    const result = schema.safeParse(formData);
    if (result.success) {
      setFormErrors({});
      return true;
    }
    const nextErrors = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0];
      if (field && !nextErrors[field]) nextErrors[field] = issue.message;
    }
    setFormErrors(nextErrors);
    return false;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      if (formData.role === 'customer' && !formData.analytics_consent) {
        toast.error('Debes aceptar el tratamiento de datos para continuar.');
        document.querySelector('[data-testid="consent-section"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        toast.error('Revisa los campos obligatorios antes de continuar.');
      }
      return;
    }

    setLoading(true);
    try {
      const data = await register(formData);
      if (data?.user) {
        if (data.user.role === 'customer' && !data.user.onboarding_completed) navigate('/onboarding', { replace: true });
        else redirectAfterAuth(data.user, navigate, intendedRoute);
      }
      if (data?.email_delivery_available === false) toast.error(data?.message || 'La cuenta se creó, pero el servicio de email no está configurado.');
      else if (data?.message) toast.success(data.message);
      else if (formData.role === 'influencer') toast.success('Registro completado. Revisa tu email para verificar tu cuenta.');
      else toast.success('Registro completado. Ya puedes empezar.');
    } catch (error) {
      const errorMessage = getAuthErrorMessage(error, 'Error de registro. Revisa tus datos e inténtalo de nuevo.');
      const field = backendMessageToField(errorMessage);
      if (field) {
        setFormErrors((prev) => ({ ...prev, [field]: FIELD_MESSAGES[field] || errorMessage }));
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const isProducer = formData.role === 'producer' || formData.role === 'importer';
  const isInfluencer = formData.role === 'influencer';

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <div className="safe-area-top sticky top-0 z-40 border-b border-stone-200 bg-white/95 backdrop-blur-md md:hidden">
        <div className="flex h-14 items-center px-4">
          <button type="button" onClick={() => navigate('/register/new')} className="-ml-2 rounded-full p-2 text-stone-950 transition-colors hover:bg-stone-100" data-testid="mobile-back-btn">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 truncate pr-8 text-center text-sm font-medium text-stone-950">{title}</h1>
        </div>
      </div>

      <div className="hidden md:block"><Header /></div>

      <main className="flex-1 px-4 py-4 md:py-12">
        <div className="mx-auto max-w-2xl">
          <div className="mb-5 text-center md:mb-8">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.32em] text-stone-500">{badge}</p>
            <h1 className="text-3xl font-semibold tracking-tight text-stone-950 md:text-4xl" data-testid="register-title">{title}</h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-stone-600 md:text-base">{description}</p>
          </div>

          <section className="rounded-[28px] border border-stone-200 bg-white p-4 shadow-sm md:p-8" data-testid="register-form">
            <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
              {renderField({ id: 'email', label: t('auth.email', 'Email'), required: true, error: formErrors.email, children: (
                <input id="email" name="email" type="email" required value={formData.email} onChange={handleChange} className={inputClass(formErrors.email)} placeholder="tu@email.com" data-testid="email-input" />
              )})}

              {renderField({ id: 'password', label: t('auth.password', 'Contraseña'), required: true, error: formErrors.password, children: (
                <input id="password" name="password" type="password" required value={formData.password} onChange={handleChange} className={inputClass(formErrors.password)} placeholder="Mínimo 6 caracteres" data-testid="password-input" />
              )})}

              {renderField({ id: 'name', label: isProducer ? 'Nombre de la empresa' : 'Nombre completo', required: true, error: formErrors.name, children: (
                <input id="name" name="name" required value={formData.name} onChange={handleChange} className={inputClass(formErrors.name)} data-testid="name-input" />
              )})}

              <div>
                  <label htmlFor="username" className="text-sm font-medium text-stone-800">Usuario</label>
                <div className="relative mt-2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">@</span>
                  <input id="username" name="username" value={formData.username} onChange={handleChange} className={`${inputClass(formErrors.username)} pl-7`} placeholder="tu_nombre_unico" data-testid="username-input" />
                </div>
                <p className="mt-1 text-xs text-stone-500">Opcional. Si no lo eliges, se generará automáticamente.</p>
              </div>

              <div>
                <label htmlFor="country" className="text-sm font-medium text-stone-800">País *</label>
                <select id="country" name="country" value={formData.country} onChange={handleChange} className={`${inputClass(formErrors.country)} w-full`} data-testid="country-input">
                  <option value="">Selecciona tu país</option>
                  {COUNTRY_OPTIONS.map((country) => <option key={country} value={country}>{country}</option>)}
                </select>
                {formErrors.country ? <p className="mt-1 text-xs text-stone-700 md:text-sm">{formErrors.country}</p> : null}
              </div>

              {isProducer && (
                <>
                  {renderField({ id: 'company_name', label: 'Nombre de la empresa', required: true, error: formErrors.company_name, children: (
                    <input id="company_name" name="company_name" value={formData.company_name} onChange={handleChange} className={inputClass(formErrors.company_name)} />
                  )})}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {renderField({ id: 'phone', label: 'Teléfono', required: true, error: formErrors.phone, children: (
                      <input id="phone" name="phone" value={formData.phone} onChange={handleChange} className={inputClass(formErrors.phone)} placeholder="+34 600 000 000" />
                    )})}
                    {renderField({ id: 'whatsapp', label: 'WhatsApp', required: false, error: null, children: (
                      <input id="whatsapp" name="whatsapp" value={formData.whatsapp} onChange={handleChange} className={inputClass(false)} placeholder="+34 600 000 000" />
                    )})}
                  </div>
                  {renderField({ id: 'contact_person', label: 'Persona de contacto', required: false, error: null, children: (
                    <input id="contact_person" name="contact_person" value={formData.contact_person} onChange={handleChange} className={inputClass(false)} />
                  )})}
                  {renderField({ id: 'fiscal_address', label: 'Dirección fiscal', required: true, error: formErrors.fiscal_address, children: (
                    <input id="fiscal_address" name="fiscal_address" value={formData.fiscal_address} onChange={handleChange} className={inputClass(formErrors.fiscal_address)} placeholder="Calle, número, ciudad, CP" />
                  )})}
                  {renderField({ id: 'vat_cif', label: 'CIF/NIF', required: true, error: formErrors.vat_cif, children: (
                    <input id="vat_cif" name="vat_cif" value={formData.vat_cif} onChange={handleChange} className={inputClass(formErrors.vat_cif)} placeholder="B12345678" />
                  )})}
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4" data-testid="producer-notice">
                    <p className="text-sm leading-6 text-stone-700"><strong className="text-stone-950">Nota:</strong> Las cuentas de productores requieren aprobación del administrador antes de empezar a vender.</p>
                  </div>
                </>
              )}

              {isInfluencer && (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {renderField({ id: 'instagram', label: 'Instagram', required: false, error: null, children: <input id="instagram" name="instagram" value={formData.instagram} onChange={handleChange} placeholder="@tu_instagram" className={inputClass(false)} /> })}
                    {renderField({ id: 'tiktok', label: 'TikTok', required: false, error: null, children: <input id="tiktok" name="tiktok" value={formData.tiktok} onChange={handleChange} placeholder="@tu_tiktok" className={inputClass(false)} /> })}
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {renderField({ id: 'youtube', label: 'YouTube', required: false, error: null, children: <input id="youtube" name="youtube" value={formData.youtube} onChange={handleChange} placeholder="URL del canal" className={inputClass(false)} /> })}
                    {renderField({ id: 'twitter', label: 'X / Twitter', required: false, error: null, children: <input id="twitter" name="twitter" value={formData.twitter} onChange={handleChange} placeholder="@tu_cuenta" className={inputClass(false)} /> })}
                  </div>
                  {renderField({ id: 'followers', label: 'Seguidores', required: true, error: formErrors.followers, children: <input id="followers" name="followers" value={formData.followers} onChange={handleChange} placeholder="Ej: 5.000" className={inputClass(formErrors.followers)} /> })}
                  {renderField({ id: 'niche', label: 'Nicho', required: false, error: null, children: <input id="niche" name="niche" value={formData.niche} onChange={handleChange} placeholder="Recetas, estilo de vida, alimentación..." className={inputClass(false)} /> })}
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                    <p className="text-sm leading-6 text-stone-700"><strong className="text-stone-950">Nota:</strong> Las cuentas de influencer requieren aprobación previa. Cuando se apruebe tu acceso podrás activar tu código y empezar a generar comisiones.</p>
                    <ul className="mt-3 space-y-1 text-sm text-stone-600">
                      <li>- <strong className="text-stone-950">3% - 7%</strong> de comisión por tier con atribución de 18 meses</li>
                      <li>- <strong className="text-stone-950">10%</strong> de descuento para tu audiencia</li>
                      <li>- Requisito mínimo: 1.000 seguidores</li>
                    </ul>
                  </div>
                </>
              )}

              {formData.role === 'customer' && (
                <div className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-50" data-testid="consent-section">
                  <div className="border-b border-stone-200 bg-white px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-stone-950" />
                      <span className="text-sm font-medium text-stone-950 md:text-base">Consentimiento de tratamiento de datos</span>
                      <span className="rounded-full bg-stone-950 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.2em] text-white md:text-xs">Obligatorio</span>
                    </div>
                  </div>
                  <div className="border-b border-stone-200 p-4"><ConsentSummary /></div>
                  <div className="px-4 py-3"><ConsentFullDisclosure isExpanded={showConsentModal} onToggle={() => setShowConsentModal((prev) => !prev)} /></div>
                  <div className="border-t border-stone-200 bg-white px-4 py-4">
                    <label htmlFor="analytics_consent" className={`flex cursor-pointer items-start gap-4 rounded-2xl border-2 p-3 transition-colors ${formData.analytics_consent ? 'border-stone-900 bg-stone-100' : 'border-stone-200 bg-stone-50 hover:border-stone-400'}`} data-testid="consent-label">
                      <input type="checkbox" id="analytics_consent" checked={formData.analytics_consent} onChange={(e) => setFormData((prev) => ({ ...prev, analytics_consent: e.target.checked }))} className="mt-0.5 h-5 w-5 cursor-pointer rounded border-stone-400 accent-stone-950" data-testid="consent-checkbox" />
                      <div className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-stone-950 md:text-base">Acepto el tratamiento de datos para personalización y asistencia<span className="ml-1 text-stone-400">*</span></span>
                        <span className="mt-1 block text-xs text-stone-500 md:text-sm">Es necesario para crear la cuenta y activar la experiencia personalizada.</span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              <button type="submit" disabled={loading} className="h-12 w-full rounded-full bg-stone-950 text-base font-medium text-white transition-colors hover:bg-black disabled:opacity-50 md:h-11 md:text-sm" data-testid="register-submit-button">
                {loading ? 'Creando cuenta...' : 'Crear cuenta'}
              </button>
            </form>

            {formData.role === 'customer' && (
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-stone-200" /></div>
                  <div className="relative flex justify-center text-xs md:text-sm"><span className="bg-white px-4 text-stone-500">o continuar con</span></div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const data = await authApi.getGoogleAuthUrl();
                      if (data.auth_url) window.location.href = data.auth_url;
                      else toast.error('Error al conectar con Google.');
                    } catch (error) {
                      toast.error(getAuthErrorMessage(error, 'Error al conectar con Google.'));
                    }
                  }}
                  className="mt-4 flex h-12 w-full items-center justify-center gap-3 rounded-full border border-stone-200 bg-white text-base font-medium text-stone-950 transition-colors hover:bg-stone-50 md:h-11 md:text-sm"
                  data-testid="google-register-button"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#1c1917" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#1c1917" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#1c1917" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#1c1917" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Registrarte con Google
                </button>
              </div>
            )}

            <div className="mt-6 border-t border-stone-200 pt-6 text-center text-sm text-stone-600">
              ¿Ya tienes cuenta? <Link to="/login" className="font-medium text-stone-950 transition-colors hover:text-black" data-testid="login-link">Iniciar sesión</Link>
            </div>
            <div className="mt-4 space-y-1 text-center text-xs text-stone-500">
              {fixedRole !== 'producer' && <p>¿Vienes como productor? <Link to="/productor/registro" className="font-medium text-stone-950 transition-colors hover:text-black">Solicita acceso</Link></p>}
              {fixedRole !== 'influencer' && <p>¿Prefieres aplicar como influencer? <Link to="/influencer/aplicar" className="font-medium text-stone-950 transition-colors hover:text-black">Ir al programa</Link></p>}
              {fixedRole !== 'customer' && <p>¿Solo quieres comprar? <Link to="/register?role=customer" className="font-medium text-stone-950 transition-colors hover:text-black">Crear cuenta personal</Link></p>}
            </div>
          </section>
        </div>
      </main>

      <div className="hidden md:block"><Footer /></div>
    </div>
  );
}
