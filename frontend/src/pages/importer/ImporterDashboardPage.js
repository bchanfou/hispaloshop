import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Globe, Loader2, Package, ShoppingBag, TrendingUp, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api/client';
import { Button } from '../../components/ui/button';

function ImporterMetric({ icon: Icon, title, value, description, to }) {
  return (
    <Link to={to} className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-stone-500">{title}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-stone-950">{value}</p>
          <p className="mt-2 text-sm text-stone-500">{description}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-100 text-stone-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Link>
  );
}

export default function ImporterDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState('');

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await apiClient.get(`/importer/stats`);
        if (active) setStats(data || {});
      } catch {
        if (active) {
          setStats({
            total_products: 0,
            approved_products: 0,
            total_orders: 0,
            follower_count: 0,
            low_stock_products: [],
            recent_reviews: [],
            countries_of_origin: [],
          });
          setWarning('No se pudieron cargar todas las métricas del importador. Se muestran valores vacíos temporalmente.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const metrics = useMemo(
    () => ({
      suppliers: (stats?.countries_of_origin || []).length,
      products: stats?.total_products || 0,
      orders: stats?.total_orders || 0,
      analytics: stats?.approved_products || 0,
    }),
    [stats],
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-stone-500" />
      </div>
    );
  }

  return (
    <div className="ds-page">
      <div className="ds-shell">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight text-stone-950">Panel de importador</h1>
          <p className="mt-2 text-sm text-stone-500">Proveedores, catálogo, pedidos y rendimiento en la misma estructura visual.</p>
        </header>

        {warning ? (
          <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{warning}</span>
            </div>
          </div>
        ) : null}

        <section className="ds-section ds-grid-4">
          <ImporterMetric icon={Users} title="Proveedores" value={metrics.suppliers} description="Países y partners activos" to="/b2b/marketplace" />
          <ImporterMetric icon={Package} title="Productos" value={metrics.products} description={`${stats?.approved_products || 0} aprobados`} to="/producer/products" />
          <ImporterMetric icon={ShoppingBag} title="Pedidos" value={metrics.orders} description="Actividad comercial" to="/producer/orders" />
          <ImporterMetric icon={TrendingUp} title="Analytics" value={metrics.analytics} description="SKU visibles en tienda" to="/producer" />
        </section>

        <section className="ds-section grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-stone-950">Red de origen</h2>
            <p className="mt-2 text-sm text-stone-500">Mercados y países con producto activo.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {(stats?.countries_of_origin || []).length > 0 ? (
                stats.countries_of_origin.map((country) => (
                  <span key={country} className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm text-stone-700">
                    <Globe className="h-3.5 w-3.5" />
                    {country}
                  </span>
                ))
              ) : (
                <p className="text-sm text-stone-500">Todavía no hay países de origen registrados.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-stone-950">Próximos pasos</h2>
            <div className="mt-5 space-y-3">
              <Link to="/producer/products" className="flex items-center justify-between rounded-2xl border border-stone-100 bg-stone-50 p-4 text-sm text-stone-700 transition-all duration-200 hover:shadow-sm">
                <span>Gestionar catálogo</span>
                <Package className="h-4 w-4" />
              </Link>
              <Link to="/producer/orders" className="flex items-center justify-between rounded-2xl border border-stone-100 bg-stone-50 p-4 text-sm text-stone-700 transition-all duration-200 hover:shadow-sm">
                <span>Revisar pedidos</span>
                <ShoppingBag className="h-4 w-4" />
              </Link>
              <Link to="/b2b/marketplace" className="flex items-center justify-between rounded-2xl border border-stone-100 bg-stone-50 p-4 text-sm text-stone-700 transition-all duration-200 hover:shadow-sm">
                <span>Buscar nuevos proveedores</span>
                <Users className="h-4 w-4" />
              </Link>
            </div>

            {!user?.approved ? (
              <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <p className="text-sm font-medium text-stone-950">Cuenta pendiente de aprobación</p>
                <p className="mt-1 text-sm text-stone-500">Puedes preparar catálogo, pero la visibilidad pública se activará cuando la cuenta sea aprobada.</p>
              </div>
            ) : null}

            <Button asChild className="mt-5">
              <Link to="/producer/products">Abrir gestión de productos</Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
