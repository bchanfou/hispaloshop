// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { ArrowLeft, Truck, Check, Clock, Package, ExternalLink, Star, MessageCircle, Loader2, FileText, XCircle } from 'lucide-react';
import { useLocale } from '../../context/LocaleContext';
import { useTranslation } from 'react-i18next';
import i18n from "../../locales/i18n";
const STATUS_FLOW = ['confirmed', 'preparing', 'shipped', 'delivered'];
const STATUS_LABELS = {
  pending: 'Pendiente',
  paid: 'Pagado',
  processing: 'Procesando',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  shipped: 'Enviado',
  in_transit: 'Enviado',
  delivered: 'Entregado',
  completed: 'Completado',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
  partially_refunded: 'Reembolso parcial',
  payment_failed: 'Pago fallido'
};
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}
function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short'
  })} · ${d.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  })}`;
}
function SectionLabel({
  children
}) {
  return <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mt-6 mb-2">
      {children}
    </p>;
}
export default function OrderDetailPage() {
  const {
    orderId
  } = useParams();
  const navigate = useNavigate();
  const {
    convertAndFormatPrice,
    currency
  } = useLocale();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const fetchOrder = useCallback(async () => {
    try {
      const data = await apiClient.get(`/customer/orders/${orderId}`);
      setOrder(data);
    } catch (error) {
      toast.error(error?.status === 404 ? 'Pedido no encontrado' : i18n.t('order_detail.errorAlCargarElPedido', 'Error al cargar el pedido'));
      navigate('/dashboard/orders');
    } finally {
      setLoading(false);
    }
  }, [orderId, navigate]);
  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);
  const cancelOrder = async () => {
    if (!window.confirm('¿Estás seguro de que quieres cancelar este pedido?')) return;
    try {
      await apiClient.put(`/customer/orders/${orderId}/cancel`, {});
      toast.success('Pedido cancelado');
      fetchOrder();
    } catch (error) {
      toast.error(error?.message || 'No se puede cancelar este pedido');
    }
  };
  const submitReview = async () => {
    if (reviewRating === 0) {
      toast.error(i18n.t('recipe_detail.seleccionaUnaValoracion', 'Selecciona una valoración'));
      return;
    }
    setReviewSubmitting(true);
    try {
      await apiClient.post(`/customer/orders/${orderId}/review`, {
        rating: reviewRating,
        comment: reviewText
      });
      toast.success(i18n.t('order_detail.resenaPublicada', 'Reseña publicada'));
      setReviewSubmitted(true);
      setReviewRating(0);
      setReviewText('');
    } catch {
      toast.error(i18n.t('order_detail.errorAlPublicarLaResena', 'Error al publicar la reseña'));
    } finally {
      setReviewSubmitting(false);
    }
  };
  const INVOICE_STATUS_ES = {
    pending: 'Pendiente',
    paid: 'Pagado',
    confirmed: 'Confirmado',
    preparing: 'Preparando',
    shipped: 'Enviado',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
    refunded: 'Reembolsado'
  };
  const downloadInvoice = async () => {
    setInvoiceLoading(true);
    try {
      const data = await apiClient.get(`/invoices/order/${orderId}`);
      const cur = order?.currency || 'EUR';
      const itemsHtml = (data.items || []).map(it => `<tr><td style="padding:6px 12px">${it.name}</td><td style="padding:6px 12px;text-align:center">x${it.quantity}</td><td style="padding:6px 12px;text-align:right">${convertAndFormatPrice(Number(it.total), cur)}</td></tr>`).join('');
      const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Pedido ${data.invoice_number}</title>
<style>body{font-family:system-ui,sans-serif;max-width:600px;margin:40px auto;color:#1c1917}h1{font-size:20px}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #e7e5e4}th{text-align:left;padding:8px 12px;font-size:13px;color:#78716c}tfoot td{font-weight:600;border-top:2px solid #1c1917}.meta{color:#78716c;font-size:13px}</style></head>
<body><h1>Resumen de pedido ${data.invoice_number}</h1>
<p class="meta">{t('order_detail.esteDocumentoNoEsUnaFacturaFiscal', 'Este documento NO es una factura fiscal')}</p>
<p class="meta">Fecha: ${new Date(data.date).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })}</p>
<p class="meta">Cliente: ${data.customer?.name || ''} · ${data.customer?.email || ''}</p>
<table><thead><tr><th>Producto</th><th style="text-align:center">Cant.</th><th style="text-align:right">Total</th></tr></thead>
<tbody>${itemsHtml}</tbody>
<tfoot><tr><td colspan="2" style="padding:6px 12px">Subtotal</td><td style="padding:6px 12px;text-align:right">${convertAndFormatPrice(Number(data.subtotal), cur)}</td></tr>
<tr><td colspan="2" style="padding:6px 12px">{t('products.shippingCost', 'Envío')}</td><td style="padding:6px 12px;text-align:right">${convertAndFormatPrice(Number(data.shipping), cur)}</td></tr>
<tr><td colspan="2" style="padding:6px 12px">IVA</td><td style="padding:6px 12px;text-align:right">${convertAndFormatPrice(Number(data.tax), cur)}</td></tr>
<tr><td colspan="2" style="padding:6px 12px;font-size:16px">TOTAL</td><td style="padding:6px 12px;text-align:right;font-size:16px">${convertAndFormatPrice(Number(data.total), cur)}</td></tr></tfoot></table>
<p class="meta" style="margin-top:20px">Estado: ${INVOICE_STATUS_ES[data.status] || data.status} · Pago: ${data.payment_method}</p></body></html>`;
      const blob = new Blob([html], {
        type: 'text/html;charset=utf-8'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resumen_pedido_${orderId}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error(i18n.t('order_detail.noSePudoDescargarLaFactura', 'No se pudo descargar la factura'));
    } finally {
      setInvoiceLoading(false);
    }
  };
  if (loading) {
    return <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 size={28} className="text-stone-500 animate-spin" />
      </div>;
  }
  if (!order) return null;
  const status = (order.status || 'pending').toLowerCase();
  const canCancel = ['pending', 'processing', 'paid', 'confirmed'].includes(status);
  const isDelivered = status === 'delivered';
  const isCancelled = ['cancelled', 'refunded', 'partially_refunded', 'payment_failed'].includes(status);
  const normalizedStatus = status === 'pending' || status === 'paid' ? 'confirmed' : status === 'in_transit' ? 'shipped' : status;
  const currentStepIdx = STATUS_FLOW.indexOf(normalizedStatus);
  const ref = `#HSP-${String(order.order_id || orderId).slice(-8).toUpperCase()}`;
  const items = order.items || order.line_items || [];
  const orderCurrency = order.currency || 'EUR';
  const fmtPrice = v => convertAndFormatPrice(v, orderCurrency);
  const subtotalNum = order.subtotal_cents ? order.subtotal_cents / 100 : order.subtotal ? Number(order.subtotal) : null;
  const discountNum = order.discount_cents ? order.discount_cents / 100 : order.discount ? Number(order.discount) : null;
  const shippingNum = order.shipping_cents != null ? order.shipping_cents / 100 : order.shipping_amount != null ? Number(order.shipping_amount) : null;
  const totalNum = order.total_cents ? order.total_cents / 100 : order.total_amount ? Number(order.total_amount) : 0;
  const statusTimestamps = {};
  if (order.status_history) {
    order.status_history.forEach(entry => {
      statusTimestamps[entry.status] = entry.timestamp;
    });
  }
  const addr = order.shipping_address || order.address || {};
  return <div className="min-h-screen bg-stone-50 pb-[100px]">
      {/* Topbar */}
      <div className="sticky top-0 z-30 bg-white border-b border-stone-200 flex items-center gap-3 px-4 py-3">
        <button onClick={() => navigate('/dashboard/orders')} className="bg-transparent border-none cursor-pointer p-1 flex min-w-[44px] min-h-[44px] items-center justify-center">
          <ArrowLeft size={22} className="text-stone-950" />
        </button>
        <span className="text-[15px] font-semibold text-stone-950">{ref}</span>
      </div>

      <div className="px-4 max-w-[600px] mx-auto pt-4">
        {/* ── Cancelled/Refunded Banner ── */}
        {isCancelled && <div className={`rounded-2xl p-4 mb-4 flex items-center gap-3 ${status === 'refunded' ? 'bg-stone-100 border border-stone-200' : 'bg-stone-100 border border-stone-200'}`}>
            <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center flex-shrink-0">
              <XCircle size={20} className="text-stone-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-950">
                {status === 'refunded' ? 'Pedido reembolsado' : status === 'partially_refunded' ? 'Reembolso parcial' : status === 'payment_failed' ? 'Pago fallido' : 'Pedido cancelado'}
              </p>
              <p className="text-xs text-stone-500">
                {status === 'refunded' ? i18n.t('order_detail.elImporteSeReflejaraEnTuCuentaEn', 'El importe se reflejará en tu cuenta en 5-10 días hábiles') : status === 'partially_refunded' ? i18n.t('order_detail.seHaReembolsadoParteDelImporteATu', 'Se ha reembolsado parte del importe a tu cuenta') : status === 'payment_failed' ? i18n.t('order_detail.elPagoNoSePudoProcesarIntentaloD', 'El pago no se pudo procesar. Inténtalo de nuevo o contacta con soporte.') : 'Este pedido fue cancelado'}
              </p>
            </div>
          </div>}

        {/* ── Status Timeline ── */}
        {!isCancelled && currentStepIdx >= 0 && <div className="bg-white border border-stone-200 rounded-2xl p-5 mb-4">
            {/* Horizontal 4-step timeline */}
            <div className="flex items-start">
              {STATUS_FLOW.map((s, i) => {
            const isCompleted = i < currentStepIdx || i === currentStepIdx && isDelivered;
            const isActive = i === currentStepIdx && !isDelivered;
            const isPending = i > currentStepIdx;
            const isLast = i === STATUS_FLOW.length - 1;
            const ts = statusTimestamps[s];
            return <React.Fragment key={s}>
                    <div className={`flex flex-col items-center ${isLast ? 'flex-none' : 'flex-1'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center relative ${isCompleted || isActive ? 'bg-stone-950' : 'bg-transparent border-2 border-stone-200'}`}>
                        {isCompleted ? <Check size={16} className="text-white" /> : <span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-stone-500'}`}>
                            {i + 1}
                          </span>}
                        {isActive && <motion.div animate={{
                    scale: [1, 1.4, 1],
                    opacity: [0.4, 0, 0.4]
                  }} transition={{
                    duration: 2,
                    repeat: Infinity
                  }} className="absolute -inset-1 rounded-full border-2 border-stone-950" />}
                      </div>
                      <span className={`text-[10px] font-semibold mt-1.5 text-center whitespace-nowrap ${isActive || isCompleted ? 'text-stone-950' : 'text-stone-500'}`}>
                        {STATUS_LABELS[s] || s}
                      </span>
                      {ts && (isCompleted || isActive) && <span className="text-[9px] text-stone-500 mt-0.5 text-center">
                          {formatDateTime(ts)}
                        </span>}
                    </div>
                    {!isLast && <div className={`flex-1 h-0.5 mt-[15px] ${i < currentStepIdx ? 'bg-stone-950' : 'bg-stone-200'}`} />}
                  </React.Fragment>;
          })}
            </div>
          </div>}

        {/* Tracking card */}
        {(status === 'shipped' || status === 'in_transit') && <div className="bg-stone-100 border border-stone-200 rounded-2xl p-3.5 mb-4 flex items-center gap-2.5">
            <Truck size={20} className="text-stone-950" />
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-stone-950 m-0">
                {order.carrier || 'Transportista'} {order.tracking_number && `· ${order.tracking_number}`}
              </p>
            </div>
            {order.tracking_url && <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[13px] font-semibold text-stone-950 no-underline">
                Rastrear <ExternalLink size={14} />
              </a>}
          </div>}

        {/* ── Products ── */}
        <SectionLabel>PRODUCTOS</SectionLabel>
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
          {items.map((item, i) => <div key={`${item.product_id || ''}-${item.variant_id || ''}-${i}`} className={`flex items-center gap-3 p-3.5 ${i < items.length - 1 ? 'border-b border-stone-200' : ''}`}>
              <div className="w-14 h-14 rounded-xl bg-stone-100 overflow-hidden shrink-0">
                {(item.image || item.product_image) && <img loading="lazy" src={item.image || item.product_image} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-950 m-0">
                  {item.name || item.product_name}
                </p>
                <p className="text-xs text-stone-500 mt-0.5 mb-0">x{item.quantity}</p>
              </div>
              <span className="text-sm font-semibold text-stone-950 shrink-0">
                {item.unit_price_cents ? convertAndFormatPrice(item.unit_price_cents / 100 * item.quantity, order.currency || 'EUR') : item.price ? convertAndFormatPrice(Number(item.price) * item.quantity, order.currency || 'EUR') : ''}
              </span>
            </div>)}
        </div>

        {/* ── Shipping Address ── */}
        <SectionLabel>DIRECCIÓN DE ENVÍO</SectionLabel>
        <div className="bg-stone-100 rounded-2xl p-4">
          <p className="text-sm font-semibold text-stone-950 m-0">
            {addr.full_name || addr.name || ''}
          </p>
          <p className="text-[13px] text-stone-500 mt-1 mb-0 leading-normal">
            {addr.street}{addr.city ? `, ${addr.city}` : ''}{addr.postal_code ? ` ${addr.postal_code}` : ''}
            {addr.country ? `, ${addr.country}` : ''}
          </p>
          {addr.phone && <p className="text-[13px] text-stone-500 mt-0.5 mb-0">{addr.phone}</p>}
        </div>

        {/* ── Payment Summary ── */}
        <SectionLabel>RESUMEN DE PAGO</SectionLabel>
        <div className="bg-white border border-stone-200 rounded-2xl p-4">
          <div className="flex flex-col gap-1.5">
            {subtotalNum != null && <PaymentRow label="Subtotal" value={fmtPrice(subtotalNum)} />}
            {discountNum != null && discountNum > 0 && <PaymentRow label="Descuento" value={`-${fmtPrice(discountNum)}`} />}
            {shippingNum != null && <PaymentRow label={i18n.t('products.shippingCost', 'Envío')} value={shippingNum === 0 ? 'Gratis' : fmtPrice(shippingNum)} />}
            <div className="h-px bg-stone-200 my-1" />
            <PaymentRow label="Total" value={fmtPrice(totalNum)} bold />
          </div>
          {order.payment_method && <p className="text-xs text-stone-500 mt-3">
              Método: {order.payment_method}
            </p>}
          <p className="text-xs text-stone-500 mt-1">
            Fecha: {formatDate(order.created_at)}
          </p>
        </div>

        {/* ── Sellers ── */}
        {order.seller_name && <>
            <SectionLabel>VENDEDORES</SectionLabel>
            <div className="bg-white border border-stone-200 rounded-2xl p-3.5 flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-stone-100 overflow-hidden shrink-0 flex items-center justify-center">
                {order.seller_avatar ? <img loading="lazy" src={order.seller_avatar} alt="" className="w-full h-full object-cover" /> : <Package size={18} className="text-stone-500" />}
              </div>
              <span className="flex-1 text-sm font-medium text-stone-950">
                {order.seller_name}
              </span>
              <button onClick={() => {
            if (order.producer_id) navigate(`/messages/new?to=${order.producer_id}`);
          }} className="flex items-center gap-1 px-3.5 py-1.5 bg-white border border-stone-200 rounded-xl text-[13px] font-semibold text-stone-950 cursor-pointer">
                <MessageCircle size={14} /> Contactar
              </button>
            </div>
          </>}

        {/* ── Review form (if delivered and not yet submitted) ── */}
        {isDelivered && !reviewSubmitted && !order.has_review && <div className="bg-stone-100 border border-stone-200 rounded-2xl p-4 mt-6">
            <p className="text-[15px] font-semibold text-stone-950 mb-3">
              ¿Cómo fue tu experiencia?
            </p>
            {/* Stars */}
            <div className="flex gap-1 mb-3">
              {[1, 2, 3, 4, 5].map(s => <button key={s} onClick={() => setReviewRating(s)} className="bg-transparent border-none cursor-pointer p-1.5 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label={`${s} estrellas`}>
                  <Star size={28} fill={s <= reviewRating ? '#0c0a09' : 'none'} color={s <= reviewRating ? '#0c0a09' : '#e7e5e4'} />
                </button>)}
            </div>
            <textarea value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder={i18n.t('order_detail.dejaUnaResena', 'Deja una reseña...')} rows={3} className="w-full p-3 text-sm border border-stone-200 rounded-xl bg-white text-stone-950 outline-none resize-y box-border" />
            <button onClick={submitReview} disabled={reviewSubmitting} className="mt-2.5 px-5 py-2.5 min-h-[44px] bg-stone-950 text-white border-none rounded-xl text-[13px] font-semibold cursor-pointer">
              {reviewSubmitting ? 'Publicando...' : i18n.t('order_detail.publicarResena', 'Publicar reseña')}
            </button>
          </div>}
        {isDelivered && reviewSubmitted && <p className="text-sm text-stone-500 mt-6">{i18n.t('order_detail.resenaEnviadaGracias', 'Reseña enviada. ¡Gracias!')}</p>}

        {/* ── Actions ── */}
        {!isCancelled && <div className="mt-6 flex flex-col gap-2.5">
            <button onClick={downloadInvoice} disabled={invoiceLoading} className={`w-full h-12 bg-stone-100 border-none rounded-2xl text-sm font-semibold text-stone-950 cursor-pointer flex items-center justify-center gap-2 ${invoiceLoading ? 'opacity-50' : ''}`}>
              {invoiceLoading ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
              Descargar resumen
            </button>

            <button onClick={() => navigate('/help')} className="w-full h-11 bg-white border border-stone-200 rounded-xl text-sm font-semibold text-stone-950 cursor-pointer">
              Contactar con soporte
            </button>

            {canCancel && <button onClick={cancelOrder} className="w-full h-11 bg-transparent border border-stone-200 rounded-xl text-sm font-semibold text-stone-700 cursor-pointer">
                Cancelar pedido
              </button>}
          </div>}
      </div>
    </div>;
}
function PaymentRow({
  label,
  value,
  bold
}) {
  return <div className="flex justify-between items-center">
      <span className="text-[13px] text-stone-500">{label}</span>
      <span className={`${bold ? 'text-lg font-bold' : 'text-sm font-medium'} text-stone-950`}>{value}</span>
    </div>;
}