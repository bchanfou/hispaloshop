// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Target, Loader2, ShoppingBag, ArrowUp, ArrowDown, Euro, Star } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid } from 'recharts';
import apiClient from '../../services/api/client';
import { useTranslation } from 'react-i18next';
import i18n from "../../locales/i18n";
import { trackEvent } from '../../utils/analytics';
function AnalyticsSection({
  title,
  icon: Icon,
  children
}) {
  return <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
      <h3 className="text-sm font-bold text-stone-950 mb-4 flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4" />}
        {title}
      </h3>
      {children}
    </div>;
}
function SalesSourcesChart({
  sources
}) {
  const data = [{
    name: 'Feed',
    value: sources?.feed || 0
  }, {
    name: 'Tienda',
    value: sources?.store || 0
  }, {
    name: 'David AI',
    value: sources?.hispal_ai || 0
  }, {
    name: 'Influencer',
    value: sources?.influencer || 0
  }, {
    name: 'Directo',
    value: sources?.direct || 0
  }].filter(d => d.value > 0);
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return <p className="text-sm text-stone-500 text-center py-4">{i18n.t('producer_analytics.sinDatosAun', 'Sin datos aún')}</p>;

  // Add percentage to each entry
  const chartData = data.map(d => ({
    ...d,
    pct: Math.round(d.value / total * 100)
  }));
  return <ResponsiveContainer width="100%" height={chartData.length * 44 + 16}>
      <BarChart data={chartData} layout="vertical" margin={{
      top: 4,
      right: 40,
      bottom: 4,
      left: 0
    }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={70} tick={{
        fill: '#78716c',
        fontSize: 12
      }} />
        <Tooltip cursor={{
        fill: 'rgba(245,245,244,0.6)'
      }} contentStyle={{
        backgroundColor: '#fff',
        borderRadius: 12,
        border: '1px solid #e7e5e4',
        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
        padding: '8px 12px',
        fontSize: 12
      }} formatter={(value, _name, props) => [`${props.payload.pct}% (${value})`, 'Ventas']} labelStyle={{
        fontWeight: 600,
        color: '#0c0a09'
      }} />
        <Bar dataKey="value" fill="#0c0a09" radius={[0, 6, 6, 0]} barSize={18} label={{
        position: 'right',
        fill: '#0c0a09',
        fontSize: 11,
        fontWeight: 700,
        formatter: v => `${Math.round(v / total * 100)}%`
      }} />
      </BarChart>
    </ResponsiveContainer>;
}
function RevenueTrendChart({
  trend
}) {
  if (!trend || !Array.isArray(trend) || trend.length < 2) return null;
  return <AnalyticsSection title="Tendencia de ingresos" icon={TrendingUp}>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={trend} margin={{
        top: 8,
        right: 12,
        bottom: 4,
        left: 0
      }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{
          fill: '#a8a29e',
          fontSize: 11
        }} />
          <YAxis axisLine={false} tickLine={false} tick={{
          fill: '#a8a29e',
          fontSize: 11
        }} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v} />
          <Tooltip contentStyle={{
          backgroundColor: '#fff',
          borderRadius: 12,
          border: '1px solid #e7e5e4',
          boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
          padding: '8px 12px',
          fontSize: 12
        }} formatter={value => [typeof value === 'number' ? value.toLocaleString('es-ES', {
          style: 'currency',
          currency: 'EUR'
        }) : value, 'Ingresos']} labelStyle={{
          fontWeight: 600,
          color: '#0c0a09'
        }} />
          <Line type="monotone" dataKey="revenue" stroke="#0c0a09" strokeWidth={2} dot={{
          fill: '#0c0a09',
          r: 3,
          strokeWidth: 0
        }} activeDot={{
          fill: '#0c0a09',
          r: 5,
          strokeWidth: 2,
          stroke: '#fff'
        }} />
        </LineChart>
      </ResponsiveContainer>
    </AnalyticsSection>;
}
export default function ProducerAnalytics() {
  const [period, setPeriod] = useState('30d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const fetchAnalytics = () => {
    setLoading(true);
    setError(false);
    apiClient.get(`/producer/analytics?period=${period}`).then(d => setData(d)).catch(() => {
      setData(null);
      setError(true);
    }).finally(() => setLoading(false));
  };
  useEffect(() => {
    fetchAnalytics();
    trackEvent('producer_analytics_viewed', { period });
  }, [period]);
  if (loading) {
    return <div className="max-w-[975px] mx-auto space-y-4 pt-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-8 w-36 animate-pulse bg-stone-100 rounded-2xl" />
          <div className="h-9 w-40 animate-pulse bg-stone-100 rounded-2xl" />
        </div>
        {/* Revenue + orders KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="bg-white rounded-2xl shadow-sm p-5 space-y-3 h-32">
              <div className="h-3 w-16 animate-pulse bg-stone-100 rounded-2xl" />
              <div className="h-7 w-24 animate-pulse bg-stone-100 rounded-2xl" />
              <div className="h-3 w-12 animate-pulse bg-stone-100 rounded-2xl" />
            </div>)}
        </div>
        {/* Chart skeleton */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <div className="h-4 w-32 animate-pulse bg-stone-100 rounded-2xl" />
          <div className="h-48 animate-pulse bg-stone-100 rounded-2xl" />
        </div>
        {/* Table skeleton */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <div className="h-4 w-40 animate-pulse bg-stone-100 rounded-2xl" />
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 shrink-0 animate-pulse bg-stone-100 rounded-2xl" />
              <div className="h-6 flex-1 animate-pulse bg-stone-100 rounded-2xl" />
              <div className="h-6 w-16 shrink-0 animate-pulse bg-stone-100 rounded-2xl" />
            </div>)}
        </div>
      </div>;
  }
  if (error) {
    return <div className="flex flex-col items-center justify-center py-20">
        <BarChart3 className="w-12 h-12 text-stone-300 mb-4" />
        <p className="text-stone-600 font-medium mb-2">{i18n.t('producer_analytics.errorAlCargarAnaliticas', 'Error al cargar analíticas')}</p>
        <p className="text-stone-500 text-sm mb-4">{i18n.t('producer_analytics.compruebaTuConexionEIntentaloDeNue', 'Comprueba tu conexión e inténtalo de nuevo.')}</p>
        <button type="button" onClick={fetchAnalytics} className="px-4 py-2 bg-stone-950 hover:bg-stone-800 text-white text-sm rounded-2xl transition-colors">
          Reintentar
        </button>
      </div>;
  }
  return <div className="max-w-[975px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-stone-950">{i18n.t('producer_analytics.analitica', 'Analítica')}</h1>
        <select value={period} onChange={e => { setPeriod(e.target.value); trackEvent('producer_analytics_period_changed', { period: e.target.value }); }} className="px-3 py-2 rounded-2xl border border-stone-200 bg-white text-sm text-stone-950 focus:outline-none focus:border-stone-400">
          <option value="7d">{i18n.t('producer.followerGrowth.last7Days', 'Últimos 7 días')}</option>
          <option value="30d">{i18n.t('producer.followerGrowth.last30Days', 'Últimos 30 días')}</option>
          <option value="90d">{i18n.t('producer.followerGrowth.last90Days', 'Últimos 90 días')}</option>
          <option value="365d">{i18n.t('producer_analytics.last365d', 'Ultimos 365 dias')}</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[{
        label: 'Ingresos',
        value: data?.revenue?.current != null ? data.revenue.current.toLocaleString('es-ES', {
          style: 'currency',
          currency: 'EUR'
        }) : '—',
        icon: Euro,
        trend: data?.revenue?.current != null && data?.revenue?.previous != null && data.revenue.previous > 0 ? (data.revenue.current - data.revenue.previous) / data.revenue.previous * 100 : null
      }, {
        label: 'Pedidos',
        value: data?.orders_count?.current ?? data?.conversion?.purchases ?? '—',
        icon: ShoppingBag,
        trend: data?.orders_count?.current != null && data?.orders_count?.previous != null && data.orders_count.previous > 0 ? (data.orders_count.current - data.orders_count.previous) / data.orders_count.previous * 100 : null
      }, {
        label: 'Ticket medio',
        value: data?.avg_ticket?.current != null ? data.avg_ticket.current.toLocaleString('es-ES', {
          style: 'currency',
          currency: 'EUR'
        }) : data?.revenue?.current != null && (data?.orders_count?.current || data?.conversion?.purchases) ? (data.revenue.current / (data.orders_count?.current || data.conversion.purchases || 1)).toLocaleString('es-ES', {
          style: 'currency',
          currency: 'EUR'
        }) : '—',
        icon: Target,
        trend: data?.avg_ticket?.current != null && data?.avg_ticket?.previous != null && data.avg_ticket.previous > 0 ? (data.avg_ticket.current - data.avg_ticket.previous) / data.avg_ticket.previous * 100 : null
      }, {
        label: 'Rating',
        value: data?.rating?.current != null ? data.rating.current.toFixed(1) : '—',
        icon: Star,
        trend: data?.rating?.current != null && data?.rating?.previous != null && data.rating.previous > 0 ? (data.rating.current - data.rating.previous) / data.rating.previous * 100 : null
      }].map(kpi => {
        const hasData = kpi.value !== '—';
        return <div key={kpi.label} className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-xl bg-stone-100">
                  <kpi.icon className="w-3.5 h-3.5 text-stone-600" />
                </div>
                <span className="text-xs text-stone-500">{kpi.label}</span>
              </div>
              {hasData ? <div className="flex items-end gap-2">
                  <p className="text-xl font-bold text-stone-950 tracking-tight">{kpi.value}</p>
                  {kpi.trend !== null && kpi.trend !== 0 && <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold mb-0.5 ${kpi.trend > 0 ? 'text-stone-950' : 'text-stone-500'}`}>
                      {kpi.trend > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                      {Math.abs(kpi.trend).toFixed(1)}%
                    </span>}
                </div> : <p className="text-sm text-stone-400">Datos insuficientes</p>}
            </div>;
      })}
      </div>

      {/* Todos los productos vendidos */}
      <AnalyticsSection title={i18n.t('producer_analytics.productosMasVendidos', 'Productos más vendidos')} icon={ShoppingBag}>
        {data?.top_products?.length ? <div className="space-y-0">
            {data.top_products.map((product, i) => <div key={product.product_id || i} className="flex items-center gap-3 py-2.5 border-b border-stone-100 last:border-0">
                <span className="text-sm font-bold text-stone-400 w-6 text-center shrink-0">
                  {i + 1}
                </span>
                {product.image ? <img loading="lazy" src={product.image} alt="" className="w-10 h-10 rounded-2xl object-cover shrink-0" /> : <div className="w-10 h-10 rounded-2xl bg-stone-100 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-950 truncate">{product.name}</p>
                  <p className="text-xs text-stone-500">{product.units_sold ?? 0} unidades vendidas</p>
                </div>
                <p className="text-sm font-bold text-stone-950 shrink-0">
                  {(product.revenue || 0).toLocaleString('es-ES', {
              style: 'currency',
              currency: 'EUR'
            })}
                </p>
              </div>)}
          </div> : <p className="text-sm text-stone-500 text-center py-4">{i18n.t('producer_analytics.sinDatosAun', 'Sin datos aún')}</p>}
      </AnalyticsSection>

      {/* Sales sources */}
      <AnalyticsSection title={i18n.t('producer_analytics.deDondeVienenTusVentas', '¿De dónde vienen tus ventas?')} icon={BarChart3}>
        <SalesSourcesChart sources={data?.sales_sources} />
      </AnalyticsSection>

      {/* Revenue trend */}
      <RevenueTrendChart trend={data?.revenue_trend} />

      {/* Followers */}
      <AnalyticsSection title={i18n.t('producer_analytics.seguidoresDeLaTienda', 'Seguidores de la tienda')} icon={Users}>
        <div className="flex items-end gap-4">
          <div>
            <p className="text-3xl font-extrabold text-stone-950 tracking-tight">
              {data?.followers?.current || 0}
            </p>
            <p className="text-xs text-stone-500">seguidores totales</p>
          </div>
          {(data?.followers?.delta || 0) > 0 && <p className="text-sm font-semibold text-stone-700 mb-1">
              +{data.followers.delta} este período
            </p>}
        </div>
      </AnalyticsSection>

      {/* Conversion */}
      <AnalyticsSection title={i18n.t('producer_analytics.tasaDeConversion', 'Tasa de conversion')} icon={Target}>
        <div className="grid grid-cols-3 gap-3 mb-3">
          {[{
          label: 'Visitas tienda',
          value: data?.conversion?.store_visits || 0
        }, {
          label: i18n.t('producer_analytics.anadidosAlCarrito', 'Anadidos al carrito'),
          value: data?.conversion?.cart_adds || 0
        }, {
          label: 'Compras',
          value: data?.conversion?.purchases || 0
        }].map(stat => <div key={stat.label} className="bg-stone-50 rounded-2xl p-3 text-center">
              <p className="text-xl font-bold text-stone-950">{stat.value}</p>
              <p className="text-[10px] text-stone-500 uppercase">{stat.label}</p>
            </div>)}
        </div>
        {(data?.conversion?.rate || 0) > 0 && <p className="text-sm text-stone-600 text-center">
            Tasa de conversion: <strong className="text-stone-950">{(data.conversion.rate * 100).toFixed(1)}%</strong>
          </p>}
      </AnalyticsSection>

      {/* 2-col grid: Geography + Customers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Customer Geography */}
        <AnalyticsSection title={i18n.t('producer_analytics.customerGeography', 'Geografia de clientes')} icon={Target}>
          {data?.customer_geography?.length ? (
            <div className="space-y-2">
              {data.customer_geography.map((geo) => {
                const flags = { ES: '\uD83C\uDDEA\uD83C\uDDF8', KR: '\uD83C\uDDF0\uD83C\uDDF7', US: '\uD83C\uDDFA\uD83C\uDDF8', FR: '\uD83C\uDDEB\uD83C\uDDF7', DE: '\uD83C\uDDE9\uD83C\uDDEA', IT: '\uD83C\uDDEE\uD83C\uDDF9', PT: '\uD83C\uDDF5\uD83C\uDDF9', GB: '\uD83C\uDDEC\uD83C\uDDE7' };
                return (
                  <div key={geo.country} className="flex items-center gap-3">
                    <span className="text-sm">{flags[geo.country] || geo.country}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-stone-700">{geo.country}</span>
                        <span className="text-stone-500">{geo.pct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                        <div className="h-full bg-stone-950 rounded-full" style={{ width: `${geo.pct}%` }} />
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-stone-950 shrink-0">{geo.revenue.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-stone-500 text-center py-4">{i18n.t('producer_analytics.sinDatosAun', 'Sin datos aun')}</p>
          )}
        </AnalyticsSection>

        {/* Customer Stats */}
        <AnalyticsSection title={i18n.t('producer_analytics.customerStats', 'Clientes')} icon={Users}>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-stone-50 rounded-2xl p-3 text-center">
              <p className="text-xl font-bold text-stone-950">{data?.customers?.total || 0}</p>
              <p className="text-[10px] text-stone-500 uppercase">Total</p>
            </div>
            <div className="bg-stone-50 rounded-2xl p-3 text-center">
              <p className="text-xl font-bold text-stone-950">{data?.customers?.new || 0}</p>
              <p className="text-[10px] text-stone-500 uppercase">Nuevos</p>
            </div>
            <div className="bg-stone-50 rounded-2xl p-3 text-center">
              <p className="text-xl font-bold text-stone-950">{data?.customers?.returning || 0}</p>
              <p className="text-[10px] text-stone-500 uppercase">Recurrentes</p>
            </div>
          </div>
          {(data?.customers?.total || 0) > 0 && (
            <p className="text-sm text-stone-600 text-center mt-3">
              Tasa de recompra: <strong className="text-stone-950">
                {Math.round((data.customers.returning / data.customers.total) * 100)}%
              </strong>
            </p>
          )}
        </AnalyticsSection>
      </div>

      {/* Health Score link (PRO+ gated) */}
      <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-stone-950">{i18n.t('producer_analytics.healthScore', 'Health Score')}</p>
          <p className="text-xs text-stone-500">{i18n.t('producer_analytics.healthScoreDesc', 'Puntuacion de salud de tu tienda con sugerencias accionables.')}</p>
        </div>
        <a href="/producer" className="text-xs font-semibold text-stone-950 hover:underline shrink-0">
          Ver en Overview →
        </a>
      </div>
    </div>;
}