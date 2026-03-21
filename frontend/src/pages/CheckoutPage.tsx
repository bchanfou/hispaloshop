// @ts-nocheck
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Check, Loader2, Plus, Tag, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { useCartAddresses, useCartCheckout, useCartPricing } from '../features/cart/hooks';

/* ── Stepper ── */
function Stepper({ current, onStepClick }) {
  const steps = ['Dirección', 'Pago', 'Confirmar'];
  return (
    <nav aria-label="Progreso del checkout" className="flex items-center justify-center gap-2 px-6 py-4 border-b border-stone-200 bg-white mb-0">
      {steps.map((label, i) => {
        const step = i + 1;
        const isCompleted = step < current;
        const isActive = step === current;
        const isFuture = step > current;
        const isClickable = isCompleted || (step === 1);
        return (
          <React.Fragment key={step}>
            {i > 0 && (
              <div className={`w-6 h-px mx-0.5 ${isCompleted ? 'bg-stone-950' : 'bg-stone-200'}`} aria-hidden="true" />
            )}
            <button
              type="button"
              onClick={() => isClickable && onStepClick?.(step)}
              className={`flex flex-col items-center gap-1 ${isClickable && !isActive ? 'cursor-pointer' : isFuture ? 'cursor-not-allowed' : ''}`}
              disabled={isFuture}
              aria-current={isActive ? 'step' : undefined}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                isCompleted ? 'bg-stone-950 text-white'
                : isActive   ? 'bg-stone-950 text-white'
                :               'bg-stone-100 text-stone-400'
              }`}>
                {isCompleted ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> : step}
              </div>
              <span className={`text-[11px] leading-none ${
                isActive ? 'font-semibold text-stone-950' : isFuture ? 'text-stone-300' : 'text-stone-950'
              }`}>
                {label}
              </span>
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
}

/* ── Order Summary Card ── */
function OrderSummary({ cartItems, cartSummary, appliedDiscount, shippingLabel, formatPrice }) {
  const subtotal = cartSummary?.subtotal_cents ? cartSummary.subtotal_cents / 100 : 0;
  const discount = (appliedDiscount?.discount_cents || 0) / 100;
  const shipping = cartSummary?.shipping_cents ? cartSummary.shipping_cents / 100 : 0;
  const total = cartSummary?.total_cents ? cartSummary.total_cents / 100 : subtotal - discount + shipping;
  const fmt = formatPrice || ((v) => `${v.toFixed(2)}€`);

  return (
    <div className="bg-white shadow-sm rounded-2xl p-4">
      {cartItems.slice(0, 5).map((item) => (
        <div key={`${item.product_id}-${item.variant_id || ''}-${item.pack_id || ''}`} className="flex items-center gap-2.5 pb-2.5 mb-2.5 border-b border-stone-200">
          <div className="w-11 h-11 rounded-2xl bg-stone-200 overflow-hidden flex-shrink-0">
            {(item.product_image || item.image) && <img loading="lazy" src={item.product_image || item.image} alt={item.product_name || item.name || ''} className="w-full h-full object-cover" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-stone-950 truncate">{item.product_name || item.name}</p>
            <p className="text-xs text-stone-500">x{item.quantity}</p>
          </div>
        </div>
      ))}
      {cartItems.length > 5 && (
        <p className="text-xs text-stone-500 mb-2.5">+{cartItems.length - 5} mas</p>
      )}

      <div className="flex flex-col gap-1.5">
        <SummaryRow label="Subtotal" value={fmt(subtotal)} />
        {discount > 0 && <SummaryRow label="Descuento" value={`-${fmt(discount)}`} />}
        <SummaryRow label="Envio" value={shipping === 0 ? (shippingLabel || 'Calculando...') : fmt(shipping)} />
        <div className="h-px bg-stone-200 my-1" />
        <SummaryRow label="Total" value={fmt(total)} bold />
      </div>
    </div>
  );
}

function SummaryRow({ label, value, bold }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[13px] text-stone-500">{label}</span>
      <span className={bold ? 'text-lg font-bold text-stone-950' : 'text-sm font-medium text-stone-950'}>{value}</span>
    </div>
  );
}

/* ── Main Component ── */
export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cartItems, appliedDiscount, applyDiscount, removeDiscount, loading: cartLoading } = useCart();
  const { convertAndFormatPrice, currency } = useLocale();
  const { savedAddresses, defaultAddressId, createAddress, savingAddress, isLoading: addressesLoading } = useCartAddresses();
  const { cartSummary } = useCartPricing(cartItems, appliedDiscount);
  const { checkoutLoading, createCheckout } = useCartCheckout();
  const formatPrice = useCallback((euros) => convertAndFormatPrice(euros, currency), [convertAndFormatPrice, currency]);

  const [step, setStep] = useState(1);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    full_name: '', street: '', floor: '', postal_code: '', city: '', country: 'ES', phone: '',
  });
  const [saveAddress, setSaveAddress] = useState(true);
  const [discountCode, setDiscountCode] = useState('');
  const [discountLoading, setDiscountLoading] = useState(false);
  const [discountError, setDiscountError] = useState('');

  // Auto-fill phone from user profile
  useEffect(() => {
    if (user?.phone && !newAddress.phone) {
      setNewAddress(prev => ({ ...prev, phone: user.phone }));
    }
  }, [user]);

  // Redirect if not logged in or no items (guard against loading state)
  useEffect(() => {
    if (!user) { navigate('/login', { replace: true }); return; }
    if (!cartLoading && cartItems.length === 0) { navigate('/cart', { replace: true }); }
  }, [user, cartItems.length, cartLoading, navigate]);

  // Auto-select default address
  useEffect(() => {
    if (savedAddresses.length > 0 && !selectedAddressId) {
      setSelectedAddressId(defaultAddressId);
    }
    if (!addressesLoading && savedAddresses.length === 0) {
      setShowNewForm(true);
    }
  }, [savedAddresses, defaultAddressId, selectedAddressId, addressesLoading]);

  const selectedAddress = useMemo(() =>
    savedAddresses.find(a => a.address_id === selectedAddressId),
  [savedAddresses, selectedAddressId]);

  const handleSaveNewAddress = async () => {
    const trimmedName = newAddress.full_name.trim();
    const trimmedStreet = newAddress.street.trim();
    const trimmedPostal = newAddress.postal_code.trim();
    const trimmedCity = newAddress.city.trim();
    if (!trimmedName || !trimmedStreet || !trimmedPostal || !trimmedCity) {
      toast.error('Completa todos los campos obligatorios');
      return;
    }
    if (!/^\d{4,10}$/.test(trimmedPostal)) {
      toast.error('Código postal no válido');
      return;
    }
    try {
      await createAddress({
        name: 'Dirección',
        full_name: trimmedName,
        street: trimmedStreet + (newAddress.floor ? `, ${newAddress.floor.trim()}` : ''),
        postal_code: trimmedPostal,
        city: trimmedCity,
        country: newAddress.country,
        phone: newAddress.phone.trim(),
        is_default: savedAddresses.length === 0,
      });
      setShowNewForm(false);
      toast.success('Dirección guardada');
    } catch (err) {
      toast.error(err?.message || 'Error al guardar la dirección');
    }
  };

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) return;
    setDiscountLoading(true);
    setDiscountError('');
    try {
      const result = await applyDiscount(discountCode.trim().toUpperCase());
      if (!result?.success) throw new Error(result?.error || 'Código no válido');
      setDiscountCode('');
      setDiscountError('');
      toast.success('Descuento aplicado');
    } catch (err) {
      setDiscountError('Código no válido');
    } finally {
      setDiscountLoading(false);
    }
  };

  const handlePay = async () => {
    if (checkoutLoading) return;
    if (!cartItems || cartItems.length === 0) {
      toast.error('Tu carrito está vacío');
      navigate('/cart');
      return;
    }
    const addr = selectedAddress;
    if (!addr) { toast.error('Selecciona una dirección'); return; }
    try {
      const response = await createCheckout({
        shippingAddress: {
          full_name: addr.full_name,
          street: addr.street,
          city: addr.city,
          postal_code: addr.postal_code,
          country: addr.country,
          phone: addr.phone || '',
        },
        origin: window.location.origin,
      });
      window.location.href = response.url;
    } catch (error) {
      if (error?.data?.detail?.issues) {
        error.data.detail.issues.forEach(issue => toast.error(issue));
      } else {
        toast.error(error?.message || 'Error al procesar el pago');
      }
    }
  };

  const total = cartSummary?.total_cents ? formatPrice(cartSummary.total_cents / 100) : '...';

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white flex items-center justify-between px-4 py-3 border-b border-stone-200">
        <button
          onClick={() => navigate('/cart')}
          className="p-2.5 -ml-1 flex items-center justify-center min-w-[44px] min-h-[44px]"
          aria-label="Volver al carrito"
        >
          <X className="w-[22px] h-[22px] text-stone-950" />
        </button>
        <span className="text-base font-bold text-stone-950 tracking-tight">
          hispaloshop
        </span>
        <div className="w-[30px]" />
      </div>

      {/* Stepper */}
      <Stepper current={step} onStepClick={(s) => { if (s < step) setStep(s); }} />

      {/* Content — desktop: 2-col (form left 60%, summary right 40%) */}
      <div className="mx-auto max-w-[960px] px-4 pt-6 pb-24 lg:flex lg:gap-8 lg:items-start">

        {/* ── Left: Form Steps ── */}
        <div className="lg:w-[60%]">
        {/* ── STEP 1: Address ── */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
            <h2 className="text-xl font-semibold text-stone-950 mb-5">
              ¿Dónde enviamos tu pedido?
            </h2>

            {/* Saved addresses */}
            {addressesLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-6 h-6 text-stone-500 animate-spin" />
              </div>
            ) : (
              <>
                {savedAddresses.map(addr => {
                  const isSelected = selectedAddressId === addr.address_id;
                  return (
                    <button
                      key={addr.address_id}
                      onClick={() => { setSelectedAddressId(addr.address_id); setShowNewForm(false); }}
                      className={`w-full flex items-start gap-3 p-3.5 mb-2.5 text-left bg-white rounded-2xl cursor-pointer transition-colors ${
                        isSelected ? 'border-2 border-stone-950' : 'shadow-sm hover:shadow-md'
                      }`}
                      aria-pressed={isSelected}
                    >
                      <div className={`w-5 h-5 rounded-full flex-shrink-0 mt-0.5 ${
                        isSelected ? 'border-[6px] border-stone-950' : 'border-2 border-stone-200'
                      }`} />
                      <div>
                        <p className="text-sm font-semibold text-stone-950">
                          {addr.full_name}
                          {addr.is_default && (
                            <span className="ml-2 text-[11px] font-semibold text-stone-950 bg-stone-100 px-2 py-0.5 rounded-full">
                              Principal
                            </span>
                          )}
                        </p>
                        <p className="text-[13px] text-stone-500 mt-0.5">
                          {addr.street}, {addr.city} {addr.postal_code}
                        </p>
                      </div>
                    </button>
                  );
                })}

                {/* Add new address button */}
                {!showNewForm && (
                  <button
                    onClick={() => setShowNewForm(true)}
                    className="w-full p-3.5 flex items-center gap-2 bg-white border-[1.5px] border-dashed border-stone-200 rounded-2xl text-sm font-semibold text-stone-950 cursor-pointer hover:border-stone-400 transition-colors"
                  >
                    <Plus className="w-[18px] h-[18px]" /> Añadir nueva dirección
                  </button>
                )}

                {/* New address form */}
                {showNewForm && (
                  <div className="bg-white shadow-sm rounded-2xl p-4 mt-2">
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-stone-950 mb-1">Nombre completo</label>
                        <input
                          value={newAddress.full_name}
                          onChange={e => setNewAddress(p => ({ ...p, full_name: e.target.value }))}
                          className="w-full h-12 px-3.5 text-sm border border-stone-200 rounded-xl bg-white text-stone-950 outline-none focus:border-stone-400 transition-colors"
                          placeholder="María García"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-stone-950 mb-1">Dirección (calle y número)</label>
                        <input
                          value={newAddress.street}
                          onChange={e => setNewAddress(p => ({ ...p, street: e.target.value }))}
                          className="w-full h-12 px-3.5 text-sm border border-stone-200 rounded-xl bg-white text-stone-950 outline-none focus:border-stone-400 transition-colors"
                          placeholder="Calle Mayor 12"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-stone-950 mb-1">Piso/Puerta (opcional)</label>
                        <input
                          value={newAddress.floor}
                          onChange={e => setNewAddress(p => ({ ...p, floor: e.target.value }))}
                          className="w-full h-12 px-3.5 text-sm border border-stone-200 rounded-xl bg-white text-stone-950 outline-none focus:border-stone-400 transition-colors"
                          placeholder="3ºA"
                        />
                      </div>
                      <div className="flex gap-2.5">
                        <div className="flex-1">
                          <label className="block text-xs font-semibold text-stone-950 mb-1">Código postal</label>
                          <input
                            value={newAddress.postal_code}
                            onChange={e => setNewAddress(p => ({ ...p, postal_code: e.target.value }))}
                            className="w-full h-12 px-3.5 text-sm border border-stone-200 rounded-xl bg-white text-stone-950 outline-none focus:border-stone-400 transition-colors"
                            placeholder="28001"
                            inputMode="numeric"
                            maxLength={10}
                          />
                        </div>
                        <div className="flex-[1.5]">
                          <label className="block text-xs font-semibold text-stone-950 mb-1">Ciudad</label>
                          <input
                            value={newAddress.city}
                            onChange={e => setNewAddress(p => ({ ...p, city: e.target.value }))}
                            className="w-full h-12 px-3.5 text-sm border border-stone-200 rounded-xl bg-white text-stone-950 outline-none focus:border-stone-400 transition-colors"
                            placeholder="Madrid"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-stone-950 mb-1">País</label>
                        <select
                          value={newAddress.country}
                          onChange={e => setNewAddress(p => ({ ...p, country: e.target.value }))}
                          className="w-full h-12 px-3.5 text-sm border border-stone-200 rounded-xl bg-white text-stone-950 outline-none focus:border-stone-400 transition-colors"
                        >
                          <option value="ES">España</option>
                          <option value="PT">Portugal</option>
                          <option value="FR">Francia</option>
                          <option value="DE">Alemania</option>
                          <option value="IT">Italia</option>
                          <option value="GB">Reino Unido</option>
                          <option value="US">Estados Unidos</option>
                          <option value="MX">México</option>
                          <option value="AR">Argentina</option>
                          <option value="CO">Colombia</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-stone-950 mb-1">Teléfono</label>
                        <input
                          value={newAddress.phone}
                          onChange={e => setNewAddress(p => ({ ...p, phone: e.target.value }))}
                          className="w-full h-12 px-3.5 text-sm border border-stone-200 rounded-xl bg-white text-stone-950 outline-none focus:border-stone-400 transition-colors"
                          placeholder="+34 600 000 000"
                          type="tel"
                        />
                      </div>
                      <label className="flex items-center gap-2 text-[13px] text-stone-500 cursor-pointer">
                        <input type="checkbox" checked={saveAddress} onChange={e => setSaveAddress(e.target.checked)} className="accent-stone-950" />
                        Guardar esta dirección
                      </label>
                      <button
                        onClick={handleSaveNewAddress}
                        disabled={savingAddress}
                        className="h-12 bg-stone-950 text-white rounded-full text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-stone-800 transition-colors disabled:opacity-50"
                      >
                        {savingAddress ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar dirección'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Summary — mobile only (desktop has sticky sidebar) */}
            <div className="mt-6 lg:hidden">
              <OrderSummary cartItems={cartItems} cartSummary={cartSummary} appliedDiscount={appliedDiscount} shippingLabel="Según dirección" formatPrice={formatPrice} />
            </div>

            {/* Continue */}
            <button
              onClick={() => { if (selectedAddress) setStep(2); else toast.error('Selecciona una dirección'); }}
              disabled={!selectedAddress}
              className={`w-full h-12 mt-5 rounded-full text-[15px] font-semibold transition-colors ${
                selectedAddress
                  ? 'bg-stone-950 text-white cursor-pointer hover:bg-stone-800'
                  : 'bg-stone-200 text-stone-500 cursor-not-allowed'
              }`}
            >
              Continuar al pago →
            </button>
          </motion.div>
        )}

        {/* ── STEP 2: Payment ── */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1 text-sm text-stone-500 mb-4 hover:text-stone-950 transition-colors"
            >
              ← Cambiar dirección
            </button>

            <h2 className="text-xl font-semibold text-stone-950 mb-5">
              Método de pago
            </h2>

            {/* Shipping summary */}
            {selectedAddress && (
              <div className="bg-white shadow-sm rounded-2xl p-3.5 mb-4">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                  Envío a
                </p>
                <p className="text-sm text-stone-950">
                  {selectedAddress.full_name} — {selectedAddress.street}, {selectedAddress.city} {selectedAddress.postal_code}
                </p>
              </div>
            )}

            {/* Discount code */}
            <div className="bg-white shadow-sm rounded-2xl p-3.5 mb-4">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
                Código de descuento
              </p>
              {appliedDiscount ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-stone-100 text-[13px] font-semibold text-stone-950">
                    <Tag className="w-3.5 h-3.5" /> {appliedDiscount.code}
                  </span>
                  <button
                    onClick={async () => { setDiscountLoading(true); try { await removeDiscount(); } catch { /* handled by context */ } finally { setDiscountLoading(false); } }}
                    className="text-xs text-stone-500 hover:text-stone-950 transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex gap-2">
                    <input
                      value={discountCode}
                      onChange={e => { setDiscountCode(e.target.value); if (discountError) setDiscountError(''); }}
                      placeholder="CODIGO10"
                      className={`flex-1 h-12 px-3.5 text-[13px] border rounded-xl bg-white text-stone-950 outline-none focus:border-stone-400 transition-colors ${discountError ? 'border-red-300' : 'border-stone-200'}`}
                      aria-label="Código de descuento"
                    />
                    <button
                      onClick={handleApplyDiscount}
                      disabled={discountLoading}
                      className="h-12 px-5 bg-stone-950 text-white rounded-xl text-[13px] font-semibold flex-shrink-0 hover:bg-stone-800 transition-colors disabled:opacity-50"
                    >
                      Aplicar
                    </button>
                  </div>
                  {discountError && <p className="text-xs text-red-600 mt-1.5">{discountError}</p>}
                </div>
              )}
            </div>

            {/* Order summary — mobile only */}
            <div className="lg:hidden">
              <OrderSummary cartItems={cartItems} cartSummary={cartSummary} appliedDiscount={appliedDiscount} formatPrice={formatPrice} />
            </div>

            {/* Pay button — sticky on mobile */}
            <div className="sticky bottom-0 z-30 mt-4 bg-white/80 backdrop-blur-xl pt-3 pb-[max(12px,env(safe-area-inset-bottom))] lg:static lg:bg-transparent lg:backdrop-blur-none lg:pb-0">
              <button
                onClick={handlePay}
                disabled={checkoutLoading}
                className="w-full h-12 bg-stone-950 text-white rounded-full text-[15px] font-semibold flex items-center justify-center gap-2 hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-live="polite"
              >
                {checkoutLoading ? (
                  <Loader2 className="w-[22px] h-[22px] animate-spin" />
                ) : (
                  `Pagar ${total}`
                )}
              </button>
              {/* Security badge */}
              <p className="flex items-center justify-center gap-1.5 text-xs text-stone-400 mt-2">
                <Lock className="w-3 h-3" /> Pago seguro con Stripe
              </p>
            </div>
          </motion.div>
        )}
        </div>

        {/* ── Right: Order Summary (desktop sticky sidebar) ── */}
        <div className="hidden lg:block lg:w-[40%] lg:sticky lg:top-[120px]">
          <OrderSummary cartItems={cartItems} cartSummary={cartSummary} appliedDiscount={appliedDiscount} shippingLabel={step === 1 ? 'Según dirección' : undefined} formatPrice={formatPrice} />
        </div>

      </div>
    </div>
  );
}
