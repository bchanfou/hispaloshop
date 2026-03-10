import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Lock, MapPin, Truck, Check, Plus, Shield,
  ShoppingBag, Trash2, Star, Loader2, Tag, ChevronDown, ChevronUp
} from 'lucide-react';
import { useCart } from '../../hooks/useCart';
import { API } from '../../utils/api';

// ─── Zod schema ────────────────────────────────────────────────────────────
const addressSchema = z.object({
  name: z.string().min(1, 'Nombre de dirección requerido'),
  full_name: z.string().min(2, 'Nombre completo requerido'),
  street: z.string().min(5, 'Dirección requerida'),
  city: z.string().min(2, 'Ciudad requerida'),
  postal_code: z.string().regex(/^\d{5}$/, 'Código postal debe tener 5 dígitos'),
  country: z.string().min(1, 'País requerido'),
  phone: z.string().optional(),
});

// ─── Address Card ───────────────────────────────────────────────────────────
function AddressCard({ address, selected, onSelect, onDelete, onSetDefault }) {
  return (
    <label
      className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
        selected ? 'border-accent bg-accent/5' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <input
        type="radio"
        name="address"
        checked={selected}
        onChange={onSelect}
        className="w-5 h-5 mt-0.5 text-accent focus:ring-accent"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-semibold text-gray-900 text-sm">{address.name}</span>
          {address.is_default && (
            <span className="text-xs bg-accent text-white px-2 py-0.5 rounded-full">Predeterminada</span>
          )}
        </div>
        <p className="text-sm text-gray-900">{address.full_name}</p>
        <p className="text-sm text-text-muted">{address.street}</p>
        <p className="text-sm text-text-muted">{address.postal_code} {address.city}</p>
        {address.phone && <p className="text-sm text-text-muted">{address.phone}</p>}
      </div>
      <div className="flex flex-col gap-1 ml-2 shrink-0">
        {!address.is_default && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); onSetDefault(); }}
            className="text-xs text-accent font-medium hover:underline"
          >
            Predeterminar
          </button>
        )}
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); onDelete(); }}
          className="text-xs text-state-error font-medium flex items-center gap-1 hover:underline"
        >
          <Trash2 className="w-3 h-3" />
          Eliminar
        </button>
      </div>
    </label>
  );
}

// ─── Address Form ───────────────────────────────────────────────────────────
function AddressForm({ onSave, onCancel, saving }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(addressSchema),
    defaultValues: { country: 'ES' },
  });

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-3 mt-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <input
            {...register('name')}
            placeholder="Nombre de esta dirección (ej. Casa)"
            className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent text-sm"
          />
          {errors.name && <p className="text-xs text-state-error mt-1">{errors.name.message}</p>}
        </div>
        <div className="col-span-2">
          <input
            {...register('full_name')}
            placeholder="Nombre completo del destinatario"
            className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent text-sm"
          />
          {errors.full_name && <p className="text-xs text-state-error mt-1">{errors.full_name.message}</p>}
        </div>
        <div className="col-span-2">
          <input
            {...register('street')}
            placeholder="Calle y número"
            className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent text-sm"
          />
          {errors.street && <p className="text-xs text-state-error mt-1">{errors.street.message}</p>}
        </div>
        <div>
          <input
            {...register('postal_code')}
            placeholder="Código postal"
            maxLength={5}
            className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent text-sm"
          />
          {errors.postal_code && <p className="text-xs text-state-error mt-1">{errors.postal_code.message}</p>}
        </div>
        <div>
          <input
            {...register('city')}
            placeholder="Ciudad"
            className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent text-sm"
          />
          {errors.city && <p className="text-xs text-state-error mt-1">{errors.city.message}</p>}
        </div>
        <div>
          <select
            {...register('country')}
            className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent text-sm bg-white"
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
          <input
            {...register('phone')}
            type="tel"
            placeholder="Teléfono (opcional)"
            className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent text-sm"
          />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-3 bg-accent text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Guardar dirección
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-3 border border-gray-200 rounded-xl text-sm text-text-muted hover:bg-gray-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ─── Main CheckoutPage ──────────────────────────────────────────────────────
const CheckoutPage = () => {
  const navigate = useNavigate();
  const { items, subtotal, clearCart } = useCart();

  const [addresses, setAddresses] = useState([]);
  const [defaultAddressId, setDefaultAddressId] = useState(null);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [savingAddress, setSavingAddress] = useState(false);

  const [discountCode, setDiscountCode] = useState('');
  const [showDiscountInput, setShowDiscountInput] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  // ── Fetch addresses ──────────────────────────────────────────────────────
  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    setLoadingAddresses(true);
    try {
      const res = await axios.get(`${API}/customer/addresses`, { withCredentials: true });
      const addrs = res.data.addresses || [];
      const defaultId = res.data.default_address_id;
      setAddresses(addrs);
      setDefaultAddressId(defaultId);
      // Auto-select default or first
      const preselect = defaultId || addrs[0]?.address_id;
      if (preselect) setSelectedAddressId(preselect);
      if (addrs.length === 0) setShowAddressForm(true);
    } catch {
      setShowAddressForm(true);
    } finally {
      setLoadingAddresses(false);
    }
  };

  const handleSaveAddress = async (data) => {
    setSavingAddress(true);
    setError(null);
    try {
      const isFirst = addresses.length === 0;
      await axios.post(
        `${API}/customer/addresses`,
        { ...data, is_default: isFirst },
        { withCredentials: true }
      );
      await fetchAddresses();
      setShowAddressForm(false);
    } catch (e) {
      setError(e.response?.data?.detail || 'Error al guardar la dirección');
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (addressId) => {
    try {
      await axios.delete(`${API}/customer/addresses/${addressId}`, { withCredentials: true });
      await fetchAddresses();
    } catch {
      setError('Error al eliminar la dirección');
    }
  };

  const handleSetDefault = async (addressId) => {
    try {
      await axios.put(`${API}/customer/addresses/${addressId}/default`, {}, { withCredentials: true });
      await fetchAddresses();
    } catch {
      setError('Error al actualizar la dirección predeterminada');
    }
  };

  // ── Payment ──────────────────────────────────────────────────────────────
  const handlePayment = async () => {
    const selectedAddress = addresses.find(a => a.address_id === selectedAddressId);
    if (!selectedAddress) {
      setError('Selecciona una dirección de envío');
      return;
    }

    setIsProcessing(true);
    setError(null);

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
      };
      if (discountCode.trim()) {
        payload.discount_code = discountCode.trim();
      }

      const res = await axios.post(`${API}/payments/create-checkout`, payload, { withCredentials: true });
      const { url } = res.data;
      if (!url) throw new Error('No se recibió URL de pago');
      clearCart();
      window.location.href = url;
    } catch (e) {
      const msg = e.response?.data?.detail || e.message || 'Error al procesar el pago';
      setError(typeof msg === 'string' ? msg : 'Error al procesar el pago');
      setIsProcessing(false);
    }
  };

  // ── Empty cart ───────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background-subtle flex flex-col items-center justify-center p-4">
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
          <ShoppingBag className="w-10 h-10 text-text-muted" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Tu carrito está vacío</h2>
        <p className="text-text-muted mb-6">Añade productos para continuar</p>
        <button
          onClick={() => navigate('/discover')}
          className="px-6 py-3 bg-accent text-white rounded-full font-medium"
        >
          Explorar productos
        </button>
      </div>
    );
  }

  const selectedAddress = addresses.find(a => a.address_id === selectedAddressId);

  return (
    <div className="min-h-screen bg-background-subtle pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-900" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">Checkout</h1>
          </div>
          <div className="flex items-center gap-1 text-sm text-state-success">
            <Lock className="w-4 h-4" />
            <span>Pago seguro</span>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-5">

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-state-error/10 border border-state-error/30 text-state-error rounded-xl p-3 text-sm"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 1. Shipping Address */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-accent" />
            Dirección de envío
          </h2>

          {loadingAddresses ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
            </div>
          ) : (
            <div className="space-y-2">
              {addresses.map(addr => (
                <AddressCard
                  key={addr.address_id}
                  address={addr}
                  selected={selectedAddressId === addr.address_id}
                  onSelect={() => { setSelectedAddressId(addr.address_id); setError(null); }}
                  onDelete={() => handleDeleteAddress(addr.address_id)}
                  onSetDefault={() => handleSetDefault(addr.address_id)}
                />
              ))}

              {!showAddressForm && (
                <button
                  onClick={() => setShowAddressForm(true)}
                  className="flex items-center gap-2 mt-2 text-sm text-accent font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Añadir nueva dirección
                </button>
              )}

              <AnimatePresence>
                {showAddressForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <AddressForm
                      onSave={handleSaveAddress}
                      onCancel={() => setShowAddressForm(false)}
                      saving={savingAddress}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </section>

        {/* 2. Shipping info */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Truck className="w-5 h-5 text-accent" />
            Envío
          </h2>
          <p className="text-sm text-text-muted">
            El coste de envío se calcula según el productor y se mostrará en el siguiente paso.
          </p>
          {selectedAddress && (
            <div className="mt-3 flex items-center gap-2 text-sm text-state-success">
              <Check className="w-4 h-4 shrink-0" />
              <span>Entregar en: {selectedAddress.street}, {selectedAddress.postal_code} {selectedAddress.city}</span>
            </div>
          )}
        </section>

        {/* 3. Order Summary */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Resumen del pedido</h2>

          <div className="space-y-3 mb-4">
            {items.map((item) => (
              <div key={item.id || item.product_id} className="flex items-center gap-3">
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-12 h-12 rounded-lg object-cover bg-gray-100 shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                  <p className="text-xs text-text-muted">x{item.quantity}</p>
                </div>
                <span className="text-sm font-semibold text-gray-900 shrink-0">
                  €{(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* Discount code */}
          <div className="border-t pt-4">
            <button
              onClick={() => setShowDiscountInput(v => !v)}
              className="flex items-center gap-2 text-sm text-accent font-medium mb-2"
            >
              <Tag className="w-4 h-4" />
              Código de descuento
              {showDiscountInput ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            <AnimatePresence>
              {showDiscountInput && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <input
                    type="text"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                    placeholder="Introduce tu código"
                    className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent text-sm mb-3"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Totals */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm text-text-muted">
              <span>Subtotal ({items.reduce((a, b) => a + b.quantity, 0)} productos)</span>
              <span>€{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-text-muted">
              <span>Envío</span>
              <span className="text-state-info text-xs">Se calcula en siguiente paso</span>
            </div>
            <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t">
              <span>Total estimado</span>
              <span>€{subtotal.toFixed(2)}</span>
            </div>
            <p className="text-xs text-text-muted">+ envío e impuestos aplicables</p>
          </div>

          {/* Pay button */}
          <button
            onClick={handlePayment}
            disabled={isProcessing || !selectedAddressId || showAddressForm}
            className="w-full mt-5 py-4 bg-accent text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-accent/90 disabled:opacity-50 transition-colors"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Redirigiendo a Stripe...
              </>
            ) : (
              <>
                <Shield className="w-5 h-5" />
                Pagar €{subtotal.toFixed(2)}+
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-2 mt-3 text-xs text-text-muted">
            <Lock className="w-3.5 h-3.5" />
            <span>Pago procesado de forma segura por Stripe</span>
          </div>

          <div className="flex items-center justify-center gap-4 mt-2">
            {['VISA', 'MC', 'AMEX'].map(b => (
              <span key={b} className="text-xs font-bold text-text-muted bg-gray-100 px-2 py-0.5 rounded">{b}</span>
            ))}
            <span className="text-xs font-bold text-text-muted bg-[#00A4E0]/10 text-[#00A4E0] px-2 py-0.5 rounded">Bizum</span>
          </div>
        </section>

      </div>
    </div>
  );
};

export default CheckoutPage;
