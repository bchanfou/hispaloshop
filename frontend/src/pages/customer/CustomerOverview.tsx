// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../../services/api/client';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import {
  ShoppingBag, Package, Heart, Truck, Check,
  Clock, ChevronRight, Star, Store, Compass, Zap,
  TrendingUp, Sparkles, Bookmark, Users, ArrowRight
} from 'lucide-react';
import { asNumber, firstToken } from '../../utils/safe';
import { getStatusIcon } from '../../components/OrderStatusBadge';
import { useLocale } from '../../context/LocaleContext';

const getProductId = (product) => product?.product_id || product?.id || null;
const getStoreSlug = (store) => store?.store_slug || store?.slug || null;

function orderStatusLabel(status) {
  switch (status) {
    case 'shipped':    return 'En camino';
    case 'delivered':  return 'Entregado';
    case 'preparing':  return 'Preparando';
    case 'paid':       return 'Confirmado';
    default:           return 'Pendiente';
  }
}

function orderProgressWidth(status) {
  switch (status) {
    case 'delivered':  return '100%';
    case 'shipped':    return '75%';
    case 'preparing':  return '50%';
    default:           return '25%';
  }
}

export default function CustomerOverview() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { convertAndFormatPrice, currency } = useLocale();
  const navigate = useNavigate();
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

  if (loading) return <div className="flex justify-center py-20"><div className="loading-spinner" /></div>;

  /* ── Quick actions data ── */
  const quickActions = [
    { label: 'Mis pedidos', icon: Package, path: '/customer/orders' },
    { label: 'Favoritos',   icon: Heart,   path: '/customer/wishlist' },
    { label: 'Explorar',    icon: Compass,  path: '/discover' },
    {
      label: 'David AI',
      icon: Sparkles,
      onClick: () => dispatchEvent(new Event('open-hispal-ai')),
    },
  ];

  return (
    <>
      {loadError && (
        <div className="mx-4 mt-2 mb-4 rounded-2xl bg-stone-100 px-4 py-3 text-sm text-stone-500 text-center">
          Algunos datos no se han podido cargar. Desliza hacia abajo para reintentar.
        </div>
      )}
      <div className="space-y-6 pb-4" data-testid="customer-dashboard">

        {/* ── Greeting ── */}
        <div className="px-4 pt-2">
          <h1 className="text-xl md:text-2xl font-bold text-stone-950">
            Hola, {firstToken(user?.name, 'usuario')}
          </h1>
          <p className="text-sm mt-0.5 text-stone-500">Bienvenido de vuelta</p>
        </div>

        {/* ── KPI horizontal scroll row ── */}
        <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide py-1">
          {[
            { label: 'Pedidos',    value: orders.length,         icon: Package },
            { label: 'Gastado',    value: convertAndFormatPrice(orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0), currency), icon: ShoppingBag },
            { label: 'Guardados',  value: wishlist.length,       icon: Heart },
          ].map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="flex-shrink-0 flex flex-col items-center justify-center bg-white border border-stone-200 rounded-2xl px-5 py-3 min-w-[90px]"
            >
              <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center mb-1.5">
                <Icon size={16} className="text-stone-500" />
              </div>
              <span className="text-xl font-bold text-stone-950">{value}</span>
              <span className="text-xs text-stone-500">{label}</span>
            </div>
          ))}
        </div>

        {/* ── Recent orders ── */}
        {orders.length > 0 && (
          <div className="px-4" data-testid="recent-orders">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-stone-950">Pedidos recientes</h2>
              <Link
                to="/customer/orders"
                className="text-xs font-medium text-stone-500 hover:text-stone-950 flex items-center gap-0.5"
              >
                Ver todo <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {orders.map(order => {
                const StatusIcon = getStatusIcon(order.status);
                const thumb = order.line_items?.[0]?.image || order.items?.[0]?.image || null;
                return (
                  <Link
                    key={order.id}
                    to={`/customer/orders/${order.id}`}
                    className="flex items-center gap-3 bg-white border border-stone-200 rounded-2xl px-3 py-3 hover:bg-stone-50 transition-colors"
                    data-testid="recent-order-row"
                  >
                    {/* Thumbnail */}
                    <div className="w-10 h-10 rounded-2xl bg-stone-200 shrink-0 overflow-hidden flex items-center justify-center">
                      {thumb
                        ? <img loading="lazy" src={thumb} alt="" className="w-full h-full object-cover" />
                        : <Package className="w-4 h-4 text-stone-400" />
                      }
                    </div>

                    {/* Status badge + date */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <StatusIcon className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                        <span className="text-xs font-semibold text-stone-950">{orderStatusLabel(order.status)}</span>
                      </div>
                      <p className="text-xs text-stone-500 truncate">
                        {order.created_at
                          ? new Date(order.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
                          : ''}
                        {order.line_items?.length > 0 && ` · ${order.line_items.length} producto${order.line_items.length !== 1 ? 's' : ''}`}
                      </p>
                    </div>

                    {/* Total */}
                    <span className="text-sm font-bold text-stone-950 shrink-0">
                      {convertAndFormatPrice(asNumber(order.total_amount), currency)}
                    </span>
                    <ChevronRight className="w-4 h-4 text-stone-300 shrink-0" />
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Quick actions 2×2 grid ── */}
        <div className="px-4">
          <h2 className="text-sm font-semibold text-stone-950 mb-3">Acciones rápidas</h2>
          <div className="grid grid-cols-2 gap-3" data-testid="quick-actions">
            {quickActions.map(({ label, icon: Icon, path, onClick }) => {
              const inner = (
                <div className="rounded-2xl bg-white border border-stone-200 flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition-colors w-full text-left">
                  <Icon size={18} className="text-stone-500 shrink-0" />
                  <span className="text-sm font-medium text-stone-950">{label}</span>
                </div>
              );
              return path
                ? <Link key={label} to={path}>{inner}</Link>
                : <button key={label} onClick={onClick} className="w-full">{inner}</button>;
            })}
          </div>
        </div>

        {/* ── Hispalo Predict ── */}
        {predictions.length > 0 && (
          <div className="px-4" data-testid="predict-overview">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-stone-950" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500">Predict</h2>
              </div>
              <Link to="/dashboard/predictions" className="text-xs flex items-center gap-0.5 hover:underline text-stone-950">
                Ver todo <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
              {predictions.map(p => {
                const daysAbs = Math.abs(p.days_until_next);
                const isOverdue = p.status === 'overdue';
                return (
                  <div key={p.product_id} className="shrink-0 w-[240px] flex items-center gap-3 p-3 bg-stone-50 border border-stone-200 rounded-2xl">
                    {p.image ? (
                      <img loading="lazy" src={p.image} alt="" className="w-10 h-10 object-cover rounded-2xl" onError={e => { e.target.style.display = 'none'; }} />
                    ) : (
                      <div className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white">
                        <ShoppingBag className="w-4 h-4 text-stone-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-stone-950">{p.product_name}</p>
                      <p className="text-xs text-stone-500">
                        {isOverdue ? `Hace ${daysAbs} días` : p.status === 'due' ? 'Toca hoy' : `En ${daysAbs} días`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── David AI card ── */}
        <div className="px-4">
          <button
            onClick={() => dispatchEvent(new Event('open-hispal-ai'))}
            className="w-full block p-4 bg-stone-50 border border-stone-200 rounded-2xl hover:bg-stone-100 transition-colors text-left"
            data-testid="hispal-ai-card"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-stone-950">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-stone-950">David AI</p>
                <p className="text-xs text-stone-500">Personaliza tus recomendaciones y preferencias</p>
              </div>
              <ArrowRight className="w-4 h-4 text-stone-400" />
            </div>
          </button>
        </div>

        {/* ── Wishlist preview ── */}
        {wishlist.length > 0 && (
          <div data-testid="wishlist-preview">
            <div className="flex items-center justify-between mb-3 px-4">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-stone-500" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500">{t('wishlist.title', 'Lista de deseos')}</h2>
              </div>
              <Link to="/dashboard/wishlist" className="text-xs flex items-center gap-0.5 hover:underline text-stone-950">
                {t('customerDashboard.seeAll')} <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide px-4">
              {wishlist.map(item => (
                <Link key={item.product_id} to={`/products/${item.product_id}`} className="shrink-0 w-[140px] overflow-hidden bg-white border border-stone-200 rounded-2xl transition-all group">
                  <div className="aspect-square overflow-hidden bg-stone-50">
                    {(item.image || item.product_image)
                      ? <img loading="lazy" src={item.image || item.product_image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      : <Heart className="w-6 h-6 m-auto mt-10 text-stone-400" />
                    }
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-medium truncate text-stone-950">{item.name}</p>
                    {item.price && <p className="text-sm font-bold text-stone-950">{convertAndFormatPrice(Number(item.price), currency)}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── For You ── */}
        <div data-testid="recommended-products">
          <div className="flex items-center justify-between mb-3 px-4">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-stone-500" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500">{t('customerDashboard.forYou')}</h2>
            </div>
            <Link to="/products" className="text-xs flex items-center gap-0.5 hover:underline text-stone-950">
              {t('customerDashboard.seeAll')} <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide px-4">
            {recommended.map(p => {
              const productId = getProductId(p);
              return (
                <Link key={productId || p.name} to={productId ? `/products/${productId}` : '/products'} className="shrink-0 w-[160px] overflow-hidden bg-white border border-stone-200 rounded-2xl transition-all group">
                  <div className="aspect-square overflow-hidden bg-stone-50">
                    {p.images?.[0]
                      ? <img loading="lazy" src={p.images[0]} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      : <ShoppingBag className="w-8 h-8 m-auto mt-12 text-stone-400" />
                    }
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-medium truncate text-stone-950">{p.name}</p>
                    <p className="text-sm font-bold text-stone-950">{convertAndFormatPrice(Number(p.display_price || p.price || 0), currency)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* ── Followed stores ── */}
        {followedStores.length > 0 && (
          <div className="px-4" data-testid="followed-stores">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500">{t('customerDashboard.storesYouFollow')}</h2>
              <Link to="/stores" className="text-xs hover:underline text-stone-950">{t('customerDashboard.seeAll')}</Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
              {followedStores.map(s => {
                const storeSlug = getStoreSlug(s);
                return (
                  <Link key={s.store_id || s.follower_id || storeSlug} to={storeSlug ? `/store/${storeSlug}` : '/stores'} className="shrink-0 flex flex-col items-center gap-1">
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-stone-100 border-2 border-stone-200">
                      {s.store_logo
                        ? <img loading="lazy" src={s.store_logo} alt="" className="w-full h-full object-cover" />
                        : <Store className="w-6 h-6 m-auto mt-3 text-stone-400" />
                      }
                    </div>
                    <span className="text-[10px] w-14 truncate text-center text-stone-500">{s.store_name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Trending ── */}
        {trending.length > 0 && (
          <div className="px-4" data-testid="trending-products">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-stone-500" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500">{t('customerDashboard.trending', 'Tendencia')}</h2>
              </div>
            </div>
            <div className="space-y-2">
              {trending.map((p, i) => {
                const productId = getProductId(p);
                return (
                  <Link key={productId || `${p.name}-${i}`} to={productId ? `/products/${productId}` : '/products'} className="flex items-center gap-3 p-3 bg-white border border-stone-200 rounded-2xl hover:bg-stone-50 transition-colors">
                    <span className="text-lg font-bold w-6 text-center text-stone-300">{i + 1}</span>
                    <div className="w-12 h-12 overflow-hidden shrink-0 rounded-2xl bg-stone-100">
                      {p.images?.[0]
                        ? <img loading="lazy" src={p.images[0]} alt="" className="w-full h-full object-cover" />
                        : <ShoppingBag className="w-5 h-5 m-auto mt-3 text-stone-400" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-stone-950">{p.name}</p>
                      <p className="text-xs text-stone-500">{p.store_name || ''}</p>
                    </div>
                    <p className="text-sm font-bold shrink-0 text-stone-950">{convertAndFormatPrice(Number(p.display_price || p.price || 0), currency)}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Continue shopping CTA ── */}
        <div className="px-4">
          <Link to="/products" className="block p-5 text-center bg-stone-950 rounded-2xl hover:bg-stone-800 transition-colors" data-testid="continue-shopping-cta">
            <ShoppingBag className="w-7 h-7 mx-auto mb-2 text-white" />
            <p className="text-sm font-semibold text-white">{t('customerDashboard.continueShopping', 'Seguir comprando')}</p>
            <p className="text-xs mt-0.5 text-stone-400">{t('customerDashboard.discoverNew', 'Descubre productos nuevos')}</p>
          </Link>
        </div>

      </div>
    </>
  );
}
