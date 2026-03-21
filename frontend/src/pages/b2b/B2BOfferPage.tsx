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
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../services/api/client';

/* ── V2 Design Tokens ─────────────────────────────────────── */
const V2 = {
  black: '#0A0A0A',
  cream: '#ffffff',
  stone: '#8A8881',
  white: '#FFFFFF',
  border: '#E5E2DA',
  surface: '#F0EDE8',
  green: '#0c0a09',
  greenLight: '#f5f5f4',
  blue: '#57534e',
  blueLight: '#f5f5f4',
  blueBorder: '#d6d3d1',
  amber: '#78716c',
  amberLight: '#fafaf9',
  fontSans: 'Inter, sans-serif',
  radiusMd: 12,
  radiusFull: 9999,
};

/* ── Constants ─────────────────────────────────────────────── */
const STEP_LABELS = ['Producto', 'Precio', 'Logística', 'Revisar'];

const UNITS = ['kg', 'unidades', 'litros', 'cajas', 'pallets'];
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

/* ── Shared style builders ─────────────────────────────────── */
const inputStyle = {
  width: '100%',
  height: 44,
  borderRadius: V2.radiusMd,
  border: `1px solid ${V2.border}`,
  padding: '0 14px',
  fontSize: 14,
  fontFamily: V2.fontSans,
  color: V2.black,
  backgroundColor: V2.white,
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle = {
  fontSize: 13,
  fontWeight: 500,
  color: V2.black,
  marginBottom: 6,
  display: 'block',
};

const pillBase = (active) => ({
  height: 36,
  padding: '0 16px',
  borderRadius: V2.radiusFull,
  border: `1.5px solid ${active ? V2.black : V2.border}`,
  backgroundColor: active ? V2.black : V2.white,
  color: active ? V2.white : V2.black,
  fontSize: 13,
  fontWeight: 500,
  fontFamily: V2.fontSans,
  cursor: 'pointer',
  transition: 'all 150ms',
});

/* ── Step indicator ────────────────────────────────────────── */
function StepIndicator({ current }) {
  return (
    <div className="flex items-center justify-center" style={{ padding: '16px 24px 12px' }}>
      {STEP_LABELS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={label}>
            {i > 0 && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  backgroundColor: done ? V2.black : V2.border,
                  maxWidth: 48,
                  margin: '0 4px',
                  borderRadius: 1,
                  transition: 'background-color 300ms',
                }}
              />
            )}
            <div className="flex flex-col items-center" style={{ minWidth: 56 }}>
              <div
                className="flex items-center justify-center"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  border: `2px solid ${done || active ? V2.black : V2.border}`,
                  backgroundColor: done || active ? V2.black : 'transparent',
                  color: done || active ? V2.white : V2.stone,
                  fontSize: 12,
                  fontWeight: 600,
                  transition: 'all 300ms',
                }}
              >
                {done ? <Check size={14} strokeWidth={2.5} /> : i + 1}
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: active ? 600 : 400,
                  color: active ? V2.black : V2.stone,
                  marginTop: 4,
                }}
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
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            style={pillBase(value === v)}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}

/* ── Step 1: Producto ──────────────────────────────────────── */
function StepProducto({ form, set }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <label style={labelStyle}>Producto *</label>
        <div style={{ position: 'relative' }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: 14, top: 14, color: V2.stone, pointerEvents: 'none' }}
          />
          <input
            type="text"
            placeholder="Buscar producto..."
            value={form.product_name}
            onChange={(e) => set('product_name', e.target.value)}
            style={{ ...inputStyle, paddingLeft: 38 }}
          />
        </div>
      </div>

      <div>
        <label style={labelStyle}>ID de producto (opcional)</label>
        <input
          type="text"
          placeholder="SKU o referencia"
          value={form.product_id}
          onChange={(e) => set('product_id', e.target.value)}
          style={{ ...inputStyle, fontSize: 13, color: V2.stone }}
        />
      </div>

      <div>
        <label style={labelStyle}>Cantidad *</label>
        <input
          type="number"
          min="1"
          placeholder="0"
          value={form.quantity}
          onChange={(e) => set('quantity', e.target.value)}
          style={inputStyle}
        />
        {form.moq && Number(form.quantity) > 0 && Number(form.quantity) < Number(form.moq) && (
          <p className="text-xs text-stone-500 mt-1">
            La cantidad mínima recomendada es {form.moq} unidades
          </p>
        )}
      </div>

      <div>
        <label style={labelStyle}>Unidad *</label>
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
        <label style={labelStyle}>Precio por unidad *</label>
        <div className="flex gap-3 items-end">
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={form.price_per_unit}
            onChange={(e) => set('price_per_unit', e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
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
          style={{
            backgroundColor: V2.surface,
            borderRadius: V2.radiusMd,
            padding: 16,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: V2.black, marginBottom: 12 }}>
            Desglose
          </div>
          {[
            [`Subtotal (${qty} × ${fmt(price, form.currency)})`, fmt(subtotal, form.currency)],
            ['Comisión (3%)', `−${fmt(commission, form.currency)}`],
            ['Stripe (1,4%)', `−${fmt(stripe, form.currency)}`],
          ].map(([l, v]) => (
            <div key={l} className="flex justify-between" style={{ fontSize: 13, color: V2.stone, marginBottom: 6 }}>
              <span>{l}</span>
              <span>{v}</span>
            </div>
          ))}
          <div
            className="flex justify-between"
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: V2.black,
              borderTop: `1px solid ${V2.border}`,
              paddingTop: 8,
              marginTop: 4,
            }}
          >
            <span>Total neto</span>
            <span>{fmt(net, form.currency)}</span>
          </div>
        </motion.div>
      )}

      <div>
        <label style={labelStyle}>Condiciones de pago *</label>
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
function StepLogistica({ form, set }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <label style={labelStyle}>Incoterm *</label>
        <div className="flex flex-col gap-2">
          {INCOTERMS.map((ic) => {
            const active = form.incoterm === ic.code;
            return (
              <button
                key={ic.code}
                type="button"
                onClick={() => set('incoterm', ic.code)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  textAlign: 'left',
                  padding: '12px 14px',
                  borderRadius: V2.radiusMd,
                  border: `1.5px solid ${active ? V2.black : V2.border}`,
                  backgroundColor: active ? V2.cream : V2.white,
                  cursor: 'pointer',
                  transition: 'all 150ms',
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 600, color: V2.black }}>
                  {ic.code}
                  <span style={{ fontWeight: 400, color: V2.stone, marginLeft: 6 }}>
                    {ic.name}
                  </span>
                </span>
                <span style={{ fontSize: 12, color: V2.stone, marginTop: 2 }}>{ic.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* AI suggestion */}
      <div
        className="flex gap-3"
        style={{
          backgroundColor: V2.greenLight,
          borderRadius: V2.radiusMd,
          padding: 14,
        }}
      >
        <Sparkles size={18} style={{ color: V2.green, flexShrink: 0, marginTop: 1 }} />
        <span style={{ fontSize: 13, color: V2.black, lineHeight: 1.5 }}>
          Para envíos dentro de la UE, <strong>DAP</strong> o <strong>DDP</strong> son los más
          habituales. DAP si el comprador gestiona aduanas, DDP si el vendedor asume todo.
        </span>
      </div>

      <div>
        <label style={labelStyle}>
          Ciudad de entrega {form.incoterm !== 'EXW' ? '*' : '(opcional)'}
        </label>
        <input
          type="text"
          placeholder="Ej: Barcelona"
          value={form.incoterm_city}
          onChange={(e) => set('incoterm_city', e.target.value)}
          style={inputStyle}
        />
        {form.incoterm && form.incoterm !== 'EXW' && !(form.incoterm_city || '').trim() && (
          <p className="text-xs text-stone-500 mt-1">La ciudad de entrega es obligatoria para {form.incoterm}</p>
        )}
      </div>

      <div className="flex gap-3">
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Plazo de entrega (días) *</label>
          <input
            type="number"
            min="1"
            placeholder="0"
            value={form.delivery_days}
            onChange={(e) => set('delivery_days', e.target.value)}
            style={{
              ...inputStyle,
              borderColor: form.delivery_days && Number(form.delivery_days) >= 1 ? undefined : '#E5E2DA',
            }}
          />
          {(!form.delivery_days || Number(form.delivery_days) < 1) && (
            <p className="text-xs text-stone-500 mt-1">Indica el plazo mínimo de entrega</p>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Validez (días)</label>
          <input
            type="number"
            min="1"
            value={form.validity_days}
            onChange={(e) => set('validity_days', e.target.value)}
            style={inputStyle}
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

  const rows = [
    ['Producto', form.product_name, 'product_name'],
    ['ID de producto', form.product_id || '—', 'product_id'],
    ['Cantidad', `${form.quantity} ${form.unit}`, 'quantity'],
    ['Precio unitario', `${fmt(form.price_per_unit, form.currency)}`, 'price_per_unit'],
    ['Condiciones de pago', termLabel, 'payment_terms'],
    ['Incoterm', incotermObj ? `${incotermObj.code} — ${incotermObj.name}` : '—', 'incoterm'],
    ['Ciudad de entrega', form.incoterm_city || '—', 'incoterm_city'],
    ['Plazo de entrega', form.delivery_days ? `${form.delivery_days} días` : '—', 'delivery_days'],
    ['Validez', `${form.validity_days} días`, 'validity_days'],
  ];

  return (
    <div className="flex flex-col gap-5">
      <div
        style={{
          backgroundColor: V2.white,
          borderRadius: V2.radiusMd,
          border: `1px solid ${V2.border}`,
          overflow: 'hidden',
        }}
      >
        {rows.map(([label, value, key], i) => {
          const modified = modifiedFields.includes(key);
          return (
            <div
              key={key}
              className="flex justify-between items-start"
              style={{
                padding: '12px 14px',
                borderBottom: i < rows.length - 1 ? `1px solid ${V2.border}` : 'none',
                backgroundColor: modified ? V2.amberLight : 'transparent',
              }}
            >
              <span style={{ fontSize: 13, color: V2.stone, flexShrink: 0, marginRight: 12 }}>
                {label}
              </span>
              <div className="flex items-center gap-2" style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: V2.black }}>{value}</span>
                {modified && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: V2.amber,
                      backgroundColor: V2.amberLight,
                      border: `1px solid ${V2.amber}`,
                      borderRadius: 6,
                      padding: '1px 6px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Modificado
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <label className="flex items-start gap-3" style={{ cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          style={{
            width: 18,
            height: 18,
            accentColor: V2.black,
            marginTop: 2,
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 13, color: V2.black, lineHeight: 1.5 }}>
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
  const scrollRef = useRef(null);

  const set = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  /* scroll to top on step change */
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
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
      unit: form.unit,
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
      toast.error(err?.message || 'Error al enviar la oferta');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Render ─────────────────────────────────────────────── */
  const stepContent = [
    <StepProducto key="step-0" form={form} set={set} />,
    <StepPrecio key="step-1" form={form} set={set} />,
    <StepLogistica key="step-2" form={form} set={set} />,
    <StepRevisar
      key="step-3"
      form={form}
      prefillData={prefillData}
      confirmed={confirmed}
      setConfirmed={setConfirmed}
    />,
  ];

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ backgroundColor: V2.cream, fontFamily: V2.fontSans }}
    >
      {/* ── Header ──────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 shrink-0"
        style={{
          padding: '12px 16px',
          borderBottom: `1px solid ${V2.border}`,
          backgroundColor: V2.cream,
          zIndex: 10,
        }}
      >
        <button
          onClick={goBack}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: V2.black }}
        >
          <ArrowLeft size={20} />
        </button>
        <span style={{ fontSize: 16, fontWeight: 600, color: V2.black }}>
          {isCounteroffer ? 'Contraoferta' : 'Nueva oferta B2B'}
        </span>
      </div>

      {/* ── Step indicator ──────────────────────────────── */}
      <StepIndicator current={step} />

      {/* ── Scrollable content ──────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1"
        style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}
      >
        <div style={{ padding: '8px 20px 120px' }} className="max-w-[600px] mx-auto">
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
      <div
        className="shrink-0"
        style={{
          padding: '12px 20px',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
          borderTop: `1px solid ${V2.border}`,
          backgroundColor: V2.cream,
        }}
      >
        <button
          onClick={goNext}
          disabled={!canAdvance || submitting}
          className="flex items-center justify-center gap-2"
          style={{
            width: '100%',
            height: 48,
            borderRadius: V2.radiusFull,
            backgroundColor: canAdvance && !submitting ? V2.black : V2.border,
            color: canAdvance && !submitting ? V2.white : V2.stone,
            border: 'none',
            fontSize: 15,
            fontWeight: 600,
            fontFamily: V2.fontSans,
            cursor: canAdvance && !submitting ? 'pointer' : 'not-allowed',
            transition: 'all 200ms',
          }}
        >
          {submitting && <Loader2 size={18} className="animate-spin" />}
          {step === 3 ? (submitting ? 'Enviando...' : 'Enviar oferta') : 'Siguiente'}
        </button>
      </div>
    </div>
  );
}
