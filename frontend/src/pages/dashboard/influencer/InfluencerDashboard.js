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
  Users, 
  MousePointerClick, 
  Link as LinkIcon, 
  TrendingUp, 
  Gift,
  Loader2
} from 'lucide-react';

function InfluencerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    kpis: {
      earnings: 0,
      clicks: 0,
      conversions: 0,
      followers: 0
    },
    tier: 'Hercules',
    chart: {
      labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
      data: [0, 0, 0, 0]
    },
    recentConversions: [],
    suggestions: []
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch influencer dashboard
      let dashboardRes = {};
      try {
        dashboardRes = await api.getInfluencerDashboard();
      } catch (e) {
        console.log('Influencer dashboard endpoint not available');
      }

      // Fetch commissions
      let commissionsData = {};
      try {
        commissionsData = await api.getCommissions();
      } catch (e) {
        console.log('Commissions endpoint not available');
      }

      // Fetch affiliate links
      let linksData = {};
      try {
        linksData = await api.getAffiliateLinks();
      } catch (e) {
        console.log('Affiliate links endpoint not available');
      }

      const totalEarnings = commissionsData?.commissions?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0;
      const totalClicks = linksData?.links?.reduce((sum, l) => sum + (l.clicks || 0), 0) || 0;
      const totalConversions = commissionsData?.commissions?.length || 0;

      setDashboardData({
        kpis: {
          earnings: totalEarnings,
          clicks: totalClicks,
          conversions: totalConversions,
          followers: user?.followers_count || 0
        },
        tier: dashboardRes?.profile?.tier || dashboardRes?.current_tier || 'Hercules',
        chart: {
          labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
          data: dashboardRes?.earnings?.weekly || [0, 0, 0, 0]
        },
        recentConversions: (commissionsData?.commissions || []).slice(0, 3).map(c => ({
          id: c.id,
          title: `Venta · ${c.product_name || 'Producto'}`,
          subtitle: `Comisión: €${c.amount?.toFixed(2) || '0.00'}`,
          description: c.status === 'pending' ? '⏳ Pendiente' : '✅ Confirmada',
          amount: `€${c.amount?.toFixed(2) || '0.00'}`,
          status: c.status,
          actionLabel: 'Ver',
          onAction: () => {}
        })),
        suggestions: [
          {
            id: 1,
            title: 'Sube de nivel a Atenea',
            description: 'Necesitas €200 más en ventas este mes',
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
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { 
      id: 'links', 
      icon: LinkIcon, 
      label: 'Mis enlaces', 
      color: 'var(--color-accent)',
      onClick: () => navigate('/influencer/links')
    },
    { 
      id: 'opportunities', 
      icon: TrendingUp, 
      label: 'Oportunidades', 
      color: 'var(--color-warning)',
      onClick: () => navigate('/influencer/opportunities')
    },
    { 
      id: 'earnings', 
      icon: Euro, 
      label: 'Mis ganancias', 
      color: 'var(--color-info)',
      onClick: () => navigate('/influencer/earnings')
    },
    { 
      id: 'perks', 
      icon: Gift, 
      label: 'Beneficios', 
      color: 'var(--color-success)',
      onClick: () => navigate('/influencer/perks')
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
        userName={user?.name?.split(' ')[0] || 'Influencer'}
        subtitle={`Nivel: ${dashboardData.tier}`}
        notificationCount={0}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <KPICard
          icon={Euro}
          value={`€${dashboardData.kpis.earnings.toFixed(0)}`}
          label="Ganancias"
          subtext="este mes"
          accentColor="#2D5A3D"
        />
        <KPICard
          icon={MousePointerClick}
          value={dashboardData.kpis.clicks}
          label="Clicks"
          subtext="en tus enlaces"
          accentColor="#E6A532"
        />
        <KPICard
          icon={Users}
          value={dashboardData.kpis.conversions}
          label="Ventas"
          subtext="generadas"
          accentColor="#3B82F6"
        />
        <KPICard
          icon={Users}
          value={dashboardData.kpis.followers}
          label="Seguidores"
          subtext="en tu perfil"
          accentColor="#16A34A"
        />
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl p-4 mb-6">
        <div className="mb-4">
          <h3 className="font-semibold text-gray-900">Ganancias semanales</h3>
          <p className="text-xs text-text-muted">
            Evolución de tus comisiones
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
        <h3 className="font-semibold text-gray-900 mb-3">Acciones rápidas</h3>
        <QuickActions actions={quickActions} />
      </div>

      {/* Recent Conversions */}
      {dashboardData.recentConversions.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Ventas recientes</h3>
            <button 
              onClick={() => navigate('/influencer/earnings')}
              className="text-sm text-accent font-medium"
            >
              Ver todas
            </button>
          </div>
          <ActivityList 
            items={dashboardData.recentConversions}
            emptyMessage="No hay ventas todavía"
          />
        </div>
      )}

      {/* HI Suggestions */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Sugerencias</h3>
        <HISuggestions suggestions={dashboardData.suggestions} />
      </div>
    </div>
  );
}

export default InfluencerDashboard;
