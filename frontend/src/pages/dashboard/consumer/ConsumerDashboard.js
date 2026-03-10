import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '../../../components/dashboard/shared/DashboardHeader';
import KPICard from '../../../components/dashboard/shared/KPICard';
import AreaChart from '../../../components/dashboard/charts/AreaChart';
import QuickActions from '../../../components/dashboard/shared/QuickActions';
import ActivityList from '../../../components/dashboard/shared/ActivityList';
import HISuggestions from '../../../components/dashboard/shared/HISuggestions';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../lib/api';
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

function ConsumerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    kpis: {
      orders: 0,
      favorites: 0,
      rating: 0,
      savings: 0
    },
    chart: {
      labels: ['Sep', 'Oct', 'Nov', 'Dic', 'Ene', 'Feb'],
      data: [0, 0, 0, 0, 0, 0]
    },
    recentOrders: [],
    suggestions: []
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch orders
      const ordersData = await api.getMyOrders({ limit: '5' });
      
      // Fetch wishlist count (if endpoint exists)
      let favoritesCount = 0;
      try {
        const wishlistData = await api.request('/wishlist');
        favoritesCount = wishlistData?.items?.length || 0;
      } catch (e) {
        // Wishlist endpoint might not exist yet
      }

      // Format recent orders
      const recentOrders = (ordersData?.orders || []).slice(0, 2).map(order => ({
        id: order.id,
        title: `Pedido #${order.order_number || order.id.slice(-4)}`,
        subtitle: order.status === 'shipped' ? '🚚 En camino' : 
                  order.status === 'delivered' ? '✅ Entregado' : 
                  '📦 ' + order.status,
        description: order.items?.map(i => i.product_name).join(' + ') || 'Productos',
        amount: `€${order.total_amount?.toFixed(2) || '0.00'}`,
        status: order.status,
        actionLabel: order.status === 'delivered' ? 'Reordenar' : 'Ver',
        onAction: () => navigate(`/dashboard/orders/${order.id}`)
      }));

      // Calculate total orders and spending
      const totalOrders = ordersData?.total_count || ordersData?.orders?.length || 0;
      const totalSpent = ordersData?.orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

      // Generate monthly data (mock for now until we have real stats endpoint)
      const monthlyData = generateMonthlyData(ordersData?.orders || []);

      setDashboardData({
        kpis: {
          orders: totalOrders,
          favorites: favoritesCount,
          rating: 0, // Customers don't have ratings
          savings: Math.round(totalSpent * 0.15) // Estimated savings
        },
        chart: monthlyData,
        recentOrders,
        suggestions: generateSuggestions(ordersData?.orders || [])
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMonthlyData = (orders) => {
    const months = ['Sep', 'Oct', 'Nov', 'Dic', 'Ene', 'Feb'];
    const data = new Array(6).fill(0);
    
    orders.forEach(order => {
      const date = new Date(order.created_at);
      const monthIndex = date.getMonth();
      // Map to our 6-month window (this is simplified)
      const index = monthIndex % 6;
      if (index >= 0 && index < 6) {
        data[index] += order.total_amount || 0;
      }
    });
    
    return { labels: months, data };
  };

  const generateSuggestions = (orders) => {
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
      description: 'Descubre recetas mediterráneas con tus productos',
      actionLabel: 'Ver recetas',
      onAction: () => navigate('/recipes')
    });
    
    return suggestions;
  };

  const quickActions = [
    { 
      id: 'reorder', 
      icon: RefreshCw, 
      label: 'Reordenar favorito', 
      color: 'var(--color-accent)',
      onClick: () => navigate('/dashboard/orders')
    },
    { 
      id: 'discover', 
      icon: Gift, 
      label: 'Descubrir novedades', 
      color: 'var(--color-warning)',
      onClick: () => navigate('/discover')
    },
    { 
      id: 'plan', 
      icon: Calendar, 
      label: 'Planificar semana', 
      color: 'var(--color-info)',
      onClick: () => navigate('/recipes')
    },
    { 
      id: 'stores', 
      icon: MapPin, 
      label: 'Tiendas cerca', 
      color: 'var(--color-success)',
      onClick: () => navigate('/stores')
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background-subtle flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-subtle p-4 pb-24">
      <DashboardHeader 
        userName={user?.name?.split(' ')[0] || 'Usuario'}
        subtitle="Aquí está tu resumen de hoy"
        notificationCount={0}
      />

      {/* KPI Cards */}
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
          accentColor="#E6A532"
          onClick={() => navigate('/dashboard/wishlist')}
        />
        <KPICard
          icon={Star}
          value={dashboardData.kpis.savings}
          label="Ahorrado"
          subtext="estimado"
          accentColor="#16A34A"
        />
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Gasto mensual</h3>
          <span className="text-xs text-accent font-medium">
            Total gastado: €{dashboardData.chart.data.reduce((a, b) => a + b, 0).toFixed(0)}
          </span>
        </div>
        <AreaChart 
          data={dashboardData.chart.data} 
          labels={dashboardData.chart.labels}
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Acciones rápidas</h3>
        <QuickActions actions={quickActions} />
      </div>

      {/* Recent Orders */}
      {dashboardData.recentOrders.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Pedidos recientes</h3>
            <button 
              onClick={() => navigate('/dashboard/orders')}
              className="text-sm text-accent font-medium"
            >
              Ver todos
            </button>
          </div>
          <ActivityList items={dashboardData.recentOrders} />
        </div>
      )}

      {/* HI Suggestions */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Sugerencias HI AI</h3>
        <HISuggestions suggestions={dashboardData.suggestions} />
      </div>
    </div>
  );
}

export default ConsumerDashboard;
