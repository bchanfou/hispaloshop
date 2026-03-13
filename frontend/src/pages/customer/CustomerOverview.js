import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../services/api/client';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import {
  ShoppingBag, Search, Package, Heart, Truck, Check,
  Clock, ChevronRight, Star, Store, Compass, Zap, ArrowRight,
  TrendingUp, Flame
} from 'lucide-react';
import { asNumber, firstToken } from '../../utils/safe';

const statusIcons = { paid: Check, confirmed: Check, preparing: Package, shipped: Truck, delivered: Check, pending: Clock };
const statusColors = { paid: 'bg-green-100 text-green-600', confirmed: 'bg-blue-100 text-blue-600', preparing: 'bg-amber-100 text-amber-600', shipped: 'bg-purple-100 text-purple-600', delivered: 'bg-green-100 text-green-600', pending: 'bg-stone-100 text-stone-500' };

const getProductId = (product) => product?.product_id || product?.id || null;
const getStoreSlug = (store) => store?.store_slug || store?.slug || null;
const formatPrice = (value) => {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric.toFixed(2) : '0.00';
};

export default function CustomerOverview() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [followedStores, setFollowedStores] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState([]);
  const [trending, setTrending] = useState([]);

  useEffect(() => {
    Promise.all([
      apiClient.get('/customer/orders').then(data => {
        setOrders((Array.isArray(data) ? data : data?.orders || []).slice(0, 3));
      }).catch(() => setOrders([])),
      apiClient.get('/customer/followed-stores').then(data => {
        setFollowedStores(Array.isArray(data) ? data : data?.stores || []);
      }).catch(() => setFollowedStores([])),
      apiClient.get('/products?limit=8&sort=newest').then(data => {
        const ps = data?.products || data || [];
        setRecommended(ps.slice(0, 4));
        setTrending(ps.slice(4, 8));
      }).catch(() => {}),
      apiClient.get('/customer/predictions').then(data => {
        const actionable = (data?.predictions || []).filter(p => ['overdue', 'due', 'soon'].includes(p.status));
        setPredictions(actionable.slice(0, 3));
      }).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const latestOrder = orders[0];
  const StatusIcon = latestOrder ? (statusIcons[latestOrder.status] || Clock) : Clock;

  if (loading) return <div className="flex justify-center py-20"><div className="loading-spinner" /></div>;

  return (
    <div className="space-y-6 pb-4" data-testid="customer-dashboard">
      {/* Greeting */}
      <div>
        <h1 className="font-heading text-xl md:text-2xl font-bold text-text-primary">
          {t('customerDashboard.greeting')}, {firstToken(user?.name, 'usuario')}
        </h1>
        <p className="text-sm text-text-muted mt-0.5">{t('customerDashboard.welcomeBack', 'Bienvenido de vuelta')}</p>
      </div>

      {/* Latest order status - compact card */}
      {latestOrder && (
        <Link to="/dashboard/orders" className="block bg-white rounded-2xl border border-stone-200 p-4 hover:shadow-sm transition-all" data-testid="latest-order">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${statusColors[latestOrder.status] || 'bg-stone-100 text-stone-500'}`}>
              <StatusIcon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-text-primary">
                {latestOrder.status === 'shipped' ? t('customerDashboard.orderShipped') :
                 latestOrder.status === 'delivered' ? t('customerDashboard.orderDelivered') :
                 latestOrder.status === 'preparing' ? t('customerDashboard.orderPreparing') :
                 latestOrder.status === 'paid' ? t('customerDashboard.orderConfirmed') :
                 t('customerDashboard.orderPending')}
              </p>
              <p className="text-xs text-text-muted">{latestOrder.line_items?.length || 0} items · {asNumber(latestOrder.total_amount).toFixed(2)}€</p>
            </div>
            <ChevronRight className="w-4 h-4 text-text-muted" />
          </div>
        </Link>
      )}

      {/* Quick Actions - Horizontal scrollable */}
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1" data-testid="quick-actions">
        {[
          { to: '/products', icon: Search, label: t('customerDashboard.explore'), color: 'text-primary', bg: 'bg-stone-50' },
          { to: '/dashboard/orders', icon: Package, label: t('customerDashboard.orders'), color: 'text-primary', bg: 'bg-stone-50' },
          { to: '/dashboard/followed-stores', icon: Heart, label: t('customerDashboard.saved'), color: 'text-red-400', bg: 'bg-red-50' },
          { to: '/recipes', icon: Star, label: t('nav.recipes', 'Recetas'), color: 'text-amber-500', bg: 'bg-amber-50' },
          { to: '/stores', icon: Store, label: t('nav.stores', 'Tiendas'), color: 'text-primary', bg: 'bg-stone-50' },
          { to: '/discover', icon: Compass, label: t('customerDashboard.discoverProducers'), color: 'text-primary', bg: 'bg-stone-50' },
        ].map(a => (
          <Link key={a.to} to={a.to} className={`shrink-0 flex items-center gap-2 ${a.bg} rounded-full px-4 py-2.5 border border-stone-200/80 hover:shadow-sm transition-all`}>
            <a.icon className={`w-4 h-4 ${a.color}`} />
            <span className="text-xs font-medium text-text-primary whitespace-nowrap">{a.label}</span>
          </Link>
        ))}
      </div>

      {/* Hispalo Predict */}
      {predictions.length > 0 && (
        <div data-testid="predict-overview">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-stone-900" />
              <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Predict</h2>
            </div>
            <Link to="/dashboard/predictions" className="text-xs text-primary hover:underline flex items-center gap-0.5">
              {t('customerDashboard.seeAll')} <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {predictions.map(p => {
              const daysAbs = Math.abs(p.days_until_next);
              const isOverdue = p.status === 'overdue';
              return (
                <div key={p.product_id} className={`shrink-0 w-[240px] flex items-center gap-3 rounded-xl border p-3 ${isOverdue ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                  {p.image ? (
                    <img src={p.image} alt="" className="w-10 h-10 rounded-lg object-cover" onError={e => { e.target.style.display = 'none'; }} />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-white/60 flex items-center justify-center">
                      <ShoppingBag className="w-4 h-4 text-stone-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-900 truncate">{p.product_name}</p>
                    <p className={`text-xs ${isOverdue ? 'text-red-600' : 'text-amber-600'}`}>
                      {isOverdue ? `Hace ${daysAbs} dias` : p.status === 'due' ? 'Toca hoy' : `En ${daysAbs} dias`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* For You - Horizontal scrollable product cards */}
      <div data-testid="recommended-products">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">{t('customerDashboard.forYou')}</h2>
          </div>
          <Link to="/products" className="text-xs text-primary hover:underline flex items-center gap-0.5">{t('customerDashboard.seeAll')} <ChevronRight className="w-3 h-3" /></Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
          {recommended.map(p => {
            const productId = getProductId(p);
            return (
            <Link key={productId || p.name} to={productId ? `/products/${productId}` : '/products'} className="shrink-0 w-[160px] bg-white rounded-xl border border-stone-200 overflow-hidden hover:shadow-md transition-all group">
              <div className="aspect-square bg-stone-100 overflow-hidden">
                {p.images?.[0] ? <img src={p.images[0]} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <ShoppingBag className="w-8 h-8 text-stone-300 m-auto mt-12" />}
              </div>
              <div className="p-2.5">
                <p className="text-xs font-medium text-text-primary truncate">{p.name}</p>
                <p className="text-sm font-bold text-primary">{formatPrice(p.display_price || p.price)}€</p>
              </div>
            </Link>
          );})}
        </div>
      </div>

      {/* Followed stores */}
      {followedStores.length > 0 && (
        <div data-testid="followed-stores">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">{t('customerDashboard.storesYouFollow')}</h2>
            <Link to="/stores" className="text-xs text-primary hover:underline">{t('customerDashboard.seeAll')}</Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {followedStores.map(s => {
              const storeSlug = getStoreSlug(s);
              return (
              <Link key={s.store_id || s.follower_id || storeSlug} to={storeSlug ? `/store/${storeSlug}` : '/stores'} className="shrink-0 flex flex-col items-center gap-1">
                <div className="w-14 h-14 rounded-full bg-stone-200 border-2 border-stone-200 overflow-hidden">
                  {s.store_logo ? <img src={s.store_logo} alt="" className="w-full h-full object-cover" /> : <Store className="w-6 h-6 text-stone-400 m-auto mt-3" />}
                </div>
                <span className="text-[10px] text-text-muted w-14 truncate text-center">{s.store_name}</span>
              </Link>
            );})}
          </div>
        </div>
      )}

      {/* Trending section */}
      {trending.length > 0 && (
        <div data-testid="trending-products">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-stone-600" />
              <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">{t('customerDashboard.trending', 'Tendencia')}</h2>
            </div>
          </div>
          <div className="space-y-2">
            {trending.map((p, i) => {
              const productId = getProductId(p);
              return (
              <Link key={productId || `${p.name}-${i}`} to={productId ? `/products/${productId}` : '/products'} className="flex items-center gap-3 bg-white rounded-xl border border-stone-200 p-3 hover:shadow-sm transition-all">
                <span className="text-lg font-bold text-stone-300 w-6 text-center">{i + 1}</span>
                <div className="w-12 h-12 rounded-lg bg-stone-100 overflow-hidden shrink-0">
                  {p.images?.[0] ? <img src={p.images[0]} alt="" className="w-full h-full object-cover" /> : <ShoppingBag className="w-5 h-5 text-stone-300 m-auto mt-3" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{p.name}</p>
                  <p className="text-xs text-text-muted">{p.store_name || ''}</p>
                </div>
                <p className="text-sm font-bold text-primary shrink-0">{formatPrice(p.display_price || p.price)}€</p>
              </Link>
            );})}
          </div>
        </div>
      )}

      {/* Continue Shopping CTA */}
      <Link to="/products" className="block bg-primary rounded-2xl p-5 text-center hover:bg-primary-hover transition-all" data-testid="continue-shopping-cta">
        <ShoppingBag className="w-7 h-7 mx-auto text-white mb-2" />
        <p className="text-sm font-semibold text-white">{t('customerDashboard.continueShopping', 'Seguir comprando')}</p>
        <p className="text-xs text-stone-400 mt-0.5">{t('customerDashboard.discoverNew', 'Descubre productos nuevos')}</p>
      </Link>
    </div>
  );
}
