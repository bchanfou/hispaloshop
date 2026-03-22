// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Trash2, ShoppingBag, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import apiClient from '../../services/api/client';
import { useCart } from '../../context/CartContext';
import { toast } from 'sonner';
import { sanitizeImageUrl } from '../../utils/helpers';

export default function WishlistPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [batchAdding, setBatchAdding] = useState(false);
  const [addingItemId, setAddingItemId] = useState(null);
  const { addToCart } = useCart();

  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    apiClient.get('/wishlist')
      .then(data => setItems(data || []))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  const remove = async (productId) => {
    try {
      await apiClient.delete(`/wishlist/${productId}`);
      setItems(prev => prev.filter(i => i.product_id !== productId));
      toast.success(t('wishlist.removed', 'Eliminado'));
    } catch { toast.error('Error'); }
  };

  const handleAddAllToCart = async () => {
    setBatchAdding(true);
    try {
      for (const item of items) {
        await addToCart(item.product_id, 1);
      }
      toast.success(`${items.length} productos añadidos al carrito`);
    } catch { toast.error('Error al añadir productos'); }
    finally { setBatchAdding(false); }
  };

  const handleMoveToCart = async (item) => {
    setAddingItemId(item.product_id);
    try {
      await addToCart(item.product_id, 1);
      await apiClient.delete(`/wishlist/${item.product_id}`);
      setItems(prev => prev.filter(i => i.product_id !== item.product_id));
      toast.success(t('wishlist.movedToCart', 'Añadido al carrito'));
    } catch { toast.error('Error'); }
    finally { setAddingItemId(null); }
  };

  function getImgUrl(url) {
    return sanitizeImageUrl(url);
  }

  if (loading) return (
    <div className="max-w-[975px] mx-auto">
      <div className="h-8 w-48 bg-stone-100 rounded-2xl animate-pulse mb-4" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[1,2,3,4].map(i => (
          <div key={i} className="flex items-center gap-3 bg-white border border-stone-200 rounded-2xl p-3 animate-pulse">
            <div className="w-16 h-16 rounded-2xl bg-stone-100 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-stone-100 rounded" />
              <div className="h-3 w-20 bg-stone-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  if (loadError) return <div className="max-w-[975px] mx-auto py-12 text-center text-stone-400">{t('errors.loadFailed', 'No se pudo cargar. Intenta de nuevo.')}</div>;

  if (items.length === 0) {
    return (
      <div className="max-w-[975px] mx-auto py-16 text-center" data-testid="wishlist-empty">
        <Heart className="w-12 h-12 text-stone-300 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-stone-700 mb-1">{t('wishlist.emptyTitle', 'Tu lista de deseos está vacía')}</h3>
        <p className="text-sm text-stone-500 mb-4">{t('wishlist.emptyDesc', 'Guarda productos para recibir alertas de precios')}</p>
        <Link to="/products">
          <button className="px-4 py-2 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white rounded-2xl transition-colors flex items-center gap-2 mx-auto">
            <ShoppingBag className="w-4 h-4" />
            {t('wishlist.explore', 'Explorar productos')}
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[975px] mx-auto" data-testid="wishlist-page">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-3xl font-semibold text-stone-950 flex items-center gap-2">
          <Heart className="w-5 h-5 text-stone-500" />
          {t('wishlist.title', 'Lista de deseos')}
          <span className="text-sm text-stone-400 font-normal">({items.length})</span>
        </h2>
      </div>

      {/* Batch add to cart */}
      <button
        onClick={handleAddAllToCart}
        disabled={batchAdding}
        className="w-full bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white rounded-full px-6 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 mb-4 transition-colors"
      >
        {batchAdding ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <ShoppingBag className="w-4 h-4" />
        )}
        {batchAdding ? 'Añadiendo...' : t('wishlist.addAllToCart', 'Añadir todo al carrito')}
      </button>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map(item => {
          const img = getImgUrl(item.image || item.product_image);
          const productPath = `/products/${item.product_id}`;
          return (
            <div key={item.product_id} className="flex items-center gap-3 bg-white border border-stone-200 rounded-2xl p-3 hover:shadow-sm transition-shadow" data-testid={`wishlist-item-${item.product_id}`}>
              <Link to={productPath} className="shrink-0 w-16 h-16 rounded-2xl overflow-hidden bg-stone-100">
                {img ? <img loading="lazy" src={img} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} /> : <ShoppingBag className="w-6 h-6 text-stone-300 m-auto mt-5" />}
              </Link>
              <div className="flex-1 min-w-0">
                <Link to={productPath} className="text-sm font-medium text-stone-900 hover:underline line-clamp-1">{item.name}</Link>
                {item.saved_price && item.saved_price !== item.price ? (
                  <div className="flex items-center gap-2 text-xs mt-0.5">
                    <span className="line-through text-stone-400">{Number(item.saved_price).toFixed(2)} EUR</span>
                    <span className={item.price < item.saved_price ? 'font-semibold text-stone-950' : 'text-stone-500'}>
                      {Number(item.price).toFixed(2)} EUR
                    </span>
                    {item.price < item.saved_price && (
                      <span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full text-[10px] font-semibold">{'\u2193'} Rebajado</span>
                    )}
                    {item.price > item.saved_price && (
                      <span className="text-stone-400 text-[10px]">{'\u2191'} Precio subió</span>
                    )}
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-stone-700 mt-0.5">{item.price ? `${Number(item.price).toFixed(2)} EUR` : ''}</p>
                )}
                <p className="text-[10px] text-stone-400">{item.added_at ? new Date(item.added_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : ''}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleMoveToCart(item)}
                  disabled={addingItemId === item.product_id}
                  className="bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white rounded-full px-3 py-1.5 text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  {addingItemId === item.product_id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShoppingBag className="w-4 h-4" />
                  )}
                  {t('wishlist.addItem', 'Añadir')}
                </button>
                <button onClick={() => remove(item.product_id)} className="p-2 text-stone-400 hover:text-stone-950 hover:bg-stone-100 rounded-2xl transition-colors" data-testid={`remove-wishlist-${item.product_id}`}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
