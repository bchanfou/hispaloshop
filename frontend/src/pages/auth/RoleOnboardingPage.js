import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api/client';

const DESTINATIONS = {
  customer:   '/feed',
  producer:   '/producer',
  importer:   '/importer/dashboard',
  influencer: '/influencer/dashboard',
};

// ── Shared styles ─────────────────────────────────────
const titleStyle = {
  fontSize: 24, fontWeight: 700,
  letterSpacing: '-0.02em', marginBottom: 8,
  color: 'var(--color-black)',
};
const subtitleStyle = {
  fontSize: 15, color: 'var(--color-stone)',
  lineHeight: 1.6, marginBottom: 24,
};
const labelStyle = {
  display: 'block', fontSize: 13, fontWeight: 600,
  color: 'var(--color-black)', marginBottom: 6,
};

// ── Nav buttons ───────────────────────────────────────
function OnboardingNav({ onBack, onNext, nextLabel = 'Continuar →', nextDisabled = false, skipLabel, onSkip }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <button className="hs-btn-primary" onClick={onNext} disabled={nextDisabled}
        style={{ width: '100%', height: 48 }}>
        {nextLabel}
      </button>
      {skipLabel && onSkip && (
        <button onClick={onSkip} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 14, color: 'var(--color-stone)', padding: '8px',
        }}>
          {skipLabel}
        </button>
      )}
      {onBack && (
        <button onClick={onBack} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 14, color: 'var(--color-stone)', padding: '8px',
        }}>
          ← Atrás
        </button>
      )}
    </div>
  );
}

// ── Select Grid ───────────────────────────────────────
function SelectGrid({ options, selected, onToggle }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
      gap: 8, marginBottom: 24,
    }}>
      {options.map(opt => (
        <motion.button key={opt.id} whileTap={{ scale: 0.95 }}
          onClick={() => onToggle(opt.id)}
          style={{
            padding: '14px 12px',
            borderRadius: 'var(--radius-md)',
            border: selected.includes(opt.id) ? '2px solid var(--color-black)' : '1.5px solid var(--color-divider)',
            background: selected.includes(opt.id) ? 'var(--color-black)' : 'var(--color-surface)',
            color: selected.includes(opt.id) ? 'white' : 'var(--color-black)',
            cursor: 'pointer', textAlign: 'center',
            transition: 'var(--transition-base)',
          }}
        >
          <div style={{ fontSize: 24, marginBottom: 4 }}>{opt.emoji}</div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{opt.label}</div>
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
  { id: 'omnivoro', emoji: '\uD83C\uDF7D\uFE0F', label: 'Omnívoro' },
  { id: 'vegetariano', emoji: '\uD83E\uDD66', label: 'Vegetariano' },
  { id: 'vegano', emoji: '\uD83C\uDF31', label: 'Vegano' },
  { id: 'flexitariano', emoji: '\uD83E\uDD57', label: 'Flexitariano' },
  { id: 'sin_gluten', emoji: '\uD83C\uDF3E', label: 'Sin gluten' },
  { id: 'halal', emoji: '\u262A\uFE0F', label: 'Halal' },
  { id: 'kosher', emoji: '\u2721\uFE0F', label: 'Kosher' },
  { id: 'keto', emoji: '\uD83E\uDD69', label: 'Keto' },
];

const ALLERGY_OPTIONS = [
  { id: 'gluten', emoji: '\uD83C\uDF3E', label: 'Gluten' },
  { id: 'lactosa', emoji: '\uD83E\uDD5B', label: 'Lácteos' },
  { id: 'frutos_secos', emoji: '\uD83E\uDD5C', label: 'Frutos secos' },
  { id: 'marisco', emoji: '\uD83E\uDD90', label: 'Marisco' },
  { id: 'soja', emoji: '\uD83E\uDED8', label: 'Soja' },
  { id: 'huevos', emoji: '\uD83E\uDD5A', label: 'Huevos' },
  { id: 'pescado', emoji: '\uD83D\uDC1F', label: 'Pescado' },
  { id: 'cacahuetes', emoji: '\uD83E\uDD5C', label: 'Cacahuetes' },
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
    <div style={{ width: '100%', maxWidth: 480 }}>
      {step === 1 && (
        <>
          <h2 style={titleStyle}>¿Cómo comes?</h2>
          <p style={subtitleStyle}>
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
          <h2 style={titleStyle}>¿Alguna alergia?</h2>
          <p style={subtitleStyle}>
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
          <h2 style={titleStyle}>Sigue a productores</h2>
          <p style={subtitleStyle}>
            Tu feed se personalizará con sus productos y contenido.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {suggestedProducers.map(p => (
              <div key={p.producer_id || p.id || p.store_id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', background: 'var(--color-surface)',
                borderRadius: 'var(--radius-md)', border: '0.5px solid var(--color-divider)',
              }}>
                {p.logo_url || p.avatar_url ? (
                  <img src={p.logo_url || p.avatar_url} alt="" style={{
                    width: 44, height: 44, borderRadius: '50%', objectFit: 'cover',
                  }} />
                ) : (
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: 'var(--color-cream)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20,
                  }}>{(p.name || p.store_name || '?')[0]}</div>
                )}
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 2px' }}>
                    {p.name || p.store_name}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--color-stone)', margin: 0 }}>
                    {p.tagline || p.region || ''}
                  </p>
                </div>
                <motion.button whileTap={{ scale: 0.92 }}
                  onClick={() => toggleItem(followedProducers, setFollowedProducers, p.producer_id || p.id)}
                  style={{
                    padding: '7px 16px', borderRadius: 'var(--radius-full)',
                    border: 'none', cursor: 'pointer',
                    background: followedProducers.includes(p.producer_id || p.id)
                      ? 'var(--color-cream)' : 'var(--color-black)',
                    color: followedProducers.includes(p.producer_id || p.id)
                      ? 'var(--color-black)' : 'white',
                    fontSize: 13, fontWeight: 600, transition: 'var(--transition-base)',
                  }}
                >
                  {followedProducers.includes(p.producer_id || p.id) ? 'Siguiendo' : 'Seguir'}
                </motion.button>
              </div>
            ))}
            {suggestedProducers.length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--color-stone)', textAlign: 'center', padding: 20 }}>
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

  return (
    <div style={{ width: '100%', maxWidth: 480 }}>
      {step === 1 && (
        <>
          <h2 style={titleStyle}>Crea tu tienda</h2>
          <p style={subtitleStyle}>Esto es lo primero que verán tus clientes.</p>

          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <label htmlFor="logo-upload" style={{ cursor: 'pointer' }}>
              <div style={{
                width: 96, height: 96, borderRadius: '50%',
                background: 'var(--color-cream)', border: '2px dashed var(--color-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 8px', overflow: 'hidden',
              }}>
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 28 }}>📷</div>
                    <div style={{ fontSize: 11, color: 'var(--color-stone)' }}>Añadir logo</div>
                  </div>
                )}
              </div>
            </label>
            <input id="logo-upload" type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} />
            <p style={{ fontSize: 11, color: 'var(--color-stone)' }}>JPG, PNG o WebP · Máximo 5MB</p>
          </div>

          <label style={labelStyle}>Nombre de tu tienda</label>
          <input className="hs-input" value={storeName} onChange={e => setStoreName(e.target.value)}
            placeholder="Ej: Aceites Cortijo El Bosque" style={{ marginBottom: 24 }} />
          <OnboardingNav onNext={saveStep1} nextLabel="Continuar →" />
        </>
      )}

      {step === 2 && (
        <>
          <h2 style={titleStyle}>Tu primer producto</h2>
          <p style={subtitleStyle}>Puedes añadir más desde tu panel. Este paso es opcional.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            <div>
              <label style={labelStyle}>Nombre del producto</label>
              <input className="hs-input" value={product.name}
                onChange={e => setProduct({ ...product, name: e.target.value })}
                placeholder="Ej: Aceite de Oliva Virgen Extra Bio" />
            </div>
            <div>
              <label style={labelStyle}>Precio (€)</label>
              <input className="hs-input" type="number" value={product.price}
                onChange={e => setProduct({ ...product, price: e.target.value })}
                placeholder="12.90" min="0" step="0.01" />
            </div>
            <div>
              <label style={labelStyle}>Categoría</label>
              <select className="hs-input" value={product.category}
                onChange={e => setProduct({ ...product, category: e.target.value })}>
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
          <h2 style={titleStyle}>Conecta tu cuenta bancaria</h2>
          <p style={subtitleStyle}>
            Necesitamos verificar tu identidad para transferirte el dinero de tus ventas de forma segura.
          </p>
          <div style={{
            background: 'var(--color-cream)', borderRadius: 'var(--radius-lg)',
            padding: 20, marginBottom: 24,
          }}>
            {['Proceso seguro gestionado por Stripe',
              'Tus datos bancarios nunca pasan por Hispaloshop',
              'Recibirás tus pagos automáticamente',
              'Puedes hacerlo más tarde desde tu panel',
            ].map((text, i) => (
              <p key={i} style={{ fontSize: 13, color: 'var(--color-stone)', margin: '0 0 8px' }}>
                ✓ {text}
              </p>
            ))}
          </div>
          <button className="hs-btn-primary" onClick={connectStripe} disabled={stripeLoading}
            style={{ width: '100%', height: 48, marginBottom: 10 }}>
            {stripeLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Redirigiendo...</> : 'Conectar cuenta bancaria →'}
          </button>
          <button onClick={onFinish} style={{
            width: '100%', padding: 12, background: 'none', border: 'none',
            cursor: 'pointer', fontSize: 14, color: 'var(--color-stone)',
          }}>
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
        .catch(() => setDiscountCode('HSXXXX'));
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
    <div style={{ width: '100%', maxWidth: 480 }}>
      {step === 1 && (
        <>
          <h2 style={titleStyle}>Elige tus favoritos</h2>
          <p style={subtitleStyle}>
            Aparecerán en tu perfil. Cuando alguien los compre, ganas comisión.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 24 }}>
            {trending.map(product => (
              <motion.div key={product.product_id || product.id} whileTap={{ scale: 0.95 }}
                onClick={() => toggleItem(selectedProducts, setSelectedProducts, product.product_id || product.id)}
                style={{
                  borderRadius: 'var(--radius-md)', overflow: 'hidden', cursor: 'pointer',
                  border: selectedProducts.includes(product.product_id || product.id)
                    ? '2.5px solid var(--color-black)' : '1.5px solid transparent',
                  position: 'relative',
                }}>
                <img src={product.images?.[0] || '/placeholder.png'} alt={product.name}
                  style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                {selectedProducts.includes(product.product_id || product.id) && (
                  <div style={{
                    position: 'absolute', top: 6, right: 6,
                    background: 'var(--color-black)', color: 'white',
                    borderRadius: '50%', width: 20, height: 20,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
                  }}>✓</div>
                )}
                <div style={{ padding: '6px 6px 8px' }}>
                  <p style={{
                    fontSize: 11, margin: '0 0 2px', color: 'var(--color-black)', fontWeight: 500,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{product.name}</p>
                  <p style={{ fontSize: 11, color: 'var(--color-stone)', margin: 0 }}>{product.price}€</p>
                </div>
              </motion.div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: 'var(--color-stone)', textAlign: 'center', marginBottom: 16 }}>
            {selectedProducts.length} seleccionados
          </p>
          <OnboardingNav onNext={saveProducts} nextLabel="Continuar →" />
        </>
      )}

      {step === 2 && (
        <>
          <h2 style={titleStyle}>Tu código de descuento</h2>
          <p style={subtitleStyle}>
            Tus seguidores obtienen un 10% de descuento en su primera compra. Tú ganas comisión de por vida.
          </p>
          <div style={{
            background: 'var(--color-black)', borderRadius: 'var(--radius-lg)',
            padding: 24, textAlign: 'center', marginBottom: 24,
          }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: '0 0 8px' }}>TU CÓDIGO PERSONAL</p>
            <p style={{ color: 'white', fontSize: 28, fontWeight: 800, letterSpacing: '0.08em', margin: '0 0 16px' }}>
              {discountCode || '...'}
            </p>
            <button onClick={() => { navigator.clipboard.writeText(discountCode); toast.success('¡Código copiado!'); }}
              style={{
                background: 'white', color: 'black', border: 'none',
                borderRadius: 'var(--radius-full)', padding: '10px 20px',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}>
              Copiar código
            </button>
          </div>
          <div style={{
            background: 'var(--color-cream)', borderRadius: 'var(--radius-md)',
            padding: 16, marginBottom: 24,
          }}>
            <p style={{ fontSize: 13, color: 'var(--color-stone)', margin: '0 0 6px' }}>
              Cómo ganas dinero:
            </p>
            {['Alguien usa tu código → 10% de descuento para ellos',
              'Quedan vinculados a ti durante 18 meses',
              'Cada compra que hagan te genera comisión',
              'Cobras automáticamente en tu cuenta bancaria',
            ].map((t, i) => (
              <p key={i} style={{ fontSize: 12, color: 'var(--color-stone)', margin: '0 0 4px' }}>
                {i + 1}. {t}
              </p>
            ))}
          </div>
          <OnboardingNav onBack={() => setStep(1)} onNext={() => setStep(3)} nextLabel="Ver mi dashboard →" />
        </>
      )}

      {step === 3 && (
        <>
          <h2 style={titleStyle}>¡Todo listo!</h2>
          <p style={subtitleStyle}>Empieza compartiendo tu código con tus seguidores.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
            {[
              { emoji: '📊', title: 'Tu dashboard', desc: 'Ve tus comisiones en tiempo real' },
              { emoji: '🔗', title: 'Tus links', desc: 'Genera links para cada producto' },
              { emoji: '💸', title: 'Cobra cada mes', desc: 'Mínimo 20€, transferencia automática' },
            ].map(item => (
              <div key={item.title} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px', background: 'var(--color-surface)',
                borderRadius: 'var(--radius-md)', border: '0.5px solid var(--color-divider)',
              }}>
                <span style={{ fontSize: 28 }}>{item.emoji}</span>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{item.title}</p>
                  <p style={{ fontSize: 12, color: 'var(--color-stone)', margin: 0 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="hs-btn-primary" onClick={onFinish} style={{ width: '100%', height: 48 }}>
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
      <div style={{
        minHeight: '100dvh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--color-cream)',
      }}>
        <div className="hs-spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--color-cream)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', background: 'var(--color-surface)',
        borderBottom: '0.5px solid var(--color-divider)',
      }}>
        <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.03em' }}>
          hispaloshop
        </span>
        <button onClick={handleFinish} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 14, color: 'var(--color-stone)', fontWeight: 500,
        }}>
          Saltar
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: 'var(--color-cream)' }}>
        <div style={{
          height: '100%', background: 'var(--color-black)',
          width: `${(step / totalSteps) * 100}%`,
          transition: 'width 0.4s ease',
        }} />
      </div>

      {/* Step content */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '24px 20px',
      }}>
        {(role === 'customer') && <CustomerOnboarding step={step} setStep={setStep} onFinish={handleFinish} />}
        {(role === 'producer' || role === 'importer') && <ProducerOnboarding step={step} setStep={setStep} onFinish={handleFinish} />}
        {(role === 'influencer') && <InfluencerOnboarding step={step} setStep={setStep} onFinish={handleFinish} />}
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '16px 0 32px' }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{
            width: i === step ? 20 : 7, height: 7, borderRadius: 4,
            background: i === step ? 'var(--color-black)' : 'var(--color-border)',
            transition: 'all 0.3s ease',
          }} />
        ))}
      </div>
    </div>
  );
}
