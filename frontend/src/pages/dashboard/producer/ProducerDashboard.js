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
  Star, 
  Plus, 
  ShoppingCart, 
  BarChart3, 
  Tag,
  Loader2
} from 'lucide-react';

function ProducerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dataWarnings, setDataWarnings] = useState([]);
  const [dashboardData, setDashboardData] = useState({
    kpis: {
      revenue: 0,
      orders: 0,
      rating: 0,
      growth: 0
    },
    alerts: [],
    chart: {
      labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
      actual: [0, 0, 0, 0]
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
      setDataWarnings([]);
      const warnings = [];
      
      // Fetch producer stats
      let statsData = {};
      try {
        statsData = await api.request('/producer/stats');
      } catch (e) {
        console.log('Stats endpoint not available');
        warnings.push('Las metricas avanzadas no estan disponibles ahora mismo.');
      }

      // Fetch orders
      const ordersData = await api.getProducerOrders({ status: 'pending' });
      
      // Fetch products for low stock alerts
      let productsData = { products: [] };
      try {
        productsData = await api.request('/producer/products');
      } catch (e) {
        console.log('Products endpoint not available');
        warnings.push('No se pudo cargar el stock de productos para las alertas.');
      }

      // Format pending orders
      const pendingOrders = (ordersData?.orders || []).slice(0, 3).map(order => ({
        id: order.id,
        title: `#${order.order_number || order.id.slice(-4)} · ${order.customer_name || 'Cliente'}`,
        subtitle: order.status === 'pending' ? '🆕 Nuevo' : 
                  order.status === 'processing' ? '⏳ En preparación' :
                  '📦 ' + order.status,
        description: order.items?.map(i => i.product_name).join(', ') || 'Productos',
        amount: `€${order.total_amount?.toFixed(2) || '0.00'}`,
        status: order.status,
        actionLabel: order.status === 'pending' ? 'Preparar' : 'Ver',
        onAction: () => navigate('/producer/orders')
      }));

      // Generate low stock alerts
      const lowStockProducts = (productsData.products || [])
        .filter(p => p.stock < 10)
        .slice(0, 2);
      
      const alerts = lowStockProducts.map(p => ({
        id: p.id,
        type: 'warning',
        message: `Stock bajo: ${p.name} (quedan ${p.stock} unidades)`,
        actionLabel: 'Reponer',
        onAction: () => navigate('/producer/products')
      }));

      // Calculate revenue from orders
      const totalRevenue = ordersData?.orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
      const totalOrders = ordersData?.total_count || ordersData?.orders?.length || 0;

      setDashboardData({
        kpis: {
          revenue: totalRevenue,
          orders: totalOrders,
          rating: statsData.rating || 4.5,
          growth: statsData.growth || 0
        },
        alerts,
        chart: {
          labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
          actual: statsData.weekly_revenue || [0, 0, 0, 0]
        },
        pendingOrders,
        suggestions: [
          {
            id: 1,
            title: 'Optimiza tus ventas',
            description: 'Añade más productos para aumentar tu visibilidad',
            actionLabel: 'Añadir producto',
            onAction: () => navigate('/producer/products')
          },
          {
            id: 2,
            title: 'Conecta con influencers',
            description: 'Colabora con influencers para promocionar tus productos',
            actionLabel: 'Ver influencers',
            onAction: () => navigate('/producer/influencers')
          }
        ]
      });
      setDataWarnings(warnings);
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
      color: 'var(--color-accent)',
      onClick: () => navigate('/producer/products')
    },
    { 
      id: 'orders', 
      icon: ShoppingCart, 
      label: 'Gestionar pedidos', 
      color: 'var(--color-warning)',
      onClick: () => navigate('/producer/orders')
    },
    { 
      id: 'analytics', 
      icon: BarChart3, 
      label: 'Análisis', 
      color: 'var(--color-info)',
      onClick: () => navigate('/producer/payments')
    },
    { 
      id: 'promo', 
      icon: Tag, 
      label: 'Promociones', 
      color: 'var(--color-success)',
      onClick: () => navigate('/producer/store')
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
        userName={user?.name || 'Productor'}
        subtitle="Resumen de tu negocio"
        notificationCount={dashboardData.alerts.length}
      />

      {dataWarnings.length > 0 && (
        <div className="mb-4 space-y-2">
          {dataWarnings.map((warning) => (
            <AlertBanner
              key={warning}
              type="warning"
              message={warning}
            />
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <KPICard
          icon={Euro}
          value={`€${dashboardData.kpis.revenue.toFixed(0)}`}
          label="Ingresos"
          subtext="este mes"
          trend={`${dashboardData.kpis.growth > 0 ? '+' : ''}${dashboardData.kpis.growth}%`}
          trendUp={dashboardData.kpis.growth >= 0}
        />
        <KPICard
          icon={Package}
          value={dashboardData.kpis.orders}
          label="Pedidos"
          subtext="este mes"
          accentColor="#E6A532"
          onClick={() => navigate('/producer/orders')}
        />
        <KPICard
          icon={Star}
          value={dashboardData.kpis.rating}
          label="Valoración"
          subtext="media"
          accentColor="#16A34A"
        />
      </div>

      {/* Alerts */}
      {dashboardData.alerts.map(alert => (
        <div key={alert.id} className="mb-4">
          <AlertBanner 
            type={alert.type}
            message={alert.message}
            actionLabel={alert.actionLabel}
            onAction={alert.onAction}
          />
        </div>
      ))}

      {/* Chart */}
      <div className="bg-white rounded-2xl p-4 mb-6">
        <div className="mb-4">
          <h3 className="font-semibold text-gray-900">Evolución de ventas</h3>
          <p className="text-xs text-text-muted">
            Ingresos semanales
          </p>
        </div>
        <AreaChart 
          data={dashboardData.chart.actual} 
          labels={dashboardData.chart.labels}
          color="#2D5A3D"
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Acciones rápidas</h3>
        <QuickActions actions={quickActions} />
      </div>

      {/* Pending Orders */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Pedidos pendientes</h3>
          <button 
            onClick={() => navigate('/producer/orders')}
            className="text-sm text-accent font-medium"
          >
            Ver todos
          </button>
        </div>
        <ActivityList 
          items={dashboardData.pendingOrders}
          emptyMessage="No hay pedidos pendientes"
        />
      </div>

      {/* HI Suggestions */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Sugerencias HI Ventas</h3>
        <HISuggestions suggestions={dashboardData.suggestions} />
      </div>
    </div>
  );
}

export default ProducerDashboard;
