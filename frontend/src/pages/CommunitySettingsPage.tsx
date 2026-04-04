// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Trash2, Save, Shield, ShieldOff, Flag, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api/client';
import { useTranslation } from 'react-i18next';
import i18n from "../locales/i18n";
const EMOJIS = ['🌿', '🫙', '🧀', '🫒', '🍯', '👨‍🍳', '💪', '🌾', '🥗', '🌶️', '🍎', '🐟', '🌱', '🏔️', '🇪🇸'];
const CATEGORIES = [
  { id: 'Alimentación', label: 'Alimentación' },
  { id: 'Recetas', label: 'Recetas' },
  { id: 'Productores', label: 'Productores' },
  { id: 'Dieta', label: 'Dieta' },
  { id: 'Ecológico', label: 'Ecológico' },
  { id: 'Vegano', label: 'Vegano' },
  { id: 'Sin gluten', label: 'Sin gluten' },
  { id: 'Local', label: 'Local' },
  { id: 'Internacional', label: 'Internacional' },
];
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
  const isCreator = community?.role === 'creator' || community?.creator_id === (user?.user_id || user?.id);
  const isAdmin = isCreator;  // Only creator can access settings (moderators use reports queue in their own UI)
  const [form, setForm] = useState({
    name: '',
    description: '',
    emoji: '🌿',
    category: '',
    tags: [],
    cover_image: null,
    logo_url: null,
    rules: [],
  });
  const [tagInput, setTagInput] = useState('');
  const [ruleInput, setRuleInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [coverPreview, setCoverPreview] = useState(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Populate form from community data
  useEffect(() => {
    if (!community) return;
    setForm({
      name: community.name || '',
      description: community.description || '',
      emoji: community.emoji || '🌿',
      category: community.category || '',
      tags: community.tags || [],
      cover_image: community.cover_image || null,
      logo_url: community.logo_url || null,
      rules: community.rules || [],
    });
    if (community.cover_image) setCoverPreview(community.cover_image);
    if (community.logo_url) setLogoPreview(community.logo_url);
  }, [community]);
  useEffect(() => {
    return () => {
      if (coverPreview && coverPreview.startsWith('blob:')) URL.revokeObjectURL(coverPreview);
      if (logoPreview && logoPreview.startsWith('blob:')) URL.revokeObjectURL(logoPreview);
    };
  }, [coverPreview, logoPreview]);
  const handleLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (logoPreview?.startsWith('blob:')) URL.revokeObjectURL(logoPreview);
    setLogoPreview(URL.createObjectURL(file));
    setIsUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const data = await apiClient.post('/upload/product-image', fd, { timeout: 30000 });
      update('logo_url', data.url || data.path || data.image_url);
    } catch {
      toast.error('Error al subir logo');
      setLogoPreview(community?.logo_url || null);
    } finally {
      setIsUploadingLogo(false);
    }
  };
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
    if (isUploadingCover || isUploadingLogo) {
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

        {/* Logo */}
        <label className="block cursor-pointer">
          <p className="text-[13px] font-semibold text-stone-950 mb-1.5">Logo</p>
          <div className="flex items-center gap-3">
            <div className="h-16 w-16 rounded-xl overflow-hidden flex items-center justify-center border-2 border-dashed border-stone-200 relative shrink-0" style={{ background: logoPreview ? '#f5f5f4' : '#e7e5e4' }}>
              {logoPreview ? <img src={logoPreview} alt="" className="w-full h-full object-cover" /> : <span className="text-2xl">{form.emoji}</span>}
              {isUploadingLogo && <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>}
            </div>
            <p className="text-[12px] text-stone-500 m-0">Logo cuadrado de tu comunidad</p>
          </div>
          <input type="file" accept="image/*" onChange={handleLogo} className="hidden" />
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
            {CATEGORIES.map(cat => <button key={cat.id} type="button" onClick={() => update('category', form.category === cat.id ? '' : cat.id)} className={`px-3 py-1.5 rounded-full text-[13px] cursor-pointer ${form.category === cat.id ? 'bg-stone-950 text-white border-none' : 'bg-white text-stone-950 border border-stone-200'}`}>
                {cat.label}
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

        {/* Rules */}
        <div>
          <p className="text-[13px] font-semibold text-stone-950 mb-1.5">Normas de la comunidad (máx. 10)</p>
          <div className="flex flex-col gap-1.5 mb-1.5">
            {form.rules.map((rule, idx) => <div key={idx} className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-xl border border-stone-200">
                <span className="text-stone-400 shrink-0 text-xs">{idx + 1}.</span>
                <span className="flex-1 text-stone-950 text-[13px]">{rule}</span>
                <button type="button" onClick={() => update('rules', form.rules.filter((_, i) => i !== idx))} aria-label={`Eliminar norma ${idx + 1}`} className="bg-transparent border-none cursor-pointer text-sm text-stone-400 p-0 leading-none hover:text-stone-700">
                  ×
                </button>
              </div>)}
          </div>
          <input value={ruleInput} onChange={e => setRuleInput(e.target.value)} onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const rule = ruleInput.trim();
              if (rule && form.rules.length < 10) {
                update('rules', [...form.rules, rule]);
                setRuleInput('');
              }
            }
          }} placeholder="Añadir norma... (Enter para añadir)" disabled={form.rules.length >= 10} maxLength={200} className="w-full h-9 px-3 bg-white border border-stone-200 rounded-xl text-[13px] text-stone-950 outline-none box-border" />
        </div>

        {/* ── Analytics ── */}
        <AnalyticsSection communityId={communityId} />

        {/* ── Moderators ── */}
        <ModeratorsSection communityId={communityId} />

        {/* ── Reports Queue ── */}
        <ReportsSection communityId={communityId} />

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

/* ── Analytics Dashboard ── */
const AnalyticsSection = ({ communityId }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['community-analytics', communityId],
    queryFn: () => apiClient.get(`/communities/${communityId}/analytics`),
    enabled: !!communityId,
  });

  if (isLoading) return <div className="pt-6 border-t border-stone-200">
    <p className="text-[13px] font-semibold text-stone-950 mb-2">Analíticas</p>
    <div className="grid grid-cols-2 gap-2">
      {[1,2,3,4].map(i => <div key={i} className="h-16 bg-stone-100 rounded-xl animate-pulse" />)}
    </div>
  </div>;

  if (!data) return null;

  const KPI = ({ label, value, sub }) => <div className="bg-stone-50 rounded-xl px-3 py-2.5">
    <p className="text-lg font-bold text-stone-950 m-0">{value}</p>
    <p className="text-[11px] text-stone-500 m-0">{label}</p>
    {sub && <p className="text-[10px] text-stone-400 m-0">{sub}</p>}
  </div>;

  return <div className="pt-6 border-t border-stone-200">
    <p className="text-[13px] font-semibold text-stone-950 mb-2">Analíticas</p>

    <div className="grid grid-cols-2 gap-2 mb-3">
      <KPI label="Miembros totales" value={data.total_members?.toLocaleString()} sub={`+${data.new_members_week} esta semana`} />
      <KPI label="Posts totales" value={data.total_posts?.toLocaleString()} sub={`${data.posts_week} esta semana`} />
      <KPI label="Likes este mes" value={data.total_likes_month?.toLocaleString()} />
      <KPI label="Comentarios este mes" value={data.total_comments_month?.toLocaleString()} />
    </div>

    <div className="bg-stone-50 rounded-xl px-3 py-2.5 mb-3">
      <p className="text-[11px] text-stone-500 m-0 mb-0.5">Engagement rate</p>
      <p className="text-lg font-bold text-stone-950 m-0">{data.engagement_rate}%</p>
      <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden mt-1.5">
        <div className="h-full bg-stone-950 rounded-full transition-[width]" style={{ width: `${Math.min(100, data.engagement_rate)}%` }} />
      </div>
    </div>

    {/* PRO/ELITE: Advanced */}
    {data.plan && <div className="bg-stone-950 rounded-xl px-3 py-2.5 text-white mb-3">
      <p className="text-[11px] text-white/60 m-0 mb-1 uppercase tracking-wide font-semibold">Avanzado ({data.plan})</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-base font-bold m-0">{data.linked_products_count}</p>
          <p className="text-[11px] text-white/60 m-0">Productos enlazados</p>
        </div>
        <div>
          <p className="text-base font-bold m-0">{data.orders_from_members_month}</p>
          <p className="text-[11px] text-white/60 m-0">Pedidos de miembros (mes)</p>
        </div>
      </div>
    </div>}

    {/* Top posts */}
    {data.top_posts?.length > 0 && <div>
      <p className="text-[11px] text-stone-500 mb-1.5 font-semibold uppercase tracking-wide">Posts más populares</p>
      <div className="flex flex-col gap-1">
        {data.top_posts.slice(0, 3).map((p, i) => <div key={p.id || i} className="flex items-center gap-2 bg-white border border-stone-200 rounded-xl px-3 py-2">
          <span className="text-[11px] text-stone-400 shrink-0">{i + 1}.</span>
          <p className="flex-1 text-[12px] text-stone-950 m-0 truncate">{p.text?.slice(0, 60) || '(imagen)'}</p>
          <span className="text-[11px] text-stone-500 shrink-0">❤️ {p.likes_count || 0}</span>
        </div>)}
      </div>
    </div>}
  </div>;
};

/* ── Moderators Management ── */
const ModeratorsSection = ({ communityId }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState(null);

  const fetchMembers = async () => {
    try {
      const res = await apiClient.get(`/communities/${communityId}/members?limit=100`);
      setMembers(res?.members || []);
    } catch { /* silent */ } finally { setLoading(false); }
  };

  useEffect(() => { if (communityId) fetchMembers(); }, [communityId]);

  const toggleRole = async (member) => {
    const uid = member.user_id;
    if (togglingId) return;
    setTogglingId(uid);
    const newRole = member.role === 'moderator' ? 'member' : 'moderator';
    try {
      await apiClient.patch(`/communities/${communityId}/members/${uid}/role`, { role: newRole });
      toast.success(newRole === 'moderator' ? `${member.username} es ahora moderador` : `${member.username} ya no es moderador`);
      fetchMembers();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Error al cambiar rol');
    } finally { setTogglingId(null); }
  };

  if (loading) return <div className="pt-6 border-t border-stone-200">
    <p className="text-[13px] font-semibold text-stone-950 mb-2">Moderadores</p>
    <div className="h-10 bg-stone-100 rounded-xl animate-pulse" />
  </div>;

  const moderators = members.filter(m => m.role === 'moderator');
  const regularMembers = members.filter(m => m.role === 'member');

  return <div className="pt-6 border-t border-stone-200">
    <p className="text-[13px] font-semibold text-stone-950 mb-1">Moderadores</p>
    <p className="text-[11px] text-stone-500 mb-3">Los moderadores pueden eliminar posts/comentarios y gestionar reportes</p>

    {moderators.length > 0 && <div className="flex flex-col gap-1.5 mb-3">
      {moderators.map(m => <div key={m.user_id} className="flex items-center gap-2.5 bg-stone-100 px-3 py-2 rounded-xl">
        <img src={m.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.username || 'U')}&size=32`} className="w-8 h-8 rounded-full shrink-0 object-cover" alt="" />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-stone-950 m-0 truncate">{m.username}</p>
          <p className="text-[10px] text-stone-500 m-0 flex items-center gap-1"><Shield size={10} /> Moderador</p>
        </div>
        <button onClick={() => toggleRole(m)} disabled={togglingId === m.user_id} className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-full border border-stone-200 bg-white text-stone-600 cursor-pointer hover:bg-stone-50 disabled:opacity-50">
          <ShieldOff size={12} /> Quitar
        </button>
      </div>)}
    </div>}

    {regularMembers.length > 0 && <>
      <p className="text-[11px] text-stone-500 mb-1.5">Promover a moderador:</p>
      <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto">
        {regularMembers.slice(0, 20).map(m => <div key={m.user_id} className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-stone-50">
          <img src={m.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.username || 'U')}&size=28`} className="w-7 h-7 rounded-full shrink-0 object-cover" alt="" />
          <span className="flex-1 text-[13px] text-stone-950 truncate">{m.username}</span>
          <button onClick={() => toggleRole(m)} disabled={togglingId === m.user_id} className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-full bg-stone-950 text-white border-none cursor-pointer disabled:opacity-50">
            <Shield size={12} /> Hacer mod
          </button>
        </div>)}
      </div>
    </>}
  </div>;
};

/* ── Reports Queue ── */
const ReportsSection = ({ communityId }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState(null);

  const fetchReports = async () => {
    try {
      const res = await apiClient.get(`/communities/${communityId}/reports?status=pending`);
      setReports(res?.reports || []);
    } catch { /* silent */ } finally { setLoading(false); }
  };

  useEffect(() => { if (communityId) fetchReports(); }, [communityId]);

  const resolve = async (reportId, action) => {
    if (resolvingId) return;
    setResolvingId(reportId);
    try {
      await apiClient.patch(`/communities/reports/${reportId}`, { action });
      toast.success(action === 'reviewed' ? 'Reporte aceptado — contenido ocultado' : 'Reporte descartado');
      fetchReports();
    } catch {
      toast.error('Error al resolver reporte');
    } finally { setResolvingId(null); }
  };

  if (loading) return null;
  if (reports.length === 0) return <div className="pt-6 border-t border-stone-200">
    <p className="text-[13px] font-semibold text-stone-950 mb-1 flex items-center gap-1.5"><Flag size={14} /> Reportes</p>
    <p className="text-[12px] text-stone-500">No hay reportes pendientes</p>
  </div>;

  const REASON_LABELS = {
    spam: 'Spam', offensive: 'Ofensivo', irrelevant: 'Irrelevante',
    harassment: 'Acoso', misinformation: 'Desinformación', other: 'Otro',
  };

  return <div className="pt-6 border-t border-stone-200">
    <p className="text-[13px] font-semibold text-stone-950 mb-2 flex items-center gap-1.5"><Flag size={14} /> Reportes pendientes ({reports.length})</p>
    <div className="flex flex-col gap-2">
      {reports.map(r => <div key={r.id} className="bg-white border border-stone-200 rounded-xl px-3 py-2.5">
        <div className="flex items-center gap-2 mb-1.5">
          <AlertTriangle size={13} className="text-stone-500 shrink-0" />
          <span className="text-[12px] font-semibold text-stone-950">{r.content_type === 'post' ? 'Post' : r.content_type === 'comment' ? 'Comentario' : r.content_type === 'member' ? 'Miembro' : 'Comunidad'}</span>
          <span className="text-[11px] bg-stone-100 px-2 py-0.5 rounded-full text-stone-600">{REASON_LABELS[r.reason] || r.reason}</span>
        </div>
        {r.details && <p className="text-[12px] text-stone-600 m-0 mb-1.5">{r.details}</p>}
        <p className="text-[10px] text-stone-400 m-0 mb-2">Reportado por @{r.reporter_username}</p>
        <div className="flex gap-2">
          <button onClick={() => resolve(r.id, 'reviewed')} disabled={resolvingId === r.id} className="flex-1 py-1.5 text-[12px] font-semibold rounded-full bg-stone-950 text-white border-none cursor-pointer disabled:opacity-50">
            Aceptar (ocultar)
          </button>
          <button onClick={() => resolve(r.id, 'dismissed')} disabled={resolvingId === r.id} className="flex-1 py-1.5 text-[12px] font-semibold rounded-full bg-white text-stone-600 border border-stone-200 cursor-pointer disabled:opacity-50">
            Descartar
          </button>
        </div>
      </div>)}
    </div>
  </div>;
};