import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '../../services/api/client';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Package, Percent, Clock, Send, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const DURATIONS = [
  { days: 30, label: '30 días' },
  { days: 60, label: '60 días' },
  { days: 90, label: '90 días' },
];

export default function CollabProposalPage() {
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
        const data = await apiClient.get('/products/my');
        setProducts((data.products || data || []).slice(0, 50));
      } catch { setProducts([]); }
      finally { setLoadingProducts(false); }
    })();
  }, []);

  // Fetch influencer tier info
  useEffect(() => {
    if (!influencerId) return;
    (async () => {
      try {
        const data = await apiClient.get(`/influencer/${influencerId}/public`);
        const tier = data?.current_tier || 'hercules';
        const tierMap = { hercules: 3, atenea: 5, zeus: 7 };
        setInfluencerTier({ name: tier.charAt(0).toUpperCase() + tier.slice(1), rate: tierMap[tier] || 3 });
      } catch {
        // fallback
      }
    })();
  }, [influencerId]);

  // Set default commission when tier loads
  useEffect(() => {
    if (commissionPct === null) setCommissionPct(influencerTier.rate);
  }, [influencerTier.rate, commissionPct]);

  const tierRate = influencerTier.rate;
  const commissionPills = [
    { label: `${tierRate}% (tier)`, value: tierRate },
    { label: `${tierRate + 2}%`, value: tierRate + 2 },
    { label: `${tierRate + 5}%`, value: tierRate + 5 },
    { label: `${tierRate + 10}%`, value: tierRate + 10 },
  ];

  const canSubmit = selectedProduct && commissionPct >= tierRate && conversationId && influencerId;

  const handleSubmit = async () => {
    if (!canSubmit) return;
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
      toast.error(e?.message || 'Error al enviar propuesta');
    } finally {
      setLoading(false);
    }
  };

  const previewEarning = selectedProduct
    ? ((selectedProduct.price || 0) * (commissionPct || 0) / 100).toFixed(2)
    : '0.00';

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--color-cream)' }}>
      {/* Header */}
      <div className="sticky top-0 z-40" style={{ background: 'var(--color-white)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 rounded-full">
              <ArrowLeft className="w-5 h-5" style={{ color: 'var(--color-black)' }} />
            </button>
            <h1 className="text-lg font-bold" style={{ color: 'var(--color-black)' }}>Nueva colaboración</h1>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            className="px-4 py-2 rounded-full text-sm font-semibold disabled:opacity-40"
            style={{ background: 'var(--color-black)', color: '#fff', border: 'none' }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar'}
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-5">

        {/* 1. Product selector */}
        <section>
          <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: 'var(--color-stone)' }}>
            <Package className="w-3.5 h-3.5 inline mr-1" /> Producto a promocionar
          </label>
          {selectedProduct ? (
            <div className="flex items-center gap-3 p-3" style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }}>
              {selectedProduct.images?.[0]?.url && (
                <img src={selectedProduct.images[0].url} alt="" className="w-14 h-14 rounded-xl object-cover" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-black)' }}>{selectedProduct.name}</p>
                <p className="text-xs" style={{ color: 'var(--color-stone)' }}>{selectedProduct.price?.toFixed(2)}€</p>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="text-xs font-medium px-3 py-1 rounded-full" style={{ border: '1px solid var(--color-border)', color: 'var(--color-stone)' }}>
                Cambiar
              </button>
            </div>
          ) : loadingProducts ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-stone)' }} /></div>
          ) : (
            <div className="space-y-1.5 max-h-[240px] overflow-y-auto" style={{ borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', background: 'var(--color-white)' }}>
              {products.map(p => (
                <button
                  key={p._id || p.product_id}
                  onClick={() => setSelectedProduct(p)}
                  className="flex items-center gap-3 w-full p-3 text-left hover:bg-stone-50 transition-colors"
                >
                  {p.images?.[0]?.url && <img src={p.images[0].url} alt="" className="w-10 h-10 rounded-xl object-cover" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--color-black)' }}>{p.name}</p>
                    <p className="text-xs" style={{ color: 'var(--color-stone)' }}>{p.price?.toFixed(2)}€</p>
                  </div>
                </button>
              ))}
              {products.length === 0 && <p className="text-center text-sm py-6" style={{ color: 'var(--color-stone)' }}>No tienes productos</p>}
            </div>
          )}
        </section>

        {/* 2. Commission */}
        <section>
          <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: 'var(--color-stone)' }}>
            <Percent className="w-3.5 h-3.5 inline mr-1" /> Comisión para el influencer
          </label>
          <p className="text-xs mb-2" style={{ color: 'var(--color-stone)' }}>
            Tier {influencerTier.name}: {tierRate}% estándar (Hércules 3% / Atenea 5% / Zeus 7%)
          </p>
          <div className="flex flex-wrap gap-2">
            {commissionPills.map(pill => (
              <button
                key={pill.value}
                onClick={() => setCommissionPct(pill.value)}
                className="px-4 py-1.5 text-sm font-medium"
                style={{
                  borderRadius: 'var(--radius-full)',
                  border: commissionPct === pill.value ? '1px solid var(--color-black)' : '1px solid var(--color-border)',
                  background: commissionPct === pill.value ? 'var(--color-black)' : 'var(--color-white)',
                  color: commissionPct === pill.value ? '#fff' : 'var(--color-black)',
                }}
              >
                {pill.label}
              </button>
            ))}
          </div>
          {selectedProduct && commissionPct && (
            <div className="mt-3 p-3 text-xs" style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', color: 'var(--color-stone)' }}>
              El influencer ganará {commissionPct}% de comisión. Para un producto de {selectedProduct.price?.toFixed(2)}€ → <strong style={{ color: 'var(--color-black)' }}>{previewEarning}€ por venta</strong>.
            </div>
          )}
        </section>

        {/* 3. Duration */}
        <section>
          <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: 'var(--color-stone)' }}>
            <Clock className="w-3.5 h-3.5 inline mr-1" /> Duración
          </label>
          <div className="flex gap-2">
            {DURATIONS.map(d => (
              <button
                key={d.days}
                onClick={() => setDurationDays(d.days)}
                className="flex-1 py-2 text-sm font-medium"
                style={{
                  borderRadius: 'var(--radius-full)',
                  border: durationDays === d.days ? '1px solid var(--color-black)' : '1px solid var(--color-border)',
                  background: durationDays === d.days ? 'var(--color-black)' : 'var(--color-white)',
                  color: durationDays === d.days ? '#fff' : 'var(--color-black)',
                }}
              >
                {d.label}
              </button>
            ))}
          </div>
        </section>

        {/* 4. Sample toggle */}
        <section>
          <div className="flex items-center justify-between p-4" style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-black)' }}>Enviar muestra</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-stone)' }}>El coste corre a cargo del productor</p>
            </div>
            <button
              onClick={() => setSendSample(!sendSample)}
              className="w-11 h-6 rounded-full relative"
              style={{ background: sendSample ? 'var(--color-black)' : 'var(--color-border)', transition: 'background 0.2s' }}
            >
              <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all" style={{ left: sendSample ? 22 : 2 }} />
            </button>
          </div>
          {sendSample && (
            <div className="flex items-center gap-3 mt-2 px-4">
              <span className="text-xs" style={{ color: 'var(--color-stone)' }}>Cantidad:</span>
              {[1, 2, 3, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setSampleQty(n)}
                  className="w-8 h-8 rounded-full text-xs font-medium"
                  style={{
                    border: sampleQty === n ? '1px solid var(--color-black)' : '1px solid var(--color-border)',
                    background: sampleQty === n ? 'var(--color-black)' : 'var(--color-white)',
                    color: sampleQty === n ? '#fff' : 'var(--color-black)',
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* 5. Notes */}
        <section>
          <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: 'var(--color-stone)' }}>
            Nota personal (opcional)
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Hola! Vi tu contenido y creo que encajarías perfectamente con nuestros productos..."
            className="w-full px-4 py-3 text-sm resize-none"
            style={{
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              background: 'var(--color-white)',
              color: 'var(--color-black)',
              outline: 'none',
            }}
          />
        </section>

        {/* 6. Preview */}
        {selectedProduct && commissionPct && (
          <section>
            <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: 'var(--color-stone)' }}>
              Preview de la propuesta
            </label>
            <div className="p-4 space-y-2" style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }}>
              <div className="flex items-center gap-3">
                {selectedProduct.images?.[0]?.url && <img src={selectedProduct.images[0].url} alt="" className="w-12 h-12 rounded-xl object-cover" />}
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-black)' }}>{selectedProduct.name}</p>
                  <p className="text-xs" style={{ color: 'var(--color-stone)' }}>{selectedProduct.price?.toFixed(2)}€</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs" style={{ color: 'var(--color-stone)' }}>
                <span className="px-2.5 py-1 rounded-full" style={{ background: 'var(--color-surface)' }}>{commissionPct}% comisión</span>
                <span className="px-2.5 py-1 rounded-full" style={{ background: 'var(--color-surface)' }}>{durationDays} días</span>
                {sendSample && <span className="px-2.5 py-1 rounded-full" style={{ background: 'var(--color-surface)' }}>Muestra ×{sampleQty}</span>}
              </div>
              {notes && <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--color-stone)' }}>"{notes}"</p>}
            </div>
          </section>
        )}

        {/* Submit button (mobile) */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || loading}
          className="w-full py-3 rounded-full text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
          style={{ background: 'var(--color-black)', color: '#fff', border: 'none' }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Enviar propuesta
        </button>
      </div>
    </div>
  );
}
