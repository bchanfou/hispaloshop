import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Check, Globe, Loader2, MapPin, X, Youtube } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useUpdateProfile } from '../../hooks/api';
import { useUserAvatar } from '../../features/user/hooks';
import { resolveUserImage, userKeys } from '../../features/user/queries';
import { getCloudinarySrcSet } from '../../utils/cloudinary';
import apiClient from '../../services/api/client';
import { useTranslation } from 'react-i18next';

function useCheckUsername(username, currentUsername) {
  const [status, setStatus] = useState('idle'); // idle | checking | available | taken | invalid
  const timerRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    const trimmed = (username || '').trim().toLowerCase().replace(/\s+/g, '_');

    if (!trimmed || trimmed.length < 3) {
      setStatus(trimmed.length > 0 ? 'invalid' : 'idle');
      return () => { mounted = false; };
    }
    if (trimmed === (currentUsername || '').toLowerCase()) {
      setStatus('idle');
      return () => { mounted = false; };
    }

    setStatus('checking');
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await apiClient.get(`/users/check-username/${encodeURIComponent(trimmed)}`);
        if (mounted) setStatus(res.available ? 'available' : 'taken');
      } catch {
        if (mounted) setStatus('taken');
      }
    }, 500);

    return () => { mounted = false; clearTimeout(timerRef.current); };
  }, [username, currentUsername]);

  return status;
}

export default function EditProfileSheet({ isOpen, profile, userId, onClose }) {
  const queryClient = useQueryClient();
  const { mutate, isPending } = useUpdateProfile();
  const { uploadingAvatar, uploadAvatar } = useUserAvatar(userId);
  const avatarInputRef = useRef(null);

  const isProducer = profile?.role === 'producer' || profile?.role === 'importer';
  const [draft, setDraft] = useState({
    name:     '',
    username: '',
    bio:      '',
    website:  '',
    location: '',
    instagram: '',
    tiktok:    '',
    youtube:   '',
    company_name: '',
    store_description: '',
  });

  // Reset draft when opening
  useEffect(() => {
    if (isOpen && profile) {
      const sl = profile.social_links || {};
      setDraft({
        name:     profile.name     || '',
        username: profile.username || '',
        bio:      profile.bio      || '',
        website:  profile.website  || '',
        location: profile.location || profile.city || '',
        instagram: sl.instagram || profile.instagram || '',
        tiktok:    sl.tiktok    || profile.tiktok    || '',
        youtube:   sl.youtube   || profile.youtube   || '',
        company_name: profile.company_name || '',
        store_description: profile.store_description || '',
      });
    }
  }, [isOpen, profile]);

  const usernameStatus = useCheckUsername(draft.username, profile?.username);

  // Detect if user made any changes
  const hasChanges = useMemo(() => {
    if (!profile) return false;
    const sl = profile.social_links || {};
    return (
      draft.name !== (profile.name || '') ||
      draft.username !== (profile.username || '') ||
      draft.bio !== (profile.bio || '') ||
      draft.website !== (profile.website || '') ||
      draft.location !== (profile.location || profile.city || '') ||
      draft.instagram !== (sl.instagram || profile.instagram || '') ||
      draft.tiktok !== (sl.tiktok || profile.tiktok || '') ||
      draft.youtube !== (sl.youtube || profile.youtube || '') ||
      draft.company_name !== (profile.company_name || '') ||
      draft.store_description !== (profile.store_description || '')
    );
  }, [draft, profile]);

  const set = useCallback(
    (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value })),
    [],
  );

  const handleAvatarChange = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        toast.error(t('social.imagesOnly', 'Solo se permiten imágenes'));
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t('edit_profile.maximo5Mb', 'Máximo 5 MB'));
        return;
      }
      try {
        await uploadAvatar(file);
        queryClient.invalidateQueries({ queryKey: userKeys.profile(userId) });
        toast.success('Foto actualizada');
      } catch {
        toast.error(t('user_profile.errorAlSubirLaFoto', 'Error al subir la foto'));
      }
    },
    [uploadAvatar, queryClient, userId],
  );

  const handleSave = useCallback(() => {
    if (usernameStatus === 'taken') {
      toast.error(t('edit_profile.eseNombreDeUsuarioYaEstaEnUso', 'Ese nombre de usuario ya está en uso'));
      return;
    }
    if (usernameStatus === 'invalid') {
      toast.error(t('edit_profile.elNombreDeUsuarioDebeTenerAlMenos', 'El nombre de usuario debe tener al menos 3 caracteres'));
      return;
    }
    // Block dangerous protocols
    let website = draft.website.trim();
    if (website && /^(javascript|data|ftp|file):/i.test(website)) {
      toast.error(t('edit_profile.urlNoValida', 'URL no válida'));
      return;
    }
    if (website && !/^https?:\/\//i.test(website)) {
      website = 'https://' + website;
    }

    const payload = {
      ...draft,
      website,
      social_links: {
        instagram: draft.instagram || '',
        tiktok: draft.tiktok || '',
        youtube: draft.youtube || '',
      },
    };
    delete payload.instagram;
    delete payload.tiktok;
    delete payload.youtube;
    // Only include producer fields for producer/importer roles
    if (!isProducer) {
      delete payload.company_name;
      delete payload.store_description;
    }

    mutate(payload, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: userKeys.profile(userId) });
        toast.success('Perfil actualizado');
        onClose();
      },
      onError: () => toast.error(t('edit_profile.noSePudoGuardarIntentaloDeNuevo', 'No se pudo guardar. Inténtalo de nuevo.')),
    });
  }, [draft, usernameStatus, mutate, queryClient, userId, onClose]);

  const avatarSrc = profile?.profile_image ? resolveUserImage(profile.profile_image) : null;
  const bioLength = draft.bio.length;
  const bioMax = 150;

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/45"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38, mass: 0.8 }}
            role="dialog"
            aria-modal="true"
            aria-label="Editar perfil"
            className="fixed bottom-0 left-0 right-0 z-[101] flex h-[95vh] flex-col overflow-hidden rounded-t-[20px] bg-white md:bottom-auto md:left-1/2 md:right-auto md:top-1/2 md:h-[85vh] md:max-h-[700px] md:w-[480px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[20px]"
          >
            {/* Handle */}
            <div className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-stone-200 md:hidden" />

            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-stone-100 px-4 py-3.5">
              <button
                type="button"
                onClick={onClose}
                className="text-[14px] text-stone-500 active:opacity-50"
              >
                Cancelar
              </button>
              <span className="text-[15px] font-semibold text-stone-950">Editar perfil</span>
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending || usernameStatus === 'checking' || !hasChanges}
                className="flex items-center gap-1 text-[14px] font-semibold text-stone-950 disabled:opacity-50 active:opacity-50"
              >
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Guardar
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto overscroll-contain">

              {/* Avatar section */}
              <div className="flex flex-col items-center py-6">
                <div className="relative">
                  <div className="h-[90px] w-[90px] overflow-hidden rounded-full bg-stone-100 ring-[2px] ring-stone-950 ring-offset-[3px] ring-offset-white">
                    {avatarSrc ? (
                      <img
                        src={avatarSrc}
                        srcSet={getCloudinarySrcSet(avatarSrc, [90, 180, 270])}
                        sizes="90px"
                        alt="Avatar"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-stone-300">
                        <Camera className="h-8 w-8" />
                      </div>
                    )}
                    {uploadingAvatar && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/35">
                        <Loader2 className="h-5 w-5 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-900 shadow-sm"
                    aria-label="Cambiar foto"
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="mt-2 text-[13px] font-semibold text-stone-950 active:opacity-50 disabled:opacity-50"
                >
                  {uploadingAvatar ? 'Subiendo...' : 'Cambiar foto'}
                </button>
              </div>

              {/* Fields */}
              <div className="divide-y divide-stone-100">
                {/* Nombre */}
                <div className="px-5 py-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400">
                    Nombre
                  </p>
                  <input
                    type="text"
                    value={draft.name}
                    onChange={set('name')}
                    placeholder="Tu nombre"
                    maxLength={50}
                    className="mt-1 w-full bg-transparent text-[15px] text-stone-950 outline-none placeholder:text-stone-400"
                  />
                </div>

                {/* Usuario */}
                <div className="px-5 py-3.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400">
                      Usuario
                    </p>
                    {usernameStatus === 'checking' && (
                      <Loader2 className="h-3 w-3 animate-spin text-stone-400" />
                    )}
                    {usernameStatus === 'available' && (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-stone-600">
                        <Check className="h-3 w-3" /> Disponible
                      </span>
                    )}
                    {usernameStatus === 'taken' && (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-stone-950">
                        <X className="h-3 w-3" /> No disponible
                      </span>
                    )}
                    {usernameStatus === 'invalid' && (
                      <span className="text-[11px] font-medium text-stone-400">
                        Mín. 3 caracteres
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-1">
                    <span className="text-[15px] text-stone-400">@</span>
                    <input
                      type="text"
                      value={draft.username}
                      onChange={set('username')}
                      placeholder="nombre_de_usuario"
                      maxLength={20}
                      className="flex-1 bg-transparent text-[15px] text-stone-950 outline-none placeholder:text-stone-400"
                    />
                  </div>
                </div>

                {/* Bio */}
                <div className="px-5 py-3.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400">
                      Bio
                    </p>
                    <p className={`text-[11px] tabular-nums ${bioLength > bioMax ? 'font-bold text-stone-950' : 'text-stone-400'}`}>
                      {bioLength}/{bioMax}
                    </p>
                  </div>
                  <textarea
                    value={draft.bio}
                    onChange={set('bio')}
                    placeholder={t('edit_profile.cuentanosAlgoSobreTi…', 'Cuéntanos algo sobre ti…')}
                    rows={3}
                    maxLength={bioMax}
                    className="mt-1 w-full resize-none bg-transparent text-[15px] leading-relaxed text-stone-950 outline-none placeholder:text-stone-400"
                  />
                </div>

                {/* Enlace web */}
                <div className="flex items-center gap-2 px-5 py-3.5">
                  <Globe className="h-4 w-4 shrink-0 text-stone-400" />
                  <input
                    type="url"
                    value={draft.website}
                    onChange={set('website')}
                    placeholder="Enlace web"
                    className="flex-1 bg-transparent text-[15px] text-stone-950 outline-none placeholder:text-stone-400"
                  />
                </div>

                {/* Ubicación */}
                <div className="flex items-center gap-2 px-5 py-3.5">
                  <MapPin className="h-4 w-4 shrink-0 text-stone-400" />
                  <input
                    type="text"
                    value={draft.location}
                    onChange={set('location')}
                    placeholder={t('store.location', 'Ubicación')}
                    maxLength={60}
                    className="flex-1 bg-transparent text-[15px] text-stone-950 outline-none placeholder:text-stone-400"
                  />
                </div>
              </div>

              {/* Social links section */}
              <div className="px-5 pt-4 pb-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400">
                  Redes sociales
                </p>
              </div>
              <div className="divide-y divide-stone-100">
                {/* Instagram */}
                <div className="flex items-center gap-2 px-5 py-3.5">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0 text-stone-400"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                  <input
                    type="text"
                    value={draft.instagram}
                    onChange={set('instagram')}
                    placeholder="Usuario de Instagram"
                    maxLength={30}
                    className="flex-1 bg-transparent text-[15px] text-stone-950 outline-none placeholder:text-stone-400"
                  />
                </div>
                {/* TikTok */}
                <div className="flex items-center gap-2 px-5 py-3.5">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0 text-stone-400"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.88-2.88 2.89 2.89 0 012.88-2.88c.28 0 .56.04.82.11v-3.5a6.37 6.37 0 00-.82-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.37a8.16 8.16 0 004.76 1.52v-3.45a4.85 4.85 0 01-1-.75z"/></svg>
                  <input
                    type="text"
                    value={draft.tiktok}
                    onChange={set('tiktok')}
                    placeholder="Usuario de TikTok"
                    maxLength={30}
                    className="flex-1 bg-transparent text-[15px] text-stone-950 outline-none placeholder:text-stone-400"
                  />
                </div>
                {/* YouTube */}
                <div className="flex items-center gap-2 px-5 py-3.5">
                  <Youtube className="h-4 w-4 shrink-0 text-stone-400" />
                  <input
                    type="text"
                    value={draft.youtube}
                    onChange={set('youtube')}
                    placeholder="Canal de YouTube"
                    maxLength={50}
                    className="flex-1 bg-transparent text-[15px] text-stone-950 outline-none placeholder:text-stone-400"
                  />
                </div>
              </div>

              {/* Producer fields */}
              {isProducer && (
                <>
                  <div className="px-5 pt-4 pb-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400">
                      Empresa
                    </p>
                  </div>
                  <div className="divide-y divide-stone-100">
                    <div className="px-5 py-3.5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400">Nombre de empresa</p>
                      <input type="text" value={draft.company_name} onChange={set('company_name')} placeholder="Nombre comercial" maxLength={120} className="mt-1 w-full bg-transparent text-[15px] text-stone-950 outline-none placeholder:text-stone-400" />
                    </div>
                    <div className="px-5 py-3.5">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400">{t('edit_profile.descripcionDeTienda', 'Descripción de tienda')}</p>
                        <p className={`text-[11px] tabular-nums ${draft.store_description.length > 450 ? 'font-bold text-stone-950' : 'text-stone-400'}`}>{draft.store_description.length}/500</p>
                      </div>
                      <textarea value={draft.store_description} onChange={set('store_description')} placeholder="Describe tu tienda…" rows={3} maxLength={500} className="mt-1 w-full resize-none bg-transparent text-[15px] leading-relaxed text-stone-950 outline-none placeholder:text-stone-400" />
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
