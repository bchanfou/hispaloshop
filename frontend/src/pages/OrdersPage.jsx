import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Truck, ChevronRight, ExternalLink, Loader2 } from 'lucide-react';
import apiClient from '../services/api/client';
import { useAuth } from '../context/AuthContext';

const TABS = [
  { id: 'active', label: 'En curso' },
  { id: 'completed', label: 'Completados' },
  { id: 'cancelled', label: 'Cancelados' },
];

const STATUS_BADGES = {
  pending: { label: 'Confirmado', bg: 'rgba(217,119,6,0.08)', color: '#d97706' },
  confirmed: { label: 'Confirmado', bg: 'rgba(217,119,6,0.08)', color: '#d97706' },
  preparing: { label: 'Preparando', bg: 'rgba(217,119,6,0.08)', color: '#d97706' },
  processing: { label: 'Procesando', bg: 'rgba(217,119,6,0.08)', color: '#d97706' },
  shipped: { label: 'En camino', bg: 'rgba(37,99,235,0.08)', color: '#2563eb' },
  in_transit: { label: 'En camino', bg: 'rgba(37,99,235,0.08)', color: '#2563eb' },
  delivered: { label: 'Entregado', bg: 'rgba(22,163,74,0.08)', color: '#16a34a' },
  cancelled: { label: 'Cancelado', bg: 'rgba(220,38,38,0.08)', color: '#dc2626' },
  refunded: { label: 'Reembolsado', bg: 'rgba(220,38,38,0.08)', color: '#dc2626' },
};

function StatusBadge({ status }) {
  const badge = STATUS_BADGES[status] || { label: status, bg: 'var(--color-surface)', color: 'var(--color-stone)' };
  return (
    <span style={{
      fontSize: 11, fontWeight: 600,
      padding: '3px 10px', borderRadius: 'var(--radius-full, 999px)',
      background: badge.bg, color: badge.color,
      whiteSpace: 'nowrap',
    }}>
      {badge.label}
    </span>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function OrdersPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login', { replace: true }); return; }
    (async () => {
      try {
        const data = await apiClient.get('/customer/orders');
        setOrders(Array.isArray(data) ? data : data?.orders || []);
      } catch {
        setOrders([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, authLoading, navigate]);

  const filtered = useMemo(() => {
    const activeStatuses = ['pending', 'confirmed', 'preparing', 'processing', 'shipped', 'in_transit'];
    const completedStatuses = ['delivered'];
    const cancelledStatuses = ['cancelled', 'refunded'];

    return orders.filter(o => {
      const s = (o.status || '').toLowerCase();
      if (activeTab === 'active') return activeStatuses.includes(s);
      if (activeTab === 'completed') return completedStatuses.includes(s);
      return cancelledStatuses.includes(s);
    });
  }, [orders, activeTab]);

  const font = { fontFamily: 'var(--font-sans)' };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-cream)', ...font }}>
      {/* Topbar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'var(--color-white)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
          aria-label="Volver"
        >
          <ArrowLeft size={22} color="var(--color-black)" />
        </button>
        <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-black)' }}>Mis pedidos</span>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 0,
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-white)',
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, padding: '12px 0',
              fontSize: 14, fontWeight: activeTab === tab.id ? 600 : 400,
              color: activeTab === tab.id ? 'var(--color-black)' : 'var(--color-stone)',
              background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: activeTab === tab.id ? '2px solid var(--color-black)' : '2px solid transparent',
              fontFamily: 'var(--font-sans)',
              transition: 'var(--transition-fast)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '16px 16px 100px', maxWidth: 600, margin: '0 auto' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <Loader2 size={28} color="var(--color-stone)" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : filtered.length === 0 ? (
          /* Empty state */
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 12, padding: '60px 0',
          }}>
            <Package size={64} color="var(--color-stone)" strokeWidth={1} />
            <p style={{ fontSize: 15, color: 'var(--color-stone)', textAlign: 'center' }}>
              No tienes pedidos {activeTab === 'active' ? 'en curso' : activeTab === 'completed' ? 'completados' : 'cancelados'}
            </p>
            <Link
              to="/explore"
              style={{
                padding: '10px 24px', background: 'var(--color-black)',
                color: 'var(--color-white)', borderRadius: 'var(--radius-lg)',
                fontSize: 14, fontWeight: 600, textDecoration: 'none',
              }}
            >
              Explorar productos
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(order => {
              const orderId = order.order_id || order.id || order._id;
              const ref = `#HSP-${String(orderId).slice(-4).toUpperCase()}`;
              const items = order.items || order.line_items || [];
              const status = (order.status || '').toLowerCase();
              const isShipped = status === 'shipped' || status === 'in_transit';
              const total = order.total ? (order.total / 100).toFixed(2) : order.total_amount ? Number(order.total_amount).toFixed(2) : '0.00';

              return (
                <div
                  key={orderId}
                  style={{
                    background: 'var(--color-white)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-xl)',
                    padding: 16, cursor: 'pointer',
                    transition: 'var(--transition-fast)',
                  }}
                  onClick={() => navigate(`/dashboard/orders/${orderId}`)}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-black)', margin: 0 }}>{ref}</p>
                      <p style={{ fontSize: 12, color: 'var(--color-stone)', margin: '2px 0 0' }}>{formatDate(order.created_at)}</p>
                    </div>
                    <StatusBadge status={status} />
                  </div>

                  {/* Items preview */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    {items.slice(0, 2).map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 'var(--radius-md)',
                          background: 'var(--color-surface)', overflow: 'hidden', flexShrink: 0,
                        }}>
                          {(item.image || item.product_image) && (
                            <img src={item.image || item.product_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          )}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 12, color: 'var(--color-black)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>
                            {item.name || item.product_name}
                          </p>
                          <p style={{ fontSize: 11, color: 'var(--color-stone)', margin: 0 }}>x{item.quantity}</p>
                        </div>
                      </div>
                    ))}
                    {items.length > 2 && (
                      <span style={{ fontSize: 12, color: 'var(--color-stone)', fontWeight: 500 }}>+{items.length - 2} más</span>
                    )}
                  </div>

                  {/* Shipping row */}
                  {isShipped && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 12px', marginBottom: 12,
                      background: 'rgba(37,99,235,0.06)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 13, color: '#2563eb',
                    }}>
                      <Truck size={16} />
                      <span>En camino</span>
                      {order.carrier && <span>· {order.carrier}</span>}
                      {order.tracking_url && (
                        <a
                          href={order.tracking_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 2, fontWeight: 600, color: '#2563eb', textDecoration: 'none' }}
                        >
                          Rastrear <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-black)' }}>{total}€</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, color: 'var(--color-stone)' }}>
                      Ver detalles <ChevronRight size={16} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
