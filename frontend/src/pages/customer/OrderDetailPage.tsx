// @ts-nocheck
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Truck, Check, Clock, Package, ExternalLink,
  Star, MessageCircle, Loader2, FileText, XCircle,
  CreditCard, CheckCircle, PackageCheck, RotateCcw,
  RefreshCw, AlertCircle, X,
} from 'lucide-react';
import { useLocale } from '../../context/LocaleContext';
import { useTranslation } from 'react-i18next';
import { trackEvent } from '../../utils/analytics';

/* ── Timeline config ── */
const STATUS_FLOW = ['paid', 'confirmed', 'preparing', 'shipped', 'delivered'];

const STATUS_ICONS: Record<string, any> = {
  paid: CreditCard,
  confirmed: CheckCircle,
  preparing: Package,
  shipped: Truck,
  delivered: PackageCheck,
  cancelled: XCircle,
  refunded: RotateCcw,
};

const STATUS_LABEL_KEYS: Record<string, { key: string; fallback: string }> = {
  pending: { key: 'order_tracking.status_pending', fallback: 'Pendiente' },
  paid: { key: 'order_tracking.status_paid', fallback: 'Pagado' },
  confirmed: { key: 'order_tracking.status_confirmed', fallback: 'Confirmado' },
  preparing: { key: 'order_tracking.status_preparing', fallback: 'Preparando' },
  shipped: { key: 'order_tracking.status_shipped', fallback: 'Enviado' },
  delivered: { key: 'order_tracking.status_delivered', fallback: 'Entregado' },
  cancelled: { key: 'order_tracking.status_cancelled', fallback: 'Cancelado' },
  refunded: { key: 'order_tracking.status_refunded', fallback: 'Reembolsado' },
};

function getStatusLabel(status: string, t: any) {
  const cfg = STATUS_LABEL_KEYS[status];
  return cfg ? t(cfg.key, cfg.fallback) : status;
}

function formatDate(dateStr: string | undefined, language: string = 'es') {
  if (!dateStr) return '';
  const locale = language === 'ko' ? 'ko-KR' : language === 'en' ? 'en-US' : 'es-ES';
  return new Date(dateStr).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDateTime(dateStr: string | undefined, language: string = 'es') {
  if (!dateStr) return '';
  const locale = language === 'ko' ? 'ko-KR' : language === 'en' ? 'en-US' : 'es-ES';
  const d = new Date(dateStr);
  return `${d.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} · ${d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mt-6 mb-2">
      {children}
    </p>
  );
}

function PaymentRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[13px] text-stone-500">{label}</span>
      <span className={`${bold ? 'text-lg font-bold' : 'text-sm font-medium'} text-stone-950`}>
        {value}
      </span>
    </div>
  );
}

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { convertAndFormatPrice, language } = useLocale();
  const { t } = useTranslation();

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [reorderLoading, setReorderLoading] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      const data = await apiClient.get(`/customer/orders/${orderId}`);
      setOrder(data);
    } catch (error: any) {
      toast.error(
        error?.status === 404
          ? t('order_tracking.not_found', 'Pedido no encontrado')
          : t('order_tracking.load_error_detail', 'Error al cargar el pedido'),
      );
      navigate('/dashboard/orders');
    } finally {
      setLoading(false);
    }
  }, [orderId, navigate, t]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Analytics
  useEffect(() => {
    if (order) {
      trackEvent('order_detail_viewed', { order_id: orderId, status: order.status });
    }
  }, [order, orderId]);

  /* ── Derived state ── */
  const status = (order?.status || 'pending').toLowerCase();
  const canCancel = status === 'pending' || status === 'paid';
  const isDelivered = status === 'delivered';
  const isCancelled = ['cancelled', 'refunded', 'partially_refunded', 'payment_failed'].includes(status);

  // Normalize status for timeline position
  const normalizedStatus = useMemo(() => {
    if (status === 'pending') return 'paid';
    if (status === 'processing') return 'confirmed';
    if (status === 'in_transit') return 'shipped';
    return status;
  }, [status]);

  const currentStepIdx = STATUS_FLOW.indexOf(normalizedStatus);

  // Group items by producer
  const itemsByProducer = useMemo(() => {
    if (!order) return [];
    const items = order.items || order.line_items || [];
    const groups: Record<string, { producerId: string; producerName: string; items: any[] }> = {};
    for (const item of items) {
      const pid = item.producer_id || item.seller_id || 'unknown';
      const pname = item.producer_name || item.seller_name || item.store_name || '';
      if (!groups[pid]) groups[pid] = { producerId: pid, producerName: pname, items: [] };
      groups[pid].items.push(item);
    }
    return Object.values(groups);
  }, [order]);

  // Status timestamps from history
  const statusTimestamps = useMemo(() => {
    const ts: Record<string, string> = {};
    if (order?.status_history) {
      for (const entry of order.status_history) {
        ts[entry.status] = entry.timestamp;
      }
    }
    // Fallback timestamps from order fields
    if (order?.created_at && !ts.paid) ts.paid = order.created_at;
    if (order?.shipped_at && !ts.shipped) ts.shipped = order.shipped_at;
    if (order?.delivered_at && !ts.delivered) ts.delivered = order.delivered_at;
    if (order?.cancelled_at && !ts.cancelled) ts.cancelled = order.cancelled_at;
    return ts;
  }, [order]);

  /* ── Actions ── */
  const handleCancel = async () => {
    const msg = t(
      'order_tracking.cancel_confirm',
      'Estas seguro? El reembolso se procesara en 5-10 dias habiles.',
    );
    if (!window.confirm(msg)) return;
    setCancelLoading(true);
    try {
      await apiClient.post(`/orders/${orderId}/cancel`, {});
      toast.success(t('order_tracking.cancel_success', 'Pedido cancelado'));
      trackEvent('order_cancelled', { order_id: orderId });
      fetchOrder();
    } catch (error: any) {
      toast.error(error?.detail || error?.message || t('order_tracking.cancel_error', 'No se puede cancelar este pedido'));
    } finally {
      setCancelLoading(false);
    }
  };

  const handleReorder = async () => {
    setReorderLoading(true);
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
    } finally {
      setReorderLoading(false);
    }
  };

  const downloadInvoice = async () => {
    setInvoiceLoading(true);
    try {
      const data = await apiClient.get(`/invoices/order/${orderId}`);
      const cur = order?.currency || 'EUR';
      const itemsHtml = (data.items || [])
        .map(
          (it: any) =>
            `<tr><td style="padding:6px 12px">${it.name}</td><td style="padding:6px 12px;text-align:center">x${it.quantity}</td><td style="padding:6px 12px;text-align:right">${convertAndFormatPrice(Number(it.total), cur)}</td></tr>`,
        )
        .join('');
      const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Pedido ${data.invoice_number}</title>
<style>body{font-family:system-ui,sans-serif;max-width:600px;margin:40px auto;color:#1c1917}h1{font-size:20px}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #e7e5e4}th{text-align:left;padding:8px 12px;font-size:13px;color:#78716c}tfoot td{font-weight:600;border-top:2px solid #1c1917}.meta{color:#78716c;font-size:13px}</style></head>
<body><h1>Resumen de pedido ${data.invoice_number}</h1>
<p class="meta">${t('order_tracking.invoice_disclaimer', 'Este documento NO es una factura fiscal')}</p>
<p class="meta">Fecha: ${formatDate(data.date, language)}</p>
<p class="meta">Cliente: ${data.customer?.name || ''} · ${data.customer?.email || ''}</p>
<table><thead><tr><th>Producto</th><th style="text-align:center">Cant.</th><th style="text-align:right">Total</th></tr></thead>
<tbody>${itemsHtml}</tbody>
<tfoot><tr><td colspan="2" style="padding:6px 12px">Subtotal</td><td style="padding:6px 12px;text-align:right">${convertAndFormatPrice(Number(data.subtotal), cur)}</td></tr>
<tr><td colspan="2" style="padding:6px 12px">${t('order_tracking.shipping', 'Envio')}</td><td style="padding:6px 12px;text-align:right">${convertAndFormatPrice(Number(data.shipping), cur)}</td></tr>
<tr><td colspan="2" style="padding:6px 12px">IVA</td><td style="padding:6px 12px;text-align:right">${convertAndFormatPrice(Number(data.tax), cur)}</td></tr>
<tr><td colspan="2" style="padding:6px 12px;font-size:16px">TOTAL</td><td style="padding:6px 12px;text-align:right;font-size:16px">${convertAndFormatPrice(Number(data.total), cur)}</td></tr></tfoot></table>
<p class="meta" style="margin-top:20px">Estado: ${getStatusLabel(data.status, t)} · Pago: ${data.payment_method}</p></body></html>`;
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resumen_pedido_${orderId}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t('order_tracking.invoice_error', 'No se pudo descargar la factura'));
    } finally {
      setInvoiceLoading(false);
    }
  };

  /* ── Render ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 size={28} className="text-stone-500 animate-spin" />
      </div>
    );
  }

  if (!order) return null;

  const ref = `#HSP-${String(order.order_id || orderId).slice(-8).toUpperCase()}`;
  const orderCurrency = order.currency || 'EUR';
  const fmtPrice = (v: number) => convertAndFormatPrice(v, orderCurrency);

  const subtotalNum = order.subtotal_cents ? order.subtotal_cents / 100 : order.subtotal ? Number(order.subtotal) : null;
  const discountNum = order.discount_cents ? order.discount_cents / 100 : order.discount ? Number(order.discount) : null;
  const shippingNum = order.shipping_cents != null ? order.shipping_cents / 100 : order.shipping_amount != null ? Number(order.shipping_amount) : null;
  const totalNum = order.total_cents ? order.total_cents / 100 : order.total_amount ? Number(order.total_amount) : 0;

  const addr = order.shipping_address || order.address || {};
  const items = order.items || order.line_items || [];
  const producerIds = [...new Set(items.map((i: any) => i.producer_id || i.seller_id).filter(Boolean))] as string[];

  return (
    <div className="min-h-screen bg-stone-50 pb-[100px]">
      {/* Topbar */}
      <div className="sticky top-0 z-30 bg-white border-b border-stone-200 flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => navigate('/dashboard/orders')}
          className="bg-transparent border-none cursor-pointer p-1 flex min-w-[44px] min-h-[44px] items-center justify-center"
        >
          <ArrowLeft size={22} className="text-stone-950" />
        </button>
        <div>
          <span className="text-[15px] font-semibold text-stone-950">{ref}</span>
          <p className="text-[11px] text-stone-500 m-0">{formatDateTime(order.created_at, language)}</p>
        </div>
      </div>

      <div className="px-4 max-w-[800px] mx-auto pt-4">
        {/* ── Cancelled/Refunded Banner ── */}
        {isCancelled && (
          <div className="rounded-2xl p-4 mb-4 flex items-center gap-3 bg-stone-100 border border-stone-200">
            <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center flex-shrink-0">
              <XCircle size={20} className="text-stone-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-950">
                {status === 'refunded'
                  ? t('order_tracking.banner_refunded', 'Pedido reembolsado')
                  : status === 'partially_refunded'
                    ? t('order_tracking.banner_partial_refund', 'Reembolso parcial')
                    : status === 'payment_failed'
                      ? t('order_tracking.banner_payment_failed', 'Pago fallido')
                      : t('order_tracking.banner_cancelled', 'Pedido cancelado')}
              </p>
              <p className="text-xs text-stone-500">
                {status === 'refunded'
                  ? t('order_tracking.refund_timeline', 'El importe se reflejara en tu cuenta en 5-10 dias habiles')
                  : status === 'cancelled'
                    ? t('order_tracking.cancelled_message', 'Este pedido fue cancelado')
                    : ''}
              </p>
            </div>
          </div>
        )}

        {/* ── Status Timeline ── */}
        {!isCancelled && currentStepIdx >= 0 && (
          <div className="bg-white border border-stone-200 rounded-2xl p-5 mb-4">
            <SectionLabel>{t('order_tracking.order_status', 'ESTADO DEL PEDIDO')}</SectionLabel>
            <div className="flex items-start mt-3">
              {STATUS_FLOW.map((s, i) => {
                const isCompleted = i < currentStepIdx || (i === currentStepIdx && isDelivered);
                const isActive = i === currentStepIdx && !isDelivered;
                const isLast = i === STATUS_FLOW.length - 1;
                const ts = statusTimestamps[s];
                const StepIcon = STATUS_ICONS[s] || Package;

                return (
                  <React.Fragment key={s}>
                    <div className={`flex flex-col items-center ${isLast ? 'flex-none' : 'flex-1'}`}>
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center relative ${
                          isCompleted || isActive
                            ? 'bg-stone-950'
                            : 'bg-transparent border-2 border-stone-200'
                        }`}
                      >
                        {isCompleted ? (
                          <Check size={16} className="text-white" />
                        ) : isActive ? (
                          <StepIcon size={14} className="text-white" />
                        ) : (
                          <StepIcon size={14} className="text-stone-300" />
                        )}
                        {isActive && (
                          <motion.div
                            animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute -inset-1 rounded-full border-2 border-stone-950"
                          />
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-semibold mt-1.5 text-center whitespace-nowrap ${
                          isActive || isCompleted ? 'text-stone-950' : 'text-stone-400'
                        }`}
                      >
                        {getStatusLabel(s, t)}
                      </span>
                      {ts && (isCompleted || isActive) && (
                        <span className="text-[9px] text-stone-500 mt-0.5 text-center">
                          {formatDateTime(ts, language)}
                        </span>
                      )}
                    </div>
                    {!isLast && (
                      <div
                        className={`flex-1 h-0.5 mt-[15px] ${
                          i < currentStepIdx ? 'bg-stone-950' : 'bg-stone-200'
                        }`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* Tracking card */}
        {(status === 'shipped' || status === 'in_transit') && (
          <div className="bg-stone-100 border border-stone-200 rounded-2xl p-3.5 mb-4 flex items-center gap-2.5">
            <Truck size={20} className="text-stone-950" />
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-stone-950 m-0">
                {order.shipping_carrier || order.carrier || t('order_tracking.carrier', 'Transportista')}
                {order.tracking_number && ` · ${order.tracking_number}`}
              </p>
            </div>
            {order.tracking_url && (
              <a
                href={order.tracking_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent('order_tracking_clicked', { order_id: orderId })}
                className="flex items-center gap-1 text-[13px] font-semibold text-stone-950 no-underline"
              >
                {t('order_tracking.track', 'Rastrear')} <ExternalLink size={14} />
              </a>
            )}
          </div>
        )}

        {/* ── Desktop 2-col layout for products + sidebar ── */}
        <div className="lg:flex lg:gap-6">
          {/* Left column: Products */}
          <div className="lg:flex-1">
            {/* ── Products grouped by producer ── */}
            <SectionLabel>{t('order_tracking.products', 'PRODUCTOS')}</SectionLabel>
            {itemsByProducer.length > 0 ? (
              <div className="flex flex-col gap-3">
                {itemsByProducer.map(group => (
                  <div key={group.producerId} className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
                    {/* Producer header */}
                    {group.producerName && (
                      <div className="px-3.5 py-2.5 border-b border-stone-200 flex items-center gap-2">
                        <Package size={14} className="text-stone-500" />
                        <span className="text-[13px] font-semibold text-stone-950">
                          {group.producerName}
                        </span>
                      </div>
                    )}
                    {group.items.map((item: any, i: number) => (
                      <div
                        key={`${item.product_id || ''}-${item.variant_id || ''}-${i}`}
                        className={`flex items-center gap-3 p-3.5 ${
                          i < group.items.length - 1 ? 'border-b border-stone-200' : ''
                        }`}
                      >
                        <div className="w-14 h-14 rounded-xl bg-stone-100 overflow-hidden shrink-0">
                          {(item.image || item.product_image) && (
                            <img
                              loading="lazy"
                              src={item.image || item.product_image}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-stone-950 m-0">
                            {item.name || item.product_name}
                          </p>
                          <p className="text-xs text-stone-500 mt-0.5 mb-0">x{item.quantity}</p>
                        </div>
                        <span className="text-sm font-semibold text-stone-950 shrink-0">
                          {item.unit_price_cents
                            ? fmtPrice((item.unit_price_cents / 100) * item.quantity)
                            : item.price
                              ? fmtPrice(Number(item.price) * item.quantity)
                              : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
                {items.map((item: any, i: number) => (
                  <div
                    key={`${item.product_id || ''}-${item.variant_id || ''}-${i}`}
                    className={`flex items-center gap-3 p-3.5 ${
                      i < items.length - 1 ? 'border-b border-stone-200' : ''
                    }`}
                  >
                    <div className="w-14 h-14 rounded-xl bg-stone-100 overflow-hidden shrink-0">
                      {(item.image || item.product_image) && (
                        <img loading="lazy" src={item.image || item.product_image} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-950 m-0">{item.name || item.product_name}</p>
                      <p className="text-xs text-stone-500 mt-0.5 mb-0">x{item.quantity}</p>
                    </div>
                    <span className="text-sm font-semibold text-stone-950 shrink-0">
                      {item.unit_price_cents
                        ? fmtPrice((item.unit_price_cents / 100) * item.quantity)
                        : item.price
                          ? fmtPrice(Number(item.price) * item.quantity)
                          : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* ── Shipping Address ── */}
            <SectionLabel>{t('order_tracking.shipping_address', 'DIRECCION DE ENVIO')}</SectionLabel>
            <div className="bg-stone-100 rounded-2xl p-4">
              <p className="text-sm font-semibold text-stone-950 m-0">
                {addr.full_name || addr.name || ''}
              </p>
              <p className="text-[13px] text-stone-500 mt-1 mb-0 leading-normal">
                {addr.street}
                {addr.city ? `, ${addr.city}` : ''}
                {addr.postal_code ? ` ${addr.postal_code}` : ''}
                {addr.country ? `, ${addr.country}` : ''}
              </p>
              {addr.phone && <p className="text-[13px] text-stone-500 mt-0.5 mb-0">{addr.phone}</p>}
            </div>
          </div>

          {/* Right column (desktop sidebar): Price breakdown + Actions */}
          <div className="lg:w-[320px] lg:flex-shrink-0">
            {/* ── Payment Summary ── */}
            <SectionLabel>{t('order_tracking.payment_summary', 'DESGLOSE')}</SectionLabel>
            <div className="bg-white border border-stone-200 rounded-2xl p-4">
              <div className="flex flex-col gap-1.5">
                {subtotalNum != null && (
                  <PaymentRow label={t('order_tracking.subtotal', 'Subtotal')} value={fmtPrice(subtotalNum)} />
                )}
                {shippingNum != null && (
                  <PaymentRow
                    label={t('order_tracking.shipping', 'Envio')}
                    value={shippingNum === 0 ? t('order_tracking.free_shipping', 'Gratis') : fmtPrice(shippingNum)}
                  />
                )}
                {discountNum != null && discountNum > 0 && (
                  <PaymentRow
                    label={`${t('order_tracking.discount', 'Descuento')}${order.coupon_code ? ` (${order.coupon_code})` : ''}`}
                    value={`-${fmtPrice(discountNum)}`}
                  />
                )}
                <div className="h-px bg-stone-200 my-1" />
                <PaymentRow label={t('order_tracking.total_paid', 'Total pagado')} value={fmtPrice(totalNum)} bold />
              </div>
              <p className="text-[11px] text-stone-400 mt-2 mb-0">{t('order_tracking.tax_included', 'IVA incluido')}</p>
              {order.payment_method && (
                <p className="text-xs text-stone-500 mt-1 mb-0">
                  {t('order_tracking.payment_method', 'Metodo')}: {order.payment_method}
                </p>
              )}
            </div>

            {/* ── Actions ── */}
            {!isCancelled && (
              <>
                <SectionLabel>{t('order_tracking.actions', 'ACCIONES')}</SectionLabel>
                <div className="flex flex-col gap-2.5">
                  {/* Contact producer */}
                  {producerIds.length === 1 ? (
                    <button
                      onClick={() => navigate(`/messages/new?to=${producerIds[0]}`)}
                      className="w-full h-12 bg-white border border-stone-200 rounded-2xl text-sm font-semibold text-stone-950 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <MessageCircle size={16} />
                      {t('order_tracking.contact_producer', 'Contactar productor')}
                    </button>
                  ) : producerIds.length > 1 ? (
                    <div className="bg-white border border-stone-200 rounded-2xl p-3">
                      <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2">
                        {t('order_tracking.contact_producer', 'Contactar productor')}
                      </p>
                      {itemsByProducer.filter(g => g.producerId !== 'unknown').map(g => (
                        <button
                          key={g.producerId}
                          onClick={() => navigate(`/messages/new?to=${g.producerId}`)}
                          className="w-full flex items-center gap-2 px-3 py-2 mb-1 last:mb-0 bg-stone-50 rounded-xl text-sm text-stone-950 border-none cursor-pointer"
                        >
                          <MessageCircle size={14} />
                          {g.producerName || g.producerId}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {/* Report problem (F-1 — section 3.5) */}
                  <button
                    onClick={() => navigate(`/support/new?category=order_issue&order_id=${orderId}`)}
                    className="w-full h-12 bg-white border border-stone-200 rounded-2xl text-sm font-semibold text-stone-950 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <AlertCircle size={16} />
                    {t('order_tracking.report_problem', 'Reportar problema')}
                  </button>

                  {/* Reorder */}
                  <button
                    onClick={handleReorder}
                    disabled={reorderLoading}
                    className="w-full h-12 bg-white border border-stone-200 rounded-2xl text-sm font-semibold text-stone-950 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {reorderLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                    {t('order_tracking.reorder', 'Volver a pedir')}
                  </button>

                  {/* Leave review — only when delivered, per-product links */}
                  {isDelivered && (
                    <div className="bg-white border border-stone-200 rounded-2xl p-3">
                      <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2">
                        {t('order_tracking.leave_review', 'Dejar resena')}
                      </p>
                      {items.map((item: any, i: number) => (
                        <Link
                          key={`review-${item.product_id || i}`}
                          to={`/products/${item.product_id}#reviews`}
                          className="flex items-center gap-2 px-3 py-2 mb-1 last:mb-0 bg-stone-50 rounded-xl text-sm text-stone-950 no-underline"
                        >
                          <Star size={14} />
                          {item.name || item.product_name}
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Download invoice */}
                  <button
                    onClick={downloadInvoice}
                    disabled={invoiceLoading}
                    className={`w-full h-12 bg-stone-100 border-none rounded-2xl text-sm font-semibold text-stone-950 cursor-pointer flex items-center justify-center gap-2 ${
                      invoiceLoading ? 'opacity-50' : ''
                    }`}
                  >
                    {invoiceLoading ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                    {t('order_tracking.download_invoice', 'Descargar resumen')}
                  </button>

                  {/* Cancel order — only if status=paid */}
                  {canCancel && (
                    <button
                      onClick={handleCancel}
                      disabled={cancelLoading}
                      className="w-full h-11 bg-transparent border border-stone-200 rounded-xl text-sm font-semibold text-stone-700 cursor-pointer flex items-center justify-center gap-2"
                    >
                      {cancelLoading ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
                      {t('order_tracking.cancel_order', 'Cancelar pedido')}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
