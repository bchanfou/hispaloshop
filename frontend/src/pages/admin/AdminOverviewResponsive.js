import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { 
  Users, Package, FileCheck, ShoppingBag, AlertCircle, 
  TrendingUp, DollarSign, Eye, Calendar, Globe, ChevronRight
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { API } from '../../utils/api';
import { useTranslation } from 'react-i18next';
import StatCardMobile from '../../components/dashboard/StatCardMobile';
import QuickActionsMobile from '../../components/dashboard/QuickActionsMobile';

const COUNTRIES = [
  { code: 'all', name: 'Global' },
  { code: 'ES', name: 'España' },
  { code: 'FR', name: 'Francia' },
  { code: 'DE', name: 'Alemania' },
  { code: 'IT', name: 'Italia' },
  { code: 'PT', name: 'Portugal' },
  { code: 'UK', name: 'Reino Unido' },
  { code: 'US', name: 'Estados Unidos' },
  { code: 'MX', name: 'México' },
];

// Mobile-friendly Stat Card
function StatCard({ icon: Icon, label, value, pending, linkTo, t }) {
  return (
    <Link 
      to={linkTo}
      className="dashboard-card p-4 md:p-6 block"
      data-testid={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-text-muted text-xs md:text-sm mb-1">{label}</p>
          <p className="text-2xl md:text-3xl font-bold text-text-primary">{value}</p>
          {pending > 0 && (
            <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {t('admin.pendingCount', { count: pending })}
            </p>
          )}
        </div>
        <div className="p-2 md:p-3 rounded-lg bg-ds-accent/10">
          <Icon className="w-5 h-5 md:w-6 md:h-6 text-ds-accent" />
        </div>
      </div>
    </Link>
  );
}

// Mobile Date Range Selector
function MobileDateSelector({ selectedRange, onChange }) {
  const ranges = [
    { value: 7, label: '7D' },
    { value: 30, label: '30D' },
    { value: 90, label: '90D' },
  ];
  
  return (
    <div className="flex gap-1 bg-stone-100 rounded-lg p-1">
      {ranges.map(range => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            selectedRange === range.value 
              ? 'bg-white text-ds-accent shadow-sm' 
              : 'text-text-muted'
          }`}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}

// Desktop Date Range Picker
function DateRangePicker({ startDate, endDate, onChange }) {
  return (
    <div className="hidden md:flex items-center gap-3">
      <Calendar className="w-4 h-4 text-text-muted" />
      <input
        type="date"
        value={startDate}
        onChange={(e) => onChange(e.target.value, endDate)}
        className="text-sm border border-border-default rounded-lg px-3 py-1.5 bg-white"
      />
      <span className="text-text-muted">→</span>
      <input
        type="date"
        value={endDate}
        onChange={(e) => onChange(startDate, e.target.value)}
        className="text-sm border border-border-default rounded-lg px-3 py-1.5 bg-white"
      />
    </div>
  );
}

// Sales Chart Component
function SalesChart({ data, isMobile }) {
  return (
    <ResponsiveContainer width="100%" height={isMobile ? 180 : 250}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2D5A27" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#2D5A27" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
        {!isMobile && (
          <>
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 11 }} 
              tickFormatter={(val) => {
                const d = new Date(val);
                return `${d.getDate()}/${d.getMonth()+1}`;
              }}
            />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `€${val}`} />
          </>
        )}
        <Tooltip
          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e5e5', fontSize: '12px' }}
          labelFormatter={(val) => new Date(val).toLocaleDateString('es-ES')}
          formatter={(val) => [`€${val.toFixed(2)}`, 'Ventas']}
        />
        <Area 
          type="monotone" 
          dataKey="sales" 
          stroke="#2D5A27" 
          fillOpacity={1} 
          fill="url(#colorSales)" 
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Orders Chart Component
function OrdersChart({ data, isMobile }) {
  return (
    <ResponsiveContainer width="100%" height={isMobile ? 180 : 250}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
        {!isMobile && (
          <>
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 11 }} 
              tickFormatter={(val) => {
                const d = new Date(val);
                return `${d.getDate()}/${d.getMonth()+1}`;
              }}
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Legend />
          </>
        )}
        <Tooltip
          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e5e5', fontSize: '12px' }}
          labelFormatter={(val) => new Date(val).toLocaleDateString('es-ES')}
        />
        <Bar dataKey="orders" fill="#1A1A1A" name={t('admin.orders')} radius={[4, 4, 0, 0]} />
        <Bar dataKey="visits" fill="#60a5fa" name={t('admin.visits')} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Summary Stat Card
function SummaryCard({ icon: Icon, label, value, color }) {
  const colorClasses = {
    green: 'bg-green-50 border-green-200 text-green-700',
    primary: 'bg-ds-accent/5 border-ds-accent/20 text-ds-accent',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
  };
  
  return (
    <div className={`rounded-lg p-3 md:p-4 border ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-xs md:text-sm font-medium">{label}</span>
      </div>
      <p className="text-xl md:text-2xl font-bold">{value}</p>
    </div>
  );
}

export default function AdminOverviewResponsive() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [isGlobal, setIsGlobal] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [selectedDays, setSelectedDays] = useState(30);
  
  // Date range
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - selectedDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(today);

  const isSuperAdmin = user?.role === 'super_admin';
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update date range when selectedDays changes (mobile)
  useEffect(() => {
    const newStartDate = new Date(Date.now() - selectedDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setStartDate(newStartDate);
  }, [selectedDays]);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchChartData();
  }, [startDate, endDate, selectedCountry]);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/admin/stats`, { withCredentials: true });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChartData = async () => {
    try {
      let url = `${API}/admin/analytics?start_date=${startDate}&end_date=${endDate}`;
      if (isSuperAdmin && selectedCountry !== 'all') {
        url += `&country=${selectedCountry}`;
      }
      const response = await axios.get(url, { withCredentials: true });
      setChartData(response.data.chart_data || []);
      setIsGlobal(response.data.is_global);
    } catch (error) {
      console.error('Error fetching chart data:', error);
      setChartData([]);
    }
  };

  const handleDateChange = (start, end) => {
    setStartDate(start);
    setEndDate(end);
  };

  const totalSales = chartData.reduce((sum, d) => sum + (d.sales || 0), 0);
  const totalOrders = chartData.reduce((sum, d) => sum + (d.orders || 0), 0);
  const totalVisits = chartData.reduce((sum, d) => sum + (d.visits || 0), 0);

  // Quick actions for mobile
  const quickActions = [
    { 
      icon: Users, 
      label: t('admin.reviewPendingSellers'), 
      to: '/admin/producers?filter=pending',
      bgColor: '#FEF3C7',
      iconColor: '#D97706',
      badge: stats?.pending_producers > 0 ? stats.pending_producers : null
    },
    { 
      icon: Package, 
      label: t('admin.approveProducts'), 
      to: '/admin/products?filter=pending',
      bgColor: '#DBEAFE',
      iconColor: '#2563EB',
      badge: stats?.pending_products > 0 ? stats.pending_products : null
    },
    { 
      icon: FileCheck, 
      label: t('admin.reviewCertificates'), 
      to: '/admin/certificates?filter=pending',
      bgColor: '#D1FAE5',
      iconColor: '#059669',
      badge: stats?.pending_certificates > 0 ? stats.pending_certificates : null
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-ds-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-text-muted">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 
          className="font-heading text-xl md:text-3xl font-bold text-text-primary"
          data-testid="admin-title"
        >
          {t('admin.dashboard')}
        </h1>
        <p className="text-sm text-text-muted mt-1 hidden md:block">{t('admin.welcome')}</p>
      </div>

      {/* Stats Grid - Mobile: 2x2, Desktop: 4 columns */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          icon={Users}
          label={t('admin.producers')}
          value={stats?.total_producers || 0}
          pending={stats?.pending_producers || 0}
          linkTo="/admin/producers"
          t={t}
        />
        <StatCard
          icon={Package}
          label={t('admin.products')}
          value={stats?.total_products || 0}
          pending={stats?.pending_products || 0}
          linkTo="/admin/products"
          t={t}
        />
        <StatCard
          icon={FileCheck}
          label={t('admin.certificates')}
          value={stats?.pending_certificates || 0}
          pending={stats?.pending_certificates || 0}
          linkTo="/admin/certificates"
          t={t}
        />
        <StatCard
          icon={ShoppingBag}
          label={t('admin.orders')}
          value={stats?.total_orders || 0}
          pending={0}
          linkTo="/admin/orders"
          t={t}
        />
      </div>

      {/* Charts Section */}
      <div className="dashboard-card p-4 md:p-6">
        {/* Chart Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4 md:mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-ds-accent" />
            <h2 className="font-medium text-text-primary text-sm md:text-base">
              {t('admin.salesAnalysis')}
            </h2>
            {isGlobal && (
              <span className="text-xs text-text-muted">({t('admin.global')})</span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {/* Country selector - only for super_admin */}
            {isSuperAdmin && (
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-text-muted" />
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="text-xs md:text-sm border border-border-default rounded-lg px-2 md:px-3 py-1.5 bg-white"
                >
                  {COUNTRIES.map(country => (
                    <option key={country.code} value={country.code}>{country.name}</option>
                  ))}
                </select>
              </div>
            )}
            
            {/* Mobile: Simple range selector */}
            {isMobile ? (
              <MobileDateSelector 
                selectedRange={selectedDays} 
                onChange={setSelectedDays} 
              />
            ) : (
              <DateRangePicker 
                startDate={startDate} 
                endDate={endDate} 
                onChange={handleDateChange}
              />
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4 md:mb-6">
          <SummaryCard
            icon={DollarSign}
            label={t('admin.totalSales')}
            value={`€${totalSales.toFixed(0)}`}
            color="green"
          />
          <SummaryCard
            icon={ShoppingBag}
            label={t('admin.totalOrders')}
            value={totalOrders}
            color="primary"
          />
          <SummaryCard
            icon={Eye}
            label={t('admin.totalVisits')}
            value={totalVisits}
            color="blue"
          />
        </div>

        {/* Charts - Stacked on mobile, side by side on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <div>
            <h3 className="text-xs md:text-sm font-medium text-text-secondary mb-3">
              {t('admin.salesPerDay')}
            </h3>
            <SalesChart data={chartData} isMobile={isMobile} />
          </div>
          <div>
            <h3 className="text-xs md:text-sm font-medium text-text-secondary mb-3">
              {t('admin.ordersAndVisits')}
            </h3>
            <OrdersChart data={chartData} isMobile={isMobile} />
          </div>
        </div>
      </div>

      {/* Quick Actions - Mobile: List, Desktop: Grid */}
      <div className="md:hidden">
        <QuickActionsMobile 
          actions={quickActions}
          title={t('admin.quickActions')}
        />
      </div>
      
      {/* Desktop Quick Actions */}
      <div className="hidden md:block dashboard-card p-6">
        <h2 className="font-heading text-lg font-semibold text-text-primary mb-4">
          {t('admin.quickActions')}
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {quickActions.map((action, idx) => (
            <Link
              key={idx}
              to={action.to}
              className="flex items-center gap-3 p-4 rounded-lg border border-border-default hover:border-ds-accent/30 hover:bg-ds-accent/5 transition-colors"
            >
              <div 
                className="p-2.5 rounded-lg"
                style={{ backgroundColor: action.bgColor }}
              >
                <action.icon className="w-5 h-5" style={{ color: action.iconColor }} />
              </div>
              <span className="font-medium text-text-primary flex-1">{action.label}</span>
              {action.badge && (
                <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {action.badge}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
