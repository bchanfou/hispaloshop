import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Users, Package, FileCheck, ShoppingBag, AlertCircle, TrendingUp, DollarSign, Eye, Calendar, Globe } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../context/AuthContext';
import { API } from '../../utils/api';
import { useTranslation } from 'react-i18next';



const COUNTRIES = [
  { code: 'all', name: 'Global (Todos)' },
  { code: 'ES', name: 'España' },
  { code: 'FR', name: 'Francia' },
  { code: 'DE', name: 'Alemania' },
  { code: 'IT', name: 'Italia' },
  { code: 'PT', name: 'Portugal' },
  { code: 'UK', name: 'Reino Unido' },
  { code: 'US', name: 'Estados Unidos' },
  { code: 'MX', name: 'México' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colombia' }
];

function StatCard({ icon: Icon, label, value, pending, linkTo, color = 'primary', t }) {
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
          {pending > 0 && (
            <p className="text-sm text-amber-600 mt-2 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {t('admin.pendingCount', { count: pending })}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-primary/10`}>
          <Icon className="w-6 h-6 text-primary" />
        </div>
      </div>
    </Link>
  );
}

function DateRangePicker({ startDate, endDate, onChange }) {
  return (
    <div className="flex items-center gap-3">
      <Calendar className="w-4 h-4 text-text-muted" />
      <input
        type="date"
        value={startDate}
        onChange={(e) => onChange(e.target.value, endDate)}
        className="text-sm border border-stone-200 rounded-lg px-3 py-1.5"
      />
      <span className="text-text-muted">→</span>
      <input
        type="date"
        value={endDate}
        onChange={(e) => onChange(startDate, e.target.value)}
        className="text-sm border border-stone-200 rounded-lg px-3 py-1.5"
      />
    </div>
  );
}

function SalesChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
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
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `€${val}`} />
        <Tooltip
          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e5e5' }}
          labelFormatter={(val) => new Date(val).toLocaleDateString('es-ES')}
          formatter={(val) => [`€${val.toFixed(2)}`, 'Ventas']}
        />
        <Area 
          type="monotone" 
          dataKey="sales" 
          stroke="#10b981" 
          fillOpacity={1} 
          fill="url(#colorSales)" 
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function OrdersChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data}>
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
          labelFormatter={(val) => new Date(val).toLocaleDateString('es-ES')}
        />
        <Legend />
        <Bar dataKey="orders" fill="#8B7355" name={t('admin.orders')} radius={[4, 4, 0, 0]} />
        <Bar dataKey="visits" fill="#60a5fa" name={t('admin.visits')} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function AdminOverview() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [isGlobal, setIsGlobal] = useState(true);
  
  // Date range - default last 30 days
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(today);

  const isSuperAdmin = user?.role === 'super_admin';
  
  const COUNTRIES = [
    { code: 'all', name: t('admin.countries.all') },
    { code: 'ES', name: t('admin.countries.ES') },
    { code: 'FR', name: t('admin.countries.FR') },
    { code: 'DE', name: t('admin.countries.DE') },
    { code: 'IT', name: t('admin.countries.IT') },
    { code: 'PT', name: t('admin.countries.PT') },
    { code: 'UK', name: t('admin.countries.UK') },
    { code: 'US', name: t('admin.countries.US') },
    { code: 'MX', name: t('admin.countries.MX') },
    { code: 'AR', name: t('admin.countries.AR') },
    { code: 'CL', name: t('admin.countries.CL') },
    { code: 'CO', name: t('admin.countries.CO') }
  ];

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
      // Set empty data instead of mock data
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

  if (loading) {
    return <div className="text-center py-12 text-text-muted">{t('common.loading')}</div>;
  }

  return (
    <div>
      <h1 className="font-heading text-3xl font-bold text-text-primary mb-2" data-testid="admin-title">
        {t('admin.dashboard')}
      </h1>
      <p className="text-text-muted mb-8">{t('admin.welcome')}</p>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
      <div className="bg-white rounded-xl border border-stone-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <h2 className="font-semibold text-text-primary flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            {t('admin.salesAnalysis')}
            {!isGlobal && selectedCountry && (
              <span className="text-sm font-normal text-text-muted ml-2">
                ({COUNTRIES.find(c => c.code === selectedCountry)?.name || selectedCountry})
              </span>
            )}
            {isGlobal && (
              <span className="text-sm font-normal text-text-muted ml-2">({t('admin.global')})</span>
            )}
          </h2>
          <div className="flex items-center gap-4 flex-wrap">
            {/* Country selector - only for super_admin */}
            {isSuperAdmin && (
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-text-muted" />
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="text-sm border border-stone-200 rounded-lg px-3 py-1.5 bg-white"
                >
                  {COUNTRIES.map(country => (
                    <option key={country.code} value={country.code}>{country.name}</option>
                  ))}
                </select>
              </div>
            )}
            <DateRangePicker 
              startDate={startDate} 
              endDate={endDate} 
              onChange={handleDateChange}
            />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center gap-2 text-green-700 mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm font-medium">{t('admin.totalSales')}</span>
            </div>
            <p className="text-2xl font-bold text-green-800">€{totalSales.toFixed(2)}</p>
          </div>
          <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
            <div className="flex items-center gap-2 text-primary mb-1">
              <ShoppingBag className="w-4 h-4" />
              <span className="text-sm font-medium">{t('admin.totalOrders')}</span>
            </div>
            <p className="text-2xl font-bold text-text-primary">{totalOrders}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-2 text-blue-700 mb-1">
              <Eye className="w-4 h-4" />
              <span className="text-sm font-medium">{t('admin.totalVisits')}</span>
            </div>
            <p className="text-2xl font-bold text-blue-800">{totalVisits}</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-text-secondary mb-4">{t('admin.salesPerDay')}</h3>
            <SalesChart data={chartData} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-text-secondary mb-4">{t('admin.ordersAndVisits')}</h3>
            <OrdersChart data={chartData} />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-stone-200 p-6">
        <h2 className="font-heading text-lg font-semibold text-text-primary mb-4">
          {t('admin.quickActions')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/admin/producers?filter=pending"
            className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200 hover:bg-amber-100 transition-colors"
          >
            <Users className="w-5 h-5 text-amber-600" />
            <span className="text-amber-800 font-medium">{t('admin.reviewPendingSellers')}</span>
          </Link>
          <Link
            to="/admin/products?filter=pending"
            className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
          >
            <Package className="w-5 h-5 text-blue-600" />
            <span className="text-blue-800 font-medium">{t('admin.approveProducts')}</span>
          </Link>
          <Link
            to="/admin/certificates?filter=pending"
            className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition-colors"
          >
            <FileCheck className="w-5 h-5 text-green-600" />
            <span className="text-green-800 font-medium">{t('admin.reviewCertificates')}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
