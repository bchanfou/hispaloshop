import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Package, FileCheck, ShoppingBag, CreditCard, AlertCircle, CheckCircle, ExternalLink, Loader2, Users, TrendingUp, Heart, Star, Zap, Target } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { API } from '../../utils/api';
import { useTranslation } from 'react-i18next';



function StatCard({ icon: Icon, label, value, sublabel, linkTo }) {
  return (
    <Link 
      to={linkTo}
      className="bg-white rounded-xl border border-stone-200 p-6 hover:shadow-md transition-shadow"
      data-testid={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-text-muted text-sm mb-1">{label}</p>
          <p className="text-3xl font-bold text-text-primary">{value}</p>
          {sublabel && (
            <p className="text-sm text-text-muted mt-1">{sublabel}</p>
          )}
        </div>
        <div className="p-3 rounded-lg bg-primary/10">
          <Icon className="w-6 h-6 text-primary" />
        </div>
      </div>
    </Link>
  );
}

function StripeConnectSection() {
  const { t } = useTranslation();
  const [stripeStatus, setStripeStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    fetchStripeStatus();
    
    // Check if returning from Stripe onboarding
    if (searchParams.get('stripe_return') === 'true') {
      toast.success('Stripe onboarding completed! Checking status...');
      // Refresh status after a brief delay
      setTimeout(fetchStripeStatus, 1000);
    } else if (searchParams.get('stripe_refresh') === 'true') {
      toast.info('Please complete Stripe onboarding to receive payouts.');
    }
  }, [searchParams]);

  const fetchStripeStatus = async () => {
    try {
      setError(null);
      const response = await axios.get(`${API}/producer/stripe/status`, { withCredentials: true });
      setStripeStatus(response.data);
    } catch (error) {
      console.error('Error fetching Stripe status:', error);
      setError('Unable to check Stripe status');
      // Set default status so UI still renders
      setStripeStatus({ connected: false, status: 'unknown' });
    } finally {
      setLoading(false);
    }
  };

  const handleConnectStripe = async () => {
    setConnecting(true);
    try {
      const response = await axios.post(
        `${API}/producer/stripe/create-account`,
        {},
        { 
          withCredentials: true,
          headers: { 'Origin': window.location.origin }
        }
      );
      
      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error('Error connecting Stripe:', error);
      toast.error(error.response?.data?.detail || 'Failed to start Stripe onboarding');
      setConnecting(false);
    }
  };

  const handleViewStripeDashboard = async () => {
    try {
      const response = await axios.post(
        `${API}/producer/stripe/create-login-link`,
        {},
        { withCredentials: true }
      );
      
      if (response.data.url) {
        window.open(response.data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating login link:', error);
      toast.error('Failed to open Stripe dashboard');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-stone-200 p-6 mb-8">
        <div className="flex items-center gap-2 text-text-muted">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{t('producer.loadingStripe')}</span>
        </div>
      </div>
    );
  }

  const isConnected = stripeStatus?.connected;

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-6 mb-8" data-testid="stripe-connect-section">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-lg ${isConnected ? 'bg-green-100' : 'bg-amber-100'}`}>
            <CreditCard className={`w-6 h-6 ${isConnected ? 'text-green-600' : 'text-amber-600'}`} />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary text-lg mb-1">Stripe Payouts</h3>
            {isConnected ? (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-green-700 font-medium">Stripe connected</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <span className="text-amber-700 font-medium">Stripe not connected</span>
              </div>
            )}
            <p className="text-text-muted text-sm mt-2">
              {isConnected 
                ? 'Your account is connected. You will automatically receive 82% of each sale.'
                : 'Connect your Stripe account to receive automatic payouts for your sales.'}
            </p>
            {stripeStatus?.status === 'pending' && stripeStatus?.stripe_account_id && (
              <p className="text-amber-600 text-sm mt-1">
                Onboarding incomplete. Please complete your Stripe profile to enable payouts.
              </p>
            )}
          </div>
        </div>
        <div>
          {isConnected ? (
            <Button
              variant="outline"
              onClick={handleViewStripeDashboard}
              className="flex items-center gap-2"
              data-testid="view-stripe-dashboard"
            >
              <ExternalLink className="w-4 h-4" />
              {t('producer.stripeConnect.viewDashboard')}
            </Button>
          ) : (
            <Button
              onClick={handleConnectStripe}
              disabled={connecting}
              className="bg-primary hover:bg-primary-hover text-white"
              data-testid="connect-stripe-button"
            >
              {connecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('producer.stripeConnect.connecting')}
                </>
              ) : stripeStatus?.stripe_account_id ? (
                t('producer.stripeConnect.completeSetup')
              ) : (
                t('producer.stripeConnect.connectAccount')
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

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
      const response = await axios.get(`${API}/producer/follower-stats?days=${days}`, { withCredentials: true });
      setData(response.data.chart_data || []);
    } catch (error) {
      console.error('Error fetching follower stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-stone-200 p-6 mb-8">
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-text-primary">{t('producer.followerGrowth.title')}</h2>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="text-sm border border-stone-200 rounded-lg px-3 py-1.5"
        >
          <option value={7}>{t('producer.followerGrowth.last7Days')}</option>
          <option value={30}>{t('producer.followerGrowth.last30Days')}</option>
          <option value={90}>{t('producer.followerGrowth.last90Days')}</option>
        </select>
      </div>
      
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorFollowers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B7355" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#8B7355" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 11 }} 
              tickFormatter={(val) => {
                const d = new Date(val);
                return `${d.getDate()}/${d.getMonth()+1}`;
              }}
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e5e5' }}
              labelFormatter={(val) => new Date(val).toLocaleDateString()}
              formatter={(val, name) => [val, name === 'followers' ? t('producer.followerGrowth.totalFollowers') : t('producer.followerGrowth.newFollowers')]}
            />
            <Area 
              type="monotone" 
              dataKey="followers" 
              stroke="#8B7355" 
              fillOpacity={1} 
              fill="url(#colorFollowers)" 
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex flex-col items-center justify-center h-48 text-text-muted">
          <Users className="w-12 h-12 mb-2 opacity-30" />
          <p>{t('producer.followerGrowth.noFollowers')}</p>
          <p className="text-sm">{t('producer.followerGrowth.shareStore')}</p>
        </div>
      )}
    </div>
  );
}

function HealthScoreCard() {
  const { t } = useTranslation();
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHealthScore();
  }, []);

  const fetchHealthScore = async () => {
    try {
      const response = await axios.get(`${API}/producer/health-score`, { withCredentials: true });
      setHealthData(response.data);
    } catch (error) {
      console.error('Error fetching health score:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-stone-200 p-6 mb-8">
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!healthData) return null;

  const getStatusColor = (color) => {
    const colors = {
      green: 'bg-green-500',
      blue: 'bg-blue-500',
      yellow: 'bg-yellow-500',
      orange: 'bg-orange-500',
      red: 'bg-red-500'
    };
    return colors[color] || 'bg-gray-500';
  };

  const getStatusBgColor = (color) => {
    const colors = {
      green: 'bg-green-50 border-green-200',
      blue: 'bg-blue-50 border-blue-200',
      yellow: 'bg-yellow-50 border-yellow-200',
      orange: 'bg-orange-50 border-orange-200',
      red: 'bg-red-50 border-red-200'
    };
    return colors[color] || 'bg-gray-50 border-gray-200';
  };

  const getStatusTextColor = (color) => {
    const colors = {
      green: 'text-green-700',
      blue: 'text-blue-700',
      yellow: 'text-yellow-700',
      orange: 'text-orange-700',
      red: 'text-red-700'
    };
    return colors[color] || 'text-gray-700';
  };

  return (
    <div className={`rounded-xl border p-6 mb-8 ${getStatusBgColor(healthData.status_color)}`} data-testid="health-score-card">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Heart className="w-5 h-5 text-red-500" />
            <h2 className="font-heading font-semibold text-[#1C1C1C]">{t('producer.healthScore.title')}</h2>
          </div>
          <p className="text-sm text-[#7A7A7A]">{t('producer.healthScore.subtitle')}</p>
        </div>
        <div className="text-right">
          <div className="text-4xl font-bold text-[#1C1C1C]">{healthData.total_score}</div>
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
            <div className="text-lg font-bold text-[#1C1C1C]">{item.score}</div>
            <div className="text-xs text-[#7A7A7A]">/{item.max}</div>
            <div className="text-xs font-medium text-[#4A4A4A] mt-1">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Metrics Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6 py-4 border-y border-stone-200">
        <div className="text-center">
          <div className="text-xl font-bold text-[#1C1C1C]">{healthData.metrics.orders_30d}</div>
          <div className="text-xs text-[#7A7A7A]">{t('producer.healthScore.orders30d')}</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-[#1C1C1C]">€{healthData.metrics.revenue_30d.toFixed(0)}</div>
          <div className="text-xs text-[#7A7A7A]">{t('producer.healthScore.revenue30d')}</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span className="text-xl font-bold text-[#1C1C1C]">{healthData.metrics.avg_rating || '-'}</span>
          </div>
          <div className="text-xs text-[#7A7A7A]">{healthData.metrics.review_count} {t('producer.healthScore.reviews')}</div>
        </div>
      </div>

      {/* Recommendations */}
      {healthData.recommendations && healthData.recommendations.length > 0 && (
        <div>
          <h3 className="font-medium text-[#1C1C1C] mb-3 flex items-center gap-2">
            <Target className="w-4 h-4" />
            {t('producer.healthScore.recommendations')}
          </h3>
          <div className="space-y-2">
            {healthData.recommendations.map((rec, idx) => (
              <div 
                key={idx}
                className={`flex items-start gap-3 p-3 rounded-lg bg-white ${
                  rec.priority === 'high' ? 'border-l-4 border-red-400' :
                  rec.priority === 'medium' ? 'border-l-4 border-yellow-400' :
                  'border-l-4 border-blue-400'
                }`}
              >
                <Zap className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                  rec.priority === 'high' ? 'text-red-500' :
                  rec.priority === 'medium' ? 'text-yellow-500' :
                  'text-blue-500'
                }`} />
                <p className="text-sm text-[#4A4A4A]">{rec.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProducerOverview() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [payments, setPayments] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setError(null);
      const [statsRes, paymentsRes] = await Promise.all([
        axios.get(`${API}/producer/stats`, { withCredentials: true }),
        axios.get(`${API}/producer/payments`, { withCredentials: true })
      ]);
      setStats(statsRes.data);
      setPayments(paymentsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load dashboard data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-text-muted">{t('producer.loadingDashboard')}</p>
      </div>
    );
  }

  // Show error state with retry option
  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600 mb-4">{t('producer.errorLoading')}</p>
        <Button onClick={fetchData} className="bg-primary hover:bg-primary-hover text-white">
          {t('producer.retry')}
        </Button>
      </div>
    );
  }

  const isPending = !user?.approved;

  return (
    <div>
      <h1 className="font-heading text-3xl font-bold text-text-primary mb-2" data-testid="producer-title">
        {t('producer.welcome')}, {user?.company_name || user?.name}
      </h1>
      <p className="text-text-muted mb-8">{t('producer.manageProductsAndSales')}</p>

      {/* Pending Warning */}
      {isPending && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-amber-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-900 mb-1">{t('producer.accountPending')}</h3>
              <p className="text-amber-800">
                {t('producer.accountPendingDesc')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stripe Connect Section */}
      <StripeConnectSection />

      {/* Health Score Card */}
      <HealthScoreCard />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <StatCard
          icon={Package}
          label={t('producer.totalProducts')}
          value={stats?.total_products || 0}
          sublabel={t('producer.approvedProducts', { count: stats?.approved_products || 0 })}
          linkTo="/producer/products"
        />
        <StatCard
          icon={ShoppingBag}
          label={t('producer.orders')}
          value={stats?.total_orders || 0}
          linkTo="/producer/orders"
        />
        <StatCard
          icon={Users}
          label={t('producer.followers')}
          value={stats?.follower_count || 0}
          sublabel={t('producer.ofYourStore')}
          linkTo="/producer/store"
        />
        <StatCard
          icon={CreditCard}
          label={t('producer.totalSold')}
          value={`€${payments?.total_sold?.toFixed(2) || '0.00'}`}
          linkTo="/producer/payments"
        />
        <StatCard
          icon={CreditCard}
          label={t('producer.yourEarnings')}
          value={`€${payments?.producer_share?.toFixed(2) || '0.00'}`}
          linkTo="/producer/payments"
        />
      </div>

      {/* Follower Growth Chart */}
      <FollowerGrowthChart />

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-stone-200 p-6">
        <h2 className="font-heading text-lg font-semibold text-text-primary mb-4">
          {t('producer.quickActions')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/producer/products"
            className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20 hover:bg-primary/10 transition-colors"
          >
            <Package className="w-5 h-5 text-primary" />
            <span className="text-primary font-medium">{t('producer.createNewProduct')}</span>
          </Link>
          <Link
            to="/producer/certificates"
            className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
          >
            <FileCheck className="w-5 h-5 text-blue-600" />
            <span className="text-blue-800 font-medium">{t('producer.manageCertificates')}</span>
          </Link>
          <Link
            to="/producer/orders"
            className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition-colors"
          >
            <ShoppingBag className="w-5 h-5 text-green-600" />
            <span className="text-green-800 font-medium">{t('producer.viewOrders')}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
