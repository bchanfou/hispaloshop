import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Truck, ChevronRight, ExternalLink, Loader2, Clock, CheckCircle, X, RefreshCw } from 'lucide-react';
import apiClient from '../services/api/client';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const TABS = [
  { id: 'active', label: 'En curso' },
  { id: 'completed', label: 'Completados' },
  { id: 'cancelled', label: 'Cancelados' },
];

const STATUS_BADGES = {
  pending:    { label: 'Pendiente',   Icon: Clock,        cls: 'bg-stone-100 text-stone-400' },
  confirmed:  { label: 'Confirmado',  Icon: CheckCircle,  cls: 'bg-stone-100 text-stone-700' },
  preparing:  { label: 'Preparando', Icon: Package,      cls: 'bg-stone-100 text-stone-700' },
  processing: { label: 'Procesando', Icon: Package,      cls: 'bg-stone-100 text-stone-700' },
  shipped:    { label: 'En camino',  Icon: Truck,        cls: 'bg-stone-100 text-stone-700' },
  in_transit: { label: 'En camino',  Icon: Truck,        cls: 'bg-stone-100 text-stone-700' },
  delivered:  { label: 'Entregado',  Icon: Package,      cls: 'bg-stone-950 text-white' },
  cancelled:  { label: 'Cancelado',  Icon: X,            cls: 'bg-stone-100 text-stone-400' },
  refunded:   { label: 'Reembolsado', Icon: RefreshCw,   cls: 'bg-stone-100 text-stone-400' },
};

function StatusBadge({ status }) {
  const badge = STATUS_BADGES[status] || { label: status, Icon: Package, cls: 'bg-stone-100 text-stone-400' };
  const { Icon } = badge;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${badge.cls}`}>
      <Icon size={11} strokeWidth={2.5} />
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
  const [fetchError, setFetchError] = useState(false);
  const [activeTab, setActiveTab] = useState('active');

  const loadOrders = async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const data = await apiClient.get('/customer/orders');
      setOrders(Array.isArray(data) ? data : data?.orders || []);
    } catch {
      setOrders([]);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login', { replace: true }); return; }
    loadOrders();
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

  const font = { fontFamily: 'inherit' };

  return (
    <div style={{ minHeight: '100vh', background: '#fafaf9', ...font }}>
      {/* Topbar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: '#ffffff',
        borderBottom: '1px solid #e7e5e4',
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
          aria-label="Volver"
        >
          <ArrowLeft size={22} color="#0c0a09" />
        </button>
        <span style={{ fontSize: 17, fontWeight: 700, color: '#0c0a09' }}>Mis pedidos</span>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 0,
        borderBottom: '1px solid #e7e5e4',
        background: '#ffffff',
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, padding: '12px 0',
              fontSize: 14, fontWeight: activeTab === tab.id ? 600 : 400,
              color: activeTab === tab.id ? '#0c0a09' : '#78716c',
              background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: activeTab === tab.id ? '2px solid #0c0a09' : '2px solid transparent',
              fontFamily: 'inherit',
              transition: 'all 0.15s ease',
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
            <Loader2 size={28} color="#78716c" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : fetchError ? (
          /* Error state */
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 12, padding: '60px 0',
          }}>
            <Package size={64} color="#78716c" strokeWidth={1} />
            <p style={{ fontSize: 15, color: '#78716c', textAlign: 'center' }}>
              No pudimos cargar tus pedidos
            </p>
            <button
              onClick={loadOrders}
              style={{
                padding: '10px 24px', background: '#0c0a09',
                color: '#ffffff', borderRadius: '14px',
                fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
              }}
            >
              Reintentar
            </button>
          </div>
        ) : filtered.length === 0 ? (
          /* Empty state */
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 12, padding: '60px 0',
          }}>
            <Package size={64} color="#78716c" strokeWidth={1} />
            <p style={{ fontSize: 15, color: '#78716c', textAlign: 'center' }}>
              No tienes pedidos {activeTab === 'active' ? 'en curso' : activeTab === 'completed' ? 'completados' : 'cancelados'}
            </p>
            <Link
              to="/explore"
              style={{
                padding: '10px 24px', background: '#0c0a09',
                color: '#ffffff', borderRadius: '14px',
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
              const totalNum = order.total ? (order.total / 100) : order.total_amount ? Number(order.total_amount) : 0;
              const total = new Intl.NumberFormat('es-ES', { style: 'currency', currency: order.currency || 'EUR' }).format(totalNum);
              const isDelivered = status === 'delivered';

              return (
                <div
                  key={orderId}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e7e5e4',
                    borderRadius: '16px',
                    padding: 16, cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onClick={() => navigate(`/dashboard/orders/${orderId}`)}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 600, color: '#0c0a09', margin: 0 }}>{ref}</p>
                      <p style={{ fontSize: 12, color: '#78716c', margin: '2px 0 0' }}>{formatDate(order.created_at)}</p>
                    </div>
                    <StatusBadge status={status} />
                  </div>

                  {/* Items preview */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    {items.slice(0, 2).map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: '12px',
                          background: '#f5f5f4', overflow: 'hidden', flexShrink: 0,
                        }}>
                          {(item.image || item.product_image) && (
                            <img src={item.image || item.product_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          )}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 12, color: '#0c0a09', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>
                            {item.name || item.product_name}
                          </p>
                          <p style={{ fontSize: 11, color: '#78716c', margin: 0 }}>x{item.quantity}</p>
                        </div>
                      </div>
                    ))}
                    {items.length > 2 && (
                      <span style={{ fontSize: 12, color: '#78716c', fontWeight: 500 }}>+{items.length - 2} más</span>
                    )}
                  </div>

                  {/* Shipping row */}
                  {isShipped && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 12px', marginBottom: 12,
                      background: '#f5f5f4',
                      borderRadius: '12px',
                      fontSize: 13, color: '#0c0a09',
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
                          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 2, fontWeight: 600, color: '#0c0a09', textDecoration: 'none' }}
                        >
                          Rastrear <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#0c0a09' }}>{total}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {isDelivered && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await apiClient.post(`/customer/orders/${orderId}/reorder`, {});
                              toast.success('Productos añadidos al carrito');
                            } catch (err) {
                              toast.error(err?.message || 'Error al volver a pedir');
                            }
                          }}
                          style={{
                            padding: '6px 14px',
                            background: '#0c0a09', color: '#ffffff',
                            borderRadius: '9999px',
                            fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                          }}
                        >
                          Volver a pedir
                        </button>
                      )}
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, color: '#78716c' }}>
                        Ver detalles <ChevronRight size={16} />
                      </span>
                    </div>
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
