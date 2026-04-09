// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '../../services/api/client';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Package, Percent, Clock, Send, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const DURATIONS = [
  { days: 30, label: '30 días' },
  { days: 60, label: '60 días' },
  { days: 90, label: '90 días' },
];

export default function CollabProposalPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const conversationId = searchParams.get('conversationId') || '';
  const influencerId = searchParams.get('influencerId') || '';

  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [commissionPct, setCommissionPct] = useState(null);
  const [durationDays, setDurationDays] = useState(30);
  const [sendSample, setSendSample] = useState(false);
  const [sampleQty, setSampleQty] = useState(1);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [influencerTier, setInfluencerTier] = useState({ name: 'Hercules', rate: 3 });

  // Fetch producer's products
  useEffect(() => {
    (async () => {
      try {
        const data = await apiClient.get('/producer/products');
        setProducts((data.products || data || []).slice(0, 50));
      } catch { setProducts([]); }
      finally { setLoadingProducts(false); }
    })();
  }, []);

  // Influencer public tier endpoint is not available in backend; keep safe default.

  // Set default commission when tier loads
  useEffect(() => {
    if (commissionPct === null) setCommissionPct(influencerTier.rate);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [influencerTier.rate]);

  const tierRate = influencerTier.rate;
  const commissionPills = [
    { label: `${tierRate}% (tier)`, value: tierRate },
    { label: `${tierRate + 2}%`, value: tierRate + 2 },
    { label: `${tierRate + 5}%`, value: tierRate + 5 },
    { label: `${tierRate + 10}%`, value: tierRate + 10 },
  ];

  const canSubmit = selectedProduct && commissionPct >= tierRate && conversationId && influencerId;

  const handleSubmit = async () => {
    if (!canSubmit || loading) return;
    setLoading(true);
    try {
      const res = await apiClient.post('/collaborations', {
        conversation_id: conversationId,
        influencer_id: influencerId,
        product_id: selectedProduct._id || selectedProduct.product_id,
        commission_pct: commissionPct,
        duration_days: durationDays,
        send_sample: sendSample,
        sample_quantity: sampleQty,
        notes,
      });
      toast.success('Propuesta enviada');
      navigate(-1);
    } catch (e) {
      toast.error(e?.response?.data?.detail || e?.message || 'Error al enviar propuesta');
    } finally {
      setLoading(false);
    }
  };

  const previewEarning = selectedProduct
    ? (Number(selectedProduct.price || 0) * Number(commissionPct || 0) / 100).toFixed(2)
    : '0.00';

  return (
    <div className="min-h-screen bg-stone-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[600px] items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-stone-950 active:bg-stone-100"
              aria-label="Volver"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold text-stone-950">{t('collab_proposal.nuevaColaboracion', 'Nueva colaboración')}</h1>
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar'}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-[600px] space-y-5 p-4">

        {/* 1. Product selector */}
        <section>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-stone-500">
            <Package className="mr-1 inline h-3.5 w-3.5" /> Producto a promocionar
          </label>
          {selectedProduct ? (
            <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3">
              {selectedProduct.images?.[0]?.url && (
                <img loading="lazy" src={selectedProduct.images[0].url} alt="" className="h-14 w-14 rounded-2xl object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-stone-950">{selectedProduct.name}</p>
                <p className="text-xs text-stone-500">{Number(selectedProduct.price || 0).toFixed(2)}\u20AC</p>
              </div>
              <button type="button" onClick={() => setSelectedProduct(null)} className="rounded-full border border-stone-200 px-3 py-1 text-xs font-medium text-stone-500">
                Cambiar
              </button>
            </div>
          ) : loadingProducts ? (
            <div className="space-y-2 py-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton-shimmer rounded-xl h-12" />)}</div>
          ) : (
            <div className="max-h-[240px] space-y-1.5 overflow-y-auto rounded-xl border border-stone-200 bg-white">
              {products.map(p => (
                <button
                  type="button"
                  key={p._id || p.product_id}
                  onClick={() => setSelectedProduct(p)}
                  className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-stone-50"
                >
                  {p.images?.[0]?.url && <img loading="lazy" src={p.images[0].url} alt="" className="h-10 w-10 rounded-2xl object-cover" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-stone-950">{p.name}</p>
                    <p className="text-xs text-stone-500">{Number(p.price || 0).toFixed(2)}\u20AC</p>
                  </div>
                </button>
              ))}
              {products.length === 0 && <p className="py-6 text-center text-sm text-stone-500">No tienes productos</p>}
            </div>
          )}
        </section>

        {/* 2. Commission */}
        <section>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-stone-500">
            <Percent className="mr-1 inline h-3.5 w-3.5" /> Comisión para el influencer
          </label>
          <p className="mb-2 text-xs text-stone-500">
            Tier {influencerTier.name}: {tierRate}% estándar (Hércules 3% / Atenea 5% / Zeus 7%)
          </p>
          <div className="flex flex-wrap gap-2">
            {commissionPills.map(pill => (
              <button
                type="button"
                key={pill.value}
                onClick={() => setCommissionPct(pill.value)}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                  commissionPct === pill.value
                    ? 'border-stone-950 bg-stone-950 text-white'
                    : 'border-stone-200 bg-white text-stone-950'
                }`}
              >
                {pill.label}
              </button>
            ))}
            <div className="flex items-center gap-1 rounded-full border border-stone-200 bg-white px-3 py-1.5">
              <input
                type="number"
                min={tierRate}
                max={50}
                value={commissionPct ?? ''}
                onChange={e => { const v = parseFloat(e.target.value); setCommissionPct(isNaN(v) ? tierRate : Math.max(tierRate, Math.min(50, v))); }}
                className="w-12 border-none bg-transparent text-sm font-medium text-stone-950 outline-none text-center"
                aria-label="Comisión personalizada"
              />
              <span className="text-xs text-stone-500">%</span>
            </div>
          </div>
          {selectedProduct && commissionPct && (
            <div className="mt-3 rounded-xl bg-stone-100 p-3 text-xs text-stone-500">
              El influencer ganará {commissionPct}% de comisión. Para un producto de {Number(selectedProduct.price || 0).toFixed(2)}\u20AC → <strong className="text-stone-950">{previewEarning}\u20AC por venta</strong>.
            </div>
          )}
        </section>

        {/* 3. Duration */}
        <section>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-stone-500">
            <Clock className="mr-1 inline h-3.5 w-3.5" /> Duración
          </label>
          <div className="flex gap-2">
            {DURATIONS.map(d => (
              <button
                type="button"
                key={d.days}
                onClick={() => setDurationDays(d.days)}
                className={`flex-1 rounded-full border py-2 text-sm font-medium transition-colors ${
                  durationDays === d.days
                    ? 'border-stone-950 bg-stone-950 text-white'
                    : 'border-stone-200 bg-white text-stone-950'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </section>

        {/* 4. Sample toggle */}
        <section>
          <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-4">
            <div>
              <p className="text-sm font-semibold text-stone-950">Enviar muestra</p>
              <p className="mt-0.5 text-xs text-stone-500">{t('collab_proposal.elCosteCorreACargoDelProductor', 'El coste corre a cargo del productor')}</p>
            </div>
            <button
              type="button"
              onClick={() => setSendSample(!sendSample)}
              aria-label={sendSample ? 'Desactivar envío de muestra' : 'Activar envío de muestra'}
              className={`relative h-6 w-11 rounded-full transition-colors ${sendSample ? 'bg-stone-950' : 'bg-stone-200'}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${sendSample ? 'left-[22px]' : 'left-[2px]'}`} />
            </button>
          </div>
          {sendSample && (
            <div className="mt-2 flex items-center gap-3 px-4">
              <span className="text-xs text-stone-500">Cantidad:</span>
              {[1, 2, 3, 5].map(n => (
                <button
                  type="button"
                  key={n}
                  onClick={() => setSampleQty(n)}
                  className={`h-8 w-8 rounded-full text-xs font-medium transition-colors ${
                    sampleQty === n
                      ? 'border border-stone-950 bg-stone-950 text-white'
                      : 'border border-stone-200 bg-white text-stone-950'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* 5. Notes */}
        <section>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-stone-500">
            Nota personal (opcional)
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder={t('collab_proposal.holaViTuContenidoYCreoQueEncajar', 'Hola! Vi tu contenido y creo que encajarías perfectamente con nuestros productos...')}
            className="h-12 min-h-[80px] w-full resize-none rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-950 outline-none placeholder:text-stone-400 focus:border-stone-400"
          />
        </section>

        {/* 6. Preview */}
        {selectedProduct && commissionPct && (
          <section>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-stone-500">
              Preview de la propuesta
            </label>
            <div className="space-y-2 rounded-xl border border-stone-200 bg-white p-4">
              <div className="flex items-center gap-3">
                {selectedProduct.images?.[0]?.url && <img loading="lazy" src={selectedProduct.images[0].url} alt="" className="h-12 w-12 rounded-2xl object-cover" />}
                <div>
                  <p className="text-sm font-semibold text-stone-950">{selectedProduct.name}</p>
                  <p className="text-xs text-stone-500">{Number(selectedProduct.price || 0).toFixed(2)}\u20AC</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-stone-500">
                <span className="rounded-full bg-stone-100 px-2.5 py-1">{commissionPct}% comisión</span>
                <span className="rounded-full bg-stone-100 px-2.5 py-1">{durationDays} días</span>
                {sendSample && <span className="rounded-full bg-stone-100 px-2.5 py-1">Muestra ×{sampleQty}</span>}
              </div>
              {notes && <p className="mt-1 line-clamp-2 text-xs text-stone-500">"{notes}"</p>}
            </div>
          </section>
        )}

        {/* Submit button (mobile) */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || loading}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-stone-950 py-3 text-sm font-semibold text-white disabled:opacity-40"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Enviar propuesta
        </button>
      </div>
    </div>
  );
}
