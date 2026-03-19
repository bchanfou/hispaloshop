import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Pause, Play, Edit3, Package } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';

/* ── Shared Styles ──────────────────────────────────────────── */
const topBar = {
  position: 'sticky',
  top: 0,
  zIndex: 40,
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '14px 16px',
  background: 'var(--color-white)',
  borderBottom: '1px solid var(--color-border)',
  fontFamily: 'var(--font-sans)',
};

const backBtn = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 36,
  height: 36,
  borderRadius: 'var(--radius-full)',
  border: '1px solid var(--color-border)',
  background: 'var(--color-white)',
  cursor: 'pointer',
  flexShrink: 0,
};

const pageTitle = {
  fontSize: 18,
  fontWeight: 700,
  color: 'var(--color-black)',
  fontFamily: 'var(--font-sans)',
};

const descCard = {
  margin: '16px 16px 0',
  padding: 16,
  borderRadius: 'var(--radius-xl)',
  background: 'var(--color-surface)',
  display: 'flex',
  gap: 12,
  alignItems: 'flex-start',
  fontFamily: 'var(--font-sans)',
};

const descIcon = {
  fontSize: 28,
  lineHeight: 1,
  flexShrink: 0,
};

const descTitle = {
  fontSize: 15,
  fontWeight: 600,
  color: 'var(--color-black)',
  marginBottom: 2,
};

const descSub = {
  fontSize: 13,
  color: 'var(--color-stone)',
  lineHeight: 1.4,
};

const productCard = {
  margin: '12px 16px 0',
  padding: 14,
  borderRadius: 'var(--radius-xl)',
  border: '1px solid var(--color-border)',
  background: 'var(--color-white)',
  fontFamily: 'var(--font-sans)',
};

const cardTop = {
  display: 'flex',
  gap: 12,
};

const imgBox = {
  width: 72,
  height: 72,
  borderRadius: 'var(--radius-md)',
  objectFit: 'cover',
  background: 'var(--color-surface)',
  flexShrink: 0,
};

const productName = {
  fontSize: 15,
  fontWeight: 600,
  color: 'var(--color-black)',
  marginBottom: 4,
};

const categoryBadge = {
  display: 'inline-block',
  fontSize: 11,
  fontWeight: 500,
  color: 'var(--color-stone)',
  background: 'var(--color-surface)',
  borderRadius: 'var(--radius-full)',
  padding: '2px 8px',
};

const metaRow = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  marginTop: 10,
  flexWrap: 'wrap',
};

const metaText = {
  fontSize: 13,
  color: 'var(--color-stone)',
};

const metaPrice = {
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--color-black)',
};

const statusBadge = (active) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  fontSize: 12,
  fontWeight: 600,
  padding: '3px 10px',
  borderRadius: 'var(--radius-full)',
  background: active ? 'rgba(12,10,9,0.08)' : 'var(--color-surface)',
  color: active ? 'var(--color-black)' : 'var(--color-stone)',
});

const btnRow = {
  display: 'flex',
  gap: 8,
  marginTop: 12,
};

const btnBase = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '9px 0',
  borderRadius: 'var(--radius-md)',
  fontSize: 13,
  fontWeight: 600,
  fontFamily: 'var(--font-sans)',
  cursor: 'pointer',
  border: '1px solid var(--color-border)',
  background: 'var(--color-white)',
  color: 'var(--color-black)',
  transition: 'var(--transition-fast)',
};

const btnPrimary = {
  ...btnBase,
  background: 'var(--color-black)',
  color: 'var(--color-white)',
  border: 'none',
};

const spinner = {
  width: 28,
  height: 28,
  border: '3px solid var(--color-border)',
  borderTopColor: 'var(--color-black)',
  borderRadius: '50%',
  animation: 'spin 0.7s linear infinite',
};

const emptyWrap = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '64px 24px',
  textAlign: 'center',
  fontFamily: 'var(--font-sans)',
};

const emptyIcon = {
  width: 56,
  height: 56,
  borderRadius: 'var(--radius-full)',
  background: 'var(--color-surface)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 16,
  color: 'var(--color-stone)',
};

const emptyTitle = {
  fontSize: 16,
  fontWeight: 600,
  color: 'var(--color-black)',
  marginBottom: 6,
};

const emptySubtitle = {
  fontSize: 13,
  color: 'var(--color-stone)',
  marginBottom: 20,
};

const fab = {
  position: 'fixed',
  bottom: 24,
  left: 16,
  right: 16,
  zIndex: 30,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: '14px 0',
  borderRadius: 'var(--radius-full)',
  background: 'var(--color-black)',
  color: 'var(--color-white)',
  fontSize: 15,
  fontWeight: 600,
  fontFamily: 'var(--font-sans)',
  cursor: 'pointer',
  border: 'none',
  boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
};

/* ── Component ──────────────────────────────────────────────── */
export default function B2BCatalogPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState(null);

  /* Role guard */
  useEffect(() => {
    if (user && user.role !== 'producer' && user.role !== 'importer') {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

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
  if (!user || (user.role !== 'producer' && user.role !== 'importer')) return null;

  /* ── Render ──────────────────────────────────────────────── */
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-cream)', paddingBottom: 88 }}>
      {/* Keyframes for spinner */}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Top bar */}
      <div style={topBar}>
        <button style={backBtn} onClick={() => navigate(-1)} aria-label="Volver">
          <ChevronLeft size={20} />
        </button>
        <span style={pageTitle}>Catálogo B2B</span>
      </div>

      {/* Description card */}
      <div style={descCard}>
        <span style={descIcon}>📋</span>
        <div>
          <div style={descTitle}>Catálogo mayorista</div>
          <div style={descSub}>
            Gestiona qué productos ofreces al por mayor y a qué condiciones.
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <div style={spinner} />
        </div>
      )}

      {/* Empty state */}
      {!loading && products.length === 0 && (
        <div style={emptyWrap}>
          <div style={emptyIcon}>
            <Package size={28} />
          </div>
          <div style={emptyTitle}>No tienes productos en el catálogo B2B</div>
          <div style={emptySubtitle}>
            Empieza añadiendo tu primer producto mayorista.
          </div>
          <button
            style={{ ...btnPrimary, flex: 'none', padding: '10px 24px', borderRadius: 'var(--radius-full)' }}
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
            <div key={item.id} style={productCard}>
              <div style={cardTop}>
                {/* Image */}
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.product_name}
                    style={imgBox}
                  />
                ) : (
                  <div
                    style={{
                      ...imgBox,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-stone)',
                    }}
                  >
                    <Package size={28} />
                  </div>
                )}

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={productName}>{item.product_name}</div>
                  {item.category && <span style={categoryBadge}>{item.category}</span>}

                  <div style={metaRow}>
                    <span style={metaPrice}>
                      {(Number(item.wholesale_price) || 0).toFixed(2)}€ / ud
                    </span>
                    <span style={metaText}>
                      Mínimo {item.moq ?? item.min_order_quantity ?? 1} unidades
                    </span>
                    <span style={statusBadge(isActive)}>
                      {isActive ? 'Activo' : 'Pausado'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div style={btnRow}>
                <button
                  style={btnPrimary}
                  onClick={() => navigate(`/b2b/catalog/${item.id}/edit`)}
                >
                  <Edit3 size={14} />
                  Editar condiciones B2B
                </button>
                <button
                  style={btnBase}
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
        <button style={fab} onClick={() => navigate('/b2b/catalog/add')}>
          <Plus size={18} />
          Añadir producto al catálogo B2B
        </button>
      )}
    </div>
  );
}
