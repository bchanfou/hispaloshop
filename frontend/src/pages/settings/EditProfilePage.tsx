// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Loader2, Check, X, Youtube } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api/client';

export default function EditProfilePage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    name: '', username: '', bio: '', website: '', location: '',
    phone: '',
    company_name: '', company_cif: '', store_description: '',
    instagram: '', tiktok: '', youtube: '',
  });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState(null);
  const usernameTimerRef = useRef(null);

  const isProducer = user?.role === 'producer' || user?.role === 'importer';
  const canSave = hasChanges() && !saving && usernameStatus !== 'taken' && usernameStatus !== 'checking';

  /* cleanup username debounce timer + blob URL on unmount */
  useEffect(() => {
    return () => {
      if (usernameTimerRef.current) clearTimeout(usernameTimerRef.current);
      if (avatarPreview && avatarPreview.startsWith('blob:')) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  useEffect(() => {
    if (!user) return;
    const sl = user.social_links || {};
    setForm({
      name: user.name || user.full_name || '',
      username: user.username || '',
      bio: user.bio || '',
      website: user.website || '',
      location: user.location || '',
      phone: user.phone || '',
      company_name: user.company_name || '',
      company_cif: user.company_cif || user.cif || '',
      store_description: user.store_description || '',
      instagram: sl.instagram || user.instagram || '',
      tiktok: sl.tiktok || user.tiktok || '',
      youtube: sl.youtube || user.youtube || '',
    });
    setAvatarPreview(user.avatar_url || user.avatar || null);
  }, [user]);

  const originalUsername = user?.username || '';

  function hasChanges() {
    if (avatarFile) return true;
    if (form.name !== (user?.name || user?.full_name || '')) return true;
    if (form.username !== originalUsername) return true;
    if (form.bio !== (user?.bio || '')) return true;
    if (form.website !== (user?.website || '')) return true;
    if (form.location !== (user?.location || '')) return true;
    if (form.phone !== (user?.phone || '')) return true;
    if (isProducer) {
      if (form.company_name !== (user?.company_name || '')) return true;
      if (form.store_description !== (user?.store_description || '')) return true;
    }
    const sl = user?.social_links || {};
    if (form.instagram !== (sl.instagram || user?.instagram || '')) return true;
    if (form.tiktok !== (sl.tiktok || user?.tiktok || '')) return true;
    if (form.youtube !== (sl.youtube || user?.youtube || '')) return true;
    return false;
  }

  const handleUsernameChange = useCallback((val) => {
    const clean = val.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 30);
    setForm(f => ({ ...f, username: clean }));

    if (usernameTimerRef.current) clearTimeout(usernameTimerRef.current);
    if (clean === originalUsername || clean.length < 3) {
      setUsernameStatus(null);
      return;
    }

    setUsernameStatus('checking');
    usernameTimerRef.current = setTimeout(async () => {
      try {
        const res = await apiClient.get(`/users/check-username/${clean}`);
        setUsernameStatus(res.available ? 'available' : 'taken');
      } catch {
        setUsernameStatus(null);
      }
    }, 500);
  }, [originalUsername]);

  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (avatarPreview && avatarPreview.startsWith('blob:')) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (usernameStatus === 'taken') {
      toast.error('El nombre de usuario no está disponible');
      return;
    }
    // Auto-prepend https:// to website if user typed a bare domain
    let website = form.website.trim();
    if (website && !/^https?:\/\//i.test(website)) {
      website = 'https://' + website;
    }
    setSaving(true);
    try {
      let avatarUrl = user?.avatar_url || user?.avatar;

      if (avatarFile) {
        const formData = new FormData();
        formData.append('file', avatarFile);
        const uploadRes = await apiClient.post('/upload/avatar', formData, {
          timeout: 30000,
        });
        avatarUrl = uploadRes.url || uploadRes.path || uploadRes.image_url;
      }

      const body = {
        name: form.name,
        username: form.username,
        bio: form.bio,
        website: website,
        location: form.location,
        phone: form.phone,
        avatar_url: avatarUrl,
        social_links: {
          instagram: form.instagram || '',
          tiktok: form.tiktok || '',
          youtube: form.youtube || '',
        },
      };

      if (isProducer) {
        body.company_name = form.company_name;
        body.store_description = form.store_description;
      }

      await apiClient.put('/customer/profile', body);
      if (refreshUser) await refreshUser();
      toast.success('Perfil actualizado');
      navigate('/settings');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const usernameBorderClass = usernameStatus === 'taken'
    ? 'border-red-500'
    : usernameStatus === 'available'
      ? 'border-stone-950'
      : 'border-stone-200';

  return (
    <div className="min-h-screen bg-white">
      {/* Topbar */}
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-stone-200 bg-white px-4 py-3">
        <button
          onClick={() => navigate('/settings')}
          aria-label="Volver a ajustes"
          className="flex p-2.5"
        >
          <ArrowLeft size={22} className="text-stone-950" />
        </button>
        <span className="flex-1 text-center text-[17px] font-bold text-stone-950">
          Editar perfil
        </span>
        <button
          onClick={handleSave}
          disabled={!canSave}
          className={`rounded-full px-4 py-1.5 text-[13px] font-semibold transition-all duration-150 ${
            canSave
              ? 'bg-stone-950 text-white hover:bg-stone-800'
              : 'bg-stone-100 text-stone-500'
          } disabled:opacity-50`}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : 'Guardar'}
        </button>
      </div>

      <div className="mx-auto max-w-[600px] px-4 pb-24 pt-6">
        {/* ── Avatar ── */}
        <div className="mb-8 flex justify-center">
          <div
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileRef.current?.click(); } }}
            role="button"
            tabIndex={0}
            aria-label="Cambiar foto de perfil"
            className="group relative h-[88px] w-[88px] cursor-pointer overflow-hidden rounded-full bg-stone-100"
          >
            {avatarPreview ? (
              <img loading="lazy" src={avatarPreview} alt="Foto de perfil" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Camera size={28} className="text-stone-500" />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <Camera size={24} className="text-white" />
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
        </div>

        {/* ── Form Fields ── */}
        <FormField label="Nombre completo" value={form.name}
          onChange={v => setForm(f => ({ ...f, name: v }))} />

        <div className="mb-5">
          <label className="mb-1.5 block text-[13px] font-semibold text-stone-950">
            Usuario
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-stone-500">@</span>
            <input
              value={form.username}
              onChange={e => handleUsernameChange(e.target.value)}
              maxLength={30}
              className={`h-11 w-full rounded-2xl border pl-[30px] pr-9 text-sm text-stone-950 outline-none ${usernameBorderClass}`}
            />
            {usernameStatus === 'checking' && (
              <Loader2 size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-stone-500" />
            )}
            {usernameStatus === 'available' && (
              <Check size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-950" />
            )}
            {usernameStatus === 'taken' && (
              <X size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-red-500" />
            )}
          </div>
          {usernameStatus === 'taken' && (
            <p className="mt-1 text-xs text-red-600">Este nombre de usuario no está disponible</p>
          )}
          {usernameStatus === 'available' && (
            <p className="mt-1 text-xs text-stone-500">Disponible</p>
          )}
        </div>

        <div className="mb-5">
          <label className="mb-1.5 block text-[13px] font-semibold text-stone-950">
            Biografía
          </label>
          <textarea
            value={form.bio}
            onChange={e => setForm(f => ({ ...f, bio: e.target.value.slice(0, 150) }))}
            maxLength={150}
            placeholder="Cuéntanos sobre ti..."
            rows={3}
            className="w-full resize-none rounded-2xl border border-stone-200 px-3.5 py-2.5 text-sm leading-relaxed text-stone-950 outline-none placeholder:text-stone-400"
          />
          <p className="mt-1 text-right text-[11px] text-stone-500">
            {form.bio.length}/150
          </p>
        </div>

        <FormField label="Sitio web" value={form.website} type="url" placeholder="https://..."
          onChange={v => setForm(f => ({ ...f, website: v }))} />

        <FormField label="Ubicación" value={form.location} placeholder="Madrid, España"
          onChange={v => setForm(f => ({ ...f, location: v }))} />

        {/* ── Social Links ── */}
        <div className="mt-2 border-t border-stone-200 pt-5">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-stone-500">
            Redes sociales
          </p>
        </div>

        <div className="mb-5">
          <label className="mb-1.5 flex items-center gap-2 text-[13px] font-semibold text-stone-950">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-stone-500"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            Instagram
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-stone-500">@</span>
            <input
              type="text"
              value={form.instagram}
              onChange={e => setForm(f => ({ ...f, instagram: e.target.value.replace(/^@/, '').slice(0, 30) }))}
              placeholder="tu_instagram"
              maxLength={30}
              className="h-11 w-full rounded-2xl border border-stone-200 pl-[30px] pr-3.5 text-sm text-stone-950 outline-none focus:border-stone-950 placeholder:text-stone-400"
            />
          </div>
        </div>

        <div className="mb-5">
          <label className="mb-1.5 flex items-center gap-2 text-[13px] font-semibold text-stone-950">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-stone-500"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.88-2.88 2.89 2.89 0 012.88-2.88c.28 0 .56.04.82.11v-3.5a6.37 6.37 0 00-.82-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.37a8.16 8.16 0 004.76 1.52v-3.45a4.85 4.85 0 01-1-.75z"/></svg>
            TikTok
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-stone-500">@</span>
            <input
              type="text"
              value={form.tiktok}
              onChange={e => setForm(f => ({ ...f, tiktok: e.target.value.replace(/^@/, '').slice(0, 30) }))}
              placeholder="tu_usuario"
              maxLength={30}
              className="h-11 w-full rounded-2xl border border-stone-200 pl-[30px] pr-3.5 text-sm text-stone-950 outline-none focus:border-stone-950 placeholder:text-stone-400"
            />
          </div>
        </div>

        <div className="mb-5">
          <label className="mb-1.5 flex items-center gap-2 text-[13px] font-semibold text-stone-950">
            <Youtube size={16} className="text-stone-500" />
            YouTube
          </label>
          <input
            type="url"
            value={form.youtube}
            onChange={e => setForm(f => ({ ...f, youtube: e.target.value.slice(0, 100) }))}
            placeholder="youtube.com/..."
            maxLength={100}
            className="h-11 w-full rounded-2xl border border-stone-200 px-3.5 text-sm text-stone-950 outline-none focus:border-stone-950 placeholder:text-stone-400"
          />
        </div>

        {/* ── Contact Info ── */}
        <div className="mt-2 border-t border-stone-200 pt-5">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-stone-500">
            Información de contacto
          </p>
        </div>

        <div className="mb-5">
          <label className="mb-1.5 block text-[13px] font-semibold text-stone-950">
            Email
          </label>
          <input
            value={user?.email || ''}
            readOnly
            className="h-11 w-full rounded-2xl border border-stone-200 bg-stone-100 px-3.5 text-sm text-stone-500 outline-none"
          />
          <p className="mt-1 text-[11px] text-stone-400">El email no se puede cambiar desde aquí</p>
        </div>

        <FormField label="Teléfono" value={form.phone} placeholder="+34 600 000 000"
          onChange={v => setForm(f => ({ ...f, phone: v }))} />

        {/* ── Producer Fields ── */}
        {isProducer && (
          <>
            <div className="mt-2 border-t border-stone-200 pt-5">
              <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-stone-500">
                Datos de empresa
              </p>
            </div>

            <FormField label="Nombre de la empresa" value={form.company_name}
              onChange={v => setForm(f => ({ ...f, company_name: v }))} />

            <div className="mb-5">
              <label className="mb-1.5 flex items-center gap-2 text-[13px] font-semibold text-stone-950">
                CIF/NIF empresa
                {user?.is_verified && (
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-950">
                    Verificado ✓
                  </span>
                )}
              </label>
              <input
                value={form.company_cif}
                readOnly={!!user?.is_verified}
                className={`h-11 w-full rounded-2xl border border-stone-200 px-3.5 text-sm outline-none ${
                  user?.is_verified
                    ? 'bg-stone-100 text-stone-500'
                    : 'bg-white text-stone-950'
                }`}
              />
            </div>

            <div className="mb-5">
              <label className="mb-1.5 block text-[13px] font-semibold text-stone-950">
                Descripción de la tienda
              </label>
              <textarea
                value={form.store_description}
                onChange={e => setForm(f => ({ ...f, store_description: e.target.value.slice(0, 500) }))}
                maxLength={500}
                placeholder="Describe tu tienda, tus productos, tu historia..."
                rows={4}
                className="w-full resize-none rounded-2xl border border-stone-200 px-3.5 py-2.5 text-sm leading-relaxed text-stone-950 outline-none placeholder:text-stone-400"
              />
              <p className="mt-1 text-right text-[11px] text-stone-500">
                {form.store_description.length}/500
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function FormField({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div className="mb-5">
      <label className="mb-1.5 block text-[13px] font-semibold text-stone-950">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-2xl border border-stone-200 px-3.5 text-sm text-stone-950 outline-none focus:border-stone-950 placeholder:text-stone-400"
      />
    </div>
  );
}
