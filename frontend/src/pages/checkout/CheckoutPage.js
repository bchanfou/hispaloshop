import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../../services/api/client';
import {
  ArrowLeft, Lock, MapPin, Truck, Check, Plus, Shield,
  ShoppingBag, Trash2, Loader2, Tag, CreditCard,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';

// ─── Zod schema ────────────────────────────────────────────────────────────
const addressSchema = z.object({
  name: z.string().min(1, 'Nombre de dirección requerido'),
  full_name: z.string().min(2, 'Nombre completo requerido'),
  street: z.string().min(5, 'Dirección requerida'),
  city: z.string().min(2, 'Ciudad requerida'),
  postal_code: z.string().regex(/^\d{4,5}$/, 'Código postal no válido'),
  country: z.string().min(1, 'País requerido'),
  phone: z.string().optional(),
});

// ─── Checkout Stepper ──────────────────────────────────────────────────────
const STEPS = [
  { id: 0, label: 'Dirección', icon: MapPin },
  { id: 1, label: 'Envío', icon: Truck },
  { id: 2, label: 'Pago', icon: CreditCard },
];

function CheckoutStepper({ current }) {
  return (
    <div className="flex items-center gap-1 mb-6">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={step.id}>
            {i > 0 && (
              <div
                className="flex-1 h-[2px]"
                style={{
                  background: done ? 'var(--color-black)' : 'var(--color-border)',
                  transition: 'var(--transition-fast)',
                }}
              />
            )}
            <div className="flex flex-col items-center gap-1">
              <div
                className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold"
                style={{
                  background: done ? 'var(--color-black)' : active ? 'var(--color-green)' : 'var(--color-surface)',
                  color: done || active ? '#fff' : 'var(--color-stone)',
                  ...(active ? { boxShadow: '0 0 0 4px var(--color-green-light)' } : {}),
                  transition: 'var(--transition-fast)',
                }}
              >
                {done ? <Check className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
              </div>
              <span
                className="text-[11px] font-medium"
                style={{
                  color: active || done ? 'var(--color-black)' : 'var(--color-stone)',
                }}
              >
                {step.label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Step 1: Address ───────────────────────────────────────────────────────
function AddressStep({ addresses, selectedId, onSelect, onSaveNew, onNext, loadingAddresses, savingAddress }) {
  const [showForm, setShowForm] = useState(addresses.length === 0);
  const {
    register, handleSubmit, formState: { errors },
  } = useForm({
    resolver: zodResolver(addressSchema),
    defaultValues: { country: 'ES' },
  });

  useEffect(() => {
    if (!loadingAddresses && addresses.length === 0) setShowForm(true);
  }, [loadingAddresses, addresses.length]);

  const handleSave = async (data) => {
    await onSaveNew({ ...data, is_default: addresses.length === 0 });
    setShowForm(false);
  };

  const inputStyle = (hasError) => ({
    border: hasError ? '1px solid var(--color-red)' : '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    outline: 'none',
    fontFamily: 'var(--font-sans)',
    color: 'var(--color-black)',
    background: 'var(--color-white)',
  });

  return (
    <motion.div key="step-address" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
      <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--color-black)', fontFamily: 'var(--font-sans)' }}>¿Dónde te lo enviamos?</h2>

      {loadingAddresses ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-stone)' }} />
        </div>
      ) : (
        <div className="space-y-2">
          {addresses.map(addr => (
            <div
              key={addr.address_id}
              onClick={() => onSelect(addr.address_id)}
              className="p-4 cursor-pointer"
              style={{
                borderRadius: 'var(--radius-xl)',
                border: selectedId === addr.address_id ? '2px solid var(--color-black)' : '2px solid var(--color-border)',
                background: selectedId === addr.address_id ? 'var(--color-surface)' : 'var(--color-white)',
                transition: 'var(--transition-fast)',
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-sm" style={{ color: 'var(--color-black)' }}>{addr.name || addr.full_name}</span>
                    {addr.is_default && (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--color-surface)', color: 'var(--color-stone)' }}
                      >
                        Principal
                      </span>
                    )}
                  </div>
                  <p className="text-sm" style={{ color: 'var(--color-stone)' }}>{addr.full_name}</p>
                  <p className="text-sm" style={{ color: 'var(--color-stone)' }}>{addr.street}</p>
                  <p className="text-sm" style={{ color: 'var(--color-stone)' }}>{addr.postal_code} {addr.city}</p>
                </div>
                <div
                  className="w-5 h-5 rounded-full shrink-0 mt-1 flex items-center justify-center"
                  style={{
                    border: selectedId === addr.address_id ? '2px solid var(--color-black)' : '2px solid var(--color-border)',
                    background: selectedId === addr.address_id ? 'var(--color-black)' : 'transparent',
                  }}
                >
                  {selectedId === addr.address_id && <Check className="w-3 h-3" style={{ color: '#fff' }} />}
                </div>
              </div>
            </div>
          ))}

          {!showForm ? (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="flex w-full items-center justify-center gap-2 py-3 text-sm font-medium"
              style={{
                borderRadius: 'var(--radius-xl)',
                border: '2px dashed var(--color-border)',
                color: 'var(--color-stone)',
                background: 'transparent',
                transition: 'var(--transition-fast)',
              }}
            >
              <Plus className="w-4 h-4" /> Añadir nueva dirección
            </button>
          ) : (
            <form
              onSubmit={handleSubmit(handleSave)}
              className="space-y-3 p-4"
              style={{
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-xl)',
              }}
            >
              <p className="text-sm font-bold" style={{ color: 'var(--color-black)' }}>Nueva dirección</p>
              {[
                { key: 'name', label: 'Nombre (ej. Casa)', placeholder: 'Casa' },
                { key: 'full_name', label: 'Nombre completo', placeholder: 'María García' },
                { key: 'street', label: 'Dirección', placeholder: 'Calle Mayor 12, 3ºB' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-stone)' }}>{f.label}</label>
                  <input
                    {...register(f.key)}
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2.5 text-sm"
                    style={inputStyle(errors[f.key])}
                  />
                  {errors[f.key] && <p className="text-xs mt-1" style={{ color: 'var(--color-red)' }}>{errors[f.key].message}</p>}
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-stone)' }}>Ciudad</label>
                  <input
                    {...register('city')}
                    placeholder="Sevilla"
                    className="w-full px-3 py-2.5 text-sm"
                    style={inputStyle(errors.city)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-stone)' }}>Código postal</label>
                  <input
                    {...register('postal_code')}
                    placeholder="41001"
                    className="w-full px-3 py-2.5 text-sm"
                    style={inputStyle(errors.postal_code)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-stone)' }}>País</label>
                  <select
                    {...register('country')}
                    className="w-full px-3 py-2.5 text-sm"
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--color-white)',
                      color: 'var(--color-black)',
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    <option value="ES">España</option>
                    <option value="PT">Portugal</option>
                    <option value="FR">Francia</option>
                    <option value="DE">Alemania</option>
                    <option value="IT">Italia</option>
                    <option value="GB">Reino Unido</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-stone)' }}>Teléfono</label>
                  <input
                    {...register('phone')}
                    type="tel"
                    placeholder="Opcional"
                    className="w-full px-3 py-2.5 text-sm"
                    style={inputStyle(false)}
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={savingAddress}
                  className="flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{
                    background: 'var(--color-black)',
                    color: '#fff',
                    borderRadius: 'var(--radius-xl)',
                    border: 'none',
                  }}
                >
                  {savingAddress ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Guardar
                </button>
                {addresses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2.5 text-sm"
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-xl)',
                      color: 'var(--color-stone)',
                      background: 'transparent',
                    }}
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={onNext}
        disabled={!selectedId}
        className="w-full mt-5 py-3 rounded-full text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          background: 'var(--color-black)',
          color: '#fff',
          transition: 'var(--transition-fast)',
          border: 'none',
        }}
      >
        Continuar →
      </button>
    </motion.div>
  );
}

// ─── Step 2: Shipping (per-store breakdown) ──────────────────────────────
function ShippingStep({ selectedAddress, cartItems, onNext, onBack }) {
  const [shippingData, setShippingData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    apiClient.post('/cart/shipping-preview', {})
      .then(res => {
        const d = res?.data || res;
        setShippingData(d);
      })
      .catch(() => setShippingData({ stores: [], total_shipping_cents: 0, total_savings_cents: 0, store_count: 0 }))
      .finally(() => setIsLoading(false));
  }, [cartItems]);

  const totalShipping = shippingData?.total_shipping_cents || 0;

  return (
    <motion.div key="step-shipping" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
      <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--color-black)', fontFamily: 'var(--font-sans)' }}>Envio por tienda</h2>

      {selectedAddress && (
        <div
          className="mb-4 flex items-center gap-2 text-sm p-3"
          style={{
            color: 'var(--color-stone)',
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-xl)',
          }}
        >
          <MapPin className="w-4 h-4 shrink-0" />
          <span>{selectedAddress.street}, {selectedAddress.postal_code} {selectedAddress.city}</span>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1].map(i => (
            <div
              key={i}
              className="h-[68px] animate-pulse"
              style={{ borderRadius: 'var(--radius-xl)', background: 'var(--color-surface)' }}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {(shippingData?.stores || []).map(store => (
            <div
              key={store.seller_id}
              className="p-4"
              style={{
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-white)',
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  {store.seller_avatar ? (
                    <img src={store.seller_avatar} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--color-surface)' }}>
                      <Truck className="w-3.5 h-3.5" style={{ color: 'var(--color-stone)' }} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-black)' }}>{store.seller_name}</p>
                    <p className="text-[11px]" style={{ color: 'var(--color-stone)' }}>{store.item_count} {store.item_count === 1 ? 'producto' : 'productos'} · Plan {store.plan_label}</p>
                  </div>
                </div>
                <span className="text-sm font-bold shrink-0" style={{ color: store.is_free ? 'var(--color-green)' : 'var(--color-black)' }}>
                  {store.is_free ? 'Gratis' : `${(store.shipping_cents / 100).toFixed(2)}€`}
                </span>
              </div>

              {store.threshold_cents != null && (
                <>
                  <div className="h-1.5 w-full rounded-full overflow-hidden mt-2" style={{ background: 'var(--color-surface)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${store.progress_pct}%`,
                        background: store.is_free ? 'var(--color-green)' : store.progress_pct >= 60 ? 'var(--color-black)' : 'var(--color-stone)',
                        transition: 'width 0.5s ease',
                      }}
                    />
                  </div>
                  {!store.is_free && store.remaining_cents > 0 && (
                    <p className="text-[11px] mt-1" style={{ color: 'var(--color-stone)' }}>
                      Faltan {(store.remaining_cents / 100).toFixed(2)}€ para envio gratis
                    </p>
                  )}
                </>
              )}
            </div>
          ))}

          {/* Total shipping summary */}
          <div className="flex items-center justify-between p-3" style={{ borderRadius: 'var(--radius-xl)', background: 'var(--color-surface)' }}>
            <span className="text-sm font-semibold" style={{ color: 'var(--color-black)' }}>Envio total</span>
            <span className="text-sm font-bold" style={{ color: totalShipping === 0 ? 'var(--color-green)' : 'var(--color-black)' }}>
              {totalShipping === 0 ? 'Gratis' : `${(totalShipping / 100).toFixed(2)}€`}
            </span>
          </div>

          {shippingData?.total_savings_cents > 0 && (
            <p className="text-xs text-center" style={{ color: 'var(--color-green)' }}>
              Ahorras {(shippingData.total_savings_cents / 100).toFixed(2)}€ en envio
            </p>
          )}
        </div>
      )}

      <div className="flex gap-2 mt-5">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 rounded-full text-sm font-medium"
          style={{
            border: '1px solid var(--color-border)',
            color: 'var(--color-stone)',
            background: 'transparent',
            transition: 'var(--transition-fast)',
          }}
        >
          ← Volver
        </button>
        <button
          type="button"
          onClick={() => onNext({ id: 'per-store', carrier: 'Por tienda', price: totalShipping / 100 })}
          className="flex-1 py-3 rounded-full text-sm font-semibold"
          style={{
            background: 'var(--color-black)',
            color: '#fff',
            border: 'none',
            transition: 'var(--transition-fast)',
          }}
        >
          Continuar →
        </button>
      </div>
    </motion.div>
  );
}

// ─── Step 3: Payment ───────────────────────────────────────────────────────
function PaymentStep({ selectedAddress, shippingOption, cartItems, discountCode, onBack, subtotal }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const shippingCost = shippingOption?.price || 0;
  const discountAmount = 0; // Server computes this
  const estimatedTotal = subtotal + shippingCost;

  const handlePay = async () => {
    setIsProcessing(true);
    setError('');
    try {
      const payload = {
        shipping_address: {
          name: selectedAddress.name,
          full_name: selectedAddress.full_name,
          street: selectedAddress.street,
          city: selectedAddress.city,
          postal_code: selectedAddress.postal_code,
          country: selectedAddress.country,
          phone: selectedAddress.phone || '',
        },
        shipping_option_id: shippingOption?.id,
      };
      if (discountCode) payload.discount_code = discountCode;

      const data = await apiClient.post('/payments/create-checkout', payload);
      const url = data?.url;
      if (!url) throw new Error('No se recibió URL de pago');
      window.location.href = url;
    } catch (e) {
      setError(typeof e.message === 'string' ? e.message : 'Error al procesar el pago');
      setIsProcessing(false);
    }
  };

  return (
    <motion.div key="step-payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
      <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--color-black)', fontFamily: 'var(--font-sans)' }}>Pago seguro</h2>

      {/* Order summary */}
      <div
        className="overflow-hidden mb-4"
        style={{
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--color-border)',
          background: 'var(--color-white)',
        }}
      >
        <div>
          {cartItems.map((item, idx) => (
            <div
              key={item.product_id}
              className="flex items-center gap-3 p-3"
              style={idx > 0 ? { borderTop: '1px solid var(--color-surface)' } : {}}
            >
              {item.image && (
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-12 h-12 object-cover shrink-0"
                  style={{ borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--color-black)' }}>{item.name || item.product_name}</p>
                <p className="text-xs" style={{ color: 'var(--color-stone)' }}>x{item.quantity}</p>
              </div>
              <span className="text-sm font-semibold shrink-0" style={{ color: 'var(--color-black)' }}>
                €{((item.unit_price_cents || item.price * 100 || 0) * item.quantity / 100).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        <div className="p-3 space-y-1.5" style={{ borderTop: '1px solid var(--color-border)' }}>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--color-stone)' }}>Subtotal</span>
            <span style={{ color: 'var(--color-black)' }}>€{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--color-stone)' }}>Envío ({shippingOption?.carrier || 'Estándar'})</span>
            <span style={{ color: shippingCost === 0 ? 'var(--color-green)' : 'var(--color-black)', fontWeight: shippingCost === 0 ? 500 : 400 }}>
              {shippingCost === 0 ? 'Gratis' : `€${shippingCost.toFixed(2)}`}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--color-stone)' }}>IVA incluido</span>
          </div>
          <div className="flex justify-between pt-2" style={{ borderTop: '1px solid var(--color-surface)' }}>
            <span className="text-base" style={{ fontWeight: 800, color: 'var(--color-black)' }}>Total</span>
            <span className="text-lg" style={{ fontWeight: 800, color: 'var(--color-black)' }}>€{estimatedTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Shipping address summary */}
      <div
        className="flex items-center gap-2 text-sm p-3 mb-4"
        style={{
          color: 'var(--color-stone)',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-xl)',
        }}
      >
        <MapPin className="w-4 h-4 shrink-0" />
        <span>{selectedAddress?.full_name} — {selectedAddress?.street}, {selectedAddress?.postal_code} {selectedAddress?.city}</span>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-3 text-sm mb-4"
            style={{
              background: 'var(--color-red-light)',
              color: 'var(--color-red)',
              borderRadius: 'var(--radius-xl)',
              border: 'none',
            }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Security badge */}
      <div className="flex items-center justify-center gap-1.5 text-xs mb-4" style={{ color: 'var(--color-stone)' }}>
        <Lock className="w-3 h-3" />
        Pago seguro procesado por Stripe
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onBack}
          disabled={isProcessing}
          className="flex-1 py-3 rounded-full text-sm font-medium disabled:opacity-40"
          style={{
            border: '1px solid var(--color-border)',
            color: 'var(--color-stone)',
            background: 'transparent',
            transition: 'var(--transition-fast)',
          }}
        >
          ← Volver
        </button>
        <button
          type="button"
          onClick={handlePay}
          disabled={isProcessing}
          className="flex-[2] py-3 rounded-full text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
          style={{
            background: 'var(--color-green)',
            color: '#fff',
            border: 'none',
            transition: 'var(--transition-fast)',
          }}
        >
          {isProcessing ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Redirigiendo...</>
          ) : (
            <><Shield className="w-4 h-4" /> Confirmar y pagar →</>
          )}
        </button>
      </div>

      <div className="flex items-center justify-center gap-3 mt-3">
        {['VISA', 'MC', 'AMEX'].map(b => (
          <span
            key={b}
            className="text-[10px] font-bold px-2 py-0.5 rounded"
            style={{ color: 'var(--color-stone)', background: 'var(--color-surface)' }}
          >
            {b}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Main CheckoutPage ──────────────────────────────────────────────────────
const CheckoutPage = () => {
  const navigate = useNavigate();
  const { cartItems: items, getTotalPrice } = useCart();
  const totalCents = getTotalPrice();
  const subtotal = totalCents > 1000 ? totalCents / 100 : totalCents; // cents→EUR if value looks like cents

  const [step, setStep] = useState(0);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [savingAddress, setSavingAddress] = useState(false);
  const [shippingOption, setShippingOption] = useState(null);
  const [discountCode] = useState('');

  // ── Fetch addresses
  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    setLoadingAddresses(true);
    try {
      const data = await apiClient.get('/customer/addresses');
      const addrs = data?.addresses || [];
      const defaultId = data?.default_address_id;
      setAddresses(addrs);
      const preselect = defaultId || addrs[0]?.address_id;
      if (preselect) setSelectedAddressId(preselect);
    } catch {
      /* no addresses */
    } finally {
      setLoadingAddresses(false);
    }
  };

  const handleSaveAddress = async (data) => {
    setSavingAddress(true);
    try {
      await apiClient.post('/customer/addresses', data);
      await fetchAddresses();
    } catch {
      /* error handled by form */
    } finally {
      setSavingAddress(false);
    }
  };

  const selectedAddress = addresses.find(a => a.address_id === selectedAddressId);

  // ── Empty cart
  if (items.length === 0) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-4"
        style={{ background: 'var(--color-cream)' }}
      >
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center mb-4"
          style={{ background: 'var(--color-white)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
        >
          <ShoppingBag className="w-10 h-10" style={{ color: 'var(--color-stone)' }} />
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-black)' }}>Tu carrito está vacío</h2>
        <p className="mb-6" style={{ color: 'var(--color-stone)' }}>Añade productos para continuar</p>
        <button
          onClick={() => navigate('/discover')}
          className="px-6 py-3 rounded-full font-medium"
          style={{
            background: 'var(--color-black)',
            color: '#fff',
            border: 'none',
            transition: 'var(--transition-fast)',
          }}
        >
          Explorar productos
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--color-cream)' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-40"
        style={{ background: 'var(--color-white)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
      >
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => step === 0 ? navigate(-1) : setStep(s => s - 1)}
              className="p-2 rounded-full"
              style={{ transition: 'var(--transition-fast)' }}
            >
              <ArrowLeft className="w-5 h-5" style={{ color: 'var(--color-black)' }} />
            </button>
            <h1 className="text-lg font-bold" style={{ color: 'var(--color-black)', fontFamily: 'var(--font-sans)' }}>Finalizar compra</h1>
          </div>
          <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--color-stone)' }}>
            <Lock className="w-4 h-4" />
            <span>Pago seguro</span>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4">
        <CheckoutStepper current={step} />

        <div
          className="p-5"
          style={{
            background: 'var(--color-white)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
          }}
        >
          <AnimatePresence mode="wait">
            {step === 0 && (
              <AddressStep
                addresses={addresses}
                selectedId={selectedAddressId}
                onSelect={setSelectedAddressId}
                onSaveNew={handleSaveAddress}
                onNext={() => selectedAddressId && setStep(1)}
                loadingAddresses={loadingAddresses}
                savingAddress={savingAddress}
              />
            )}

            {step === 1 && (
              <ShippingStep
                selectedAddress={selectedAddress}
                cartItems={items}
                onNext={(opt) => { setShippingOption(opt); setStep(2); }}
                onBack={() => setStep(0)}
              />
            )}

            {step === 2 && (
              <PaymentStep
                selectedAddress={selectedAddress}
                shippingOption={shippingOption}
                cartItems={items}
                discountCode={discountCode}
                onBack={() => setStep(1)}
                subtotal={subtotal}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
