import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';
import { ShoppingBag, ChevronRight, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { asNumber } from '../../utils/safe';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import PullIndicator from '../../components/ui/PullIndicator';
import { getStatusColor, getStatusIcon } from '../../components/OrderStatusBadge';

const STATUS_FLOW = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered'];

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
  const { t } = useTranslation();
  const navigate = useNavigate();

  const fetchOrders = useCallback(async () => {
    try {
      const data = await apiClient.get('/customer/orders');
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error(t('orders.loadError', 'Failed to load orders'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const { refreshing, progress, handlers } = usePullToRefresh(fetchOrders);

  const filteredOrders = useMemo(() => {
    if (activeFilter === 'all') return orders;
    const tab = FILTER_TABS.find(f => f.key === activeFilter);
    if (!tab?.statuses) return orders;
    return orders.filter(o => tab.statuses.includes(o.status));
  }, [orders, activeFilter]);

  // List View
  return (
    <div
      style={{ position: 'relative', overscrollBehavior: 'none' }}
      {...handlers}
    >
      <PullIndicator progress={progress} isRefreshing={refreshing} />
      <h1 className="text-3xl font-semibold text-stone-950 mb-2">
        {t('orders.title', 'My Orders')}
      </h1>
      <p className="text-stone-500 mb-4">{t('orders.description', 'View and track your orders.')}</p>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
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

      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-stone-500">{t('common.loading', 'Loading...')}</div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 text-center">
            <ShoppingBag className="w-12 h-12 text-stone-300 mx-auto mb-4" />
            <p className="text-stone-500 mb-4">
              {activeFilter === 'all'
                ? t('orders.noOrders', "You haven't placed any orders yet.")
                : 'No hay pedidos en esta categoría'}
            </p>
            {activeFilter === 'all' && (
              <a href="/products" className="text-stone-950 hover:underline font-medium">
                {t('orders.startShopping', 'Start Shopping')} →
              </a>
            )}
          </div>
        ) : (
          <div className="divide-y divide-stone-100" data-testid="orders-list">
            {filteredOrders.map((order) => {
              const StatusIcon = getStatusIcon(order.status);
              const statusColor = getStatusColor(order.status);
              return (
                <button
                  key={order.order_id}
                  onClick={() => navigate(`/dashboard/orders/${order.order_id}`)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-stone-50 transition-colors text-left"
                  data-testid={`order-row-${order.order_id}`}
                >
                  {/* Status icon */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${statusColor}`}>
                    <StatusIcon className="w-5 h-5" />
                  </div>

                  {/* Order info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-stone-950">€{asNumber(order.total_amount).toFixed(2)}</span>
                      <span className="text-xs text-stone-500">·</span>
                      <span className="text-xs text-stone-500">{order.line_items?.length || 0} items</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-medium capitalize text-stone-600">
                        {t(`orders.status.${order.status}`, order.status)}
                      </span>
                      <span className="text-[10px] text-stone-500">
                        {new Date(order.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </div>

                  {/* Reorder button for completed orders */}
                  {['delivered', 'completed'].includes(order.status) && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await apiClient.post(`/customer/orders/${order.order_id}/reorder`, {});
                          toast.success('Productos agregados al carrito');
                        } catch { toast.error('Error al reordenar'); }
                      }}
                      className="shrink-0 bg-stone-950 text-white text-xs font-medium px-3 py-1.5 rounded-full hover:bg-stone-800 transition-colors"
                      data-testid={`reorder-${order.order_id}`}
                    >
                      Repetir
                    </button>
                  )}

                  {/* Arrow */}
                  <ChevronRight className="w-4 h-4 text-stone-500 shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
