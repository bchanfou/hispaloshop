// @ts-nocheck
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, MousePointerClick, RefreshCw, ShoppingCart, TrendingUp, TrendingDown, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../services/api/client';
import { useLocale } from '../../context/LocaleContext';

const PERIODS = [
  { label: '7 días', value: 7 },
  { label: '30 días', value: 30 },
  { label: '90 días', value: 90 },
];

function KpiCard({ icon: Icon, label, value, prevValue }) {
  const change = (prevValue != null && prevValue > 0 && value != null && value !== '—')
    ? ((Number(value) - prevValue) / prevValue * 100)
    : null;

  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-stone-200 bg-white p-5">
      <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-2xl bg-stone-100">
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

function RevenueChart({ dailyEarnings, days }) {
  const bars = useMemo(() => {
    if (!Array.isArray(dailyEarnings) || dailyEarnings.length === 0) return [];
    // Take last N entries matching period
    const count = days <= 7 ? 7 : 30;
    const slice = dailyEarnings.slice(-count);
    return slice;
  }, [dailyEarnings, days]);

  const maxVal = useMemo(() => Math.max(...bars.map(b => b.amount || 0), 1), [bars]);

  if (bars.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-200 bg-white p-8 text-center">
        <p className="text-sm text-stone-500">Sin datos suficientes para mostrar gráfico</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-stone-950 mb-3">Ingresos diarios</h3>
      <div className="flex items-end gap-1 h-[120px]">
        {bars.map((bar, i) => {
          const h = maxVal > 0 ? ((bar.amount || 0) / maxVal) * 100 : 0;
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
              <div
                className="w-full bg-stone-950 rounded-t min-h-[2px]"
                style={{ height: `${Math.max(h, 2)}%` }}
                title={`${(bar.amount || 0).toFixed(2)}€`}
              />
              {bars.length <= 7 && (
                <span className="text-[9px] text-stone-400 mt-1 truncate w-full text-center">
                  {bar.label || bar.date || ''}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {bars.length > 7 && (
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-stone-400">{bars[0]?.label || bars[0]?.date || ''}</span>
          <span className="text-[9px] text-stone-400">{bars[bars.length - 1]?.label || bars[bars.length - 1]?.date || ''}</span>
        </div>
      )}
    </div>
  );
}

export default function InfluencerInsights() {
  const navigate = useNavigate();
  const { convertAndFormatPrice } = useLocale();
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [prevData, setPrevData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback((d, isRefresh = false) => {
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
  }, []);

  useEffect(() => { load(days); }, [days, load]);

  const overview = data?.overview || {};
  const prevOverview = prevData?.overview || {};
  const topProducts = Array.isArray(data?.top_products_driven) ? data.top_products_driven : [];
  const dailyEarnings = Array.isArray(data?.daily_earnings) ? data.daily_earnings : [];

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      {/* Header */}
      <div className="border-b border-stone-200 bg-white px-6 py-5">
        <div className="mx-auto flex max-w-[975px] items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-950">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-stone-950">Mis Insights</h1>
              <p className="text-sm text-stone-500">Impacto comercial de tu contenido</p>
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
              onClick={() => load(days, true)}
              disabled={loading}
              className="flex h-9 w-9 items-center justify-center rounded-2xl border border-stone-200 bg-white text-stone-600 hover:text-stone-950 disabled:opacity-40"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[975px] space-y-8 px-6 py-6">
        {/* KPIs */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
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

        {/* Revenue mini-chart */}
        {!loading && !error && (
          <RevenueChart dailyEarnings={dailyEarnings} days={days} />
        )}

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
                className="px-4 py-2 bg-stone-950 text-white rounded-2xl text-sm font-medium hover:bg-stone-800 transition-colors"
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
                  onClick={() => navigate(`/influencer/affiliate-links?product=${p.product_id}`)}
                  className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-4 cursor-pointer hover:border-stone-300 transition-colors"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xs font-semibold text-stone-600">
                    {i + 1}
                  </span>
                  <img
                    src={p.image || '/placeholder-product.png'}
                    alt={p.name}
                    className="h-12 w-12 shrink-0 rounded-2xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-stone-950">{p.name}</p>
                    <p className="text-xs text-stone-500">{convertAndFormatPrice(Number(p.price || 0))}</p>
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
