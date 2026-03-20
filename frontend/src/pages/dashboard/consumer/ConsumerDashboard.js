import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '../../../components/dashboard/shared/DashboardHeader';
import KPICard from '../../../components/dashboard/shared/KPICard';
import AreaChart from '../../../components/dashboard/charts/AreaChart';
import QuickActions from '../../../components/dashboard/shared/QuickActions';
import ActivityList from '../../../components/dashboard/shared/ActivityList';
import HISuggestions from '../../../components/dashboard/shared/HISuggestions';
import { useAuth } from '../../../context/AuthContext';
import { useLegacyConsumerDashboard } from '../../../features/dashboard/queries';
import {
  ShoppingBag,
  Heart,
  Star,
  RefreshCw,
  Gift,
  Calendar,
  MapPin,
  Loader2
} from 'lucide-react';
import { asNumber, firstToken } from '../../../utils/safe';

function generateMonthlyData(orders) {
  const months = ['Sep', 'Oct', 'Nov', 'Dic', 'Ene', 'Feb'];
  const data = new Array(6).fill(0);

  orders.forEach((order) => {
    const date = new Date(order.created_at);
    const monthIndex = date.getMonth();
    const index = monthIndex % 6;
    if (index >= 0 && index < 6) {
      data[index] += order.total_amount || 0;
    }
  });

  return { labels: months, data };
}

function generateSuggestions(orders, navigate) {
  const suggestions = [];

  if (orders.length === 0) {
    suggestions.push({
      id: 1,
      title: 'Bienvenido a Hispaloshop',
      description: 'Descubre productos artesanales de tu zona',
      actionLabel: 'Explorar',
      onAction: () => navigate('/products')
    });
  } else {
    suggestions.push({
      id: 1,
      title: 'Basado en tus compras',
      description: 'Descubre productos similares a los que te gustan',
      actionLabel: 'Ver recomendaciones',
      onAction: () => navigate('/discover')
    });
  }

  suggestions.push({
    id: 2,
    title: 'Tienes ingredientes para recetas',
    description: 'Descubre recetas mediterraneas con tus productos',
    actionLabel: 'Ver recetas',
    onAction: () => navigate('/recipes')
  });

  return suggestions;
}

function ConsumerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const dashboardQuery = useLegacyConsumerDashboard(Boolean(user));

  const dashboardData = useMemo(() => {
    const ordersData = dashboardQuery.data?.orders || {};
    const wishlistData = dashboardQuery.data?.wishlist || {};
    const recentOrders = (ordersData?.orders || []).slice(0, 2).map((order) => ({
      id: order.id,
      title: `Pedido #${order.order_number || order.id.slice(-4)}`,
      subtitle:
        order.status === 'shipped'
          ? 'En camino'
          : order.status === 'delivered'
            ? 'Entregado'
            : `Pedido ${order.status}`,
      description: order.items?.map((i) => i.product_name).join(' + ') || 'Productos',
      amount: `EUR ${asNumber(order.total_amount).toFixed(2)}`,
      status: order.status,
      actionLabel: order.status === 'delivered' ? 'Reordenar' : 'Ver',
      onAction: () => navigate(`/dashboard/orders/${order.id}`)
    }));

    const totalOrders = ordersData?.total_count || ordersData?.orders?.length || 0;
    const totalSpent = ordersData?.orders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

    return {
      kpis: {
        orders: totalOrders,
        favorites: wishlistData?.items?.length || 0,
        rating: 0,
        savings: Math.round(totalSpent * 0.15)
      },
      chart: generateMonthlyData(ordersData?.orders || []),
      recentOrders,
      suggestions: generateSuggestions(ordersData?.orders || [], navigate)
    };
  }, [dashboardQuery.data, navigate]);

  const quickActions = [
    {
      id: 'reorder',
      icon: RefreshCw,
      label: 'Reordenar favorito',
      color: '#0c0a09',
      onClick: () => navigate('/dashboard/orders')
    },
    {
      id: 'discover',
      icon: Gift,
      label: 'Descubrir novedades',
      color: '#78716c',
      onClick: () => navigate('/discover')
    },
    {
      id: 'plan',
      icon: Calendar,
      label: 'Planificar semana',
      color: '#78716c',
      onClick: () => navigate('/recipes')
    },
    {
      id: 'stores',
      icon: MapPin,
      label: 'Tiendas cerca',
      color: '#0c0a09',
      onClick: () => navigate('/stores')
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
      <DashboardHeader
        userName={firstToken(user?.name, 'Usuario')}
        subtitle="Aqui esta tu resumen de hoy"
        notificationCount={0}
      />

      <div className="grid grid-cols-3 gap-3 mb-6">
        <KPICard
          icon={ShoppingBag}
          value={dashboardData.kpis.orders}
          label="Pedidos"
          subtext="totales"
          onClick={() => navigate('/dashboard/orders')}
        />
        <KPICard
          icon={Heart}
          value={dashboardData.kpis.favorites}
          label="Favoritos"
          subtext="guardados"
          accentColor="#44403c"
          onClick={() => navigate('/dashboard/wishlist')}
        />
        <KPICard
          icon={Star}
          value={dashboardData.kpis.savings}
          label="Ahorrado"
          subtext="estimado"
          accentColor="#1c1917"
        />
      </div>

      <div className="bg-white rounded-2xl p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-stone-950">Gasto mensual</h3>
          <span className="text-xs text-stone-500 font-medium">
            Total gastado: EUR {dashboardData.chart.data.reduce((a, b) => a + b, 0).toFixed(0)}
          </span>
        </div>
        <AreaChart data={dashboardData.chart.data} labels={dashboardData.chart.labels} />
      </div>

      <div className="mb-6">
        <h3 className="font-semibold text-stone-950 mb-3">Acciones rápidas</h3>
        <QuickActions actions={quickActions} />
      </div>

      {dashboardData.recentOrders.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-stone-950">Pedidos recientes</h3>
            <button
              onClick={() => navigate('/dashboard/orders')}
              className="text-sm text-stone-500 font-medium"
            >
              Ver todos
            </button>
          </div>
          <ActivityList items={dashboardData.recentOrders} />
        </div>
      )}

      <div>
        <h3 className="font-semibold text-stone-950 mb-3">Sugerencias de David</h3>
        <HISuggestions suggestions={dashboardData.suggestions} />
      </div>
    </div>
  );
}

export default ConsumerDashboard;
