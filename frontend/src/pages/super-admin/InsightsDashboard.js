import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area
} from 'recharts';
import { 
  Globe, Users, Brain, ShieldCheck, TrendingUp, AlertTriangle,
  Settings, ChevronDown, RefreshCw, Eye, EyeOff, Lock, CheckCircle2, XCircle
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { API } from '../../utils/api';

// Color palette
const COLORS = {
  primary: '#1C1C1C',
  secondary: '#7A7A7A',
  accent: '#E53E3E',
  success: '#38A169',
  warning: '#D69E2E',
  info: '#3182CE',
  chart: ['#1C1C1C', '#4A4A4A', '#7A7A7A', '#A3A3A3', '#D4D4D4']
};

const PIE_COLORS = ['#1C1C1C', '#E53E3E', '#3182CE', '#38A169', '#D69E2E', '#805AD5'];

export default function InsightsDashboard() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);
  
  // Data states
  const [globalData, setGlobalData] = useState(null);
  const [aiPerformance, setAiPerformance] = useState(null);
  const [trends, setTrends] = useState(null);
  const [compliance, setCompliance] = useState(null);
  const [config, setConfig] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [countryData, setCountryData] = useState(null);
  
  // Config modal
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configForm, setConfigForm] = useState({
    anonymity_threshold: 15,
    enable_fear_tracking: true,
    enable_health_inference: true
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [globalRes, aiRes, trendsRes, complianceRes, configRes] = await Promise.all([
        axios.get(`${API}/insights/global-overview`, { withCredentials: true }),
        axios.get(`${API}/insights/ai-performance`, { withCredentials: true }),
        axios.get(`${API}/insights/trends`, { withCredentials: true }),
        axios.get(`${API}/insights/compliance`, { withCredentials: true }),
        axios.get(`${API}/insights/config`, { withCredentials: true })
      ]);
      
      setGlobalData(globalRes.data);
      setAiPerformance(aiRes.data);
      setTrends(trendsRes.data);
      setCompliance(complianceRes.data);
      setConfig(configRes.data);
      setConfigForm({
        anonymity_threshold: configRes.data.anonymity_threshold || 15,
        enable_fear_tracking: configRes.data.enable_fear_tracking ?? true,
        enable_health_inference: configRes.data.enable_health_inference ?? true
      });
    } catch (error) {
      console.error('Error fetching insights:', error);
      toast.error(t('superAdmin.insights.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
    toast.success(t('superAdmin.insights.dataRefreshed'));
  };

  const fetchCountryData = async (countryCode) => {
    try {
      const response = await axios.get(`${API}/insights/country/${countryCode}`, { withCredentials: true });
      setCountryData(response.data);
      setSelectedCountry(countryCode);
    } catch (error) {
      console.error('Error fetching country data:', error);
      toast.error(t('superAdmin.insights.failedToLoadCountry'));
    }
  };

  const saveConfig = async () => {
    try {
      await axios.put(`${API}/insights/config`, configForm, { withCredentials: true });
      toast.success(t('superAdmin.insights.configSaved'));
      setShowConfigModal(false);
      fetchAllData();
    } catch (error) {
      toast.error(t('superAdmin.insights.failedToSaveConfig'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1C1C1C]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#1C1C1C] flex items-center gap-3">
            <Brain className="w-7 h-7" />
            {t('superAdmin.insights.title')}
          </h1>
          <p className="text-[#7A7A7A] text-sm mt-1">
            {t('superAdmin.insights.subtitle', { threshold: config?.anonymity_threshold || 15 })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {t('superAdmin.insights.refresh')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConfigModal(true)}
            className="gap-2"
          >
            <Settings className="w-4 h-4" />
            {t('superAdmin.insights.config')}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#E6DFD6] pb-2 overflow-x-auto">
        {[
          { id: 'overview', label: t('superAdmin.insights.tabs.overview'), icon: Globe },
          { id: 'countries', label: t('superAdmin.insights.tabs.countries'), icon: Users },
          { id: 'ai', label: t('superAdmin.insights.tabs.ai'), icon: TrendingUp },
          { id: 'trends', label: t('superAdmin.insights.tabs.trends'), icon: BarChart },
          { id: 'compliance', label: t('superAdmin.insights.tabs.compliance'), icon: ShieldCheck }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-[#1C1C1C] text-white'
                : 'text-[#7A7A7A] hover:bg-[#FAF7F2]'
            }`}
            data-testid={`tab-${tab.id}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {activeTab === 'overview' && <GlobalOverviewTab data={globalData} />}
        {activeTab === 'countries' && (
          <CountryIntelligenceTab 
            globalData={globalData} 
            countryData={countryData}
            selectedCountry={selectedCountry}
            onSelectCountry={fetchCountryData}
          />
        )}
        {activeTab === 'ai' && <AIPerformanceTab data={aiPerformance} />}
        {activeTab === 'trends' && <TrendsTab data={trends} />}
        {activeTab === 'compliance' && <ComplianceTab data={compliance} config={config} />}
      </div>

      {/* Config Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="font-heading text-xl font-bold text-[#1C1C1C] mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Insights Configuration
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#4A4A4A] mb-1">
                  Anonymity Threshold
                </label>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={configForm.anonymity_threshold}
                  onChange={(e) => setConfigForm({...configForm, anonymity_threshold: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-[#E6DFD6] rounded-lg"
                />
                <p className="text-xs text-[#7A7A7A] mt-1">
                  Minimum users required to display sensitive aggregated data
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-[#4A4A4A]">Fear Tracking</label>
                  <p className="text-xs text-[#7A7A7A]">Infer health concerns from AI chats</p>
                </div>
                <input
                  type="checkbox"
                  checked={configForm.enable_fear_tracking}
                  onChange={(e) => setConfigForm({...configForm, enable_fear_tracking: e.target.checked})}
                  className="h-5 w-5 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-[#4A4A4A]">Health Inference</label>
                  <p className="text-xs text-[#7A7A7A]">Detect diet goals and health objectives</p>
                </div>
                <input
                  type="checkbox"
                  checked={configForm.enable_health_inference}
                  onChange={(e) => setConfigForm({...configForm, enable_health_inference: e.target.checked})}
                  className="h-5 w-5 rounded"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowConfigModal(false)}>Cancel</Button>
              <Button onClick={saveConfig} className="bg-[#1C1C1C] hover:bg-[#333]">Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TAB 1: Global Overview
// ============================================================================
function GlobalOverviewTab({ data }) {
  if (!data) return null;

  const consentData = [
    { name: 'With Consent', value: data.consent_coverage.users_with_consent, color: '#38A169' },
    { name: 'Without Consent', value: data.total_users - data.consent_coverage.users_with_consent, color: '#E6DFD6' }
  ];

  const userBreakdown = [
    { name: 'Customers', value: data.customers },
    { name: 'Producers', value: data.producers },
    { name: 'Admins', value: data.total_users - data.customers - data.producers }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Total Users Card */}
      <div className="bg-white rounded-xl border border-[#E6DFD6] p-6" data-testid="card-total-users">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-[#7A7A7A]">Total Users</h3>
          <Users className="w-5 h-5 text-[#1C1C1C]" />
        </div>
        <p className="text-4xl font-bold text-[#1C1C1C]">{data.total_users}</p>
        <p className="text-sm text-[#7A7A7A] mt-2">
          {data.countries_count} countries • {data.customers} customers
        </p>
      </div>

      {/* Consent Coverage Card */}
      <div className="bg-white rounded-xl border border-[#E6DFD6] p-6" data-testid="card-consent">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-[#7A7A7A]">Analytics Consent</h3>
          <ShieldCheck className="w-5 h-5 text-green-600" />
        </div>
        <p className="text-4xl font-bold text-[#1C1C1C]">{data.consent_coverage.consent_rate_percent}%</p>
        <p className="text-sm text-[#7A7A7A] mt-2">
          {data.consent_coverage.users_with_consent} users consented
        </p>
      </div>

      {/* AI Profile Coverage */}
      <div className="bg-white rounded-xl border border-[#E6DFD6] p-6" data-testid="card-ai-coverage">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-[#7A7A7A]">AI Profile Coverage</h3>
          <Brain className="w-5 h-5 text-blue-600" />
        </div>
        <p className="text-4xl font-bold text-[#1C1C1C]">{data.ai_coverage.ai_profile_rate_percent}%</p>
        <p className="text-sm text-[#7A7A7A] mt-2">
          {data.ai_coverage.users_with_ai_profile} profiles created
        </p>
      </div>

      {/* Insights Coverage */}
      <div className="bg-white rounded-xl border border-[#E6DFD6] p-6" data-testid="card-insights-coverage">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-[#7A7A7A]">Inferred Insights</h3>
          <TrendingUp className="w-5 h-5 text-purple-600" />
        </div>
        <p className="text-4xl font-bold text-[#1C1C1C]">{data.insights_coverage.insights_rate_percent}%</p>
        <p className="text-sm text-[#7A7A7A] mt-2">
          {data.insights_coverage.users_with_insights} users with AI-inferred signals
        </p>
      </div>

      {/* Sensitive Signals */}
      <div className="bg-white rounded-xl border border-[#E6DFD6] p-6" data-testid="card-sensitive">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-[#7A7A7A]">Sensitive Signals</h3>
          <Lock className="w-5 h-5 text-amber-600" />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-[#7A7A7A]">Fear signals:</span>
            <span className="font-medium">{data.sensitive_signals.users_with_fear_signals}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-[#7A7A7A]">Allergy signals:</span>
            <span className="font-medium">{data.sensitive_signals.users_with_allergy_signals}</span>
          </div>
        </div>
        <p className="text-xs text-amber-600 mt-3 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Threshold: {data.anonymity_threshold} users
        </p>
      </div>

      {/* User Breakdown Chart */}
      <div className="bg-white rounded-xl border border-[#E6DFD6] p-6" data-testid="card-breakdown">
        <h3 className="font-medium text-[#7A7A7A] mb-4">User Distribution</h3>
        <ResponsiveContainer width="100%" height={150}>
          <PieChart>
            <Pie
              data={userBreakdown}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={60}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {userBreakdown.map((entry, index) => (
                <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Top Countries */}
      <div className="bg-white rounded-xl border border-[#E6DFD6] p-6 md:col-span-2 lg:col-span-3" data-testid="card-countries">
        <h3 className="font-medium text-[#7A7A7A] mb-4">Top Countries</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.top_countries.slice(0, 8)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E6DFD6" />
            <XAxis dataKey="country" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#1C1C1C" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ============================================================================
// TAB 2: Country Intelligence
// ============================================================================
function CountryIntelligenceTab({ globalData, countryData, selectedCountry, onSelectCountry }) {
  if (!globalData) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Country Selector */}
      <div className="bg-white rounded-xl border border-[#E6DFD6] p-6">
        <h3 className="font-medium text-[#1C1C1C] mb-4">Select Country</h3>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {globalData.top_countries.map((country) => (
            <button
              key={country.country}
              onClick={() => onSelectCountry(country.country)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
                selectedCountry === country.country
                  ? 'bg-[#1C1C1C] text-white'
                  : 'bg-[#FAF7F2] text-[#1C1C1C] hover:bg-[#E6DFD6]'
              }`}
              data-testid={`country-${country.country}`}
            >
              <span className="font-medium">{country.country}</span>
              <span className="text-sm opacity-70">{country.count} users</span>
            </button>
          ))}
        </div>
      </div>

      {/* Country Details */}
      <div className="lg:col-span-2">
        {countryData ? (
          countryData.data_available ? (
            <div className="space-y-6">
              {/* Country Header */}
              <div className="bg-white rounded-xl border border-[#E6DFD6] p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-heading text-2xl font-bold text-[#1C1C1C]">{countryData.country}</h2>
                    <p className="text-[#7A7A7A]">
                      {countryData.total_users} total users • {countryData.users_with_insights} with insights
                    </p>
                  </div>
                  <Globe className="w-10 h-10 text-[#E6DFD6]" />
                </div>
              </div>

              {/* Preferences Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Top Likes */}
                <div className="bg-white rounded-xl border border-[#E6DFD6] p-6">
                  <h3 className="font-medium text-green-700 mb-4 flex items-center gap-2">
                    <Eye className="w-4 h-4" /> Top Likes
                  </h3>
                  <div className="space-y-2">
                    {countryData.preferences.top_likes.slice(0, 5).map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm text-[#4A4A4A]">{item.tag.replace(/_/g, ' ')}</span>
                        <span className="text-sm font-medium text-green-600">{item.percentage}%</span>
                      </div>
                    ))}
                    {countryData.preferences.top_likes.length === 0 && (
                      <p className="text-sm text-[#7A7A7A]">No data yet</p>
                    )}
                  </div>
                </div>

                {/* Top Dislikes */}
                <div className="bg-white rounded-xl border border-[#E6DFD6] p-6">
                  <h3 className="font-medium text-red-700 mb-4 flex items-center gap-2">
                    <EyeOff className="w-4 h-4" /> Top Dislikes
                  </h3>
                  <div className="space-y-2">
                    {countryData.preferences.top_dislikes.slice(0, 5).map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm text-[#4A4A4A]">{item.tag.replace(/_/g, ' ')}</span>
                        <span className="text-sm font-medium text-red-600">{item.percentage}%</span>
                      </div>
                    ))}
                    {countryData.preferences.top_dislikes.length === 0 && (
                      <p className="text-sm text-[#7A7A7A]">No data yet</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Budget Distribution */}
              <div className="bg-white rounded-xl border border-[#E6DFD6] p-6">
                <h3 className="font-medium text-[#1C1C1C] mb-4">Budget Distribution</h3>
                <div className="flex gap-4">
                  {Object.entries(countryData.budget_distribution).map(([level, percent]) => (
                    <div key={level} className="flex-1 text-center">
                      <div className="text-2xl font-bold text-[#1C1C1C]">{percent}%</div>
                      <div className="text-sm text-[#7A7A7A] capitalize">{level}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sensitive Signals (if compliant) */}
              {countryData.sensitive_signals.anonymity_compliant && (
                <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
                  <h3 className="font-medium text-amber-800 mb-4 flex items-center gap-2">
                    <Lock className="w-4 h-4" /> Sensitive Signals (Aggregated)
                  </h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-amber-700 mb-2">Health Fears</h4>
                      {countryData.sensitive_signals.fears.slice(0, 3).map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span>{item.tag.replace(/_/g, ' ')}</span>
                          <span className="font-medium">{item.percentage}%</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-amber-700 mb-2">Allergies</h4>
                      {countryData.sensitive_signals.allergies.slice(0, 3).map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span>{item.tag.replace(/_/g, ' ')}</span>
                          <span className="font-medium">{item.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-8 text-center">
              <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <h3 className="font-medium text-amber-800 mb-2">Insufficient Data</h3>
              <p className="text-amber-700 text-sm">{countryData.message}</p>
            </div>
          )
        ) : (
          <div className="bg-[#FAF7F2] rounded-xl border border-[#E6DFD6] p-8 text-center">
            <Globe className="w-12 h-12 text-[#E6DFD6] mx-auto mb-4" />
            <p className="text-[#7A7A7A]">Select a country to view detailed insights</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// TAB 3: AI Performance
// ============================================================================
function AIPerformanceTab({ data }) {
  if (!data) return null;

  const actionData = Object.entries(data.action_usage)
    .filter(([_, v]) => v > 0)
    .map(([key, value]) => ({
      name: key.replace(/_/g, ' '),
      value
    }));

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-[#E6DFD6] p-6">
          <h3 className="text-sm text-[#7A7A7A] mb-2">Total AI Messages</h3>
          <p className="text-3xl font-bold text-[#1C1C1C]">{data.ai_interactions.total_messages}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E6DFD6] p-6">
          <h3 className="text-sm text-[#7A7A7A] mb-2">Unique Sessions</h3>
          <p className="text-3xl font-bold text-[#1C1C1C]">{data.ai_interactions.unique_sessions}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E6DFD6] p-6">
          <h3 className="text-sm text-[#7A7A7A] mb-2">Recommendation Acceptance</h3>
          <p className="text-3xl font-bold text-green-600">{data.conversion_metrics.recommendation_acceptance_rate}%</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E6DFD6] p-6">
          <h3 className="text-sm text-[#7A7A7A] mb-2">AI-Influenced Orders</h3>
          <p className="text-3xl font-bold text-blue-600">{data.conversion_metrics.ai_influenced_orders_percent}%</p>
        </div>
      </div>

      {/* Action Usage Chart */}
      <div className="bg-white rounded-xl border border-[#E6DFD6] p-6">
        <h3 className="font-medium text-[#1C1C1C] mb-4">AI Action Usage</h3>
        {actionData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={actionData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E6DFD6" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={150} />
              <Tooltip />
              <Bar dataKey="value" fill="#1C1C1C" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-[#7A7A7A] py-8">No action data yet</p>
        )}
      </div>

      {/* Conversion Funnel */}
      <div className="bg-white rounded-xl border border-[#E6DFD6] p-6">
        <h3 className="font-medium text-[#1C1C1C] mb-4">Conversion Impact</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-[#FAF7F2] rounded-lg">
            <p className="text-sm text-[#7A7A7A]">Total Orders</p>
            <p className="text-2xl font-bold text-[#1C1C1C]">{data.conversion_metrics.total_orders}</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">From AI Users</p>
            <p className="text-2xl font-bold text-blue-600">{data.conversion_metrics.orders_from_ai_users}</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-700">&quot;Add All&quot; Usage</p>
            <p className="text-2xl font-bold text-green-600">{data.conversion_metrics.add_all_to_cart_usage}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TAB 4: Trends & Strategy
// ============================================================================
function TrendsTab({ data }) {
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Diet Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-[#E6DFD6] p-6">
          <h3 className="font-medium text-[#1C1C1C] mb-4">Diet Goal Trends</h3>
          {data.diet_trends.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.diet_trends.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E6DFD6" />
                <XAxis dataKey="tag" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => `${value}%`} />
                <Bar dataKey="percentage" fill="#3182CE" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-[#7A7A7A] py-8">Insufficient data</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-[#E6DFD6] p-6">
          <h3 className="font-medium text-[#1C1C1C] mb-4">Product Interest Trends</h3>
          {data.product_interest_trends.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.product_interest_trends.slice(0, 6)}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="percentage"
                  nameKey="tag"
                  label={({ tag, percentage }) => `${tag.replace(/_/g, ' ')} ${percentage}%`}
                >
                  {data.product_interest_trends.slice(0, 6).map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-[#7A7A7A] py-8">Insufficient data</p>
          )}
        </div>
      </div>

      {/* Fear Trends (Sensitive) */}
      <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
        <h3 className="font-medium text-amber-800 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Health Concern Trends (Sensitive - Aggregated Only)
        </h3>
        {Array.isArray(data.fear_trends) && data.fear_trends.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.fear_trends.slice(0, 8).map((item, i) => (
              <div key={i} className="bg-white p-3 rounded-lg">
                <p className="text-sm text-amber-700 font-medium">{item.tag.replace(/_/g, ' ')}</p>
                <p className="text-xl font-bold text-amber-900">{item.percentage}%</p>
                <p className="text-xs text-[#7A7A7A]">{item.count} users</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-amber-700 text-sm">
            {typeof data.fear_trends === 'object' && data.fear_trends.message 
              ? data.fear_trends.message 
              : 'Insufficient users for anonymized display'}
          </p>
        )}
      </div>

      {/* Catalog Gaps */}
      <div className="bg-white rounded-xl border border-[#E6DFD6] p-6">
        <h3 className="font-medium text-[#1C1C1C] mb-4">Potential Catalog Gaps</h3>
        <p className="text-sm text-[#7A7A7A] mb-4">
          Products users are asking about but may not be well represented in catalog
        </p>
        {data.potential_catalog_gaps.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.potential_catalog_gaps.slice(0, 8).map((gap, i) => (
              <div key={i} className="bg-[#FAF7F2] p-3 rounded-lg">
                <p className="font-medium text-[#1C1C1C]">{gap.interest.replace(/_/g, ' ')}</p>
                <p className="text-sm text-[#7A7A7A]">{gap.demand_signals} demand signals</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-[#7A7A7A] py-4">No significant gaps detected</p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// TAB 5: Compliance (Enhanced with Audit & GDPR Summary)
// ============================================================================
function ComplianceTab({ data, config }) {
  const [auditLog, setAuditLog] = useState(null);
  const [gdprSummary, setGdprSummary] = useState(null);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('overview');

  const fetchAuditLog = async () => {
    if (auditLog) return;
    setLoadingAudit(true);
    try {
      const [auditRes, gdprRes] = await Promise.all([
        axios.get(`${API}/insights/audit-log`, { withCredentials: true }),
        axios.get(`${API}/insights/gdpr-summary`, { withCredentials: true })
      ]);
      setAuditLog(auditRes.data);
      setGdprSummary(gdprRes.data);
    } catch (error) {
      console.error('Error fetching audit data:', error);
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'audit' || activeSubTab === 'gdpr') {
      fetchAuditLog();
    }
  }, [activeSubTab]);

  if (!data) return null;

  const riskColor = {
    green: 'bg-green-100 text-green-800 border-green-200',
    amber: 'bg-amber-100 text-amber-800 border-amber-200',
    red: 'bg-red-100 text-red-800 border-red-200'
  };

  const RiskIcon = ({ level }) => {
    if (level === 'green') return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    if (level === 'amber') return <AlertTriangle className="w-4 h-4 text-amber-600" />;
    return <XCircle className="w-4 h-4 text-red-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex gap-2 bg-[#FAF7F2] p-1 rounded-lg w-fit">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'audit', label: 'Audit Log' },
          { id: 'gdpr', label: 'GDPR Summary' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeSubTab === tab.id
                ? 'bg-white shadow-sm text-[#1C1C1C]'
                : 'text-[#7A7A7A] hover:text-[#1C1C1C]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Sub-tab */}
      {activeSubTab === 'overview' && (
        <>
          {/* Risk Assessment */}
          <div className={`rounded-xl border-2 p-6 ${riskColor[data.risk_assessment.level]}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-xl flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6" />
                  Legal Risk Level: {data.risk_assessment.level.toUpperCase()}
                </h3>
                {data.risk_assessment.factors.length > 0 ? (
                  <ul className="mt-3 text-sm space-y-1">
                    {data.risk_assessment.factors.map((factor, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        {factor}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm opacity-80">No risk factors detected. System is compliant.</p>
                )}
              </div>
              <div className="text-6xl font-bold opacity-50 flex items-center justify-center">
                <RiskIcon level={data.risk_assessment.level} />
              </div>
            </div>
          </div>

          {/* Consent & Sensitive Data Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Consent Coverage */}
            <div className="bg-white rounded-xl border border-[#E6DFD6] p-6">
              <h3 className="font-medium text-[#1C1C1C] mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Consent Coverage
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-[#7A7A7A]">Analytics Consent Rate</span>
                    <span className="font-bold text-lg">{data.consent_metrics.consent_rate_percent}%</span>
                  </div>
                  <div className="w-full bg-[#E6DFD6] rounded-full h-4 overflow-hidden">
                    <div 
                      className={`h-4 rounded-full transition-all ${
                        data.consent_metrics.consent_rate_percent >= 70 ? 'bg-green-500' :
                        data.consent_metrics.consent_rate_percent >= 40 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${data.consent_metrics.consent_rate_percent}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <p className="text-3xl font-bold text-green-600">{data.consent_metrics.users_with_consent}</p>
                    <p className="text-xs text-green-700 font-medium">Consented Users</p>
                  </div>
                  <div className="bg-stone-100 p-4 rounded-lg text-center">
                    <p className="text-3xl font-bold text-stone-600">{data.consent_metrics.users_without_consent}</p>
                    <p className="text-xs text-stone-600 font-medium">No Consent</p>
                  </div>
                </div>
                {/* Consent Versions */}
                {data.consent_metrics.consent_versions && Object.keys(data.consent_metrics.consent_versions).length > 0 && (
                  <div className="pt-3 border-t border-[#E6DFD6]">
                    <p className="text-xs text-[#7A7A7A] mb-2">Consent by Version:</p>
                    <div className="flex gap-2">
                      {Object.entries(data.consent_metrics.consent_versions).map(([version, count]) => (
                        <span key={version} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                          v{version}: {count} users
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sensitive Data Coverage */}
            <div className="bg-white rounded-xl border border-[#E6DFD6] p-6">
              <h3 className="font-medium text-[#1C1C1C] mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Sensitive Data Tracking
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg">
                  <span className="text-amber-800 text-sm">Fear/Health Signals</span>
                  <span className="font-bold text-amber-900">{data.sensitive_data_coverage.users_with_fear_signals}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                  <span className="text-red-800 text-sm">Allergy Signals</span>
                  <span className="font-bold text-red-900">{data.sensitive_data_coverage.users_with_allergy_signals}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                  <span className="text-purple-800 text-sm">Health Goal Signals</span>
                  <span className="font-bold text-purple-900">{data.sensitive_data_coverage.users_with_health_signals}</span>
                </div>
              </div>
              <p className="text-xs text-[#7A7A7A] mt-4 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                All sensitive data displayed only in aggregates of {data.anonymity_compliance.threshold}+ users
              </p>
            </div>
          </div>

          {/* Anonymity & Retention Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Anonymity Compliance */}
            <div className={`rounded-xl border-2 p-6 ${
              data.anonymity_compliance.fully_compliant ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
            }`}>
              <h3 className="font-medium mb-3 flex items-center gap-2">
                {data.anonymity_compliance.fully_compliant ? (
                  <ShieldCheck className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                )}
                Anonymity Status
              </h3>
              <p className="text-3xl font-bold mb-2">
                {data.anonymity_compliance.fully_compliant ? 'Compliant' : 'Review Needed'}
              </p>
              <p className="text-sm opacity-70">
                Threshold: {data.anonymity_compliance.threshold} users
              </p>
              {data.anonymity_compliance.countries_below_threshold > 0 && (
                <p className="text-sm mt-2 text-amber-700">
                  {data.anonymity_compliance.countries_below_threshold} countries below threshold
                </p>
              )}
            </div>

            {/* Data Retention */}
            <div className="bg-white rounded-xl border border-[#E6DFD6] p-6">
              <h3 className="font-medium text-[#1C1C1C] mb-3">Data Retention</h3>
              <p className="text-2xl font-bold text-[#1C1C1C] mb-2">
                {data.data_retention.retention_days} days
              </p>
              <p className="text-sm text-[#7A7A7A]">{data.data_retention.policy}</p>
            </div>

            {/* Export Status */}
            <div className="bg-white rounded-xl border border-[#E6DFD6] p-6">
              <h3 className="font-medium text-[#1C1C1C] mb-3">Data Exports</h3>
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-4 h-4 rounded-full ${data.exports_enabled ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-lg font-bold">{data.exports_enabled ? 'Enabled' : 'Disabled'}</span>
              </div>
              <p className="text-xs text-[#7A7A7A]">
                {data.exports_enabled 
                  ? 'Warning: Exports are enabled' 
                  : 'Exports disabled by design for GDPR compliance'}
              </p>
            </div>
          </div>
        </>
      )}

      {/* Audit Log Sub-tab */}
      {activeSubTab === 'audit' && (
        <div className="space-y-6">
          {loadingAudit ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1C1C1C]"></div>
            </div>
          ) : auditLog ? (
            <>
              {/* Consent Trend Chart */}
              {auditLog.consent_trend.length > 0 && (
                <div className="bg-white rounded-xl border border-[#E6DFD6] p-6">
                  <h3 className="font-medium text-[#1C1C1C] mb-4">Consent Trend (Last 14 Days)</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={auditLog.consent_trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E6DFD6" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="consents" fill="#38A169" stroke="#38A169" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Recent Consents */}
              <div className="bg-white rounded-xl border border-[#E6DFD6] p-6">
                <h3 className="font-medium text-[#1C1C1C] mb-4">Recent Consent Grants (Anonymized)</h3>
                {auditLog.recent_consents.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#E6DFD6]">
                          <th className="text-left py-2 text-[#7A7A7A] font-medium">User (Masked)</th>
                          <th className="text-left py-2 text-[#7A7A7A] font-medium">Country</th>
                          <th className="text-left py-2 text-[#7A7A7A] font-medium">Version</th>
                          <th className="text-left py-2 text-[#7A7A7A] font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLog.recent_consents.slice(0, 10).map((consent, i) => (
                          <tr key={i} className="border-b border-[#FAF7F2]">
                            <td className="py-2 font-mono text-xs">{consent.masked_email}</td>
                            <td className="py-2">{consent.country || '-'}</td>
                            <td className="py-2">
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded">
                                v{consent.consent_version || '1.0'}
                              </span>
                            </td>
                            <td className="py-2 text-[#7A7A7A]">
                              {consent.consent_date ? new Date(consent.consent_date).toLocaleDateString() : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-[#7A7A7A] text-center py-4">No recent consents</p>
                )}
              </div>
            </>
          ) : (
            <p className="text-center text-[#7A7A7A] py-8">Failed to load audit data</p>
          )}
        </div>
      )}

      {/* GDPR Summary Sub-tab */}
      {activeSubTab === 'gdpr' && (
        <div className="space-y-6">
          {loadingAudit ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1C1C1C]"></div>
            </div>
          ) : gdprSummary ? (
            <>
              {/* Compliance Status Banner */}
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
                <div className="flex items-center gap-4">
                  <ShieldCheck className="w-12 h-12 text-green-600" />
                  <div>
                    <h2 className="text-2xl font-bold text-green-800">{gdprSummary.compliance_status}</h2>
                    <p className="text-green-700">Data Controller: {gdprSummary.data_controller}</p>
                  </div>
                </div>
              </div>

              {/* Data Categories */}
              <div className="bg-white rounded-xl border border-[#E6DFD6] p-6">
                <h3 className="font-medium text-[#1C1C1C] mb-4">Data Categories & Legal Basis</h3>
                <div className="space-y-4">
                  {Object.entries(gdprSummary.data_categories).map(([key, category]) => (
                    <div key={key} className="p-4 bg-[#FAF7F2] rounded-lg">
                      <h4 className="font-medium text-[#1C1C1C] capitalize mb-2">{key} Data</h4>
                      <p className="text-sm text-[#7A7A7A] mb-2">{category.description}</p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                          Legal Basis: {category.legal_basis}
                        </span>
                        <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded">
                          Retention: {category.retention}
                        </span>
                        {category.anonymity_threshold && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded">
                            Threshold: {category.anonymity_threshold} users
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Technical Measures */}
              <div className="bg-white rounded-xl border border-[#E6DFD6] p-6">
                <h3 className="font-medium text-[#1C1C1C] mb-4">Technical & Organizational Measures</h3>
                <ul className="space-y-2">
                  {gdprSummary.technical_measures.map((measure, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      {measure}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Generated timestamp */}
              <p className="text-xs text-[#7A7A7A] text-right">
                Generated: {new Date(gdprSummary.generated_at).toLocaleString()}
              </p>
            </>
          ) : (
            <p className="text-center text-[#7A7A7A] py-8">Failed to load GDPR summary</p>
          )}
        </div>
      )}
    </div>
  );
}
