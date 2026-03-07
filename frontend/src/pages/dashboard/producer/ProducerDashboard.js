import React from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '../../../components/dashboard/shared/DashboardHeader';
import KPICard from '../../../components/dashboard/shared/KPICard';
import AlertBanner from '../../../components/dashboard/shared/AlertBanner';
import AreaChart from '../../../components/dashboard/charts/AreaChart';
import QuickActions from '../../../components/dashboard/shared/QuickActions';
import ActivityList from '../../../components/dashboard/shared/ActivityList';
import HISuggestions from '../../../components/dashboard/shared/HISuggestions';
import { 
  Euro, 
  Package, 
  Star, 
  Plus, 
  ShoppingCart, 
  BarChart3, 
  Tag 
} from 'lucide-react';

const MOCK_DATA = {
  kpis: {
    revenue: '€8,450',
    orders: 156,
    rating: 4.9,
    growth: '+23%'
  },
  alerts: [
    {
      id: 1,
      type: 'warning',
      message: 'Stock bajo: Aceite Premium (quedan 5 unidades)',
      actionLabel: 'Reponer',
      onAction: () => {}
    }
  ],
  chart: {
    labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
    actual: [1800, 2200, 1950, 2500],
    predicted: [2600, 2800, 3100, 3400]
  },
  pendingOrders: [
    {
      id: '4567',
      title: '#4567 · María G.',
      subtitle: '🆕 Nuevo · Hace 2h',
      description: 'Aceite 500ml ×2, Miel ×1',
      amount: '€38.40',
      status: 'pending',
      actionLabel: 'Preparar',
      onAction: () => {}
    },
    {
      id: '4566',
      title: '#4566 · Carlos R.',
      subtitle: '📦 Enviado · Hace 1d',
      description: 'Pack regalo',
      amount: '€52.00',
      status: 'shipped',
      actionLabel: 'Seguimiento',
      onAction: () => {}
    }
  ],
  suggestions: [
    {
      id: 1,
      title: 'Oportunidad detectada',
      description: 'La demanda de packs regalo sube +40% (Navidad)',
      actionLabel: 'Crear pack',
      onAction: () => {}
    },
    {
      id: 2,
      title: 'Optimización de precio',
      description: 'Tu queso curado está 15% por debajo del mercado',
      actionLabel: 'Ajustar precio',
      onAction: () => {}
    }
  ]
};

function ProducerDashboard() {
  const navigate = useNavigate();

  const quickActions = [
    { 
      id: 'add', 
      icon: Plus, 
      label: 'Añadir producto', 
      color: '#2D5A3D',
      onClick: () => navigate('/producer/products')
    },
    { 
      id: 'orders', 
      icon: ShoppingCart, 
      label: 'Gestionar pedidos', 
      color: '#E6A532',
      onClick: () => navigate('/producer/orders')
    },
    { 
      id: 'analytics', 
      icon: BarChart3, 
      label: 'Análisis de productos', 
      color: '#3B82F6',
      onClick: () => {}
    },
    { 
      id: 'promo', 
      icon: Tag, 
      label: 'Crear promoción', 
      color: '#16A34A',
      onClick: () => {}
    }
  ];

  return (
    <div className="min-h-screen bg-[#F5F1E8] p-4 pb-24">
      <DashboardHeader 
        userName="Cortijo Andaluz" 
        subtitle="Resumen de tu negocio"
        notificationCount={3}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <KPICard
          icon={Euro}
          value={MOCK_DATA.kpis.revenue}
          label="Ingresos"
          subtext="este mes"
          trend={MOCK_DATA.kpis.growth}
          trendUp={true}
        />
        <KPICard
          icon={Package}
          value={MOCK_DATA.kpis.orders}
          label="Pedidos"
          subtext="este mes"
          accentColor="#E6A532"
          onClick={() => navigate('/producer/orders')}
        />
        <KPICard
          icon={Star}
          value={MOCK_DATA.kpis.rating}
          label="Valoración"
          subtext="media"
          accentColor="#16A34A"
        />
      </div>

      {/* Alerts */}
      {MOCK_DATA.alerts.map(alert => (
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
          <h3 className="font-semibold text-[#1A1A1A]">Evolución de ventas</h3>
          <p className="text-xs text-[#6B7280]">
            Línea sólida: real · Línea punteada: predicción HI
          </p>
        </div>
        <AreaChart 
          data={MOCK_DATA.chart.actual} 
          labels={MOCK_DATA.chart.labels}
          color="#2D5A3D"
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h3 className="font-semibold text-[#1A1A1A] mb-3">Acciones rápidas</h3>
        <QuickActions actions={quickActions} />
      </div>

      {/* Pending Orders */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-[#1A1A1A]">Pedidos pendientes</h3>
          <button 
            onClick={() => navigate('/producer/orders')}
            className="text-sm text-[#2D5A3D] font-medium"
          >
            Ver todos
          </button>
        </div>
        <ActivityList 
          items={MOCK_DATA.pendingOrders}
          emptyMessage="No hay pedidos pendientes"
        />
      </div>

      {/* HI Suggestions */}
      <div>
        <h3 className="font-semibold text-[#1A1A1A] mb-3">Sugerencias HI Ventas</h3>
        <HISuggestions suggestions={MOCK_DATA.suggestions} />
      </div>
    </div>
  );
}

export default ProducerDashboard;
