import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  TrendingUp, MousePointer, ShoppingCart, DollarSign, 
  Percent, Loader2, BarChart3, Calendar
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

import { API } from '../utils/api';

function StatCard({ icon: Icon, title, value, subtitle, color = "text-[#1C1C1C]" }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-[#7A7A7A] font-body">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            {subtitle && <p className="text-xs text-[#7A7A7A] mt-1">{subtitle}</p>}
          </div>
          <div className={`w-10 h-10 rounded-full bg-[#1C1C1C]/10 flex items-center justify-center`}>
            <Icon className="w-5 h-5 text-[#1C1C1C]" />
          </div>
        </div>
      </CardContent>
    </Card>
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
      const res = await axios.get(`${API}/influencer/analytics?days=${period}`, { withCredentials: true });
      setAnalytics(res.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#7A7A7A]" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BarChart3 className="w-12 h-12 text-[#DED7CE] mx-auto mb-4" />
          <p className="text-[#7A7A7A]">No hay datos de analytics disponibles</p>
        </CardContent>
      </Card>
    );
  }

  const { chart_data, summary, discount_code, referral_link } = analytics;
  
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
          <h2 className="font-heading text-xl font-semibold text-[#1C1C1C]">
            Analytics de tu Código
          </h2>
          {discount_code && (
            <p className="text-sm text-[#7A7A7A] mt-1">
              Código: <span className="font-mono font-bold">{discount_code}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#7A7A7A]" />
          <select
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
            className="text-sm border border-stone-200 rounded-lg px-3 py-1.5 bg-white"
          >
            <option value={7}>Últimos 7 días</option>
            <option value={30}>Últimos 30 días</option>
            <option value={90}>Últimos 90 días</option>
          </select>
        </div>
      </div>

      {/* Referral Link Card */}
      {referral_link && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="py-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-sm font-medium text-blue-900 mb-1">🔗 Tu enlace de referido</p>
                <p className="font-mono text-blue-700 bg-white px-3 py-1.5 rounded border border-blue-200 text-sm">
                  {window.location.origin}{referral_link}
                </p>
              </div>
              <Button 
                onClick={copyReferralLink}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Copiar enlace
              </Button>
            </div>
            <p className="text-xs text-blue-600 mt-2">
              Comparte este enlace en tus redes. Cada visita se trackea automáticamente.
            </p>
          </CardContent>
        </Card>
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
          color={summary.click_to_order_rate > 5 ? "text-green-600" : "text-[#1C1C1C]"}
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
          color="text-green-600"
          subtitle="15% de HispaloShop"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversions Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-purple-500" />
              Clics de Enlace vs Conversiones
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                  <Bar dataKey="link_clicks" fill="#3b82f6" name="Clics Enlace" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="code_uses" fill="#9333ea" name="Usos Código" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="conversions" fill="#22c55e" name="Conversiones" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue & Commission Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              Ingresos y Comisiones
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                    stroke="#22c55e" 
                    fill="#22c55e" 
                    fillOpacity={0.3}
                    name="Tu comisión"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Commission Info Card */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="py-6">
          <h3 className="font-heading font-semibold text-[#1C1C1C] mb-3">
            💰 Cómo funcionan tus comisiones
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <p className="text-sm font-medium text-[#1C1C1C] mb-2">Cálculo de tu comisión:</p>
              <ul className="space-y-1 text-sm text-[#4A4A4A]">
                <li>• HispaloShop cobra 18% de cada venta</li>
                <li>• Tú recibes el 15% de esa comisión</li>
                <li>• Ejemplo: Venta €100 → Tu comisión €2.70</li>
              </ul>
            </div>
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <p className="text-sm font-medium text-[#1C1C1C] mb-2">Calendario de pagos:</p>
              <ul className="space-y-1 text-sm text-[#4A4A4A]">
                <li>• Las comisiones se desbloquean 15 días después de la venta</li>
                <li>• Esto permite confirmar la entrega del pedido</li>
                <li>• Puedes retirar cuando tengas balance disponible</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tips Card */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardContent className="py-6">
          <h3 className="font-heading font-semibold text-[#1C1C1C] mb-3">
            💡 Tips para mejorar tus conversiones
          </h3>
          <ul className="space-y-2 text-sm text-[#4A4A4A]">
            {summary.conversion_rate < 5 && (
              <li>• Tu tasa de conversión es baja. Intenta crear contenido más específico sobre los productos.</li>
            )}
            {summary.total_clicks < 10 && (
              <li>• Comparte tu código más frecuentemente en tus redes sociales.</li>
            )}
            <li>• Recuerda mencionar el descuento del 10% que obtienen tus seguidores.</li>
            <li>• Los Stories y Reels tienen mejor engagement que los posts estáticos.</li>
            <li>• Usa el Hispalo AI Creativo para generar ideas de contenido.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
