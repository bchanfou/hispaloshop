// @ts-nocheck
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Package, Truck, ChevronRight, ExternalLink,
  Loader2, Clock, CheckCircle, X, RefreshCw, CreditCard,
  PackageCheck, Star, MessageCircle,
} from 'lucide-react';
import apiClient from '../services/api/client';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { trackEvent } from '../utils/analytics';

/* ── Status config ── */
const STATUS_BADGES: Record<string, { label: string; labelKey: string; Icon: any; cls: string }> = {
  pending:    { label: 'Pendiente',   labelKey: 'order_tracking.status_pending',    Icon: Clock,        cls: 'bg-stone-100 text-stone-400' },
  paid:       { label: 'Pagado',      labelKey: 'order_tracking.status_paid',       Icon: CreditCard,   cls: 'bg-stone-100 text-stone-700' },
  confirmed:  { label: 'Confirmado',  labelKey: 'order_tracking.status_confirmed',  Icon: CheckCircle,  cls: 'bg-stone-100 text-stone-700' },
  preparing:  { label: 'Preparando',  labelKey: 'order_tracking.status_preparing',  Icon: Package,      cls: 'bg-stone-100 text-stone-700' },
  processing: { label: 'Procesando',  labelKey: 'order_tracking.status_processing', Icon: Package,      cls: 'bg-stone-100 text-stone-700' },
  shipped:    { label: 'En camino',   labelKey: 'order_tracking.status_shipped',    Icon: Truck,        cls: 'bg-stone-100 text-stone-700' },
  in_transit: { label: 'En camino',   labelKey: 'order_tracking.status_shipped',    Icon: Truck,        cls: 'bg-stone-100 text-stone-700' },
  delivered:  { label: 'Entregado',   labelKey: 'order_tracking.status_delivered',  Icon: PackageCheck, cls: 'bg-stone-950 text-white' },
  cancelled:  { label: 'Cancelado',   labelKey: 'order_tracking.status_cancelled',  Icon: X,            cls: 'bg-stone-100 text-stone-400' },
  refunded:   { label: 'Reembolsado', labelKey: 'order_tracking.status_refunded',   Icon: RefreshCw,    cls: 'bg-stone-100 text-stone-400' },
};

const ACTIVE_STATUSES = ['pending', 'paid', 'confirmed', 'preparing', 'processing', 'shipped', 'in_transit'];
const PAST_STATUSES = ['delivered', 'completed', 'cancelled', 'refunded'];
const PAGE_SIZE = 20;

export function getOrderProducerContacts(items: any[] = []) {
  return Array.from(
    new Map(
      items
        .map((item: any) => ({
          id: item?.producer_id || item?.seller_id,
          name: item?.producer_name || item?.seller_name || item?.store_name || '',
        }))
        .filter((p: any) => Boolean(p.id))
        .map((p: any) => [p.id, p]),
    ).values(),
  );
}

export function getOrderChatAvailability(items: any[] = []) {
  const producerContacts = getOrderProducerContacts(items);
  const singleProducer = producerContacts.length === 1 ? producerContacts[0] : null;
  const hasUnavailableChat = items.length > 0 && producerContacts.length === 0;

  return {
    producerContacts,
    singleProducer,
    hasUnavailableChat,
  };
}

function StatusBadge({ status, t }: { status: string; t: any }) {
  const badge = STATUS_BADGES[status] || { label: status, labelKey: '', Icon: Package, cls: 'bg-stone-100 text-stone-400' };
  const { Icon } = badge;
  const label = badge.labelKey ? t(badge.labelKey, badge.label) : badge.label;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${badge.cls}`}>
      <Icon size={11} strokeWidth={2.5} />
      {label}
    </span>
  );
}

function formatDate(dateStr: string | undefined, language: string = 'es') {
  if (!dateStr) return '';
  const locale = language === 'ko' ? 'ko-KR' : language === 'en' ? 'en-US' : 'es-ES';
  return new Date(dateStr).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function OrdersPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { convertAndFormatPrice, language } = useLocale();
  const { t } = useTranslation();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'past'>('all');
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [expandedContactOrderId, setExpandedContactOrderId] = useState<string | null>(null);

  const statusFilter = useMemo(() => {
    if (activeTab === 'active') return ACTIVE_STATUSES.join(',');
    if (activeTab === 'past') return PAST_STATUSES.join(',');
    return undefined;
  }, [activeTab]);

  const loadOrders = useCallback(async (skip = 0, append = false) => {
    if (!append) { setLoading(true); setFetchError(false); }
    else setLoadingMore(true);

    try {
      const params = new URLSearchParams();
      params.set('skip', String(skip));
      params.set('limit', String(PAGE_SIZE));
      if (statusFilter) params.set('status', statusFilter);

      const data = await apiClient.get(`/customer/orders?${params.toString()}`);
      const fetched = Array.isArray(data) ? data : data?.orders || [];
      const totalCount = data?.total ?? fetched.length;

      if (append) {
        setOrders(prev => [...prev, ...fetched]);
      } else {
        setOrders(fetched);
      }
      setTotal(totalCount);
      setHasMore(data?.has_more ?? (skip + PAGE_SIZE < totalCount));
    } catch {
      if (!append) { setOrders([]); setFetchError(true); }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login', { replace: true }); return; }
    loadOrders(0, false);
  }, [user, authLoading, navigate, loadOrders]);

  // Analytics: track tab view
  useEffect(() => {
    if (!loading && !fetchError) {
      trackEvent('orders_viewed', { tab: activeTab, count: orders.length });
    }
  }, [activeTab, loading, fetchError]);

  const handleLoadMore = () => {
    loadOrders(orders.length, true);
  };

  const handleReorder = async (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
    try {
      const result = await apiClient.post(`/customer/orders/${orderId}/reorder`, {});
      const skipped = result?.skipped || [];
      const priceChanged = result?.price_changed || [];
      if (skipped.length > 0) {
        toast(t('order_tracking.some_out_of_stock', '{{items}} no disponible(s)', { items: skipped.join(', ') }));
      }
      if (priceChanged.length > 0) {
        toast(t('order_tracking.price_changed', 'El precio de {{items}} ha cambiado', { items: priceChanged.join(', ') }));
      }
      toast.success(t('order_tracking.reorder_success', 'Productos añadidos al carrito'));
      trackEvent('order_reordered', { order_id: orderId, items_count: result?.added || 0 });
      navigate('/cart');
    } catch {
      toast.error(t('order_tracking.reorder_error', 'Error al volver a pedir'));
    }
  };

  const handleContactProducer = (e: React.MouseEvent, producerId: string, orderId: string) => {
    e.stopPropagation();
    if (!producerId) {
      toast.error(t('order_tracking.contact_unavailable', 'Chat no disponible para este pedido'));
      return;
    }
    trackEvent('order_contact_producer_clicked', { order_id: orderId, producer_id: producerId });
    navigate(`/messages/new?to=${producerId}`);
  };

  const handleToggleContactOptions = (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
    setExpandedContactOrderId(prev => (prev === orderId ? null : orderId));
  };

  const TABS = [
    { id: 'all' as const,    label: t('order_tracking.tab_all', 'Todos') },
    { id: 'active' as const, label: t('order_tracking.tab_active', 'Activos') },
    { id: 'past' as const,   label: t('order_tracking.tab_past', 'Pasados') },
  ];

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Topbar */}
      <div className="sticky top-0 z-40 bg-white border-b border-stone-200 flex items-center gap-3 px-4 py-3">
        <button onClick={() => navigate(-1)} className="bg-transparent border-none cursor-pointer p-1 flex" aria-label={t('common.back', 'Volver')}>
          <ArrowLeft size={22} className="text-stone-950" />
        </button>
        <span className="text-[17px] font-bold text-stone-950">
          {t('order_tracking.my_orders', 'Mis pedidos')}
        </span>
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
      <div className="px-4 pt-4 pb-[100px] max-w-[800px] mx-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={28} className="text-stone-500 animate-spin" />
          </div>
        ) : fetchError ? (
          <div className="flex flex-col items-center justify-center gap-3 py-[60px]">
            <Package size={64} className="text-stone-500" strokeWidth={1} />
            <p className="text-[15px] text-stone-500 text-center">
              {t('order_tracking.load_error', 'No pudimos cargar tus pedidos')}
            </p>
            <button
              onClick={() => loadOrders(0, false)}
              className="px-6 py-2.5 bg-stone-950 text-white rounded-full text-sm font-semibold border-none cursor-pointer"
            >
              {t('common.retry', 'Reintentar')}
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-[60px]">
            <Package size={64} className="text-stone-500" strokeWidth={1} />
            <p className="text-[15px] text-stone-500 text-center">
              {t('order_tracking.empty_state', 'Aun no has hecho ningun pedido. Descubre productos increibles.')}
            </p>
            <Link
              to="/discover"
              className="px-6 py-2.5 bg-stone-950 text-white rounded-full text-sm font-semibold no-underline"
            >
              {t('order_tracking.discover_cta', 'Descubrir productos')}
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {orders.map(order => {
                const orderId = order.order_id || order.id || order._id;
                const ref = `#HSP-${String(orderId).slice(-4).toUpperCase()}`;
                const items = order.items || order.line_items || [];
                const status = (order.status || '').toLowerCase();
                const isShipped = status === 'shipped' || status === 'in_transit';
                const isDelivered = status === 'delivered';
                const { producerContacts, singleProducer, hasUnavailableChat } = getOrderChatAvailability(items);
                const totalNum = order.total_cents
                  ? order.total_cents / 100
                  : order.total_amount
                    ? Number(order.total_amount)
                    : 0;
                const cur = order.currency || 'EUR';

                return (
                  <div
                    key={orderId}
                    className="bg-white border border-stone-200 rounded-2xl p-4 cursor-pointer transition-all duration-150 hover:border-stone-300"
                    onClick={() => navigate(`/dashboard/orders/${orderId}`)}
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-[15px] font-semibold text-stone-950 m-0">{ref}</p>
                        <p className="text-xs text-stone-500 mt-0.5 m-0">{formatDate(order.created_at, language)}</p>
                      </div>
                      <StatusBadge status={status} t={t} />
                    </div>

                    {/* Items preview */}
                    <div className="flex items-center gap-2 mb-3">
                      {items.slice(0, 2).map((item: any, i: number) => (
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
                        <span className="text-xs text-stone-500 font-medium">
                          +{items.length - 2} {t('order_tracking.more_items', 'mas')}
                        </span>
                      )}
                    </div>

                    {/* Shipping row */}
                    {isShipped && (
                      <div className="flex items-center gap-1.5 px-3 py-2 mb-3 bg-stone-100 rounded-xl text-[13px] text-stone-950">
                        <Truck size={16} />
                        <span>{t('order_tracking.status_shipped', 'En camino')}</span>
                        {order.carrier && <span>· {order.carrier}</span>}
                        {order.tracking_url && (
                          <a
                            href={order.tracking_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => { e.stopPropagation(); trackEvent('order_tracking_clicked', { order_id: orderId }); }}
                            className="ml-auto flex items-center gap-0.5 font-semibold text-stone-950 no-underline"
                          >
                            {t('order_tracking.track', 'Rastrear')} <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex justify-between items-center">
                      <span className="text-[15px] font-semibold text-stone-950">
                        {convertAndFormatPrice(totalNum, cur)}
                      </span>
                      <div className="flex items-center gap-2">
                        {singleProducer && (
                          <button
                            onClick={e => handleContactProducer(e, singleProducer.id, orderId)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-stone-200 rounded-full text-xs font-semibold text-stone-950"
                          >
                            <MessageCircle size={12} />
                            {t('order_tracking.contact_producer', 'Contactar productor')}
                          </button>
                        )}
                        {producerContacts.length > 1 && (
                          <button
                            onClick={e => handleToggleContactOptions(e, orderId)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-stone-200 rounded-full text-xs font-semibold text-stone-950"
                          >
                            <MessageCircle size={12} />
                            {t('order_tracking.contact_producer', 'Contactar productor')}
                          </button>
                        )}
                        {hasUnavailableChat && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              toast.info(t('order_tracking.contact_unavailable', 'Chat no disponible para este pedido'));
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-stone-100 border border-stone-200 rounded-full text-xs font-semibold text-stone-500"
                            title={t('order_tracking.contact_unavailable', 'Chat no disponible para este pedido')}
                          >
                            <MessageCircle size={12} />
                            {t('order_tracking.contact_producer', 'Contactar productor')}
                          </button>
                        )}
                        {isDelivered && (
                          <>
                            <Link
                              to={items[0]?.product_id ? `/products/${items[0].product_id}#reviews` : '#'}
                              onClick={e => e.stopPropagation()}
                              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-stone-200 rounded-full text-xs font-semibold text-stone-950 no-underline"
                            >
                              <Star size={12} />
                              {t('order_tracking.leave_review', 'Resena')}
                            </Link>
                            <button
                              onClick={e => handleReorder(e, orderId)}
                              className="px-3.5 py-1.5 bg-stone-950 text-white rounded-full text-xs font-semibold border-none cursor-pointer"
                            >
                              {t('order_tracking.reorder', 'Volver a pedir')}
                            </button>
                          </>
                        )}
                        <span className="flex items-center gap-1 text-[13px] font-semibold text-stone-500">
                          {t('order_tracking.view_details', 'Ver detalles')} <ChevronRight size={16} />
                        </span>
                      </div>
                    </div>

                    {producerContacts.length > 1 && expandedContactOrderId === orderId && (
                      <div className="mt-3 border border-stone-200 rounded-xl p-2 bg-stone-50">
                        {producerContacts.map((producer: any) => (
                          <button
                            key={producer.id}
                            onClick={e => handleContactProducer(e, producer.id, orderId)}
                            className="w-full text-left flex items-center gap-2 px-3 py-2 mb-1 last:mb-0 bg-white rounded-lg border border-stone-200 text-xs font-semibold text-stone-950"
                          >
                            <MessageCircle size={12} />
                            {producer.name || producer.id}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-6 py-2.5 bg-white border border-stone-200 rounded-full text-sm font-semibold text-stone-950 cursor-pointer"
                >
                  {loadingMore ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    t('order_tracking.load_more', 'Cargar mas pedidos')
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
