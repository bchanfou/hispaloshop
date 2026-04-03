// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api/client';
import { useTranslation } from 'react-i18next';

// Pre-declare slugify so it's available before the component body
function slugify(text) {
  return (text || '').toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

const EMOJIS = ['🌿', '🫙', '🧀', '🫒', '🍯', '👨‍🍳', '💪', '🌾', '🥗', '🌶️', '🍎', '🐟', '🌱', '🏔️', '🇪🇸'];
const CATEGORIES = [
  t('communities_explore.alimentacion', 'Alimentación'), 'Recetas', 'Productores', 'Dieta',
  t('search.ecologico', 'Ecológico'), 'Vegano', 'Sin gluten', 'Local', 'Internacional',
];

const FormField = ({ label, hint, children }) => (
  <div>
    <label className="block text-[13px] font-semibold text-stone-950 mb-1.5">
      {label}
    </label>
    {children}
    {hint && <p className="text-[11px] text-stone-500 mt-1">{hint}</p>}
  </div>
);

const STONE_COVER_COLORS = ['#d6d3d1', '#a8a29e', '#78716c', '#57534e', '#44403c'];

/* ── Live Preview Card ── */
const CommunityPreviewCard = ({ form, coverPreview }) => {
  const coverColor = STONE_COVER_COLORS[(form.name.charCodeAt(0) || 100) % 5];
  return (
    <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
      {/* Cover */}
      <div
        className="overflow-hidden flex items-center justify-center text-[40px] relative"
        style={{
          aspectRatio: '3/1',
          background: coverPreview ? '#f5f5f4' : coverColor,
        }}
      >
        {coverPreview ? (
          <img src={coverPreview} alt="" className="w-full h-full object-cover block" />
        ) : (
          form.emoji || '🌿'
        )}
        {/* Gradient overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-[60%]" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.45), transparent)' }} />
        {/* Name overlay */}
        <div className="absolute bottom-2 left-3 right-3">
          <p className="text-[15px] font-bold text-white m-0" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
            {form.name || t('create_community.nombreDeLaComunidad', 'Nombre de la comunidad')}
          </p>
        </div>
        {/* Category badge */}
        {form.category && (
          <span className="absolute top-2 left-2 bg-black/60 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wide">
            {form.category}
          </span>
        )}
      </div>

      <div className="px-3 py-2.5">
        {form.description ? (
          <p className="text-[11px] text-stone-500 mb-2 leading-snug m-0">
            {form.description.slice(0, 80)}{form.description.length > 80 ? '…' : ''}
          </p>
        ) : (
          <p className="text-[11px] text-stone-200 mb-2 italic m-0">
            Sin descripción todavía
          </p>
        )}
        <p className="text-[11px] text-stone-500 flex items-center gap-1 mb-2.5 m-0">
          <Users size={11} className="shrink-0" />
          0 miembros
        </p>
        <button disabled className="w-full py-[7px] bg-stone-950 text-white border-none rounded-full text-xs font-semibold cursor-default opacity-85">
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
  const [slugStatus, setSlugStatus] = useState(null); // null | 'checking' | 'available' | 'taken'
  const slugTimerRef = React.useRef(null);

  const canCreate = (user?.followers_count >= 100) || (user?.role === 'producer' || user?.role === 'importer');

  if (!canCreate) {
    return (
      <div className="bg-stone-50 min-h-screen">
        {/* TopBar */}
        <div className="px-4 py-3 bg-white border-b border-stone-200 flex items-center gap-3">
          <Link to="/communities" className="text-stone-950 flex items-center">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-lg font-bold m-0 text-stone-950">Nueva comunidad</h1>
        </div>

        <div className="px-5 pt-10 text-center max-w-[400px] mx-auto">
          <div className="bg-stone-100 rounded-[14px] px-6 py-8">
            <p className="text-5xl">🔒</p>
            <h2 className="text-xl font-bold text-stone-950">{t('create_community.necesitasMasSeguidores', 'Necesitas más seguidores')}</h2>
            <p className="text-stone-500">
              Para crear una comunidad necesitas al menos 100 seguidores o ser vendedor verificado.
            </p>
            <div className="mt-4 bg-white rounded-xl px-4 py-3 border border-stone-200">
              <p className="text-[13px] text-stone-500 mb-2 m-0">
                Progreso hacia 100 seguidores
              </p>
              <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-stone-950 rounded-full transition-[width] duration-300 ease-in-out"
                  style={{ width: `${Math.min(100, ((user?.followers_count || 0) / 100) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-stone-500 mt-1.5 m-0">
                {user?.followers_count || 0}/100 seguidores
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  // C-07: Debounced slug availability check
  useEffect(() => {
    clearTimeout(slugTimerRef.current);
    if (!form.slug || form.slug.length < 3) { setSlugStatus(null); return; }
    setSlugStatus('checking');
    slugTimerRef.current = setTimeout(async () => {
      try {
        await apiClient.get(`/communities/${form.slug}`);
        setSlugStatus('taken');
      } catch {
        setSlugStatus('available');
      }
    }, 500);
    return () => clearTimeout(slugTimerRef.current);
  }, [form.slug]);

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
    if (!form.name.trim()) { toast.error(t('register.elNombreEsObligatorio', 'El nombre es obligatorio')); return; }
    if (form.name.trim().length < 3) { toast.error(t('create_community.elNombreDebeTenerAlMenos3Caracter', 'El nombre debe tener al menos 3 caracteres')); return; }
    if (!form.slug.trim()) { toast.error(t('create_community.laUrlEsObligatoria', 'La URL es obligatoria')); return; }
    if (form.slug.trim().length < 3) { toast.error(t('create_community.laUrlDebeTenerAlMenos3Caracteres', 'La URL debe tener al menos 3 caracteres')); return; }
    if (!/^[a-z0-9]/.test(form.slug)) { toast.error(t('create_community.laUrlDebeEmpezarConUnaLetraONume', 'La URL debe empezar con una letra o número')); return; }
    if (isUploadingCover) { toast.error('Espera a que se suba la imagen'); return; }
    setIsCreating(true);
    try {
      const payload = {
        ...form,
        slug: form.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'),
      };
      const data = await apiClient.post('/communities', payload);
      toast.success(t('create_community.comunidadCreada', '¡Comunidad creada!'));
      navigate(`/communities/${data.slug || form.slug}`);
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.detail;
      if (detail === 'slug_taken') {
        toast.error(t('create_community.esaUrlYaEstaEnUsoPruebaOtra', 'Esa URL ya está en uso. Prueba otra.'));
      } else {
        toast.error(t('create_community.errorAlCrearLaComunidad', 'Error al crear la comunidad'));
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="bg-stone-50 min-h-screen">
      {/* TopBar */}
      <div className="px-4 py-3 bg-white border-b border-stone-200 flex items-center gap-3">
        <Link to="/communities" className="text-stone-950 flex items-center">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-lg font-bold m-0 text-stone-950 flex-1">Nueva comunidad</h1>
      </div>

      {/* ── Mobile: collapsible preview toggle ── */}
      <div className="md:hidden pt-2.5 px-4 max-w-[540px] mx-auto">
        <button
          type="button"
          onClick={() => setShowPreview(v => !v)}
          className="w-full flex items-center justify-between px-3.5 py-2.5 bg-white border border-stone-200 rounded-2xl cursor-pointer text-[13px] font-semibold text-stone-950"
          aria-expanded={showPreview}
        >
          <span>Ver vista previa</span>
          {showPreview ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showPreview && (
          <div className="mt-2.5">
            <CommunityPreviewCard form={form} coverPreview={coverPreview} />
          </div>
        )}
      </div>

      {/* ── Desktop: two-column layout ── */}
      <div className="max-w-[960px] mx-auto p-4 pb-[100px] flex gap-6 items-start">
      {/* Form column */}
      <div className="flex-1 min-w-0">

        {/* Cover */}
        <label className="block mb-4 cursor-pointer">
          <div
            className="h-[120px] rounded-[14px] overflow-hidden flex items-center justify-center cursor-pointer border-2 border-dashed border-stone-200 relative"
            style={{
              background: coverPreview
                ? '#f5f5f4'
                : ['#d6d3d1','#a8a29e','#78716c','#57534e','#44403c'][(form.name.charCodeAt(0) || 100) % 5],
            }}
          >
            {coverPreview ? (
              <img src={coverPreview} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center text-stone-500">
                <p className="text-[32px] mb-1">{form.emoji}</p>
                <p className="text-xs">{t('create_community.anadirFotoDePortada', 'Añadir foto de portada')}</p>
              </div>
            )}
            {isUploadingCover && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <input type="file" accept="image/*" onChange={handleCover} className="hidden" aria-label="Subir foto de portada" />
        </label>

        <div className="flex flex-col gap-3.5">
          {/* Name */}
          <FormField label={t('create_community.nombreDeLaComunidad1', 'Nombre de la comunidad *')}>
            <input
              value={form.name}
              onChange={e => {
                update('name', e.target.value);
                if (!form.slug || form.slug === slugify(form.name)) {
                  update('slug', slugify(e.target.value));
                }
              }}
              placeholder={t('create_community.ejAceitesDeEspana', 'Ej: Aceites de España')}
              maxLength={60}
              className="w-full px-3 py-2.5 bg-stone-100 border border-stone-200 rounded-xl outline-none text-stone-950 text-sm box-border"
            />
          </FormField>

          {/* Slug */}
          <FormField label={t('create_community.urlDeLaComunidad', 'URL de la comunidad *')}>
            <div className="flex items-center">
              <span className="px-2.5 py-2.5 bg-stone-100 border border-stone-200 border-r-0 rounded-l-xl text-xs text-stone-500 whitespace-nowrap">
                /communities/
              </span>
              <input
                value={form.slug}
                onChange={e => update('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'))}
                className={`flex-1 px-3 py-2.5 bg-stone-100 border border-l-0 rounded-r-xl outline-none text-stone-950 text-sm box-border ${
                  slugStatus === 'taken' ? 'border-stone-400' : 'border-stone-200'
                }`}
                placeholder="aceites-de-espana"
              />
            </div>
            {slugStatus === 'checking' && <p className="text-[11px] text-stone-400 mt-1 m-0">Comprobando disponibilidad...</p>}
            {slugStatus === 'available' && <p className="text-[11px] text-stone-600 mt-1 m-0">✓ URL disponible</p>}
            {slugStatus === 'taken' && <p className="text-[11px] text-stone-600 mt-1 m-0">✗ Esta URL ya está en uso</p>}
          </FormField>

          {/* Description */}
          <FormField label={t('productDetail.description', 'Descripción')}>
            <div className="relative">
              <textarea
                value={form.description}
                onChange={e => update('description', e.target.value)}
                placeholder={t('create_community.deQueTrataTuComunidad', '¿De qué trata tu comunidad?')}
                rows={3} maxLength={300}
                className="resize-none w-full px-3 py-2.5 bg-stone-100 border border-stone-200 rounded-xl outline-none text-stone-950 text-sm box-border"
              />
              <span className="absolute bottom-2 right-2.5 text-[11px] text-stone-500">
                {form.description.length}/300
              </span>
            </div>
          </FormField>

          {/* Emoji */}
          <FormField label={t('create_community.iconoDeLaComunidad', 'Icono de la comunidad')}>
            <div className="flex gap-1.5 flex-wrap">
              {EMOJIS.map(em => (
                <button key={em} type="button"
                  onClick={() => update('emoji', em)}
                  aria-label={`Seleccionar icono ${em}`}
                  aria-pressed={form.emoji === em}
                  className={`w-10 h-10 rounded-xl cursor-pointer text-xl transition-all duration-150 ${
                    form.emoji === em
                      ? 'bg-stone-100 border-2 border-stone-950 scale-110 ring-2 ring-stone-950'
                      : 'bg-white border border-stone-200 scale-100 hover:scale-105'
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </FormField>

          {/* Category */}
          <FormField label={t('products.category', 'Categoría')}>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(cat => (
                <button key={cat} type="button"
                  onClick={() => update('category', form.category === cat ? '' : cat)}
                  className={`px-3 py-1.5 rounded-full text-[13px] cursor-pointer transition-all duration-150 ${
                    form.category === cat
                      ? 'bg-stone-950 text-white border-none'
                      : 'bg-white text-stone-950 border border-stone-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </FormField>

          {/* Tags */}
          <FormField label={t('create_community.etiquetasMax5', 'Etiquetas (máx. 5)')} hint="Presiona Enter para añadir">
            <div className="flex gap-1.5 mb-1.5 flex-wrap">
              {form.tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 text-xs px-2.5 py-0.5 bg-stone-100 text-stone-950 rounded-full">
                  #{tag}
                  <button type="button" onClick={() => update('tags', form.tags.filter(t => t !== tag))}
                    aria-label={`Eliminar etiqueta ${tag}`}
                    className="bg-transparent border-none cursor-pointer text-sm text-stone-500 p-0 leading-none">
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
              className="w-full h-[38px] px-3 bg-stone-100 border border-stone-200 rounded-xl outline-none text-stone-950 text-[13px] box-border"
            />
          </FormField>
        </div>

        {/* Submit */}
        <div className="mt-6">
          <button
            onClick={create}
            disabled={isCreating || !form.name || !form.slug || isUploadingCover}
            className="w-full py-3 rounded-full border-none bg-stone-950 text-white text-[15px] font-semibold cursor-pointer transition-all duration-150"
            style={{ opacity: (isCreating || !form.name || !form.slug) ? 0.5 : 1 }}
          >
            {isCreating ? 'Creando...' : 'Crear comunidad'}
          </button>
        </div>
      </div>

      {/* Desktop: sticky preview column */}
      <div className="hidden md:block w-[280px] shrink-0 sticky top-20 self-start">
        <p className="text-[11px] font-bold text-stone-500 tracking-wide uppercase mb-2.5">
          Vista previa
        </p>
        <CommunityPreviewCard form={form} coverPreview={coverPreview} />
        <p className="text-[11px] text-stone-500 text-center mt-2">
          Así verán tu comunidad los demás
        </p>
      </div>

      </div>
    </div>
  );
}
