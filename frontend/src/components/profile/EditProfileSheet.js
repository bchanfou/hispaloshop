import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Check, Globe, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useUpdateProfile } from '../../hooks/api';
import { useUserAvatar } from '../../features/user/hooks';
import { resolveUserImage } from '../../features/user/queries';
import { getCloudinarySrcSet } from '../../utils/cloudinary';
import apiClient from '../../services/api/client';

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

  const [draft, setDraft] = useState({
    name:     '',
    username: '',
    bio:      '',
    website:  '',
  });

  // Reset draft when opening
  useEffect(() => {
    if (isOpen && profile) {
      setDraft({
        name:     profile.name     || '',
        username: profile.username || '',
        bio:      profile.bio      || '',
        website:  profile.website  || '',
      });
    }
  }, [isOpen, profile]);

  const usernameStatus = useCheckUsername(draft.username, profile?.username);

  const set = useCallback(
    (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value })),
    [],
  );

  const handleAvatarChange = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        toast.error('Solo se permiten imágenes');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Máximo 5 MB');
        return;
      }
      try {
        await uploadAvatar(file);
        queryClient.invalidateQueries({ queryKey: ['userProfile', userId] });
        toast.success('Foto actualizada');
      } catch {
        toast.error('Error al subir la foto');
      }
    },
    [uploadAvatar, queryClient, userId],
  );

  const handleSave = useCallback(() => {
    if (usernameStatus === 'taken') {
      toast.error('Ese nombre de usuario ya está en uso');
      return;
    }
    if (usernameStatus === 'invalid') {
      toast.error('El nombre de usuario debe tener al menos 3 caracteres');
      return;
    }
    if (draft.website && !/^https?:\/\//i.test(draft.website)) {
      toast.error('El enlace web debe empezar por http:// o https://');
      return;
    }

    mutate(draft, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['userProfile', userId] });
        toast.success('Perfil actualizado');
        onClose();
      },
      onError: () => toast.error('No se pudo guardar. Inténtalo de nuevo.'),
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
                disabled={isPending || usernameStatus === 'checking'}
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
                      maxLength={30}
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
                    placeholder="Cuéntanos algo sobre ti…"
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
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
