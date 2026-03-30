// @ts-nocheck
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  Search,
  Sparkles,
  Loader2,
  Package,
  Truck,
  CreditCard,
  Percent,
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../services/api/client';

/* ── Constants ─────────────────────────────────────────────── */
const STEP_LABELS = ['Producto', 'Precio', 'Logística', 'Revisar'];

const UNITS = ['kg', 'unidades', 'litros', 'cajas', 'pallets'];
const UNIT_TO_CANONICAL: Record<string, string> = {
  unidades: 'units',
  litros: 'liters',
  cajas: 'boxes',
};
const CURRENCIES = ['EUR', 'USD'];

const PAYMENT_TERMS = [
  { label: 'Prepago', value: 'prepaid' },
  { label: 'Net 30', value: 'net_30' },
  { label: 'Net 60', value: 'net_60' },
  { label: 'Carta de crédito', value: 'letter_of_credit' },
];

const INCOTERMS = [
  { code: 'EXW', name: 'Ex Works', desc: 'El comprador asume todos los costes desde fábrica' },
  { code: 'FCA', name: 'Free Carrier', desc: 'Vendedor entrega en punto acordado' },
  { code: 'CPT', name: 'Carriage Paid To', desc: 'Vendedor paga transporte hasta destino' },
  { code: 'CIP', name: 'Carriage Insurance Paid', desc: 'Como CPT + seguro incluido' },
  { code: 'DAP', name: 'Delivered at Place', desc: 'Vendedor entrega en destino sin descargar' },
  { code: 'DPU', name: 'Delivered at Place Unloaded', desc: 'Vendedor entrega y descarga' },
  { code: 'DDP', name: 'Delivered Duty Paid', desc: 'Vendedor asume todos los costes hasta destino' },
  { code: 'FOB', name: 'Free on Board', desc: 'Vendedor entrega a bordo del buque' },
];

const EMPTY_FORM = {
  product_name: '',
  product_id: '',
  quantity: '',
  unit: 'kg',
  moq: '',
  price_per_unit: '',
  currency: 'EUR',
  payment_terms: '',
  incoterm: '',
  incoterm_city: '',
  delivery_days: '',
  validity_days: '7',
};

/* ── Helpers ───────────────────────────────────────────────── */
const fmt = (n, currency = 'EUR') => {
  const sym = currency === 'USD' ? '$' : '\u20AC';
  return `${sym}${Number(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/* ── Step indicator ────────────────────────────────────────── */
function StepIndicator({ current }) {
  return (
    <div className="flex items-center justify-center px-6 pt-4 pb-3">
      {STEP_LABELS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={label}>
            {i > 0 && (
              <div
                className={`flex-1 h-0.5 max-w-[48px] mx-1 rounded-sm transition-colors duration-300 ${
                  done ? 'bg-stone-950' : 'bg-stone-200'
                }`}
              />
            )}
            <div className="flex flex-col items-center min-w-[56px]">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 border-2 ${
                  done || active
                    ? 'border-stone-950 bg-stone-950 text-white'
                    : 'border-stone-200 bg-transparent text-stone-500'
                }`}
              >
                {done ? <Check size={14} strokeWidth={2.5} /> : i + 1}
              </div>
              <span
                className={`text-[11px] mt-1 ${
                  active ? 'font-semibold text-stone-950' : 'font-normal text-stone-500'
                }`}
              >
                {label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ── Pill selector ─────────────────────────────────────────── */
function PillSelector({ options, value, onChange, getLabel, getValue }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const v = getValue ? getValue(opt) : opt;
        const l = getLabel ? getLabel(opt) : opt;
        const active = value === v;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`h-9 px-4 rounded-full text-[13px] font-medium cursor-pointer transition-all duration-150 border-[1.5px] ${
              active
                ? 'border-stone-950 bg-stone-950 text-white'
                : 'border-stone-200 bg-white text-stone-950'
            }`}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}

/* ── Product Autocomplete ─────────────────────────────────── */
function ProductAutocomplete({ value, onSelect, onChange }) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const doSearch = useCallback(async (q) => {
    if (!q || q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.get(`/products?q=${encodeURIComponent(q)}&b2b=true&limit=5`);
      const products = res.data?.products || res.products || res.data || [];
      setResults(Array.isArray(products) ? products : []);
      setOpen(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  };

  const handleSelect = (product) => {
    setQuery(product.name || '');
    setOpen(false);
    setResults([]);
    onSelect(product);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Search
        size={16}
        className="absolute left-3.5 top-3.5 text-stone-500 pointer-events-none"
      />
      <input
        type="text"
        placeholder="Buscar producto..."
        value={query}
        onChange={handleChange}
        onFocus={() => { if (results.length > 0) setOpen(true); }}
        className="w-full h-11 rounded-xl border border-stone-200 pl-[38px] pr-3.5 text-sm text-stone-950 bg-white outline-none box-border"
      />
      {loading && (
        <Loader2 size={14} className="absolute right-3.5 top-3.5 text-stone-400 animate-spin" />
      )}

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-lg z-20 overflow-hidden max-h-[240px] overflow-y-auto">
          {results.map((product) => (
            <button
              key={product.id || product.product_id || product.name}
              type="button"
              onClick={() => handleSelect(product)}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-stone-50 transition-colors text-left"
            >
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center flex-shrink-0">
                  <Package size={16} className="text-stone-300" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-950 truncate">{product.name}</p>
                {(product.b2b_prices?.[0] || product.price) && (
                  <p className="text-xs text-stone-500">
                    {product.b2b_prices?.[0]
                      ? `desde ${fmt((Number(product.b2b_prices[0].unit_price_cents) || 0) / 100)}/ud`
                      : `${fmt(product.price)}/ud`}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Step 1: Producto ──────────────────────────────────────── */
function StepProducto({ form, set }) {
  const handleProductSelect = (product) => {
    set('product_name', product.name || '');
    set('product_id', product.id || product.product_id || '');
    if (product.moq) set('moq', String(product.moq));
    if (product.b2b_prices?.[0]?.unit_price_cents) {
      set('price_per_unit', String((Number(product.b2b_prices[0].unit_price_cents) || 0) / 100));
    } else if (product.price) {
      set('price_per_unit', String(product.price));
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="text-[13px] font-medium text-stone-950 mb-1.5 block">Producto *</label>
        <ProductAutocomplete
          value={form.product_name}
          onChange={(val) => set('product_name', val)}
          onSelect={handleProductSelect}
        />
      </div>

      <div>
        <label className="text-[13px] font-medium text-stone-950 mb-1.5 block">ID de producto (opcional)</label>
        <input
          type="text"
          placeholder="SKU o referencia"
          value={form.product_id}
          onChange={(e) => set('product_id', e.target.value)}
          className="w-full h-11 rounded-xl border border-stone-200 px-3.5 text-[13px] text-stone-500 bg-white outline-none box-border"
        />
      </div>

      <div>
        <label className="text-[13px] font-medium text-stone-950 mb-1.5 block">Cantidad *</label>
        <input
          type="number"
          min="1"
          placeholder="0"
          value={form.quantity}
          onChange={(e) => set('quantity', e.target.value)}
          className="w-full h-11 rounded-xl border border-stone-200 px-3.5 text-sm text-stone-950 bg-white outline-none box-border"
        />
        {form.moq && Number(form.quantity) > 0 && Number(form.quantity) < Number(form.moq) && (
          <p className="text-xs text-stone-500 mt-1">
            La cantidad mínima recomendada es {form.moq} unidades
          </p>
        )}
      </div>

      <div>
        <label className="text-[13px] font-medium text-stone-950 mb-1.5 block">Unidad *</label>
        <PillSelector options={UNITS} value={form.unit} onChange={(v) => set('unit', v)} />
      </div>
    </div>
  );
}

/* ── Step 2: Precio ────────────────────────────────────────── */
function StepPrecio({ form, set }) {
  const qty = Number(form.quantity) || 0;
  const price = Number(form.price_per_unit) || 0;
  const subtotalCents = Math.round(qty * price * 100);
  const commissionCents = Math.round(subtotalCents * 3 / 100);
  const stripeCents = Math.round(subtotalCents * 14 / 1000);
  const netCents = subtotalCents - commissionCents - stripeCents;
  const subtotal = subtotalCents / 100;
  const commission = commissionCents / 100;
  const stripe = stripeCents / 100;
  const net = netCents / 100;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="text-[13px] font-medium text-stone-950 mb-1.5 block">Precio por unidad *</label>
        <div className="flex gap-3 items-end">
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={form.price_per_unit}
            onChange={(e) => set('price_per_unit', e.target.value)}
            className="flex-1 h-11 rounded-xl border border-stone-200 px-3.5 text-sm text-stone-950 bg-white outline-none box-border"
          />
          <PillSelector
            options={CURRENCIES}
            value={form.currency}
            onChange={(v) => set('currency', v)}
          />
        </div>
      </div>

      {subtotal > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-stone-200/50 rounded-xl p-4"
        >
          <div className="text-[13px] font-semibold text-stone-950 mb-3">
            Desglose
          </div>
          {[
            [`Subtotal (${qty} × ${fmt(price, form.currency)})`, fmt(subtotal, form.currency)],
            ['Comisión (3%)', `−${fmt(commission, form.currency)}`],
            ['Stripe (1,4%)', `−${fmt(stripe, form.currency)}`],
          ].map(([l, v]) => (
            <div key={l} className="flex justify-between text-[13px] text-stone-500 mb-1.5">
              <span>{l}</span>
              <span>{v}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm font-semibold text-stone-950 border-t border-stone-200 pt-2 mt-1">
            <span>Total neto</span>
            <span>{fmt(net, form.currency)}</span>
          </div>
        </motion.div>
      )}

      <div>
        <label className="text-[13px] font-medium text-stone-950 mb-1.5 block">Condiciones de pago *</label>
        <PillSelector
          options={PAYMENT_TERMS}
          value={form.payment_terms}
          getLabel={(o) => o.label}
          getValue={(o) => o.value}
          onChange={(v) => set('payment_terms', v)}
        />
      </div>
    </div>
  );
}

/* ── Step 3: Logística ─────────────────────────────────────── */
function StepLogistica({ form, set, submitted }) {
  const cityRequired = form.incoterm && form.incoterm !== 'EXW';
  const cityEmpty = !(form.incoterm_city || '').trim();
  const showCityError = cityRequired && cityEmpty && submitted;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="text-[13px] font-medium text-stone-950 mb-1.5 block">Incoterm *</label>
        <div className="flex flex-col gap-2">
          {INCOTERMS.map((ic) => {
            const active = form.incoterm === ic.code;
            return (
              <button
                key={ic.code}
                type="button"
                onClick={() => set('incoterm', ic.code)}
                className={`flex flex-col items-start text-left p-3 rounded-xl cursor-pointer transition-all duration-150 border-[1.5px] ${
                  active
                    ? 'border-stone-950 bg-white'
                    : 'border-stone-200 bg-white'
                }`}
              >
                <span className="text-sm font-semibold text-stone-950">
                  {ic.code}
                  <span className="font-normal text-stone-500 ml-1.5">
                    {ic.name}
                  </span>
                </span>
                <span className="text-xs text-stone-500 mt-0.5">{ic.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* AI suggestion */}
      <div className="flex gap-3 bg-stone-100 rounded-xl p-3.5">
        <Sparkles size={18} className="text-stone-950 shrink-0 mt-0.5" />
        <span className="text-[13px] text-stone-950 leading-normal">
          Para envíos dentro de la UE, <strong>DAP</strong> o <strong>DDP</strong> son los más
          habituales. DAP si el comprador gestiona aduanas, DDP si el vendedor asume todo.
        </span>
      </div>

      <div>
        <label className="text-[13px] font-medium text-stone-950 mb-1.5 block">
          Ciudad de entrega {cityRequired ? '*' : '(opcional)'}
        </label>
        <input
          type="text"
          placeholder="Ej: Barcelona"
          value={form.incoterm_city}
          onChange={(e) => set('incoterm_city', e.target.value)}
          className={`w-full h-11 rounded-xl border px-3.5 text-sm text-stone-950 bg-white outline-none box-border transition-colors ${
            showCityError ? 'border-stone-500' : 'border-stone-200'
          }`}
        />
        {cityRequired && cityEmpty && (
          <p className={`text-xs mt-1 ${showCityError ? 'text-stone-600 font-medium' : 'text-stone-500'}`}>
            La ciudad de entrega es obligatoria para {form.incoterm}
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-[13px] font-medium text-stone-950 mb-1.5 block">Plazo de entrega (días) *</label>
          <input
            type="number"
            min="1"
            placeholder="0"
            value={form.delivery_days}
            onChange={(e) => set('delivery_days', e.target.value)}
            className="w-full h-11 rounded-xl border border-stone-200 px-3.5 text-sm text-stone-950 bg-white outline-none box-border"
          />
          {(!form.delivery_days || Number(form.delivery_days) < 1) && (
            <p className="text-xs text-stone-500 mt-1">Indica el plazo mínimo de entrega</p>
          )}
        </div>
        <div className="flex-1">
          <label className="text-[13px] font-medium text-stone-950 mb-1.5 block">Validez (días)</label>
          <input
            type="number"
            min="1"
            value={form.validity_days}
            onChange={(e) => set('validity_days', e.target.value)}
            className="w-full h-11 rounded-xl border border-stone-200 px-3.5 text-sm text-stone-950 bg-white outline-none box-border"
          />
        </div>
      </div>
    </div>
  );
}

/* ── Step 4: Revisar ───────────────────────────────────────── */
function StepRevisar({ form, prefillData, confirmed, setConfirmed }) {
  const modifiedFields = useMemo(() => {
    if (!prefillData) return [];
    const changed = [];
    Object.keys(prefillData).forEach((key) => {
      if (String(form[key]) !== String(prefillData[key])) changed.push(key);
    });
    return changed;
  }, [form, prefillData]);

  const termLabel = PAYMENT_TERMS.find((t) => t.value === form.payment_terms)?.label ?? form.payment_terms;
  const incotermObj = INCOTERMS.find((i) => i.code === form.incoterm);

  const qty = Number(form.quantity) || 0;
  const price = Number(form.price_per_unit) || 0;
  const subtotal = qty * price;
  const commission = subtotal * 0.03;
  const stripe = subtotal * 0.014;
  const net = subtotal - commission - stripe;

  return (
    <div className="flex flex-col gap-5">
      {/* Product summary card */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Package size={16} className="text-stone-950" />
          <span className="text-[13px] font-semibold text-stone-950">Producto</span>
          {modifiedFields.includes('product_name') && (
            <span className="text-[10px] font-semibold text-stone-500 bg-stone-100 border border-stone-200 rounded-md px-1.5 py-px">Modificado</span>
          )}
        </div>
        <p className="text-sm font-medium text-stone-950">{form.product_name}</p>
        {form.product_id && (
          <p className="text-xs text-stone-500 mt-0.5">Ref: {form.product_id}</p>
        )}
        <div className="flex items-baseline gap-4 mt-3">
          <div>
            <p className="text-xs text-stone-500">Cantidad</p>
            <p className="text-sm font-semibold text-stone-950">{form.quantity} {form.unit}</p>
          </div>
          <div>
            <p className="text-xs text-stone-500">Precio unitario</p>
            <p className="text-sm font-semibold text-stone-950">{fmt(price, form.currency)}</p>
          </div>
          <div>
            <p className="text-xs text-stone-500">Total</p>
            <p className="text-sm font-bold text-stone-950">{fmt(subtotal, form.currency)}</p>
          </div>
        </div>
      </div>

      {/* Delivery terms card */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Truck size={16} className="text-stone-950" />
          <span className="text-[13px] font-semibold text-stone-950">Entrega</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-stone-500">Incoterm</p>
            <p className="text-sm font-medium text-stone-950">
              {incotermObj ? `${incotermObj.code} — ${incotermObj.name}` : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-stone-500">Ciudad</p>
            <p className="text-sm font-medium text-stone-950">{form.incoterm_city || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-stone-500">Plazo</p>
            <p className="text-sm font-medium text-stone-950">
              {form.delivery_days ? `${form.delivery_days} días` : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-stone-500">Validez</p>
            <p className="text-sm font-medium text-stone-950">{form.validity_days} días</p>
          </div>
        </div>
      </div>

      {/* Payment & commission card */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard size={16} className="text-stone-950" />
          <span className="text-[13px] font-semibold text-stone-950">Pago y comisiones</span>
        </div>
        <div className="mb-3">
          <p className="text-xs text-stone-500">Condiciones</p>
          <p className="text-sm font-medium text-stone-950">{termLabel}</p>
        </div>
        {subtotal > 0 && (
          <div className="bg-stone-50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Percent size={12} className="text-stone-500" />
              <span className="text-xs font-medium text-stone-500">Desglose</span>
            </div>
            {[
              ['Subtotal', fmt(subtotal, form.currency)],
              ['Comisión (3%)', `−${fmt(commission, form.currency)}`],
              ['Stripe (1,4%)', `−${fmt(stripe, form.currency)}`],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between text-xs text-stone-500 mb-1">
                <span>{l}</span>
                <span>{v}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm font-semibold text-stone-950 border-t border-stone-200 pt-1.5 mt-1">
              <span>Neto productor</span>
              <span>{fmt(net, form.currency)}</span>
            </div>
          </div>
        )}
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="w-[18px] h-[18px] accent-stone-950 mt-0.5 shrink-0"
        />
        <span className="text-[13px] text-stone-950 leading-normal">
          He revisado los datos y confirmo esta oferta
        </span>
      </label>
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────────── */
export default function B2BOfferPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const conversationId = searchParams.get('conversationId');
  const counterpartId = searchParams.get('counterpartId');
  const operationId = searchParams.get('operationId');

  const prefillData = useMemo(() => {
    try {
      const raw = searchParams.get('prefill');
      return raw ? JSON.parse(decodeURIComponent(raw)) : null;
    } catch {
      return null;
    }
  }, [searchParams]);

  const isCounteroffer = Boolean(prefillData && operationId);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, ...(prefillData ?? {}) }));
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [attemptedAdvance, setAttemptedAdvance] = useState(false);
  const scrollRef = useRef(null);

  const set = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  /* scroll to top on step change */
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    setAttemptedAdvance(false);
  }, [step]);

  /* ── Validation ─────────────────────────────────────────── */
  const canAdvance = useMemo(() => {
    if (step === 0) return form.product_name.trim() && form.quantity && form.unit;
    if (step === 1) return form.price_per_unit && form.payment_terms;
    if (step === 2) {
      if (!form.incoterm) return false;
      if (!form.delivery_days || Number(form.delivery_days) < 1) return false;
      if (form.incoterm !== 'EXW' && !(form.incoterm_city || '').trim()) return false;
      return true;
    }
    if (step === 3) return confirmed;
    return false;
  }, [step, form, confirmed]);

  /* ── Navigation ─────────────────────────────────────────── */
  const goBack = () => {
    if (step > 0) setStep((s) => s - 1);
    else navigate(-1);
  };

  const goNext = () => {
    setAttemptedAdvance(true);
    if (!canAdvance) return;
    if (step < 3) setStep((s) => s + 1);
    else handleSubmit();
  };

  /* ── Submit ─────────────────────────────────────────────── */
  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);

    const offer = {
      product_name: (form.product_name || '').trim(),
      product_id: (form.product_id || '').trim() || undefined,
      quantity: Number(form.quantity),
      unit: UNIT_TO_CANONICAL[form.unit] || form.unit,
      price_per_unit: Number(form.price_per_unit),
      currency: form.currency,
      payment_terms: form.payment_terms,
      incoterm: form.incoterm,
      incoterm_city: (form.incoterm_city || '').trim(),
      delivery_days: form.delivery_days ? Number(form.delivery_days) : undefined,
      validity_days: Number(form.validity_days),
    };

    /* compute modified fields for counteroffers */
    if (isCounteroffer && prefillData) {
      const modified = [];
      Object.keys(prefillData).forEach((k) => {
        if (String(offer[k]) !== String(prefillData[k])) modified.push(k);
      });
      offer.modified_fields = modified;
    }

    try {
      if (isCounteroffer) {
        await apiClient.post(`/b2b/operations/${operationId}/offers`, offer);
      } else {
        await apiClient.post('/b2b/operations', {
          conversation_id: conversationId,
          counterpart_id: counterpartId,
          offer,
        });
      }
      toast.success(isCounteroffer ? 'Contraoferta enviada' : 'Oferta enviada correctamente');
      navigate(-1);
    } catch (err) {
      toast.error(err?.response?.data?.detail || err?.message || 'Error al enviar la oferta');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Render ─────────────────────────────────────────────── */
  const stepContent = [
    <StepProducto key="step-0" form={form} set={set} />,
    <StepPrecio key="step-1" form={form} set={set} />,
    <StepLogistica key="step-2" form={form} set={set} submitted={attemptedAdvance} />,
    <StepRevisar
      key="step-3"
      form={form}
      prefillData={prefillData}
      confirmed={confirmed}
      setConfirmed={setConfirmed}
    />,
  ];

  return (
    <div className="fixed inset-0 flex flex-col bg-white">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex items-center gap-3 shrink-0 px-4 py-3 border-b border-stone-200 bg-white z-10">
        <button
          onClick={goBack}
          className="bg-transparent border-none cursor-pointer p-1 text-stone-950"
        >
          <ArrowLeft size={20} />
        </button>
        <span className="text-base font-semibold text-stone-950">
          {isCounteroffer ? 'Contraoferta' : 'Nueva oferta B2B'}
        </span>
      </div>

      {/* ── Step indicator ──────────────────────────────── */}
      <StepIndicator current={step} />

      {/* ── Scrollable content ──────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="px-5 pt-2 pb-[120px] max-w-[600px] mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.2 }}
            >
              {stepContent[step]}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Bottom CTA ──────────────────────────────────── */}
      <div className="shrink-0 px-5 py-3 pb-[max(12px,env(safe-area-inset-bottom))] border-t border-stone-200 bg-white">
        <button
          onClick={goNext}
          disabled={!canAdvance || submitting}
          className={`flex items-center justify-center gap-2 w-full h-12 rounded-full border-none text-[15px] font-semibold transition-all duration-200 ${
            canAdvance && !submitting
              ? 'bg-stone-950 text-white cursor-pointer'
              : 'bg-stone-200 text-stone-500 cursor-not-allowed'
          }`}
        >
          {submitting && <Loader2 size={18} className="animate-spin" />}
          {step === 3 ? (submitting ? 'Enviando...' : 'Enviar oferta') : 'Siguiente'}
        </button>
      </div>
    </div>
  );
}
