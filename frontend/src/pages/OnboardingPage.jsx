import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2, Check, UserPlus, ShoppingCart, Wheat, Star, Globe, Droplets, Package, Leaf, UtensilsCrossed, Baby, PawPrint } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api/client';

/* ── Constants ── */
const ROLES = [
  { id: 'consumer', icon: <ShoppingCart size={24} color="#fff" />, label: 'Consumidor', desc: 'Quiero descubrir y comprar productos artesanales' },
  { id: 'producer', icon: <Wheat size={24} color="#fff" />, label: 'Productor', desc: 'Tengo productos artesanales y quiero venderlos' },
  { id: 'influencer', icon: <Star size={24} color="#fff" />, label: 'Influencer', desc: 'Creo contenido y quiero ganar comisiones' },
  { id: 'importer', icon: <Globe size={24} color="#fff" />, label: 'Importador', desc: 'Busco productos para importar o distribuir' },
];

const PREFERENCES = [
  { id: 'aceites', icon: <Droplets size={18} className="text-stone-950" />, label: 'Aceites' },
  { id: 'mieles', emoji: '🍯', label: 'Mieles' },
  { id: 'quesos', emoji: '🧀', label: 'Quesos' },
  { id: 'carnes', emoji: '🥩', label: 'Carnes' },
  { id: 'conservas', icon: <Package size={18} className="text-stone-950" />, label: 'Conservas' },
  { id: 'snacks', emoji: '🍿', label: 'Snacks' },
  { id: 'ecologico', icon: <Leaf size={18} className="text-stone-950" />, label: 'Ecológico' },
  { id: 'gourmet', icon: <UtensilsCrossed size={18} className="text-stone-950" />, label: 'Gourmet' },
  { id: 'sin-gluten', icon: <Wheat size={18} className="text-stone-950" />, label: 'Sin gluten' },
  { id: 'vegano', emoji: '🥬', label: 'Vegano' },
  { id: 'bebes', icon: <Baby size={18} className="text-stone-950" />, label: 'Bebés' },
  { id: 'mascotas', icon: <PawPrint size={18} className="text-stone-950" />, label: 'Mascotas' },
];

const slideVariants = {
  enter: (dir) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir < 0 ? 300 : -300, opacity: 0 }),
};

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, checkAuth } = useAuth();
  const [screen, setScreen] = useState(1);
  const [direction, setDirection] = useState(1);
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedPrefs, setSelectedPrefs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [handleFinishLaterLoading, setHandleFinishLaterLoading] = useState(false);

  // Redirect if not authenticated or already has role
  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login', { replace: true }); return; }
    if (user.role && user.role !== 'customer') { navigate('/', { replace: true }); return; }
    // If customer with completed onboarding, redirect
    if (user.role === 'customer' && user.onboarding_completed) { navigate('/', { replace: true }); }
  }, [user, authLoading, navigate]);

  const goTo = (s) => {
    setDirection(s > screen ? 1 : -1);
    setScreen(s);
  };

  const togglePref = (id) => {
    setSelectedPrefs(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await apiClient.post('/auth/set-role', {
        role: selectedRole,
        preferences: selectedPrefs,
      });
      await checkAuth();

      // Navigate based on role
      if (selectedRole === 'producer') {
        navigate('/producer/verification', { replace: true });
      } else if (selectedRole === 'influencer') {
        navigate('/influencer/fiscal-setup', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Error al guardar tu perfil. Inténtalo de nuevo.');
      navigate('/', { replace: true });
    } finally {
      setSaving(false);
    }
  };

  const handleFinishLater = async () => {
    setHandleFinishLaterLoading(true);
    try {
      await apiClient.post('/auth/set-role', {
        role: selectedRole,
        preferences: selectedPrefs,
      });
      await checkAuth();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Error al guardar. Puedes configurar tu perfil más tarde.');
    } finally {
      setHandleFinishLaterLoading(false);
    }
    navigate('/', { replace: true });
  };

  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--color-black)',
      }}>
        <Loader2 size={32} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  /* ── Stepper dots ── */
  const Stepper = () => (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '16px 0' }}>
      {[1, 2, 3, 4].map(s => (
        <div key={s} style={{
          width: 8, height: 8, borderRadius: '50%',
          background: s === screen ? 'var(--color-black)' : 'transparent',
          border: s === screen ? 'none' : '1.5px solid var(--color-border)',
          transition: 'all 0.3s ease',
        }} />
      ))}
    </div>
  );

  /* ── SCREEN 1: Role selector (dark) ── */
  const Screen1 = () => (
    <div style={{
      minHeight: '100vh', background: 'var(--color-black)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '40px 24px',
      fontFamily: 'var(--font-sans)',
    }}>
      {/* Logo */}
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: 'rgba(255,255,255,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 32,
      }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>H</span>
      </div>

      <h1 style={{
        fontSize: 32, fontWeight: 700, color: '#fff',
        textAlign: 'center', margin: '0 0 8px',
        fontFamily: 'var(--font-sans)',
      }}>
        Bienvenido a Hispaloshop
      </h1>
      <p style={{
        fontSize: 15, color: 'rgba(255,255,255,0.65)',
        textAlign: 'center', marginBottom: 48, lineHeight: 1.5,
      }}>
        Conecta directamente con productores locales de alimentación saludable. Sin intermediarios.
        ¿Quién eres tú?
      </p>

      <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
        Soy...
      </h3>

      {/* Role cards 2x2 */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
        width: '100%', maxWidth: 400,
      }}>
        {ROLES.map(role => {
          const isSelected = selectedRole === role.id;
          return (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role.id)}
              style={{
                background: isSelected ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)',
                border: isSelected
                  ? '1.5px solid rgba(255,255,255,0.6)'
                  : '1.5px solid rgba(255,255,255,0.15)',
                borderRadius: 'var(--radius-xl)',
                padding: '20px 16px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'var(--transition-fast)',
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 8, display: 'flex', justifyContent: 'center' }}>{role.icon}</div>
              <p style={{
                fontSize: 'var(--text-base, 16px)', fontWeight: 600,
                color: '#fff', margin: '0 0 4px',
              }}>
                {role.label}
              </p>
              <p style={{
                fontSize: 'var(--text-xs, 12px)',
                color: 'rgba(255,255,255,0.5)',
                margin: 0, lineHeight: 1.4,
              }}>
                {role.desc}
              </p>
            </button>
          );
        })}
      </div>

      {/* Continue button */}
      {selectedRole && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => goTo(2)}
          style={{
            width: '100%', maxWidth: 400, height: 52, marginTop: 24,
            background: 'var(--color-black)',
            color: '#fff', border: 'none',
            borderRadius: 'var(--radius-lg)',
            fontSize: 16, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'var(--font-sans)',
          }}
        >
          Continuar →
        </motion.button>
      )}
    </div>
  );

  /* ── SCREEN 2: Preferences ── */
  const Screen2 = () => (
    <div style={{
      minHeight: '100vh', background: 'var(--color-cream)',
      fontFamily: 'var(--font-sans)',
      padding: '0 24px 40px',
    }}>
      {/* Back + Stepper */}
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '16px 0',
      }}>
        <button
          onClick={() => goTo(1)}
          aria-label="Volver al paso anterior"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 14, color: 'var(--color-stone)',
            fontFamily: 'var(--font-sans)', padding: 0,
          }}
        >
          <ArrowLeft size={18} /> Atrás
        </button>
      </div>
      <Stepper />

      <div style={{ maxWidth: 440, margin: '0 auto', paddingTop: 16 }}>
        <h2 style={{
          fontSize: 24, fontWeight: 700,
          color: 'var(--color-black)', textAlign: 'center',
          marginBottom: 4,
        }}>
          ¿Qué te interesa?
        </h2>
        <p style={{
          fontSize: 15, color: 'var(--color-stone)',
          textAlign: 'center', marginBottom: 32,
        }}>
          Personalizamos tu feed para mostrarte productores y productos que encajan contigo
        </p>

        {/* Preference pills */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 10,
          justifyContent: 'center',
        }}>
          {PREFERENCES.map(pref => {
            const isSelected = selectedPrefs.includes(pref.id);
            return (
              <button
                key={pref.id}
                onClick={() => togglePref(pref.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-full, 999px)',
                  border: isSelected ? 'none' : '1px solid var(--color-border)',
                  background: isSelected ? 'var(--color-black)' : 'var(--color-white)',
                  color: isSelected ? 'var(--color-white)' : 'var(--color-black)',
                  fontSize: 14, fontWeight: 500,
                  cursor: 'pointer', fontFamily: 'var(--font-sans)',
                  transition: 'var(--transition-fast)',
                }}
              >
                <span>{pref.icon || pref.emoji}</span>
                <span>{pref.label}</span>
              </button>
            );
          })}
        </div>

        {/* Continue */}
        <button
          onClick={() => goTo(3)}
          disabled={selectedPrefs.length === 0}
          style={{
            width: '100%', height: 48, marginTop: 32,
            background: selectedPrefs.length > 0 ? 'var(--color-black)' : 'var(--color-stone)',
            color: 'var(--color-white)',
            border: 'none', borderRadius: 'var(--radius-lg)',
            fontSize: 15, fontWeight: 600,
            cursor: selectedPrefs.length > 0 ? 'pointer' : 'not-allowed',
            opacity: selectedPrefs.length > 0 ? 1 : 0.5,
            fontFamily: 'var(--font-sans)',
          }}
        >
          Continuar →
        </button>

        {/* Skip */}
        <button
          onClick={() => { setSelectedPrefs([]); goTo(3); }}
          style={{
            display: 'block', margin: '16px auto 0',
            background: 'none', border: 'none',
            fontSize: 'var(--text-sm, 14px)', color: 'var(--color-stone)',
            cursor: 'pointer', fontFamily: 'var(--font-sans)',
          }}
        >
          Omitir por ahora
        </button>
      </div>
    </div>
  );

  /* ── SCREEN 3: Follow suggestions ── */
  const Screen3 = () => {
    const [suggestions, setSuggestions] = useState([]);
    const [sugLoading, setSugLoading] = useState(true);
    const [followedIds, setFollowedIds] = useState(new Set());

    useEffect(() => {
      let active = true;
      const prefs = selectedPrefs.join(',');
      apiClient.get(`/discovery/suggested-users?context=onboarding&limit=12${prefs ? `&preferences=${prefs}` : ''}`)
        .then(data => { if (active) setSuggestions(data?.users || []); })
        .catch(() => { if (active) setSuggestions([]); })
        .finally(() => { if (active) setSugLoading(false); });
      return () => { active = false; };
    }, []);

    const handleFollowSuggestion = useCallback(async (userId) => {
      try {
        await apiClient.post(`/users/${userId}/follow`, {});
        setFollowedIds(prev => new Set([...prev, userId]));
      } catch {
        toast.error('No se pudo seguir a este usuario');
      }
    }, []);

    const ROLE_LABELS = { producer: 'Productor', influencer: 'Influencer', consumer: 'Consumidor', importer: 'Importador' };

    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-cream)', fontFamily: 'var(--font-sans)', padding: '0 24px 120px' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 0' }}>
          <button onClick={() => goTo(2)} aria-label="Volver al paso anterior" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, color: 'var(--color-stone)', fontFamily: 'var(--font-sans)', padding: 0 }}>
            <ArrowLeft size={18} /> Atrás
          </button>
        </div>
        <Stepper />

        <div style={{ maxWidth: 440, margin: '0 auto', paddingTop: 16 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-black)', textAlign: 'center', marginBottom: 4 }}>
            Personas para seguir
          </h2>
          <p style={{ fontSize: 15, color: 'var(--color-stone)', textAlign: 'center', marginBottom: 24, lineHeight: 1.5 }}>
            Sigue a personas para llenar tu feed con contenido que te interesa
          </p>

          {sugLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
              <Loader2 size={24} color="var(--color-stone)" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : suggestions.length === 0 ? (
            <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--color-stone)', padding: 32 }}>
              No hay sugerencias disponibles ahora
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {suggestions.map(u => {
                const isFollowed = followedIds.has(u.user_id);
                return (
                  <div key={u.user_id} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    padding: 16, background: 'var(--color-white)',
                    border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)',
                  }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: '50%', overflow: 'hidden',
                      background: 'var(--color-surface)', marginBottom: 8,
                    }}>
                      {u.profile_image ? (
                        <img src={u.profile_image} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: 'var(--color-stone)' }}>
                          {(u.name || '?')[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-black)', margin: '0 0 2px', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                      {u.name}
                    </p>
                    <span style={{
                      fontSize: 10, fontWeight: 500, color: 'var(--color-stone)',
                      padding: '2px 8px', borderRadius: 'var(--radius-full)',
                      background: 'var(--color-surface)', marginBottom: 10,
                    }}>
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                    <button
                      onClick={() => !isFollowed && handleFollowSuggestion(u.user_id)}
                      disabled={isFollowed}
                      style={{
                        width: '100%', height: 36, borderRadius: 'var(--radius-full)',
                        border: 'none', cursor: isFollowed ? 'default' : 'pointer',
                        fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-sans)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                        background: isFollowed ? 'var(--color-surface)' : 'var(--color-black)',
                        color: isFollowed ? 'var(--color-stone)' : '#fff',
                        transition: 'var(--transition-fast)',
                      }}
                    >
                      {isFollowed ? 'Siguiendo' : <><UserPlus size={13} /> Seguir</>}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Fixed bottom CTA */}
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 24px',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
          background: 'var(--color-cream)', borderTop: '1px solid var(--color-border)',
        }}>
          <button
            onClick={() => goTo(4)}
            style={{
              width: '100%', maxWidth: 440, margin: '0 auto', display: 'flex',
              height: 48, alignItems: 'center', justifyContent: 'center',
              background: 'var(--color-black)', color: '#fff',
              border: 'none', borderRadius: 'var(--radius-lg)',
              fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}
          >
            {followedIds.size > 0 ? `Continuar (${followedIds.size} seguidos) →` : 'Ahora no →'}
          </button>
        </div>

        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </div>
    );
  };

  /* ── SCREEN 4: Role-specific finish ── */
  const Screen4 = () => {
    const renderContent = () => {
      switch (selectedRole) {
        case 'consumer':
          return (
            <>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
                background: 'var(--color-surface, #f5f5f4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Check size={32} color="var(--color-black)" />
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-black)', textAlign: 'center', marginBottom: 8 }}>
                ¡Todo listo!
              </h2>
              <p style={{ fontSize: 15, color: 'var(--color-stone)', textAlign: 'center', lineHeight: 1.5, marginBottom: 32 }}>
                Ya puedes descubrir productores locales de alimentación saludable cerca de ti. Sin intermediarios.
              </p>
              <button
                onClick={handleFinish}
                disabled={saving}
                style={{
                  width: '100%', height: 52,
                  background: 'var(--color-black)',
                  color: '#fff', border: 'none',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: 16, fontWeight: 600,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {saving ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : 'Ir al feed →'}
              </button>
            </>
          );

        case 'producer':
          return (
            <>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-black)', textAlign: 'center', marginBottom: 8 }}>
                Configura tu tienda
              </h2>
              <p style={{ fontSize: 15, color: 'var(--color-stone)', textAlign: 'center', lineHeight: 1.5, marginBottom: 24 }}>
                Antes de publicar productos necesitamos verificar tu cuenta. Tarda menos de 5 minutos.
              </p>
              <div style={{
                background: 'var(--color-surface, #f5f5f4)',
                borderRadius: 'var(--radius-xl)',
                padding: 20, marginBottom: 24,
              }}>
                {[
                  { done: true, text: 'Cuenta creada' },
                  { done: false, text: 'Verificar CIF/NIF' },
                  { done: false, text: 'Foto de instalación' },
                  { done: false, text: 'Certificado (opcional pero recomendado)' },
                ].map((step, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 0',
                    borderBottom: i < 3 ? '1px solid var(--color-border)' : 'none',
                  }}>
                    <span style={{
                      width: 22, height: 22, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12,
                      background: step.done ? 'var(--color-black)' : 'transparent',
                      color: step.done ? '#fff' : 'var(--color-stone)',
                      border: step.done ? 'none' : '1.5px solid var(--color-border)',
                    }}>
                      {step.done ? '✓' : '○'}
                    </span>
                    <span style={{ fontSize: 14, color: 'var(--color-black)' }}>{step.text}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={handleFinish}
                disabled={saving}
                style={{
                  width: '100%', height: 52,
                  background: 'var(--color-black)',
                  color: '#fff', border: 'none',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: 16, fontWeight: 600,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {saving ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : 'Verificar mi cuenta →'}
              </button>
              <button
                onClick={handleFinishLater}
                style={{
                  display: 'block', margin: '16px auto 0',
                  background: 'none', border: 'none',
                  fontSize: 14, color: 'var(--color-stone)',
                  cursor: 'pointer', fontFamily: 'var(--font-sans)',
                }}
              >
                Hacerlo más tarde
              </button>
            </>
          );

        case 'influencer':
          return (
            <>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-black)', textAlign: 'center', marginBottom: 8 }}>
                Solicita ser influencer
              </h2>
              <p style={{ fontSize: 15, color: 'var(--color-stone)', textAlign: 'center', lineHeight: 1.5, marginBottom: 24 }}>
                Necesitamos verificar que cumples los requisitos.
              </p>
              <div style={{
                background: 'var(--color-surface, #f5f5f4)',
                borderRadius: 'var(--radius-xl)',
                padding: 20, marginBottom: 24,
              }}>
                {[
                  '+1.000 seguidores en Instagram/TikTok',
                  'Contenido sobre alimentación',
                  'Certificado fiscal (para cobros)',
                ].map((text, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 0',
                    borderBottom: i < 2 ? '1px solid var(--color-border)' : 'none',
                  }}>
                    <span style={{ color: 'var(--color-black)', fontSize: 14 }}>✓</span>
                    <span style={{ fontSize: 14, color: 'var(--color-black)' }}>{text}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={handleFinish}
                disabled={saving}
                style={{
                  width: '100%', height: 52,
                  background: 'var(--color-black)',
                  color: '#fff', border: 'none',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: 16, fontWeight: 600,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {saving ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : 'Solicitar →'}
              </button>
            </>
          );

        case 'importer':
          return (
            <>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-black)', textAlign: 'center', marginBottom: 8 }}>
                Accede al catálogo B2B
              </h2>
              <p style={{ fontSize: 15, color: 'var(--color-stone)', textAlign: 'center', lineHeight: 1.5, marginBottom: 24 }}>
                Como importador tendrás acceso al catálogo mayorista de productores verificados.
              </p>
              <div style={{
                background: 'var(--color-surface, #f5f5f4)',
                borderRadius: 'var(--radius-xl)',
                padding: 20, marginBottom: 24,
              }}>
                {[
                  'Tienda B2C propia incluida',
                  'Chat B2B con productores',
                  'Contratos digitales',
                  'Documentación aduanera IA',
                ].map((text, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 0',
                    borderBottom: i < 3 ? '1px solid var(--color-border)' : 'none',
                  }}>
                    <span style={{ color: 'var(--color-black)', fontSize: 14 }}>✓</span>
                    <span style={{ fontSize: 14, color: 'var(--color-black)' }}>{text}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={handleFinish}
                disabled={saving}
                style={{
                  width: '100%', height: 52,
                  background: 'var(--color-black)',
                  color: '#fff', border: 'none',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: 16, fontWeight: 600,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {saving ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : 'Acceder →'}
              </button>
            </>
          );

        default:
          return null;
      }
    };

    return (
      <div style={{
        minHeight: '100vh', background: 'var(--color-cream)',
        fontFamily: 'var(--font-sans)',
        padding: '0 24px 40px',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '16px 0',
        }}>
          <button
            onClick={() => goTo(3)}
            aria-label="Volver al paso anterior"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 14, color: 'var(--color-stone)',
              fontFamily: 'var(--font-sans)', padding: 0,
            }}
          >
            <ArrowLeft size={18} /> Atrás
          </button>
        </div>
        <Stepper />

        <div style={{ maxWidth: 440, margin: '0 auto', paddingTop: 24 }}>
          {renderContent()}
        </div>
      </div>
    );
  };

  return (
    <div style={{ overflow: 'hidden' }}>
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={screen}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          {screen === 1 && <Screen1 />}
          {screen === 2 && <Screen2 />}
          {screen === 3 && <Screen3 />}
          {screen === 4 && <Screen4 />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
