import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '../../../components/dashboard/shared/DashboardHeader';
import KPICard from '../../../components/dashboard/shared/KPICard';
import AlertBanner from '../../../components/dashboard/shared/AlertBanner';
import AreaChart from '../../../components/dashboard/charts/AreaChart';
import QuickActions from '../../../components/dashboard/shared/QuickActions';
import ActivityList from '../../../components/dashboard/shared/ActivityList';
import HISuggestions from '../../../components/dashboard/shared/HISuggestions';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../lib/api';
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

function ImporterDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    kpis: {
      revenue: 0,
      orders: 0,
      countries: 0,
      products: 0
    },
    alerts: [],
    chart: {
      labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
      data: [0, 0, 0, 0]
    },
    pendingOrders: [],
    suggestions: []
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch importer stats
      let statsData = {};
      try {
        statsData = await api.request('/importer/stats');
      } catch (e) {
        console.log('Importer stats endpoint not available');
      }

      // Fetch orders
      let ordersData = {};
      try {
        ordersData = await api.request('/importer/orders');
      } catch (e) {
        console.log('Importer orders endpoint not available');
      }

      // Fetch products
      let productsData = {};
      try {
        productsData = await api.request('/importer/products');
      } catch (e) {
        console.log('Importer products endpoint not available');
      }

      // Calculate unique countries
      const countries = new Set();
      (productsData?.products || []).forEach(p => {
        if (p.origin_country) countries.add(p.origin_country);
      });

      const totalRevenue = (ordersData?.orders || []).reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

      setDashboardData({
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
        pendingOrders: (ordersData?.orders || []).slice(0, 3).map(order => ({
          id: order.id,
          title: `#${order.order_number || order.id.slice(-4)} · ${order.customer_name || 'Cliente'}`,
          subtitle: order.status === 'pending' ? '🆕 Nuevo' : '📦 ' + order.status,
          description: order.items?.map(i => i.product_name).join(', ') || 'Productos',
          amount: `€${order.total_amount?.toFixed(2) || '0.00'}`,
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
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { 
      id: 'add', 
      icon: Plus, 
      label: 'Añadir producto', 
      color: '#2D5A3D',
      onClick: () => navigate('/importer/products/new')
    },
    { 
      id: 'orders', 
      icon: ShoppingCart, 
      label: 'Pedidos', 
      color: '#E6A532',
      onClick: () => navigate('/importer/orders')
    },
    { 
      id: 'producers', 
      icon: Users, 
      label: 'Productores', 
      color: '#3B82F6',
      onClick: () => navigate('/b2b/producers')
    },
    { 
      id: 'analytics', 
      icon: TrendingUp, 
      label: 'Análisis', 
      color: '#16A34A',
      onClick: () => navigate('/importer/analytics')
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#2D5A3D]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8] p-4 pb-24">
      <DashboardHeader 
        userName={user?.name || 'Importador'}
        subtitle="Panel de importador"
        notificationCount={0}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <KPICard
          icon={Euro}
          value={`€${dashboardData.kpis.revenue.toFixed(0)}`}
          label="Ingresos"
          subtext="este mes"
          accentColor="#2D5A3D"
        />
        <KPICard
          icon={Package}
          value={dashboardData.kpis.orders}
          label="Pedidos"
          subtext="totales"
          accentColor="#E6A532"
        />
        <KPICard
          icon={Globe}
          value={dashboardData.kpis.countries}
          label="Países"
          subtext="de origen"
          accentColor="#3B82F6"
        />
        <KPICard
          icon={Package}
          value={dashboardData.kpis.products}
          label="Productos"
          subtext="activos"
          accentColor="#16A34A"
        />
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl p-4 mb-6">
        <div className="mb-4">
          <h3 className="font-semibold text-[#1A1A1A]">Evolución de ventas</h3>
          <p className="text-xs text-[#6B7280]">
            Ingresos semanales
          </p>
        </div>
        <AreaChart 
          data={dashboardData.chart.data} 
          labels={dashboardData.chart.labels}
          color="#2D5A3D"
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h3 className="font-semibold text-[#1A1A1A] mb-3">Acciones rápidas</h3>
        <QuickActions actions={quickActions} />
      </div>

      {/* Pending Orders */}
      {dashboardData.pendingOrders.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-[#1A1A1A]">Pedidos recientes</h3>
            <button 
              onClick={() => navigate('/importer/orders')}
              className="text-sm text-[#2D5A3D] font-medium"
            >
              Ver todos
            </button>
          </div>
          <ActivityList 
            items={dashboardData.pendingOrders}
            emptyMessage="No hay pedidos pendientes"
          />
        </div>
      )}

      {/* HI Suggestions */}
      <div>
        <h3 className="font-semibold text-[#1A1A1A] mb-3">Sugerencias HI</h3>
        <HISuggestions suggestions={dashboardData.suggestions} />
      </div>
    </div>
  );
}

export default ImporterDashboard;
