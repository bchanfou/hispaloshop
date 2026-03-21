// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Pause, Play, Edit3, Package, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';

/* ── Component ──────────────────────────────────────────────── */
export default function B2BCatalogPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState(null);

  /* Fetch catalog */
  const fetchCatalog = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/b2b/my-catalog');
      setProducts(res.data?.products ?? res.data ?? []);
    } catch (err) {
      toast.error('Error al cargar el catálogo B2B');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && (user.role === 'producer' || user.role === 'importer')) {
      fetchCatalog();
    }
  }, [user, fetchCatalog]);

  /* Toggle pause / activate */
  const handleToggle = useCallback(async (item) => {
    const nextStatus = item.status === 'active' ? 'paused' : 'active';
    try {
      setTogglingId(item.id);
      await apiClient.patch(`/b2b/my-catalog/${item.id}`, { status: nextStatus });
      setProducts((prev) =>
        prev.map((p) => (p.id === item.id ? { ...p, status: nextStatus } : p)),
      );
      toast.success(nextStatus === 'active' ? 'Producto activado' : 'Producto pausado');
    } catch {
      toast.error('No se pudo cambiar el estado');
    } finally {
      setTogglingId(null);
    }
  }, []);

  /* Guard render */
  if (!user || (user.role !== 'producer' && user.role !== 'importer')) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-3 bg-white font-sans px-6 text-center">
        <ShieldAlert size={36} className="text-stone-400" />
        <p className="text-stone-950 text-[15px] font-semibold">No tienes acceso a esta sección</p>
        <p className="text-stone-500 text-[13px]">Necesitas un perfil de productor o importador para acceder al catálogo B2B.</p>
        <button
          onClick={() => navigate('/')}
          className="bg-stone-950 text-white rounded-full px-6 py-2.5 text-sm font-semibold border-none cursor-pointer mt-2"
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  /* ── Render ──────────────────────────────────────────────── */
  return (
    <div className="min-h-dvh bg-stone-50 pb-[88px] max-w-[1100px] mx-auto">
      {/* Keyframes for spinner */}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Top bar */}
      <div className="sticky top-0 z-40 flex items-center gap-3 px-4 py-3.5 bg-white border-b border-stone-200">
        <button
          className="flex items-center justify-center w-9 h-9 rounded-full border border-stone-200 bg-white cursor-pointer shrink-0"
          onClick={() => navigate(-1)}
          aria-label="Volver"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="text-lg font-bold text-stone-950">Catálogo B2B</span>
      </div>

      {/* Description card */}
      <div className="mx-4 mt-4 p-4 rounded-2xl bg-stone-100 flex gap-3 items-start">
        <span className="text-[28px] leading-none shrink-0">📋</span>
        <div>
          <div className="text-[15px] font-semibold text-stone-950 mb-0.5">Catálogo mayorista</div>
          <div className="text-[13px] text-stone-500 leading-snug">
            Gestiona qué productos ofreces al por mayor y a qué condiciones.
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center p-12">
          <div className="w-7 h-7 border-[3px] border-stone-200 border-t-stone-950 rounded-full animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && products.length === 0 && (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center mb-4 text-stone-500">
            <Package size={28} />
          </div>
          <div className="text-base font-semibold text-stone-950 mb-1.5">No tienes productos en el catálogo B2B</div>
          <div className="text-[13px] text-stone-500 mb-5">
            Empieza añadiendo tu primer producto mayorista.
          </div>
          <button
            className="inline-flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-full bg-stone-950 text-white text-[13px] font-semibold border-none cursor-pointer"
            onClick={() => navigate('/b2b/catalog/add')}
          >
            <Plus size={16} />
            Añadir primer producto
          </button>
        </div>
      )}

      {/* Product list */}
      {!loading &&
        products.map((item) => {
          const isActive = item.status === 'active';
          return (
            <div key={item.id} className="mx-4 mt-3 p-3.5 rounded-2xl border border-stone-200 bg-white">
              <div className="flex gap-3">
                {/* Image */}
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.product_name}
                    className="w-[72px] h-[72px] rounded-xl object-cover bg-stone-100 shrink-0"
                  />
                ) : (
                  <div className="w-[72px] h-[72px] rounded-xl bg-stone-100 shrink-0 flex items-center justify-center text-stone-500">
                    <Package size={28} />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-semibold text-stone-950 mb-1">{item.product_name}</div>
                  {item.category && (
                    <span className="inline-block text-[11px] font-medium text-stone-500 bg-stone-100 rounded-full px-2 py-0.5">
                      {item.category}
                    </span>
                  )}

                  <div className="flex items-center gap-4 mt-2.5 flex-wrap">
                    <span className="text-sm font-semibold text-stone-950">
                      {(Number(item.wholesale_price) || 0).toFixed(2)}€ / ud
                    </span>
                    <span className="text-[13px] text-stone-500">
                      Mínimo {item.moq ?? item.min_order_quantity ?? 1} unidades
                    </span>
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                      isActive ? 'bg-stone-950/[0.08] text-stone-950' : 'bg-stone-100 text-stone-500'
                    }`}>
                      {isActive ? 'Activo' : 'Pausado'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 mt-3">
                <button
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-stone-950 text-white text-[13px] font-semibold border-none cursor-pointer transition-colors"
                  onClick={() => navigate(`/b2b/catalog/${item.id}/edit`)}
                >
                  <Edit3 size={14} />
                  Editar condiciones B2B
                </button>
                <button
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-950 text-[13px] font-semibold cursor-pointer transition-colors"
                  disabled={togglingId === item.id}
                  onClick={() => handleToggle(item)}
                >
                  {isActive ? <Pause size={14} /> : <Play size={14} />}
                  {isActive ? 'Pausar' : 'Activar'}
                </button>
              </div>
            </div>
          );
        })}

      {/* Floating add button */}
      {!loading && (
        <button
          className="fixed bottom-6 left-4 right-4 z-30 flex items-center justify-center gap-2 py-3.5 rounded-full bg-stone-950 text-white text-[15px] font-semibold border-none cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.18)]"
          onClick={() => navigate('/b2b/catalog/add')}
        >
          <Plus size={18} />
          Añadir producto al catálogo B2B
        </button>
      )}
    </div>
  );
}
