// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { BarChart3, ChefHat, MousePointerClick, RefreshCw, ShoppingBag, ShoppingCart, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/api/client';
import { useTranslation } from 'react-i18next';

const PERIODS = [
  { label: '7 días', value: 7 },
  { label: '30 días', value: 30 },
  { label: '90 días', value: 90 },
];

const formatPrice = (v) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(Number(v) || 0);

function KpiCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl shadow-sm bg-white p-5">
      <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-2xl bg-stone-100">
        <Icon className="h-4 w-4 text-stone-700" />
      </div>
      <p className="text-2xl font-semibold text-stone-950">{value}</p>
      <p className="text-sm text-stone-600">{label}</p>
      {sub ? <p className="text-xs text-stone-500">{sub}</p> : null}
    </div>
  );
}

export default function ProducerInsights() {
  const navigate = useNavigate();
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = (d) => {
    setLoading(true);
    apiClient
      .get(`/discovery/producer-insights?days=${d}`)
      .then((data) => setData(data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(days); }, [days]);

  const overview = data?.overview || {};
  const products = data?.products || [];
  const recipes = data?.recipes_featuring || [];

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      {/* Header */}
      <div className="border-b border-stone-200 bg-white px-6 py-5">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-950">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-stone-950">Insights de producto</h1>
              <p className="text-sm text-stone-500">{t('producer_insights.descubrimientoYConversionDeTuCatalo', 'Descubrimiento y conversión de tu catálogo')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-2xl border border-stone-200 bg-white p-1">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setDays(p.value)}
                  className={`rounded-2xl px-3 py-1.5 text-sm font-medium transition-colors ${
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
              className="flex h-9 w-9 items-center justify-center rounded-2xl border border-stone-200 bg-white text-stone-600 hover:text-stone-950 disabled:opacity-40"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-8 px-6 py-6">
        {/* KPIs */}
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
          <KpiCard icon={TrendingUp} label="Vistas totales" value={overview.total_views ?? '—'} />
          <KpiCard icon={MousePointerClick} label="Clics en producto" value={overview.total_clicks ?? '—'} />
          <KpiCard icon={ShoppingCart} label="Compras" value={overview.total_purchases ?? '—'} />
          <KpiCard
            icon={BarChart3}
            label={t('producer_insights.conversionDesdeContenido', 'Conversión desde contenido')}
            value={overview.content_conversion_rate != null ? `${overview.content_conversion_rate}%` : '—'}
            sub="Clics / vistas"
          />
        </div>

        {/* Products table */}
        <div>
          <h2 className="mb-4 text-base font-semibold text-stone-950">
            Rendimiento por producto
          </h2>
          <div className="overflow-hidden rounded-2xl shadow-sm bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  <th className="px-4 py-3 text-left font-medium text-stone-500">Producto</th>
                  <th className="px-4 py-3 text-right font-medium text-stone-500">Vistas</th>
                  <th className="px-4 py-3 text-right font-medium text-stone-500">Clics</th>
                  <th className="px-4 py-3 text-right font-medium text-stone-500">Carrito</th>
                  <th className="px-4 py-3 text-right font-medium text-stone-500">Compras</th>
                  <th className="px-4 py-3 text-right font-medium text-stone-500">Desde contenido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-stone-400">Cargando…</td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-stone-400">
                      Sin datos para este período
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.product_id} className="hover:bg-stone-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.image || '/placeholder-product.png'}
                            alt={p.name}
                            className="h-9 w-9 shrink-0 rounded-2xl object-cover"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-stone-950 max-w-[160px]">
                              {p.name}
                            </p>
                            <p className="text-xs text-stone-500">{formatPrice(p.price)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-stone-700">{p.views}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-stone-700">{p.clicks}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-stone-700">{p.cart_adds}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-stone-950">{p.purchases}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-stone-600">{p.content_driven}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recipes featuring products */}
        {recipes.length > 0 && (
          <div>
            <h2 className="mb-4 text-base font-semibold text-stone-950">
              Recetas que usan tus productos
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recipes.map((r) => (
                <button
                  key={r.id}
                  onClick={() => navigate(`/recipes/${r.id}`)}
                  className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4 text-left shadow-sm hover:shadow-md transition-shadow"
                >
                  {r.image ? (
                    <img
                      src={r.image}
                      alt={r.name}
                      className="h-12 w-12 shrink-0 rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-stone-100">
                      <ChefHat className="h-5 w-5 text-stone-400" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-stone-950">{r.name}</p>
                    <p className="text-xs text-stone-500">Por {r.author || 'Autor'}</p>
                    {r.saves_count ? (
                      <p className="mt-0.5 text-xs text-stone-500">{r.saves_count} guardados</p>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty recipes state */}
        {!loading && recipes.length === 0 && (
          <div className="rounded-2xl border border-dashed border-stone-200 bg-white p-8 text-center">
            <ChefHat className="mx-auto mb-3 h-8 w-8 text-stone-300" />
            <p className="text-sm font-medium text-stone-950">{t('producer_insights.todaviaNoHayRecetasConTusProductos', 'Todavía no hay recetas con tus productos')}</p>
            <p className="mt-1 text-sm text-stone-500">
              Cuando creadores compartan recetas usando tus ingredientes, aparecerán aquí.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
