import React, { useState, useEffect } from 'react';
import apiClient from '../../services/api/client';
import { useTranslation } from 'react-i18next';
import {
  Globe, Package, Users, Clock, AlertTriangle,
  Loader2, RefreshCw, CheckCircle, XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const COUNTRY_NAMES = {
  ES: 'España', US: 'USA', DE: 'Alemania', FR: 'Francia', IT: 'Italia',
  PT: 'Portugal', GB: 'Reino Unido', KR: 'Corea', JP: 'Japón', CN: 'China',
  IN: 'India', BR: 'Brasil', MX: 'México', CA: 'Canadá', AU: 'Australia',
};

export default function MarketCoverage() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = async () => {
    try {
      setError(false);
      const data = await apiClient.get('/admin/market-coverage');
      setData(data);
    } catch {
      setData(null);
      setError(true);
      toast.error('Error cargando cobertura');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-stone-500" /></div>;
  if (!data) {
    return (
      <div className="bg-white rounded-xl border border-stone-200 p-6 text-center">
        <AlertTriangle className="w-8 h-8 text-stone-500 mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-stone-950 mb-1">
          {error ? 'No se pudo cargar la cobertura de mercado' : 'Sin datos de cobertura'}
        </h2>
        <p className="text-sm text-stone-500 mb-4">
          {error ? 'Intenta nuevamente cuando el backend esté disponible.' : 'No hay métricas por país todavía.'}
        </p>
        <button
          className="px-4 py-2 border border-stone-200 text-stone-600 rounded-lg hover:bg-stone-50 transition-colors inline-flex items-center gap-2"
          onClick={() => { setLoading(true); fetchData(); }}
        >
          <RefreshCw className="w-4 h-4" />
          Reintentar
        </button>
      </div>
    );
  }

  const coverage = Array.isArray(data?.coverage) ? data.coverage : [];
  const products_without_inventory = Number(data?.products_without_inventory || 0);
  const totalProducts = coverage.reduce((s, c) => s + Number(c.active_products || 0), 0);
  const totalStock = coverage.reduce((s, c) => s + Number(c.total_stock || 0), 0);
  const totalSellers = coverage.reduce((s, c) => s + Number(c.active_sellers || 0), 0);

  const chartData = coverage.map(c => ({
    country: c.country_code,
    name: COUNTRY_NAMES[c.country_code] || c.country_code,
    products: c.active_products,
    sellers: c.active_sellers,
    stock: c.total_stock,
  }));

  return (
    <div className="space-y-5" data-testid="market-coverage-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-stone-950" data-testid="coverage-title">
            Cobertura por Mercado
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">Control multi-market: productos, productores/importadores y SLA por pais</p>
        </div>
        <button
          className="px-4 py-2 border border-stone-200 text-stone-600 rounded-lg hover:bg-stone-50 transition-colors"
          onClick={() => { setLoading(true); fetchData(); }}
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-stone-200 p-4" data-testid="stat-countries">
          <Globe className="w-5 h-5 text-stone-500 mb-2" />
          <p className="text-2xl font-bold text-stone-950">{coverage.length}</p>
          <p className="text-xs text-stone-500">Mercados activos</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4" data-testid="stat-total-products">
          <Package className="w-5 h-5 text-stone-500 mb-2" />
          <p className="text-2xl font-bold text-stone-950">{totalProducts}</p>
          <p className="text-xs text-stone-500">Productos-mercado activos</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <Users className="w-5 h-5 text-stone-500 mb-2" />
          <p className="text-2xl font-bold text-stone-950">{totalSellers}</p>
          <p className="text-xs text-stone-500">Productores activos</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <Clock className="w-5 h-5 text-stone-500 mb-2" />
          <p className="text-2xl font-bold text-stone-950">{totalStock.toLocaleString()}</p>
          <p className="text-xs text-stone-500">Stock total global</p>
        </div>
      </div>

      {products_without_inventory > 0 && (
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 flex items-center gap-3" data-testid="migration-alert">
          <AlertTriangle className="w-5 h-5 text-stone-600 shrink-0" />
          <p className="text-sm text-stone-700">{products_without_inventory} productos sin inventory_by_country (necesitan migracion)</p>
        </div>
      )}

      {/* Chart */}
      <div className="bg-white rounded-xl border border-stone-200 p-5">
        <h2 className="text-sm font-medium text-stone-950 mb-4 flex items-center gap-2">
          <Package className="w-4 h-4 text-stone-500" /> Productos activos por mercado
        </h2>
        {chartData.length > 0 ? (
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="country" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="products" name={t('admin.products')} fill="#1c1917" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-center text-stone-500 py-12 text-sm">Sin datos de mercado</p>
        )}
      </div>

      {/* Coverage Table */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden" data-testid="coverage-table">
        <div className="px-4 py-3 border-b border-stone-100">
          <h2 className="text-sm font-medium text-stone-950">Detalle por pais</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50/80">
              <tr className="text-stone-500 text-xs">
                <th className="text-left px-4 py-2.5 font-medium">Pais</th>
                <th className="text-right px-3 py-2.5 font-medium">Productos</th>
                <th className="text-right px-3 py-2.5 font-medium">Productores</th>
                <th className="text-right px-3 py-2.5 font-medium">Stock</th>
                <th className="text-right px-3 py-2.5 font-medium">SLA</th>
                <th className="text-right px-3 py-2.5 font-medium">Sin stock</th>
                <th className="text-center px-3 py-2.5 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {coverage.map(c => (
                <tr key={c.country_code} className="border-t border-stone-100 hover:bg-stone-50/50">
                  <td className="px-4 py-3 font-medium text-stone-950">
                    {c.country_code} <span className="text-stone-500 font-normal">({COUNTRY_NAMES[c.country_code] || ''})</span>
                  </td>
                  <td className="text-right px-3 py-3">{c.active_products}</td>
                  <td className="text-right px-3 py-3">{c.active_sellers}</td>
                  <td className="text-right px-3 py-3">{c.total_stock.toLocaleString()}</td>
                  <td className="text-right px-3 py-3">
                    <span className={c.avg_sla_hours <= 48 ? 'text-stone-600' : 'text-stone-950 font-medium'}>
                      {c.avg_sla_hours}h
                    </span>
                  </td>
                  <td className="text-right px-3 py-3">
                    {c.out_of_stock > 0 ? (
                      <span className="text-stone-950 font-medium">{c.out_of_stock}</span>
                    ) : (
                      <span className="text-stone-500">0</span>
                    )}
                  </td>
                  <td className="text-center px-3 py-3">
                    {c.avg_sla_hours <= 48 && c.out_of_stock === 0 ? (
                      <CheckCircle className="w-4 h-4 text-stone-500 mx-auto" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-stone-500 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
