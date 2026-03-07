import React from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '../../../components/dashboard/shared/DashboardHeader';
import KPICard from '../../../components/dashboard/shared/KPICard';
import AreaChart from '../../../components/dashboard/charts/AreaChart';
import QuickActions from '../../../components/dashboard/shared/QuickActions';
import ActivityList from '../../../components/dashboard/shared/ActivityList';
import HISuggestions from '../../../components/dashboard/shared/HISuggestions';
import { 
  ShoppingBag, 
  Heart, 
  Star, 
  RefreshCw, 
  Gift, 
  Calendar, 
  MapPin 
} from 'lucide-react';

const MOCK_DATA = {
  kpis: {
    orders: 12,
    favorites: 45,
    rating: 4.8,
    savings: 45
  },
  chart: {
    labels: ['Sep', 'Oct', 'Nov', 'Dic', 'Ene', 'Feb'],
    data: [120, 145, 200, 340, 180, 220]
  },
  recentOrders: [
    {
      id: '1234',
      title: 'Pedido #1234',
      subtitle: '🚚 En camino · Llega mañana',
      description: 'Aceite + Queso + Miel',
      amount: '€44.50',
      status: 'shipped',
      actionLabel: 'Ver',
      onAction: () => {}
    },
    {
      id: '1233',
      title: 'Pedido #1233',
      subtitle: '✅ Entregado · 12 mar',
      description: 'Pack desayuno',
      amount: '€23.90',
      status: 'delivered',
      actionLabel: 'Reordenar',
      onAction: () => {}
    }
  ],
  suggestions: [
    {
      id: 1,
      title: 'Tu aceite favorito está de oferta -15%',
      description: 'Basado en tu historial de compras',
      actionLabel: 'Ver oferta',
      onAction: () => {}
    },
    {
      id: 2,
      title: 'Tienes ingredientes para 3 recetas mediterráneas',
      description: 'Descubre recetas con tus productos',
      actionLabel: 'Ver recetas',
      onAction: () => {}
    }
  ]
};

function ConsumerDashboard() {
  const navigate = useNavigate();

  const quickActions = [
    { 
      id: 'reorder', 
      icon: RefreshCw, 
      label: 'Reordenar favorito', 
      color: '#2D5A3D',
      onClick: () => navigate('/dashboard/orders')
    },
    { 
      id: 'discover', 
      icon: Gift, 
      label: 'Descubrir novedades', 
      color: '#E6A532',
      onClick: () => navigate('/discover')
    },
    { 
      id: 'plan', 
      icon: Calendar, 
      label: 'Planificar semana', 
      color: '#3B82F6',
      onClick: () => {}
    },
    { 
      id: 'stores', 
      icon: MapPin, 
      label: 'Tiendas cerca', 
      color: '#16A34A',
      onClick: () => navigate('/stores')
    }
  ];

  return (
    <div className="min-h-screen bg-[#F5F1E8] p-4 pb-24">
      <DashboardHeader 
        userName="María" 
        subtitle="Aquí está tu resumen de hoy"
        notificationCount={2}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <KPICard
          icon={ShoppingBag}
          value={MOCK_DATA.kpis.orders}
          label="Pedidos"
          subtext="este año"
          onClick={() => navigate('/dashboard/orders')}
        />
        <KPICard
          icon={Heart}
          value={MOCK_DATA.kpis.favorites}
          label="Favoritos"
          subtext="guardados"
          accentColor="#E6A532"
          onClick={() => navigate('/dashboard/wishlist')}
        />
        <KPICard
          icon={Star}
          value={MOCK_DATA.kpis.rating}
          label="Mi rating"
          subtext="medio"
          accentColor="#16A34A"
        />
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[#1A1A1A]">Gasto mensual</h3>
          <span className="text-xs text-[#2D5A3D] font-medium">
            Has ahorrado €{MOCK_DATA.kpis.savings}
          </span>
        </div>
        <AreaChart 
          data={MOCK_DATA.chart.data} 
          labels={MOCK_DATA.chart.labels}
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h3 className="font-semibold text-[#1A1A1A] mb-3">Acciones rápidas</h3>
        <QuickActions actions={quickActions} />
      </div>

      {/* Recent Orders */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-[#1A1A1A]">Pedidos recientes</h3>
          <button 
            onClick={() => navigate('/dashboard/orders')}
            className="text-sm text-[#2D5A3D] font-medium"
          >
            Ver todos
          </button>
        </div>
        <ActivityList items={MOCK_DATA.recentOrders} />
      </div>

      {/* HI Suggestions */}
      <div>
        <h3 className="font-semibold text-[#1A1A1A] mb-3">Sugerencias HI AI</h3>
        <HISuggestions suggestions={MOCK_DATA.suggestions} />
      </div>
    </div>
  );
}

export default ConsumerDashboard;
