// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api/client';
import { useTranslation } from 'react-i18next';
import i18n from "../locales/i18n";
const EMOJIS = ['🌿', '🫙', '🧀', '🫒', '🍯', '👨‍🍳', '💪', '🌾', '🥗', '🌶️', '🍎', '🐟', '🌱', '🏔️', '🇪🇸'];
const CATEGORIES = ["Alimentación", 'Recetas', 'Productores', 'Dieta', "Ecológico", 'Vegano', 'Sin gluten', 'Local', 'Internacional'];
export default function CommunitySettingsPage() {
  const {
    slug
  } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    user
  } = useAuth();
  const {
    data: community,
    isLoading
  } = useQuery({
    queryKey: ['community', slug],
    queryFn: () => apiClient.get(`/communities/${slug}`)
  });
  const communityId = community?.id || community?._id;
  const isAdmin = community?.is_admin || user?.id === community?.creator_id;
  const isCreator = community?.creator_id === (user?.user_id || user?.id);
  const [form, setForm] = useState({
    name: '',
    description: '',
    emoji: '🌿',
    category: '',
    tags: [],
    cover_image: null
  });
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [coverPreview, setCoverPreview] = useState(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  // Populate form from community data
  useEffect(() => {
    if (!community) return;
    setForm({
      name: community.name || '',
      description: community.description || '',
      emoji: community.emoji || '🌿',
      category: community.category || '',
      tags: community.tags || [],
      cover_image: community.cover_image || null
    });
    if (community.cover_image) setCoverPreview(community.cover_image);
  }, [community]);
  useEffect(() => {
    return () => {
      if (coverPreview && coverPreview.startsWith('blob:')) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);
  const update = (key, val) => setForm(f => ({
    ...f,
    [key]: val
  }));
  const handleCover = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (coverPreview?.startsWith('blob:')) URL.revokeObjectURL(coverPreview);
    setCoverPreview(URL.createObjectURL(file));
    setIsUploadingCover(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const data = await apiClient.post('/upload/product-image', fd, {
        timeout: 30000
      });
      update('cover_image', data.url || data.path || data.image_url);
    } catch {
      toast.error('Error al subir imagen');
      setCoverPreview(community?.cover_image || null);
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
  const handleSave = async () => {
    if (!communityId) return;
    if (!form.name.trim()) {
      toast.error(i18n.t('register.elNombreEsObligatorio', 'El nombre es obligatorio'));
      return;
    }
    if (isUploadingCover) {
      toast.error('Espera a que se suba la imagen');
      return;
    }
    setSaving(true);
    try {
      await apiClient.put(`/communities/${communityId}`, form);
      toast.success('Comunidad actualizada');
      queryClient.invalidateQueries({
        queryKey: ['community', slug]
      });
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async () => {
    if (!communityId) return;
    if (!window.confirm('¿Eliminar esta comunidad? Esta acción no se puede deshacer.')) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/communities/${communityId}`);
      toast.success('Comunidad eliminada');
      queryClient.invalidateQueries({
        queryKey: ['communities-explore']
      });
      navigate('/communities');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Error al eliminar');
    } finally {
      setDeleting(false);
    }
  };
  if (isLoading) {
    return <div className="min-h-screen bg-stone-50">
        <div className="sticky top-0 z-40 bg-white border-b border-stone-200 flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="bg-transparent border-none cursor-pointer p-2.5 flex items-center justify-center">
            <ArrowLeft size={22} className="text-stone-950" />
          </button>
          <span className="text-[17px] font-bold text-stone-950">Ajustes</span>
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-12 bg-stone-100 rounded-xl animate-pulse" />)}
        </div>
      </div>;
  }
  if (!isAdmin) {
    return <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-lg font-semibold text-stone-950">Sin permisos</p>
        <p className="text-sm text-stone-500">{i18n.t('community_settings.soloLosAdministradoresPuedenEditarL', 'Solo los administradores pueden editar la comunidad.')}</p>
        <button onClick={() => navigate(-1)} className="px-6 py-2.5 rounded-full bg-stone-950 text-white text-sm font-semibold border-none cursor-pointer">
          Volver
        </button>
      </div>;
  }
  return <div className="min-h-screen bg-stone-50 pb-24">
      {/* Topbar */}
      <div className="sticky top-0 z-40 bg-white border-b border-stone-200 flex items-center gap-3 px-4 py-3">
        <button onClick={() => navigate(-1)} className="bg-transparent border-none cursor-pointer p-2.5 flex items-center justify-center" aria-label="Volver">
          <ArrowLeft size={22} className="text-stone-950" />
        </button>
        <span className="text-[17px] font-bold text-stone-950 flex-1">Ajustes de comunidad</span>
        <button onClick={handleSave} disabled={saving || isUploadingCover} className="flex items-center gap-1.5 rounded-full bg-stone-950 px-4 py-2 text-[13px] font-semibold text-white border-none cursor-pointer disabled:opacity-50">
          <Save size={14} />
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      <div className="max-w-[540px] mx-auto p-4 space-y-4">
        {/* Cover */}
        <label className="block cursor-pointer">
          <p className="text-[13px] font-semibold text-stone-950 mb-1.5">Portada</p>
          <div className="h-[120px] rounded-xl overflow-hidden border-2 border-dashed border-stone-200 relative flex items-center justify-center" style={{
          background: coverPreview ? '#f5f5f4' : '#d6d3d1'
        }}>
            {coverPreview ? <img src={coverPreview} alt="" className="w-full h-full object-cover" /> : <span className="text-stone-500 text-sm">{i18n.t('community_settings.anadirFotoDePortada', 'Añadir foto de portada')}</span>}
            {isUploadingCover && <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>}
          </div>
          <input type="file" accept="image/*" onChange={handleCover} className="hidden" />
        </label>

        {/* Name */}
        <div>
          <p className="text-[13px] font-semibold text-stone-950 mb-1.5">Nombre *</p>
          <input value={form.name} onChange={e => update('name', e.target.value)} maxLength={60} className="w-full h-10 px-3 bg-white border border-stone-200 rounded-xl text-sm text-stone-950 outline-none box-border" />
        </div>

        {/* Description */}
        <div>
          <p className="text-[13px] font-semibold text-stone-950 mb-1.5">{i18n.t('productDetail.description', 'Descripción')}</p>
          <div className="relative">
            <textarea value={form.description} onChange={e => update('description', e.target.value)} rows={3} maxLength={300} className="resize-none w-full px-3 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-950 outline-none box-border" />
            <span className="absolute bottom-2 right-2.5 text-[11px] text-stone-400">{form.description.length}/300</span>
          </div>
        </div>

        {/* Emoji */}
        <div>
          <p className="text-[13px] font-semibold text-stone-950 mb-1.5">Icono</p>
          <div className="flex gap-1.5 flex-wrap">
            {EMOJIS.map(em => <button key={em} type="button" onClick={() => update('emoji', em)} className={`w-10 h-10 rounded-xl cursor-pointer text-xl ${form.emoji === em ? 'bg-stone-100 border-2 border-stone-950' : 'bg-white border border-stone-200'}`}>
                {em}
              </button>)}
          </div>
        </div>

        {/* Category */}
        <div>
          <p className="text-[13px] font-semibold text-stone-950 mb-1.5">{i18n.t('products.category', 'Categoría')}</p>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map(cat => <button key={cat} type="button" onClick={() => update('category', form.category === cat ? '' : cat)} className={`px-3 py-1.5 rounded-full text-[13px] cursor-pointer ${form.category === cat ? 'bg-stone-950 text-white border-none' : 'bg-white text-stone-950 border border-stone-200'}`}>
                {cat}
              </button>)}
          </div>
        </div>

        {/* Tags */}
        <div>
          <p className="text-[13px] font-semibold text-stone-950 mb-1.5">{i18n.t('community_settings.etiquetasMax5', 'Etiquetas (máx. 5)')}</p>
          <div className="flex gap-1.5 mb-1.5 flex-wrap">
            {form.tags.map(tag => <span key={tag} className="flex items-center gap-1 text-xs px-2.5 py-0.5 bg-stone-100 text-stone-950 rounded-full">
                #{tag}
                <button type="button" onClick={() => update('tags', form.tags.filter(t => t !== tag))} className="bg-transparent border-none cursor-pointer text-sm text-stone-500 p-0">×</button>
              </span>)}
          </div>
          <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            addTag();
          }
        }} placeholder={i18n.t('create_recipe.anadirEtiqueta', 'Añadir etiqueta...')} disabled={form.tags.length >= 5} className="w-full h-9 px-3 bg-white border border-stone-200 rounded-xl text-[13px] text-stone-950 outline-none box-border" />
        </div>

        {/* C-03: Delete community (creator only) */}
        {isCreator && <div className="pt-6 border-t border-stone-200">
            <p className="text-[13px] font-semibold text-stone-950 mb-1">Zona peligrosa</p>
            <p className="text-[12px] text-stone-500 mb-3">{i18n.t('community_settings.eliminarLaComunidadBorraraTodosLos', 'Eliminar la comunidad borrará todos los posts y miembros permanentemente.')}</p>
            <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-stone-300 bg-white text-stone-700 text-[13px] font-semibold cursor-pointer hover:bg-stone-50 transition-colors disabled:opacity-50">
              <Trash2 size={14} />
              {deleting ? 'Eliminando...' : 'Eliminar comunidad'}
            </button>
          </div>}
      </div>
    </div>;
}