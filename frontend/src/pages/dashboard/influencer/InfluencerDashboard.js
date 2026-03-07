import React from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '../../../components/dashboard/shared/DashboardHeader';
import KPICard from '../../../components/dashboard/shared/KPICard';
import TierProgress from '../../../components/dashboard/shared/TierProgress';
import ComboChart from '../../../components/dashboard/charts/ComboChart';
import QuickActions from '../../../components/dashboard/shared/QuickActions';
import ActivityList from '../../../components/dashboard/shared/ActivityList';
import HISuggestions from '../../../components/dashboard/shared/HISuggestions';
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  Link2, 
  BarChart3, 
  Target, 
  MessageCircle 
} from 'lucide-react';

const MOCK_DATA = {
  kpis: {
    earnings: '€1,240',
    followers: '8.5k',
    conversion: '4.2%',
    growth: '+12%'
  },
  tier: {
    current: 'AQUILES',
    rate: 0.04,
    next: 'HÉRCULES',
    progress: 0.65
  },
  chart: {
    labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
    earnings: [200, 340, 280, 420],
    engagement: [3.2, 3.8, 4.1, 4.2]
  },
  topContent: [
    {
      id: '1',
      title: 'Reel: "Queso artesanal"',
      subtitle: '👁️ 12.5k views · ❤️ 890',
      description: '€45 generados',
      amount: '4.2%',
      status: 'delivered',
      actionLabel: 'Analizar',
      onAction: () => {}
    },
    {
      id: '2',
      title: 'Post: "Desayuno saludable"',
      subtitle: '👁️ 3.2k views · ❤️ 234',
      description: '€12 generados',
      amount: '2.1%',
      status: 'pending',
      actionLabel: 'Mejorar',
      onAction: () => {}
    }
  ],
  suggestions: [
    {
      id: 1,
      title: 'Idea viral detectada',
      description: '"What I eat in a day" está trending +45%',
      actionLabel: 'Generar script',
      onAction: () => {}
    },
    {
      id: 2,
      title: 'Producto trending',
      description: 'Aceite de oliva con limón sube en búsquedas',
      actionLabel: 'Crear contenido',
      onAction: () => {}
    }
  ]
};

function InfluencerDashboard() {
  const navigate = useNavigate();

  const quickActions = [
    { 
      id: 'link', 
      icon: Link2, 
      label: 'Link de afiliado', 
      color: '#2D5A3D',
      onClick: () => {}
    },
    { 
      id: 'content', 
      icon: BarChart3, 
      label: 'Contenido top', 
      color: '#E6A532',
      onClick: () => navigate('/creator')
    },
    { 
      id: 'promote', 
      icon: Target, 
      label: 'Productos para promo', 
      color: '#3B82F6',
      onClick: () => navigate('/products')
    },
    { 
      id: 'contact', 
      icon: MessageCircle, 
      label: 'Contactar marcas', 
      color: '#16A34A',
      onClick: () => {}
    }
  ];

  return (
    <div className="min-h-screen bg-[#F5F1E8] p-4 pb-24">
      <DashboardHeader 
        userName="Laura" 
        subtitle="Tu rendimiento este mes"
        notificationCount={5}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <KPICard
          icon={DollarSign}
          value={MOCK_DATA.kpis.earnings}
          label="Ganado"
          subtext="este mes"
          trend="23%"
          trendUp={true}
        />
        <KPICard
          icon={Users}
          value={MOCK_DATA.kpis.followers}
          label="Seguidores"
          subtext={MOCK_DATA.kpis.growth}
          trend={MOCK_DATA.kpis.growth}
          trendUp={true}
          accentColor="#E6A532"
        />
        <KPICard
          icon={TrendingUp}
          value={MOCK_DATA.kpis.conversion}
          label="Conversión"
          subtext="promedio"
          accentColor="#16A34A"
        />
      </div>

      {/* Tier Progress */}
      <div className="mb-6">
        <TierProgress 
          currentTier={MOCK_DATA.tier.current}
          currentRate={MOCK_DATA.tier.rate}
          nextTier={MOCK_DATA.tier.next}
          progress={MOCK_DATA.tier.progress}
          onViewBenefits={() => {}}
        />
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl p-4 mb-6">
        <div className="mb-4">
          <h3 className="font-semibold text-[#1A1A1A]">Ingresos vs Engagement</h3>
          <p className="text-xs text-[#6B7280]">
            Tus reels de recetas generan 3× más ingresos
          </p>
        </div>
        <ComboChart 
          barData={MOCK_DATA.chart.earnings} 
          lineData={MOCK_DATA.chart.engagement}
          labels={MOCK_DATA.chart.labels}
        />
        <div className="flex items-center justify-center gap-6 mt-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[#2D5A3D]" />
            <span className="text-xs text-[#6B7280]">Ingresos (€)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#E6A532]" />
            <span className="text-xs text-[#6B7280]">Engagement (%)</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h3 className="font-semibold text-[#1A1A1A] mb-3">Acciones rápidas</h3>
        <QuickActions actions={quickActions} />
      </div>

      {/* Top Content */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-[#1A1A1A]">Contenido destacado</h3>
          <button 
            onClick={() => navigate('/creator')}
            className="text-sm text-[#2D5A3D] font-medium"
          >
            Ver todo
          </button>
        </div>
        <ActivityList 
          items={MOCK_DATA.topContent} 
          emptyMessage="No hay contenido publicado aún"
        />
      </div>

      {/* HI Suggestions */}
      <div>
        <h3 className="font-semibold text-[#1A1A1A] mb-3">Sugerencias HI Creator</h3>
        <HISuggestions suggestions={MOCK_DATA.suggestions} />
      </div>
    </div>
  );
}

export default InfluencerDashboard;
