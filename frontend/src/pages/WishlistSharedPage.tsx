// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, ShoppingCart, Check, Share2, ArrowLeft, User, Loader2, Lock, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { toast } from 'sonner';
import apiClient from '../services/api/client';
import SEO from '../components/SEO';
import ProductImage from '../components/ui/ProductImage';

export default function WishlistSharedPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();

  const [list, setList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [purchasing, setPurchasing] = useState<Record<string, boolean>>({});
  const [buyingAll, setBuyingAll] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    apiClient.get(`/wishlists/shared/${slug}`)
      .then((data) => setList(data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const requireAuth = (action: () => void) => {
    if (!isAuthenticated) { toast.error('Inicia sesion para continuar'); return; }
    action();
  };

  const addItem = async (item) => {
    const pid = item.product_id ?? item.productId;
    if (purchasing[pid]) return;
    requireAuth(async () => {
      setPurchasing((p) => ({ ...p, [pid]: true }));
      try {
        await addToCart(pid, 1);
        toast.success('Agregado al carrito');
      } catch { toast.error('Error al agregar'); }
      finally { setPurchasing((p) => ({ ...p, [pid]: false })); }
    });
  };

  const buyAll = () => {
    requireAuth(async () => {
      setBuyingAll(true);
      const available = (list.items ?? []).filter((i) => !i.purchased);
      let added = 0;
      for (const item of available) {
        try { await addToCart(item.product_id ?? item.productId, 1); added++; } catch { /* skip */ }
      }
      setBuyingAll(false);
      if (added > 0) toast.success(`${added} producto${added > 1 ? 's' : ''} agregado${added > 1 ? 's' : ''} al carrito`);
      else toast.error('No se pudo agregar ningun producto');
    });
  };

  const markPurchased = (item) => {
    const pid = item.product_id ?? item.productId;
    requireAuth(async () => {
      try {
        await apiClient.post(`/wishlists/shared/${slug}/items/${pid}/purchased`);
        setList((prev) => ({
          ...prev,
          items: (prev.items ?? []).map((i) =>
            (i.product_id ?? i.productId) === pid ? { ...i, purchased: true } : i,
          ),
        }));
        toast.success('Marcado como comprado');
      } catch { toast.error('Error al marcar'); }
    });
  };

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: list?.title ?? 'Wishlist', url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Enlace copiado');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 size={28} className="animate-spin text-stone-400" />
      </div>
    );
  }

  if (notFound || !list) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <Lock size={40} className="text-stone-300 mb-4" />
        <h1 className="text-xl font-semibold text-stone-950 mb-2">Esta lista no existe o es privada</h1>
        <p className="text-sm text-stone-500 mb-6">Es posible que el enlace haya caducado o la lista no sea publica.</p>
        <Link to="/" className="text-sm font-medium text-stone-950 underline">Volver al inicio</Link>
      </div>
    );
  }

  const items = list.items ?? [];
  const available = items.filter((i) => !i.purchased);
  const shareUrl = window.location.href;

  return (
    <>
      <SEO title={`${list.title ?? 'Wishlist'} — Wishlist | HispaloShop`} />
      <div className="min-h-screen bg-stone-50 pb-24">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-white border-b border-stone-100 px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-stone-100 transition-colors">
            <ArrowLeft size={20} className="text-stone-700" />
          </button>
          <span className="flex-1 text-sm font-semibold text-stone-950 truncate">{list.title}</span>
          <button onClick={share} className="p-1.5 rounded-full hover:bg-stone-100 transition-colors">
            <Share2 size={18} className="text-stone-700" />
          </button>
        </div>

        <div className="max-w-[800px] mx-auto px-4 pt-6">
          <div className="flex items-center gap-3 mb-2">
            {list.owner?.avatar ? (
              <img src={list.owner.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center"><User size={18} className="text-stone-500" /></div>
            )}
            <div>
              <p className="text-sm font-semibold text-stone-950">{list.owner?.name ?? 'Usuario'}</p>
              <p className="text-xs text-stone-400">{items.length} producto{items.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-stone-950 flex items-center gap-2 mb-1">
            <Heart size={22} className="text-stone-950" /> {list.title}
          </h1>
          {list.description && <p className="text-sm text-stone-500 mb-4">{list.description}</p>}
          <div className="bg-white rounded-2xl p-4 mb-6 border border-stone-100 flex items-center gap-3">
            <ExternalLink size={16} className="text-stone-400 shrink-0" />
            <span className="text-xs text-stone-500 truncate flex-1">{shareUrl}</span>
            <button onClick={share} className="text-xs font-medium text-stone-950 shrink-0">Copiar</button>
          </div>

          {/* Buy all CTA */}
          {available.length > 1 && (
            <button onClick={buyAll} disabled={buyingAll} className="w-full mb-6 py-3 bg-stone-950 text-white text-sm font-semibold rounded-full hover:bg-stone-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {buyingAll ? <Loader2 size={16} className="animate-spin" /> : <ShoppingCart size={16} />}
              Comprar todo disponible ({available.length})
            </button>)}

          {/* Product grid */}
          {items.length === 0 ? (
            <p className="text-center text-sm text-stone-400 py-10">Esta lista esta vacia</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {items.map((item, idx) => {
                const pid = item.product_id ?? item.productId;
                return (
                  <motion.div key={pid ?? idx} initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                    className="bg-white rounded-2xl border border-stone-100 overflow-hidden flex flex-col"
                  >
                    <Link to={`/product/${pid}`} className="block aspect-square bg-stone-100 relative">
                      {item.image ? (
                        <ProductImage src={item.image} alt={item.name ?? ''} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Heart size={24} className="text-stone-200" />
                        </div>
                      )}
                      {item.purchased && (
                        <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                          <span className="bg-stone-950 text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                            <Check size={12} /> Comprado
                          </span>
                        </div>
                      )}
                    </Link>
                    <div className="p-3 flex flex-col flex-1">
                      <p className="text-sm font-medium text-stone-950 line-clamp-2 mb-1">{item.name ?? 'Producto'}</p>
                      {item.price != null && (
                        <p className="text-sm font-bold text-stone-950 mb-2">
                          {typeof item.price === 'number' ? `${item.price.toFixed(2)} EUR` : item.price}
                        </p>
                      )}
                      <div className="mt-auto flex gap-1.5">
                        {!item.purchased && (
                          <>
                            <button onClick={() => addItem(item)} disabled={purchasing[pid]}
                              className="flex-1 py-2 text-xs font-semibold bg-stone-950 text-white rounded-xl hover:bg-stone-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-1">
                              {purchasing[pid] ? <Loader2 size={12} className="animate-spin" /> : <ShoppingCart size={12} />}
                              Carrito
                            </button>
                            <button onClick={() => markPurchased(item)}
                              className="py-2 px-2.5 text-xs border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors" title="Marcar como comprado">
                              <Check size={14} className="text-stone-600" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
