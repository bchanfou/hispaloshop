import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, ChefHat, Heart, Loader2, MessageCircle, Package, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api/client';

function SummaryCard({ icon: Icon, title, value, description, to }) {
  return (
    <Link to={to} className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-stone-500">{title}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-stone-950">{value}</p>
          <p className="mt-2 text-sm text-stone-500">{description}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-100 text-stone-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Link>
  );
}

export default function CustomerDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [ordersRes, wishlistRes] = await Promise.allSettled([
          apiClient.get('/orders'),
          apiClient.get('/wishlist'),
        ]);

        if (!active) return;
        setOrders(ordersRes.status === 'fulfilled' ? ordersRes.value || [] : []);
        setWishlist(wishlistRes.status === 'fulfilled' ? wishlistRes.value?.items || wishlistRes.value || [] : []);
      } catch {
        if (active) {
          toast.error(t('dashboard.loadError', 'No se pudo cargar el panel'));
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const pendingOrders = orders.filter((order) => ['paid', 'preparing', 'shipped'].includes(order.status)).length;
    return {
      orders: orders.length,
      savedProducts: wishlist.length,
      savedRecipes: 0,
      messages: 0,
      pendingOrders,
    };
  }, [orders, wishlist]);

  if (loading) {
    return (
      <div className="ds-page">
        <div className="ds-shell">
          <div className="h-8 w-40 rounded-lg bg-stone-100 animate-pulse mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[100px] rounded-2xl bg-stone-100 animate-pulse" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-[280px] rounded-2xl bg-stone-100 animate-pulse" />
            <div className="h-[280px] rounded-2xl bg-stone-100 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ds-page">
      <div className="ds-shell">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight text-stone-950">{t('dashboard.myPanel', 'Mi panel')}</h1>
          <p className="mt-2 text-sm text-stone-500">{t('dashboard.panelDesc', 'Pedidos, guardados y conversaciones en un solo lugar.')}</p>
        </header>

        <section className="ds-section ds-grid-4">
          <SummaryCard icon={ShoppingBag} title={t('dashboard.orders', 'Pedidos')} value={stats.orders} description={`${stats.pendingOrders} ${t('dashboard.inProgress', 'en curso')}`} to="/dashboard/orders" />
          <SummaryCard icon={Heart} title={t('dashboard.savedProducts', 'Productos guardados')} value={stats.savedProducts} description={t('dashboard.favorites', 'Tu lista de favoritos')} to="/dashboard/wishlist" />
          <SummaryCard icon={ChefHat} title={t('dashboard.savedRecipes', 'Recetas guardadas')} value={stats.savedRecipes} description={t('dashboard.personalCollection', 'Colección personal')} to="/recipes" />
          <SummaryCard icon={MessageCircle} title={t('dashboard.messages', 'Mensajes')} value={stats.messages} description={t('dashboard.comingSoon', 'Próximamente en el panel')} to="/chat" />
        </section>

        <section className="ds-section grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-stone-950">{t('dashboard.recentActivity', 'Actividad reciente')}</h2>
                <p className="mt-2 text-sm text-stone-500">{t('dashboard.recentOrders', 'Tus pedidos más recientes.')}</p>
              </div>
              <Link to="/dashboard/orders" className="text-sm font-medium text-stone-700">{t('common.viewAll', 'Ver todo')}</Link>
            </div>

            {orders.length === 0 ? (
              <div className="mt-8 rounded-2xl border border-dashed border-stone-200 bg-stone-50 p-10 text-center">
                <Package className="mx-auto h-10 w-10 text-stone-300" />
                <p className="mt-3 text-sm text-stone-500">Todavía no tienes pedidos.</p>
                <Link to="/products">
                  <button className="mt-4 px-4 py-2 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white rounded-lg transition-colors">Explorar productos</button>
                </Link>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {orders.slice(0, 4).map((order) => (
                  <div key={order.order_id} className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-stone-950">Pedido #{order.order_id?.slice(-6)}</p>
                        <p className="mt-1 text-sm text-stone-500">{order.line_items?.length || 0} productos</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium capitalize text-stone-950">{order.status}</p>
                        <p className="mt-1 text-sm text-stone-500">€{Number(order.total_amount || 0).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-stone-950">{t('dashboard.quickAccess', 'Accesos rápidos')}</h2>
              <div className="mt-5 space-y-3">
                <Link to="/products" className="flex items-center justify-between rounded-2xl border border-stone-100 bg-stone-50 p-4 text-sm text-stone-700 transition-all duration-200 hover:shadow-sm">
                  <span>Seguir comprando</span>
                  <Bookmark className="h-4 w-4" />
                </Link>
                <Link to="/stores" className="flex items-center justify-between rounded-2xl border border-stone-100 bg-stone-50 p-4 text-sm text-stone-700 transition-all duration-200 hover:shadow-sm">
                  <span>Descubrir tiendas</span>
                  <Heart className="h-4 w-4" />
                </Link>
                <Link to="/recipes" className="flex items-center justify-between rounded-2xl border border-stone-100 bg-stone-50 p-4 text-sm text-stone-700 transition-all duration-200 hover:shadow-sm">
                  <span>Explorar recetas</span>
                  <ChefHat className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-stone-100 bg-stone-50 p-6">
              <p className="text-sm text-stone-500">Cuenta activa</p>
              <p className="mt-2 text-xl font-medium text-stone-950">{user?.name || 'Cliente'}</p>
              <p className="mt-1 text-sm text-stone-500">{user?.email}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
