import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api/client';

// Pre-declare slugify so it's available before the component body
function slugify(text) {
  return (text || '').toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

const EMOJIS = ['🌿', '🫙', '🧀', '🫒', '🍯', '👨‍🍳', '💪', '🌾', '🥗', '🌶️', '🍎', '🐟', '🌱', '🏔️', '🇪🇸'];
const CATEGORIES = [
  'Alimentación', 'Recetas', 'Productores', 'Dieta',
  'Ecológico', 'Vegano', 'Sin gluten', 'Local', 'Internacional',
];

const FormField = ({ label, hint, children }) => (
  <div>
    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0c0a09', marginBottom: 6, fontFamily: 'inherit' }}>
      {label}
    </label>
    {children}
    {hint && <p style={{ fontSize: 11, color: '#78716c', marginTop: 4, fontFamily: 'inherit' }}>{hint}</p>}
  </div>
);

const STONE_COVER_COLORS = ['#d6d3d1', '#a8a29e', '#78716c', '#57534e', '#44403c'];

/* ── Live Preview Card ── */
const CommunityPreviewCard = ({ form, coverPreview }) => {
  const coverColor = STONE_COVER_COLORS[(form.name.charCodeAt(0) || 100) % 5];
  return (
    <div style={{
      borderRadius: '16px',
      border: '1px solid #e7e5e4',
      background: '#ffffff',
      overflow: 'hidden',
      fontFamily: 'inherit',
    }}>
      {/* Cover */}
      <div style={{
        aspectRatio: '3/1', overflow: 'hidden',
        background: coverPreview ? '#f5f5f4' : coverColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40,
        position: 'relative',
      }}>
        {coverPreview ? (
          <img src={coverPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          form.emoji || '🌿'
        )}
        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%',
          background: 'linear-gradient(to top, rgba(0,0,0,0.45), transparent)',
        }} />
        {/* Name overlay */}
        <div style={{ position: 'absolute', bottom: 8, left: 12, right: 12 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0, textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
            {form.name || 'Nombre de la comunidad'}
          </p>
        </div>
        {/* Category badge */}
        {form.category && (
          <span style={{
            position: 'absolute', top: 8, left: 8,
            background: 'rgba(0,0,0,0.6)', color: '#fff',
            fontSize: 9, fontWeight: 800, padding: '2px 6px',
            borderRadius: 4, letterSpacing: '0.05em', textTransform: 'uppercase',
          }}>
            {form.category}
          </span>
        )}
      </div>

      <div style={{ padding: '10px 12px' }}>
        {form.description ? (
          <p style={{ fontSize: 11, color: '#78716c', margin: '0 0 8px', lineHeight: 1.4 }}>
            {form.description.slice(0, 80)}{form.description.length > 80 ? '…' : ''}
          </p>
        ) : (
          <p style={{ fontSize: 11, color: '#e7e5e4', margin: '0 0 8px', fontStyle: 'italic' }}>
            Sin descripción todavía
          </p>
        )}
        <p style={{ fontSize: 11, color: '#78716c', display: 'flex', alignItems: 'center', gap: 4, margin: '0 0 10px' }}>
          <Users size={11} style={{ flexShrink: 0 }} />
          0 miembros
        </p>
        <button disabled style={{
          width: '100%', padding: '7px 0',
          background: '#0c0a09', color: '#fff',
          border: 'none', borderRadius: '9999px',
          fontSize: 12, fontWeight: 600, cursor: 'default',
          opacity: 0.85, fontFamily: 'inherit',
        }}>
          Unirse
        </button>
      </div>
    </div>
  );
};

export default function CreateCommunityPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: '', slug: '', description: '',
    category: '', emoji: '🌿', tags: [],
    cover_image: null,
  });
  const [tagInput, setTagInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [coverPreview, setCoverPreview] = useState(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const canCreate = (user?.follower_count >= 100) || user?.is_verified_seller;

  if (!canCreate) {
    return (
      <div style={{ background: '#fafaf9', minHeight: '100vh' }}>
        {/* TopBar */}
        <div style={{
          padding: '12px 16px',
          background: '#ffffff',
          borderBottom: '1px solid #e7e5e4',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <Link to="/communities" style={{ color: '#0c0a09', display: 'flex', alignItems: 'center' }}>
            <ArrowLeft size={20} />
          </Link>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#0c0a09', fontFamily: 'inherit' }}>Nueva comunidad</h1>
        </div>

        <div style={{ padding: '40px 20px', textAlign: 'center', maxWidth: 400, margin: '0 auto' }}>
          <div style={{
            background: '#f5f5f4',
            borderRadius: '14px',
            padding: '32px 24px',
          }}>
            <p style={{ fontSize: 48 }}>🔒</p>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0c0a09', fontFamily: 'inherit' }}>Necesitas más seguidores</h2>
            <p style={{ color: '#78716c', fontFamily: 'inherit' }}>
              Para crear una comunidad necesitas al menos 100 seguidores o ser vendedor verificado.
            </p>
            <div style={{
              marginTop: 16,
              background: '#ffffff',
              borderRadius: '12px',
              padding: '12px 16px',
              border: '1px solid #e7e5e4',
            }}>
              <p style={{ fontSize: 13, color: '#78716c', margin: '0 0 8px', fontFamily: 'inherit' }}>
                Progreso hacia 100 seguidores
              </p>
              <div style={{ height: 6, background: '#e7e5e4', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, ((user?.follower_count || 0) / 100) * 100)}%`,
                  background: '#0c0a09',
                  borderRadius: 3,
                  transition: 'width 0.3s ease',
                }} />
              </div>
              <p style={{ fontSize: 12, color: '#78716c', marginTop: 6, fontFamily: 'inherit' }}>
                {user?.follower_count || 0}/100 seguidores
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  // Revoke blob URL on unmount to prevent memory leaks
  useEffect(() => {
    return () => { if (coverPreview) URL.revokeObjectURL(coverPreview); };
  }, [coverPreview]);

  const handleCover = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverPreview(URL.createObjectURL(file));
    setIsUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const data = await apiClient.post('/upload/product-image', formData, {
        timeout: 30000,
      });
      update('cover_image', data.url || data.path || data.image_url);
    } catch {
      toast.error('Error al subir imagen');
      setCoverPreview(null);
    } finally {
      setIsUploadingCover(false);
    }
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (tag && !form.tags.includes(tag) && form.tags.length < 5) {
      update('tags', [...form.tags, tag]);
      setTagInput('');
    }
  };

  const create = async () => {
    if (!form.name.trim()) { toast.error('El nombre es obligatorio'); return; }
    if (form.name.trim().length < 3) { toast.error('El nombre debe tener al menos 3 caracteres'); return; }
    if (!form.slug.trim()) { toast.error('La URL es obligatoria'); return; }
    if (form.slug.trim().length < 3) { toast.error('La URL debe tener al menos 3 caracteres'); return; }
    if (!/^[a-z0-9]/.test(form.slug)) { toast.error('La URL debe empezar con una letra o número'); return; }
    if (isUploadingCover) { toast.error('Espera a que se suba la imagen'); return; }
    setIsCreating(true);
    try {
      const payload = {
        ...form,
        slug: form.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'),
      };
      const data = await apiClient.post('/communities', payload);
      toast.success('¡Comunidad creada!');
      navigate(`/communities/${data.slug || form.slug}`);
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.detail;
      if (detail === 'slug_taken') {
        toast.error('Esa URL ya está en uso. Prueba otra.');
      } else {
        toast.error('Error al crear la comunidad');
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div style={{ background: '#fafaf9', minHeight: '100vh' }}>
      {/* TopBar */}
      <div style={{
        padding: '12px 16px',
        background: '#ffffff',
        borderBottom: '1px solid #e7e5e4',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <Link to="/communities" style={{ color: '#0c0a09', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={20} />
        </Link>
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#0c0a09', fontFamily: 'inherit', flex: 1 }}>Nueva comunidad</h1>
      </div>

      {/* ── Mobile: collapsible preview toggle ── */}
      <div className="md:hidden" style={{ padding: '10px 16px 0', maxWidth: 540, margin: '0 auto' }}>
        <button
          type="button"
          onClick={() => setShowPreview(v => !v)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px',
            background: '#ffffff',
            border: '1px solid #e7e5e4',
            borderRadius: '16px',
            cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 13, fontWeight: 600, color: '#0c0a09',
          }}
          aria-expanded={showPreview}
        >
          <span>Ver vista previa</span>
          {showPreview ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showPreview && (
          <div style={{ marginTop: 10 }}>
            <CommunityPreviewCard form={form} coverPreview={coverPreview} />
          </div>
        )}
      </div>

      {/* ── Desktop: two-column layout ── */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: 16, paddingBottom: 100, display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      {/* Form column */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Cover */}
        <label style={{ display: 'block', marginBottom: 16, cursor: 'pointer' }}>
          <div style={{
            height: 120, borderRadius: '14px', overflow: 'hidden',
            background: coverPreview
              ? '#f5f5f4'
              : ['#d6d3d1','#a8a29e','#78716c','#57534e','#44403c'][(form.name.charCodeAt(0) || 100) % 5],
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            border: '2px dashed #e7e5e4',
            position: 'relative',
          }}>
            {coverPreview ? (
              <img src={coverPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ textAlign: 'center', color: '#78716c' }}>
                <p style={{ fontSize: 32, marginBottom: 4 }}>{form.emoji}</p>
                <p style={{ fontSize: 12, fontFamily: 'inherit' }}>Añadir foto de portada</p>
              </div>
            )}
            {isUploadingCover && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ width: 24, height: 24, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
              </div>
            )}
          </div>
          <input type="file" accept="image/*" onChange={handleCover} style={{ display: 'none' }} aria-label="Subir foto de portada" />
        </label>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Name */}
          <FormField label="Nombre de la comunidad *">
            <input
              value={form.name}
              onChange={e => {
                update('name', e.target.value);
                if (!form.slug || form.slug === slugify(form.name)) {
                  update('slug', slugify(e.target.value));
                }
              }}
              placeholder="Ej: Aceites de España"
              maxLength={60}
              style={{
                width: '100%', padding: '10px 12px',
                background: '#f5f5f4',
                border: '1px solid #e7e5e4',
                borderRadius: '12px',
                outline: 'none', color: '#0c0a09',
                fontFamily: 'inherit', fontSize: 14,
                boxSizing: 'border-box',
              }}
            />
          </FormField>

          {/* Slug */}
          <FormField label="URL de la comunidad *">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{
                padding: '10px 10px',
                background: '#f5f5f4',
                border: '1px solid #e7e5e4',
                borderRight: 'none',
                borderRadius: '12px 0 0 12px',
                fontSize: 12, color: '#78716c',
                whiteSpace: 'nowrap',
                fontFamily: 'inherit',
              }}>
                /communities/
              </span>
              <input
                value={form.slug}
                onChange={e => update('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'))}
                style={{
                  flex: 1, padding: '10px 12px',
                  background: '#f5f5f4',
                  border: '1px solid #e7e5e4',
                  borderLeft: 'none',
                  borderRadius: '0 12px 12px 0',
                  outline: 'none', color: '#0c0a09',
                  fontFamily: 'inherit', fontSize: 14,
                  boxSizing: 'border-box',
                }}
                placeholder="aceites-de-espana"
              />
            </div>
          </FormField>

          {/* Description */}
          <FormField label="Descripción">
            <div style={{ position: 'relative' }}>
              <textarea
                value={form.description}
                onChange={e => update('description', e.target.value)}
                placeholder="¿De qué trata tu comunidad?"
                rows={3} maxLength={300}
                style={{
                  resize: 'none', width: '100%', padding: '10px 12px',
                  background: '#f5f5f4',
                  border: '1px solid #e7e5e4',
                  borderRadius: '12px',
                  outline: 'none', color: '#0c0a09',
                  fontFamily: 'inherit', fontSize: 14,
                  boxSizing: 'border-box',
                }}
              />
              <span style={{
                position: 'absolute', bottom: 8, right: 10,
                fontSize: 11, color: '#78716c',
                fontFamily: 'inherit',
              }}>
                {form.description.length}/300
              </span>
            </div>
          </FormField>

          {/* Emoji */}
          <FormField label="Icono de la comunidad">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {EMOJIS.map(em => (
                <button key={em} type="button"
                  onClick={() => update('emoji', em)}
                  aria-label={`Seleccionar icono ${em}`}
                  aria-pressed={form.emoji === em}
                  style={{
                    width: 40, height: 40, borderRadius: 8,
                    background: form.emoji === em ? '#f5f5f4' : '#ffffff',
                    border: form.emoji === em ? '2px solid #0c0a09' : '1px solid #e7e5e4',
                    cursor: 'pointer', fontSize: 20,
                  }}>
                  {em}
                </button>
              ))}
            </div>
          </FormField>

          {/* Category */}
          <FormField label="Categoría">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {CATEGORIES.map(cat => (
                <button key={cat} type="button"
                  onClick={() => update('category', form.category === cat ? '' : cat)}
                  style={{
                    padding: '6px 12px', borderRadius: '9999px',
                    border: form.category === cat ? 'none' : '1px solid #e7e5e4',
                    background: form.category === cat ? '#0c0a09' : '#ffffff',
                    color: form.category === cat ? '#fff' : '#0c0a09',
                    cursor: 'pointer', fontSize: 13,
                    transition: 'all 0.15s ease',
                    fontFamily: 'inherit',
                  }}>
                  {cat}
                </button>
              ))}
            </div>
          </FormField>

          {/* Tags */}
          <FormField label="Etiquetas (máx. 5)" hint="Presiona Enter para añadir">
            <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
              {form.tags.map(tag => (
                <span key={tag} style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 12, padding: '3px 10px',
                  background: '#f5f5f4',
                  color: '#0c0a09',
                  borderRadius: '9999px',
                  fontFamily: 'inherit',
                }}>
                  #{tag}
                  <button type="button" onClick={() => update('tags', form.tags.filter(t => t !== tag))}
                    aria-label={`Eliminar etiqueta ${tag}`}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#78716c', padding: 0, lineHeight: 1 }}>
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
              placeholder="aceite-de-oliva"
              disabled={form.tags.length >= 5}
              style={{
                width: '100%', height: 38, padding: '0 12px',
                background: '#f5f5f4',
                border: '1px solid #e7e5e4',
                borderRadius: '12px',
                outline: 'none', color: '#0c0a09',
                fontFamily: 'inherit', fontSize: 13,
                boxSizing: 'border-box',
              }}
            />
          </FormField>
        </div>

        {/* Submit */}
        <div style={{ marginTop: 24 }}>
          <button
            onClick={create}
            disabled={isCreating || !form.name || !form.slug || isUploadingCover}
            style={{
              width: '100%', padding: '12px',
              borderRadius: '9999px',
              border: 'none',
              background: '#0c0a09', color: '#fff',
              fontSize: 15, fontWeight: 600, cursor: 'pointer',
              opacity: (isCreating || !form.name || !form.slug) ? 0.5 : 1,
              transition: 'all 0.15s ease',
              fontFamily: 'inherit',
            }}>
            {isCreating ? 'Creando...' : 'Crear comunidad'}
          </button>
        </div>
      </div>

      {/* Desktop: sticky preview column */}
      <div className="hidden md:block" style={{ width: 280, flexShrink: 0, position: 'sticky', top: 80, alignSelf: 'flex-start' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#78716c', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10, fontFamily: 'inherit' }}>
          Vista previa
        </p>
        <CommunityPreviewCard form={form} coverPreview={coverPreview} />
        <p style={{ fontSize: 11, color: '#78716c', textAlign: 'center', marginTop: 8, fontFamily: 'inherit' }}>
          Así verán tu comunidad los demás
        </p>
      </div>

      </div>
    </div>
  );
}

