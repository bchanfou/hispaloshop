// @ts-nocheck
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

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Topbar */}
      <div className="sticky top-0 z-40 bg-white border-b border-stone-200 flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => navigate(-1)}
          className="bg-transparent border-none cursor-pointer p-1 flex"
          aria-label="Volver"
        >
          <ArrowLeft size={22} className="text-stone-950" />
        </button>
        <span className="text-[17px] font-bold text-stone-950">Mis pedidos</span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-200 bg-white">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 text-sm bg-transparent border-none cursor-pointer transition-all duration-150 ${
              activeTab === tab.id
                ? 'font-semibold text-stone-950 border-b-2 border-stone-950'
                : 'font-normal text-stone-500 border-b-2 border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-4 pt-4 pb-[100px] max-w-[600px] mx-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={28} className="text-stone-500 animate-spin" />
          </div>
        ) : fetchError ? (
          /* Error state */
          <div className="flex flex-col items-center justify-center gap-3 py-[60px]">
            <Package size={64} className="text-stone-500" strokeWidth={1} />
            <p className="text-[15px] text-stone-500 text-center">
              No pudimos cargar tus pedidos
            </p>
            <button
              onClick={loadOrders}
              className="px-6 py-2.5 bg-stone-950 text-white rounded-xl text-sm font-semibold border-none cursor-pointer"
            >
              Reintentar
            </button>
          </div>
        ) : filtered.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center gap-3 py-[60px]">
            <Package size={64} className="text-stone-500" strokeWidth={1} />
            <p className="text-[15px] text-stone-500 text-center">
              No tienes pedidos {activeTab === 'active' ? 'en curso' : activeTab === 'completed' ? 'completados' : 'cancelados'}
            </p>
            <Link
              to="/explore"
              className="px-6 py-2.5 bg-stone-950 text-white rounded-xl text-sm font-semibold no-underline"
            >
              Explorar productos
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
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
                  className="bg-white border border-stone-200 rounded-2xl p-4 cursor-pointer transition-all duration-150"
                  onClick={() => navigate(`/dashboard/orders/${orderId}`)}
                >
                  {/* Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-[15px] font-semibold text-stone-950 m-0">{ref}</p>
                      <p className="text-xs text-stone-500 mt-0.5 m-0">{formatDate(order.created_at)}</p>
                    </div>
                    <StatusBadge status={status} />
                  </div>

                  {/* Items preview */}
                  <div className="flex items-center gap-2 mb-3">
                    {items.slice(0, 2).map((item, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <div className="w-10 h-10 rounded-xl bg-stone-100 overflow-hidden shrink-0">
                          {(item.image || item.product_image) && (
                            <img loading="lazy" src={item.image || item.product_image} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-stone-950 m-0 overflow-hidden text-ellipsis whitespace-nowrap max-w-[100px]">
                            {item.name || item.product_name}
                          </p>
                          <p className="text-[11px] text-stone-500 m-0">x{item.quantity}</p>
                        </div>
                      </div>
                    ))}
                    {items.length > 2 && (
                      <span className="text-xs text-stone-500 font-medium">+{items.length - 2} más</span>
                    )}
                  </div>

                  {/* Shipping row */}
                  {isShipped && (
                    <div className="flex items-center gap-1.5 px-3 py-2 mb-3 bg-stone-100 rounded-xl text-[13px] text-stone-950">
                      <Truck size={16} />
                      <span>En camino</span>
                      {order.carrier && <span>· {order.carrier}</span>}
                      {order.tracking_url && (
                        <a
                          href={order.tracking_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="ml-auto flex items-center gap-0.5 font-semibold text-stone-950 no-underline"
                        >
                          Rastrear <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex justify-between items-center">
                    <span className="text-[15px] font-semibold text-stone-950">{total}</span>
                    <div className="flex items-center gap-2">
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
                          className="px-3.5 py-1.5 bg-stone-950 text-white rounded-full text-xs font-semibold border-none cursor-pointer"
                        >
                          Volver a pedir
                        </button>
                      )}
                      <span className="flex items-center gap-1 text-[13px] font-semibold text-stone-500">
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
