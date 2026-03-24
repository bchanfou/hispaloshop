// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api/client';
import {
  Package, FileCheck, ShoppingBag, CreditCard,
  AlertCircle, Users, TrendingUp, Heart, Star,
  Zap, Target, ChevronRight, Loader2, ExternalLink, CheckCircle, Handshake,
  PenTool, FileText, Lock, KeyRound, ArrowUp, ArrowDown, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import PlanManager from '../../components/PlanManager';
import LockedFeature from '../../components/LockedFeature';
import { useTranslation } from 'react-i18next';
import HealthScoreHero from '../../components/dashboard/HealthScoreHero';
import StatCardMobile from '../../components/dashboard/StatCardMobile';
import QuickActionsMobile from '../../components/dashboard/QuickActionsMobile';
import { asNumber } from '../../utils/safe';

// ===== TREND BADGE =====
function TrendBadge({ trend }) {
  if (trend === null || trend === undefined || trend === 0) return null;
  const isUp = trend > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${isUp ? 'text-stone-950' : 'text-stone-500'}`}
    >
      {isUp ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      {Math.abs(trend).toFixed(1)}%
    </span>
  );
}

// Plan badge styling
function PlanBadge({ plan }) {
  const p = (plan || 'FREE').toUpperCase();
  let tw;
  if (p === 'ELITE') { tw = 'bg-stone-950 text-white'; }
  else if (p === 'PRO') { tw = 'bg-stone-100 text-stone-950'; }
  else { tw = 'bg-stone-100 text-stone-500'; }
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${tw}`}>{p}</span>
  );
}

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
      <div className="p-4 md:p-6 bg-white shadow-sm rounded-2xl">
        <div className="animate-pulse space-y-3">
          <div className="w-1/2 h-3.5 rounded-md bg-stone-100" />
          <div className="w-[70%] h-3 rounded-md bg-stone-100" />
        </div>
      </div>
    );
  }

  const isConnected = Boolean(stripeStatus?.onboarding_completed && stripeStatus?.charges_enabled);
  const isPending = Boolean(stripeStatus?.has_account && !stripeStatus?.onboarding_completed);
  const pendingRequirements = stripeStatus?.requirements_due || [];

  return (
    <div
      className="p-4 md:p-6 bg-stone-100 shadow-sm rounded-2xl"
      data-testid="stripe-connect-section"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-white">
            <CreditCard className="w-5 h-5 text-stone-500" />
          </div>
          <div>
            <h3 className="font-medium text-stone-950">Stripe Payouts</h3>
            <p className="text-sm flex items-center gap-1.5 mt-0.5">
              {isConnected ? (
                <span className="inline-flex items-center gap-1 text-stone-700">
                  <CheckCircle className="w-4 h-4" />
                  Stripe conectado
                </span>
              ) : isPending ? (
                <span className="inline-flex items-center gap-1 text-stone-500">
                  <AlertTriangle className="w-4 h-4" />
                  Verificación pendiente
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-stone-500">
                  <AlertCircle className="w-4 h-4" />
                  Sin conectar
                </span>
              )}
            </p>
            <p className="text-xs mt-1 text-stone-500">
              {isConnected
                ? 'Recibirás tu porcentaje de cada venta automáticamente según tu plan.'
                : isPending
                  ? 'Completa la verificación en Stripe para activar los pagos automáticos.'
                  : 'Conecta Stripe para recibir pagos.'}
            </p>
            {!isConnected && pendingRequirements.length > 0 && (
              <p className="text-xs mt-1 text-stone-500">
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
              className="flex items-center gap-2 px-3 py-1.5 text-sm transition-colors border border-stone-200 rounded-xl text-stone-500 bg-white"
              data-testid="view-stripe-dashboard"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">Ver Dashboard</span>
            </button>
          ) : isPending ? (
            <Link
              to="/producer/connect"
              className="flex items-center gap-2 px-3 py-1.5 text-sm transition-colors bg-stone-950 text-white rounded-xl"
              data-testid="complete-stripe-verification"
            >
              Completar verificación
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleConnectStripe}
              disabled={connecting}
              className="flex items-center gap-2 px-3 py-1.5 text-sm transition-colors disabled:opacity-50 bg-stone-950 text-white rounded-xl"
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
    } catch {
      // handled silently
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

  if (!healthData) return (
    <div className="rounded-2xl bg-stone-100 p-6 text-center">
      <p className="text-sm text-stone-500">No hay datos suficientes todavía</p>
    </div>
  );

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
          <div className="p-3 text-center bg-white shadow-sm rounded-2xl">
            <div className="text-xl font-bold text-stone-950">{healthData.metrics.orders_30d}</div>
            <div className="text-[10px] uppercase tracking-wider text-stone-500">{t('customerDashboard.orders', 'Pedidos')}</div>
          </div>
          <div className="p-3 text-center bg-white shadow-sm rounded-2xl">
            <div className="text-xl font-bold text-stone-950">€{asNumber(healthData.metrics.revenue_30d).toFixed(0)}</div>
            <div className="text-[10px] uppercase tracking-wider text-stone-500">Ventas</div>
          </div>
          <div className="p-3 text-center bg-white shadow-sm rounded-2xl">
            <div className="flex items-center justify-center gap-1">
              <Star className="w-4 h-4 text-stone-500" />
              <span className="text-xl font-bold text-stone-950">{healthData.metrics.avg_rating || '-'}</span>
            </div>
            <div className="text-[10px] uppercase tracking-wider text-stone-500">{healthData.metrics.review_count} Reseñas</div>
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

// Desktop health score
function DesktopHealthScore({ healthData, t }) {
  return (
    <div className="p-6 bg-stone-100 shadow-sm rounded-2xl">
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
          <div className="text-sm font-medium text-stone-500">
            {healthData.status_label}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="h-3 rounded-full overflow-hidden bg-white">
          <div
            className="h-full transition-all duration-500 bg-stone-950 rounded-full"
            style={{ width: `${healthData.total_score}%` }}
          />
        </div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {Object.entries(healthData.breakdown).map(([key, item]) => (
          <div key={key} className="p-3 text-center bg-white rounded-xl">
            <div className="text-lg font-bold text-stone-950">{item.score}</div>
            <div className="text-xs text-stone-500">/{item.max}</div>
            <div className="text-xs font-medium mt-1 text-stone-500">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Metrics Summary */}
      <div className="grid grid-cols-3 gap-4 py-4 border-t border-b border-stone-200">
        <div className="text-center">
          <div className="text-xl font-bold text-stone-950">{healthData.metrics.orders_30d}</div>
          <div className="text-xs text-stone-500">{t('producer.healthScore.orders30d')}</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-stone-950">€{(healthData.metrics.revenue_30d ?? 0).toFixed(0)}</div>
          <div className="text-xs text-stone-500">{t('producer.healthScore.revenue30d')}</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Star className="w-4 h-4 text-stone-500" />
            <span className="text-xl font-bold text-stone-950">{healthData.metrics.avg_rating || '-'}</span>
          </div>
          <div className="text-xs text-stone-500">{healthData.metrics.review_count} {t('producer.healthScore.reviews')}</div>
        </div>
      </div>

      {/* Recommendations */}
      {healthData.recommendations?.length > 0 && (
        <div className="mt-4">
          <h3 className="font-medium mb-3 flex items-center gap-2 text-stone-950">
            <Target className="w-4 h-4" />
            {t('producer.healthScore.recommendations')}
          </h3>
          <div className="space-y-2">
            {healthData.recommendations.map((rec, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 bg-white rounded-xl border-l-4 border-stone-200"
              >
                <Zap className="w-4 h-4 mt-0.5 flex-shrink-0 text-stone-500" />
                <p className="text-sm text-stone-500">{rec.message}</p>
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
    setLoading(true);
    try {
      const data = await apiClient.get(`/producer/follower-stats?days=${days}`);
      setData(data?.chart_data || []);
    } catch {
      // handled silently
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 bg-white shadow-sm rounded-2xl">
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-stone-950" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-white shadow-sm rounded-2xl">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-stone-950" />
          <h2 className="font-medium text-sm md:text-base text-stone-950">
            {t('producer.followerGrowth.title')}
          </h2>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="text-xs md:text-sm px-2 md:px-3 py-1.5 border border-stone-200 rounded-xl bg-white text-stone-950"
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
                  <stop offset="5%" stopColor="#8A8881" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8A8881" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E2DA" />
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
                contentStyle={{ borderRadius: '12px', border: '1px solid #E5E2DA', fontSize: '12px' }}
                labelFormatter={(val) => new Date(val).toLocaleDateString()}
                formatter={(val, name) => [val, name === 'followers' ? 'Total' : 'Nuevos']}
              />
              <Area
                type="monotone"
                dataKey="followers"
                stroke="#0A0A0A"
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

// ===== B2B OPERATIONS SECTION =====
function B2BOperationsSection() {
  const [ops, setOps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/b2b/operations')
      .then((data) => setOps(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const active = ops.filter((o) => !['completed', 'disputed'].includes(o.status));
  const urgent = active.filter((o) =>
    ['contract_generated', 'payment_pending', 'contract_pending'].includes(o.status)
  );

  if (loading) return null;
  if (ops.length === 0) return null;

  return (
    <div className="bg-white shadow-sm rounded-2xl p-4 mb-1">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-stone-950">Operaciones B2B</h3>
        <Link to="/b2b/operations" className="text-xs font-semibold text-stone-500">
          Ver todas <ChevronRight className="w-3 h-3 inline" />
        </Link>
      </div>
      <div className="flex gap-3 mb-3">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 rounded-full text-xs">
          <span className="font-semibold text-stone-950">{active.length}</span>
          <span className="text-stone-500">activas</span>
        </div>
        {urgent.length > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 rounded-full text-xs">
            <span className="font-semibold text-stone-950">{urgent.length}</span>
            <span className="text-stone-500">pendientes</span>
          </div>
        )}
      </div>
      {active.slice(0, 3).map((op) => {
        const offer = op.offers?.[op.offers.length - 1] || {};
        return (
          <Link
            key={op.id}
            to={`/b2b/tracking/${op.id}`}
            className="flex items-center justify-between py-2.5 border-b border-stone-200 no-underline"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate text-stone-950">{offer.product_name || 'Operación B2B'}</p>
              <p className="text-xs text-stone-500">{offer.quantity} {offer.unit}</p>
            </div>
            <ChevronRight className="w-4 h-4 shrink-0 text-stone-500" />
          </Link>
        );
      })}
    </div>
  );
}

// ===== MAIN COMPONENT =====
export default function ProducerOverview() {
  const navigate = useNavigate();
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
  const [period, setPeriod] = useState('month');
  const [salesChart, setSalesChart] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [collabs, setCollabs] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch sales chart, alerts, collabs in parallel
  useEffect(() => {
    const logErr = () => () => {};
    apiClient.get('/producer/sales-chart').then(d => setSalesChart(d?.days || [])).catch(logErr('sales-chart'));
    apiClient.get('/producer/alerts').then(d => setAlerts(d || [])).catch(logErr('alerts'));
    apiClient.get('/verification/status').then(d => setVerificationStatus(d)).catch(logErr('verification'));
    apiClient.get('/collaborations').then(d => setCollabs(d?.collaborations || [])).catch(logErr('collaborations'));
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
    } catch {
      setError('Error al cargar datos. Por favor, refresca la página.');
    } finally {
      setLoading(false);
    }
  };

  const publicProfileUrl = user?.user_id ? `/user/${user.user_id}` : null;

  // Loading skeleton — mirrors the real dashboard layout for zero-layout-shift
  if (loading) {
    const Bone = ({ w = '100%', h = 14, r = 8, mb = 0 }) => (
      <div className="animate-pulse bg-stone-100" style={{ width: w, height: h, borderRadius: r, marginBottom: mb }} />
    );
    return (
      <div className="max-w-[975px] mx-auto space-y-4 px-4 py-4 md:px-6 md:py-6">
        {/* H1 skeleton */}
        <Bone w="55%" h={28} mb={4} />
        <Bone w="30%" h={14} mb={16} />
        {/* Stripe Connect card skeleton */}
        <div className="rounded-2xl shadow-sm p-5">
          <Bone w="40%" h={16} mb={12} />
          <Bone w="70%" h={12} />
        </div>
        {/* Stats grid skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="rounded-2xl shadow-sm p-4">
              <Bone w="60%" h={12} mb={8} />
              <Bone w="40%" h={24} />
            </div>
          ))}
        </div>
        {/* Quick actions skeleton */}
        <div className="grid grid-cols-2 gap-3">
          <Bone h={80} r={16} />
          <Bone h={80} r={16} />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <AlertCircle className="w-12 h-12 mb-4 text-stone-500" />
        <p className="mb-4 text-center text-stone-500">{error}</p>
        <button
          type="button"
          onClick={fetchData}
          className="px-4 py-2 transition-colors bg-stone-950 text-white rounded-xl"
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
      bgColor: 'bg-stone-950',
      iconColor: 'text-white',
      badge: stats?.pending_products > 0 ? stats.pending_products : 0,
    },
    {
      icon: FileCheck,
      label: t('producer.manageCertificates'),
      description: 'Certificaciones de calidad',
      to: '/producer/certificates',
      bgColor: 'bg-stone-100',
      iconColor: 'text-stone-500',
      badge: stats?.expiring_certs > 0 ? stats.expiring_certs : 0,
    },
    {
      icon: ShoppingBag,
      label: t('producer.viewOrders'),
      description: 'Gestionar pedidos',
      to: '/producer/orders',
      bgColor: 'bg-stone-100',
      iconColor: 'text-stone-500',
      badge: stats?.pending_orders > 0 ? stats.pending_orders : 0,
    },
    {
      icon: TrendingUp,
      label: 'Ver analíticas',
      description: 'Métricas y pagos',
      to: '/producer/payments',
      bgColor: 'bg-stone-100',
      iconColor: 'text-stone-500',
      badge: 0,
    },
  ];

  return (
    <div className="max-w-[975px] mx-auto space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-stone-950" data-testid="producer-title">
            {user?.company_name || user?.name}
          </h1>
          <PlanBadge plan={user?.plan} />
        </div>
        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex p-0.5 rounded-2xl shadow-sm bg-white">
            {[
              { key: 'today', label: 'Hoy' },
              { key: 'week', label: 'Semana' },
              { key: 'month', label: 'Mes' },
            ].map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors rounded-xl ${period === p.key ? 'bg-stone-950 text-white' : 'bg-transparent text-stone-500'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {publicProfileUrl && (
            <Link
              to={publicProfileUrl}
              className="shrink-0 hidden md:inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors border border-stone-200 bg-white text-stone-500"
              data-testid="view-public-profile"
            >
              <Users className="h-4 w-4" />
              Ver perfil
            </Link>
          )}
        </div>
      </div>
      {/* Pending orders alert — prominent top card */}
      {stats?.pending_orders > 0 && (
        <div className="bg-stone-950 text-white rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">{stats.pending_orders} pedido{stats.pending_orders > 1 ? 's' : ''} pendiente{stats.pending_orders > 1 ? 's' : ''}</p>
            <p className="text-xs text-white/70">Requieren tu atención</p>
          </div>
          <button
            onClick={() => navigate('/producer/orders?filter=pending')}
            className="text-xs bg-white text-stone-950 px-3 py-1.5 rounded-full font-medium"
          >
            Ver →
          </button>
        </div>
      )}

      {/* Verification banners */}
      {verificationStatus && !verificationStatus.is_verified && (
        <Link
          to="/producer/verification"
          className="flex items-start gap-3 p-4 transition-colors rounded-2xl bg-stone-100 border border-stone-500"
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-stone-500" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-stone-500">Cuenta no verificada</p>
            <p className="text-xs mt-0.5 text-stone-500">No puedes publicar productos hasta completar la verificación.</p>
          </div>
          <ChevronRight className="w-5 h-5 shrink-0 text-stone-500" />
        </Link>
      )}
      {verificationStatus?.is_verified && verificationStatus?.documents?.certificates?.some(c => {
        if (!c.expiry_date || c.status === 'expired') return false;
        return (new Date(c.expiry_date) - new Date()) / 86400000 <= 30;
      }) && (
        <Link
          to="/producer/verification"
          className="flex items-start gap-3 p-4 transition-colors rounded-2xl bg-stone-100 border border-stone-500"
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-stone-500" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-stone-500">Certificado próximo a caducar</p>
            <p className="text-xs mt-0.5 text-stone-500">Renuévalo para no interrumpir tus ventas.</p>
          </div>
          <ChevronRight className="w-5 h-5 shrink-0 text-stone-500" />
        </Link>
      )}
      {verificationStatus?.documents?.certificates?.some(c => c.status === 'expired') && (
        <Link
          to="/producer/verification"
          className="flex items-start gap-3 p-4 transition-colors rounded-2xl bg-stone-100 border border-stone-500"
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-stone-500" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-stone-500">Certificado caducado</p>
            <p className="text-xs mt-0.5 text-stone-500">Tus ventas pueden estar pausadas. Renueva ahora.</p>
          </div>
          <ChevronRight className="w-5 h-5 shrink-0 text-stone-500" />
        </Link>
      )}

      {dataWarnings.length > 0 && !error && (
        <div className="p-4 rounded-2xl shadow-sm bg-stone-100">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" />
            <div className="space-y-1 text-sm text-stone-500">
              {dataWarnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2" data-testid="producer-alerts">
          {alerts.map((alert, i) => (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-2xl bg-stone-100 ${alert.type === 'danger' ? 'border border-stone-500' : 'shadow-sm'}`}>
              <span className="text-lg shrink-0">{alert.type === 'danger' ? '\uD83D\uDEA8' : '\u26A0\uFE0F'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-stone-950">{alert.title}</p>
                <p className="text-xs text-stone-500">{alert.message}</p>
              </div>
              {alert.action_href && (
                <Link to={alert.action_href} className="shrink-0 text-xs font-bold hover:underline text-stone-950">
                  {alert.action_label || 'Ver'} →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Certificate expiry alert */}
      {stats?.expiring_certs > 0 && (
        <Link
          to="/producer/certificates"
          className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-700"
          data-testid="cert-expiry-alert"
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{stats.expiring_certs} certificado{stats.expiring_certs > 1 ? 's' : ''} expira{stats.expiring_certs > 1 ? 'n' : ''} pronto</span>
          <span className="text-xs font-semibold shrink-0">Revisar →</span>
        </Link>
      )}

      {/* Top 3 products this week */}
      {stats?.top_products?.length > 0 && (
        <div data-testid="top-products-week">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">Top productos esta semana</p>
          <div className="flex gap-3 overflow-x-auto">
            {stats.top_products.slice(0, 3).map((tp, i) => (
              <div key={tp.product_id || i} className="flex items-center gap-2 rounded-xl shadow-sm p-2 min-w-0 shrink-0">
                {tp.image && (
                  <img src={tp.image} alt={tp.name} className="w-10 h-10 rounded-xl object-cover shrink-0" loading="lazy" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-950 truncate">{tp.name}</p>
                  <p className="text-xs text-stone-500">{tp.sales_count} venta{tp.sales_count !== 1 ? 's' : ''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions — 2 Big Buttons */}
      <div className="grid grid-cols-2 gap-3" data-testid="quick-actions">
        {/* "Publicar nuevo producto" — THE ONLY GREEN BUTTON */}
        <Link to="/producer/products" className="flex flex-col items-center justify-center gap-2 p-5 transition-all hover:scale-[1.02] active:scale-[0.98] bg-stone-950 text-white rounded-2xl" data-testid="quick-add-product">
          <Package className="w-8 h-8" />
          <span className="text-sm font-semibold">{t('sellerDashboard.newProduct', 'Publicar nuevo producto')}</span>
        </Link>
        <Link to="/producer/orders" className="relative flex flex-col items-center justify-center gap-2 p-5 transition-all hover:scale-[1.02] bg-white shadow-sm rounded-2xl" data-testid="quick-orders">
          <ShoppingBag className="w-8 h-8 text-stone-950" />
          <span className="text-sm font-semibold text-stone-950">{t('customerDashboard.orders', 'Pedidos')}</span>
          {stats?.pending_orders > 0 && <span className="absolute top-3 right-3 text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full bg-stone-950 text-white">{stats.pending_orders}</span>}
        </Link>
      </div>

      {/* Demand Signals Section */}
      <section className="p-5 rounded-2xl shadow-sm bg-white">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-medium text-stone-950">Señales de demanda</h2>
            <p className="mt-1 text-sm text-stone-500">Ingredientes, productos y piezas de contenido con más intención de compra.</p>
          </div>
          <Target className="h-5 w-5 text-stone-500" />
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="p-4 rounded-2xl shadow-sm bg-stone-100">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Ingredientes en tendencia</p>
            <div className="mt-3 space-y-2">
              {(demandSignals.trending_ingredients || []).slice(0, 4).map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm text-stone-950">
                  <span>{item.name}</span>
                  <span className="text-stone-500">{item.count}</span>
                </div>
              ))}
              {!(demandSignals.trending_ingredients || []).length ? <p className="text-sm text-stone-500">Sin datos todavía.</p> : null}
            </div>
          </div>
          <div className="p-4 rounded-2xl shadow-sm bg-stone-100">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Productos más etiquetados</p>
            <div className="mt-3 space-y-2">
              {(demandSignals.most_tagged_products || []).slice(0, 4).map((item) => (
                <div key={item.product_id} className="flex items-center justify-between gap-3 text-sm text-stone-950">
                  <span className="truncate">{item.name}</span>
                  <span className="text-stone-500">{item.count}</span>
                </div>
              ))}
              {!(demandSignals.most_tagged_products || []).length ? <p className="text-sm text-stone-500">Sin etiquetas suficientes.</p> : null}
            </div>
          </div>
          <div className="p-4 rounded-2xl shadow-sm bg-stone-100">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Contenido que impulsa ventas</p>
            <div className="mt-3 space-y-2">
              {(demandSignals.content_driving_sales || []).slice(0, 4).map((item) => (
                <div key={`${item.content_type}-${item.content_id}`} className="flex items-center justify-between text-sm text-stone-950">
                  <span className="capitalize">{item.content_type}</span>
                  <span className="text-stone-500">{item.score}</span>
                </div>
              ))}
              {!(demandSignals.content_driving_sales || []).length ? <p className="text-sm text-stone-500">Aún no hay conversiones atribuidas.</p> : null}
            </div>
          </div>
        </div>
      </section>

      {/* KPIs grid 2x2 */}
      {(() => {
        const grossCurr = asNumber(payments?.total_gross);
        const grossPrev = asNumber(payments?.total_gross_prev);
        const revTrend = grossPrev > 0 ? ((grossCurr - grossPrev) / grossPrev) * 100 : null;

        const ordersCurr = asNumber(payments?.total_orders_current || payments?.pending_orders);
        const ordersPrev = asNumber(payments?.total_orders_prev);
        const ordersTrend = ordersPrev > 0 ? ((ordersCurr - ordersPrev) / ordersPrev) * 100 : null;

        const visitsCurr = asNumber(payments?.visits_current || stats?.visits_current);
        const visitsPrev = asNumber(payments?.visits_prev || stats?.visits_prev);
        const visitsTrend = visitsPrev > 0 ? ((visitsCurr - visitsPrev) / visitsPrev) * 100 : null;

        const kpis = [
          {
            label: t('sellerDashboard.totalSales', 'Ventas'),
            value: `${grossCurr.toFixed(0)}€`,
            trend: revTrend,
          },
          {
            label: t('customerDashboard.orders', 'Pedidos'),
            value: payments?.pending_orders || 0,
            trend: ordersTrend,
          },
          {
            label: 'Visitas',
            value: visitsCurr > 0 ? visitsCurr : '—',
            trend: visitsTrend,
          },
          {
            label: 'Conversión',
            value: '—',
            trend: null,
          },
        ];
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {kpis.map((kpi, i) => (
              <div key={i} className="p-4 text-center bg-white shadow-sm rounded-2xl">
                <p className="text-2xl font-bold text-stone-950">{kpi.value}</p>
                <p className="text-[10px] uppercase mt-1 text-stone-500">{kpi.label}</p>
                {kpi.trend !== null && (
                  <div className="mt-1 flex justify-center">
                    <TrendBadge trend={kpi.trend} />
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })()}

      {/* Net earnings */}
      <div className="p-4 text-center bg-white shadow-sm rounded-2xl">
        <p className="text-2xl font-bold text-stone-950">{asNumber(payments?.total_net).toFixed(0)}€</p>
        <p className="text-[10px] uppercase mt-1 text-stone-500">{t('sellerDashboard.earned', 'Ganado neto')}</p>
      </div>

      {/* Sales Chart — 30 days */}
      {salesChart.length > 0 && (
        <div className="p-4 bg-white shadow-sm rounded-2xl" data-testid="sales-chart">
          <p className="text-sm font-bold mb-4 text-stone-950">Ventas — últimos 30 días</p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={salesChart} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid stroke="#E5E2DA" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#8A8881' }}
                tickLine={false} axisLine={false}
                tickFormatter={d => new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).slice(0, 5)}
                interval={4}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#8A8881' }}
                tickLine={false} axisLine={false}
                tickFormatter={v => `${v}€`}
              />
              <Tooltip
                contentStyle={{ background: '#0A0A0A', border: 'none', borderRadius: 12, fontSize: 12, color: 'white' }}
                formatter={(v) => [`${Number(v).toFixed(2)}€`, 'Ventas']}
                labelFormatter={d => new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
              />
              <Line type="monotone" dataKey="revenue" stroke="#0A0A0A" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Plan Manager */}
      <PlanManager />

      {/* Low Stock Alert */}
      {stats?.low_stock_products?.length > 0 && (
        <div className="p-4 rounded-2xl shadow-sm bg-stone-100" data-testid="low-stock-alert">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-stone-500" />
            <span className="text-sm font-semibold text-stone-950">{stats.low_stock_products.length} {t('sellerDashboard.lowStockAlert')}</span>
          </div>
          <div className="space-y-1">
            {stats.low_stock_products.slice(0, 3).map(p => (
              <Link key={p.product_id} to={`/producer/products`} className="flex items-center justify-between text-xs py-1.5 first:border-0 border-t border-stone-200">
                <span className="truncate flex-1 text-stone-500">{p.name}</span>
                <span className="font-bold ml-2 text-stone-950">{p.stock} uds</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Reviews */}
      {stats?.recent_reviews?.length > 0 && (
        <div className="p-4 bg-white shadow-sm rounded-2xl" data-testid="recent-reviews">
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 text-stone-500">{t('sellerDashboard.latestReviews')}</h3>
          <div className="space-y-2">
            {stats.recent_reviews.slice(0, 3).map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <div className="flex items-center gap-0.5 px-1.5 py-0.5 shrink-0 bg-stone-100 rounded-xl text-stone-500">
                  <Star className="w-3 h-3 text-stone-500" /> {r.rating}
                </div>
                <p className="line-clamp-2 text-stone-500">{r.comment || t('sellerDashboard.noComment')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Warning */}
      {isPending && (
        <div className="p-4 shadow-sm bg-stone-100 rounded-2xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5 text-stone-500" />
            <div>
              <h3 className="font-medium text-stone-950">{t('producer.accountPending')}</h3>
              <p className="text-sm text-stone-500">{t('producer.accountPendingDesc')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Active Collaborations */}
      {collabs.length > 0 && (
        <section className="p-5 rounded-2xl shadow-sm bg-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Handshake className="w-5 h-5 text-stone-500" />
              <h2 className="text-lg font-medium text-stone-950">Colaboraciones</h2>
            </div>
            <Link to="/messages" className="text-xs font-medium flex items-center gap-1 text-stone-500">
              Ver todas <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-2">
            {collabs.slice(0, 5).map(c => {
              const proposal = c.proposal || {};
              const statusStyles = {
                proposed: { label: 'Pendiente', tw: 'bg-stone-100 text-stone-500' },
                active: { label: 'Activa', tw: 'bg-stone-100 text-stone-950' },
                declined: { label: 'Rechazada', tw: 'bg-stone-100 text-stone-500' },
                sample_sent: { label: 'Muestra enviada', tw: 'bg-stone-100 text-stone-500' },
                sample_received: { label: 'Muestra recibida', tw: 'bg-stone-100 text-stone-950' },
              };
              const badge = statusStyles[c.status] || statusStyles.proposed;
              const conversationId = c.conversation_id || c.id;
              return (
                <Link
                  key={c.collab_id}
                  to={conversationId ? `/messages/${conversationId}` : '/messages'}
                  className="flex items-center gap-3 p-3 transition-colors rounded-xl shadow-sm"
                >
                  {proposal.product_image_url && (
                    <img loading="lazy" src={proposal.product_image_url} alt="" className="w-10 h-10 rounded-2xl object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-stone-950">{proposal.product_name}</p>
                    <p className="text-xs text-stone-500">{proposal.commission_pct}% · {proposal.duration_days} días</p>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${badge.tw}`}>
                    {badge.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
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

      {/* B2B Operations — PRO+ */}
      <LockedFeature requiredPlan="PRO" featureName="b2b-operations">
        <B2BOperationsSection />
      </LockedFeature>

      {/* Quick Actions - Mobile: List, Desktop: Grid */}
      <div className="md:hidden">
        <QuickActionsMobile
          actions={quickActions}
          title={t('producer.quickActions')}
        />
      </div>

      {/* Desktop Quick Actions */}
      <div className="hidden md:block p-6 bg-white shadow-sm rounded-2xl">
        <h2 className="text-lg font-semibold mb-4 text-stone-950">
          {t('producer.quickActions')}
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {quickActions.slice(0, 4).map((action, idx) => (
            <Link
              key={idx}
              to={action.to}
              className="relative flex items-center gap-3 p-4 transition-colors rounded-xl shadow-sm bg-white"
              data-testid={`desktop-quick-action-${idx}`}
            >
              <div
                className={`p-2.5 rounded-xl ${action.bgColor}`}
              >
                <action.icon className={`w-5 h-5 ${action.iconColor}`} />
              </div>
              <span className="font-medium text-stone-950">{action.label}</span>
              {action.badge > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-stone-950 text-white text-[10px] flex items-center justify-center">
                  {action.badge}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* Account & Configuration */}
      <section className="p-5 rounded-2xl shadow-sm bg-white">
        <h2 className="text-sm font-bold mb-3 text-stone-950">Cuenta y configuración</h2>
        <div className="space-y-1">
          {[
            {
              icon: PenTool,
              label: 'Firma digital',
              sublabel: user?.signature_url ? 'Configurada' : 'Pendiente',
              sublabelColor: user?.signature_url ? 'text-stone-950' : 'text-stone-500',
              to: '/settings/signature',
            },
            { icon: FileText, label: 'Mis documentos', sublabel: 'Contratos y certificados', to: '/documents' },
            { icon: CreditCard, label: 'Datos bancarios', sublabel: 'Stripe Connect', to: '/producer/connect' },
            { icon: KeyRound, label: 'Cambiar contraseña', sublabel: '', to: '/settings/password' },
          ].map((item, i) => (
            <Link
              key={i}
              to={item.to}
              className="flex items-center gap-3 p-3 transition-colors rounded-xl"
            >
              <div className="w-8 h-8 flex items-center justify-center shrink-0 rounded-xl bg-stone-100">
                <item.icon className="w-4 h-4 text-stone-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-950">{item.label}</p>
                {item.sublabel && (
                  <p className={`text-[11px] ${item.sublabelColor || 'text-stone-500'}`}>{item.sublabel}</p>
                )}
              </div>
              <ChevronRight className="w-4 h-4 shrink-0 text-stone-500" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
