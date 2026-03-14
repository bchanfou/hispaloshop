import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api/client';
import { 
  Package, FileCheck, ShoppingBag, CreditCard, 
  AlertCircle, Users, TrendingUp, Heart, Star, 
  Zap, Target, ChevronRight, Loader2, ExternalLink, CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import PlanManager from '../../components/PlanManager';
import LockedFeature from '../../components/LockedFeature';
import { useProducerPlan } from '../../context/ProducerPlanContext';
import { useTranslation } from 'react-i18next';
import HealthScoreHero from '../../components/dashboard/HealthScoreHero';
import StatCardMobile from '../../components/dashboard/StatCardMobile';
import QuickActionsMobile from '../../components/dashboard/QuickActionsMobile';
import { asNumber } from '../../utils/safe';

// ===== STRIPE CONNECT COMPONENT =====
function StripeConnectSection() {
  const { t } = useTranslation();
  const [stripeStatus, setStripeStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    fetchStripeStatus();
    if (searchParams.get('stripe_return') === 'true') {
      toast.success('Stripe onboarding completado. Verificando estado...');
      setTimeout(fetchStripeStatus, 800);
    }
    if (searchParams.get('stripe_refresh') === 'true') {
      toast.info('Debes completar los datos pendientes en Stripe.');
    }
  }, [searchParams]);

  const fetchStripeStatus = async () => {
    try {
      const data = await apiClient.get('/producer/stripe/status');
      setStripeStatus({
        has_account: Boolean(data?.stripe_account_id),
        account_id: data?.stripe_account_id || null,
        status: data?.status || 'not_connected',
        charges_enabled: Boolean(data?.charges_enabled),
        payouts_enabled: Boolean(data?.payouts_enabled),
        onboarding_completed: Boolean(data?.connected),
        requirements_due: [],
      });
    } catch (error) {
      console.error('Error fetching Stripe status:', error);
      setStripeStatus({
        has_account: false,
        onboarding_completed: false,
        status: 'unknown',
        requirements_due: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConnectStripe = async () => {
    setConnecting(true);
    try {
      const data = await apiClient.post('/producer/stripe/create-account', {});
      const onboardingUrl = data?.url || null;
      if (onboardingUrl) {
        window.location.href = onboardingUrl;
      } else {
        await fetchStripeStatus();
      }
    } catch (error) {
      toast.error(error.message || 'Error al conectar Stripe');
    } finally {
      setConnecting(false);
    }
  };

  const handleViewStripeDashboard = async () => {
    try {
      const data = await apiClient.post('/producer/stripe/create-login-link', {});
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      toast.error('Error al abrir Stripe dashboard');
    }
  };

  if (loading) {
    return (
      <div className="dashboard-card p-4 md:p-6">
        <div className="flex items-center gap-2 text-stone-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Cargando estado de Stripe...</span>
        </div>
      </div>
    );
  }

  const isConnected = Boolean(stripeStatus?.onboarding_completed);
  const pendingRequirements = stripeStatus?.requirements_due || [];

  return (
    <div 
      className={`dashboard-card p-4 md:p-6 ${isConnected ? 'border-stone-200 bg-stone-50' : 'border-stone-200 bg-stone-50'}`}
      data-testid="stripe-connect-section"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-lg bg-stone-100`}>
            <CreditCard className={`w-5 h-5 text-stone-700`} />
          </div>
          <div>
            <h3 className="font-medium text-stone-950">Stripe Payouts</h3>
            <p className={`text-sm flex items-center gap-1 text-stone-700`}>
              {isConnected ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Conectado
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4" />
                  Sin conectar
                </>
              )}
            </p>
            <p className="text-xs text-stone-500 mt-1">
              {isConnected 
                ? 'Recibirás el 82% de cada venta automáticamente.'
                : 'Conecta Stripe para recibir pagos.'}
            </p>
            {!isConnected && pendingRequirements.length > 0 && (
              <p className="text-xs text-stone-600 mt-1">
                Pendientes: {pendingRequirements.length} requisito(s) en Stripe.
              </p>
            )}
          </div>
        </div>
        
        <div className="ml-10 md:ml-0">
          {isConnected ? (
            <button
              type="button"
              onClick={handleViewStripeDashboard}
              className="flex items-center gap-2 px-3 py-1.5 border border-stone-200 rounded-lg text-sm text-stone-700 hover:bg-stone-50 transition-colors"
              data-testid="view-stripe-dashboard"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">Ver Dashboard</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConnectStripe}
              disabled={connecting}
              className="flex items-center gap-2 px-3 py-1.5 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
              data-testid="connect-stripe-button"
            >
              {connecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Conectar Stripe'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== HEALTH SCORE COMPONENT =====
function HealthScoreCard() {
  const { t } = useTranslation();
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHealthScore();
  }, []);

  const fetchHealthScore = async () => {
    try {
      const data = await apiClient.get('/producer/health-score');
      setHealthData(data);
    } catch (error) {
      console.error('Error fetching health score:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="health-score-hero health-score-good">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-white" />
        </div>
      </div>
    );
  }

  if (!healthData) return null;

  return (
    <div data-testid="health-score-section">
      {/* Mobile View - Hero Style */}
      <div className="md:hidden">
        <HealthScoreHero
          score={healthData.total_score}
          label={healthData.status_label}
          breakdown={healthData.breakdown}
        />
        
        {/* Metrics Summary - Mobile */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="dashboard-card p-3 text-center">
            <div className="text-xl font-bold text-stone-950">{healthData.metrics.orders_30d}</div>
            <div className="text-[10px] text-stone-500 uppercase tracking-wider">{t('customerDashboard.orders', 'Pedidos')}</div>
          </div>
          <div className="dashboard-card p-3 text-center">
            <div className="text-xl font-bold text-stone-950">€{asNumber(healthData.metrics.revenue_30d).toFixed(0)}</div>
            <div className="text-[10px] text-stone-500 uppercase tracking-wider">Ventas</div>
          </div>
          <div className="dashboard-card p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <Star className="w-4 h-4 text-stone-400 fill-stone-400" />
              <span className="text-xl font-bold text-stone-950">{healthData.metrics.avg_rating || '-'}</span>
            </div>
            <div className="text-[10px] text-stone-500 uppercase tracking-wider">{healthData.metrics.review_count} Reviews</div>
          </div>
        </div>
      </div>

      {/* Desktop View - Card Style */}
      <div className="hidden md:block">
        <DesktopHealthScore healthData={healthData} t={t} />
      </div>
    </div>
  );
}

// Desktop health score (original style enhanced)
function DesktopHealthScore({ healthData, t }) {
  const getStatusBgColor = (_color) => 'bg-stone-50 border-stone-200';
  const getStatusColor = (_color) => 'bg-stone-950';
  const getStatusTextColor = (_color) => 'text-stone-700';

  return (
    <div className={`dashboard-card p-6 ${getStatusBgColor(healthData.status_color)}`}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Heart className="w-5 h-5 text-stone-500" />
            <h2 className="font-semibold text-stone-950">{t('producer.healthScore.title')}</h2>
          </div>
          <p className="text-sm text-stone-500">{t('producer.healthScore.subtitle')}</p>
        </div>
        <div className="text-right">
          <div className="text-4xl font-bold text-stone-950">{healthData.total_score}</div>
          <div className={`text-sm font-medium ${getStatusTextColor(healthData.status_color)}`}>
            {healthData.status_label}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="h-3 bg-white rounded-full overflow-hidden">
          <div 
            className={`h-full ${getStatusColor(healthData.status_color)} transition-all duration-500`}
            style={{ width: `${healthData.total_score}%` }}
          />
        </div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {Object.entries(healthData.breakdown).map(([key, item]) => (
          <div key={key} className="bg-white rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-stone-950">{item.score}</div>
            <div className="text-xs text-stone-500">/{item.max}</div>
            <div className="text-xs font-medium text-stone-600 mt-1">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Metrics Summary */}
      <div className="grid grid-cols-3 gap-4 py-4 border-y border-stone-200">
        <div className="text-center">
          <div className="text-xl font-bold text-stone-950">{healthData.metrics.orders_30d}</div>
          <div className="text-xs text-stone-500">{t('producer.healthScore.orders30d')}</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-stone-950">€{healthData.metrics.revenue_30d.toFixed(0)}</div>
          <div className="text-xs text-stone-500">{t('producer.healthScore.revenue30d')}</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Star className="w-4 h-4 text-stone-400 fill-stone-400" />
            <span className="text-xl font-bold text-stone-950">{healthData.metrics.avg_rating || '-'}</span>
          </div>
          <div className="text-xs text-stone-500">{healthData.metrics.review_count} {t('producer.healthScore.reviews')}</div>
        </div>
      </div>

      {/* Recommendations */}
      {healthData.recommendations?.length > 0 && (
        <div className="mt-4">
          <h3 className="font-medium text-stone-950 mb-3 flex items-center gap-2">
            <Target className="w-4 h-4" />
            {t('producer.healthScore.recommendations')}
          </h3>
          <div className="space-y-2">
            {healthData.recommendations.map((rec, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-3 p-3 rounded-lg bg-white border-l-4 border-stone-300`}
              >
                <Zap className="w-4 h-4 mt-0.5 flex-shrink-0 text-stone-500" />
                <p className="text-sm text-stone-600">{rec.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== FOLLOWER CHART COMPONENT =====
function FollowerGrowthChart() {
  const { t } = useTranslation();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetchFollowerStats();
  }, [days]);

  const fetchFollowerStats = async () => {
    try {
      const data = await apiClient.get(`/producer/follower-stats?days=${days}`);
      setData(data?.chart_data || []);
    } catch (error) {
      console.error('Error fetching follower stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-card p-4 md:p-6">
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-stone-950" />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-card p-4 md:p-6">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-stone-950" />
          <h2 className="font-medium text-stone-950 text-sm md:text-base">
            {t('producer.followerGrowth.title')}
          </h2>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="text-xs md:text-sm border border-stone-200 rounded-lg px-2 md:px-3 py-1.5 bg-white"
        >
          <option value={7}>{t('producer.followerGrowth.last7Days')}</option>
          <option value={30}>{t('producer.followerGrowth.last30Days')}</option>
          <option value={90}>{t('producer.followerGrowth.last90Days')}</option>
        </select>
      </div>
      
      {data.length > 0 ? (
        <div className="chart-container-mobile md:chart-container-desktop">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorFollowers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#57534e" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#57534e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10 }} 
                tickFormatter={(val) => {
                  const d = new Date(val);
                  return `${d.getDate()}/${d.getMonth()+1}`;
                }}
                hide={window.innerWidth < 768}
              />
              <YAxis tick={{ fontSize: 10 }} hide={window.innerWidth < 768} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e5e5', fontSize: '12px' }}
                labelFormatter={(val) => new Date(val).toLocaleDateString()}
                formatter={(val, name) => [val, name === 'followers' ? 'Total' : 'Nuevos']}
              />
              <Area 
                type="monotone" 
                dataKey="followers" 
                stroke="#57534e" 
                fillOpacity={1} 
                fill="url(#colorFollowers)" 
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-48 text-stone-500">
          <Users className="w-12 h-12 mb-2 opacity-30" />
          <p className="text-sm">{t('producer.followerGrowth.noFollowers')}</p>
          <p className="text-xs">{t('producer.followerGrowth.shareStore')}</p>
        </div>
      )}
    </div>
  );
}

// ===== MAIN COMPONENT =====
export default function ProducerOverview() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [payments, setPayments] = useState(null);
  const [demandSignals, setDemandSignals] = useState({
    trending_ingredients: [],
    most_tagged_products: [],
    content_driving_sales: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataWarnings, setDataWarnings] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setError(null);
      setDataWarnings([]);
      const [statsRes, paymentsRes, demandRes] = await Promise.allSettled([
        apiClient.get('/producer/stats'),
        apiClient.get('/producer/payments'),
        apiClient.get('/intelligence/producer-demand'),
      ]);
      const warnings = [];

      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value);
      } else {
        setStats({
          total_products: 0,
          approved_products: 0,
          total_orders: 0,
          follower_count: 0,
          low_stock_products: [],
          recent_reviews: [],
        });
        warnings.push('No se pudieron cargar las métricas del catálogo y la tienda.');
      }

      if (paymentsRes.status === 'fulfilled') {
        setPayments(paymentsRes.value);
      } else {
        setPayments({
          total_gross: 0,
          total_net: 0,
          total_sold: 0,
          producer_share: 0,
          pending_orders: 0,
          stripe_connected: false,
        });
        warnings.push('No se pudo cargar el resumen de pagos.');
      }

      if (demandRes.status === 'fulfilled') {
        setDemandSignals(demandRes.value || { trending_ingredients: [], most_tagged_products: [], content_driving_sales: [] });
      } else {
        setDemandSignals({ trending_ingredients: [], most_tagged_products: [], content_driving_sales: [] });
      }

      setDataWarnings(warnings);
      if (warnings.length >= 2) {
        setError('No se pudieron cargar los datos principales del panel. Por favor, refresca la página.');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Error al cargar datos. Por favor, refresca la página.');
    } finally {
      setLoading(false);
    }
  };

  const publicProfileUrl = user?.user_id ? `/user/${user.user_id}` : null;

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-stone-950 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-stone-500">{t('producer.loadingDashboard')}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <AlertCircle className="w-12 h-12 text-stone-400 mb-4" />
        <p className="text-stone-600 mb-4 text-center">{error}</p>
        <button
          type="button"
          onClick={fetchData}
          className="px-4 py-2 bg-stone-950 hover:bg-stone-800 text-white rounded-lg transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const isPending = !user?.approved;

  // Quick actions data
  const quickActions = [
    {
      icon: Package,
      label: t('producer.createNewProduct'),
      description: 'Añadir nuevo producto',
      to: '/producer/products',
      bgColor: '#0c0a09',
      iconColor: '#f5f5f4'
    },
    {
      icon: FileCheck,
      label: t('producer.manageCertificates'),
      description: 'Certificaciones de calidad',
      to: '/producer/certificates',
      bgColor: '#f5f5f4',
      iconColor: '#44403c'
    },
    {
      icon: ShoppingBag,
      label: t('producer.viewOrders'),
      description: 'Gestionar pedidos',
      to: '/producer/orders',
      bgColor: '#f5f5f4',
      iconColor: '#44403c'
    },
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-950" data-testid="producer-title">
          {user?.company_name || user?.name}
        </h1>
        {publicProfileUrl && (
          <Link
            to={publicProfileUrl}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
            data-testid="view-public-profile"
          >
            <Users className="h-4 w-4" />
            Ver perfil público
          </Link>
        )}
      </div>
      {dataWarnings.length > 0 && !error && (
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-stone-700" />
            <div className="space-y-1 text-sm text-stone-700">
              {dataWarnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Quick Actions — 2 Big Buttons (impossible to miss) */}
      <div className="grid grid-cols-2 gap-3" data-testid="quick-actions">
        <Link to="/producer/products" className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-stone-950 p-5 text-white transition-all hover:scale-[1.02] active:scale-[0.98]" data-testid="quick-add-product">
          <Package className="w-8 h-8" />
          <span className="text-sm font-semibold">{t('sellerDashboard.newProduct', 'New Product')}</span>
        </Link>
        <Link to="/producer/orders" className="relative flex flex-col items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white p-5 transition-all hover:scale-[1.02] hover:shadow-sm" data-testid="quick-orders">
          <ShoppingBag className="w-8 h-8 text-stone-950" />
          <span className="text-sm font-semibold text-stone-950">{t('customerDashboard.orders', 'Pedidos')}</span>
          {stats?.pending_orders > 0 && <span className="absolute top-3 right-3 bg-stone-950 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full">{stats.pending_orders}</span>}
        </Link>
      </div>

      {/* 3 Key Metrics — Big Numbers */}
      <section className="rounded-2xl border border-stone-100 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-medium text-stone-950">Señales de demanda</h2>
            <p className="mt-1 text-sm text-stone-500">Ingredientes, productos y piezas de contenido con más intención de compra.</p>
          </div>
          <Target className="h-5 w-5 text-stone-400" />
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Trending ingredients</p>
            <div className="mt-3 space-y-2">
              {(demandSignals.trending_ingredients || []).slice(0, 4).map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm text-stone-700">
                  <span>{item.name}</span>
                  <span className="text-stone-500">{item.count}</span>
                </div>
              ))}
              {!(demandSignals.trending_ingredients || []).length ? <p className="text-sm text-stone-500">Sin datos todavía.</p> : null}
            </div>
          </div>
          <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Most tagged products</p>
            <div className="mt-3 space-y-2">
              {(demandSignals.most_tagged_products || []).slice(0, 4).map((item) => (
                <div key={item.product_id} className="flex items-center justify-between gap-3 text-sm text-stone-700">
                  <span className="truncate">{item.name}</span>
                  <span className="text-stone-500">{item.count}</span>
                </div>
              ))}
              {!(demandSignals.most_tagged_products || []).length ? <p className="text-sm text-stone-500">Sin etiquetas suficientes.</p> : null}
            </div>
          </div>
          <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Content driving sales</p>
            <div className="mt-3 space-y-2">
              {(demandSignals.content_driving_sales || []).slice(0, 4).map((item) => (
                <div key={`${item.content_type}-${item.content_id}`} className="flex items-center justify-between text-sm text-stone-700">
                  <span className="capitalize">{item.content_type}</span>
                  <span className="text-stone-500">{item.score}</span>
                </div>
              ))}
              {!(demandSignals.content_driving_sales || []).length ? <p className="text-sm text-stone-500">Aún no hay conversiones atribuidas.</p> : null}
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-stone-200 p-4 text-center">
          <p className="text-2xl font-bold text-stone-950">{asNumber(payments?.total_gross).toFixed(0)}€</p>
          <p className="text-[10px] text-stone-500 uppercase mt-1">{t('sellerDashboard.totalSales', 'Total sales')}</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4 text-center">
          <p className="text-2xl font-bold text-stone-950">{payments?.pending_orders || 0}</p>
          <p className="text-[10px] text-stone-500 uppercase mt-1">{t('sellerDashboard.pendingShip', 'To ship')}</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4 text-center">
          <p className="text-2xl font-bold text-stone-950">{asNumber(payments?.total_net).toFixed(0)}€</p>
          <p className="text-[10px] text-stone-500 uppercase mt-1">{t('sellerDashboard.earned', 'Earned')}</p>
        </div>
      </div>

      {/* Plan Manager */}
      <PlanManager />

      {/* Low Stock Alert */}
      {stats?.low_stock_products?.length > 0 && (
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4" data-testid="low-stock-alert">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-stone-700" />
            <span className="text-sm font-semibold text-stone-950">{stats.low_stock_products.length} {t('sellerDashboard.lowStockAlert')}</span>
          </div>
          <div className="space-y-1">
            {stats.low_stock_products.slice(0, 3).map(p => (
              <Link key={p.product_id} to={`/producer/products`} className="flex items-center justify-between text-xs py-1.5 border-t border-stone-100 first:border-0">
                <span className="text-stone-700 truncate flex-1">{p.name}</span>
                <span className="text-stone-950 font-bold ml-2">{p.stock} uds</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Reviews */}
      {stats?.recent_reviews?.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 p-4" data-testid="recent-reviews">
          <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">{t('sellerDashboard.latestReviews')}</h3>
          <div className="space-y-2">
            {stats.recent_reviews.slice(0, 3).map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <div className="flex items-center gap-0.5 bg-stone-100 px-1.5 py-0.5 rounded text-stone-700 shrink-0">
                  <Star className="w-3 h-3 fill-stone-400 text-stone-400" /> {r.rating}
                </div>
                <p className="text-stone-600 line-clamp-2">{r.comment || t('sellerDashboard.noComment')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Warning */}
      {isPending && (
        <div className="dashboard-card border-stone-200 bg-stone-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-stone-500 mt-0.5" />
            <div>
              <h3 className="font-medium text-stone-950">{t('producer.accountPending')}</h3>
              <p className="text-sm text-stone-600">{t('producer.accountPendingDesc')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stripe Connect */}
      <StripeConnectSection />

      {/* Health Score — PRO+ */}
      <LockedFeature requiredPlan="PRO" featureName="health-score">
        <HealthScoreCard />
      </LockedFeature>

      {/* Stats Grid - Mobile: 2x2, Desktop: 5 columns */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        <StatCardMobile
          icon={Package}
          label={t('producer.totalProducts')}
          value={stats?.total_products || 0}
          sublabel={`${stats?.approved_products || 0} aprobados`}
          linkTo="/producer/products"
          color="primary"
        />
        <StatCardMobile
          icon={ShoppingBag}
          label={t('producer.orders')}
          value={stats?.total_orders || 0}
          linkTo="/producer/orders"
          color="info"
        />
        <StatCardMobile
          icon={Users}
          label={t('producer.followers')}
          value={stats?.follower_count || 0}
          linkTo="/producer/store"
          color="success"
        />
        <StatCardMobile
          icon={CreditCard}
          label={t('producer.totalSold')}
          value={`€${asNumber(payments?.total_sold).toFixed(0)}`}
          linkTo="/producer/payments"
          color="warning"
        />
        {/* 5th stat only on desktop */}
        <div className="hidden md:block">
          <StatCardMobile
            icon={CreditCard}
            label={t('producer.yourEarnings')}
            value={`€${asNumber(payments?.producer_share).toFixed(0)}`}
            linkTo="/producer/payments"
            color="success"
          />
        </div>
      </div>

      {/* Follower Chart — PRO+ */}
      <LockedFeature requiredPlan="PRO" featureName="follower-chart">
        <FollowerGrowthChart />
      </LockedFeature>

      {/* Quick Actions - Mobile: List, Desktop: Grid */}
      <div className="md:hidden">
        <QuickActionsMobile 
          actions={quickActions}
          title={t('producer.quickActions')}
        />
      </div>
      
      {/* Desktop Quick Actions */}
      <div className="hidden md:block dashboard-card p-6">
        <h2 className="text-lg font-semibold text-stone-950 mb-4">
          {t('producer.quickActions')}
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {quickActions.map((action, idx) => (
            <Link
              key={idx}
              to={action.to}
              className="flex items-center gap-3 p-4 rounded-lg border border-stone-200 hover:border-stone-400 hover:bg-stone-50 transition-colors"
              data-testid={`desktop-quick-action-${idx}`}
            >
              <div 
                className="p-2.5 rounded-lg"
                style={{ backgroundColor: action.bgColor }}
              >
                <action.icon className="w-5 h-5" style={{ color: action.iconColor }} />
              </div>
              <span className="font-medium text-stone-950">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
