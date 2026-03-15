import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api/client';
import {
  Package, FileCheck, ShoppingBag, CreditCard,
  AlertCircle, Users, TrendingUp, Heart, Star,
  Zap, Target, ChevronRight, Loader2, ExternalLink, CheckCircle, Handshake,
  PenTool, FileText, Lock, KeyRound
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

// Plan badge styling
function PlanBadge({ plan }) {
  const p = (plan || 'FREE').toUpperCase();
  let bg, color;
  if (p === 'ELITE') { bg = 'var(--color-amber-light)'; color = 'var(--color-amber)'; }
  else if (p === 'PRO') { bg = 'var(--color-green-light)'; color = 'var(--color-green)'; }
  else { bg = 'var(--color-surface)'; color = 'var(--color-stone)'; }
  return (
    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full" style={{ background: bg, color }}>{p}</span>
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
      <div className="p-4 md:p-6" style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }}>
        <div className="flex items-center gap-2" style={{ color: 'var(--color-stone)' }}>
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
      className="p-4 md:p-6"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }}
      data-testid="stripe-connect-section"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5" style={{ borderRadius: 'var(--radius-md)', background: 'var(--color-white)' }}>
            <CreditCard className="w-5 h-5" style={{ color: 'var(--color-stone)' }} />
          </div>
          <div>
            <h3 className="font-medium" style={{ color: 'var(--color-black)' }}>Stripe Payouts</h3>
            <p className="text-sm flex items-center gap-1" style={{ color: 'var(--color-stone)' }}>
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
            <p className="text-xs mt-1" style={{ color: 'var(--color-stone)' }}>
              {isConnected
                ? 'Recibirás tu porcentaje de cada venta automáticamente según tu plan.'
                : 'Conecta Stripe para recibir pagos.'}
            </p>
            {!isConnected && pendingRequirements.length > 0 && (
              <p className="text-xs mt-1" style={{ color: 'var(--color-stone)' }}>
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
              className="flex items-center gap-2 px-3 py-1.5 text-sm transition-colors"
              style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-stone)', background: 'var(--color-white)' }}
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
              className="flex items-center gap-2 px-3 py-1.5 text-sm transition-colors disabled:opacity-50"
              style={{ background: 'var(--color-black)', color: '#fff', borderRadius: 'var(--radius-md)' }}
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
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#fff' }} />
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
          <div className="p-3 text-center" style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }}>
            <div className="text-xl font-bold" style={{ color: 'var(--color-black)' }}>{healthData.metrics.orders_30d}</div>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-stone)' }}>{t('customerDashboard.orders', 'Pedidos')}</div>
          </div>
          <div className="p-3 text-center" style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }}>
            <div className="text-xl font-bold" style={{ color: 'var(--color-black)' }}>€{asNumber(healthData.metrics.revenue_30d).toFixed(0)}</div>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-stone)' }}>Ventas</div>
          </div>
          <div className="p-3 text-center" style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }}>
            <div className="flex items-center justify-center gap-1">
              <Star className="w-4 h-4" style={{ color: 'var(--color-stone)' }} />
              <span className="text-xl font-bold" style={{ color: 'var(--color-black)' }}>{healthData.metrics.avg_rating || '-'}</span>
            </div>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-stone)' }}>{healthData.metrics.review_count} Reviews</div>
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
    <div className="p-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Heart className="w-5 h-5" style={{ color: 'var(--color-stone)' }} />
            <h2 className="font-semibold" style={{ color: 'var(--color-black)' }}>{t('producer.healthScore.title')}</h2>
          </div>
          <p className="text-sm" style={{ color: 'var(--color-stone)' }}>{t('producer.healthScore.subtitle')}</p>
        </div>
        <div className="text-right">
          <div className="text-4xl font-bold" style={{ color: 'var(--color-black)' }}>{healthData.total_score}</div>
          <div className="text-sm font-medium" style={{ color: 'var(--color-stone)' }}>
            {healthData.status_label}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--color-white)' }}>
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${healthData.total_score}%`, background: 'var(--color-black)', borderRadius: 'var(--radius-full)' }}
          />
        </div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {Object.entries(healthData.breakdown).map(([key, item]) => (
          <div key={key} className="p-3 text-center" style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-md)' }}>
            <div className="text-lg font-bold" style={{ color: 'var(--color-black)' }}>{item.score}</div>
            <div className="text-xs" style={{ color: 'var(--color-stone)' }}>/{item.max}</div>
            <div className="text-xs font-medium mt-1" style={{ color: 'var(--color-stone)' }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Metrics Summary */}
      <div className="grid grid-cols-3 gap-4 py-4" style={{ borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="text-center">
          <div className="text-xl font-bold" style={{ color: 'var(--color-black)' }}>{healthData.metrics.orders_30d}</div>
          <div className="text-xs" style={{ color: 'var(--color-stone)' }}>{t('producer.healthScore.orders30d')}</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold" style={{ color: 'var(--color-black)' }}>€{healthData.metrics.revenue_30d.toFixed(0)}</div>
          <div className="text-xs" style={{ color: 'var(--color-stone)' }}>{t('producer.healthScore.revenue30d')}</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Star className="w-4 h-4" style={{ color: 'var(--color-stone)' }} />
            <span className="text-xl font-bold" style={{ color: 'var(--color-black)' }}>{healthData.metrics.avg_rating || '-'}</span>
          </div>
          <div className="text-xs" style={{ color: 'var(--color-stone)' }}>{healthData.metrics.review_count} {t('producer.healthScore.reviews')}</div>
        </div>
      </div>

      {/* Recommendations */}
      {healthData.recommendations?.length > 0 && (
        <div className="mt-4">
          <h3 className="font-medium mb-3 flex items-center gap-2" style={{ color: 'var(--color-black)' }}>
            <Target className="w-4 h-4" />
            {t('producer.healthScore.recommendations')}
          </h3>
          <div className="space-y-2">
            {healthData.recommendations.map((rec, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3"
                style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--color-border)' }}
              >
                <Zap className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--color-stone)' }} />
                <p className="text-sm" style={{ color: 'var(--color-stone)' }}>{rec.message}</p>
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
      <div className="p-4 md:p-6" style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }}>
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-black)' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6" style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }}>
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" style={{ color: 'var(--color-black)' }} />
          <h2 className="font-medium text-sm md:text-base" style={{ color: 'var(--color-black)' }}>
            {t('producer.followerGrowth.title')}
          </h2>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="text-xs md:text-sm px-2 md:px-3 py-1.5"
          style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-white)', color: 'var(--color-black)' }}
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
        <div className="flex flex-col items-center justify-center h-48" style={{ color: 'var(--color-stone)' }}>
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
    <div style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 16, marginBottom: 4 }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold" style={{ color: 'var(--color-black)' }}>Operaciones B2B</h3>
        <Link to="/b2b/operations" className="text-xs font-semibold" style={{ color: 'var(--color-stone)' }}>
          Ver todas <ChevronRight className="w-3 h-3 inline" />
        </Link>
      </div>
      <div className="flex gap-3 mb-3">
        <div className="flex items-center gap-1.5 px-3 py-1.5" style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-full)', fontSize: 12 }}>
          <span style={{ fontWeight: 600, color: 'var(--color-black)' }}>{active.length}</span>
          <span style={{ color: 'var(--color-stone)' }}>activas</span>
        </div>
        {urgent.length > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5" style={{ background: '#FEF3C7', borderRadius: 'var(--radius-full)', fontSize: 12 }}>
            <span style={{ fontWeight: 600, color: '#B45309' }}>{urgent.length}</span>
            <span style={{ color: '#B45309' }}>pendientes</span>
          </div>
        )}
      </div>
      {active.slice(0, 3).map((op) => {
        const offer = op.offers?.[op.offers.length - 1] || {};
        return (
          <Link
            key={op.id}
            to={`/b2b/tracking/${op.id}`}
            className="flex items-center justify-between py-2.5"
            style={{ borderBottom: '1px solid var(--color-border)', textDecoration: 'none' }}
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-black)' }}>{offer.product_name || 'Operación B2B'}</p>
              <p className="text-xs" style={{ color: 'var(--color-stone)' }}>{offer.quantity} {offer.unit}</p>
            </div>
            <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--color-stone)' }} />
          </Link>
        );
      })}
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
    apiClient.get('/producer/sales-chart').then(d => setSalesChart(d?.days || [])).catch(() => {});
    apiClient.get('/producer/alerts').then(d => setAlerts(d || [])).catch(() => {});
    apiClient.get('/verification/status').then(d => setVerificationStatus(d)).catch(() => {});
    apiClient.get('/collaborations').then(d => setCollabs(d?.collaborations || [])).catch(() => {});
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
          <div className="w-8 h-8 rounded-full animate-spin mx-auto mb-4" style={{ border: '2px solid var(--color-black)', borderTopColor: 'transparent' }} />
          <p className="text-sm" style={{ color: 'var(--color-stone)' }}>{t('producer.loadingDashboard')}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <AlertCircle className="w-12 h-12 mb-4" style={{ color: 'var(--color-stone)' }} />
        <p className="mb-4 text-center" style={{ color: 'var(--color-stone)' }}>{error}</p>
        <button
          type="button"
          onClick={fetchData}
          className="px-4 py-2 transition-colors"
          style={{ background: 'var(--color-black)', color: '#fff', borderRadius: 'var(--radius-md)' }}
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
      bgColor: 'var(--color-black)',
      iconColor: '#fff'
    },
    {
      icon: FileCheck,
      label: t('producer.manageCertificates'),
      description: 'Certificaciones de calidad',
      to: '/producer/certificates',
      bgColor: 'var(--color-surface)',
      iconColor: 'var(--color-stone)'
    },
    {
      icon: ShoppingBag,
      label: t('producer.viewOrders'),
      description: 'Gestionar pedidos',
      to: '/producer/orders',
      bgColor: 'var(--color-surface)',
      iconColor: 'var(--color-stone)'
    },
  ];

  return (
    <div className="space-y-4 md:space-y-6" style={{ fontFamily: 'var(--font-sans)' }}>
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight" style={{ color: 'var(--color-black)' }} data-testid="producer-title">
            {user?.company_name || user?.name}
          </h1>
          <PlanBadge plan={user?.plan} />
        </div>
        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex p-0.5" style={{ borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', background: 'var(--color-white)' }}>
            {[
              { key: 'today', label: 'Hoy' },
              { key: 'week', label: 'Semana' },
              { key: 'month', label: 'Mes' },
            ].map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className="px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  borderRadius: 'var(--radius-md)',
                  background: period === p.key ? 'var(--color-black)' : 'transparent',
                  color: period === p.key ? '#fff' : 'var(--color-stone)',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          {publicProfileUrl && (
            <Link
              to={publicProfileUrl}
              className="shrink-0 hidden md:inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors"
              style={{ border: '1px solid var(--color-border)', background: 'var(--color-white)', color: 'var(--color-stone)' }}
              data-testid="view-public-profile"
            >
              <Users className="h-4 w-4" />
              Ver perfil
            </Link>
          )}
        </div>
      </div>
      {/* Verification banners */}
      {verificationStatus && !verificationStatus.is_verified && (
        <Link
          to="/producer/verification"
          className="flex items-start gap-3 p-4 transition-colors"
          style={{ borderRadius: 'var(--radius-xl)', background: 'var(--color-amber-light)', border: '1px solid var(--color-amber)' }}
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--color-amber)' }} />
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--color-amber)' }}>Cuenta no verificada</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-amber)' }}>No puedes publicar productos hasta completar la verificación.</p>
          </div>
          <ChevronRight className="w-5 h-5 shrink-0" style={{ color: 'var(--color-amber)' }} />
        </Link>
      )}
      {verificationStatus?.is_verified && verificationStatus?.documents?.certificates?.some(c => {
        if (!c.expiry_date || c.status === 'expired') return false;
        return (new Date(c.expiry_date) - new Date()) / 86400000 <= 30;
      }) && (
        <Link
          to="/producer/verification"
          className="flex items-start gap-3 p-4 transition-colors"
          style={{ borderRadius: 'var(--radius-xl)', background: 'var(--color-amber-light)', border: '1px solid var(--color-amber)' }}
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--color-amber)' }} />
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--color-amber)' }}>Certificado próximo a caducar</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-amber)' }}>Renuévalo para no interrumpir tus ventas.</p>
          </div>
          <ChevronRight className="w-5 h-5 shrink-0" style={{ color: 'var(--color-amber)' }} />
        </Link>
      )}
      {verificationStatus?.documents?.certificates?.some(c => c.status === 'expired') && (
        <Link
          to="/producer/verification"
          className="flex items-start gap-3 p-4 transition-colors"
          style={{ borderRadius: 'var(--radius-xl)', background: 'var(--color-red-light)', border: '1px solid var(--color-red)' }}
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--color-red)' }} />
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--color-red)' }}>Certificado caducado</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-red)' }}>Tus ventas pueden estar pausadas. Renueva ahora.</p>
          </div>
          <ChevronRight className="w-5 h-5 shrink-0" style={{ color: 'var(--color-red)' }} />
        </Link>
      )}

      {dataWarnings.length > 0 && !error && (
        <div className="p-4" style={{ borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--color-stone)' }} />
            <div className="space-y-1 text-sm" style={{ color: 'var(--color-stone)' }}>
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
            <div key={i} className="flex items-start gap-3 p-3" style={{
              borderRadius: 'var(--radius-xl)',
              background: alert.type === 'danger' ? 'var(--color-red-light)' : 'var(--color-surface)',
              border: `1px solid ${alert.type === 'danger' ? 'var(--color-red)' : 'var(--color-border)'}`,
            }}>
              <span className="text-lg shrink-0">{alert.type === 'danger' ? '\uD83D\uDEA8' : '\u26A0\uFE0F'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--color-black)' }}>{alert.title}</p>
                <p className="text-xs" style={{ color: 'var(--color-stone)' }}>{alert.message}</p>
              </div>
              {alert.action_href && (
                <Link to={alert.action_href} className="shrink-0 text-xs font-bold hover:underline" style={{ color: 'var(--color-black)' }}>
                  {alert.action_label || 'Ver'} →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Quick Actions — 2 Big Buttons */}
      <div className="grid grid-cols-2 gap-3" data-testid="quick-actions">
        {/* "Publicar nuevo producto" — THE ONLY GREEN BUTTON */}
        <Link to="/producer/products" className="flex flex-col items-center justify-center gap-2 p-5 transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ background: 'var(--color-green)', color: '#fff', borderRadius: 'var(--radius-xl)' }} data-testid="quick-add-product">
          <Package className="w-8 h-8" />
          <span className="text-sm font-semibold">{t('sellerDashboard.newProduct', 'Publicar nuevo producto')}</span>
        </Link>
        <Link to="/producer/orders" className="relative flex flex-col items-center justify-center gap-2 p-5 transition-all hover:scale-[1.02]" style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }} data-testid="quick-orders">
          <ShoppingBag className="w-8 h-8" style={{ color: 'var(--color-black)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--color-black)' }}>{t('customerDashboard.orders', 'Pedidos')}</span>
          {stats?.pending_orders > 0 && <span className="absolute top-3 right-3 text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full" style={{ background: 'var(--color-black)', color: '#fff' }}>{stats.pending_orders}</span>}
        </Link>
      </div>

      {/* Demand Signals Section */}
      <section className="p-5" style={{ borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', background: 'var(--color-white)' }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-medium" style={{ color: 'var(--color-black)' }}>Señales de demanda</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-stone)' }}>Ingredientes, productos y piezas de contenido con más intención de compra.</p>
          </div>
          <Target className="h-5 w-5" style={{ color: 'var(--color-stone)' }} />
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="p-4" style={{ borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
            <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--color-stone)' }}>Trending ingredients</p>
            <div className="mt-3 space-y-2">
              {(demandSignals.trending_ingredients || []).slice(0, 4).map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm" style={{ color: 'var(--color-black)' }}>
                  <span>{item.name}</span>
                  <span style={{ color: 'var(--color-stone)' }}>{item.count}</span>
                </div>
              ))}
              {!(demandSignals.trending_ingredients || []).length ? <p className="text-sm" style={{ color: 'var(--color-stone)' }}>Sin datos todavía.</p> : null}
            </div>
          </div>
          <div className="p-4" style={{ borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
            <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--color-stone)' }}>Most tagged products</p>
            <div className="mt-3 space-y-2">
              {(demandSignals.most_tagged_products || []).slice(0, 4).map((item) => (
                <div key={item.product_id} className="flex items-center justify-between gap-3 text-sm" style={{ color: 'var(--color-black)' }}>
                  <span className="truncate">{item.name}</span>
                  <span style={{ color: 'var(--color-stone)' }}>{item.count}</span>
                </div>
              ))}
              {!(demandSignals.most_tagged_products || []).length ? <p className="text-sm" style={{ color: 'var(--color-stone)' }}>Sin etiquetas suficientes.</p> : null}
            </div>
          </div>
          <div className="p-4" style={{ borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
            <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--color-stone)' }}>Content driving sales</p>
            <div className="mt-3 space-y-2">
              {(demandSignals.content_driving_sales || []).slice(0, 4).map((item) => (
                <div key={`${item.content_type}-${item.content_id}`} className="flex items-center justify-between text-sm" style={{ color: 'var(--color-black)' }}>
                  <span className="capitalize">{item.content_type}</span>
                  <span style={{ color: 'var(--color-stone)' }}>{item.score}</span>
                </div>
              ))}
              {!(demandSignals.content_driving_sales || []).length ? <p className="text-sm" style={{ color: 'var(--color-stone)' }}>Aún no hay conversiones atribuidas.</p> : null}
            </div>
          </div>
        </div>
      </section>

      {/* KPIs grid 2x2 */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: t('sellerDashboard.totalSales', 'Ventas'), value: `${asNumber(payments?.total_gross).toFixed(0)}€`, comp: null },
          { label: t('customerDashboard.orders', 'Pedidos'), value: payments?.pending_orders || 0, comp: null },
          { label: 'Visitas', value: '—', comp: null },
          { label: 'Conversión', value: '—', comp: null },
        ].map((kpi, i) => (
          <div key={i} className="p-4 text-center" style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }}>
            <p className="text-2xl font-bold" style={{ color: 'var(--color-black)' }}>{kpi.value}</p>
            <p className="text-[10px] uppercase mt-1" style={{ color: 'var(--color-stone)' }}>{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Net earnings */}
      <div className="p-4 text-center" style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }}>
        <p className="text-2xl font-bold" style={{ color: 'var(--color-black)' }}>{asNumber(payments?.total_net).toFixed(0)}€</p>
        <p className="text-[10px] uppercase mt-1" style={{ color: 'var(--color-stone)' }}>{t('sellerDashboard.earned', 'Ganado neto')}</p>
      </div>

      {/* Sales Chart — 30 days */}
      {salesChart.length > 0 && (
        <div className="p-4" style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }} data-testid="sales-chart">
          <p className="text-sm font-bold mb-4" style={{ color: 'var(--color-black)' }}>Ventas — últimos 30 días</p>
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
        <div className="p-4" style={{ borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', background: 'var(--color-surface)' }} data-testid="low-stock-alert">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4" style={{ color: 'var(--color-stone)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--color-black)' }}>{stats.low_stock_products.length} {t('sellerDashboard.lowStockAlert')}</span>
          </div>
          <div className="space-y-1">
            {stats.low_stock_products.slice(0, 3).map(p => (
              <Link key={p.product_id} to={`/producer/products`} className="flex items-center justify-between text-xs py-1.5 first:border-0" style={{ borderTop: '1px solid var(--color-border)' }}>
                <span className="truncate flex-1" style={{ color: 'var(--color-stone)' }}>{p.name}</span>
                <span className="font-bold ml-2" style={{ color: 'var(--color-black)' }}>{p.stock} uds</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Reviews */}
      {stats?.recent_reviews?.length > 0 && (
        <div className="p-4" style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }} data-testid="recent-reviews">
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-stone)' }}>{t('sellerDashboard.latestReviews')}</h3>
          <div className="space-y-2">
            {stats.recent_reviews.slice(0, 3).map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <div className="flex items-center gap-0.5 px-1.5 py-0.5 shrink-0" style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', color: 'var(--color-stone)' }}>
                  <Star className="w-3 h-3" style={{ color: 'var(--color-stone)' }} /> {r.rating}
                </div>
                <p className="line-clamp-2" style={{ color: 'var(--color-stone)' }}>{r.comment || t('sellerDashboard.noComment')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Warning */}
      {isPending && (
        <div className="p-4" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)' }}>
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5" style={{ color: 'var(--color-stone)' }} />
            <div>
              <h3 className="font-medium" style={{ color: 'var(--color-black)' }}>{t('producer.accountPending')}</h3>
              <p className="text-sm" style={{ color: 'var(--color-stone)' }}>{t('producer.accountPendingDesc')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Active Collaborations */}
      {collabs.length > 0 && (
        <section className="p-5" style={{ borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', background: 'var(--color-white)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Handshake className="w-5 h-5" style={{ color: 'var(--color-stone)' }} />
              <h2 className="text-lg font-medium" style={{ color: 'var(--color-black)' }}>Colaboraciones</h2>
            </div>
            <Link to="/messages" className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--color-stone)' }}>
              Ver todas <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-2">
            {collabs.slice(0, 5).map(c => {
              const proposal = c.proposal || {};
              const statusStyles = {
                proposed: { label: 'Pendiente', bg: 'var(--color-surface)', color: 'var(--color-stone)' },
                active: { label: 'Activa', bg: 'var(--color-green-light)', color: 'var(--color-green)' },
                declined: { label: 'Rechazada', bg: 'var(--color-red-light)', color: 'var(--color-red)' },
                sample_sent: { label: 'Muestra enviada', bg: 'var(--color-surface)', color: 'var(--color-stone)' },
                sample_received: { label: 'Muestra recibida', bg: 'var(--color-green-light)', color: 'var(--color-green)' },
              };
              const badge = statusStyles[c.status] || statusStyles.proposed;
              return (
                <Link
                  key={c.collab_id}
                  to={`/messages/${c.conversation_id}`}
                  className="flex items-center gap-3 p-3 transition-colors"
                  style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                >
                  {proposal.product_image_url && (
                    <img src={proposal.product_image_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--color-black)' }}>{proposal.product_name}</p>
                    <p className="text-xs" style={{ color: 'var(--color-stone)' }}>{proposal.commission_pct}% · {proposal.duration_days} días</p>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0" style={{ background: badge.bg, color: badge.color }}>
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
      <div className="hidden md:block p-6" style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }}>
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-black)' }}>
          {t('producer.quickActions')}
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {quickActions.map((action, idx) => (
            <Link
              key={idx}
              to={action.to}
              className="flex items-center gap-3 p-4 transition-colors"
              style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-white)' }}
              data-testid={`desktop-quick-action-${idx}`}
            >
              <div
                className="p-2.5"
                style={{ backgroundColor: action.bgColor, borderRadius: 'var(--radius-md)' }}
              >
                <action.icon className="w-5 h-5" style={{ color: action.iconColor }} />
              </div>
              <span className="font-medium" style={{ color: 'var(--color-black)' }}>{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Account & Configuration */}
      <section className="p-5" style={{ borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', background: 'var(--color-white)' }}>
        <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--color-black)' }}>Cuenta y configuración</h2>
        <div className="space-y-1">
          {[
            {
              icon: PenTool,
              label: 'Firma digital',
              sublabel: user?.signature_url ? 'Configurada' : 'Pendiente',
              sublabelColor: user?.signature_url ? 'var(--color-green)' : 'var(--color-amber)',
              to: '/settings/signature',
            },
            { icon: FileText, label: 'Mis documentos', sublabel: 'Contratos y certificados', to: '/documents' },
            { icon: CreditCard, label: 'Datos bancarios', sublabel: 'Stripe Connect', to: '/producer/connect' },
            { icon: KeyRound, label: 'Cambiar contraseña', sublabel: '', to: '/settings/password' },
          ].map((item, i) => (
            <Link
              key={i}
              to={item.to}
              className="flex items-center gap-3 p-3 transition-colors"
              style={{ borderRadius: 'var(--radius-md)' }}
            >
              <div className="w-8 h-8 flex items-center justify-center shrink-0" style={{ borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}>
                <item.icon className="w-4 h-4" style={{ color: 'var(--color-stone)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--color-black)' }}>{item.label}</p>
                {item.sublabel && (
                  <p className="text-[11px]" style={{ color: item.sublabelColor || 'var(--color-stone)' }}>{item.sublabel}</p>
                )}
              </div>
              <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--color-stone)' }} />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
