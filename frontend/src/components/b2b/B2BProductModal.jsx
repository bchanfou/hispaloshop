import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';

const INCOTERM_OPTIONS = ['EXW', 'FCA', 'DAP', 'DDP', 'FOB'];
const PAYMENT_OPTIONS = [
  '50% anticipo + 50% entrega',
  '100% adelantado',
  '30 días',
  '60 días',
  '90 días',
];

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const sheetVariants = {
  hidden: { y: '100%' },
  visible: { y: 0, transition: { type: 'spring', damping: 30, stiffness: 300 } },
  exit: { y: '100%', transition: { duration: 0.25 } },
};

function B2BProductModal({ isOpen, onClose, product, onSaved }) {
  const [wholesalePrice, setWholesalePrice] = useState('');
  const [moq, setMoq] = useState('');
  const [wholesaleStock, setWholesaleStock] = useState('');
  const [sameStockAsB2C, setSameStockAsB2C] = useState(false);
  const [incoterm, setIncoterm] = useState('EXW');
  const [paymentTerms, setPaymentTerms] = useState('50% anticipo + 50% entrega');
  const [description, setDescription] = useState('');
  const [offerSamples, setOfferSamples] = useState(false);
  const [maxSamples, setMaxSamples] = useState('');
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (product?.b2b_settings) {
      const s = product.b2b_settings;
      setWholesalePrice(s.wholesale_price ?? '');
      setMoq(s.moq ?? '');
      setWholesaleStock(s.wholesale_stock ?? '');
      setSameStockAsB2C(!!s.same_stock_as_b2c);
      setIncoterm(s.incoterm ?? 'EXW');
      setPaymentTerms(s.payment_terms ?? '50% anticipo + 50% entrega');
      setDescription(s.description ?? '');
      setOfferSamples(!!s.offer_samples);
      setMaxSamples(s.max_samples ?? '');
    }
  }, [product]);

  const productId = product?.product_id || product?.id;

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.put(`/products/${productId}/b2b`, {
        wholesale_price: parseFloat(wholesalePrice) || 0,
        moq: parseInt(moq, 10) || 1,
        wholesale_stock: sameStockAsB2C ? product.stock : parseInt(wholesaleStock, 10) || 0,
        same_stock_as_b2c: sameStockAsB2C,
        incoterm,
        payment_terms: paymentTerms,
        description,
        offer_samples: offerSamples,
        max_samples: offerSamples ? parseInt(maxSamples, 10) || 0 : 0,
      });
      toast.success('Condiciones mayoristas guardadas');
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await apiClient.delete(`/products/${productId}/b2b`);
      toast.success('Producto retirado del catálogo B2B');
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err?.message || 'Error al eliminar');
    } finally {
      setRemoving(false);
    }
  };

  /* ---- shared inline styles ---- */

  const labelStyle = {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'var(--color-stone)',
    fontFamily: 'var(--font-sans)',
    marginBottom: 6,
  };

  const inputWrapStyle = {
    display: 'flex',
    alignItems: 'center',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    background: 'var(--color-white)',
  };

  const inputStyle = {
    flex: 1,
    padding: '10px 12px',
    border: 'none',
    outline: 'none',
    fontSize: 15,
    fontFamily: 'var(--font-sans)',
    background: 'transparent',
    color: 'var(--color-black)',
  };

  const suffixStyle = {
    padding: '0 12px',
    fontSize: 13,
    color: 'var(--color-stone)',
    fontFamily: 'var(--font-sans)',
    whiteSpace: 'nowrap',
  };

  const helperStyle = {
    fontSize: 12,
    color: 'var(--color-stone)',
    marginTop: 4,
    fontFamily: 'var(--font-sans)',
  };

  const sectionGap = { marginBottom: 22 };

  const pillBase = {
    padding: '7px 14px',
    borderRadius: 'var(--radius-full)',
    fontSize: 13,
    fontFamily: 'var(--font-sans)',
    cursor: 'pointer',
    border: '1px solid var(--color-border)',
    transition: 'all 0.15s ease',
  };

  const pillActive = {
    ...pillBase,
    background: 'var(--color-black)',
    color: 'var(--color-white)',
    borderColor: 'var(--color-black)',
  };

  const pillInactive = {
    ...pillBase,
    background: 'var(--color-surface)',
    color: 'var(--color-black)',
  };

  const toggleTrack = (on) => ({
    width: 44,
    height: 24,
    borderRadius: 'var(--radius-full)',
    background: on ? 'var(--color-black)' : 'var(--color-border)',
    position: 'relative',
    cursor: 'pointer',
    transition: 'background 0.2s ease',
    flexShrink: 0,
  });

  const toggleThumb = (on) => ({
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: 'var(--color-white)',
    position: 'absolute',
    top: 3,
    left: on ? 22 : 3,
    transition: 'left 0.2s ease',
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="b2b-backdrop"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 999,
              background: 'rgba(0,0,0,0.45)',
            }}
          />

          {/* Bottom sheet */}
          <motion.div
            key="b2b-sheet"
            variants={sheetVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 1000,
              background: 'var(--color-white)',
              borderTopLeftRadius: 'var(--radius-xl)',
              borderTopRightRadius: 'var(--radius-xl)',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '18px 20px 14px',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}
            >
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-black)' }}>
                  Condiciones mayoristas
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-stone)', marginTop: 2 }}>
                  {product?.name}
                </div>
              </div>
              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  color: 'var(--color-stone)',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 0' }}>
              {/* 1. Wholesale price */}
              <div style={sectionGap}>
                <div style={labelStyle}>Precio por unidad (mayorista)</div>
                <div style={inputWrapStyle}>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={wholesalePrice}
                    onChange={(e) => setWholesalePrice(e.target.value)}
                    placeholder="ej: 3.50"
                    style={inputStyle}
                  />
                  <span style={suffixStyle}>€</span>
                </div>
                <div style={helperStyle}>Tu precio B2C es {product?.price}€</div>
              </div>

              {/* 2. MOQ */}
              <div style={sectionGap}>
                <div style={labelStyle}>Cantidad mínima de pedido (MOQ)</div>
                <div style={inputWrapStyle}>
                  <input
                    type="number"
                    min="1"
                    value={moq}
                    onChange={(e) => setMoq(e.target.value)}
                    placeholder="ej: 50"
                    style={inputStyle}
                  />
                  <span style={suffixStyle}>unidades</span>
                </div>
              </div>

              {/* 3. Wholesale stock */}
              <div style={sectionGap}>
                <div style={labelStyle}>Stock disponible para mayoristas</div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                  }}
                >
                  <span style={{ fontSize: 13, color: 'var(--color-black)' }}>
                    Mismo stock que B2C
                  </span>
                  <div
                    style={toggleTrack(sameStockAsB2C)}
                    onClick={() => setSameStockAsB2C(!sameStockAsB2C)}
                  >
                    <div style={toggleThumb(sameStockAsB2C)} />
                  </div>
                </div>
                <div style={inputWrapStyle}>
                  <input
                    type="number"
                    min="0"
                    value={sameStockAsB2C ? product?.stock ?? '' : wholesaleStock}
                    onChange={(e) => setWholesaleStock(e.target.value)}
                    disabled={sameStockAsB2C}
                    style={{
                      ...inputStyle,
                      opacity: sameStockAsB2C ? 0.5 : 1,
                      cursor: sameStockAsB2C ? 'not-allowed' : 'text',
                    }}
                  />
                  <span style={suffixStyle}>unidades</span>
                </div>
              </div>

              {/* 4. Incoterm */}
              <div style={sectionGap}>
                <div style={labelStyle}>Incoterm por defecto</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {INCOTERM_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setIncoterm(opt)}
                      style={incoterm === opt ? pillActive : pillInactive}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Payment terms */}
              <div style={sectionGap}>
                <div style={labelStyle}>Condiciones de pago</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {PAYMENT_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setPaymentTerms(opt)}
                      style={paymentTerms === opt ? pillActive : pillInactive}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* 6. Wholesale description */}
              <div style={sectionGap}>
                <div style={labelStyle}>Descripción mayorista</div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Incluye detalles sobre embalaje, etiquetado, certificaciones..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 14,
                    fontFamily: 'var(--font-sans)',
                    resize: 'vertical',
                    outline: 'none',
                    color: 'var(--color-black)',
                    background: 'var(--color-white)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* 7. Samples */}
              <div style={{ ...sectionGap, marginBottom: 8 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: offerSamples ? 10 : 0,
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-black)' }}>
                    Ofrezco muestras gratuitas
                  </span>
                  <div
                    style={toggleTrack(offerSamples)}
                    onClick={() => setOfferSamples(!offerSamples)}
                  >
                    <div style={toggleThumb(offerSamples)} />
                  </div>
                </div>
                {offerSamples && (
                  <div>
                    <div style={{ ...labelStyle, marginTop: 4 }}>
                      Máximo de muestras por solicitud
                    </div>
                    <div style={inputWrapStyle}>
                      <input
                        type="number"
                        min="1"
                        value={maxSamples}
                        onChange={(e) => setMaxSamples(e.target.value)}
                        placeholder="ej: 3"
                        style={inputStyle}
                      />
                      <span style={suffixStyle}>unidades</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '16px 20px',
                paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
                borderTop: '1px solid var(--color-border)',
                flexShrink: 0,
              }}
            >
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  width: '100%',
                  padding: '14px 0',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--color-black)',
                  color: 'var(--color-white)',
                  fontSize: 15,
                  fontWeight: 600,
                  fontFamily: 'var(--font-sans)',
                  border: 'none',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                  transition: 'opacity 0.15s ease',
                }}
              >
                {saving
                  ? 'Guardando...'
                  : product?.b2b_enabled
                    ? 'Guardar cambios'
                    : 'Publicar en catálogo B2B'}
              </button>

              {product?.b2b_enabled && (
                <button
                  onClick={handleRemove}
                  disabled={removing}
                  style={{
                    width: '100%',
                    padding: '12px 0',
                    marginTop: 10,
                    borderRadius: 'var(--radius-full)',
                    background: 'transparent',
                    color: 'var(--color-red)',
                    fontSize: 14,
                    fontWeight: 500,
                    fontFamily: 'var(--font-sans)',
                    border: 'none',
                    cursor: removing ? 'not-allowed' : 'pointer',
                    opacity: removing ? 0.6 : 1,
                  }}
                >
                  {removing ? 'Eliminando...' : 'Quitar del catálogo B2B'}
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default B2BProductModal;
