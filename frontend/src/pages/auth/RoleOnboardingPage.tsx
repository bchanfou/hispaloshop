// @ts-nocheck
/**
 * DEAD CODE — This component is defined at route /onboarding/:role but
 * no registration flow navigates to this route. All roles go through:
 * - Consumer: /onboarding (OnboardingPage.tsx)
 * - Producer: /producer/verification
 * - Influencer: /influencer/fiscal-setup
 * - Importer: /importer/dashboard
 *
 * Consider removing this file and its route in App.js (line ~481).
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api/client';

const DESTINATIONS = {
  customer:   '/',
  producer:   '/producer',
  importer:   '/importer/dashboard',
  influencer: '/influencer/dashboard',
};

// ── Nav buttons ───────────────────────────────────────
function OnboardingNav({ onBack, onNext, nextLabel = 'Continuar →', nextDisabled = false, skipLabel, onSkip }) {
  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={onNext}
        disabled={nextDisabled}
        className="flex h-12 w-full items-center justify-center rounded-full bg-stone-950 text-sm font-medium text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:bg-stone-300"
      >
        {nextLabel}
      </button>
      {skipLabel && onSkip && (
        <button
          onClick={onSkip}
          className="bg-transparent border-none cursor-pointer p-2 text-sm text-stone-500"
        >
          {skipLabel}
        </button>
      )}
      {onBack && (
        <button
          onClick={onBack}
          className="bg-transparent border-none cursor-pointer p-2 text-sm text-stone-500"
        >
          ← Atrás
        </button>
      )}
    </div>
  );
}

// ── Select Grid ───────────────────────────────────────
function SelectGrid({ options, selected, onToggle }) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-2">
      {options.map(opt => (
        <motion.button
          key={opt.id}
          whileTap={{ scale: 0.95 }}
          onClick={() => onToggle(opt.id)}
          className={`cursor-pointer rounded-xl border-2 px-3 py-3.5 text-center transition-all ${
            selected.includes(opt.id)
              ? 'border-stone-950 bg-stone-950 text-white'
              : 'border-stone-200 bg-stone-100 text-stone-950 hover:border-stone-200'
          }`}
        >
          <div className="mb-1 text-2xl">{opt.emoji}</div>
          <div className="text-[13px] font-medium">{opt.label}</div>
        </motion.button>
      ))}
    </div>
  );
}

function toggleItem(arr, setArr, id) {
  setArr(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
}

// ── CUSTOMER ONBOARDING ───────────────────────────────
const DIET_OPTIONS = [
  { id: 'omnivoro', emoji: '🍽️', label: 'Omnívoro' },
  { id: 'vegetariano', emoji: '🥦', label: 'Vegetariano' },
  { id: 'vegano', emoji: '🌱', label: 'Vegano' },
  { id: 'flexitariano', emoji: '🥗', label: 'Flexitariano' },
  { id: 'sin_gluten', emoji: '🌾', label: 'Sin gluten' },
  { id: 'halal', emoji: '☪️', label: 'Halal' },
  { id: 'kosher', emoji: '✡️', label: 'Kosher' },
  { id: 'keto', emoji: '🥩', label: 'Keto' },
];

const ALLERGY_OPTIONS = [
  { id: 'gluten', emoji: '🌾', label: 'Gluten' },
  { id: 'lactosa', emoji: '🥛', label: 'Lácteos' },
  { id: 'frutos_secos', emoji: '🥜', label: 'Frutos secos' },
  { id: 'marisco', emoji: '🦐', label: 'Marisco' },
  { id: 'soja', emoji: '🫘', label: 'Soja' },
  { id: 'huevos', emoji: '🥚', label: 'Huevos' },
  { id: 'pescado', emoji: '🐟', label: 'Pescado' },
  { id: 'cacahuetes', emoji: '🥜', label: 'Cacahuetes' },
];

function CustomerOnboarding({ step, setStep, onFinish }) {
  const [diet, setDiet] = useState([]);
  const [allergies, setAllergies] = useState([]);
  const [followedProducers, setFollowedProducers] = useState([]);
  const [suggestedProducers, setSuggestedProducers] = useState([]);

  useEffect(() => {
    if (step === 3) {
      apiClient.get('/stores?limit=6&sort=rating')
        .then(data => {
          const list = Array.isArray(data) ? data : (data?.stores || []);
          setSuggestedProducers(list.slice(0, 6));
        })
        .catch(() => {});
    }
  }, [step]);

  const saveAndNext = async () => {
    try {
      if (step === 1) {
        await apiClient.patch('/users/me', { dietary_preferences: diet });
        setStep(2);
      } else if (step === 2) {
        await apiClient.patch('/users/me', { allergies });
        setStep(3);
      } else {
        onFinish();
      }
    } catch {
      // Continue even if save fails
      if (step < 3) setStep(step + 1);
      else onFinish();
    }
  };

  return (
    <div className="w-full max-w-[400px]">
      {step === 1 && (
        <>
          <h2 className="mb-2 text-2xl font-bold tracking-tight text-stone-950">¿Cómo comes?</h2>
          <p className="mb-6 text-[15px] leading-relaxed text-stone-500">
            Para recomendarte los mejores productos. Puedes elegir varias opciones.
          </p>
          <SelectGrid options={DIET_OPTIONS} selected={diet}
            onToggle={id => toggleItem(diet, setDiet, id)} />
          <OnboardingNav onNext={saveAndNext}
            nextLabel={diet.length > 0 ? 'Continuar →' : 'Saltar →'} />
        </>
      )}
      {step === 2 && (
        <>
          <h2 className="mb-2 text-2xl font-bold tracking-tight text-stone-950">¿Alguna alergia?</h2>
          <p className="mb-6 text-[15px] leading-relaxed text-stone-500">
            Nunca te recomendaremos productos que te puedan afectar.
          </p>
          <SelectGrid options={ALLERGY_OPTIONS} selected={allergies}
            onToggle={id => toggleItem(allergies, setAllergies, id)} />
          <OnboardingNav onBack={() => setStep(1)} onNext={saveAndNext}
            nextLabel={allergies.length > 0 ? 'Continuar →' : 'Sin alergias →'} />
        </>
      )}
      {step === 3 && (
        <>
          <h2 className="mb-2 text-2xl font-bold tracking-tight text-stone-950">Sigue a productores</h2>
          <p className="mb-6 text-[15px] leading-relaxed text-stone-500">
            Tu feed se personalizará con sus productos y contenido.
          </p>
          <div className="mb-6 flex flex-col gap-2.5">
            {suggestedProducers.map(p => (
              <div key={p.producer_id || p.id || p.store_id} className="flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-100 px-3.5 py-3">
                {p.logo_url || p.avatar_url ? (
                  <img src={p.logo_url || p.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover" />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-50 text-xl">
                    {(p.name || p.store_name || '?')[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-stone-950 truncate">{p.name || p.store_name}</p>
                  <p className="text-xs text-stone-500 truncate">{p.tagline || p.region || ''}</p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => toggleItem(followedProducers, setFollowedProducers, p.producer_id || p.id)}
                  className={`shrink-0 rounded-full border-none px-4 py-1.5 text-[13px] font-semibold transition-all ${
                    followedProducers.includes(p.producer_id || p.id)
                      ? 'bg-stone-50 text-stone-950'
                      : 'bg-stone-950 text-white'
                  }`}
                >
                  {followedProducers.includes(p.producer_id || p.id) ? 'Siguiendo' : 'Seguir'}
                </motion.button>
              </div>
            ))}
            {suggestedProducers.length === 0 && (
              <p className="py-5 text-center text-[13px] text-stone-500">
                Cargando productores...
              </p>
            )}
          </div>
          <OnboardingNav onBack={() => setStep(2)} onNext={saveAndNext}
            nextLabel="Ir al feed →" />
        </>
      )}
    </div>
  );
}

// ── PRODUCER / IMPORTER ONBOARDING ────────────────────
function ProducerOnboarding({ step, setStep, onFinish }) {
  const [storeName, setStoreName] = useState('');
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [product, setProduct] = useState({ name: '', price: '', category: '' });
  const [stripeLoading, setStripeLoading] = useState(false);

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogo(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const saveStep1 = async () => {
    if (!storeName.trim()) { toast.error('Escribe el nombre de tu tienda'); return; }
    try {
      const fd = new FormData();
      fd.append('name', storeName);
      if (logo) fd.append('logo', logo);
      await apiClient.post('/stores/setup', fd);
    } catch { /* continue */ }
    setStep(2);
  };

  const saveStep2 = async () => {
    if (product.name && product.price) {
      try {
        await apiClient.post('/products', {
          name: product.name, price: parseFloat(product.price),
          category_id: product.category || 'otros', status: 'pending',
          description: '', images: [],
        });
      } catch { /* continue */ }
    }
    setStep(3);
  };

  const connectStripe = async () => {
    setStripeLoading(true);
    try {
      const data = await apiClient.post('/sellers/me/stripe/connect');
      if (data?.onboarding_url || data?.url) {
        window.location.href = data.onboarding_url || data.url;
      } else {
        toast.error('Error conectando con Stripe');
        onFinish();
      }
    } catch {
      toast.error('Error conectando con Stripe. Hazlo desde tu panel.');
      onFinish();
    } finally {
      setStripeLoading(false);
    }
  };

  const inputClass = "h-12 w-full rounded-xl border border-stone-200 bg-white px-3.5 text-sm text-stone-950 placeholder:text-stone-400 focus:border-stone-950 focus:outline-none transition-colors";

  return (
    <div className="w-full max-w-[400px]">
      {step === 1 && (
        <>
          <h2 className="mb-2 text-2xl font-bold tracking-tight text-stone-950">Crea tu tienda</h2>
          <p className="mb-6 text-[15px] leading-relaxed text-stone-500">Esto es lo primero que verán tus clientes.</p>

          <div className="mb-6 text-center">
            <label htmlFor="logo-upload" className="cursor-pointer">
              <div className="mx-auto mb-2 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-stone-200 bg-stone-50">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  <div className="text-center">
                    <div className="text-[28px]">📷</div>
                    <div className="text-[11px] text-stone-500">Añadir logo</div>
                  </div>
                )}
              </div>
            </label>
            <input id="logo-upload" type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
            <p className="text-[11px] text-stone-500">JPG, PNG o WebP · Máximo 5MB</p>
          </div>

          <label className="mb-1.5 block text-[13px] font-semibold text-stone-950">Nombre de tu tienda</label>
          <input
            className={`${inputClass} mb-6`}
            value={storeName}
            onChange={e => setStoreName(e.target.value)}
            placeholder="Ej: Aceites Cortijo El Bosque"
          />
          <OnboardingNav onNext={saveStep1} nextLabel="Continuar →" />
        </>
      )}

      {step === 2 && (
        <>
          <h2 className="mb-2 text-2xl font-bold tracking-tight text-stone-950">Tu primer producto</h2>
          <p className="mb-6 text-[15px] leading-relaxed text-stone-500">Puedes añadir más desde tu panel. Este paso es opcional.</p>
          <div className="mb-6 flex flex-col gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-stone-950">Nombre del producto</label>
              <input
                className={inputClass}
                value={product.name}
                onChange={e => setProduct({ ...product, name: e.target.value })}
                placeholder="Ej: Aceite de Oliva Virgen Extra Bio"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-stone-950">Precio (€)</label>
              <input
                className={inputClass}
                type="number"
                value={product.price}
                onChange={e => setProduct({ ...product, price: e.target.value })}
                placeholder="12.90"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-stone-950">Categoría</label>
              <select
                className={inputClass}
                value={product.category}
                onChange={e => setProduct({ ...product, category: e.target.value })}
              >
                <option value="">Selecciona una categoría</option>
                <option value="conservas">Conservas</option>
                <option value="aceites">Aceites</option>
                <option value="bebidas">Bebidas sin alcohol</option>
                <option value="carnicos">Cárnicos</option>
                <option value="lacteos">Lácteos</option>
                <option value="panaderia">Panadería</option>
                <option value="dulces">Dulces y mermeladas</option>
                <option value="otros">Otros</option>
              </select>
            </div>
          </div>
          <OnboardingNav onBack={() => setStep(1)} onNext={saveStep2}
            nextLabel="Continuar →" skipLabel="Saltar por ahora" onSkip={() => setStep(3)} />
        </>
      )}

      {step === 3 && (
        <>
          <h2 className="mb-2 text-2xl font-bold tracking-tight text-stone-950">Conecta tu cuenta bancaria</h2>
          <p className="mb-6 text-[15px] leading-relaxed text-stone-500">
            Necesitamos verificar tu identidad para transferirte el dinero de tus ventas de forma segura.
          </p>
          <div className="mb-6 rounded-2xl bg-stone-50 p-5">
            {['Proceso seguro gestionado por Stripe',
              'Tus datos bancarios nunca pasan por Hispaloshop',
              'Recibirás tus pagos automáticamente',
              'Puedes hacerlo más tarde desde tu panel',
            ].map((text, i) => (
              <p key={i} className="mb-2 text-[13px] text-stone-500 last:mb-0">
                ✓ {text}
              </p>
            ))}
          </div>
          <button
            onClick={connectStripe}
            disabled={stripeLoading}
            className="mb-2.5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-stone-950 text-sm font-medium text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            {stripeLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Redirigiendo...</> : 'Conectar cuenta bancaria →'}
          </button>
          <button
            onClick={onFinish}
            className="w-full cursor-pointer border-none bg-transparent p-3 text-sm text-stone-500"
          >
            Lo haré más tarde
          </button>
        </>
      )}
    </div>
  );
}

// ── INFLUENCER ONBOARDING ─────────────────────────────
function InfluencerOnboarding({ step, setStep, onFinish }) {
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [trending, setTrending] = useState([]);
  const [discountCode, setDiscountCode] = useState('');

  useEffect(() => {
    if (step === 1) {
      apiClient.get('/products?limit=12&sort=popular')
        .then(data => {
          const list = Array.isArray(data) ? data : (data?.products || []);
          setTrending(list.slice(0, 12));
        })
        .catch(() => {});
    }
    if (step === 2) {
      apiClient.get('/influencer/me/code')
        .then(data => setDiscountCode(data?.code || data?.discount_code || ''))
        .catch(() => { setDiscountCode(''); toast.error('No se pudo obtener tu código'); });
    }
  }, [step]);

  const saveProducts = async () => {
    if (selectedProducts.length > 0) {
      try {
        await apiClient.post('/influencer/product-selection', { product_ids: selectedProducts });
      } catch { /* continue */ }
    }
    setStep(2);
  };

  return (
    <div className="w-full max-w-[400px]">
      {step === 1 && (
        <>
          <h2 className="mb-2 text-2xl font-bold tracking-tight text-stone-950">Elige tus favoritos</h2>
          <p className="mb-6 text-[15px] leading-relaxed text-stone-500">
            Aparecerán en tu perfil. Cuando alguien los compre, ganas comisión.
          </p>
          <div className="mb-6 grid grid-cols-3 gap-2">
            {trending.map(product => {
              const pid = product.product_id || product.id;
              const isSelected = selectedProducts.includes(pid);
              return (
                <motion.div
                  key={pid}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => toggleItem(selectedProducts, setSelectedProducts, pid)}
                  className={`relative cursor-pointer overflow-hidden rounded-xl border-2 transition-all ${
                    isSelected ? 'border-stone-950' : 'border-transparent'
                  }`}
                >
                  <img
                    src={product.images?.[0] || '/placeholder.png'}
                    alt={product.name}
                    className="block aspect-square w-full object-cover"
                  />
                  {isSelected && (
                    <div className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-stone-950 text-[11px] text-white">
                      ✓
                    </div>
                  )}
                  <div className="p-1.5 pb-2">
                    <p className="truncate text-[11px] font-medium text-stone-950">{product.name}</p>
                    <p className="text-[11px] text-stone-500">{product.price}€</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
          <p className="mb-4 text-center text-xs text-stone-500">
            {selectedProducts.length} seleccionados
          </p>
          <OnboardingNav onNext={saveProducts} nextLabel="Continuar →" />
        </>
      )}

      {step === 2 && (
        <>
          <h2 className="mb-2 text-2xl font-bold tracking-tight text-stone-950">Tu código de descuento</h2>
          <p className="mb-6 text-[15px] leading-relaxed text-stone-500">
            Tus seguidores obtienen un 10% de descuento en su primera compra. Tú ganas comisión de por vida.
          </p>
          <div className="mb-6 rounded-2xl bg-stone-950 p-6 text-center">
            <p className="mb-2 text-xs text-stone-400">TU CÓDIGO PERSONAL</p>
            <p className="mb-4 text-[28px] font-extrabold tracking-widest text-white">
              {discountCode || '...'}
            </p>
            <button
              onClick={() => { navigator.clipboard.writeText(discountCode); toast.success('¡Código copiado!'); }}
              className="cursor-pointer rounded-full border-none bg-white px-5 py-2.5 text-sm font-semibold text-stone-950 transition-colors hover:bg-stone-100"
            >
              Copiar código
            </button>
          </div>
          <div className="mb-6 rounded-xl bg-stone-50 p-4">
            <p className="mb-1.5 text-[13px] text-stone-500">
              Cómo ganas dinero:
            </p>
            {['Alguien usa tu código → 10% de descuento para ellos',
              'Quedan vinculados a ti durante 18 meses',
              'Cada compra que hagan te genera comisión',
              'Cobras automáticamente en tu cuenta bancaria',
            ].map((t, i) => (
              <p key={i} className="mb-1 text-xs text-stone-500">
                {i + 1}. {t}
              </p>
            ))}
          </div>
          <OnboardingNav onBack={() => setStep(1)} onNext={() => setStep(3)} nextLabel="Ver mi dashboard →" />
        </>
      )}

      {step === 3 && (
        <>
          <h2 className="mb-2 text-2xl font-bold tracking-tight text-stone-950">¡Todo listo!</h2>
          <p className="mb-6 text-[15px] leading-relaxed text-stone-500">Empieza compartiendo tu código con tus seguidores.</p>
          <div className="mb-8 flex flex-col gap-2.5">
            {[
              { emoji: '📊', title: 'Tu dashboard', desc: 'Ve tus comisiones en tiempo real' },
              { emoji: '🔗', title: 'Tus links', desc: 'Genera links para cada producto' },
              { emoji: '💸', title: 'Cobra cada mes', desc: 'Mínimo 20€, transferencia automática' },
            ].map(item => (
              <div key={item.title} className="flex items-center gap-3.5 rounded-xl border border-stone-200 bg-stone-100 px-4 py-3.5">
                <span className="text-[28px]">{item.emoji}</span>
                <div>
                  <p className="text-sm font-semibold text-stone-950">{item.title}</p>
                  <p className="text-xs text-stone-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={onFinish}
            className="flex h-12 w-full items-center justify-center rounded-full bg-stone-950 text-sm font-medium text-white transition-colors hover:bg-black"
          >
            Ir a mi dashboard →
          </button>
        </>
      )}
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────
export default function RoleOnboardingPage() {
  const { role } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  const handleFinish = useCallback(async () => {
    // Mark onboarding as completed on the backend before navigating
    try {
      await apiClient.patch('/users/me', { onboarding_completed: true });
    } catch {
      // Continue to destination even if the patch fails — user can still use the app
    }
    const dest = DESTINATIONS[role] || '/feed';
    navigate(dest, { replace: true });
  }, [role, navigate]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { replace: true });
    }
  }, [authLoading, user, navigate]);

  if (authLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-stone-50">
        <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-stone-50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-200 bg-stone-100 px-5 py-4">
        <span className="text-lg font-extrabold tracking-tight text-stone-950">
          hispaloshop
        </span>
        <button
          onClick={handleFinish}
          className="cursor-pointer border-none bg-transparent text-sm font-medium text-stone-500 transition-colors hover:text-stone-700"
        >
          Saltar
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-[3px] bg-stone-50">
        <div
          className="h-full bg-stone-950 transition-[width] duration-400 ease-out"
          style={{ width: `${(step / totalSteps) * 100}%` }}
        />
      </div>

      {/* Step content */}
      <div className="flex flex-1 items-center justify-center px-5 py-6">
        {(role === 'customer') && <CustomerOnboarding step={step} setStep={setStep} onFinish={handleFinish} />}
        {(role === 'producer' || role === 'importer') && <ProducerOnboarding step={step} setStep={setStep} onFinish={handleFinish} />}
        {(role === 'influencer') && <InfluencerOnboarding step={step} setStep={setStep} onFinish={handleFinish} />}
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-1.5 pb-8 pt-4">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className={`h-[7px] rounded-full transition-all duration-300 ${
              i === step ? 'w-5 bg-stone-950' : 'w-[7px] bg-stone-200'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
