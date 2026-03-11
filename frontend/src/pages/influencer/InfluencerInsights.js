import React, { useEffect, useState } from 'react';
import { BarChart3, MousePointerClick, RefreshCw, ShoppingCart, TrendingUp } from 'lucide-react';
import axios from 'axios';
import { API } from '../../utils/api';

const PERIODS = [
  { label: '7 días', value: 7 },
  { label: '30 días', value: 30 },
  { label: '90 días', value: 90 },
];

const formatPrice = (v) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(Number(v) || 0);

function KpiCard({ icon: Icon, label, value }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-stone-200 bg-white p-5">
      <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100">
        <Icon className="h-4 w-4 text-stone-700" />
      </div>
      <p className="text-2xl font-semibold text-stone-950">{value}</p>
      <p className="text-sm text-stone-600">{label}</p>
    </div>
  );
}

export default function InfluencerInsights() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = (d) => {
    setLoading(true);
    axios
      .get(`${API}/discovery/influencer-insights?days=${d}`, { withCredentials: true })
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(days); }, [days]);

  const overview = data?.overview || {};
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
              <h1 className="font-body text-xl font-semibold text-stone-950">Mis Insights</h1>
              <p className="text-sm text-stone-500">Impacto comercial de tu contenido</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-stone-200 bg-white p-1">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setDays(p.value)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    days === p.value ? 'bg-stone-950 text-white' : 'text-stone-600 hover:text-stone-950'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => load(days)}
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
          />
          <KpiCard
            icon={ShoppingCart}
            label="Añadidos al carrito"
            value={overview.add_to_cart ?? '—'}
          />
          <KpiCard
            icon={TrendingUp}
            label="Compras generadas"
            value={overview.purchases ?? '—'}
          />
          <KpiCard
            icon={BarChart3}
            label="Guardados"
            value={overview.saves ?? '—'}
          />
        </div>

        {/* Top products driven */}
        <div>
          <h2 className="mb-4 font-body text-base font-semibold text-stone-950">
            Productos más impulsados por tu contenido
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 rounded-2xl border border-stone-200 bg-white animate-pulse" />
              ))}
            </div>
          ) : topProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center">
              <p className="text-sm font-medium text-stone-950">Sin datos todavía</p>
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
