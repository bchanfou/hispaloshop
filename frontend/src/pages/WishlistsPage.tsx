// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/api/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import i18n from '../locales/i18n';
import { trackEvent } from '../utils/analytics';
import { Heart, Plus, Lock, Globe, ArrowLeft } from 'lucide-react';

interface Wishlist {
  wishlist_id: string;
  title: string;
  item_count: number;
  is_public: boolean;
  is_default: boolean;
  cover_thumbnails: string[];
}

export default function WishlistsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchWishlists();
  }, []);

  async function fetchWishlists() {
    try {
      const { data } = await apiClient.get('/wishlists');
      setWishlists(data.wishlists ?? data ?? []);
    } catch {
      toast.error(t('wishlists.fetchError', 'No se pudieron cargar las listas'));
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    const title = newTitle.trim();
    if (!title) return;
    setCreating(true);
    try {
      await apiClient.post('/wishlists', { title });
      trackEvent('wishlist_created', { title });
      setNewTitle('');
      setShowCreate(false);
      fetchWishlists();
    } catch {
      toast.error(t('wishlists.createError', 'No se pudo crear la lista'));
    } finally {
      setCreating(false);
    }
  }

  /* ── Skeleton ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50">
        <div className="sticky top-0 z-10 flex items-center gap-3 bg-stone-50 px-4 py-3 border-b border-stone-200">
          <div className="w-8 h-8 rounded-full bg-stone-200 animate-pulse" />
          <div className="h-5 w-40 rounded bg-stone-200 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-stone-200 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  /* ── Empty state ── */
  const isEmpty = wishlists.length === 0;

  return (
    <div className="min-h-screen bg-stone-50 pb-24">
      {/* Topbar */}
      <div className="sticky top-0 z-10 flex items-center gap-3 bg-stone-50 px-4 py-3 border-b border-stone-200">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-stone-200 transition-colors">
          <ArrowLeft size={20} className="text-stone-900" />
        </button>
        <h1 className="text-lg font-semibold text-stone-900">{t('wishlists.title', 'Guardados y listas')}</h1>
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center px-6 pt-32 text-center">
          <Heart size={48} className="text-stone-300 mb-4" />
          <p className="text-stone-500 text-sm">{t('wishlists.empty', 'Guarda productos que te gusten')}</p>
          <button onClick={() => setShowCreate(true)} className="mt-6 px-5 py-2.5 bg-stone-950 text-stone-50 rounded-full text-sm font-medium hover:bg-stone-800 transition-colors">
            {t('wishlists.createFirst', 'Crear lista')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 p-4">
          {wishlists.map((wl) => (
            <motion.button key={wl.wishlist_id} whileTap={{ scale: 0.97 }} onClick={() => navigate(`/wishlists/${wl.wishlist_id}`)}
              className="relative flex flex-col rounded-2xl border border-stone-200 bg-white overflow-hidden text-left hover:border-stone-300 transition-colors">
              {/* Thumbnail grid */}
              <div className="grid grid-cols-2 aspect-square bg-stone-100">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="overflow-hidden">
                    {wl.cover_thumbnails?.[i]
                      ? <img src={wl.cover_thumbnails[i]} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-stone-100" />}
                  </div>
                ))}
              </div>
              <div className="px-3 py-2.5">
                <div className="flex items-center gap-1.5">
                  {wl.is_default && <Heart size={14} className="text-stone-900 fill-stone-900 shrink-0" />}
                  <span className="text-sm font-medium text-stone-900 truncate">{wl.title}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-stone-500">{wl.item_count} {wl.item_count === 1 ? 'producto' : 'productos'}</span>
                  {wl.is_public && <Globe size={12} className="text-stone-400" />}
                  {!wl.is_public && <Lock size={12} className="text-stone-400" />}
                </div>
              </div>
            </motion.button>
          ))}

          {/* Create card */}
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowCreate(true)}
            className="flex flex-col items-center justify-center aspect-square rounded-2xl border-2 border-dashed border-stone-300 hover:border-stone-400 transition-colors">
            <Plus size={28} className="text-stone-400 mb-1" />
            <span className="text-xs text-stone-500 font-medium">{t('wishlists.new', 'Nueva lista')}</span>
          </motion.button>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6" onClick={() => setShowCreate(false)}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-xl">
            <h2 className="text-base font-semibold text-stone-900 mb-3">{t('wishlists.createTitle', 'Crear nueva lista')}</h2>
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} maxLength={60} placeholder={t('wishlists.namePlaceholder', 'Nombre de la lista')}
              className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400" />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-stone-600 hover:text-stone-900 transition-colors">{t('common.cancel', 'Cancelar')}</button>
              <button onClick={handleCreate} disabled={creating || !newTitle.trim()}
                className="px-5 py-2 bg-stone-950 text-stone-50 rounded-full text-sm font-medium hover:bg-stone-800 disabled:opacity-40 transition-colors">
                {creating ? '...' : t('common.create', 'Crear')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
