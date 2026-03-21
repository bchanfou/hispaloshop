// @ts-nocheck
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '../../../components/dashboard/shared/DashboardHeader';
import KPICard from '../../../components/dashboard/shared/KPICard';
import AreaChart from '../../../components/dashboard/charts/AreaChart';
import QuickActions from '../../../components/dashboard/shared/QuickActions';
import ActivityList from '../../../components/dashboard/shared/ActivityList';
import HISuggestions from '../../../components/dashboard/shared/HISuggestions';
import { useAuth } from '../../../context/AuthContext';
import { useInfluencerProfile } from '../../../features/influencer/hooks';
import {
  Euro,
  Users,
  MousePointerClick,
  Link as LinkIcon,
  TrendingUp,
  Gift,
  Loader2
} from 'lucide-react';
import { asNumber, firstToken } from '../../../utils/safe';

function InfluencerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { dashboard, loading } = useInfluencerProfile();

  const dashboardData = useMemo(() => {
    const commissions = dashboard?.commissions || [];
    const links = dashboard?.links || [];
    const totalEarnings =
      commissions.reduce((sum, commission) => sum + (commission.amount || 0), 0) ||
      dashboard?.earnings?.total ||
      0;
    const totalClicks = links.reduce((sum, link) => sum + (link.clicks || 0), 0);

    return {
      kpis: {
        earnings: totalEarnings,
        clicks: totalClicks,
        conversions: commissions.length,
        followers: user?.followers_count || 0
      },
      tier: dashboard?.profile?.tier || dashboard?.current_tier || 'Hercules',
      chart: {
        labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
        data: dashboard?.earnings?.weekly || [0, 0, 0, 0]
      },
      recentConversions: commissions.slice(0, 3).map((commission) => ({
        id: commission.id,
        title: `Venta · ${commission.product_name || 'Producto'}`,
        subtitle: `Comision: EUR ${asNumber(commission.amount).toFixed(2)}`,
        description: commission.status === 'pending' ? 'Pendiente' : 'Confirmada',
        amount: `EUR ${asNumber(commission.amount).toFixed(2)}`,
        status: commission.status,
        actionLabel: 'Ver',
        onAction: () => {}
      })),
      suggestions: [
        {
          id: 1,
          title: 'Sube de nivel a Atenea',
          description: 'Necesitas EUR 200 mas en ventas este mes',
          actionLabel: 'Ver oportunidades',
          onAction: () => navigate('/influencer/opportunities')
        },
        {
          id: 2,
          title: 'Nuevo productor disponible',
          description: 'Aceites del Sur busca influencers',
          actionLabel: 'Ver detalles',
          onAction: () => navigate('/influencer/opportunities')
        }
      ]
    };
  }, [dashboard, navigate, user?.followers_count]);

  const quickActions = [
    {
      id: 'links',
      icon: LinkIcon,
      label: 'Mis enlaces',
      color: '#0c0a09',
      onClick: () => navigate('/influencer/links')
    },
    {
      id: 'opportunities',
      icon: TrendingUp,
      label: 'Oportunidades',
      color: '#78716c',
      onClick: () => navigate('/influencer/opportunities')
    },
    {
      id: 'earnings',
      icon: Euro,
      label: 'Mis ganancias',
      color: '#78716c',
      onClick: () => navigate('/influencer/earnings')
    },
    {
      id: 'perks',
      icon: Gift,
      label: 'Beneficios',
      color: '#0c0a09',
      onClick: () => navigate('/influencer/perks')
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-stone-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 p-4 pb-24">
      <DashboardHeader
        userName={firstToken(user?.name, 'Influencer')}
        subtitle={`Nivel: ${dashboardData.tier}`}
        notificationCount={0}
      />

      <div className="grid grid-cols-2 gap-3 mb-4">
        <KPICard
          icon={Euro}
          value={`EUR ${dashboardData.kpis.earnings.toFixed(0)}`}
          label="Ganancias"
          subtext="este mes"
          accentColor="#0c0a09"
        />
        <KPICard
          icon={MousePointerClick}
          value={dashboardData.kpis.clicks}
          label="Clicks"
          subtext="en tus enlaces"
          accentColor="#78716c"
        />
        <KPICard
          icon={Users}
          value={dashboardData.kpis.conversions}
          label="Ventas"
          subtext="generadas"
          accentColor="#78716c"
        />
        <KPICard
          icon={Users}
          value={dashboardData.kpis.followers}
          label="Seguidores"
          subtext="en tu perfil"
          accentColor="#0c0a09"
        />
      </div>

      <div className="bg-white rounded-2xl p-4 mb-6">
        <div className="mb-4">
          <h3 className="font-semibold text-stone-950">Ganancias semanales</h3>
          <p className="text-xs text-stone-500">Evolución de tus comisiones</p>
        </div>
        <AreaChart data={dashboardData.chart.data} labels={dashboardData.chart.labels} color="#1c1917" />
      </div>

      <div className="mb-6">
        <h3 className="font-semibold text-stone-950 mb-3">Acciones rápidas</h3>
        <QuickActions actions={quickActions} />
      </div>

      {dashboardData.recentConversions.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-stone-950">Ventas recientes</h3>
            <button onClick={() => navigate('/influencer/earnings')} className="text-sm text-stone-500 font-medium">
              Ver todas
            </button>
          </div>
          <ActivityList items={dashboardData.recentConversions} emptyMessage="No hay ventas todavia" />
        </div>
      )}

      <div>
        <h3 className="font-semibold text-stone-950 mb-3">Sugerencias</h3>
        <HISuggestions suggestions={dashboardData.suggestions} />
      </div>
    </div>
  );
}

export default InfluencerDashboard;
