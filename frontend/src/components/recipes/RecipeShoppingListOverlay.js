import React, { useEffect, useState } from 'react';
import FocusTrap from 'focus-trap-react';
import apiClient from '../../services/api/client';
import { Loader2, Minus, Plus, ShoppingCart, X } from 'lucide-react';
import { toast } from 'sonner';
import { resolveUserImage } from '../../features/user/queries';

export default function RecipeShoppingListOverlay({ recipeId, defaultServings = 1, onClose }) {
  const [preview, setPreview] = useState(null);
  const [servings, setServings] = useState(defaultServings || 1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [quantities, setQuantities] = useState({});

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiClient
      .get(`/recipes/${recipeId}/shopping-list-preview`, { params: { servings } })
      .then((data) => {
        if (!active) return;
        const items = data?.items || [];
        setPreview({ ...data, items });
        setQuantities(Object.fromEntries(items.map((item) => [item.product_id, item.quantity || 1])));
      })
      .catch(() => {
        if (active) {
          setPreview({ items: [], total: 0, servings });
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [recipeId, servings]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const items = (preview?.items || []).map((item) => ({
        ...item,
        quantity: quantities[item.product_id] || item.quantity || 1,
      }));
      const data = await apiClient.post(`/recipes/${recipeId}/shopping-list`, { items, servings });
      toast.success(`${data.added} ingredientes añadidos al carrito`);
      onClose?.();
    } catch (error) {
      toast.error(error.message || 'Inicia sesión para continuar');
    } finally {
      setSubmitting(false);
    }
  };

  const total = (preview?.items || []).reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (quantities[item.product_id] || item.quantity || 1),
    0,
  );

  return (
    <FocusTrap focusTrapOptions={{ escapeDeactivates: false, allowOutsideClick: true, returnFocusOnDeactivate: true }}>
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/70" onClick={onClose} aria-label="Cerrar lista de compra" />
      <div className="relative z-10 flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[32px] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-stone-400">Comprar ingredientes</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-stone-950">Lista de compra</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-stone-200 text-stone-500 transition-colors duration-150 hover:bg-stone-50 hover:text-stone-950"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5">
          <div className="mb-4 flex items-center justify-between rounded-2xl border border-stone-200 bg-stone-50 p-3">
            <span className="text-sm font-medium text-stone-700">Raciones</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setServings((value) => Math.max(1, value - 1))} aria-label="Menos raciones" className="flex h-11 w-11 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 cursor-pointer">
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center text-sm font-semibold text-stone-950">{servings}</span>
              <button type="button" onClick={() => setServings((value) => value + 1)} aria-label="Más raciones" className="flex h-11 w-11 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 cursor-pointer">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-14">
              <Loader2 className="h-5 w-5 animate-spin text-stone-500" />
            </div>
          ) : (
            <div className="space-y-3">
              {(preview?.items || []).map((item) => (
                <div key={item.product_id} className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-3">
                  <div className="h-14 w-14 overflow-hidden rounded-2xl bg-white">
                    {(item.image || item.product_image) ? <img src={resolveUserImage(item.image || item.product_image)} alt={item.name} loading="lazy" className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-stone-950">{item.name}</p>
                    <p className="mt-1 text-xs text-stone-500">{item.ingredient_name || 'Ingrediente vinculado'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQuantities((current) => ({ ...current, [item.product_id]: Math.max(1, (current[item.product_id] || item.quantity || 1) - 1) }))}
                      aria-label={`Menos ${item.name}`}
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 cursor-pointer"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm font-medium text-stone-950">{quantities[item.product_id] || item.quantity || 1}</span>
                    <button
                      type="button"
                      onClick={() => setQuantities((current) => ({ ...current, [item.product_id]: (current[item.product_id] || item.quantity || 1) + 1 }))}
                      aria-label={`Más ${item.name}`}
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-stone-200 px-5 py-4">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="text-stone-500">Total estimado</span>
            <span className="font-semibold text-stone-950">{total.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || loading || !(preview?.items || []).length}
            className="h-11 w-full rounded-full border-none bg-stone-950 text-sm font-semibold text-white cursor-pointer hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
            Añadir todo al carrito
          </button>
        </div>
      </div>
    </div>
    </FocusTrap>
  );
}
