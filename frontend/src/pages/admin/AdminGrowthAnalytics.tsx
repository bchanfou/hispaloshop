// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, BarChart3, RefreshCw, ShoppingCart, TrendingUp, Users, Zap, AlertTriangle } from 'lucide-react';
import apiClient from '../../services/api/client';
import { useTranslation } from 'react-i18next';

const PERIODS = [
  { label: '7 días', value: 7 },
  { label: '30 días', value: 30 },
  { label: '90 días', value: 90 },
  { label: '12 meses', value: 365 },
];

function TrendBadge({ current, previous }) {
  if (previous == null || previous === 0 || current == null) return null;
  const pct = ((current - previous) / previous) * 100;
  const positive = pct >= 0;
  const Arrow = positive ? ArrowUp : ArrowDown;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${positive ? 'text-stone-950' : 'text-stone-400'}`}>
      <Arrow className="h-3 w-3" />
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function StatCard({ icon: Icon, label, value, sub, current, previous }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-stone-200 bg-white p-5">
      <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-2xl bg-stone-100">
        <Icon className="h-4.5 w-4.5 text-stone-700" />
      </div>
      <div className="flex items-end gap-2">
        <p className="text-2xl font-semibold text-stone-950">{value ?? '—'}</p>
        <div className="mb-0.5">
          <TrendBadge current={current} previous={previous} />
        </div>
      </div>
      <p className="text-sm font-medium text-stone-700">{label}</p>
      {sub ? <p className="text-xs text-stone-500">{sub}</p> : null}
    </div>
  );
}

function SectionTitle({ title }) {
  return (
    <h2 className="mb-4 text-base font-semibold text-stone-950">{title}</h2>
  );
}

function EmptyRow({ cols }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-8 text-center text-sm text-stone-400">
        Sin datos para este período
      </td>
    </tr>
  );
}

export default function AdminGrowthAnalytics() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [prevData, setPrevData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = (d) => {
    setLoading(true);
    setError(null);
    Promise.all([
      apiClient.get(`/discovery/growth-analytics?days=${d}`).catch(() => null),
      apiClient.get(`/discovery/growth-analytics?days=${d * 2}`).catch(() => null),
    ]).then(([current, prior]) => {
      if (!current && !prior) {
        setError(t('admin_growth_analytics.noSePudieronCargarLosDatosDeCreci', 'No se pudieron cargar los datos de crecimiento'));
      }
      setData(current);
      setPrevData(prior);
    }).catch(() => {
      setError(t('admin_growth_analytics.errorAlCargarLosDatos', 'Error al cargar los datos'));
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(days); }, [days]);

  const overview = data?.overview || {};
  const prevOverview = prevData?.overview || {};

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      {/* Header */}
      <div className="border-b border-stone-200 bg-white px-6 py-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-950">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-stone-950">Crecimiento</h1>
              <p className="text-sm text-stone-500">{t('admin_growth_analytics.analisisDeConversionYDescubrimiento', 'Análisis de conversión y descubrimiento')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-2xl border border-stone-200 bg-white p-1">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setDays(p.value)}
                  className={`rounded-2xl px-3 py-1.5 text-sm font-medium transition-colors ${
                    days === p.value
                      ? 'bg-stone-950 text-white'
                      : 'text-stone-600 hover:text-stone-950'
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

      <div className="mx-auto max-w-6xl space-y-8 px-6 py-6">
        {/* Error state */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-2xl border border-stone-200 bg-stone-50">
            <AlertTriangle className="w-5 h-5 text-stone-500 shrink-0" />
            <p className="text-sm text-stone-700 flex-1">{error}</p>
            <button onClick={() => load(days)} className="text-sm font-medium text-stone-950 hover:underline">Reintentar</button>
          </div>
        )}

        {/* Overview KPIs */}
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            icon={Zap}
            label="Interacciones totales"
            value={overview.total_interactions?.toLocaleString('es-ES') ?? '—'}
            sub={`Últimos ${days} días`}
            current={overview.total_interactions}
            previous={prevOverview.total_interactions != null ? Math.max(1, prevOverview.total_interactions - (overview.total_interactions ?? 0)) : null}
          />
          <StatCard
            icon={ShoppingCart}
            label="Carritos desde contenido"
            value={overview.content_driven_carts?.toLocaleString('es-ES') ?? '—'}
            sub="Atribuido a post o receta"
            current={overview.content_driven_carts}
            previous={prevOverview.content_driven_carts != null ? Math.max(1, prevOverview.content_driven_carts - (overview.content_driven_carts ?? 0)) : null}
          />
          <StatCard
            icon={TrendingUp}
            label="Compras desde contenido"
            value={overview.content_driven_purchases?.toLocaleString('es-ES') ?? '—'}
            sub=t('admin_growth_analytics.conversionDirecta', 'Conversión directa')
            current={overview.content_driven_purchases}
            previous={prevOverview.content_driven_purchases != null ? Math.max(1, prevOverview.content_driven_purchases - (overview.content_driven_purchases ?? 0)) : null}
          />
        </div>

        {/* Top converting content */}
        <div>
          <SectionTitle title={t('admin_growth_analytics.contenidoConMayorConversion', 'Contenido con mayor conversión')} />
          <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  <th className="px-4 py-3 text-left font-medium text-stone-500">{t('admin_growth_analytics.titulo', 'Título')}</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-500">Tipo</th>
                  <th className="px-4 py-3 text-right font-medium text-stone-500">Carritos</th>
                  <th className="px-4 py-3 text-right font-medium text-stone-500">Compras</th>
                  <th className="px-4 py-3 text-right font-medium text-stone-500">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-stone-400">
                      Cargando…
                    </td>
                  </tr>
                ) : (data?.top_converting_content || []).length === 0 ? (
                  <EmptyRow cols={5} />
                ) : (
                  (data?.top_converting_content || []).map((item, i) => (
                    <tr key={i} className="hover:bg-stone-50">
                      <td className="max-w-[200px] truncate px-4 py-3 font-medium text-stone-950">
                        {item.title}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          item.entity_type === 'recipe'
                            ? 'bg-stone-100 text-stone-700'
                            : 'bg-stone-950 text-white'
                        }`}>
                          {item.entity_type === 'recipe' ? 'Receta' : 'Post'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-stone-700">
                        {item.cart_adds}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-stone-700">
                        {item.purchases}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-stone-950">
                        {item.conversion_score}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top clicked products */}
        <div>
          <SectionTitle title={t('admin_growth_analytics.productosMasClicadosDesdeContenido', 'Productos más clicados desde contenido')} />
          <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
            <table className="w-full min-w-[500px] text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  <th className="px-4 py-3 text-left font-medium text-stone-500">Producto</th>
                  <th className="px-4 py-3 text-right font-medium text-stone-500">Clics</th>
                  <th className="px-4 py-3 text-right font-medium text-stone-500">Carritos</th>
                  <th className="px-4 py-3 text-right font-medium text-stone-500">Compras</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-stone-400">
                      Cargando…
                    </td>
                  </tr>
                ) : (data?.top_clicked_products || []).length === 0 ? (
                  <EmptyRow cols={4} />
                ) : (
                  (data?.top_clicked_products || []).map((item, i) => (
                    <tr key={i} className="hover:bg-stone-50">
                      <td className="max-w-[220px] truncate px-4 py-3 font-medium text-stone-950">
                        {item.name}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-stone-700">
                        {item.clicks}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-stone-700">
                        {item.cart_adds}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-stone-950">
                        {item.purchases}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Creator commerce impact */}
        <div>
          <SectionTitle title="Creadores con mayor impacto comercial" />
          <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
            <table className="w-full min-w-[500px] text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  <th className="px-4 py-3 text-left font-medium text-stone-500">Creador</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-500">Rol</th>
                  <th className="px-4 py-3 text-right font-medium text-stone-500">Compras generadas</th>
                  <th className="px-4 py-3 text-right font-medium text-stone-500">Impact score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-stone-400">
                      Cargando…
                    </td>
                  </tr>
                ) : (data?.creators_commerce_impact || []).length === 0 ? (
                  <EmptyRow cols={4} />
                ) : (
                  (data?.creators_commerce_impact || []).map((item, i) => (
                    <tr key={i} className="hover:bg-stone-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-stone-950">{item.name}</p>
                        {item.username && (
                          <p className="text-xs text-stone-500">@{item.username}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium capitalize text-stone-700">
                          {item.role === 'influencer' ? 'Influencer' : 'Productor'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-stone-700">
                        {item.purchases}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-stone-950">
                        {item.impact_score}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Platform note */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <div className="flex items-start gap-3">
            <Users className="mt-0.5 h-5 w-5 shrink-0 text-stone-400" />
            <div>
              <p className="text-sm font-medium text-stone-950">{t('admin_growth_analytics.sobreLosDatosDeCrecimiento', 'Sobre los datos de crecimiento')}</p>
              <p className="mt-1 text-sm text-stone-500">
                Los scores se calculan con pesos por tipo de interacción: vista (×1), guardado (×5), clic producto (×8), añadir al carrito (×12), compra (×20). Los datos se agregan en tiempo real desde <code className="rounded bg-stone-100 px-1 text-xs">growth_interactions</code>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
