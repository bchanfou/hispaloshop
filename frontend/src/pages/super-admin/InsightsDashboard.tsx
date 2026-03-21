// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area
} from 'recharts';
import { 
  Globe, Users, Brain, ShieldCheck, TrendingUp, BarChart3, AlertTriangle,
  Settings, ChevronDown, RefreshCw, Eye, EyeOff, Lock, CheckCircle2, XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../services/api/client';
import FocusTrap from 'focus-trap-react';

// Color palette — stone-based for dark/neutral theme
const COLORS = {
  primary: '#0c0a09',     // stone-950
  secondary: '#78716c',   // stone-500
  accent: '#57534e',      // stone-600
  success: '#78716c',     // stone-500
  warning: '#a8a29e',     // stone-400
  info: '#44403c',        // stone-700
  chart: ['#0c0a09', '#44403c', '#78716c', '#a8a29e', '#d6d3d1']   // stone 950→300
};

const PIE_COLORS = ['#0c0a09', '#44403c', '#57534e', '#78716c', '#a8a29e', '#d6d3d1'];

const asArray = (value) => (Array.isArray(value) ? value : []);
const asObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});
const asNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

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
      const [globalData, aiData, trendsData, complianceData, configData] = await Promise.all([
        apiClient.get(`/insights/global-overview`),
        apiClient.get(`/insights/ai-performance`),
        apiClient.get(`/insights/trends`),
        apiClient.get(`/insights/compliance`),
        apiClient.get(`/insights/config`)
      ]);

      setGlobalData(globalData);
      setAiPerformance(aiData);
      setTrends(trendsData);
      setCompliance(complianceData);
      setConfig(configData);
      setConfigForm({
        anonymity_threshold: configData.anonymity_threshold || 15,
        enable_fear_tracking: configData.enable_fear_tracking ?? true,
        enable_health_inference: configData.enable_health_inference ?? true
      });
    } catch {
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
      const data = await apiClient.get(`/insights/country/${countryCode}`);
      setCountryData(data);
      setSelectedCountry(countryCode);
    } catch {
      toast.error(t('superAdmin.insights.failedToLoadCountry'));
    }
  };

  const saveConfig = async () => {
    try {
      await apiClient.put(`/insights/config`, configForm);
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-950"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-950 flex items-center gap-3">
            <Brain className="w-7 h-7" />
            {t('superAdmin.insights.title')}
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            {t('superAdmin.insights.subtitle', { threshold: config?.anonymity_threshold || 15 })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 border border-stone-200 text-stone-600 rounded-2xl hover:bg-stone-50 transition-colors gap-2 inline-flex items-center disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {t('superAdmin.insights.refresh')}
          </button>
          <button
            onClick={() => setShowConfigModal(true)}
            className="px-4 py-2 border border-stone-200 text-stone-600 rounded-2xl hover:bg-stone-50 transition-colors gap-2 inline-flex items-center"
          >
            <Settings className="w-4 h-4" />
            {t('superAdmin.insights.config')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-stone-200 pb-2 overflow-x-auto">
        {[
          { id: 'overview', label: t('superAdmin.insights.tabs.overview'), icon: Globe },
          { id: 'countries', label: t('superAdmin.insights.tabs.countries'), icon: Users },
          { id: 'ai', label: t('superAdmin.insights.tabs.ai'), icon: TrendingUp },
          { id: 'trends', label: t('superAdmin.insights.tabs.trends'), icon: BarChart3 },
          { id: 'compliance', label: t('superAdmin.insights.tabs.compliance'), icon: ShieldCheck }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-stone-950 text-white'
                : 'text-stone-500 hover:bg-stone-50'
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
        <FocusTrap focusTrapOptions={{ escapeDeactivates: false, allowOutsideClick: true, returnFocusOnDeactivate: true }}>
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-stone-950 mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Insights Configuration
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">
                  Anonymity Threshold
                </label>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={configForm.anonymity_threshold}
                  onChange={(e) => setConfigForm({...configForm, anonymity_threshold: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-stone-200 rounded-2xl"
                />
                <p className="text-xs text-stone-500 mt-1">
                  Minimum users required to display sensitive aggregated data
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-stone-600">Fear Tracking</label>
                  <p className="text-xs text-stone-500">Infer health concerns from AI chats</p>
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
                  <label className="text-sm font-medium text-stone-600">Health Inference</label>
                  <p className="text-xs text-stone-500">Detect diet goals and health objectives</p>
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
              <button onClick={() => setShowConfigModal(false)} className="px-4 py-2 border border-stone-200 text-stone-600 rounded-2xl hover:bg-stone-50 transition-colors">Cancel</button>
              <button onClick={saveConfig} className="px-4 py-2 bg-stone-950 hover:bg-stone-800 text-white rounded-2xl transition-colors">Save</button>
            </div>
          </div>
        </div>
        </FocusTrap>
      )}
    </div>
  );
}

// ============================================================================
// TAB 1: Global Overview
// ============================================================================
function GlobalOverviewTab({ data }) {
  if (!data) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
        <p className="text-sm text-stone-500">No hay datos globales disponibles.</p>
      </div>
    );
  }

  const consentCoverage = asObject(data?.consent_coverage);
  const aiCoverage = asObject(data?.ai_coverage);
  const insightsCoverage = asObject(data?.insights_coverage);
  const sensitiveSignals = asObject(data?.sensitive_signals);
  const safeTopCountries = asArray(data?.top_countries);
  const totalUsers = asNumber(data?.total_users);
  const totalCustomers = asNumber(data?.customers);
  const totalProducers = asNumber(data?.producers);

  const userBreakdown = [
    { name: 'Customers', value: totalCustomers },
    { name: 'Producers', value: totalProducers },
    { name: 'Admins', value: Math.max(0, totalUsers - totalCustomers - totalProducers) }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Total Users Card */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6" data-testid="card-total-users">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-stone-500">Total Users</h3>
          <Users className="w-5 h-5 text-stone-950" />
        </div>
        <p className="text-4xl font-bold text-stone-950">{totalUsers}</p>
        <p className="text-sm text-stone-500 mt-2">
          {asNumber(data?.countries_count)} countries • {totalCustomers} customers
        </p>
      </div>

      {/* Consent Coverage Card */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6" data-testid="card-consent">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-stone-500">Analytics Consent</h3>
          <ShieldCheck className="w-5 h-5 text-stone-600" />
        </div>
        <p className="text-4xl font-bold text-stone-950">{asNumber(consentCoverage.consent_rate_percent)}%</p>
        <p className="text-sm text-stone-500 mt-2">
          {asNumber(consentCoverage.users_with_consent)} users consented
        </p>
      </div>

      {/* AI Profile Coverage */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6" data-testid="card-ai-coverage">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-stone-500">AI Profile Coverage</h3>
          <Brain className="w-5 h-5 text-stone-600" />
        </div>
        <p className="text-4xl font-bold text-stone-950">{asNumber(aiCoverage.ai_profile_rate_percent)}%</p>
        <p className="text-sm text-stone-500 mt-2">
          {asNumber(aiCoverage.users_with_ai_profile)} profiles created
        </p>
      </div>

      {/* Insights Coverage */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6" data-testid="card-insights-coverage">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-stone-500">Inferred Insights</h3>
          <TrendingUp className="w-5 h-5 text-stone-600" />
        </div>
        <p className="text-4xl font-bold text-stone-950">{asNumber(insightsCoverage.insights_rate_percent)}%</p>
        <p className="text-sm text-stone-500 mt-2">
          {asNumber(insightsCoverage.users_with_insights)} users with AI-inferred signals
        </p>
      </div>

      {/* Sensitive Signals */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6" data-testid="card-sensitive">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-stone-500">Sensitive Signals</h3>
          <Lock className="w-5 h-5 text-stone-500" />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-stone-500">Fear signals:</span>
            <span className="font-medium">{asNumber(sensitiveSignals.users_with_fear_signals)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-stone-500">Allergy signals:</span>
            <span className="font-medium">{asNumber(sensitiveSignals.users_with_allergy_signals)}</span>
          </div>
        </div>
        <p className="text-xs text-stone-500 mt-3 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Threshold: {asNumber(data?.anonymity_threshold, 15)} users
        </p>
      </div>

      {/* User Breakdown Chart */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6" data-testid="card-breakdown">
        <h3 className="font-medium text-stone-500 mb-4">User Distribution</h3>
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
      <div className="bg-white rounded-2xl border border-stone-200 p-6 md:col-span-2 lg:col-span-3" data-testid="card-countries">
        <h3 className="font-medium text-stone-500 mb-4">Top Countries</h3>
        <ResponsiveContainer width="100%" height={200}>
          <RechartsBarChart data={safeTopCountries.slice(0, 8)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#44403c" />
            <XAxis dataKey="country" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#0c0a09" radius={[4, 4, 0, 0]} />
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ============================================================================
// TAB 2: Country Intelligence
// ============================================================================
function CountryIntelligenceTab({ globalData, countryData, selectedCountry, onSelectCountry }) {
  if (!globalData) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
        <p className="text-sm text-stone-500">No hay datos de países para mostrar.</p>
      </div>
    );
  }

  const topCountries = asArray(globalData?.top_countries);
  const preferences = asObject(countryData?.preferences);
  const sensitive = asObject(countryData?.sensitive_signals);
  const budgetDistribution = asObject(countryData?.budget_distribution);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Country Selector */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <h3 className="font-medium text-stone-950 mb-4">Select Country</h3>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {topCountries.map((country) => (
            <button
              key={country.country}
              onClick={() => onSelectCountry(country.country)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${
                selectedCountry === country.country
                  ? 'bg-stone-950 text-white'
                  : 'bg-stone-50 text-stone-950 hover:bg-stone-200'
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
              <div className="bg-white rounded-2xl border border-stone-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-stone-950">{countryData.country}</h2>
                    <p className="text-stone-500">
                      {countryData.total_users} total users • {countryData.users_with_insights} with insights
                    </p>
                  </div>
                  <Globe className="w-10 h-10 text-stone-200" />
                </div>
              </div>

              {/* Preferences Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Top Likes */}
                <div className="bg-white rounded-2xl border border-stone-200 p-6">
                  <h3 className="font-medium text-stone-700 mb-4 flex items-center gap-2">
                    <Eye className="w-4 h-4" /> Top Likes
                  </h3>
                  <div className="space-y-2">
                    {asArray(preferences.top_likes).slice(0, 5).map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm text-stone-600">{item.tag.replace(/_/g, ' ')}</span>
                        <span className="text-sm font-medium text-stone-600">{item.percentage}%</span>
                      </div>
                    ))}
                    {asArray(preferences.top_likes).length === 0 && (
                      <p className="text-sm text-stone-500">No data yet</p>
                    )}
                  </div>
                </div>

                {/* Top Dislikes */}
                <div className="bg-white rounded-2xl border border-stone-200 p-6">
                  <h3 className="font-medium text-stone-700 mb-4 flex items-center gap-2">
                    <EyeOff className="w-4 h-4" /> Top Dislikes
                  </h3>
                  <div className="space-y-2">
                    {asArray(preferences.top_dislikes).slice(0, 5).map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm text-stone-600">{item.tag.replace(/_/g, ' ')}</span>
                        <span className="text-sm font-medium text-stone-600">{item.percentage}%</span>
                      </div>
                    ))}
                    {asArray(preferences.top_dislikes).length === 0 && (
                      <p className="text-sm text-stone-500">No data yet</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Budget Distribution */}
              <div className="bg-white rounded-2xl border border-stone-200 p-6">
                <h3 className="font-medium text-stone-950 mb-4">Budget Distribution</h3>
                <div className="flex gap-4">
                  {Object.entries(budgetDistribution).map(([level, percent]) => (
                    <div key={level} className="flex-1 text-center">
                      <div className="text-2xl font-bold text-stone-950">{percent}%</div>
                      <div className="text-sm text-stone-500 capitalize">{level}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sensitive Signals (if compliant) */}
              {Boolean(sensitive.anonymity_compliant) && (
                <div className="bg-stone-50 rounded-2xl border border-stone-200 p-6">
                  <h3 className="font-medium text-stone-700 mb-4 flex items-center gap-2">
                    <Lock className="w-4 h-4" /> Sensitive Signals (Aggregated)
                  </h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-stone-600 mb-2">Health Fears</h4>
                      {asArray(sensitive.fears).slice(0, 3).map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span>{item.tag.replace(/_/g, ' ')}</span>
                          <span className="font-medium">{item.percentage}%</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-stone-600 mb-2">Allergies</h4>
                      {asArray(sensitive.allergies).slice(0, 3).map((item, i) => (
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
            <div className="bg-stone-50 rounded-2xl border border-stone-200 p-8 text-center">
              <AlertTriangle className="w-12 h-12 text-stone-400 mx-auto mb-4" />
              <h3 className="font-medium text-stone-700 mb-2">Insufficient Data</h3>
              <p className="text-stone-600 text-sm">{countryData.message}</p>
            </div>
          )
        ) : (
          <div className="bg-stone-50 rounded-2xl border border-stone-200 p-8 text-center">
            <Globe className="w-12 h-12 text-stone-200 mx-auto mb-4" />
            <p className="text-stone-500">Select a country to view detailed insights</p>
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
  if (!data) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
        <p className="text-sm text-stone-500">No hay métricas de IA disponibles.</p>
      </div>
    );
  }

  const aiInteractions = asObject(data?.ai_interactions);
  const conversionMetrics = asObject(data?.conversion_metrics);

  const actionData = Object.entries(asObject(data?.action_usage))
    .filter(([_, v]) => asNumber(v) > 0)
    .map(([key, value]) => ({
      name: key.replace(/_/g, ' '),
      value: asNumber(value)
    }));

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <h3 className="text-sm text-stone-500 mb-2">Total AI Messages</h3>
          <p className="text-3xl font-bold text-stone-950">{asNumber(aiInteractions.total_messages)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <h3 className="text-sm text-stone-500 mb-2">Unique Sessions</h3>
          <p className="text-3xl font-bold text-stone-950">{asNumber(aiInteractions.unique_sessions)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <h3 className="text-sm text-stone-500 mb-2">Recommendation Acceptance</h3>
          <p className="text-3xl font-bold text-stone-950">{asNumber(conversionMetrics.recommendation_acceptance_rate)}%</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <h3 className="text-sm text-stone-500 mb-2">AI-Influenced Orders</h3>
          <p className="text-3xl font-bold text-stone-950">{asNumber(conversionMetrics.ai_influenced_orders_percent)}%</p>
        </div>
      </div>

      {/* Action Usage Chart */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <h3 className="font-medium text-stone-950 mb-4">AI Action Usage</h3>
        {actionData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <RechartsBarChart data={actionData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#44403c" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={150} />
              <Tooltip />
              <Bar dataKey="value" fill="#0c0a09" radius={[0, 4, 4, 0]} />
            </RechartsBarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-stone-500 py-8">No action data yet</p>
        )}
      </div>

      {/* Conversion Funnel */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <h3 className="font-medium text-stone-950 mb-4">Conversion Impact</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-stone-50 rounded-2xl">
            <p className="text-sm text-stone-500">Total Orders</p>
            <p className="text-2xl font-bold text-stone-950">{asNumber(conversionMetrics.total_orders)}</p>
          </div>
          <div className="p-4 bg-stone-50 rounded-2xl">
            <p className="text-sm text-stone-600">From AI Users</p>
            <p className="text-2xl font-bold text-stone-950">{asNumber(conversionMetrics.orders_from_ai_users)}</p>
          </div>
          <div className="p-4 bg-stone-50 rounded-2xl">
            <p className="text-sm text-stone-600">&quot;Add All&quot; Usage</p>
            <p className="text-2xl font-bold text-stone-950">{asNumber(conversionMetrics.add_all_to_cart_usage)}</p>
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
  if (!data) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
        <p className="text-sm text-stone-500">No hay tendencias disponibles.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Diet Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <h3 className="font-medium text-stone-950 mb-4">Diet Goal Trends</h3>
          {asArray(data?.diet_trends).length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <RechartsBarChart data={asArray(data?.diet_trends).slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#44403c" />
                <XAxis dataKey="tag" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => `${value}%`} />
                <Bar dataKey="percentage" fill="#d6d3d1" radius={[4, 4, 0, 0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-stone-500 py-8">Insufficient data</p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <h3 className="font-medium text-stone-950 mb-4">Product Interest Trends</h3>
          {asArray(data?.product_interest_trends).length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={asArray(data?.product_interest_trends).slice(0, 6)}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="percentage"
                  nameKey="tag"
                  label={({ tag, percentage }) => `${tag.replace(/_/g, ' ')} ${percentage}%`}
                >
                  {asArray(data?.product_interest_trends).slice(0, 6).map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-stone-500 py-8">Insufficient data</p>
          )}
        </div>
      </div>

      {/* Fear Trends (Sensitive) */}
      <div className="bg-stone-50 rounded-2xl border border-stone-200 p-6">
        <h3 className="font-medium text-stone-700 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Health Concern Trends (Sensitive - Aggregated Only)
        </h3>
        {asArray(data?.fear_trends).length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {asArray(data?.fear_trends).slice(0, 8).map((item, i) => (
              <div key={i} className="bg-white p-3 rounded-2xl">
                <p className="text-sm text-stone-600 font-medium">{item.tag.replace(/_/g, ' ')}</p>
                <p className="text-xl font-bold text-stone-900">{item.percentage}%</p>
                <p className="text-xs text-stone-500">{item.count} users</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-stone-600 text-sm">
            {typeof data.fear_trends === 'object' && data.fear_trends.message 
              ? data.fear_trends.message 
              : 'Insufficient users for anonymized display'}
          </p>
        )}
      </div>

      {/* Catalog Gaps */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <h3 className="font-medium text-stone-950 mb-4">Potential Catalog Gaps</h3>
        <p className="text-sm text-stone-500 mb-4">
          Products users are asking about but may not be well represented in catalog
        </p>
        {asArray(data?.potential_catalog_gaps).length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {asArray(data?.potential_catalog_gaps).slice(0, 8).map((gap, i) => (
              <div key={i} className="bg-stone-50 p-3 rounded-2xl">
                <p className="font-medium text-stone-950">{gap.interest.replace(/_/g, ' ')}</p>
                <p className="text-sm text-stone-500">{gap.demand_signals} demand signals</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-stone-500 py-4">No significant gaps detected</p>
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
      const [auditData, gdprData] = await Promise.all([
        apiClient.get(`/insights/audit-log`),
        apiClient.get(`/insights/gdpr-summary`)
      ]);
      setAuditLog(auditData);
      setGdprSummary(gdprData);
    } catch {
      // handled silently
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'audit' || activeSubTab === 'gdpr') {
      fetchAuditLog();
    }
  }, [activeSubTab]);

  if (!data) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
        <p className="text-sm text-stone-500">No hay datos de compliance disponibles.</p>
      </div>
    );
  }

  const riskAssessment = asObject(data?.risk_assessment);
  const consentMetrics = asObject(data?.consent_metrics);
  const sensitiveCoverage = asObject(data?.sensitive_data_coverage);
  const anonymityCompliance = asObject(data?.anonymity_compliance);
  const dataRetention = asObject(data?.data_retention);
  const riskLevel = ['green', 'amber', 'red'].includes(riskAssessment.level) ? riskAssessment.level : 'amber';

  const riskColor = {
    green: 'bg-stone-100 text-stone-700 border-stone-200',
    amber: 'bg-stone-100 text-stone-700 border-stone-200',
    red: 'bg-stone-100 text-stone-700 border-stone-200'
  };

  const RiskIcon = ({ level }) => {
    if (level === 'green') return <CheckCircle2 className="w-4 h-4 text-stone-600" />;
    if (level === 'amber') return <AlertTriangle className="w-4 h-4 text-stone-500" />;
    return <XCircle className="w-4 h-4 text-stone-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex gap-2 bg-stone-50 p-1 rounded-2xl w-fit">
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
                ? 'bg-white shadow-sm text-stone-950'
                : 'text-stone-500 hover:text-stone-950'
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
          <div className={`rounded-2xl border-2 p-6 ${riskColor[riskLevel]}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-xl flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6" />
                  Legal Risk Level: {String(riskLevel).toUpperCase()}
                </h3>
                {asArray(riskAssessment.factors).length > 0 ? (
                  <ul className="mt-3 text-sm space-y-1">
                    {asArray(riskAssessment.factors).map((factor, i) => (
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
                <RiskIcon level={riskLevel} />
              </div>
            </div>
          </div>

          {/* Consent & Sensitive Data Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Consent Coverage */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6">
              <h3 className="font-medium text-stone-950 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Consent Coverage
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-stone-500">Analytics Consent Rate</span>
                    <span className="font-bold text-lg">{asNumber(consentMetrics.consent_rate_percent)}%</span>
                  </div>
                  <div className="w-full bg-stone-200 rounded-full h-4 overflow-hidden">
                    <div 
                      className={`h-4 rounded-full transition-all bg-stone-600`}
                      style={{ width: `${asNumber(consentMetrics.consent_rate_percent)}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-stone-50 p-4 rounded-2xl text-center">
                    <p className="text-3xl font-bold text-stone-950">{asNumber(consentMetrics.users_with_consent)}</p>
                    <p className="text-xs text-stone-600 font-medium">Consented Users</p>
                  </div>
                  <div className="bg-stone-100 p-4 rounded-2xl text-center">
                    <p className="text-3xl font-bold text-stone-600">{asNumber(consentMetrics.users_without_consent)}</p>
                    <p className="text-xs text-stone-600 font-medium">No Consent</p>
                  </div>
                </div>
                {/* Consent Versions */}
                {Object.keys(asObject(consentMetrics.consent_versions)).length > 0 && (
                  <div className="pt-3 border-t border-stone-200">
                    <p className="text-xs text-stone-500 mb-2">Consent by Version:</p>
                    <div className="flex gap-2">
                      {Object.entries(asObject(consentMetrics.consent_versions)).map(([version, count]) => (
                        <span key={version} className="px-2 py-1 bg-stone-100 text-stone-700 text-xs rounded">
                          v{version}: {count} users
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sensitive Data Coverage */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6">
              <h3 className="font-medium text-stone-950 mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Sensitive Data Tracking
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-stone-50 rounded-2xl">
                  <span className="text-stone-700 text-sm">Fear/Health Signals</span>
                  <span className="font-bold text-stone-900">{asNumber(sensitiveCoverage.users_with_fear_signals)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-stone-50 rounded-2xl">
                  <span className="text-stone-700 text-sm">Allergy Signals</span>
                  <span className="font-bold text-stone-900">{asNumber(sensitiveCoverage.users_with_allergy_signals)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-stone-50 rounded-2xl">
                  <span className="text-stone-700 text-sm">Health Goal Signals</span>
                  <span className="font-bold text-stone-900">{asNumber(sensitiveCoverage.users_with_health_signals)}</span>
                </div>
              </div>
              <p className="text-xs text-stone-500 mt-4 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                All sensitive data displayed only in aggregates of {asNumber(anonymityCompliance.threshold, 15)}+ users
              </p>
            </div>
          </div>

          {/* Anonymity & Retention Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Anonymity Compliance */}
            <div className="rounded-2xl border-2 p-6 bg-stone-50 border-stone-200">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                {anonymityCompliance.fully_compliant ? (
                  <ShieldCheck className="w-5 h-5 text-stone-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-stone-500" />
                )}
                Anonymity Status
              </h3>
              <p className="text-3xl font-bold mb-2">
                {anonymityCompliance.fully_compliant ? 'Compliant' : 'Review Needed'}
              </p>
              <p className="text-sm opacity-70">
                Threshold: {asNumber(anonymityCompliance.threshold, 15)} users
              </p>
              {asNumber(anonymityCompliance.countries_below_threshold) > 0 && (
                <p className="text-sm mt-2 text-stone-600">
                  {asNumber(anonymityCompliance.countries_below_threshold)} countries below threshold
                </p>
              )}
            </div>

            {/* Data Retention */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6">
              <h3 className="font-medium text-stone-950 mb-3">Data Retention</h3>
              <p className="text-2xl font-bold text-stone-950 mb-2">
                {asNumber(dataRetention.retention_days)} days
              </p>
              <p className="text-sm text-stone-500">{dataRetention.policy || 'N/A'}</p>
            </div>

            {/* Export Status */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6">
              <h3 className="font-medium text-stone-950 mb-3">Data Exports</h3>
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-4 h-4 rounded-full ${data.exports_enabled ? 'bg-stone-600' : 'bg-stone-400'}`} />
                <span className="text-lg font-bold">{data.exports_enabled ? 'Enabled' : 'Disabled'}</span>
              </div>
              <p className="text-xs text-stone-500">
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-950"></div>
            </div>
          ) : auditLog ? (
            <>
              {/* Consent Trend Chart */}
              {asArray(auditLog?.consent_trend).length > 0 && (
                <div className="bg-white rounded-2xl border border-stone-200 p-6">
                  <h3 className="font-medium text-stone-950 mb-4">Consent Trend (Last 14 Days)</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={asArray(auditLog?.consent_trend)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#44403c" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="consents" fill="#78716c" stroke="#78716c" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Recent Consents */}
              <div className="bg-white rounded-2xl border border-stone-200 p-6">
                <h3 className="font-medium text-stone-950 mb-4">Recent Consent Grants (Anonymized)</h3>
                {asArray(auditLog?.recent_consents).length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-stone-200">
                          <th className="text-left py-2 text-stone-500 font-medium">User (Masked)</th>
                          <th className="text-left py-2 text-stone-500 font-medium">Country</th>
                          <th className="text-left py-2 text-stone-500 font-medium">Version</th>
                          <th className="text-left py-2 text-stone-500 font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {asArray(auditLog?.recent_consents).slice(0, 10).map((consent, i) => (
                          <tr key={i} className="border-b border-stone-50">
                            <td className="py-2 font-mono text-xs">{consent.masked_email}</td>
                            <td className="py-2">{consent.country || '-'}</td>
                            <td className="py-2">
                              <span className="px-2 py-0.5 bg-stone-100 text-stone-700 text-xs rounded">
                                v{consent.consent_version || '1.0'}
                              </span>
                            </td>
                            <td className="py-2 text-stone-500">
                              {consent.consent_date ? new Date(consent.consent_date).toLocaleDateString() : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-stone-500 text-center py-4">No recent consents</p>
                )}
              </div>
            </>
          ) : (
            <p className="text-center text-stone-500 py-8">Failed to load audit data</p>
          )}
        </div>
      )}

      {/* GDPR Summary Sub-tab */}
      {activeSubTab === 'gdpr' && (
        <div className="space-y-6">
          {loadingAudit ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-950"></div>
            </div>
          ) : gdprSummary ? (
            <>
              {/* Compliance Status Banner */}
              <div className="bg-stone-50 border-2 border-stone-200 rounded-2xl p-6">
                <div className="flex items-center gap-4">
                  <ShieldCheck className="w-12 h-12 text-stone-600" />
                  <div>
                    <h2 className="text-2xl font-bold text-stone-700">{gdprSummary?.compliance_status || 'COMPLIANT'}</h2>
                    <p className="text-stone-600">Data Controller: {gdprSummary?.data_controller || 'Hispaloshop'}</p>
                  </div>
                </div>
              </div>

              {/* Data Categories */}
              <div className="bg-white rounded-2xl border border-stone-200 p-6">
                <h3 className="font-medium text-stone-950 mb-4">Data Categories & Legal Basis</h3>
                <div className="space-y-4">
                  {Object.entries(asObject(gdprSummary?.data_categories)).map(([key, category]) => (
                    <div key={key} className="p-4 bg-stone-50 rounded-2xl">
                      <h4 className="font-medium text-stone-950 capitalize mb-2">{key} Data</h4>
                      <p className="text-sm text-stone-500 mb-2">{category.description}</p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="px-2 py-1 bg-stone-100 text-stone-700 rounded">
                          Legal Basis: {category.legal_basis}
                        </span>
                        <span className="px-2 py-1 bg-stone-100 text-stone-700 rounded">
                          Retention: {category.retention}
                        </span>
                        {category.anonymity_threshold && (
                          <span className="px-2 py-1 bg-stone-100 text-stone-700 rounded">
                            Threshold: {category.anonymity_threshold} users
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Technical Measures */}
              <div className="bg-white rounded-2xl border border-stone-200 p-6">
                <h3 className="font-medium text-stone-950 mb-4">Technical & Organizational Measures</h3>
                <ul className="space-y-2">
                  {asArray(gdprSummary?.technical_measures).map((measure, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-stone-600 rounded-full" />
                      {measure}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Generated timestamp */}
              <p className="text-xs text-stone-500 text-right">
                Generated: {gdprSummary?.generated_at ? new Date(gdprSummary.generated_at).toLocaleString() : '-'}
              </p>
            </>
          ) : (
            <p className="text-center text-stone-500 py-8">Failed to load GDPR summary</p>
          )}
        </div>
      )}
    </div>
  );
}
