import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Heart, Trash2, ShoppingBag } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { API } from '../../utils/api';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { sanitizeImageUrl } from '../../utils/helpers';

export default function WishlistPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/wishlist`, { withCredentials: true })
      .then(r => setItems(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const remove = async (productId) => {
    try {
      await axios.delete(`${API}/wishlist/${productId}`, { withCredentials: true });
      setItems(prev => prev.filter(i => i.product_id !== productId));
      toast.success(t('wishlist.removed', 'Eliminado'));
    } catch { toast.error('Error'); }
  };

  function getImgUrl(url) {
    return sanitizeImageUrl(url);
  }

  if (loading) return <div className="py-12 text-center text-stone-400">{t('common.loading')}</div>;

  if (items.length === 0) {
    return (
      <div className="py-16 text-center" data-testid="wishlist-empty">
        <Heart className="w-12 h-12 text-stone-300 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-stone-700 mb-1">{t('wishlist.emptyTitle', 'Tu lista de deseos está vacía')}</h3>
        <p className="text-sm text-stone-500 mb-4">{t('wishlist.emptyDesc', 'Guarda productos para recibir alertas de precios')}</p>
        <Link to="/products">
          <Button className="bg-stone-900 text-white rounded-full">
            <ShoppingBag className="w-4 h-4 mr-2" />
            {t('wishlist.explore', 'Explorar productos')}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div data-testid="wishlist-page">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-stone-900 flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-500" />
          {t('wishlist.title', 'Lista de deseos')}
          <span className="text-sm text-stone-400 font-normal">({items.length})</span>
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map(item => {
          const img = getImgUrl(item.image);
          const productPath = `/products/${item.product_id}`;
          return (
            <div key={item.product_id} className="flex items-center gap-3 bg-white border border-stone-200 rounded-xl p-3 hover:shadow-sm transition-shadow" data-testid={`wishlist-item-${item.product_id}`}>
              <Link to={productPath} className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-stone-100">
                {img ? <img src={img} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} /> : <ShoppingBag className="w-6 h-6 text-stone-300 m-auto mt-5" />}
              </Link>
              <div className="flex-1 min-w-0">
                <Link to={productPath} className="text-sm font-medium text-stone-900 hover:underline line-clamp-1">{item.name}</Link>
                <p className="text-sm font-semibold text-stone-700 mt-0.5">{item.price ? `${item.price.toFixed(2)} EUR` : ''}</p>
                <p className="text-[10px] text-stone-400">{item.added_at ? new Date(item.added_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : ''}</p>
              </div>
              <button onClick={() => remove(item.product_id)} className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" data-testid={`remove-wishlist-${item.product_id}`}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
