import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Package, ShoppingBag, CreditCard, AlertCircle, CheckCircle, ExternalLink, Loader2, Users, TrendingUp, Heart, Star, Zap, Target, Globe, MapPin } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { API } from '../../utils/api';
import { useTranslation } from 'react-i18next';

function StatCard({ icon: Icon, label, value, sublabel, linkTo, color = "primary" }) {
  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    amber: "bg-amber-100 text-amber-600",
    purple: "bg-purple-100 text-purple-600"
  };
  
  return (
    <Link 
      to={linkTo}
      className="bg-white rounded-xl border border-stone-200 p-6 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-text-muted text-sm mb-1">{label}</p>
          <p className="text-3xl font-bold text-text-primary">{value}</p>
          {sublabel && (
            <p className="text-sm text-text-muted mt-1">{sublabel}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color] || colorClasses.primary}`}>
          <Icon className="w-6 h-6" />
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

  useEffect(() => {
    fetchStripeStatus();
  }, []);

  const fetchStripeStatus = async () => {
    try {
      const response = await axios.get(`${API}/importer/payments`, { withCredentials: true });
      setStripeStatus({
        connected: response.data?.stripe_connected || false,
      });
    } catch (error) {
      console.error('Error fetching Stripe status:', error);
      setStripeStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  };

  const handleConnectStripe = async () => {
    setConnecting(true);
    try {
      const response = await axios.post(`${API}/producer/stripe/create-account`, {}, { withCredentials: true });
      if (response.data?.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error('Error connecting Stripe:', error);
      toast.error('Failed to start Stripe onboarding');
    } finally {
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-stone-200 p-6 mb-8">
        <div className="flex items-center gap-2 text-text-muted">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-6 mb-8">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-lg ${stripeStatus?.connected ? 'bg-green-100' : 'bg-amber-100'}`}>
            <CreditCard className={`w-6 h-6 ${stripeStatus?.connected ? 'text-green-600' : 'text-amber-600'}`} />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary text-lg mb-1">Stripe Payouts</h3>
            {stripeStatus?.connected ? (
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
              {stripeStatus?.connected 
                ? 'Your account is connected. You will automatically receive payouts for your sales.'
                : 'Connect your Stripe account to receive automatic payouts for your imported products.'}
            </p>
          </div>
        </div>
        <div>
          {!stripeStatus?.connected && (
            <Button
              onClick={handleConnectStripe}
              disabled={connecting}
              className="bg-primary hover:bg-primary-hover text-white"
            >
              {connecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect Stripe'
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function CountriesOfOrigin({ countries }) {
  if (!countries || countries.length === 0) return null;
  
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-6 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Globe className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-text-primary">Countries of Origin</h2>
      </div>
      <div className="flex flex-wrap gap-2">
        {countries.map((country, idx) => (
          <span 
            key={idx}
            className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium flex items-center gap-1"
          >
            <MapPin className="w-3 h-3" />
            {country}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ImporterDashboardPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setError(null);
      const response = await axios.get(`${API}/importer/stats`, { withCredentials: true });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching importer stats:', error);
      setError('Failed to load dashboard data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-text-muted">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={fetchData} className="bg-primary hover:bg-primary-hover text-white">
          Retry
        </Button>
      </div>
    );
  }

  const isPending = !user?.approved;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-heading text-3xl font-bold text-text-primary mb-2">
        Importer Dashboard
      </h1>
      <p className="text-text-muted mb-8">
        Manage your imported products and track sales from multiple countries
      </p>

      {/* Pending Warning */}
      {isPending && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-amber-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-900 mb-1">Account Pending Approval</h3>
              <p className="text-amber-800">
                Your importer account is pending approval. You can add products but they won't be visible until approved.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stripe Connect Section */}
      <StripeConnectSection />

      {/* Countries of Origin */}
      <CountriesOfOrigin countries={stats?.countries_of_origin || []} />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={Package}
          label="Total Products"
          value={stats?.total_products || 0}
          sublabel={`${stats?.approved_products || 0} approved`}
          linkTo="/importer/catalog"
          color="blue"
        />
        <StatCard
          icon={ShoppingBag}
          label="Orders"
          value={stats?.total_orders || 0}
          linkTo="/importer/orders"
          color="green"
        />
        <StatCard
          icon={Users}
          label="Store Followers"
          value={stats?.follower_count || 0}
          linkTo="/store"
          color="purple"
        />
        <StatCard
          icon={Globe}
          label="Countries"
          value={(stats?.countries_of_origin || []).length}
          sublabel="of origin"
          linkTo="/importer/catalog"
          color="amber"
        />
      </div>

      {/* Recent Reviews */}
      {stats?.recent_reviews && stats.recent_reviews.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-yellow-500" />
            <h2 className="font-semibold text-text-primary">Recent Reviews</h2>
          </div>
          <div className="space-y-4">
            {stats.recent_reviews.slice(0, 3).map((review, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-stone-50 rounded-lg">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="font-medium">{review.rating}/10</span>
                </div>
                <div>
                  <p className="text-sm text-text-primary">{review.comment}</p>
                  <p className="text-xs text-text-muted mt-1">by {review.user_name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Low Stock Alert */}
      {stats?.low_stock_products && stats.low_stock_products.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h2 className="font-semibold text-red-900">Low Stock Alert</h2>
          </div>
          <div className="space-y-2">
            {stats.low_stock_products.map((product) => (
              <div key={product.product_id} className="flex items-center justify-between p-2 bg-white rounded">
                <span className="text-sm">{product.name}</span>
                <span className="text-sm font-medium text-red-600">{product.stock} left</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-stone-200 p-6">
        <h2 className="font-heading text-lg font-semibold text-text-primary mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/importer/catalog"
            className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
          >
            <Package className="w-5 h-5 text-blue-600" />
            <span className="text-blue-800 font-medium">Manage Products</span>
          </Link>
          <Link
            to="/producer/store-profile"
            className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors"
          >
            <Globe className="w-5 h-5 text-purple-600" />
            <span className="text-purple-800 font-medium">Edit Store Profile</span>
          </Link>
          <Link
            to="/importer/orders"
            className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition-colors"
          >
            <ShoppingBag className="w-5 h-5 text-green-600" />
            <span className="text-green-800 font-medium">View Orders</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
