// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Target, Loader2, ShoppingBag, ArrowUp, ArrowDown, Euro, Star } from 'lucide-react';
import apiClient from '../../services/api/client';

function AnalyticsSection({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
      <h3 className="text-sm font-bold text-stone-950 mb-4 flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4" />}
        {title}
      </h3>
      {children}
    </div>
  );
}

function SalesSourcesChart({ sources }) {
  const data = [
    { name: 'Feed', value: sources?.feed || 0, color: '#57534e' },
    { name: 'Tienda', value: sources?.store || 0, color: '#78716c' },
    { name: 'David AI', value: sources?.hispal_ai || 0, color: '#44403c' },
    { name: 'Influencer', value: sources?.influencer || 0, color: '#a8a29e' },
    { name: 'Directo', value: sources?.direct || 0, color: '#d6d3d1' },
  ].filter(d => d.value > 0);

  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return <p className="text-sm text-stone-500 text-center py-4">Sin datos aún</p>;

  return (
    <div className="space-y-2.5">
      {data.map(source => (
        <div key={source.name} className="flex items-center gap-3">
          <span className="text-xs text-stone-600 w-16 shrink-0">{source.name}</span>
          <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(source.value / total) * 100}%`, backgroundColor: source.color }}
            />
          </div>
          <span className="text-xs font-bold text-stone-950 w-8 text-right shrink-0">
            {Math.round((source.value / total) * 100)}%
          </span>
        </div>
      ))}
    </div>
  );
}

export default function ProducerAnalytics() {
  const [period, setPeriod] = useState('30d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchAnalytics = () => {
    setLoading(true);
    setError(false);
    apiClient.get(`/producer/analytics?period=${period}`)
      .then(d => setData(d))
      .catch(() => { setData(null); setError(true); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  if (loading) {
    return (
      <div className="max-w-[975px] mx-auto space-y-4 pt-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-8 w-36 animate-pulse bg-stone-100 rounded-2xl" />
          <div className="h-9 w-40 animate-pulse bg-stone-100 rounded-2xl" />
        </div>
        {/* Revenue + orders KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-2xl shadow-sm p-5 space-y-3 h-32">
              <div className="h-3 w-16 animate-pulse bg-stone-100 rounded-2xl" />
              <div className="h-7 w-24 animate-pulse bg-stone-100 rounded-2xl" />
              <div className="h-3 w-12 animate-pulse bg-stone-100 rounded-2xl" />
            </div>
          ))}
        </div>
        {/* Chart skeleton */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <div className="h-4 w-32 animate-pulse bg-stone-100 rounded-2xl" />
          <div className="h-48 animate-pulse bg-stone-100 rounded-2xl" />
        </div>
        {/* Table skeleton */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <div className="h-4 w-40 animate-pulse bg-stone-100 rounded-2xl" />
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 shrink-0 animate-pulse bg-stone-100 rounded-2xl" />
              <div className="h-6 flex-1 animate-pulse bg-stone-100 rounded-2xl" />
              <div className="h-6 w-16 shrink-0 animate-pulse bg-stone-100 rounded-2xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <BarChart3 className="w-12 h-12 text-stone-300 mb-4" />
        <p className="text-stone-600 font-medium mb-2">Error al cargar analíticas</p>
        <p className="text-stone-500 text-sm mb-4">Comprueba tu conexión e inténtalo de nuevo.</p>
        <button
          type="button"
          onClick={fetchAnalytics}
          className="px-4 py-2 bg-stone-950 hover:bg-stone-800 text-white text-sm rounded-2xl transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[975px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-stone-950">Analítica</h1>
        <select
          value={period}
          onChange={e => setPeriod(e.target.value)}
          className="px-3 py-2 rounded-2xl border border-stone-200 bg-white text-sm text-stone-950 focus:outline-none focus:border-stone-400"
        >
          <option value="7d">Últimos 7 días</option>
          <option value="30d">Últimos 30 días</option>
          <option value="90d">Últimos 90 días</option>
          <option value="12m">Últimos 12 meses</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          {
            label: 'Ingresos',
            value: data?.revenue?.current != null
              ? data.revenue.current.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
              : '—',
            icon: Euro,
            trend: data?.revenue?.current != null && data?.revenue?.previous != null && data.revenue.previous > 0
              ? ((data.revenue.current - data.revenue.previous) / data.revenue.previous) * 100
              : null,
          },
          {
            label: 'Pedidos',
            value: data?.orders_count?.current ?? data?.conversion?.purchases ?? '—',
            icon: ShoppingBag,
            trend: data?.orders_count?.current != null && data?.orders_count?.previous != null && data.orders_count.previous > 0
              ? ((data.orders_count.current - data.orders_count.previous) / data.orders_count.previous) * 100
              : null,
          },
          {
            label: 'Ticket medio',
            value: data?.avg_ticket?.current != null
              ? data.avg_ticket.current.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
              : data?.revenue?.current != null && (data?.orders_count?.current || data?.conversion?.purchases)
                ? (data.revenue.current / (data.orders_count?.current || data.conversion.purchases || 1)).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
                : '—',
            icon: Target,
            trend: data?.avg_ticket?.current != null && data?.avg_ticket?.previous != null && data.avg_ticket.previous > 0
              ? ((data.avg_ticket.current - data.avg_ticket.previous) / data.avg_ticket.previous) * 100
              : null,
          },
          {
            label: 'Rating',
            value: data?.rating?.current != null ? data.rating.current.toFixed(1) : '—',
            icon: Star,
            trend: data?.rating?.current != null && data?.rating?.previous != null && data.rating.previous > 0
              ? ((data.rating.current - data.rating.previous) / data.rating.previous) * 100
              : null,
          },
        ].map((kpi) => {
          const hasData = kpi.value !== '—';
          return (
            <div key={kpi.label} className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-xl bg-stone-100">
                  <kpi.icon className="w-3.5 h-3.5 text-stone-600" />
                </div>
                <span className="text-xs text-stone-500">{kpi.label}</span>
              </div>
              {hasData ? (
                <div className="flex items-end gap-2">
                  <p className="text-xl font-bold text-stone-950 tracking-tight">{kpi.value}</p>
                  {kpi.trend !== null && kpi.trend !== 0 && (
                    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold mb-0.5 ${kpi.trend > 0 ? 'text-stone-950' : 'text-stone-500'}`}>
                      {kpi.trend > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                      {Math.abs(kpi.trend).toFixed(1)}%
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-sm text-stone-400">Datos insuficientes</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Top 5 productos */}
      <AnalyticsSection title="Top 5 productos" icon={ShoppingBag}>
        {data?.top_products?.length ? (
          <div className="space-y-0">
            {data.top_products.slice(0, 5).map((product, i) => (
              <div key={product.product_id || i} className="flex items-center gap-3 py-2.5 border-b border-stone-100 last:border-0">
                <span className="text-lg font-bold text-stone-300 w-6 text-center shrink-0">
                  {i === 0 ? '1' : i === 1 ? '2' : i === 2 ? '3' : i === 3 ? '4' : '5'}
                </span>
                {product.image ? (
                  <img loading="lazy" src={product.image} alt="" className="w-10 h-10 rounded-2xl object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-2xl bg-stone-100 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-950 truncate">{product.name}</p>
                  <p className="text-xs text-stone-500">{product.units_sold ?? 0} uds.</p>
                </div>
                <p className="text-sm font-bold text-stone-950 shrink-0">
                  {(product.revenue || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-stone-400 text-center py-4">Datos insuficientes</p>
        )}
      </AnalyticsSection>

      {/* Todos los productos vendidos */}
      <AnalyticsSection title="Productos más vendidos" icon={ShoppingBag}>
        {data?.top_products?.length ? (
          <div className="space-y-0">
            {data.top_products.map((product, i) => (
              <div key={product.product_id || i} className="flex items-center gap-3 py-2.5 border-b border-stone-100 last:border-0">
                <span className="text-lg font-bold text-stone-300 w-6 text-center shrink-0">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                </span>
                {product.image ? (
                  <img loading="lazy" src={product.image} alt="" className="w-10 h-10 rounded-2xl object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-2xl bg-stone-100 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-950 truncate">{product.name}</p>
                  <p className="text-xs text-stone-500">{product.units_sold} unidades vendidas</p>
                </div>
                <p className="text-sm font-bold text-stone-950 shrink-0">
                  {(product.revenue || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-stone-500 text-center py-4">Sin datos aún</p>
        )}
      </AnalyticsSection>

      {/* Sales sources */}
      <AnalyticsSection title="¿De dónde vienen tus ventas?" icon={BarChart3}>
        <SalesSourcesChart sources={data?.sales_sources} />
      </AnalyticsSection>

      {/* Followers */}
      <AnalyticsSection title="Seguidores de la tienda" icon={Users}>
        <div className="flex items-end gap-4">
          <div>
            <p className="text-3xl font-extrabold text-stone-950 tracking-tight">
              {data?.followers?.current || 0}
            </p>
            <p className="text-xs text-stone-500">seguidores totales</p>
          </div>
          {(data?.followers?.delta || 0) > 0 && (
            <p className="text-sm font-semibold text-stone-700 mb-1">
              +{data.followers.delta} este período
            </p>
          )}
        </div>
      </AnalyticsSection>

      {/* Conversion */}
      <AnalyticsSection title="Tasa de conversión" icon={Target}>
        <div className="grid grid-cols-3 gap-3 mb-3">
          {[
            { label: 'Visitas tienda', value: data?.conversion?.store_visits || 0 },
            { label: 'Añadidos al carrito', value: data?.conversion?.cart_adds || 0 },
            { label: 'Compras', value: data?.conversion?.purchases || 0 },
          ].map(stat => (
            <div key={stat.label} className="bg-stone-50 rounded-2xl p-3 text-center">
              <p className="text-xl font-bold text-stone-950">{stat.value}</p>
              <p className="text-[10px] text-stone-500 uppercase">{stat.label}</p>
            </div>
          ))}
        </div>
        {(data?.conversion?.rate || 0) > 0 && (
          <p className="text-sm text-stone-600 text-center">
            Tasa de conversión: <strong className="text-stone-950">{(data.conversion.rate * 100).toFixed(1)}%</strong>
          </p>
        )}
      </AnalyticsSection>
    </div>
  );
}
