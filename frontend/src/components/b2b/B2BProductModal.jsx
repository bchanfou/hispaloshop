import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

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
      toast.success(t('b2_b_product.productoRetiradoDelCatalogoB2b', 'Producto retirado del catálogo B2B'));
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err?.message || 'Error al eliminar');
    } finally {
      setRemoving(false);
    }
  };

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
            className="fixed inset-0 z-[999] bg-black/45"
          />

          {/* Bottom sheet */}
          <motion.div
            key="b2b-sheet"
            variants={sheetVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed bottom-0 left-0 right-0 z-[1000] bg-white rounded-t-2xl max-h-[92vh] flex flex-col"
          >
            {/* Header */}
            <div className="px-5 pt-[18px] pb-3.5 border-b border-stone-200 flex items-start justify-between shrink-0">
              <div>
                <div className="text-[17px] font-bold text-stone-950">
                  Condiciones mayoristas
                </div>
                <div className="text-[13px] text-stone-500 mt-0.5">
                  {product?.name}
                </div>
              </div>
              <button
                onClick={onClose}
                className="bg-transparent border-none cursor-pointer p-1 text-stone-500"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 pt-5">
              {/* 1. Wholesale price */}
              <div className="mb-[22px]">
                <div className="text-[11px] font-semibold tracking-wide uppercase text-stone-500 mb-1.5">Precio por unidad (mayorista)</div>
                <div className="flex items-center border border-stone-200 rounded-xl overflow-hidden bg-white">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={wholesalePrice}
                    onChange={(e) => setWholesalePrice(e.target.value)}
                    placeholder="ej: 3.50"
                    className="flex-1 px-3 py-2.5 border-none outline-none text-[15px] bg-transparent text-stone-950"
                  />
                  <span className="px-3 text-[13px] text-stone-500 whitespace-nowrap">€</span>
                </div>
                <div className="text-xs text-stone-500 mt-1">Tu precio B2C es {product?.price}€</div>
              </div>

              {/* 2. MOQ */}
              <div className="mb-[22px]">
                <div className="text-[11px] font-semibold tracking-wide uppercase text-stone-500 mb-1.5">{t('b2_b_product.cantidadMinimaDePedidoMoq', 'Cantidad mínima de pedido (MOQ)')}</div>
                <div className="flex items-center border border-stone-200 rounded-xl overflow-hidden bg-white">
                  <input
                    type="number"
                    min="1"
                    value={moq}
                    onChange={(e) => setMoq(e.target.value)}
                    placeholder="ej: 50"
                    className="flex-1 px-3 py-2.5 border-none outline-none text-[15px] bg-transparent text-stone-950"
                  />
                  <span className="px-3 text-[13px] text-stone-500 whitespace-nowrap">unidades</span>
                </div>
              </div>

              {/* 3. Wholesale stock */}
              <div className="mb-[22px]">
                <div className="text-[11px] font-semibold tracking-wide uppercase text-stone-500 mb-1.5">Stock disponible para mayoristas</div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] text-stone-950">
                    Mismo stock que B2C
                  </span>
                  <div
                    className={`w-11 h-6 rounded-full relative cursor-pointer shrink-0 transition-colors duration-200 ${sameStockAsB2C ? 'bg-stone-950' : 'bg-stone-200'}`}
                    onClick={() => setSameStockAsB2C(!sameStockAsB2C)}
                  >
                    <div className={`w-[18px] h-[18px] rounded-full bg-white absolute top-[3px] transition-[left] duration-200 ${sameStockAsB2C ? 'left-[22px]' : 'left-[3px]'}`} />
                  </div>
                </div>
                <div className="flex items-center border border-stone-200 rounded-xl overflow-hidden bg-white">
                  <input
                    type="number"
                    min="0"
                    value={sameStockAsB2C ? product?.stock ?? '' : wholesaleStock}
                    onChange={(e) => setWholesaleStock(e.target.value)}
                    disabled={sameStockAsB2C}
                    className={`flex-1 px-3 py-2.5 border-none outline-none text-[15px] bg-transparent text-stone-950 ${sameStockAsB2C ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                  <span className="px-3 text-[13px] text-stone-500 whitespace-nowrap">unidades</span>
                </div>
              </div>

              {/* 4. Incoterm */}
              <div className="mb-[22px]">
                <div className="text-[11px] font-semibold tracking-wide uppercase text-stone-500 mb-1.5">Incoterm por defecto</div>
                <div className="flex flex-wrap gap-2">
                  {INCOTERM_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setIncoterm(opt)}
                      className={`px-3.5 py-[7px] rounded-full text-[13px] cursor-pointer border transition-all duration-150 ${
                        incoterm === opt
                          ? 'bg-stone-950 text-white border-stone-950'
                          : 'bg-stone-100 text-stone-950 border-stone-200'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Payment terms */}
              <div className="mb-[22px]">
                <div className="text-[11px] font-semibold tracking-wide uppercase text-stone-500 mb-1.5">Condiciones de pago</div>
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setPaymentTerms(opt)}
                      className={`px-3.5 py-[7px] rounded-full text-[13px] cursor-pointer border transition-all duration-150 ${
                        paymentTerms === opt
                          ? 'bg-stone-950 text-white border-stone-950'
                          : 'bg-stone-100 text-stone-950 border-stone-200'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* 6. Wholesale description */}
              <div className="mb-[22px]">
                <div className="text-[11px] font-semibold tracking-wide uppercase text-stone-500 mb-1.5">{t('b2_b_product.descripcionMayorista', 'Descripción mayorista')}</div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Incluye detalles sobre embalaje, etiquetado, certificaciones..."
                  rows={4}
                  className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm resize-y outline-none text-stone-950 bg-white box-border"
                />
              </div>

              {/* 7. Samples */}
              <div className="mb-2">
                <div className={`flex items-center justify-between ${offerSamples ? 'mb-2.5' : ''}`}>
                  <span className="text-sm font-medium text-stone-950">
                    Ofrezco muestras gratuitas
                  </span>
                  <div
                    className={`w-11 h-6 rounded-full relative cursor-pointer shrink-0 transition-colors duration-200 ${offerSamples ? 'bg-stone-950' : 'bg-stone-200'}`}
                    onClick={() => setOfferSamples(!offerSamples)}
                  >
                    <div className={`w-[18px] h-[18px] rounded-full bg-white absolute top-[3px] transition-[left] duration-200 ${offerSamples ? 'left-[22px]' : 'left-[3px]'}`} />
                  </div>
                </div>
                {offerSamples && (
                  <div>
                    <div className="text-[11px] font-semibold tracking-wide uppercase text-stone-500 mb-1.5 mt-1">
                      Máximo de muestras por solicitud
                    </div>
                    <div className="flex items-center border border-stone-200 rounded-xl overflow-hidden bg-white">
                      <input
                        type="number"
                        min="1"
                        value={maxSamples}
                        onChange={(e) => setMaxSamples(e.target.value)}
                        placeholder="ej: 3"
                        className="flex-1 px-3 py-2.5 border-none outline-none text-[15px] bg-transparent text-stone-950"
                      />
                      <span className="px-3 text-[13px] text-stone-500 whitespace-nowrap">unidades</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 pb-[max(16px,env(safe-area-inset-bottom))] border-t border-stone-200 shrink-0">
              <button
                onClick={handleSave}
                disabled={saving}
                className={`w-full py-3.5 rounded-full bg-stone-950 text-white text-[15px] font-semibold border-none transition-opacity duration-150 ${
                  saving ? 'cursor-not-allowed opacity-60' : 'cursor-pointer opacity-100'
                }`}
              >
                {saving
                  ? 'Guardando...'
                  : product?.b2b_enabled
                    ? 'Guardar cambios'
                    : t('b2_b_product.publicarEnCatalogoB2b', 'Publicar en catálogo B2B')}
              </button>

              {product?.b2b_enabled && (
                <button
                  onClick={handleRemove}
                  disabled={removing}
                  className={`w-full py-3 mt-2.5 rounded-full bg-transparent text-red-600 text-sm font-medium border-none ${
                    removing ? 'cursor-not-allowed opacity-60' : 'cursor-pointer opacity-100'
                  }`}
                >
                  {removing ? 'Eliminando...' : t('b2_b_product.quitarDelCatalogoB2b', 'Quitar del catálogo B2B')}
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
