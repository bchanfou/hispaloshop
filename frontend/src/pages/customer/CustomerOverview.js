import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../services/api/client';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import {
  ShoppingBag, Search, Package, Heart, Truck, Check,
  Clock, ChevronRight, Star, Store, Compass, Zap, ArrowRight,
  TrendingUp, Flame, Sparkles, Bookmark
} from 'lucide-react';
import { asNumber, firstToken } from '../../utils/safe';
import { getStatusColor, getStatusIcon } from '../../components/OrderStatusBadge';
import { useLocale } from '../../context/LocaleContext';

const getProductId = (product) => product?.product_id || product?.id || null;
const getStoreSlug = (store) => store?.store_slug || store?.slug || null;

export default function CustomerOverview() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { convertAndFormatPrice, currency } = useLocale();
  const [orders, setOrders] = useState([]);
  const [followedStores, setFollowedStores] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState([]);
  const [trending, setTrending] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    let errorCount = 0;
    const onErr = () => { errorCount++; if (active && errorCount >= 3) setLoadError(true); };
    Promise.all([
      apiClient.get('/customer/orders').then(data => {
        if (active) setOrders((Array.isArray(data) ? data : data?.orders || []).slice(0, 3));
      }).catch(() => { if (active) setOrders([]); onErr(); }),
      apiClient.get('/customer/followed-stores').then(data => {
        if (active) setFollowedStores(Array.isArray(data) ? data : data?.stores || []);
      }).catch(() => { if (active) setFollowedStores([]); onErr(); }),
      apiClient.get('/products?limit=8&sort=newest').then(data => {
        if (!active) return;
        const ps = data?.products || data || [];
        setRecommended(ps.slice(0, 4));
        setTrending(ps.slice(4, 8));
      }).catch(onErr),
      apiClient.get('/customer/predictions').then(data => {
        if (!active) return;
        const actionable = (data?.predictions || []).filter(p => ['overdue', 'due', 'soon'].includes(p.status));
        setPredictions(actionable.slice(0, 3));
      }).catch(onErr),
      apiClient.get('/wishlist').then(data => {
        if (active) setWishlist((Array.isArray(data) ? data : data?.items || []).slice(0, 4));
      }).catch(onErr),
    ]).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const latestOrder = orders[0];
  const StatusIcon = latestOrder ? getStatusIcon(latestOrder.status) : Clock;

  if (loading) return <div className="flex justify-center py-20"><div className="loading-spinner" /></div>;

  return (
    <>
    {loadError && (
      <div className="mx-4 mt-2 mb-4 rounded-xl bg-stone-100 px-4 py-3 text-sm text-stone-500 text-center">
        Algunos datos no se han podido cargar. Desliza hacia abajo para reintentar.
      </div>
    )}
    <div className="space-y-6 pb-4" data-testid="customer-dashboard" style={{ background: 'var(--color-cream)', fontFamily: 'var(--font-sans)' }}>
      {/* Greeting */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--color-black)' }}>
          {t('customerDashboard.greeting')}, {firstToken(user?.name, 'usuario')}
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-stone)' }}>{t('customerDashboard.welcomeBack', 'Bienvenido de vuelta')}</p>
      </div>

      {/* Latest order status - BLACK card */}
      {latestOrder && (
        <Link to="/dashboard/orders" className="block p-4 transition-all" style={{ background: 'var(--color-black)', borderRadius: 'var(--radius-xl)', color: '#fff' }} data-testid="latest-order">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.12)' }}>
              <StatusIcon className="w-5 h-5" style={{ color: '#fff' }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: '#fff' }}>
                {latestOrder.status === 'shipped' ? t('customerDashboard.orderShipped') :
                 latestOrder.status === 'delivered' ? t('customerDashboard.orderDelivered') :
                 latestOrder.status === 'preparing' ? t('customerDashboard.orderPreparing') :
                 latestOrder.status === 'paid' ? t('customerDashboard.orderConfirmed') :
                 t('customerDashboard.orderPending')}
              </p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{latestOrder.line_items?.length || 0} items · {convertAndFormatPrice(asNumber(latestOrder.total_amount), currency)}</p>
            </div>
            <ChevronRight className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.5)' }} />
          </div>
          {/* Green progress bar */}
          <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.12)' }}>
            <div className="h-full rounded-full" style={{
              background: 'var(--color-white)',
              width: latestOrder.status === 'delivered' ? '100%' : latestOrder.status === 'shipped' ? '75%' : latestOrder.status === 'preparing' ? '50%' : '25%'
            }} />
          </div>
        </Link>
      )}

      {/* Stats grid 2x2 */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: t('customerDashboard.orders', 'Pedidos'), value: orders.length, icon: Package },
          { label: t('customerDashboard.saved', 'Favoritos'), value: wishlist.length, icon: Heart },
          { label: t('customerDashboard.storesYouFollow', 'Tiendas seguidas'), value: followedStores.length, icon: Store },
          { label: 'Reseñas', value: '—', icon: Star },
        ].map(stat => (
          <div key={stat.label} className="p-4" style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }}>
            <stat.icon className="w-5 h-5 mb-2" style={{ color: 'var(--color-stone)' }} />
            <p className="text-2xl font-bold" style={{ color: 'var(--color-black)' }}>{stat.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-stone)' }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions - Horizontal scrollable */}
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1" data-testid="quick-actions">
        {[
          { to: '/products', icon: Search, label: t('customerDashboard.explore') },
          { to: '/dashboard/orders', icon: Package, label: t('customerDashboard.orders') },
          { to: '/dashboard/followed-stores', icon: Heart, label: t('customerDashboard.saved') },
          { to: '/recipes', icon: Star, label: t('nav.recipes', 'Recetas') },
          { to: '/stores', icon: Store, label: t('nav.stores', 'Tiendas') },
          { to: '/discover', icon: Compass, label: t('customerDashboard.discoverProducers') },
        ].map(a => (
          <Link key={a.to} to={a.to} className="shrink-0 flex items-center gap-2 rounded-full px-4 py-2.5 transition-all" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <a.icon className="w-4 h-4" style={{ color: 'var(--color-stone)' }} />
            <span className="text-xs font-medium whitespace-nowrap" style={{ color: 'var(--color-black)' }}>{a.label}</span>
          </Link>
        ))}
      </div>

      {/* Hispalo Predict */}
      {predictions.length > 0 && (
        <div data-testid="predict-overview">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" style={{ color: 'var(--color-black)' }} />
              <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-stone)' }}>Predict</h2>
            </div>
            <Link to="/dashboard/predictions" className="text-xs flex items-center gap-0.5 hover:underline" style={{ color: 'var(--color-black)' }}>
              {t('customerDashboard.seeAll')} <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {predictions.map(p => {
              const daysAbs = Math.abs(p.days_until_next);
              const isOverdue = p.status === 'overdue';
              return (
                <div key={p.product_id} className="shrink-0 w-[240px] flex items-center gap-3 p-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }}>
                  {p.image ? (
                    <img src={p.image} alt="" className="w-10 h-10 object-cover" style={{ borderRadius: 'var(--radius-md)' }} onError={e => { e.target.style.display = 'none'; }} />
                  ) : (
                    <div className="w-10 h-10 flex items-center justify-center" style={{ borderRadius: 'var(--radius-md)', background: 'var(--color-white)' }}>
                      <ShoppingBag className="w-4 h-4" style={{ color: 'var(--color-stone)' }} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--color-black)' }}>{p.product_name}</p>
                    <p className="text-xs" style={{ color: 'var(--color-stone)' }}>
                      {isOverdue ? `Hace ${daysAbs} dias` : p.status === 'due' ? 'Toca hoy' : `En ${daysAbs} dias`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* David AI card */}
      <Link to="/dashboard/ai-preferences" className="block p-4 transition-all" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }} data-testid="hispal-ai-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--color-black)' }}>
            <Sparkles className="w-5 h-5" style={{ color: '#fff' }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: 'var(--color-black)' }}>David AI</p>
            <p className="text-xs" style={{ color: 'var(--color-stone)' }}>Personaliza tus recomendaciones y preferencias</p>
          </div>
          <span className="text-xs font-medium" style={{ color: 'var(--color-black)' }}>Ver →</span>
        </div>
      </Link>

      {/* Wishlist preview */}
      {wishlist.length > 0 && (
        <div data-testid="wishlist-preview">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bookmark className="w-4 h-4" style={{ color: 'var(--color-stone)' }} />
              <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-stone)' }}>{t('wishlist.title', 'Lista de deseos')}</h2>
            </div>
            <Link to="/dashboard/wishlist" className="text-xs flex items-center gap-0.5 hover:underline" style={{ color: 'var(--color-black)' }}>{t('customerDashboard.seeAll')} <ChevronRight className="w-3 h-3" /></Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
            {wishlist.map(item => (
              <Link key={item.product_id} to={`/products/${item.product_id}`} className="shrink-0 w-[140px] overflow-hidden transition-all group" style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }}>
                <div className="aspect-square overflow-hidden" style={{ background: 'var(--color-surface)' }}>
                  {(item.image || item.product_image) ? <img src={item.image || item.product_image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <Heart className="w-6 h-6 m-auto mt-10" style={{ color: 'var(--color-stone)' }} />}
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-medium truncate" style={{ color: 'var(--color-black)' }}>{item.name}</p>
                  {item.price && <p className="text-sm font-bold" style={{ color: 'var(--color-black)' }}>{convertAndFormatPrice(Number(item.price), currency)}</p>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* For You - Horizontal scrollable product cards */}
      <div data-testid="recommended-products">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4" style={{ color: 'var(--color-stone)' }} />
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-stone)' }}>{t('customerDashboard.forYou')}</h2>
          </div>
          <Link to="/products" className="text-xs flex items-center gap-0.5 hover:underline" style={{ color: 'var(--color-black)' }}>{t('customerDashboard.seeAll')} <ChevronRight className="w-3 h-3" /></Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
          {recommended.map(p => {
            const productId = getProductId(p);
            return (
            <Link key={productId || p.name} to={productId ? `/products/${productId}` : '/products'} className="shrink-0 w-[160px] overflow-hidden transition-all group" style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }}>
              <div className="aspect-square overflow-hidden" style={{ background: 'var(--color-surface)' }}>
                {p.images?.[0] ? <img src={p.images[0]} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <ShoppingBag className="w-8 h-8 m-auto mt-12" style={{ color: 'var(--color-stone)' }} />}
              </div>
              <div className="p-2.5">
                <p className="text-xs font-medium truncate" style={{ color: 'var(--color-black)' }}>{p.name}</p>
                <p className="text-sm font-bold" style={{ color: 'var(--color-black)' }}>{convertAndFormatPrice(Number(p.display_price || p.price || 0), currency)}</p>
              </div>
            </Link>
          );})}
        </div>
      </div>

      {/* Followed stores */}
      {followedStores.length > 0 && (
        <div data-testid="followed-stores">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-stone)' }}>{t('customerDashboard.storesYouFollow')}</h2>
            <Link to="/stores" className="text-xs hover:underline" style={{ color: 'var(--color-black)' }}>{t('customerDashboard.seeAll')}</Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {followedStores.map(s => {
              const storeSlug = getStoreSlug(s);
              return (
              <Link key={s.store_id || s.follower_id || storeSlug} to={storeSlug ? `/store/${storeSlug}` : '/stores'} className="shrink-0 flex flex-col items-center gap-1">
                <div className="w-14 h-14 rounded-full overflow-hidden" style={{ background: 'var(--color-surface)', border: '2px solid var(--color-border)' }}>
                  {s.store_logo ? <img src={s.store_logo} alt="" className="w-full h-full object-cover" /> : <Store className="w-6 h-6 m-auto mt-3" style={{ color: 'var(--color-stone)' }} />}
                </div>
                <span className="text-[10px] w-14 truncate text-center" style={{ color: 'var(--color-stone)' }}>{s.store_name}</span>
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
              <TrendingUp className="w-4 h-4" style={{ color: 'var(--color-stone)' }} />
              <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-stone)' }}>{t('customerDashboard.trending', 'Tendencia')}</h2>
            </div>
          </div>
          <div className="space-y-2">
            {trending.map((p, i) => {
              const productId = getProductId(p);
              return (
              <Link key={productId || `${p.name}-${i}`} to={productId ? `/products/${productId}` : '/products'} className="flex items-center gap-3 p-3 transition-all" style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }}>
                <span className="text-lg font-bold w-6 text-center" style={{ color: 'var(--color-border)' }}>{i + 1}</span>
                <div className="w-12 h-12 overflow-hidden shrink-0" style={{ borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}>
                  {p.images?.[0] ? <img src={p.images[0]} alt="" className="w-full h-full object-cover" /> : <ShoppingBag className="w-5 h-5 m-auto mt-3" style={{ color: 'var(--color-stone)' }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--color-black)' }}>{p.name}</p>
                  <p className="text-xs" style={{ color: 'var(--color-stone)' }}>{p.store_name || ''}</p>
                </div>
                <p className="text-sm font-bold shrink-0" style={{ color: 'var(--color-black)' }}>{convertAndFormatPrice(Number(p.display_price || p.price || 0), currency)}</p>
              </Link>
            );})}
          </div>
        </div>
      )}

      {/* Continue Shopping CTA - BLACK button (no green) */}
      <Link to="/products" className="block p-5 text-center transition-all" style={{ background: 'var(--color-black)', borderRadius: 'var(--radius-xl)' }} data-testid="continue-shopping-cta">
        <ShoppingBag className="w-7 h-7 mx-auto mb-2" style={{ color: '#fff' }} />
        <p className="text-sm font-semibold" style={{ color: '#fff' }}>{t('customerDashboard.continueShopping', 'Seguir comprando')}</p>
        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>{t('customerDashboard.discoverNew', 'Descubre productos nuevos')}</p>
      </Link>
    </div>
    </>
  );
}
