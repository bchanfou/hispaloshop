import React, { useEffect, useState } from 'react';
import { BarChart3, MousePointerClick, RefreshCw, ShoppingCart, TrendingUp, TrendingDown, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../services/api/client';

const PERIODS = [
  { label: '7 días', value: 7 },
  { label: '30 días', value: 30 },
  { label: '90 días', value: 90 },
];

const formatPrice = (v) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(Number(v) || 0);

function KpiCard({ icon: Icon, label, value, prevValue }) {
  const change = (prevValue != null && prevValue > 0 && value != null && value !== '—')
    ? ((Number(value) - prevValue) / prevValue * 100)
    : null;

  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-stone-200 bg-white p-5">
      <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100">
        <Icon className="h-4 w-4 text-stone-700" />
      </div>
      <div className="flex items-center gap-2">
        <p className="text-2xl font-semibold text-stone-950">{value}</p>
        {change !== null && Math.abs(change) >= 5 && (
          <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${change > 0 ? 'text-stone-950' : 'text-stone-400'}`}>
            {change > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {Math.abs(change).toFixed(0)}%
          </span>
        )}
      </div>
      <p className="text-sm text-stone-600">{label}</p>
    </div>
  );
}

export default function InfluencerInsights() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [prevData, setPrevData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = (d, isRefresh = false) => {
    setLoading(true);
    setError(false);
    // Fetch current + previous period for trend comparison
    Promise.all([
      apiClient.get(`/discovery/influencer-insights?days=${d}`),
      apiClient.get(`/discovery/influencer-insights?days=${d * 2}`).catch(() => null),
    ])
      .then(([current, prev]) => {
        setData(current);
        setPrevData(prev);
        if (isRefresh) toast.success('Datos actualizados');
      })
      .catch(() => { setData(null); setError(true); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(days); }, [days]);

  const overview = data?.overview || {};
  const prevOverview = prevData?.overview || {};
  const topProducts = data?.top_products_driven || [];

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      {/* Header */}
      <div className="border-b border-stone-200 bg-white px-6 py-5">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-950">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-stone-950">Mis Insights</h1>
              <p className="text-sm text-stone-500">Impacto comercial de tu contenido</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-stone-200 bg-white p-1">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setDays(p.value)}
                  className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
                    days === p.value ? 'bg-stone-950 text-white' : 'text-stone-600 hover:text-stone-950'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => load(days, true)}
              disabled={loading}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 hover:text-stone-950 disabled:opacity-40"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-8 px-6 py-6">
        {/* KPIs */}
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
          <KpiCard
            icon={MousePointerClick}
            label="Clics en productos"
            value={overview.product_clicks ?? '—'}
            prevValue={prevOverview.product_clicks}
          />
          <KpiCard
            icon={ShoppingCart}
            label="Añadidos al carrito"
            value={overview.add_to_cart ?? '—'}
            prevValue={prevOverview.add_to_cart}
          />
          <KpiCard
            icon={TrendingUp}
            label="Compras generadas"
            value={overview.purchases ?? '—'}
            prevValue={prevOverview.purchases}
          />
          <KpiCard
            icon={BarChart3}
            label="Guardados"
            value={overview.saves ?? '—'}
            prevValue={prevOverview.saves}
          />
        </div>

        {/* Top products driven */}
        <div>
          <h2 className="mb-4 text-base font-semibold text-stone-950">
            Productos más impulsados por tu contenido
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 rounded-2xl border border-stone-200 bg-white animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-dashed border-stone-200 bg-white p-8 text-center">
              <p className="text-sm font-medium text-stone-950">Error de conexión</p>
              <p className="mt-1 text-sm text-stone-500 mb-3">
                No pudimos cargar tus datos. Comprueba tu conexión e inténtalo de nuevo.
              </p>
              <button
                onClick={() => load(days)}
                className="px-4 py-2 bg-stone-950 text-white rounded-xl text-sm font-medium hover:bg-stone-800 transition-colors"
              >
                Reintentar
              </button>
            </div>
          ) : topProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-200 bg-white p-8 text-center">
              <p className="text-sm font-medium text-stone-950">Aún no tienes datos</p>
              <p className="mt-1 text-sm text-stone-500">
                Cuando tu contenido impulse clics o compras aparecerá aquí.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div
                  key={p.product_id}
                  className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-4"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xs font-semibold text-stone-600">
                    {i + 1}
                  </span>
                  <img
                    src={p.image || '/placeholder-product.png'}
                    alt={p.name}
                    className="h-12 w-12 shrink-0 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-stone-950">{p.name}</p>
                    <p className="text-xs text-stone-500">{formatPrice(p.price)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-stone-950">{p.clicks}</p>
                    <p className="text-xs text-stone-500">clics</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info note */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 text-sm text-stone-500">
          Los datos muestran interacciones atribuidas a tu perfil de creador: clics en productos desde tu contenido, añadidos al carrito y compras completadas. Se actualiza en tiempo real.
        </div>
      </div>
    </div>
  );
}
