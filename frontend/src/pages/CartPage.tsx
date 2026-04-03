// @ts-nocheck
import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import BackButton from '../components/BackButton';
import Breadcrumbs from '../components/Breadcrumbs';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { toast } from 'sonner';
import { Trash2, Mail, CheckCircle, AlertTriangle, Tag, X, AlertCircle, MapPin, Plus, Minus, Check, Clock, RefreshCw, Truck, Package, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { useCartAddresses, useCartCheckout, useCartPricing, useCartVerification } from '../features/cart/hooks';
import { useTranslation } from 'react-i18next';

/* ── ShippingProgressBar — per-store free-shipping progress ── */
import i18n from "../locales/i18n";
function ShippingProgressBar({
  store,
  currencyCode = 'EUR'
}) {
  const fmtCents = cents => ((cents || 0) / 100).toLocaleString(undefined, {
    style: 'currency',
    currency: currencyCode
  });
  if (store.threshold_cents == null) {
    return <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {store.seller_avatar ? <img loading="lazy" src={store.seller_avatar} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" /> : <Package className="w-4 h-4 text-stone-400 flex-shrink-0" />}
          <span className="text-sm text-stone-950 truncate">{store.seller_name}</span>
        </div>
        <span className="text-sm font-semibold text-stone-950 flex-shrink-0">{fmtCents(store.shipping_cents)}</span>
      </div>;
  }
  const pct = store.progress_pct || 0;
  const barColor = store.is_free ? 'bg-stone-950' : pct >= 60 ? 'bg-stone-700' : 'bg-stone-400';
  return <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 min-w-0">
          {store.seller_avatar ? <img loading="lazy" src={store.seller_avatar} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" /> : <Package className="w-4 h-4 text-stone-400 flex-shrink-0" />}
          <span className="text-sm text-stone-950 truncate">{store.seller_name}</span>
        </div>
        {store.is_free ? <span className="text-xs font-bold text-stone-950 flex-shrink-0">{i18n.t('common.freeShipping', 'Envío gratis')}</span> : <span className="text-sm font-semibold text-stone-950 flex-shrink-0">{fmtCents(store.shipping_cents)}</span>}
      </div>
      <div className="h-1.5 w-full rounded-full bg-stone-100 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{
        width: `${pct}%`
      }} />
      </div>
      {!store.is_free && store.remaining_cents > 0 && <p className="text-[11px] text-stone-500 mt-0.5">
          Faltan {fmtCents(store.remaining_cents)} para envío gratis
        </p>}
    </div>;
}

/* ── StockHoldTimer — countdown for soft-hold reservation ── */
function StockHoldTimer({
  expiresAt
}) {
  const [remaining, setRemaining] = useState('');
  const [isExpiring, setIsExpiring] = useState(false);
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    if (!expiresAt) return;
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setRemaining('Reserva expirada');
        setExpired(true);
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor(diff % 60000 / 1000);
      setRemaining(`${mins}:${secs.toString().padStart(2, '0')}`);
      setIsExpiring(diff < 3 * 60 * 1000);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);
  if (!expiresAt) return null;
  return <div className={`flex items-center gap-1 text-[11px] font-semibold mt-1 ${expired ? 'text-stone-950' : isExpiring ? 'text-stone-700' : 'text-stone-500'}`}>
      <Clock className="w-3 h-3" />
      {expired ? 'Reserva expirada' : `Reservado ${remaining}`}
    </div>;
}
const addressSchema = z.object({
  name: z.string().optional(),
  full_name: z.string().min(2, 'Nombre completo requerido'),
  phone: z.string().optional(),
  street: z.string().min(5, "Dirección requerida"),
  city: z.string().min(2, 'Ciudad requerida'),
  postal_code: z.string().regex(/^\d{4,10}$/, "Código postal no válido"),
  country: z.string().min(2, "País requerido"),
  is_default: z.boolean().optional()
});
export default function CartPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    user,
    loading: authLoading,
    checkAuth
  } = useAuth();
  const {
    cartItems,
    removeFromCart,
    updateQuantity,
    loading: cartLoading,
    appliedDiscount,
    applyDiscount,
    removeDiscount,
    fetchCart,
    getShippingPreview
  } = useCart();
  const {
    t,
    currency,
    getExchangeRateDisplay,
    countries,
    country
  } = useLocale();
  const [verificationToken, setVerificationToken] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [discountLoading, setDiscountLoading] = useState(false);
  const [imgError, setImgError] = useState<Record<string, boolean>>({});
  // shippingData from separate API no longer needed — shipping_breakdown comes from GET /cart via cartSummary
  const {
    emailVerified,
    verifying,
    resending,
    verifyEmail,
    resendVerification,
    refetch: refetchVerification
  } = useCartVerification();
  const {
    savedAddresses,
    defaultAddressId,
    createAddress,
    savingAddress,
    isLoading: addressesLoading
  } = useCartAddresses();
  const {
    cartSummary,
    stockIssues,
    refetch: refetchPricing
  } = useCartPricing(cartItems, appliedDiscount);
  const {
    checkoutLoading,
    createCheckout
  } = useCartCheckout();

  // Guest pricing fallback — server pricing requires auth, so compute from cartItems directly
  const guestSubtotal = useMemo(() => {
    if (user) return null; // logged-in users use server pricing
    return cartItems.reduce((sum, item) => sum + (item.unit_price_cents || 0) * (item.quantity || 1), 0);
  }, [user, cartItems]);
  const displaySubtotal = user ? cartSummary.subtotal_cents ?? 0 : guestSubtotal ?? 0;
  const displayTotal = user ? cartSummary.total_cents ?? 0 : guestSubtotal ?? 0; // guests don't have shipping/discount yet
  const {
    register: registerAddr,
    handleSubmit: handleAddrSubmit,
    reset: resetAddr,
    formState: {
      errors: addrErrors
    }
  } = useForm({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      country: 'ES',
      is_default: false
    }
  });

  function getSelectedAddress() {
    return savedAddresses.find(address => address.address_id === selectedAddressId);
  }

  // Allow guests to view their cart — checkout button will prompt login
  const isGuest = !authLoading && !user;

  // CT-05: Shared checkout disable logic (used by desktop + mobile buttons)
  const checkoutDisabled = !isGuest && (checkoutLoading || !emailVerified || stockIssues.length > 0 || !getSelectedAddress() || showNewAddressForm);
  const checkoutEnabled = isGuest || !checkoutDisabled;

  // Shipping data now comes from GET /cart response (cartSummary.shipping_breakdown)
  // No separate shipping preview call needed

  useEffect(() => {
    if (!addressesLoading && savedAddresses.length === 0) {
      setShowNewAddressForm(true);
    }
  }, [addressesLoading, savedAddresses.length]);
  useEffect(() => {
    if (savedAddresses.length > 0 && !selectedAddressId) {
      setSelectedAddressId(defaultAddressId);
    }
  }, [defaultAddressId, savedAddresses.length, selectedAddressId]);
  const handleSaveNewAddress = async data => {
    try {
      await createAddress({
        ...data,
        name: data.name || t('checkout.newAddress') || 'Nueva dirección',
        is_default: data.is_default ?? false
      });
      setShowNewAddressForm(false);
      resetAddr({
        country: 'ES',
        is_default: false
      });
      toast.success(t('success.saved'));
    } catch (error) {
      toast.error(error?.message || t('errors.generic'));
    }
  };
  const handleVerifyEmail = async () => {
    if (!verificationToken.trim()) {
      toast.error(t('checkout.verificationCodePlaceholder'));
      return;
    }
    try {
      await verifyEmail(verificationToken);
      toast.success(t('checkout.emailVerifiedSuccess'));
      checkAuth();
      await refetchVerification();
    } catch (error) {
      toast.error(error?.message || t('checkout.invalidCode'));
    }
  };
  const handleResendVerification = async () => {
    try {
      await resendVerification();
      toast.success(t('checkout.verificationSent') || 'Código enviado. Revisa tu email.');
    } catch (error) {
      toast.error(error?.message || t('checkout.failedResend'));
    }
  };
  const handleApplyDiscount = async () => {
    const trimmedCode = discountCode.trim().toUpperCase();
    if (!trimmedCode) {
      toast.error(t('cart.enterDiscountCode', 'Introduce un código de descuento'));
      return;
    }
    // CT-06: Check if same code already applied
    if (appliedDiscount?.code?.toUpperCase() === trimmedCode) {
      toast.error(t('cart.codeAlreadyApplied', 'Este código ya está aplicado'));
      return;
    }
    setDiscountLoading(true);
    try {
      const result = await applyDiscount(trimmedCode);
      if (!result?.success) {
        throw new Error(result?.error || t('errors.generic'));
      }
      await refetchPricing();
      setDiscountCode('');
      toast.success(t('success.added'));
    } catch (error) {
      toast.error(error?.message || t('errors.generic'));
    } finally {
      setDiscountLoading(false);
    }
  };
  const handleRemoveDiscount = async () => {
    setDiscountLoading(true);
    try {
      const result = await removeDiscount();
      if (!result?.success) {
        throw new Error(result?.error || t('errors.generic'));
      }
      await refetchPricing();
      toast.success(t('success.deleted'));
    } catch (error) {
      toast.error(error?.message || t('errors.generic'));
    } finally {
      setDiscountLoading(false);
    }
  };
  const estimatedDelivery = useMemo(() => {
    // Calculate today + 3-5 business days (skip weekends) — memoized, computed once
    const addBusinessDays = (date, days) => {
      let d = new Date(date);
      let added = 0;
      while (added < days) {
        d.setDate(d.getDate() + 1);
        if (d.getDay() !== 0 && d.getDay() !== 6) added++;
      }
      return d;
    };
    const today = new Date();
    const fmt = d => d.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
    return `${fmt(addBusinessDays(today, 3))} — ${fmt(addBusinessDays(today, 5))}`;
  }, []);

  // getDiscountedTotal is no longer needed — cartSummary.totalCents is the source of truth

  const handleCheckout = async () => {
    if (isGuest) {
      navigate('/login?redirect=/cart');
      return;
    }
    if (checkoutLoading) return; // Prevent double-submit
    if (cartItems.length === 0) {
      toast.error(t('cart.empty'));
      return;
    }
    if (!emailVerified) {
      toast.error(t('errors.unauthorized'));
      return;
    }
    if (stockIssues.length > 0) {
      toast.error(t('errors.generic'));
      return;
    }
    const selectedAddress = getSelectedAddress();
    if (!selectedAddress) {
      toast.error(t('checkout.selectAddress') || 'Selecciona una dirección de envío');
      return;
    }
    const addressToUse = {
      full_name: selectedAddress?.full_name,
      street: selectedAddress?.street,
      city: selectedAddress?.city,
      postal_code: selectedAddress?.postal_code,
      country: selectedAddress?.country,
      phone: selectedAddress?.phone || ''
    };
    try {
      const response = await createCheckout({
        shippingAddress: addressToUse,
        origin: window.location.origin
      });
      window.location.href = response.url;
    } catch (error) {
      if (error?.data?.detail?.issues) {
        error.data.detail.issues.forEach(issue => toast.error(issue));
      } else {
        toast.error(error?.message || t('checkout.checkoutFailed'));
      }
    }
  };
  const qtyDebounceRef = useRef({});
  // Cleanup debounce timers on unmount
  useEffect(() => () => {
    Object.values(qtyDebounceRef.current).forEach(clearTimeout);
  }, []);
  const handleUpdateQuantity = useCallback((item, newQuantity) => {
    const key = `${item.product_id}-${item.variant_id || ''}-${item.pack_id || ''}`;
    // Optimistic UI update is instant (CartContext handles it)
    updateQuantity(item.product_id, newQuantity, item.variant_id || null, item.pack_id || null).catch(error => toast.error(error?.message || t('cart.noSePudoActualizarLaCantidad', 'No se pudo actualizar la cantidad')));
    // Debounce the server-side refetch to avoid rapid-fire API calls
    clearTimeout(qtyDebounceRef.current[key]);
    qtyDebounceRef.current[key] = setTimeout(() => {
      queryClient.invalidateQueries({
        queryKey: ['cart']
      });
      refetchPricing();
    }, 500);
  }, [updateQuantity, queryClient, refetchPricing]);
  const handleRemoveItem = async item => {
    try {
      await removeFromCart(item.product_id, item.variant_id, item.pack_id);
      queryClient.invalidateQueries({
        queryKey: ['cart']
      });
      refetchPricing();
    } catch (error) {
      toast.error(error?.message || t('cart.noSePudoEliminarElProducto', 'No se pudo eliminar el producto'));
    }
  };
  const shippingBreakdown = cartSummary.shipping_breakdown || [];
  const groupedItems = useMemo(() => {
    const groups = {};
    cartItems.forEach(item => {
      const key = item.seller_id || 'unknown';
      const label = item.seller_name || item.producer || item.product?.producer?.name || 'Tienda';
      if (!groups[key]) groups[key] = {
        label,
        items: []
      };
      groups[key].items.push(item);
    });
    return Object.entries(groups); // [[sellerId, { label, items }], ...]
  }, [cartItems]);
  const formatCurrency = cents => {
    if (cents == null || isNaN(cents)) return '0,00\u00a0\u20ac';
    return (cents / 100).toLocaleString('es-ES', {
      style: 'currency',
      currency: currency || 'EUR'
    });
  };
  if (authLoading) {
    return <div className="min-h-screen bg-stone-50 pt-14">
        <div className="max-w-[600px] mx-auto px-4 py-6 flex flex-col gap-4">
          {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-2xl p-4 flex gap-3 animate-pulse">
              <div className="w-16 h-16 bg-stone-200 rounded-xl flex-shrink-0" />
              <div className="flex-1 flex flex-col gap-2">
                <div className="h-4 bg-stone-200 rounded w-3/4" />
                <div className="h-3 bg-stone-100 rounded w-1/2" />
                <div className="h-4 bg-stone-200 rounded w-1/4 mt-1" />
              </div>
            </div>)}
          <div className="bg-white rounded-2xl p-4 animate-pulse">
            <div className="h-4 bg-stone-200 rounded w-1/3 mb-3" />
            <div className="h-3 bg-stone-100 rounded w-full mb-2" />
            <div className="h-3 bg-stone-100 rounded w-2/3 mb-4" />
            <div className="h-12 bg-stone-200 rounded-full" />
          </div>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-stone-50 pt-14">
      <div className="max-w-[600px] lg:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-12 pb-32 md:pb-12">
        <div className="hidden md:block">
          <Breadcrumbs className="mb-6" />
        </div>
        <div className="mb-4 md:mb-6 hidden md:block">
          <BackButton label={t('checkout.continueShopping')} />
        </div>
        <h1 className="text-[18px] font-semibold text-stone-950 mb-4 md:mb-6" data-testid="cart-page-title">
          {t('cart.title')}
        </h1>

        {user && emailVerified === false && <div className="mb-8 rounded-2xl shadow-sm bg-white p-6" data-testid="verification-banner">
            <div className="flex items-start gap-4">
              <AlertTriangle className="mt-0.5 h-6 w-6 text-stone-700" />
              <div className="flex-1">
                <h3 className="mb-2 font-semibold text-stone-950">{t('checkout.verifyEmail')}</h3>
                <p className="mb-4 text-stone-500">{t('checkout.verifyEmailMessage')} ({user.email})</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex gap-2 flex-1">
                    <input placeholder={t('checkout.verificationCodePlaceholder')} value={verificationToken} onChange={event => setVerificationToken(event.target.value)} className="flex-1 max-w-xs h-12 rounded-xl border border-stone-200 bg-white px-3 text-sm outline-none focus:border-stone-400 transition-colors" aria-label={t('checkout.verificationCodePlaceholder')} data-testid="verification-input" />
                    <button type="button" onClick={handleVerifyEmail} disabled={verifying} className="rounded-2xl bg-stone-950 px-4 py-2.5 min-h-[44px] text-[13px] font-medium text-white transition-colors hover:bg-stone-800 disabled:opacity-50" data-testid="verify-button" aria-label="Verificar email">
                      {verifying ? t('checkout.verifying') : t('checkout.verify')}
                    </button>
                  </div>
                  <button type="button" onClick={handleResendVerification} disabled={resending} className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 px-4 py-2.5 min-h-[44px] text-[13px] font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-50" data-testid="resend-button">
                    <Mail className="w-4 h-4" />
                    {resending ? t('checkout.sending') : t('checkout.resendCode')}
                  </button>
                </div>
              </div>
            </div>
          </div>}

        {user && emailVerified === true && <div className="mb-6 inline-flex items-center gap-2 rounded-2xl shadow-sm bg-white px-4 py-3" data-testid="verified-badge">
            <CheckCircle className="h-5 w-5 text-stone-950" />
            <span className="font-medium text-stone-950">{t('checkout.emailVerified', 'Email verificado')}</span>
          </div>}

        {cartLoading ? <div className="max-w-[600px] mx-auto flex flex-col gap-4">
            {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-2xl p-4 flex gap-3 animate-pulse">
                <div className="w-16 h-16 bg-stone-200 rounded-xl flex-shrink-0" />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="h-4 bg-stone-200 rounded w-3/4" />
                  <div className="h-3 bg-stone-100 rounded w-1/2" />
                  <div className="h-4 bg-stone-200 rounded w-1/4 mt-1" />
                </div>
              </div>)}
            <div className="bg-white rounded-2xl p-4 animate-pulse">
              <div className="h-4 bg-stone-200 rounded w-1/3 mb-3" />
              <div className="h-3 bg-stone-100 rounded w-full mb-2" />
              <div className="h-3 bg-stone-100 rounded w-2/3 mb-4" />
              <div className="h-12 bg-stone-200 rounded-full" />
            </div>
          </div> : cartItems.length === 0 ? <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package size={48} className="text-stone-300 mb-4" />
            <p className="text-lg font-semibold text-stone-950 mb-1">{t('cart.empty', 'Tu carrito está vacío')}</p>
            <p className="text-sm text-stone-500 mb-6">{t('cart.descubreProductosIncreiblesDeProduct', 'Descubre productos increíbles de productores locales')}</p>
            <motion.button whileTap={{
          scale: 0.96
        }} onClick={() => navigate('/discover')} className="bg-stone-950 text-white rounded-full px-8 py-3 text-sm font-semibold hover:bg-stone-800 transition-colors">
              Explorar productos
            </motion.button>
          </div> : <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {/* Reservation expired banner */}
              {cartItems.some(i => i.hold_expires_at && new Date(i.hold_expires_at).getTime() < Date.now()) && <div className="flex items-center justify-between gap-3 rounded-2xl shadow-sm bg-white border border-stone-200 p-3">
                  <div className="flex items-center gap-2 text-sm text-stone-700">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{t('cart.laReservaDeAlgunProductoExpiroCom', 'La reserva de algún producto expiró. Comprueba disponibilidad.')}</span>
                  </div>
                  <button type="button" onClick={() => {
              fetchCart();
              refetchPricing();
            }} className="shrink-0 flex items-center gap-1.5 rounded-2xl bg-stone-950 px-3 py-2.5 min-h-[44px] text-xs font-medium text-white hover:bg-stone-800 transition-colors">
                    <RefreshCw className="w-3 h-3" />
                    Actualizar
                  </button>
                </div>}
              {groupedItems.map(([sellerId, group]) => {
            const producerName = group.label;
            const items = group.items;
            // Match shipping breakdown from backend by seller_id
            const breakdown = shippingBreakdown.find(b => b.seller_id === sellerId);
            return <div key={sellerId} className="space-y-3">
                    <div className="rounded-xl bg-white p-3 shadow-sm">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-stone-400 flex-shrink-0" />
                        <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide flex-1 truncate">{producerName}</span>
                        <span className="text-xs text-stone-400">{items.length} {items.length === 1 ? 'producto' : 'productos'}</span>
                      </div>
                      {/* Per-producer shipping progress bar from backend */}
                      {breakdown ? <div className="mt-2">
                          {breakdown.is_free_shipping ? <div className="flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5 text-stone-950 flex-shrink-0" />
                              <span className="text-xs font-semibold text-stone-950">{t('common.freeShipping', 'Envío gratis')}</span>
                            </div> : <div className="flex items-center gap-1.5 text-xs text-stone-600">
                              <Truck className="w-3.5 h-3.5 flex-shrink-0" />
                              <span>Te faltan {formatCurrency(breakdown.remaining_for_free_cents)} para envío gratis</span>
                            </div>}
                          <div className="h-1.5 w-full rounded-full bg-stone-200 overflow-hidden mt-1.5">
                            <div className={`h-full rounded-full transition-all duration-500 ${breakdown.is_free_shipping ? 'bg-stone-950' : breakdown.progress_pct >= 60 ? 'bg-stone-700' : 'bg-stone-400'}`} style={{
                      width: `${breakdown.progress_pct}%`
                    }} />
                          </div>
                        </div> : <div className="flex items-center gap-1.5 text-xs text-stone-500 mt-2">
                          <Truck className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{t('cart.calculandoEnvio', 'Calculando envío...')}</span>
                        </div>}
                    </div>
                    <AnimatePresence>
                    {items.map((item, index) => {
                  const hasStockIssue = stockIssues.some(issue => issue.product_id === item.product_id && (issue.variant_id || null) === (item.variant_id || null) && (issue.pack_id || null) === (item.pack_id || null));
                  const itemKey = `${item.product_id}-${item.variant_id || ''}-${item.pack_id || ''}`;
                  return <motion.div layout initial={{
                    opacity: 0,
                    y: 20
                  }} animate={{
                    opacity: 1,
                    y: 0
                  }} exit={{
                    opacity: 0,
                    x: -100
                  }} transition={{
                    duration: 0.3,
                    delay: index * 0.05
                  }} key={itemKey} className={`flex items-start gap-3 rounded-2xl border bg-white p-3 md:items-center md:gap-6 md:p-6 ${hasStockIssue ? 'border-stone-950 bg-stone-100' : 'border-stone-200'}`} data-testid={`cart-item-${itemKey}`}>
                          <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-stone-100 overflow-hidden flex-shrink-0">
                            {(item.product_image || item.image) && !imgError[itemKey] ? <img src={item.product_image || item.image} alt={item.product_name} loading="lazy" className="h-full w-full object-cover" onError={() => setImgError(prev => ({
                        ...prev,
                        [itemKey]: true
                      }))} /> : <div className="w-full h-full flex items-center justify-center">
                                <Package size={20} className="text-stone-400" />
                              </div>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-medium text-stone-950 text-sm md:text-base line-clamp-2">{item.product_name}</h3>
                              {item.stock != null && item.stock <= 5 && item.stock > 0 && <span className="text-xs font-semibold text-stone-700 bg-stone-100 rounded-full px-2 py-0.5 flex-shrink-0">¡Quedan {item.stock}!</span>}
                            </div>
                            {(item.variant_name || item.pack_label) && <p className="text-xs md:text-sm text-stone-500">
                                {item.variant_name && <span>{item.variant_name}</span>}
                                {item.variant_name && item.pack_label && <span> · </span>}
                                {item.pack_label && <span>{item.pack_label}</span>}
                              </p>}
                            <div className="flex items-center justify-between mt-1 md:mt-2">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <motion.button whileTap={item.quantity > 1 ? {
                              scale: 0.88
                            } : undefined} type="button" onClick={() => item.quantity > 1 ? handleUpdateQuantity(item, item.quantity - 1) : handleRemoveItem(item)} className={`w-11 h-11 rounded-full border flex items-center justify-center transition-colors ${item.quantity <= 1 ? 'border-stone-100 bg-stone-50' : 'border-stone-200 hover:bg-stone-50'}`} aria-label={item.quantity <= 1 ? `Eliminar ${item.product_name}` : `Disminuir cantidad de ${item.product_name}`}>
                                    {item.quantity <= 1 ? <Trash2 className="w-3.5 h-3.5 text-stone-400" /> : <Minus className="w-4 h-4 text-stone-950" />}
                                  </motion.button>
                                  <span className="w-6 text-center text-sm font-semibold text-stone-950" aria-live="polite" aria-label={`Cantidad: ${item.quantity}`}>{item.quantity}</span>
                                  <motion.button whileTap={!(item.stock != null && item.quantity >= item.stock) ? {
                              scale: 0.88
                            } : undefined} type="button" onClick={() => handleUpdateQuantity(item, item.quantity + 1)} disabled={item.stock != null && item.quantity >= item.stock} className={`w-11 h-11 rounded-full border flex items-center justify-center transition-colors ${item.stock != null && item.quantity >= item.stock ? 'border-stone-100 bg-stone-50 opacity-40 cursor-not-allowed' : 'border-stone-200 hover:bg-stone-50'}`} aria-label={item.stock != null && item.quantity >= item.stock ? t('cart.maximoAlcanzado', 'Máximo alcanzado') : `Aumentar cantidad de ${item.product_name}`}>
                                    <Plus className="w-4 h-4 text-stone-950" />
                                  </motion.button>
                                </div>
                                <p className="text-sm font-bold text-stone-950 md:text-base">
                                  {formatCurrency((item.unit_price_cents || 0) * item.quantity)}
                                </p>
                              </div>
                              <button onClick={() => handleRemoveItem(item)} className="rounded-full p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-stone-400 transition-colors hover:text-stone-950 hover:bg-stone-50 md:hidden" aria-label={`Eliminar ${item.product_name}`} data-testid={`remove-item-${itemKey}-mobile`}>
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            {/* Delivery estimate per item */}
                            <p className="text-[11px] text-stone-400 mt-1">
                              <Calendar className="w-3 h-3 inline mr-0.5 -mt-px" />
                              Entrega estimada: {estimatedDelivery}
                            </p>
                            {/* Stock hold timer */}
                            <StockHoldTimer expiresAt={item.hold_expires_at} />
                            {hasStockIssue && <div className="mt-1 flex items-center gap-1 text-xs text-stone-700">
                                <AlertCircle className="w-3 h-3" />
                                <span>{stockIssues?.find(issue => issue.product_id === item.product_id)?.stock_message}</span>
                              </div>}
                          </div>
                          <button onClick={() => handleRemoveItem(item)} className="hidden rounded-full p-2 min-w-[44px] min-h-[44px] items-center justify-center text-stone-400 transition-colors hover:text-stone-950 hover:bg-stone-50 md:flex" aria-label={`Eliminar ${item.product_name}`} data-testid={`remove-item-${itemKey}`}>
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </motion.div>;
                })}
                    </AnimatePresence>
                  </div>;
          })}

              {/* Per-store shipping summary */}
              {shippingBreakdown.length > 0 && <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6 mt-4 md:mt-6" data-testid="shipping-progress-section">
                  <h3 className="text-base font-semibold text-stone-950 mb-3 flex items-center gap-2">
                    <Truck className="w-4 h-4" />
                    Envío por tienda
                  </h3>
                  <div className="space-y-3">
                    {shippingBreakdown.map(store => <ShippingProgressBar key={store.seller_id} currencyCode={currency || 'EUR'} store={{
                seller_id: store.seller_id,
                seller_name: store.seller_name,
                shipping_cents: store.shipping_cents,
                threshold_cents: store.free_threshold_cents,
                is_free: store.is_free_shipping,
                progress_pct: store.progress_pct,
                remaining_cents: store.remaining_for_free_cents
              }} />)}
                  </div>
                </div>}

              <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6 mt-4 md:mt-6" data-testid="shipping-address-section">
                <h3 className="text-base md:text-lg font-semibold text-stone-950 mb-3 md:mb-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4 md:w-5 md:h-5" />
                  {t('checkout.shippingAddress')}
                </h3>

                {savedAddresses.length > 0 && !showNewAddressForm && <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 mb-3 md:mb-4">
                    {savedAddresses.map(addr => <button type="button" key={addr.address_id} onClick={() => setSelectedAddressId(addr.address_id)} className={`w-full text-left cursor-pointer rounded-2xl border-2 p-3 transition-all md:p-4 ${selectedAddressId === addr.address_id ? 'border-stone-950 bg-stone-100' : 'border-stone-200 hover:border-stone-950'}`} data-testid={`address-${addr.address_id}`} aria-pressed={selectedAddressId === addr.address_id}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 md:gap-2 mb-0.5 md:mb-1 flex-wrap">
                              <span className="font-medium text-stone-950 text-sm md:text-base truncate">{addr.name || t('checkout.shippingAddress')}</span>
                              {addr.is_default && <span className="whitespace-nowrap rounded bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-700 md:px-2 md:text-xs">
                                  {t('checkout.default') || 'Predeterminada'}
                                </span>}
                            </div>
                            <p className="text-xs md:text-sm text-stone-500 truncate">{addr.full_name}</p>
                            <p className="text-xs md:text-sm text-stone-500 truncate">{addr.street}</p>
                            <p className="text-xs md:text-sm text-stone-500">{addr.city}, {addr.postal_code}</p>
                          </div>
                          {selectedAddressId === addr.address_id && <Check className="h-4 w-4 flex-shrink-0 text-stone-950 md:h-5 md:w-5" />}
                        </div>
                      </button>)}
                  </div>}

                {!showNewAddressForm && <button type="button" onClick={() => setShowNewAddressForm(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-stone-200 py-3 text-[13px] font-medium text-stone-500 transition-colors hover:border-stone-950 hover:text-stone-950" data-testid="add-new-address-btn">
                    <Plus className="w-4 h-4" />
                    {t('checkout.addNewAddress', 'Nueva dirección')}
                  </button>}

                {showNewAddressForm && <form onSubmit={handleAddrSubmit(handleSaveNewAddress)} className="space-y-4 p-4 shadow-sm rounded-2xl bg-white" data-testid="new-address-form">
                    <div>
                      <label className="block text-sm font-medium text-stone-950 mb-1">{t('checkout.addressName') || 'Nombre de dirección'}</label>
                      <input {...registerAddr('name')} placeholder={t('checkout.addressNamePlaceholder') || 'Ej: Casa, Trabajo'} className="w-full h-12 rounded-xl border border-stone-200 bg-white px-3 text-sm outline-none focus:border-stone-400 transition-colors" data-testid="new-address-name" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-stone-950 mb-1">{t('checkout.fullName')} <span className="text-stone-700">*</span></label>
                        <input {...registerAddr('full_name')} placeholder={t('checkout.fullName')} className={`w-full h-12 rounded-xl border bg-white px-3 text-sm outline-none focus:border-stone-400 transition-colors ${addrErrors.full_name ? 'border-stone-950' : 'border-stone-200'}`} data-testid="new-address-fullname" />
                        {addrErrors.full_name && <p className="mt-1 text-xs text-stone-700">{addrErrors.full_name.message}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-950 mb-1">{t('common.phone')}</label>
                        <input {...registerAddr('phone')} type="tel" placeholder={t('common.phone')} className="w-full h-12 rounded-xl border border-stone-200 bg-white px-3 text-sm outline-none focus:border-stone-400 transition-colors" data-testid="new-address-phone" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-950 mb-1">{t('checkout.street')} <span className="text-stone-700">*</span></label>
                      <input {...registerAddr('street')} placeholder={t('checkout.street')} className={`w-full h-12 rounded-xl border bg-white px-3 text-sm outline-none focus:border-stone-400 transition-colors ${addrErrors.street ? 'border-stone-950' : 'border-stone-200'}`} data-testid="new-address-street" />
                      {addrErrors.street && <p className="mt-1 text-xs text-stone-700">{addrErrors.street.message}</p>}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-stone-950 mb-1">{t('checkout.city')} <span className="text-stone-700">*</span></label>
                        <input {...registerAddr('city')} placeholder={t('checkout.city')} className={`w-full h-12 rounded-xl border bg-white px-3 text-sm outline-none focus:border-stone-400 transition-colors ${addrErrors.city ? 'border-stone-950' : 'border-stone-200'}`} data-testid="new-address-city" />
                        {addrErrors.city && <p className="mt-1 text-xs text-stone-700">{addrErrors.city.message}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-950 mb-1">{t('checkout.zip')} <span className="text-stone-700">*</span></label>
                        <input {...registerAddr('postal_code')} placeholder={t('checkout.zip')} className={`w-full h-12 rounded-xl border bg-white px-3 text-sm outline-none focus:border-stone-400 transition-colors ${addrErrors.postal_code ? 'border-stone-950' : 'border-stone-200'}`} data-testid="new-address-postal" />
                        {addrErrors.postal_code && <p className="mt-1 text-xs text-stone-700">{addrErrors.postal_code.message}</p>}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-950 mb-1">{t('checkout.country')} <span className="text-stone-700">*</span></label>
                      <select {...registerAddr('country')} className={`w-full h-12 rounded-xl border bg-white px-4 text-sm ${addrErrors.country ? 'border-stone-950' : 'border-stone-200'}`} data-testid="new-address-country">
                        <option value="ES">{t('admin.countries.ES', 'España')}</option>
                        <option value="PT">Portugal</option>
                        <option value="FR">Francia</option>
                        <option value="DE">Alemania</option>
                        <option value="IT">Italia</option>
                        <option value="GB">Reino Unido</option>
                        <option value="US">Estados Unidos</option>
                        <option value="MX">{t('admin.countries.MX', 'México')}</option>
                        <option value="AR">Argentina</option>
                        <option value="CO">Colombia</option>
                      </select>
                      {addrErrors.country && <p className="mt-1 text-xs text-stone-700">{addrErrors.country.message}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="is_default" {...registerAddr('is_default')} className="w-5 h-5 rounded border-stone-200 accent-stone-950" />
                      <label htmlFor="is_default" className="text-sm text-stone-500">{t('checkout.setAsDefault') || 'Establecer como predeterminada'}</label>
                    </div>
                    <div className="flex gap-2.5">
                      <button type="submit" disabled={savingAddress} className="flex-1 rounded-full bg-stone-950 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-stone-800 disabled:opacity-50" data-testid="save-new-address-btn">
                        {savingAddress ? t('common.loading') : t('common.save')}
                      </button>
                      {savedAddresses.length > 0 && <button type="button" onClick={() => {
                  setShowNewAddressForm(false);
                  resetAddr({
                    country: 'ES',
                    is_default: false
                  });
                }} className="rounded-full border border-stone-200 px-5 py-2.5 text-[13px] font-medium text-stone-700 transition-colors hover:bg-stone-50" data-testid="cancel-new-address-btn">
                          {t('common.cancel')}
                        </button>}
                    </div>
                  </form>}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6 h-fit lg:sticky lg:top-24">
              <h2 className="text-[16px] font-semibold text-stone-950 mb-3 md:mb-4">{t('checkout.orderSummary')}</h2>
              <div className="mb-4 md:mb-6">
                {!appliedDiscount ? <div className="flex gap-2">
                    <input placeholder={t('cart.discountCode')} value={discountCode} onChange={event => setDiscountCode(event.target.value.toUpperCase())} className="flex-1 h-12 rounded-xl border border-stone-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1 transition-all duration-200" aria-label={t('cart.discountCode')} data-testid="discount-code-input" />
                    <button type="button" onClick={handleApplyDiscount} disabled={discountLoading} className="rounded-2xl border border-stone-200 px-4 py-2.5 min-h-[44px] text-[13px] font-medium text-stone-700 transition-colors hover:bg-stone-100 disabled:opacity-50" data-testid="apply-discount-btn" aria-label={t('cart.aplicarCodigoDeDescuento', 'Aplicar código de descuento')}>
                      {discountLoading ? t('common.loading') : t('cart.apply')}
                    </button>
                  </div> : <div className="flex items-center justify-between rounded-2xl shadow-sm bg-stone-100 p-3" data-testid="applied-discount">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-stone-700" />
                      <span className="font-medium text-stone-950">{appliedDiscount.code}</span>
                      <span className="text-sm text-stone-700">
                        -{formatCurrency(appliedDiscount.discount_cents || 0)}
                      </span>
                    </div>
                    <button onClick={handleRemoveDiscount} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-stone-700 hover:text-stone-950" aria-label="Eliminar descuento" data-testid="remove-discount-btn">
                      <X className="w-4 h-4" />
                    </button>
                  </div>}
              </div>

              <div className="flex flex-col gap-2.5 mb-4 md:mb-6">
                {/* Subtotal */}
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">{t('cart.subtotal')}</span>
                  <span className="text-stone-950 font-medium">{formatCurrency(displaySubtotal)}</span>
                </div>

                {/* Per-store shipping lines */}
                {user && shippingBreakdown.length > 0 ? shippingBreakdown.map(store => <div key={store.seller_id} className="flex justify-between text-sm">
                      <span className="text-stone-500">Envío {store.seller_name}</span>
                      {store.is_free_shipping ? <span className="text-stone-950 font-medium">Gratis</span> : <span className="text-stone-950 font-medium">{formatCurrency(store.shipping_cents)}</span>}
                    </div>) : user ? <div className="flex justify-between text-sm">
                    <span className="text-stone-500">{t('checkout.shipping')}</span>
                    <span className="text-stone-950 font-medium">
                      {cartSummary.shipping_cents > 0 ? formatCurrency(cartSummary.shipping_cents) : <span className="text-stone-700">{t('common.free')}</span>}
                    </span>
                  </div> : <p className="text-xs text-stone-400">{t('cart.iniciaSesionParaVerElCosteDeEnvio', 'Inicia sesión para ver el coste de envío')}</p>}

                {/* Discount */}
                {appliedDiscount && (appliedDiscount?.discount_cents || 0) > 0 && <div className="flex justify-between text-sm">
                    <span className="text-stone-500">{t('cart.discount')}</span>
                    <span className="text-stone-950 font-medium">-{formatCurrency(appliedDiscount.discount_cents)}</span>
                  </div>}

                {/* Separator */}
                <div className="h-px bg-stone-200 my-1" />

                {/* Total */}
                <div className="flex justify-between">
                  <span className="text-base font-bold text-stone-950">
                    {isGuest ? 'Subtotal' : t('cart.total')}
                  </span>
                  <span className="text-base font-bold text-stone-950">{formatCurrency(displayTotal)}</span>
                </div>

                {/* IVA included note */}
                {user ? <p className="text-[11px] text-stone-400 text-right">IVA incluido ({formatCurrency(cartSummary.tax_cents ?? 0)} IVA)</p> : <p className="text-[11px] text-stone-400 text-right">{t('cart.ivaIncluido·EnvioSeCalculaAlInici', 'IVA incluido · Envío se calcula al iniciar sesión')}</p>}

                {/* Delivery estimate */}
                <div className="flex items-center gap-1.5 text-sm text-stone-600 pt-1">
                  <Truck className="w-4 h-4 flex-shrink-0 text-stone-400" />
                  <span>Entrega estimada: <span className="font-medium text-stone-700">{estimatedDelivery}</span></span>
                </div>

                {currency !== (countries[country]?.currency || 'EUR') && <div className="text-xs text-stone-500 pt-2 border-t">
                    <p>{t('checkout.displayCurrency', {
                  currency
                })}</p>
                    <p className="font-medium">{t('checkout.chargeCurrency', {
                  currency: countries[country]?.currency || 'EUR'
                })}</p>
                    {getExchangeRateDisplay(countries[country]?.currency || 'EUR') && <p className="text-xs mt-1">{t('checkout.exchangeRate')}: {getExchangeRateDisplay(countries[country]?.currency || 'EUR').text}</p>}
                  </div>}
              </div>

              {(getSelectedAddress() || showNewAddressForm) && <div className="mb-3 md:mb-4 p-2.5 md:p-3 bg-stone-50 rounded-2xl">
                  <p className="text-[10px] md:text-xs text-stone-500 mb-0.5 md:mb-1">{t('checkout.shippingTo') || 'Enviando a'}:</p>
                  {showNewAddressForm ? <p className="text-xs md:text-sm text-stone-950">{t('checkout.newAddressForm') || 'Nueva dirección (completa abajo)'}</p> : <p className="text-xs md:text-sm text-stone-950">{getSelectedAddress()?.full_name}, {getSelectedAddress()?.city}</p>}
                </div>}

              <button type="button" onClick={handleCheckout} disabled={checkoutDisabled} className={`w-full h-12 rounded-full text-[15px] font-semibold transition-colors ${checkoutEnabled ? 'bg-stone-950 text-white hover:bg-stone-800' : 'cursor-not-allowed bg-stone-100 text-stone-500'}`} data-testid="checkout-button">
                {isGuest ? t('cart.iniciarSesionParaComprar', 'Iniciar sesión para comprar') : checkoutLoading ? t('common.loading') : !emailVerified ? t('errors.unauthorized') : stockIssues.length > 0 ? t('errors.generic') : !getSelectedAddress() && !showNewAddressForm ? t('checkout.selectAddress', 'Selecciona una dirección') : t('cart.checkout')}
              </button>

              {user && !emailVerified && <p className="text-xs text-stone-500 mt-2 text-center">{t('checkout.emailVerificationRequired') || 'Debes verificar tu correo electrónico'}</p>}
              {stockIssues.length > 0 && <p className="mt-2 text-center text-xs text-stone-700">{t('checkout.stockIssues') || 'Algunos productos no tienen stock suficiente'}</p>}
              {!getSelectedAddress() && !showNewAddressForm && emailVerified && stockIssues.length === 0 && <p className="mt-2 text-center text-xs text-stone-700">{t('checkout.pleaseSelectAddress') || 'Selecciona o añade una dirección de envío'}</p>}
            </div>
          </div>}
      </div>

      {/* Sticky mobile total bar */}
      {!cartLoading && cartItems.length > 0 && <div className="sticky bottom-0 bg-white/80 backdrop-blur-xl border-t border-stone-200 px-4 pt-4 lg:hidden z-30" style={{
      paddingBottom: 'max(16px, env(safe-area-inset-bottom))'
    }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex flex-col">
              <span className="text-sm text-stone-500">{t('cart.total')}</span>
              <span className="text-[10px] text-stone-400">IVA incluido</span>
            </div>
            <span className="text-lg font-bold text-stone-950">{formatCurrency(displayTotal)}</span>
          </div>
          <motion.button whileTap={{
        scale: 0.96
      }} type="button" onClick={handleCheckout} disabled={checkoutDisabled} className={`w-full h-12 rounded-full text-[15px] font-semibold transition-colors ${checkoutEnabled ? 'bg-stone-950 text-white hover:bg-stone-800' : 'cursor-not-allowed bg-stone-100 text-stone-500'}`}>
            {isGuest ? 'Iniciar sesión para comprar' : checkoutLoading ? t('common.loading') : t('cart.checkout')}
          </motion.button>
        </div>}
    </div>;
}