import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api/client';

const EMOJIS = ['🌿', '🫙', '🧀', '🫒', '🍯', '👨‍🍳', '💪', '🌾', '🥗', '🌶️', '🍎', '🐟', '🌱', '🏔️', '🇪🇸'];
const CATEGORIES = [
  'Alimentación', 'Recetas', 'Productores', 'Dieta',
  'Ecológico', 'Vegano', 'Sin gluten', 'Local', 'Internacional',
];

const FormField = ({ label, hint, children }) => (
  <div>
    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--hs-text-1)', marginBottom: 6 }}>
      {label}
    </label>
    {children}
    {hint && <p style={{ fontSize: 11, color: 'var(--hs-text-3)', marginTop: 4 }}>{hint}</p>}
  </div>
);

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

  const canCreate = (user?.follower_count >= 100) || user?.is_verified_seller;

  if (!canCreate) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', maxWidth: 400, margin: '0 auto' }}>
        <p style={{ fontSize: 48 }}>🔒</p>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Necesitas más seguidores</h2>
        <p style={{ color: 'var(--hs-text-2)' }}>
          Para crear una comunidad necesitas al menos 100 seguidores o ser vendedor verificado.
        </p>
        <p style={{ fontSize: 13, color: 'var(--hs-text-3)' }}>
          Tienes {user?.follower_count || 0}/100
        </p>
      </div>
    );
  }

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleCover = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverPreview(URL.createObjectURL(file));
    setIsUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const data = await apiClient.post('/upload/product-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
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
    if (!form.slug.trim()) { toast.error('La URL es obligatoria'); return; }
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
    <div style={{ maxWidth: 540, margin: '0 auto', padding: 16, paddingBottom: 100 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Crear comunidad</h1>

      {/* Cover */}
      <label style={{ display: 'block', marginBottom: 16, cursor: 'pointer' }}>
        <div style={{
          height: 120, borderRadius: 'var(--hs-r-lg)', overflow: 'hidden',
          background: coverPreview
            ? 'var(--hs-surface-2)'
            : `hsl(${(form.name.charCodeAt(0) || 100) * 7 % 360},40%,75%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          border: '2px dashed var(--hs-border-med)',
          position: 'relative',
        }}>
          {coverPreview ? (
            <img src={coverPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--hs-text-2)' }}>
              <p style={{ fontSize: 32, marginBottom: 4 }}>{form.emoji}</p>
              <p style={{ fontSize: 12 }}>Añadir foto de portada</p>
            </div>
          )}
          {isUploadingCover && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="hs-spinner" style={{ width: 24, height: 24 }} />
            </div>
          )}
        </div>
        <input type="file" accept="image/*" onChange={handleCover} style={{ display: 'none' }} />
      </label>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Name */}
        <FormField label="Nombre de la comunidad *">
          <input className="hs-input"
            value={form.name}
            onChange={e => {
              update('name', e.target.value);
              if (!form.slug || form.slug === slugify(form.name)) {
                update('slug', slugify(e.target.value));
              }
            }}
            placeholder="Ej: Aceites de España"
            maxLength={60}
          />
        </FormField>

        {/* Slug */}
        <FormField label="URL de la comunidad *">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{
              padding: '12px 10px',
              background: 'var(--hs-surface-3)',
              border: '1px solid var(--hs-border)',
              borderRight: 'none',
              borderRadius: '10px 0 0 10px',
              fontSize: 12, color: 'var(--hs-text-2)',
              whiteSpace: 'nowrap',
            }}>
              /communities/
            </span>
            <input className="hs-input"
              value={form.slug}
              onChange={e => update('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'))}
              style={{ borderRadius: '0 10px 10px 0' }}
              placeholder="aceites-de-espana"
            />
          </div>
        </FormField>

        {/* Description */}
        <FormField label="Descripción">
          <textarea className="hs-input"
            value={form.description}
            onChange={e => update('description', e.target.value)}
            placeholder="¿De qué trata tu comunidad?"
            rows={3} maxLength={300}
            style={{ resize: 'none' }}
          />
        </FormField>

        {/* Emoji */}
        <FormField label="Icono de la comunidad">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {EMOJIS.map(em => (
              <button key={em} type="button"
                onClick={() => update('emoji', em)}
                style={{
                  width: 40, height: 40, borderRadius: 8,
                  background: form.emoji === em ? 'var(--hs-black)' : 'var(--hs-surface-2)',
                  border: form.emoji === em ? '2px solid var(--hs-black)' : '1px solid var(--hs-border)',
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
                  padding: '6px 12px', borderRadius: 'var(--hs-r-full)',
                  border: form.category === cat ? '2px solid var(--hs-black)' : '1.5px solid var(--hs-border)',
                  background: form.category === cat ? 'var(--hs-black)' : 'var(--hs-surface-2)',
                  color: form.category === cat ? 'white' : 'var(--hs-text-1)',
                  cursor: 'pointer', fontSize: 13,
                  transition: 'var(--hs-transition)',
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
                background: 'var(--hs-surface-2)',
                borderRadius: 'var(--hs-r-full)',
                border: '0.5px solid var(--hs-border)',
              }}>
                #{tag}
                <button type="button" onClick={() => update('tags', form.tags.filter(t => t !== tag))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--hs-text-3)', padding: 0, lineHeight: 1 }}>
                  ×
                </button>
              </span>
            ))}
          </div>
          <input className="hs-input"
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
            placeholder="aceite-de-oliva"
            disabled={form.tags.length >= 5}
            style={{ height: 38, fontSize: 13 }}
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
            borderRadius: 'var(--hs-r-full)',
            border: 'none',
            background: 'var(--hs-black)', color: 'white',
            fontSize: 15, fontWeight: 600, cursor: 'pointer',
            opacity: (isCreating || !form.name || !form.slug) ? 0.5 : 1,
            transition: 'var(--hs-transition)',
          }}>
          {isCreating ? 'Creando...' : 'Crear comunidad 🌿'}
        </button>
      </div>
    </div>
  );
}

function slugify(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}
