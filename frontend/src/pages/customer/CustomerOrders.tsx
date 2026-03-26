// @ts-nocheck
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';
import { ShoppingBag, ChevronRight, Clock, Check, ExternalLink, RotateCcw } from 'lucide-react';

import { asNumber } from '../../utils/safe';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import PullIndicator from '../../components/ui/PullIndicator';
import { getStatusColor, getStatusIcon } from '../../components/OrderStatusBadge';
import { useLocale } from '../../context/LocaleContext';
import { useCart } from '../../context/CartContext';

const STATUS_FLOW = ['pending', 'paid', 'confirmed', 'preparing', 'shipped', 'delivered'];

const TIMELINE_STEPS = [
  { key: 'ordered', label: 'Pedido' },
  { key: 'confirmed', label: 'Confirmado' },
  { key: 'preparing', label: 'Preparando' },
  { key: 'shipped', label: 'Enviado' },
  { key: 'delivered', label: 'Entregado' },
];

const CANCELLED_STATUSES = ['cancelled', 'refunded'];

function getTimelineStep(status: string): number {
  if (status === 'pending') return 0;
  if (status === 'confirmed' || status === 'paid') return 1;
  if (status === 'processing' || status === 'packing' || status === 'preparing') return 2;
  if (status === 'shipped' || status === 'in_transit') return 3;
  if (status === 'delivered' || status === 'completed') return 4;
  return -1; // cancelled/refunded
}

const SORT_OPTIONS = [
  { key: 'recent', label: 'Más recientes' },
  { key: 'oldest', label: 'Más antiguos' },
  { key: 'highest', label: 'Mayor importe' },
];

function OrderTimeline({ status }: { status: string }) {
  const activeStep = getTimelineStep(status);
  if (activeStep < 0) return null;

  return (
    <div className="flex items-center w-full px-1 mt-2 mb-1">
      {TIMELINE_STEPS.map((step, i) => {
        const isCompleted = i < activeStep;
        const isActive = i === activeStep;
        const isFuture = i > activeStep;
        return (
          <React.Fragment key={step.key}>
            {/* Connecting line before (except first) */}
            {i > 0 && (
              <div className={`flex-1 h-[2px] ${isCompleted || isActive ? 'bg-stone-950' : 'bg-stone-200'}`} />
            )}
            {/* Step circle + label */}
            <div className="flex flex-col items-center gap-0.5 shrink-0">
              <div
                className={`w-4 h-4 rounded-full flex items-center justify-center ${
                  isCompleted
                    ? 'bg-stone-950'
                    : isActive
                    ? (i === 0 ? 'border-2 border-stone-950 bg-white' : 'bg-stone-950')
                    : 'bg-stone-200'
                }`}
              >
                {isCompleted && <Check size={10} className="text-white" strokeWidth={3} />}
                {isActive && i > 0 && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <span className={`text-[9px] leading-tight ${isFuture ? 'text-stone-400' : 'text-stone-700 font-medium'}`}>
                {step.label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  shipped: 'Enviado',
  in_transit: 'Enviado',
  delivered: 'Entregado',
  completed: 'Entregado',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
};

const FILTER_TABS = [
  { key: 'all', label: 'Todos' },
  { key: 'active', label: 'Activos', statuses: ['pending', 'confirmed', 'preparing', 'shipped', 'paid'] },
  { key: 'delivered', label: 'Entregados', statuses: ['delivered', 'completed'] },
  { key: 'cancelled', label: 'Cancelados', statuses: ['cancelled', 'refunded'] },
];

export default function CustomerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [page, setPage] = useState(1);
  const LIMIT = 20;
  const navigate = useNavigate();
  const { convertAndFormatPrice, currency } = useLocale();
  const { fetchCart } = useCart();
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  const [hasMore, setHasMore] = useState(true);
  const fetchOrders = useCallback(async () => {
    try {
      const data = await apiClient.get(`/customer/orders?limit=${LIMIT}&skip=${(page - 1) * LIMIT}`);
      const fetched = Array.isArray(data) ? data : data?.orders || [];
      setOrders(prev => page === 1 ? fetched : [...prev, ...fetched]);
      // Use server's has_more if available, otherwise heuristic
      if (data?.has_more != null) {
        setHasMore(data.has_more);
      } else {
        setHasMore(fetched.length >= LIMIT);
      }
    } catch (error) {
      toast.error('Error al cargar los pedidos');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const { refreshing, progress, handlers } = usePullToRefresh(fetchOrders);

  const filteredOrders = useMemo(() => {
    let result = orders;
    if (activeFilter !== 'all') {
      const tab = FILTER_TABS.find(f => f.key === activeFilter);
      if (tab?.statuses) result = orders.filter(o => tab.statuses.includes(o.status));
    }
    const sorted = [...result];
    if (sortBy === 'recent') sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    else if (sortBy === 'oldest') sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    else if (sortBy === 'highest') sorted.sort((a, b) => asNumber(b.total_amount) - asNumber(a.total_amount));
    return sorted;
  }, [orders, activeFilter, sortBy]);

  // List View
  return (
    <div
      style={{ position: 'relative', overscrollBehavior: 'none' }}
      {...handlers}
    >
      <PullIndicator progress={progress} isRefreshing={refreshing} />
      <div className="max-w-[975px] mx-auto">
      <h1 className="text-3xl font-semibold text-stone-950 mb-2">
        Mis pedidos
      </h1>
      <p className="text-stone-500 mb-4">Consulta y sigue tus pedidos</p>

      {/* Filter tabs + sort */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex gap-2 flex-1 overflow-x-auto scrollbar-hide pb-1">
          {FILTER_TABS.map(tab => {
            const count = tab.key === 'all' ? orders.length : orders.filter(o => tab.statuses?.includes(o.status)).length;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeFilter === tab.key
                    ? 'bg-stone-950 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {tab.label} {count > 0 && <span className="ml-1 text-xs opacity-70">({count})</span>}
              </button>
            );
          })}
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="shrink-0 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 outline-none focus:border-stone-400"
        >
          {SORT_OPTIONS.map(opt => (
            <option key={opt.key} value={opt.key}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 rounded-full bg-stone-100 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-stone-100 rounded animate-pulse" />
                  <div className="h-3 w-20 bg-stone-100 rounded animate-pulse" />
                </div>
                <div className="h-4 w-16 bg-stone-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 text-center">
            <ShoppingBag className="w-12 h-12 text-stone-300 mx-auto mb-4" />
            <p className="text-stone-500 mb-4">
              {activeFilter === 'all'
                ? 'Aún no tienes pedidos'
                : 'No hay pedidos en esta categoría'}
            </p>
            {activeFilter === 'all' && (
              <Link to="/discover" className="text-stone-950 hover:underline font-medium">
                Empezar a comprar →
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-stone-100" data-testid="orders-list">
            {filteredOrders.map((order) => {
              const StatusIcon = getStatusIcon(order.status);
              const statusColor = getStatusColor(order.status);
              const isCancelled = CANCELLED_STATUSES.includes(order.status);
              const isDelivered = ['delivered', 'completed'].includes(order.status);
              return (
                <div
                  key={order.order_id}
                  className="p-4 hover:bg-stone-50 transition-colors"
                  data-testid={`order-row-${order.order_id}`}
                >
                  {/* Top row — clickable to detail */}
                  <button
                    onClick={() => navigate(`/dashboard/orders/${order.order_id}`)}
                    className="w-full flex items-center gap-4 text-left"
                  >
                    {/* Status icon */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${statusColor}`}>
                      <StatusIcon className="w-5 h-5" />
                    </div>

                    {/* Order info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-stone-950">{convertAndFormatPrice(asNumber(order.total_amount), order.currency || 'EUR', currency)}</span>
                        <span className="text-xs text-stone-500">·</span>
                        <span className="text-xs text-stone-500">{order.line_items?.length || 0} {(order.line_items?.length || 0) === 1 ? 'artículo' : 'artículos'}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-medium capitalize text-stone-600">
                          {STATUS_LABELS[order.status] || order.status}
                        </span>
                        <span className="text-[10px] text-stone-500">
                          {new Date(order.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </div>

                    {/* Arrow */}
                    <ChevronRight className="w-4 h-4 text-stone-500 shrink-0" />
                  </button>

                  {/* Status timeline */}
                  {!isCancelled && <OrderTimeline status={order.status} />}

                  {/* Terminal status badge (cancelled / refunded) */}
                  {isCancelled && (
                    <div className="mt-2 ml-14 flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                        order.status === 'refunded'
                          ? 'bg-stone-100 text-stone-700'
                          : 'bg-stone-100 text-stone-500'
                      }`}>
                        {order.status === 'refunded' ? <RotateCcw size={12} /> : <Clock size={12} />}
                        {order.status === 'cancelled' ? 'Cancelado' : 'Reembolsado'}
                      </span>
                      {order.status === 'refunded' && order.refund_amount_cents != null && (
                        <span className="text-xs text-stone-500">
                          {convertAndFormatPrice((order.refund_amount_cents || 0) / 100)}
                        </span>
                      )}
                      {order.cancelled_at && (
                        <span className="text-[10px] text-stone-400">
                          {new Date(order.cancelled_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Action row: tracking link + reorder */}
                  {(order.tracking_url || isDelivered) && (
                    <div className="mt-2 ml-14 flex items-center gap-3 flex-wrap">
                      {order.tracking_url && (
                        <a
                          href={order.tracking_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-700 hover:text-stone-950 transition-colors"
                        >
                          <ShoppingBag size={14} /> Rastrear envío <ExternalLink size={12} />
                        </a>
                      )}
                      {isDelivered && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              setReorderingId(order.order_id);
                              await apiClient.post(`/customer/orders/${order.order_id}/reorder`);
                              await fetchCart();
                              toast.success('Productos añadidos al carrito');
                              navigate('/cart');
                            } catch (err: any) {
                              toast.error(err?.message || 'No se pudo repetir el pedido');
                            } finally {
                              setReorderingId(null);
                            }
                          }}
                          disabled={reorderingId === order.order_id}
                          className="inline-flex items-center gap-1.5 border border-stone-200 rounded-full px-4 py-2 text-sm font-semibold text-stone-950 hover:bg-stone-50 transition-colors disabled:opacity-50"
                          data-testid={`reorder-${order.order_id}`}
                        >
                          <RotateCcw size={14} /> Volver a pedir
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {hasMore && orders.length > 0 && (
        <button
          onClick={() => setPage(p => p + 1)}
          className="w-full mt-4 py-3 text-sm font-semibold text-stone-700 bg-white rounded-2xl shadow-sm hover:bg-stone-50 transition-colors"
        >
          Cargar más pedidos
        </button>
      )}
      </div>
    </div>
  );
}
