import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { X, Check, Loader2, Plus, Tag, ChevronRight, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useCartAddresses, useCartCheckout, useCartPricing } from '../features/cart/hooks';

/* ── Stepper ── */
function Stepper({ current }) {
  const steps = ['Dirección', 'Pago', 'Confirmación'];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 0, padding: '16px 24px',
      borderBottom: '1px solid var(--color-border)',
      background: 'var(--color-white)',
    }}>
      {steps.map((label, i) => {
        const step = i + 1;
        const isCompleted = step < current;
        const isActive = step === current;
        return (
          <React.Fragment key={step}>
            {i > 0 && (
              <div style={{
                width: 32, height: 2,
                background: isCompleted ? 'var(--color-black)' : 'var(--color-border)',
                margin: '0 4px',
              }} />
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700,
                background: isCompleted || isActive ? 'var(--color-black)' : 'transparent',
                color: isCompleted || isActive ? 'var(--color-white)' : 'var(--color-stone)',
                border: isCompleted || isActive ? 'none' : '1.5px solid var(--color-border)',
              }}>
                {isCompleted ? <Check size={14} /> : step}
              </div>
              <span style={{
                fontSize: 13, fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--color-black)' : 'var(--color-stone)',
                fontFamily: 'var(--font-sans)',
              }}>
                {label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ── Order Summary Card ── */
function OrderSummary({ cartItems, cartSummary, appliedDiscount, shippingLabel }) {
  const subtotal = cartSummary?.subtotal_cents ? cartSummary.subtotal_cents / 100 : 0;
  const discount = cartSummary?.discount_cents ? cartSummary.discount_cents / 100 : 0;
  const shipping = cartSummary?.shipping_cents ? cartSummary.shipping_cents / 100 : 0;
  const total = cartSummary?.total_cents ? cartSummary.total_cents / 100 : subtotal - discount + shipping;

  return (
    <div style={{
      background: 'var(--color-surface, #f5f5f4)',
      borderRadius: 'var(--radius-xl)',
      padding: 16, fontFamily: 'var(--font-sans)',
    }}>
      {cartItems.slice(0, 5).map((item) => (
        <div key={item.product_id + (item.variant_id || '')} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          paddingBottom: 10, marginBottom: 10,
          borderBottom: '1px solid var(--color-border)',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 'var(--radius-md)',
            background: 'var(--color-border)', overflow: 'hidden', flexShrink: 0,
          }}>
            {item.image && <img src={item.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-black)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.name}
            </p>
            <p style={{ fontSize: 12, color: 'var(--color-stone)', margin: 0 }}>x{item.quantity}</p>
          </div>
        </div>
      ))}
      {cartItems.length > 5 && (
        <p style={{ fontSize: 12, color: 'var(--color-stone)', marginBottom: 10 }}>+{cartItems.length - 5} más</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Row label="Subtotal" value={`${subtotal.toFixed(2)}€`} />
        {discount > 0 && <Row label="Descuento" value={`-${discount.toFixed(2)}€`} color="var(--color-black)" />}
        <Row label="Envío" value={shipping === 0 ? (shippingLabel || 'Calculando...') : `${shipping.toFixed(2)}€`} />
        <div style={{ height: 1, background: 'var(--color-border)', margin: '4px 0' }} />
        <Row label="Total" value={`${total.toFixed(2)}€`} bold />
      </div>
    </div>
  );
}

function Row({ label, value, bold, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 13, color: 'var(--color-stone)' }}>{label}</span>
      <span style={{
        fontSize: bold ? 18 : 14,
        fontWeight: bold ? 700 : 500,
        color: color || 'var(--color-black)',
      }}>{value}</span>
    </div>
  );
}

/* ── Main Component ── */
export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cartItems, appliedDiscount, applyDiscount, removeDiscount, getTotalPrice } = useCart();
  const { savedAddresses, defaultAddressId, createAddress, savingAddress, isLoading: addressesLoading } = useCartAddresses();
  const { cartSummary } = useCartPricing(cartItems, appliedDiscount);
  const { checkoutLoading, createCheckout } = useCartCheckout();

  const [step, setStep] = useState(1);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    full_name: '', street: '', floor: '', postal_code: '', city: '', country: 'ES', phone: '',
  });
  const [saveAddress, setSaveAddress] = useState(true);
  const [discountCode, setDiscountCode] = useState('');
  const [discountLoading, setDiscountLoading] = useState(false);

  // Redirect if not logged in or no items
  useEffect(() => {
    if (!user) { navigate('/login', { replace: true }); return; }
    if (cartItems.length === 0) { navigate('/cart', { replace: true }); }
  }, [user, cartItems.length, navigate]);

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
    if (!newAddress.full_name || !newAddress.street || !newAddress.postal_code || !newAddress.city) {
      toast.error('Completa todos los campos obligatorios');
      return;
    }
    try {
      await createAddress({
        name: 'Dirección',
        full_name: newAddress.full_name,
        street: newAddress.street + (newAddress.floor ? `, ${newAddress.floor}` : ''),
        postal_code: newAddress.postal_code,
        city: newAddress.city,
        country: newAddress.country,
        phone: newAddress.phone,
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
    try {
      const result = await applyDiscount(discountCode.toUpperCase());
      if (!result?.success) throw new Error(result?.error || 'Código no válido');
      setDiscountCode('');
      toast.success('Descuento aplicado');
    } catch (err) {
      toast.error(err?.message || 'Código no válido');
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

  const total = cartSummary?.total_cents ? (cartSummary.total_cents / 100).toFixed(2) : '...';

  const inputStyle = {
    width: '100%', height: 46, padding: '0 14px',
    fontSize: 14, fontFamily: 'var(--font-sans)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    background: 'var(--color-white)',
    color: 'var(--color-black)',
    outline: 'none', boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'block', fontSize: 12, fontWeight: 600,
    color: 'var(--color-black)', marginBottom: 4,
    fontFamily: 'var(--font-sans)',
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--color-cream)',
      fontFamily: 'var(--font-sans)',
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'var(--color-white)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <button
          onClick={() => navigate('/cart')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
          aria-label="Volver al carrito"
        >
          <X size={22} color="var(--color-black)" />
        </button>
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-black)', letterSpacing: '-0.02em' }}>
          hispaloshop
        </span>
        <div style={{ width: 30 }} />
      </div>

      {/* Stepper */}
      <Stepper current={step} />

      {/* Content */}
      <div style={{ maxWidth: 540, margin: '0 auto', padding: '24px 16px 100px' }}>
        {/* ── STEP 1: Address ── */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-black)', marginBottom: 20 }}>
              ¿Dónde enviamos tu pedido?
            </h2>

            {/* Saved addresses */}
            {addressesLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                <Loader2 size={24} color="var(--color-stone)" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            ) : (
              <>
                {savedAddresses.map(addr => (
                  <button
                    key={addr.address_id}
                    onClick={() => { setSelectedAddressId(addr.address_id); setShowNewForm(false); }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'flex-start', gap: 12,
                      padding: 14, marginBottom: 10, textAlign: 'left',
                      background: 'var(--color-white)',
                      border: selectedAddressId === addr.address_id
                        ? '2px solid var(--color-black)' : '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-xl)',
                      cursor: 'pointer', fontFamily: 'var(--font-sans)',
                    }}
                  >
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                      border: selectedAddressId === addr.address_id
                        ? '6px solid var(--color-black)' : '2px solid var(--color-border)',
                    }} />
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-black)', margin: 0 }}>
                        {addr.full_name}
                        {addr.is_default && (
                          <span style={{
                            marginLeft: 8, fontSize: 11, fontWeight: 600,
                            color: 'var(--color-black)',
                            background: 'var(--color-surface)',
                            padding: '2px 8px', borderRadius: 'var(--radius-full, 999px)',
                          }}>Principal</span>
                        )}
                      </p>
                      <p style={{ fontSize: 13, color: 'var(--color-stone)', margin: '2px 0 0' }}>
                        {addr.street}, {addr.city} {addr.postal_code}
                      </p>
                    </div>
                  </button>
                ))}

                {/* Add new address button */}
                {!showNewForm && (
                  <button
                    onClick={() => setShowNewForm(true)}
                    style={{
                      width: '100%', padding: 14, display: 'flex', alignItems: 'center', gap: 8,
                      background: 'var(--color-white)',
                      border: '1.5px dashed var(--color-border)',
                      borderRadius: 'var(--radius-xl)',
                      fontSize: 14, fontWeight: 600,
                      color: 'var(--color-black)',
                      cursor: 'pointer', fontFamily: 'var(--font-sans)',
                    }}
                  >
                    <Plus size={18} /> Añadir nueva dirección
                  </button>
                )}

                {/* New address form */}
                {showNewForm && (
                  <div style={{
                    background: 'var(--color-white)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-xl)',
                    padding: 16, marginTop: 8,
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <label style={labelStyle}>Nombre completo</label>
                        <input value={newAddress.full_name} onChange={e => setNewAddress(p => ({ ...p, full_name: e.target.value }))} style={inputStyle} placeholder="María García" />
                      </div>
                      <div>
                        <label style={labelStyle}>Dirección (calle y número)</label>
                        <input value={newAddress.street} onChange={e => setNewAddress(p => ({ ...p, street: e.target.value }))} style={inputStyle} placeholder="Calle Mayor 12" />
                      </div>
                      <div>
                        <label style={labelStyle}>Piso/Puerta (opcional)</label>
                        <input value={newAddress.floor} onChange={e => setNewAddress(p => ({ ...p, floor: e.target.value }))} style={inputStyle} placeholder="3ºA" />
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <label style={labelStyle}>Código postal</label>
                          <input value={newAddress.postal_code} onChange={e => setNewAddress(p => ({ ...p, postal_code: e.target.value }))} style={inputStyle} placeholder="28001" />
                        </div>
                        <div style={{ flex: 1.5 }}>
                          <label style={labelStyle}>Ciudad</label>
                          <input value={newAddress.city} onChange={e => setNewAddress(p => ({ ...p, city: e.target.value }))} style={inputStyle} placeholder="Madrid" />
                        </div>
                      </div>
                      <div>
                        <label style={labelStyle}>País</label>
                        <select value={newAddress.country} onChange={e => setNewAddress(p => ({ ...p, country: e.target.value }))} style={inputStyle}>
                          <option value="ES">España</option>
                          <option value="PT">Portugal</option>
                          <option value="FR">Francia</option>
                          <option value="DE">Alemania</option>
                          <option value="IT">Italia</option>
                          <option value="GB">Reino Unido</option>
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Teléfono</label>
                        <input value={newAddress.phone} onChange={e => setNewAddress(p => ({ ...p, phone: e.target.value }))} style={inputStyle} placeholder="+34 600 000 000" />
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-stone)', cursor: 'pointer' }}>
                        <input type="checkbox" checked={saveAddress} onChange={e => setSaveAddress(e.target.checked)} style={{ accentColor: 'var(--color-black)' }} />
                        Guardar esta dirección
                      </label>
                      <button
                        onClick={handleSaveNewAddress}
                        disabled={savingAddress}
                        style={{
                          height: 44, background: 'var(--color-black)', color: 'var(--color-white)',
                          border: 'none', borderRadius: 'var(--radius-lg)',
                          fontSize: 14, fontWeight: 600, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}
                      >
                        {savingAddress ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Guardar dirección'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Summary */}
            <div style={{ marginTop: 24 }}>
              <OrderSummary cartItems={cartItems} cartSummary={cartSummary} appliedDiscount={appliedDiscount} shippingLabel="Según dirección" />
            </div>

            {/* Continue */}
            <button
              onClick={() => { if (selectedAddress) setStep(2); else toast.error('Selecciona una dirección'); }}
              disabled={!selectedAddress}
              style={{
                width: '100%', height: 48, marginTop: 20,
                background: selectedAddress ? 'var(--color-black)' : 'var(--color-stone)',
                color: 'var(--color-white)',
                border: 'none', borderRadius: 'var(--radius-lg)',
                fontSize: 15, fontWeight: 600,
                cursor: selectedAddress ? 'pointer' : 'not-allowed',
                opacity: selectedAddress ? 1 : 0.5,
                fontFamily: 'var(--font-sans)',
              }}
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
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 14, color: 'var(--color-stone)', padding: 0,
                display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16,
                fontFamily: 'var(--font-sans)',
              }}
            >
              ← Cambiar dirección
            </button>

            <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-black)', marginBottom: 20 }}>
              Método de pago
            </h2>

            {/* Shipping summary */}
            {selectedAddress && (
              <div style={{
                background: 'var(--color-white)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-xl)',
                padding: 14, marginBottom: 16,
              }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-stone)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Envío a
                </p>
                <p style={{ fontSize: 14, color: 'var(--color-black)', margin: 0 }}>
                  {selectedAddress.full_name} — {selectedAddress.street}, {selectedAddress.city} {selectedAddress.postal_code}
                </p>
              </div>
            )}

            {/* Discount code */}
            <div style={{
              background: 'var(--color-white)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              padding: 14, marginBottom: 16,
            }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-stone)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Código de descuento
              </p>
              {appliedDiscount ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '6px 12px', borderRadius: 'var(--radius-full, 999px)',
                    background: 'var(--color-surface)', color: 'var(--color-black)',
                    fontSize: 13, fontWeight: 600,
                  }}>
                    <Tag size={14} /> {appliedDiscount.code}
                  </span>
                  <button
                    onClick={async () => { setDiscountLoading(true); try { await removeDiscount(); } catch { /* handled by context */ } finally { setDiscountLoading(false); } }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--color-stone)' }}
                  >
                    Eliminar
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={discountCode}
                    onChange={e => setDiscountCode(e.target.value)}
                    placeholder="CODIGO10"
                    style={{ ...inputStyle, height: 40, fontSize: 13, flex: 1 }}
                  />
                  <button
                    onClick={handleApplyDiscount}
                    disabled={discountLoading}
                    style={{
                      height: 40, padding: '0 16px',
                      background: 'var(--color-black)', color: 'var(--color-white)',
                      border: 'none', borderRadius: 'var(--radius-lg)',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    Aplicar
                  </button>
                </div>
              )}
            </div>

            {/* Order summary */}
            <OrderSummary cartItems={cartItems} cartSummary={cartSummary} appliedDiscount={appliedDiscount} />

            {/* Security text */}
            <p style={{
              fontSize: 12, color: 'var(--color-stone)',
              textAlign: 'center', margin: '16px 0',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            }}>
              <Lock size={12} /> Pago seguro con Stripe
            </p>

            {/* Pay button */}
            <button
              onClick={handlePay}
              disabled={checkoutLoading}
              style={{
                width: '100%', height: 56,
                background: 'var(--color-black)',
                color: 'var(--color-white)',
                border: 'none', borderRadius: 'var(--radius-full, 999px)',
                fontSize: 16, fontWeight: 700,
                cursor: checkoutLoading ? 'not-allowed' : 'pointer',
                opacity: checkoutLoading ? 0.5 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontFamily: 'var(--font-sans)',
                transition: 'var(--transition-fast)',
              }}
            >
              {checkoutLoading ? (
                <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                `Pagar ${total}€`
              )}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
