import React from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '../../../components/dashboard/shared/DashboardHeader';
import KPICard from '../../../components/dashboard/shared/KPICard';
import BarChart from '../../../components/dashboard/charts/BarChart';
import QuickActions from '../../../components/dashboard/shared/QuickActions';
import ActivityList from '../../../components/dashboard/shared/ActivityList';
import HISuggestions from '../../../components/dashboard/shared/HISuggestions';
import { 
  Globe, 
  TrendingUp, 
  FileText, 
  Search, 
  BarChart3, 
  Package, 
  Mail 
} from 'lucide-react';

const MOCK_DATA = {
  kpis: {
    suppliers: 12,
    margin: '34%',
    volume: '€125k',
    negotiations: 3
  },
  negotiations: [
    { name: 'Cortijo Andaluz', status: 'En revisión' },
    { name: 'Quesería La Mancha', status: 'Contrato' },
    { name: 'Miel del Sur', status: 'Primera oferta' }
  ],
  chart: {
    labels: ['Andalucía', 'Castilla', 'Extremadura', 'Cataluña', 'Galicia'],
    data: [42, 38, 28, 35, 30]
  },
  recentPOs: [
    {
      id: '089',
      title: 'PO-2024-089 · Cortijo Andaluz',
      subtitle: '🚢 En tránsito · Llegada 15 mar',
      description: 'Aceite EVOO 1000L',
      amount: '€8,500',
      status: 'shipped',
      actionLabel: 'Seguimiento',
      onAction: () => {}
    },
    {
      id: '088',
      title: 'PO-2024-088 · Quesería Central',
      subtitle: '✅ Recibido · 28 feb',
      description: 'Queso curado 500kg',
      amount: '€12,400',
      status: 'delivered',
      actionLabel: 'Reordenar',
      onAction: () => {}
    }
  ],
  suggestions: [
    {
      id: 1,
      title: 'Oportunidad geográfica',
      description: 'Nuevos productores BIO en Extremadura, precios -12%',
      actionLabel: 'Explorar catálogo',
      onAction: () => {}
    },
    {
      id: 2,
      title: 'Tendencia de mercado',
      description: 'La demanda de "sin lactosa" crece +67% en tu zona',
      actionLabel: 'Buscar proveedores',
      onAction: () => {}
    }
  ]
};

function ImporterDashboard() {
  const navigate = useNavigate();

  const quickActions = [
    { 
      id: 'search', 
      icon: Search, 
      label: 'Buscar productores', 
      color: '#2D5A3D',
      onClick: () => navigate('/b2b/marketplace')
    },
    { 
      id: 'market', 
      icon: BarChart3, 
      label: 'Análisis de mercado', 
      color: '#E6A532',
      onClick: () => {}
    },
    { 
      id: 'orders', 
      icon: Package, 
      label: 'Pedidos B2B', 
      color: '#3B82F6',
      onClick: () => navigate('/b2b/quotes')
    },
    { 
      id: 'contact', 
      icon: Mail, 
      label: 'Contactar proveedores', 
      color: '#16A34A',
      onClick: () => {}
    }
  ];

  return (
    <div className="min-h-screen bg-[#F5F1E8] p-4 pb-24">
      <DashboardHeader 
        userName="Importaciones Global" 
        subtitle="Tu cartera de proveedores"
        notificationCount={4}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <KPICard
          icon={Globe}
          value={MOCK_DATA.kpis.suppliers}
          label="Proveedores"
          subtext="activos"
        />
        <KPICard
          icon={TrendingUp}
          value={MOCK_DATA.kpis.margin}
          label="Margen"
          subtext="promedio"
          accentColor="#16A34A"
        />
        <KPICard
          icon={FileText}
          value={MOCK_DATA.kpis.volume}
          label="Volumen"
          subtext="anual"
          accentColor="#E6A532"
        />
      </div>

      {/* Negotiations Status */}
      <div className="bg-white rounded-2xl p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#2D5A3D]" />
            <span className="font-semibold text-[#1A1A1A]">
              Negociaciones activas: {MOCK_DATA.kpis.negotiations}
            </span>
          </div>
        </div>
        <div className="space-y-2">
          {MOCK_DATA.negotiations.map((neg, index) => (
            <div key={index} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
              <span className="text-sm text-[#1A1A1A]">{neg.name}</span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                neg.status === 'Contrato' 
                  ? 'bg-green-100 text-green-700' 
                  : neg.status === 'En revisión'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {neg.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart - Margins by Region */}
      <div className="bg-white rounded-2xl p-4 mb-6">
        <div className="mb-4">
          <h3 className="font-semibold text-[#1A1A1A]">Rentabilidad por origen</h3>
          <p className="text-xs text-[#6B7280]">
            Margen bruto por región de origen
          </p>
        </div>
        <BarChart 
          data={MOCK_DATA.chart.data} 
          labels={MOCK_DATA.chart.labels}
          color="#2D5A3D"
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h3 className="font-semibold text-[#1A1A1A] mb-3">Acciones rápidas</h3>
        <QuickActions actions={quickActions} />
      </div>

      {/* Recent Purchase Orders */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-[#1A1A1A]">Pedidos B2B recientes</h3>
          <button 
            onClick={() => navigate('/b2b/quotes')}
            className="text-sm text-[#2D5A3D] font-medium"
          >
            Ver todos
          </button>
        </div>
        <ActivityList 
          items={MOCK_DATA.recentPOs}
          emptyMessage="No hay pedidos recientes"
        />
      </div>

      {/* HI Suggestions */}
      <div>
        <h3 className="font-semibold text-[#1A1A1A] mb-3">Sugerencias HI Import</h3>
        <HISuggestions suggestions={MOCK_DATA.suggestions} />
      </div>
    </div>
  );
}

export default ImporterDashboard;
