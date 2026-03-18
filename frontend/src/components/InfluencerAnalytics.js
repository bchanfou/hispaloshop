import React, { useState, useEffect } from 'react';
import {
  TrendingUp, MousePointer, ShoppingCart, DollarSign,
  Percent, Loader2, BarChart3, Calendar
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

import apiClient from '../services/api/client';

function StatCard({ icon: Icon, title, value, subtitle, color = "text-stone-950" }) {
  return (
    <div className="bg-white rounded-xl border border-stone-200">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-stone-500">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            {subtitle && <p className="text-xs text-stone-500 mt-1">{subtitle}</p>}
          </div>
          <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center">
            <Icon className="w-5 h-5 text-stone-950" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InfluencerAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get(`/influencer/analytics?days=${period}`);
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-stone-500" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-white rounded-xl border border-stone-200">
        <div className="p-4">
          <div className="py-12 text-center">
            <BarChart3 className="w-12 h-12 text-stone-300 mx-auto mb-4" />
            <p className="text-stone-500">No hay datos de analytics disponibles</p>
          </div>
        </div>
      </div>
    );
  }

  const { chart_data, summary, discount_code, referral_link } = analytics;
  const effectiveRate = summary?.total_revenue > 0
    ? ((summary.total_commission / summary.total_revenue) * 100)
    : 0;
  const effectiveRateLabel = `${effectiveRate.toFixed(2)}% sobre ventas`;

  // Copy referral link
  const copyReferralLink = () => {
    const fullLink = `${window.location.origin}${referral_link}`;
    navigator.clipboard.writeText(fullLink);
  };

  // Format chart data for display
  const formattedChartData = chart_data.map(d => ({
    ...d,
    date: new Date(d.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }));

  return (
    <div className="space-y-6" data-testid="influencer-analytics">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-semibold text-stone-950">
            Analytics de tu Código
          </h2>
          {discount_code && (
            <p className="text-sm text-stone-500 mt-1">
              Código: <span className="font-mono font-bold">{discount_code}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-stone-500" />
          <select
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
            className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-950 focus:outline-none focus:border-stone-950 text-sm"
          >
            <option value={7}>Últimos 7 días</option>
            <option value={30}>Últimos 30 días</option>
            <option value={90}>Últimos 90 días</option>
          </select>
        </div>
      </div>

      {/* Referral Link Card */}
      {referral_link && (
        <div className="bg-stone-50 rounded-xl border border-stone-200">
          <div className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-sm font-medium text-stone-950 mb-1">Tu enlace de referido</p>
                <p className="font-mono text-stone-700 bg-white px-3 py-1.5 rounded border border-stone-200 text-sm">
                  {window.location.origin}{referral_link}
                </p>
              </div>
              <button
                onClick={copyReferralLink}
                className="px-4 py-2 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white rounded-xl transition-colors"
              >
                Copiar enlace
              </button>
            </div>
            <p className="text-xs text-stone-500 mt-2">
              Comparte este enlace en tus redes. Cada visita se trackea automáticamente.
            </p>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <StatCard
          icon={MousePointer}
          title="Clics en enlace"
          value={summary.total_link_clicks || 0}
          subtitle="Visitas al enlace"
        />
        <StatCard
          icon={ShoppingCart}
          title="Usos del código"
          value={summary.total_code_uses || 0}
          subtitle="Código aplicado"
        />
        <StatCard
          icon={ShoppingCart}
          title="Conversiones"
          value={summary.total_conversions}
          subtitle="Compras completadas"
        />
        <StatCard
          icon={Percent}
          title="Tasa clic→compra"
          value={`${summary.click_to_order_rate || 0}%`}
          color="text-stone-950"
        />
        <StatCard
          icon={TrendingUp}
          title="Ventas generadas"
          value={`€${summary.total_revenue.toFixed(0)}`}
          subtitle={`${summary.all_time_orders} totales`}
        />
        <StatCard
          icon={DollarSign}
          title="Comisiones"
          value={`€${summary.total_commission.toFixed(2)}`}
          color="text-stone-950"
          subtitle={effectiveRateLabel}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversions Chart */}
        <div className="bg-white rounded-xl border border-stone-200">
          <div className="p-4 pb-0">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-stone-400" />
              Clics de Enlace vs Conversiones
            </h3>
          </div>
          <div className="p-4">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={formattedChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E6DFD6" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E6DFD6',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="link_clicks" fill="#1c1917" name="Clics Enlace" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="code_uses" fill="#78716c" name="Usos Código" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="conversions" fill="#a8a29e" name="Conversiones" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Revenue & Commission Chart */}
        <div className="bg-white rounded-xl border border-stone-200">
          <div className="p-4 pb-0">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-stone-400" />
              Ingresos y Comisiones
            </h3>
          </div>
          <div className="p-4">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={formattedChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E6DFD6" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `€${val}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E6DFD6',
                      borderRadius: '8px'
                    }}
                    formatter={(value) => [`€${value.toFixed(2)}`, '']}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#1C1C1C"
                    fill="#1C1C1C"
                    fillOpacity={0.1}
                    name="Ventas"
                  />
                  <Area
                    type="monotone"
                    dataKey="commission"
                    stroke="#78716c"
                    fill="#78716c"
                    fillOpacity={0.3}
                    name="Tu comisión"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Commission Info Card */}
      <div className="bg-stone-50 rounded-xl border border-stone-200">
        <div className="p-6">
          <h3 className="font-semibold text-stone-950 mb-3">
            Cómo funcionan tus comisiones
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-4 border border-stone-200">
              <p className="text-sm font-medium text-stone-950 mb-2">Cálculo de tu comisión:</p>
              <ul className="space-y-1 text-sm text-stone-600">
                <li>• Tu comisión depende de tu tier activo (3% a 7%)</li>
                <li>• Atribución de cliente activa durante 18 meses</li>
                <li>• Tasa efectiva actual: {effectiveRateLabel}</li>
              </ul>
            </div>
            <div className="bg-white rounded-xl p-4 border border-stone-200">
              <p className="text-sm font-medium text-stone-950 mb-2">Calendario de pagos:</p>
              <ul className="space-y-1 text-sm text-stone-600">
                <li>• Las comisiones se desbloquean 15 días después de la venta</li>
                <li>• Esto permite confirmar la entrega del pedido</li>
                <li>• Puedes retirar cuando tengas balance disponible</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Tips Card */}
      <div className="bg-stone-50 rounded-xl border border-stone-200">
        <div className="p-6">
          <h3 className="font-semibold text-stone-950 mb-3">
            Tips para mejorar tus conversiones
          </h3>
          <ul className="space-y-2 text-sm text-stone-600">
            {summary.conversion_rate < 5 && (
              <li>• Tu tasa de conversión es baja. Intenta crear contenido más específico sobre los productos.</li>
            )}
            {summary.total_clicks < 10 && (
              <li>• Comparte tu código más frecuentemente en tus redes sociales.</li>
            )}
            <li>• Recuerda mencionar el descuento del 10% que obtienen tus seguidores.</li>
            <li>• Los Stories y Reels tienen mejor engagement que los posts estáticos.</li>
            <li>• Usa el Asistente Creativo para generar ideas de contenido.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}


