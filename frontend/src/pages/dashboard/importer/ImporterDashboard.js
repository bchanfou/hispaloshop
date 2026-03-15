import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '../../../components/dashboard/shared/DashboardHeader';
import KPICard from '../../../components/dashboard/shared/KPICard';
import AreaChart from '../../../components/dashboard/charts/AreaChart';
import QuickActions from '../../../components/dashboard/shared/QuickActions';
import ActivityList from '../../../components/dashboard/shared/ActivityList';
import HISuggestions from '../../../components/dashboard/shared/HISuggestions';
import { useAuth } from '../../../context/AuthContext';
import { useLegacyImporterDashboard } from '../../../features/dashboard/queries';
import {
  Euro,
  Package,
  Globe,
  Plus,
  ShoppingCart,
  Users,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { asNumber } from '../../../utils/safe';

function ImporterDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const dashboardQuery = useLegacyImporterDashboard(Boolean(user));

  const dashboardData = useMemo(() => {
    const statsData = dashboardQuery.data?.stats || {};
    const ordersData = dashboardQuery.data?.orders || {};
    const productsData = dashboardQuery.data?.products || {};

    const countries = new Set();
    (productsData?.products || []).forEach((product) => {
      if (product.origin_country) countries.add(product.origin_country);
    });

    const totalRevenue =
      (ordersData?.orders || []).reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

    return {
      kpis: {
        revenue: totalRevenue,
        orders: ordersData?.total_count || 0,
        countries: countries.size,
        products: productsData?.total_count || 0
      },
      alerts: [],
      chart: {
        labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
        data: statsData?.weekly_revenue || [0, 0, 0, 0]
      },
      pendingOrders: (ordersData?.orders || []).slice(0, 3).map((order) => ({
        id: order.id,
        title: `#${order.order_number || order.id.slice(-4)} · ${order.customer_name || 'Cliente'}`,
        subtitle: order.status === 'pending' ? 'Nuevo' : `Pedido ${order.status}`,
        description: order.items?.map((item) => item.product_name).join(', ') || 'Productos',
        amount: `EUR ${asNumber(order.total_amount).toFixed(2)}`,
        status: order.status,
        actionLabel: 'Ver',
        onAction: () => navigate(`/importer/orders/${order.id}`)
      })),
      suggestions: [
        {
          id: 1,
          title: 'Expande tu catálogo',
          description: 'Descubre nuevos productores en Italia y Grecia',
          actionLabel: 'Explorar',
          onAction: () => navigate('/b2b/producers')
        },
        {
          id: 2,
          title: 'Optimiza precios',
          description: 'Tus productos italianos tienen alta demanda',
          actionLabel: 'Ver análisis',
          onAction: () => navigate('/importer/analytics')
        }
      ]
    };
  }, [dashboardQuery.data, navigate]);

  const quickActions = [
    {
      id: 'add',
      icon: Plus,
      label: 'Añadir producto',
      color: 'var(--color-black)',
      onClick: () => navigate('/importer/products/new')
    },
    {
      id: 'orders',
      icon: ShoppingCart,
      label: 'Pedidos',
      color: 'var(--color-stone)',
      onClick: () => navigate('/importer/orders')
    },
    {
      id: 'producers',
      icon: Users,
      label: 'Productores',
      color: 'var(--color-stone)',
      onClick: () => navigate('/b2b/producers')
    },
    {
      id: 'analytics',
      icon: TrendingUp,
      label: 'Análisis',
      color: 'var(--color-black)',
      onClick: () => navigate('/importer/analytics')
    }
  ];

  if (dashboardQuery.isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-stone-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 p-4 pb-24">
      <DashboardHeader userName={user?.name || 'Importador'} subtitle="Panel de importador" notificationCount={0} />

      <div className="grid grid-cols-2 gap-3 mb-4">
        <KPICard
          icon={Euro}
          value={`EUR ${dashboardData.kpis.revenue.toFixed(0)}`}
          label="Ingresos"
          subtext="este mes"
          accentColor="#1c1917"
        />
        <KPICard
          icon={Package}
          value={dashboardData.kpis.orders}
          label="Pedidos"
          subtext="totales"
          accentColor="#44403c"
        />
        <KPICard
          icon={Globe}
          value={dashboardData.kpis.countries}
          label="Países"
          subtext="de origen"
          accentColor="#78716c"
        />
        <KPICard
          icon={Package}
          value={dashboardData.kpis.products}
          label="Productos"
          subtext="activos"
          accentColor="#1c1917"
        />
      </div>

      <div className="bg-white rounded-2xl p-4 mb-6">
        <div className="mb-4">
          <h3 className="font-semibold text-stone-950">Evolución de ventas</h3>
          <p className="text-xs text-stone-500">Ingresos semanales</p>
        </div>
        <AreaChart data={dashboardData.chart.data} labels={dashboardData.chart.labels} color="#1c1917" />
      </div>

      <div className="mb-6">
        <h3 className="font-semibold text-stone-950 mb-3">Acciones rápidas</h3>
        <QuickActions actions={quickActions} />
      </div>

      {dashboardData.pendingOrders.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-stone-950">Pedidos recientes</h3>
            <button onClick={() => navigate('/importer/orders')} className="text-sm text-stone-500 font-medium">
              Ver todos
            </button>
          </div>
          <ActivityList items={dashboardData.pendingOrders} emptyMessage="No hay pedidos pendientes" />
        </div>
      )}

      <div>
        <h3 className="font-semibold text-stone-950 mb-3">Sugerencias HI</h3>
        <HISuggestions suggestions={dashboardData.suggestions} />
      </div>
    </div>
  );
}

export default ImporterDashboard;
