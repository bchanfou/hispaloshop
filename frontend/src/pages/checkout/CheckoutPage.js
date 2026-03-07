import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Lock, MapPin, CreditCard, Truck, 
  Check, ChevronDown, Plus, Star, Shield, ShoppingBag 
} from 'lucide-react';
import { useCart } from '../../hooks/useCart';

// Mock saved data
const SAVED_ADDRESSES = [
  {
    id: 1,
    name: 'Casa',
    recipient: 'María García',
    street: 'Calle Mayor 123, 2ºB',
    city: '28001 Madrid',
    phone: '+34 612 345 678',
    isDefault: true
  }
];

const SAVED_CARDS = [
  {
    id: 1,
    brand: 'visa',
    last4: '4242',
    expMonth: 12,
    expYear: 26,
    isDefault: true
  }
];

const SHIPPING_METHODS = [
  { id: 'standard', name: 'Estándar', time: '24-48h', price: 4.90 },
  { id: 'express', name: 'Exprés', time: '24h', price: 9.90 },
  { id: 'pickup', name: 'Punto recogida', time: '48-72h', price: 0 }
];

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { items, subtotal, clearCart } = useCart();
  
  const [selectedAddress, setSelectedAddress] = useState(SAVED_ADDRESSES[0]);
  const [selectedShipping, setSelectedShipping] = useState(SHIPPING_METHODS[0]);
  const [selectedPayment, setSelectedPayment] = useState('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [saveForLater, setSaveForLater] = useState(true);

  const shipping = selectedShipping.price;
  const total = subtotal + shipping;

  const handlePayment = async () => {
    setIsProcessing(true);
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    clearCart();
    navigate('/checkout/success', { 
      state: { 
        orderId: 'HS-' + Date.now().toString().slice(-8),
        total,
        estimatedDelivery: 'martes 12 marzo'
      }
    });
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] flex flex-col items-center justify-center p-4">
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-4">
          <ShoppingBag className="w-10 h-10 text-[#6B7280]" />
        </div>
        <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">Tu carrito está vacío</h2>
        <p className="text-[#6B7280] mb-6">Añade productos para continuar</p>
        <button 
          onClick={() => navigate('/discover')}
          className="px-6 py-3 bg-[#2D5A3D] text-white rounded-full font-medium"
        >
          Explorar productos
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-[#1A1A1A]" />
            </button>
            <h1 className="text-lg font-bold text-[#1A1A1A]">Checkout</h1>
          </div>
          <div className="flex items-center gap-1 text-sm text-[#16A34A]">
            <Lock className="w-4 h-4" />
            <span>Seguro</span>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-6">
        {/* Progress indicator */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-[#2D5A3D] font-medium">1. Envío</span>
          <span className="text-[#6B7280]">→</span>
          <span className="text-[#2D5A3D] font-medium">2. Pago</span>
          <span className="text-[#6B7280]">→</span>
          <span className="text-[#6B7280]">3. Confirmar</span>
        </div>

        {/* 1. Address */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#2D5A3D]" />
            Dirección de envío
          </h2>
          
          {selectedAddress && !showAddressForm ? (
            <div className="bg-[#F5F1E8] rounded-xl p-4 border-2 border-[#2D5A3D]">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-[#1A1A1A]">{selectedAddress.name}</span>
                    {selectedAddress.isDefault && (
                      <span className="text-xs bg-[#2D5A3D] text-white px-2 py-0.5 rounded-full">Predeterminada</span>
                    )}
                  </div>
                  <p className="text-sm text-[#1A1A1A]">{selectedAddress.recipient}</p>
                  <p className="text-sm text-[#6B7280]">{selectedAddress.street}</p>
                  <p className="text-sm text-[#6B7280]">{selectedAddress.city}</p>
                  <p className="text-sm text-[#6B7280]">{selectedAddress.phone}</p>
                </div>
                <button 
                  onClick={() => setShowAddressForm(true)}
                  className="text-sm text-[#2D5A3D] font-medium"
                >
                  Cambiar
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <input 
                type="text" 
                placeholder="Nombre completo" 
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]"
              />
              <input 
                type="text" 
                placeholder="Calle y número" 
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]"
              />
              <div className="flex gap-3">
                <input 
                  type="text" 
                  placeholder="Código postal" 
                  className="flex-1 p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]"
                />
                <input 
                  type="text" 
                  placeholder="Ciudad" 
                  className="flex-1 p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]"
                />
              </div>
              <input 
                type="tel" 
                placeholder="Teléfono" 
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]"
              />
              <button 
                onClick={() => setShowAddressForm(false)}
                className="w-full py-3 bg-[#2D5A3D] text-white rounded-xl font-medium"
              >
                Guardar dirección
              </button>
            </div>
          )}

          {!showAddressForm && (
            <button className="flex items-center gap-2 mt-3 text-sm text-[#2D5A3D] font-medium">
              <Plus className="w-4 h-4" />
              Añadir nueva dirección
            </button>
          )}
        </section>

        {/* 2. Shipping Method */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
            <Truck className="w-5 h-5 text-[#2D5A3D]" />
            Método de envío
          </h2>
          
          <div className="space-y-2">
            {SHIPPING_METHODS.map((method) => (
              <label
                key={method.id}
                className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                  selectedShipping.id === method.id 
                    ? 'border-[#2D5A3D] bg-[#2D5A3D]/5' 
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="shipping"
                    checked={selectedShipping.id === method.id}
                    onChange={() => setSelectedShipping(method)}
                    className="w-5 h-5 text-[#2D5A3D] focus:ring-[#2D5A3D]"
                  />
                  <div>
                    <p className="font-medium text-[#1A1A1A]">{method.name}</p>
                    <p className="text-sm text-[#6B7280]">{method.time}</p>
                  </div>
                </div>
                <span className={`font-semibold ${method.price === 0 ? 'text-[#16A34A]' : 'text-[#1A1A1A]'}`}>
                  {method.price === 0 ? 'GRATIS' : `€${method.price.toFixed(2)}`}
                </span>
              </label>
            ))}
          </div>
        </section>

        {/* 3. Payment */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#2D5A3D]" />
            Pago
          </h2>

          {/* Express pay */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <button className="py-3 bg-black text-white rounded-xl font-medium flex items-center justify-center gap-2">
              <span>🍎</span> Pay
            </button>
            <button className="py-3 bg-white border-2 border-gray-200 rounded-xl font-medium flex items-center justify-center gap-2">
              <span className="text-blue-500 text-xl">G</span> Pay
            </button>
            <button className="py-3 bg-[#00A4E0] text-white rounded-xl font-medium">
              Bizum
            </button>
          </div>

          <div className="relative text-center my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <span className="relative bg-white px-4 text-sm text-[#6B7280]">O pagar con tarjeta</span>
          </div>

          {/* Saved cards */}
          {SAVED_CARDS.map((card) => (
            <label
              key={card.id}
              className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer mb-2 ${
                selectedPayment === 'card' 
                  ? 'border-[#2D5A3D] bg-[#2D5A3D]/5' 
                  : 'border-gray-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="payment"
                  checked={selectedPayment === 'card'}
                  onChange={() => setSelectedPayment('card')}
                  className="w-5 h-5 text-[#2D5A3D]"
                />
                <div className="flex items-center gap-2">
                  <div className="w-10 h-6 bg-gray-100 rounded flex items-center justify-center text-xs font-bold">
                    VISA
                  </div>
                  <span className="text-[#1A1A1A]">•••• {card.last4}</span>
                </div>
              </div>
              <span className="text-sm text-[#6B7280]">{card.expMonth}/{card.expYear}</span>
            </label>
          ))}

          <button className="flex items-center gap-2 mt-3 text-sm text-[#2D5A3D] font-medium">
            <Plus className="w-4 h-4" />
            Añadir nueva tarjeta
          </button>
        </section>

        {/* Order Summary */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-4">Resumen del pedido</h2>
          
          {/* Items summary */}
          <div className="space-y-2 mb-4">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-[#6B7280]">{item.name} x{item.quantity}</span>
                <span className="text-[#1A1A1A]">€{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm text-[#6B7280]">
              <span>Subtotal ({items.reduce((a, b) => a + b.quantity, 0)} productos)</span>
              <span>€{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-[#6B7280]">
              <span>Envío ({selectedShipping.name})</span>
              <span>{shipping === 0 ? 'GRATIS' : `€${shipping.toFixed(2)}`}</span>
            </div>
            <div className="flex justify-between text-xl font-bold text-[#1A1A1A] pt-2 border-t">
              <span>Total</span>
              <span>€{total.toFixed(2)}</span>
            </div>
          </div>

          {/* Save for next time */}
          <label className="flex items-center gap-3 mt-4">
            <input
              type="checkbox"
              checked={saveForLater}
              onChange={(e) => setSaveForLater(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-[#2D5A3D] focus:ring-[#2D5A3D]"
            />
            <span className="text-sm text-[#6B7280]">Guardar datos para próximas compras</span>
          </label>

          {/* Pay button */}
          <button
            onClick={handlePayment}
            disabled={isProcessing}
            className="w-full mt-6 py-4 bg-[#2D5A3D] text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-[#234a31] disabled:opacity-70 transition-colors"
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Procesando...
              </>
            ) : (
              <>Pagar €{total.toFixed(2)}</>
            )}
          </button>

          <div className="flex items-center justify-center gap-2 mt-4 text-sm text-[#6B7280]">
            <Lock className="w-4 h-4" />
            <span>Pago seguro por Stripe</span>
          </div>
        </section>
      </div>
    </div>
  );
};



export default CheckoutPage;
