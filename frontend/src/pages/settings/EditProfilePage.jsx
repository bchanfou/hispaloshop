import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Loader2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api/client';

export default function EditProfilePage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    name: '', username: '', bio: '', website: '', location: '',
    company_name: '', company_cif: '', store_description: '',
  });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState(null);
  const usernameTimerRef = useRef(null);

  const isProducer = user?.role === 'producer' || user?.role === 'importer';
  const canSave = hasChanges() && !saving && usernameStatus !== 'taken';

  /* cleanup username debounce timer on unmount */
  useEffect(() => {
    return () => { if (usernameTimerRef.current) clearTimeout(usernameTimerRef.current); };
  }, []);

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || user.full_name || '',
      username: user.username || '',
      bio: user.bio || '',
      website: user.website || '',
      location: user.location || '',
      company_name: user.company_name || '',
      company_cif: user.company_cif || user.cif || '',
      store_description: user.store_description || '',
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
    if (isProducer) {
      if (form.company_name !== (user?.company_name || '')) return true;
      if (form.store_description !== (user?.store_description || '')) return true;
    }
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
    if (form.website && !/^https?:\/\//i.test(form.website)) {
      toast.error('El enlace web debe empezar por http:// o https://');
      return;
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
        website: form.website,
        location: form.location,
        avatar_url: avatarUrl,
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
    ? 'border-stone-500'
    : usernameStatus === 'available'
      ? 'border-stone-950'
      : 'border-stone-200';

  return (
    <div className="min-h-screen bg-stone-50">
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
              ? 'bg-stone-950 text-white'
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
              <img src={avatarPreview} alt="Foto de perfil" className="h-full w-full object-cover" />
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
              className={`h-11 w-full rounded-lg border pl-[30px] pr-9 text-sm text-stone-950 outline-none ${usernameBorderClass}`}
            />
            {usernameStatus === 'checking' && (
              <Loader2 size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-stone-500" />
            )}
            {usernameStatus === 'available' && (
              <Check size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-950" />
            )}
            {usernameStatus === 'taken' && (
              <X size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-500" />
            )}
          </div>
          {usernameStatus === 'taken' && (
            <p className="mt-1 text-xs text-stone-500">Este usuario ya está en uso</p>
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
            className="w-full resize-none rounded-lg border border-stone-200 px-3.5 py-2.5 text-sm leading-relaxed text-stone-950 outline-none placeholder:text-stone-400"
          />
          <p className="mt-1 text-right text-[11px] text-stone-500">
            {form.bio.length}/150
          </p>
        </div>

        <FormField label="Sitio web" value={form.website} type="url" placeholder="https://..."
          onChange={v => setForm(f => ({ ...f, website: v }))} />

        <FormField label="Ubicación" value={form.location} placeholder="Madrid, España"
          onChange={v => setForm(f => ({ ...f, location: v }))} />

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
                className={`h-11 w-full rounded-lg border border-stone-200 px-3.5 text-sm outline-none ${
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
                className="w-full resize-none rounded-lg border border-stone-200 px-3.5 py-2.5 text-sm leading-relaxed text-stone-950 outline-none placeholder:text-stone-400"
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
        className="h-11 w-full rounded-lg border border-stone-200 px-3.5 text-sm text-stone-950 outline-none placeholder:text-stone-400"
      />
    </div>
  );
}
