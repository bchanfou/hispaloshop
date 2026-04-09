// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '../services/api/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import i18n from '../locales/i18n';
import { trackEvent } from '../utils/analytics';
import { ArrowLeft, ShoppingCart, Trash2, Check, Share2, Link, MoreHorizontal, Globe, Lock, X } from 'lucide-react';

interface WishlistItem {
  item_id: string;
  product_id: string;
  product_name: string;
  product_image: string;
  price: number;
  seller_name: string;
  note?: string;
  marked_as_purchased: boolean;
  in_stock: boolean;
}

interface WishlistDetail {
  wishlist_id: string;
  title: string;
  description?: string;
  is_public: boolean;
  is_owner: boolean;
  items: WishlistItem[];
}

export default function WishlistDetailPage() {
  const { wishlistId } = useParams<{ wishlistId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [wishlist, setWishlist] = useState<WishlistDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editing, setEditing] = useState(false);
  const [buyingAll, setBuyingAll] = useState(false);

  const fetchDetail = useCallback(async () => {
    try {
      const { data } = await apiClient.get(`/wishlists/${wishlistId}`);
      setWishlist(data);
      setEditTitle(data.title);
    } catch {
      toast.error(t('wishlists.loadError', 'No se pudo cargar la lista'));
    } finally {
      setLoading(false);
    }
  }, [wishlistId, t]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  async function handleRemoveItem(itemId: string) {
    try {
      await apiClient.delete(`/wishlists/${wishlistId}/items/${itemId}`);
      setWishlist((prev) => prev ? { ...prev, items: prev.items.filter((i) => i.product_id !== itemId) } : prev);
    } catch {
      toast.error(t('wishlists.removeError', 'No se pudo eliminar'));
    }
  }

  async function handleTogglePurchased(item: WishlistItem) {
    try {
      await apiClient.put(`/wishlists/${wishlistId}/items/${item.product_id}/purchased`, {});
      setWishlist((prev) => prev ? { ...prev, items: prev.items.map((i) => i.item_id === item.item_id ? { ...i, marked_as_purchased: !i.marked_as_purchased } : i) } : prev);
    } catch {
      toast.error(t('wishlists.updateError', 'No se pudo actualizar'));
    }
  }

  async function handleAddToCart(item: WishlistItem) {
    try {
      await apiClient.post('/cart/items', { product_id: item.product_id, quantity: 1 });
      toast.success(t('cart.added', 'Producto añadido'));
      trackEvent('wishlist_add_to_cart', { product_id: item.product_id });
    } catch {
      toast.error(t('cart.addError', 'Error al añadir al carrito'));
    }
  }

  async function handleBuyAll() {
    setBuyingAll(true);
    try {
      await apiClient.post(`/wishlists/${wishlistId}/buy-all`);
      toast.success(t('wishlists.buyAllSuccess', 'Productos añadidos al carrito'));
      trackEvent('wishlist_buy_all', { wishlist_id: wishlistId });
    } catch {
      toast.error(t('wishlists.buyAllError', 'No se pudieron añadir todos'));
    } finally {
      setBuyingAll(false);
    }
  }

  async function handleEditTitle() {
    if (!editTitle.trim()) return;
    try {
      await apiClient.put(`/wishlists/${wishlistId}`, { title: editTitle.trim() });
      setWishlist((prev) => prev ? { ...prev, title: editTitle.trim() } : prev);
      setEditing(false);
      setMenuOpen(false);
    } catch {
      toast.error(t('wishlists.editError', 'No se pudo renombrar'));
    }
  }

  async function handleTogglePublic() {
    if (!wishlist) return;
    try {
      await apiClient.put(`/wishlists/${wishlistId}`, { is_public: !wishlist.is_public });
      setWishlist((prev) => prev ? { ...prev, is_public: !prev.is_public } : prev);
      setMenuOpen(false);
    } catch {
      toast.error(t('wishlists.updateError', 'No se pudo actualizar'));
    }
  }

  async function handleDelete() {
    try {
      await apiClient.delete(`/wishlists/${wishlistId}`);
      toast.success(t('wishlists.deleted', 'Lista eliminada'));
      navigate('/wishlists', { replace: true });
    } catch {
      toast.error(t('wishlists.deleteError', 'No se pudo eliminar'));
    }
  }

  function handleShare() {
    const url = `${window.location.origin}/wishlists/${wishlistId}`;
    if (navigator.share) {
      navigator.share({ title: wishlist?.title, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast.success(t('wishlists.linkCopied', 'Enlace copiado'));
    }
    trackEvent('wishlist_shared', { wishlist_id: wishlistId });
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/wishlists/${wishlistId}`);
    toast.success(t('wishlists.linkCopied', 'Enlace copiado'));
  }

  /* ── Skeleton ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50">
        <div className="sticky top-0 z-10 flex items-center gap-3 bg-stone-50 px-4 py-3 border-b border-stone-200">
          <div className="w-8 h-8 rounded-full bg-stone-200 animate-pulse" />
          <div className="h-5 w-32 rounded bg-stone-200 animate-pulse" />
        </div>
        <div className="p-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-stone-200 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!wishlist) return null;

  const available = wishlist.items.filter((i) => !i.marked_as_purchased && i.in_stock);
  const estimatedTotal = available.reduce((sum, i) => sum + (i.price || 0), 0);
  const fmtPrice = (v: number) => (v / 100).toLocaleString(i18n.language, { style: 'currency', currency: 'EUR' });

  return (
    <div className="min-h-screen bg-stone-50 pb-28">
      {/* Topbar */}
      <div className="sticky top-0 z-10 flex items-center justify-between bg-stone-50 px-4 py-3 border-b border-stone-200">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/wishlists')} className="p-1.5 rounded-full hover:bg-stone-200 transition-colors">
            <ArrowLeft size={20} className="text-stone-900" />
          </button>
          <h1 className="text-lg font-semibold text-stone-900 truncate max-w-[200px]">{wishlist.title}</h1>
        </div>
        {wishlist.is_owner && (
          <div className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)} className="p-1.5 rounded-full hover:bg-stone-200 transition-colors">
              <MoreHorizontal size={20} className="text-stone-700" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-10 w-48 bg-white rounded-xl border border-stone-200 shadow-lg py-1 z-20">
                <button onClick={() => { setEditing(true); setMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-stone-900 hover:bg-stone-50">{t('wishlists.editTitle', 'Editar nombre')}</button>
                <button onClick={handleTogglePublic} className="w-full text-left px-4 py-2.5 text-sm text-stone-900 hover:bg-stone-50 flex items-center gap-2">
                  {wishlist.is_public ? <><Lock size={14} /> {t('wishlists.makePrivate', 'Hacer privada')}</> : <><Globe size={14} /> {t('wishlists.makePublic', 'Hacer publica')}</>}
                </button>
                <button onClick={handleDelete} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-stone-50">{t('common.delete', 'Eliminar')}</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats + description */}
      <div className="px-4 pt-3 pb-2 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-stone-500">{wishlist.items.length} {wishlist.items.length === 1 ? 'producto' : 'productos'}</span>
          {wishlist.is_public ? <span className="inline-flex items-center gap-1 text-xs text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full"><Globe size={10} /> {t('wishlists.public', 'Publica')}</span>
            : <span className="inline-flex items-center gap-1 text-xs text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full"><Lock size={10} /> {t('wishlists.private', 'Privada')}</span>}
        </div>
        {wishlist.description && <p className="text-sm text-stone-600">{wishlist.description}</p>}
        {/* Share bar */}
        <div className="flex gap-2 pt-1">
          <button onClick={handleCopyLink} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 rounded-full hover:bg-stone-200 transition-colors"><Link size={13} /> {t('wishlists.copyLink', 'Copiar enlace')}</button>
          <button onClick={handleShare} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 rounded-full hover:bg-stone-200 transition-colors"><Share2 size={13} /> {t('wishlists.share', 'Compartir')}</button>
        </div>
      </div>

      {/* Edit title inline modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6" onClick={() => setEditing(false)}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-xl">
            <h2 className="text-base font-semibold text-stone-900 mb-3">{t('wishlists.editTitle', 'Editar nombre')}</h2>
            <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} maxLength={60} className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400" />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm text-stone-600">{t('common.cancel', 'Cancelar')}</button>
              <button onClick={handleEditTitle} disabled={!editTitle.trim()} className="px-5 py-2 bg-stone-950 text-stone-50 rounded-full text-sm font-medium hover:bg-stone-800 disabled:opacity-40 transition-colors">{t('common.save', 'Guardar')}</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Items */}
      {wishlist.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center pt-24 text-center px-6">
          <ShoppingCart size={40} className="text-stone-300 mb-3" />
          <p className="text-sm text-stone-500">{t('wishlists.emptyList', 'Esta lista esta vacia')}</p>
        </div>
      ) : (
        <div className="px-4 space-y-2 mt-2">
          <AnimatePresence>
            {wishlist.items.map((item) => (
              <motion.div key={item.item_id} layout exit={{ opacity: 0, x: -40 }}
                className="flex items-start gap-3 bg-white border border-stone-200 rounded-2xl p-3">
                <img src={item.product_image} alt={item.product_name} className="w-12 h-12 rounded-xl object-cover bg-stone-100 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-900 truncate">{item.product_name}</p>
                  <p className="text-xs text-stone-500">{item.seller_name}</p>
                  <p className="text-sm font-semibold text-stone-900 mt-0.5">{fmtPrice(item.price)}</p>
                  {item.note && <p className="text-xs italic text-stone-400 mt-1">{item.note}</p>}
                  {item.marked_as_purchased && <span className="inline-flex items-center gap-1 text-xs text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full mt-1"><Check size={10} /> {t('wishlists.purchased', 'Comprado')}</span>}
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button onClick={() => handleAddToCart(item)} className="p-1.5 rounded-full bg-stone-950 text-stone-50 hover:bg-stone-800 transition-colors" title={t('cart.add', 'Añadir')}>
                    <ShoppingCart size={14} />
                  </button>
                  <button onClick={() => handleTogglePurchased(item)} className={`p-1.5 rounded-full border transition-colors ${item.marked_as_purchased ? 'bg-stone-200 border-stone-300' : 'border-stone-200 hover:bg-stone-100'}`} title={t('wishlists.markPurchased', 'Marcar comprado')}>
                    <Check size={14} className="text-stone-700" />
                  </button>
                  {wishlist.is_owner && (
                    <button onClick={() => handleRemoveItem(item.product_id)} className="p-1.5 rounded-full border border-stone-200 hover:bg-stone-100 transition-colors" title={t('common.remove', 'Eliminar')}>
                      <X size={14} className="text-stone-500" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Buy all CTA */}
      {available.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-stone-200 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <button onClick={handleBuyAll} disabled={buyingAll}
            className="w-full flex items-center justify-center gap-2 bg-stone-950 text-stone-50 rounded-full py-3 text-sm font-semibold hover:bg-stone-800 disabled:opacity-50 transition-colors">
            <ShoppingCart size={16} />
            {buyingAll ? '...' : `${t('wishlists.buyAll', 'Comprar todo disponible')} (${available.length}) - ${fmtPrice(estimatedTotal)}`}
          </button>
        </div>
      )}
    </div>
  );
}
