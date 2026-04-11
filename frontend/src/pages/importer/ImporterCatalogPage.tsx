// @ts-nocheck
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, X, Loader2, Filter, AlertTriangle, ChevronLeft, ExternalLink, ShieldCheck, Package, BadgeCheck, ArrowRight } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/api/client';
import { useLocale } from '../../context/LocaleContext';
import { useTranslation } from 'react-i18next';
import i18n from "../../locales/i18n";
const CATEGORIES = [{
  value: '',
  label: "Todas las categorías"
}, {
  value: 'aceites',
  label: 'Aceites'
}, {
  value: 'conservas',
  label: 'Conservas'
}, {
  value: 'bebidas',
  label: 'Bebidas'
}, {
  value: 'carnicos',
  label: "Cárnicos"
}, {
  value: 'lacteos',
  label: "Lácteos"
}, {
  value: 'dulces',
  label: 'Dulces'
}, {
  value: 'especias',
  label: 'Especias'
}];
const CERTIFICATIONS = [{
  value: '',
  label: 'Todas las certs.'
}, {
  value: 'ecologico',
  label: "Ecológico"
}, {
  value: 'vegano',
  label: 'Vegano'
}, {
  value: 'halal',
  label: 'Halal'
}, {
  value: 'sin_gluten',
  label: 'Sin Gluten'
}, {
  value: 'dop',
  label: 'DOP'
}];
const COUNTRIES = [{
  value: '',
  label: "Todos los países"
}, {
  value: 'ES',
  label: "España"
}, {
  value: 'PT',
  label: 'Portugal'
}, {
  value: 'IT',
  label: 'Italia'
}, {
  value: 'FR',
  label: 'Francia'
}, {
  value: 'GR',
  label: 'Grecia'
}, {
  value: 'MA',
  label: 'Marruecos'
}, {
  value: 'TR',
  label: "Turquía"
}, {
  value: 'MX',
  label: "México"
}, {
  value: 'CO',
  label: 'Colombia'
}, {
  value: 'AR',
  label: 'Argentina'
}, {
  value: 'CL',
  label: 'Chile'
}, {
  value: 'PE',
  label: 'Perú'
}, {
  value: 'BR',
  label: 'Brasil'
}];
// Section 3.6.2: replaced emoji icons with short text labels (Lucide-only rule).
// Cert pills render as compact stone badges throughout the page.
const CERT_LABELS = {
  ecologico: 'BIO',
  vegano: 'V',
  halal: 'H',
  sin_gluten: 'GF',
  sin_lactosa: 'LF',
  dop: 'DOP'
};
function B2BProductCard({
  product,
  onClick,
  convertAndFormatPrice
}) {
  const hasTiers = (product.b2b_prices?.length || 0) > 1;
  const lowestPrice = product.b2b_prices?.[0]?.unit_price_cents ? product.b2b_prices[0].unit_price_cents / 100 : product.price || 0;
  return <div className="bg-white rounded-2xl shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => onClick(product)}>
      {/* Image */}
      <div className="relative aspect-square">
        {product.images?.[0] ? <img loading="lazy" src={product.images[0]} alt={product.name || 'Producto'} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-stone-100 flex items-center justify-center">
            <Package className="w-8 h-8 text-stone-300" strokeWidth={1.5} />
          </div>}
        {(product.certifications?.length || 0) > 0 && <div className="absolute top-1.5 left-1.5 flex gap-1">
            {product.certifications.slice(0, 2).map(cert => <span key={cert} className="text-[10px] font-semibold bg-white/90 text-stone-700 rounded-full px-1.5 py-0.5">
                {CERT_LABELS[cert] || cert.slice(0, 3).toUpperCase()}
              </span>)}
          </div>}
      </div>

      <div className="p-2.5">
        <p className="text-[13px] font-bold text-stone-950 line-clamp-2 leading-tight mb-0.5">
          {product.name || 'Producto'}
        </p>
        <p className="text-[11px] text-stone-500 mb-2 truncate">
          {product.producer_name || product.seller_name || ''} · {product.region || product.country_origin || ''}
        </p>

        {/* Wholesale price */}
        <p className="text-[15px] font-extrabold text-stone-950 mb-0.5">
          Desde {convertAndFormatPrice(lowestPrice, 'EUR')}/{product.unit || 'ud'}
        </p>
        {product.moq > 1 && <p className="text-[10px] text-stone-400 mb-2">
            MOQ: {product.moq} {product.unit || 'uds'}
          </p>}

        {/* Price tiers */}
        {hasTiers && <div className="mb-2">
            {(product.b2b_prices || []).slice(0, 2).map((tier, i) => <div key={i} className="flex justify-between text-[10px] text-stone-500 py-0.5">
                <span>≥ {tier.min_quantity} {product.unit || 'uds'}</span>
                <span className="font-semibold text-stone-700">
                  {convertAndFormatPrice((tier.unit_price_cents || 0) / 100, 'EUR')}
                </span>
              </div>)}
          </div>}
      </div>
    </div>;
}
function ProductDetailModal({
  product,
  onClose,
  onRequestOffer,
  convertAndFormatPrice
}) {
  const lowestPrice = product.b2b_prices?.[0]?.unit_price_cents ? product.b2b_prices[0].unit_price_cents / 100 : product.price || 0;
  return <>
      <motion.div initial={{
      opacity: 0
    }} animate={{
      opacity: 1
    }} exit={{
      opacity: 0
    }} className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <motion.div initial={{
      y: '100%'
    }} animate={{
      y: 0
    }} exit={{
      y: '100%'
    }} transition={{
      type: 'spring',
      stiffness: 380,
      damping: 38
    }} className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl max-h-[90vh] overflow-y-auto" style={{
      paddingBottom: 'env(safe-area-inset-bottom)'
    }}>
        {/* Handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-stone-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
          <h3 className="text-lg font-bold text-stone-950">Detalle del producto</h3>
          <button onClick={onClose} className="p-1">
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        {/* Large image */}
        <div className="relative aspect-[4/3] bg-stone-100">
          {product.images?.[0] ? <img src={product.images[0]} alt={product.name || 'Producto'} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">
              <Package className="w-12 h-12 text-stone-300" strokeWidth={1.5} />
            </div>}
        </div>

        <div className="p-4">
          {/* Name + producer */}
          <h2 className="text-xl font-bold text-stone-950 mb-1">{product.name || 'Producto'}</h2>
          <p className="text-sm text-stone-500 mb-4">
            {product.producer_name || product.seller_name || 'Productor'}
            {product.region ? ` · ${product.region}` : ''}
            {product.country_origin ? ` · ${product.country_origin}` : ''}
          </p>

          {/* Description */}
          {product.description && <div className="mb-4">
              <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">{i18n.t('productDetail.description', 'Descripción')}</p>
              <p className="text-sm text-stone-700 leading-relaxed">{product.description}</p>
            </div>}

          {/* MOQ + Price */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-stone-50 rounded-2xl p-3">
              <p className="text-[11px] text-stone-400 uppercase tracking-wider font-bold mb-1">Precio desde</p>
              <p className="text-lg font-extrabold text-stone-950">
                {convertAndFormatPrice(lowestPrice, 'EUR')}/{product.unit || 'ud'}
              </p>
            </div>
            <div className="bg-stone-50 rounded-2xl p-3">
              <p className="text-[11px] text-stone-400 uppercase tracking-wider font-bold mb-1">MOQ</p>
              <p className="text-lg font-extrabold text-stone-950">
                {product.moq || 1} {product.unit || 'uds'}
              </p>
            </div>
          </div>

          {/* Price tiers */}
          {product.b2b_prices?.length > 1 && <div className="bg-stone-50 rounded-2xl p-3 mb-4">
              <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2">
                Precios por volumen
              </p>
              {product.b2b_prices.map((tier, i) => <div key={i} className="flex justify-between py-1 text-sm text-stone-700">
                  <span>{tier.min_quantity}+ {product.unit || 'uds'}</span>
                  <span className="font-semibold text-stone-950">
                    {convertAndFormatPrice((tier.unit_price_cents || 0) / 100, 'EUR')}/{product.unit || 'ud'}
                  </span>
                </div>)}
            </div>}

          {/* Certifications */}
          {(product.certifications?.length || 0) > 0 && <div className="mb-4">
              <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2">Certificaciones</p>
              <div className="flex flex-wrap gap-2">
                {product.certifications.map(cert => <span key={cert} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 rounded-full text-xs font-medium text-stone-700">
                    <BadgeCheck className="w-3.5 h-3.5 text-stone-600" strokeWidth={1.8} />
                    {cert.replace(/_/g, ' ')}
                  </span>)}
              </div>
            </div>}

          {/* Producer info */}
          <div className="bg-stone-50 rounded-2xl p-3 mb-5">
            <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2">Productor</p>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-stone-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-stone-950">{product.producer_name || product.seller_name || 'Productor'}</p>
                <p className="text-xs text-stone-500">{product.country_origin || ''}</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <button onClick={() => onRequestOffer(product)} className="w-full py-3 bg-stone-950 hover:bg-stone-800 text-white text-sm font-medium rounded-2xl transition-colors inline-flex items-center justify-center gap-1.5">
            Solicitar oferta <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </>;
}
function B2BOrderRequestModal({
  product,
  onClose,
  onSuccess,
  convertAndFormatPrice
}) {
  const [quantity, setQuantity] = useState(product.moq || 1);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const selectedTier = product.b2b_prices?.slice().reverse().find(t => quantity >= t.min_quantity);
  const unitPrice = selectedTier ? (Number(selectedTier.unit_price_cents) || 0) / 100 : Number(product.price) || 0;
  const totalPrice = quantity * unitPrice;
  const moq = product.moq || 1;
  const handleSubmit = async () => {
    if (quantity < moq) {
      toast.error(`Cantidad mínima: ${moq} ${product.unit || 'uds'}`);
      return;
    }
    const producerId = product.producer_id || product.seller_id;
    const productId = product.product_id || product.id;
    if (!producerId || !productId) {
      toast.error('Datos del producto incompletos');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post('/rfq/contact', {
        producer_id: producerId,
        product_ids: [productId],
        message: `Solicitud B2B: ${quantity} ${product.unit || 'uds'} de ${product.name}. ${notes.trim()}`.trim(),
        target_country: 'ES'
      });
      onSuccess();
    } catch {
      toast.error(i18n.t('importer_catalog.errorAlEnviarLaSolicitud', 'Error al enviar la solicitud'));
    } finally {
      setSubmitting(false);
    }
  };
  return <>
      <motion.div initial={{
      opacity: 0
    }} animate={{
      opacity: 1
    }} exit={{
      opacity: 0
    }} className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <motion.div initial={{
      y: '100%'
    }} animate={{
      y: 0
    }} exit={{
      y: '100%'
    }} transition={{
      type: 'spring',
      stiffness: 380,
      damping: 38
    }} className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto" style={{
      paddingBottom: 'env(safe-area-inset-bottom)'
    }}>
        {/* Handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-stone-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
          <h3 className="text-lg font-bold text-stone-950">Solicitar pedido</h3>
          <button onClick={onClose} className="p-1">
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        <div className="p-4">
          {/* Product info */}
          <div className="flex gap-3 mb-5">
            {product.images?.[0] ? <img loading="lazy" src={product.images[0]} alt="" className="w-16 h-16 rounded-2xl object-cover shrink-0" /> : <div className="w-16 h-16 rounded-2xl bg-stone-100 shrink-0" />}
            <div>
              <p className="text-[15px] font-bold text-stone-950">{product.name}</p>
              <p className="text-sm text-stone-500">{product.producer_name || ''}</p>
            </div>
          </div>

          {/* Quantity selector */}
          <label className="text-sm font-semibold text-stone-950 block mb-2">
            Cantidad ({product.unit || 'uds'})
          </label>
          <div className="flex items-center gap-3 mb-1">
            <button onClick={() => setQuantity(q => Math.max(moq, q - moq))} className="w-10 h-10 rounded-full border border-stone-200 bg-stone-50 text-xl flex items-center justify-center">
              −
            </button>
            <input type="number" value={quantity} onChange={e => setQuantity(Math.max(moq, parseInt(e.target.value) || 0))} className="flex-1 text-center text-lg font-bold py-2 border border-stone-200 rounded-2xl focus:outline-none focus:border-stone-400" />
            <button onClick={() => setQuantity(q => q + moq)} className="w-10 h-10 rounded-full border border-stone-200 bg-stone-50 text-xl flex items-center justify-center">
              +
            </button>
          </div>
          {moq > 1 && <p className="text-[11px] text-stone-400 mb-4">
              Mínimo: {moq} {product.unit || 'uds'}
            </p>}

          {/* Price tiers */}
          {product.b2b_prices?.length > 1 && <div className="bg-stone-50 rounded-2xl p-3 mb-4">
              <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2">
                Precios por volumen
              </p>
              {product.b2b_prices.map((tier, i) => {
            const isActive = quantity >= tier.min_quantity && (!product.b2b_prices[i + 1] || quantity < product.b2b_prices[i + 1].min_quantity);
            return <div key={i} className={`flex items-center justify-between py-1 text-sm ${isActive ? 'font-bold text-stone-950' : 'text-stone-500'}`}>
                    <span className="inline-flex items-center gap-1">{isActive && <ArrowRight className="w-3 h-3" />}{tier.min_quantity}+ {product.unit || 'uds'}</span>
                    <span>{convertAndFormatPrice((tier.unit_price_cents || 0) / 100, 'EUR')}/{product.unit || 'ud'}</span>
                  </div>;
          })}
            </div>}

          {/* Price summary */}
          <div className="bg-white shadow-sm rounded-2xl p-3.5 mb-4">
            <div className="flex justify-between mb-1">
              <span className="text-sm text-stone-500">
                {quantity} {product.unit || 'uds'} × {convertAndFormatPrice(unitPrice, 'EUR')}
              </span>
              <span className="text-sm font-bold text-stone-950">
                {convertAndFormatPrice(totalPrice, 'EUR')}
              </span>
            </div>
            <p className="text-[11px] text-stone-400">
              Precio estimado · El productor confirmará el precio final
            </p>
          </div>

          {/* Notes */}
          <label className="text-sm font-semibold text-stone-950 block mb-2">
            Notas para el productor (opcional)
          </label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej: Necesito entrega urgente, packaging especial..." rows={2} className="w-full border border-stone-200 rounded-2xl p-3 text-sm resize-none focus:outline-none focus:border-stone-400 mb-4" />

          <button onClick={handleSubmit} disabled={submitting} className="w-full py-3 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white text-sm font-medium rounded-2xl transition-colors flex items-center justify-center gap-2">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</> : <>Enviar solicitud al productor <ArrowRight className="w-4 h-4" /></>}
          </button>

          <p className="text-[11px] text-stone-400 text-center mt-3 leading-relaxed">
            El productor tiene 48h para confirmar disponibilidad y condiciones.
            Solo se procesa el pago tras su confirmación.
          </p>
        </div>
      </motion.div>
    </>;
}
export default function ImporterCatalogPage() {
  const navigate = useNavigate();
  const {
    convertAndFormatPrice
  } = useLocale();
  const [filters, setFilters] = useState({
    category: '',
    certification: '',
    country: ''
  });
  const [search, setSearch] = useState('');
  const [producerSearch, setProducerSearch] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [detailProduct, setDetailProduct] = useState(null);
  const [orderProduct, setOrderProduct] = useState(null);
  const fetchProducts = useCallback(async (p = 1, append = false) => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams();
      if (filters.category) params.set('category', filters.category);
      if (filters.certification) params.set('certification', filters.certification);
      if (filters.country) params.set('country', filters.country);
      if (search) params.set('q', search);
      params.set('page', p);
      params.set('limit', '24');
      const res = await apiClient.get(`/b2b/catalog?${params.toString()}`);
      const data = res?.data || res || {};
      const items = Array.isArray(data.products) ? data.products : [];
      setProducts(prev => append ? [...prev, ...items] : items);
      setHasMore(items.length >= 24);
      setPage(p);
    } catch {
      if (!append) {
        setProducts([]);
        setError(true);
      }
    } finally {
      setLoading(false);
    }
  }, [filters.category, filters.certification, filters.country, search]);
  useEffect(() => {
    fetchProducts(1, false);
  }, [fetchProducts]);

  // Client-side filtering for certification, country, and producer search
  const filteredProducts = useMemo(() => {
    let result = products;
    if (filters.category) {
      result = result.filter(p => (p.category || '').toLowerCase() === filters.category.toLowerCase());
    }
    if (filters.certification) {
      result = result.filter(p => Array.isArray(p.certifications) && p.certifications.some(c => c.toLowerCase() === filters.certification.toLowerCase()));
    }
    if (filters.country) {
      result = result.filter(p => (p.country_origin || '').toUpperCase() === filters.country.toUpperCase());
    }
    if (producerSearch.trim()) {
      const q = producerSearch.trim().toLowerCase();
      result = result.filter(p => (p.producer_name || p.seller_name || '').toLowerCase().includes(q));
    }
    return result;
  }, [products, filters, producerSearch]);
  const clearFilters = () => {
    setFilters({
      category: '',
      certification: '',
      country: ''
    });
    setSearch('');
    setProducerSearch('');
  };
  const hasActiveFilters = filters.category || filters.certification || filters.country || producerSearch.trim();
  const handleRequestOffer = product => {
    setDetailProduct(null);
    const productId = product.product_id || product.id;
    navigate(`/b2b/offer?product_id=${productId}`);
  };
  return <div>
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-stone-950 mb-3">{i18n.t('importer_catalog.catalogoMayorista', 'Catálogo mayorista')}</h1>

        {/* Product search */}
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar productos..." className="w-full pl-9 pr-4 py-2.5 border border-stone-200 rounded-2xl text-sm bg-white focus:outline-none focus:border-stone-400" />
        </div>

        {/* Producer search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input value={producerSearch} onChange={e => setProducerSearch(e.target.value)} placeholder="Filtrar por productor..." className="w-full pl-9 pr-4 h-10 rounded-xl bg-stone-100 text-sm focus:outline-none focus:bg-stone-50 border border-transparent focus:border-stone-200" />
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{
        scrollbarWidth: 'none'
      }}>
          <select value={filters.category} onChange={e => setFilters(f => ({
          ...f,
          category: e.target.value
        }))} className="px-3 py-1.5 rounded-full border border-stone-200 text-xs bg-white text-stone-700 cursor-pointer shrink-0 focus:outline-none">
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>

          <select value={filters.certification} onChange={e => setFilters(f => ({
          ...f,
          certification: e.target.value
        }))} className="px-3 py-1.5 rounded-full border border-stone-200 text-xs bg-white text-stone-700 cursor-pointer shrink-0 focus:outline-none">
            {CERTIFICATIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>

          <select value={filters.country} onChange={e => setFilters(f => ({
          ...f,
          country: e.target.value
        }))} className="px-3 py-1.5 rounded-full border border-stone-200 text-xs bg-white text-stone-700 cursor-pointer shrink-0 focus:outline-none">
            {COUNTRIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>

          {hasActiveFilters && <button onClick={clearFilters} className="px-3 py-1.5 rounded-full border border-stone-200 bg-stone-100 text-xs text-stone-700 font-medium cursor-pointer shrink-0 inline-flex items-center gap-1">
              <X className="w-3 h-3" /> Limpiar
            </button>}
        </div>
      </div>

      {/* Products grid */}
      {error && products.length === 0 ? <div className="text-center py-16">
          <AlertTriangle className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-stone-950 mb-1">{i18n.t('importer_catalog.errorAlCargarElCatalogo', 'Error al cargar el catálogo')}</p>
          <button onClick={() => fetchProducts(1, false)} className="mt-3 bg-stone-950 text-white rounded-full px-6 py-2.5 text-sm font-semibold border-none cursor-pointer">
            Reintentar
          </button>
        </div> : loading && products.length === 0 ? <div className="grid grid-cols-2 gap-3">
          {Array(6).fill(0).map((_, i) => <div key={i} className="h-60 rounded-2xl bg-stone-100 animate-pulse" />)}
        </div> : filteredProducts.length === 0 ? <div className="text-center py-16">
          <Search className="w-10 h-10 text-stone-300 mx-auto mb-2" strokeWidth={1.5} />
          <p className="text-sm font-semibold text-stone-950">Sin resultados</p>
          <p className="text-sm text-stone-500">Prueba con otros filtros</p>
        </div> : <>
          <p className="text-xs text-stone-400 font-medium mb-2">
            {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map(product => <B2BProductCard key={product.product_id || product.id} product={product} onClick={setDetailProduct} convertAndFormatPrice={convertAndFormatPrice} />)}
          </div>
          {hasMore && <button onClick={() => fetchProducts(page + 1, true)} disabled={loading} className="w-full mt-4 py-2.5 border border-stone-200 rounded-2xl text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Ver más productos'}
            </button>}
        </>}

      {/* Product detail modal */}
      <AnimatePresence>
        {detailProduct && <ProductDetailModal product={detailProduct} onClose={() => setDetailProduct(null)} onRequestOffer={handleRequestOffer} convertAndFormatPrice={convertAndFormatPrice} />}
      </AnimatePresence>

      {/* Order request modal */}
      <AnimatePresence>
        {orderProduct && <B2BOrderRequestModal product={orderProduct} onClose={() => setOrderProduct(null)} convertAndFormatPrice={convertAndFormatPrice} onSuccess={() => {
        setOrderProduct(null);
        toast.success('Solicitud enviada al productor');
      }} />}
      </AnimatePresence>
    </div>;
}