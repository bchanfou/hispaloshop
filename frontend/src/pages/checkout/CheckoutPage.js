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
              <div className={`flex-1 h-[2px] transition-colors ${done ? 'bg-stone-950' : 'bg-stone-200'}`} />
            )}
            <div className="flex flex-col items-center gap-1">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold transition-all ${
                done ? 'bg-stone-950 text-white' : active ? 'bg-stone-950 text-white ring-4 ring-stone-200' : 'bg-stone-100 text-stone-400'
              }`}>
                {done ? <Check className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
              </div>
              <span className={`text-[11px] font-medium ${active || done ? 'text-stone-950' : 'text-stone-400'}`}>
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

  return (
    <motion.div key="step-address" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
      <h2 className="text-lg font-bold text-stone-950 mb-4">¿Dónde te lo enviamos?</h2>

      {loadingAddresses ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
        </div>
      ) : (
        <div className="space-y-2">
          {addresses.map(addr => (
            <div
              key={addr.address_id}
              onClick={() => onSelect(addr.address_id)}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                selectedId === addr.address_id ? 'border-stone-950 bg-stone-50' : 'border-stone-200 hover:border-stone-400'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-stone-950 text-sm">{addr.name || addr.full_name}</span>
                    {addr.is_default && (
                      <span className="text-[10px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full">Principal</span>
                    )}
                  </div>
                  <p className="text-sm text-stone-600">{addr.full_name}</p>
                  <p className="text-sm text-stone-500">{addr.street}</p>
                  <p className="text-sm text-stone-500">{addr.postal_code} {addr.city}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 shrink-0 mt-1 flex items-center justify-center ${
                  selectedId === addr.address_id ? 'border-stone-950 bg-stone-950' : 'border-stone-300'
                }`}>
                  {selectedId === addr.address_id && <Check className="w-3 h-3 text-white" />}
                </div>
              </div>
            </div>
          ))}

          {!showForm ? (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-stone-200 py-3 text-sm font-medium text-stone-500 transition-colors hover:border-stone-400 hover:text-stone-950"
            >
              <Plus className="w-4 h-4" /> Añadir nueva dirección
            </button>
          ) : (
            <form onSubmit={handleSubmit(handleSave)} className="space-y-3 p-4 border border-stone-200 rounded-xl">
              <p className="text-sm font-bold text-stone-950">Nueva dirección</p>
              {[
                { key: 'name', label: 'Nombre (ej. Casa)', placeholder: 'Casa' },
                { key: 'full_name', label: 'Nombre completo', placeholder: 'María García' },
                { key: 'street', label: 'Dirección', placeholder: 'Calle Mayor 12, 3ºB' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-stone-600 mb-1">{f.label}</label>
                  <input {...register(f.key)} placeholder={f.placeholder} className={`w-full px-3 py-2.5 border rounded-xl text-sm outline-none focus:border-stone-950 transition-colors ${errors[f.key] ? 'border-stone-700' : 'border-stone-200'}`} />
                  {errors[f.key] && <p className="text-xs text-stone-700 mt-1">{errors[f.key].message}</p>}
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Ciudad</label>
                  <input {...register('city')} placeholder="Sevilla" className={`w-full px-3 py-2.5 border rounded-xl text-sm outline-none focus:border-stone-950 ${errors.city ? 'border-stone-700' : 'border-stone-200'}`} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Código postal</label>
                  <input {...register('postal_code')} placeholder="41001" className={`w-full px-3 py-2.5 border rounded-xl text-sm outline-none focus:border-stone-950 ${errors.postal_code ? 'border-stone-700' : 'border-stone-200'}`} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">País</label>
                  <select {...register('country')} className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm bg-white">
                    <option value="ES">España</option>
                    <option value="PT">Portugal</option>
                    <option value="FR">Francia</option>
                    <option value="DE">Alemania</option>
                    <option value="IT">Italia</option>
                    <option value="GB">Reino Unido</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Teléfono</label>
                  <input {...register('phone')} type="tel" placeholder="Opcional" className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm outline-none focus:border-stone-950" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={savingAddress} className="flex-1 py-2.5 bg-stone-950 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60">
                  {savingAddress ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Guardar
                </button>
                {addresses.length > 0 && (
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 border border-stone-200 rounded-xl text-sm text-stone-500 hover:bg-stone-50">
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
        className="w-full mt-5 py-3 bg-stone-950 text-white rounded-full text-sm font-semibold transition-colors hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Continuar →
      </button>
    </motion.div>
  );
}

// ─── Step 2: Shipping ──────────────────────────────────────────────────────
function ShippingStep({ selectedAddress, cartItems, onNext, onBack }) {
  const [options, setOptions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Try to fetch shipping options; fallback to standard option
    apiClient.post('/cart/shipping-options', {
      address_id: selectedAddress?.address_id,
      items: cartItems.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
    })
      .then(data => {
        const opts = data?.options || [];
        setOptions(opts);
        if (opts.length > 0) setSelected(opts[0].id);
      })
      .catch(() => {
        // Fallback: standard shipping
        const fallback = [
          { id: 'standard', carrier: 'Envío estándar', estimated_days: 3, price: 4.99 },
          { id: 'express', carrier: 'Envío exprés', estimated_days: 1, price: 9.99 },
        ];
        setOptions(fallback);
        setSelected('standard');
      })
      .finally(() => setIsLoading(false));
  }, [selectedAddress, cartItems]);

  const selectedOption = options.find(o => o.id === selected);

  return (
    <motion.div key="step-shipping" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
      <h2 className="text-lg font-bold text-stone-950 mb-4">Opciones de envío</h2>

      {selectedAddress && (
        <div className="mb-4 flex items-center gap-2 text-sm text-stone-600 bg-stone-50 rounded-xl p-3">
          <MapPin className="w-4 h-4 shrink-0" />
          <span>{selectedAddress.street}, {selectedAddress.postal_code} {selectedAddress.city}</span>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1].map(i => (
            <div key={i} className="h-[68px] rounded-xl bg-stone-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {options.map(opt => (
            <div
              key={opt.id}
              onClick={() => setSelected(opt.id)}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-colors flex items-center justify-between ${
                selected === opt.id ? 'border-stone-950 bg-stone-50' : 'border-stone-200 hover:border-stone-400'
              }`}
            >
              <div>
                <p className="text-sm font-semibold text-stone-950">{opt.carrier}</p>
                <p className="text-xs text-stone-500">
                  {opt.estimated_days === 0 ? 'Hoy' : opt.estimated_days === 1 ? 'Mañana' : `${opt.estimated_days}-${opt.estimated_days + 1} días`}
                </p>
              </div>
              <p className={`text-sm font-bold ${opt.price === 0 ? 'text-stone-700' : 'text-stone-950'}`}>
                {opt.price === 0 ? 'Gratis' : `${opt.price.toFixed(2)}€`}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-5">
        <button type="button" onClick={onBack} className="flex-1 py-3 border border-stone-200 rounded-full text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors">
          ← Volver
        </button>
        <button
          type="button"
          onClick={() => onNext(selectedOption)}
          disabled={!selected}
          className="flex-1 py-3 bg-stone-950 text-white rounded-full text-sm font-semibold hover:bg-stone-800 disabled:opacity-40 transition-colors"
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
      <h2 className="text-lg font-bold text-stone-950 mb-4">Pago seguro</h2>

      {/* Order summary */}
      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden mb-4">
        <div className="divide-y divide-stone-100">
          {cartItems.map(item => (
            <div key={item.product_id} className="flex items-center gap-3 p-3">
              {item.image && (
                <img src={item.image} alt={item.name} className="w-12 h-12 rounded-lg object-cover bg-stone-100 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-950 truncate">{item.name || item.product_name}</p>
                <p className="text-xs text-stone-500">x{item.quantity}</p>
              </div>
              <span className="text-sm font-semibold text-stone-950 shrink-0">
                €{(item.price * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        <div className="border-t border-stone-200 p-3 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-stone-500">Subtotal</span>
            <span className="text-stone-950">€{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-stone-500">Envío ({shippingOption?.carrier || 'Estándar'})</span>
            <span className={shippingCost === 0 ? 'text-stone-700 font-medium' : 'text-stone-950'}>
              {shippingCost === 0 ? 'Gratis' : `€${shippingCost.toFixed(2)}`}
            </span>
          </div>
          <div className="flex justify-between text-sm text-stone-500">
            <span>IVA incluido</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-stone-100">
            <span className="text-base font-bold text-stone-950">Total</span>
            <span className="text-lg font-black text-stone-950">€{estimatedTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Shipping address summary */}
      <div className="flex items-center gap-2 text-sm text-stone-600 bg-stone-50 rounded-xl p-3 mb-4">
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
            className="bg-stone-50 border border-stone-200 text-stone-700 rounded-xl p-3 text-sm mb-4"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Security badge */}
      <div className="flex items-center justify-center gap-1.5 text-xs text-stone-400 mb-4">
        <Lock className="w-3 h-3" />
        Pago seguro procesado por Stripe
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onBack}
          disabled={isProcessing}
          className="flex-1 py-3 border border-stone-200 rounded-full text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-40"
        >
          ← Volver
        </button>
        <button
          type="button"
          onClick={handlePay}
          disabled={isProcessing}
          className="flex-[2] py-3 bg-stone-950 text-white rounded-full text-sm font-semibold hover:bg-stone-800 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
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
          <span key={b} className="text-[10px] font-bold text-stone-400 bg-stone-100 px-2 py-0.5 rounded">{b}</span>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Main CheckoutPage ──────────────────────────────────────────────────────
const CheckoutPage = () => {
  const navigate = useNavigate();
  const { cartItems: items, getTotalPrice } = useCart();
  const subtotal = getTotalPrice();

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
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
          <ShoppingBag className="w-10 h-10 text-stone-500" />
        </div>
        <h2 className="text-xl font-bold text-stone-950 mb-2">Tu carrito está vacío</h2>
        <p className="text-stone-500 mb-6">Añade productos para continuar</p>
        <button onClick={() => navigate('/discover')} className="px-6 py-3 bg-stone-950 text-white rounded-full font-medium hover:bg-stone-800 transition-colors">
          Explorar productos
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button onClick={() => step === 0 ? navigate(-1) : setStep(s => s - 1)} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-stone-950" />
            </button>
            <h1 className="text-lg font-bold text-stone-950">Finalizar compra</h1>
          </div>
          <div className="flex items-center gap-1 text-sm text-stone-500">
            <Lock className="w-4 h-4" />
            <span>Pago seguro</span>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4">
        <CheckoutStepper current={step} />

        <div className="bg-white rounded-2xl p-5 shadow-sm">
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
