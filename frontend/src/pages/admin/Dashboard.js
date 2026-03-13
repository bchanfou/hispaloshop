import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../services/api/client';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import {
  Users, Package, ShoppingBag, CreditCard,
  ChevronRight, TrendingUp, AlertCircle, CheckCircle,
  Store, Percent, Star, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { asNumber } from '../../utils/safe';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    total_users: 0,
    total_products: 0,
    total_orders_today: 0,
    revenue_today: 0,
    pending_moderation: { products: 0, users: 0 },
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [pendingProducts, setPendingProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch stats from various endpoints
      const [usersRes, productsRes, ordersRes] = await Promise.allSettled([
        apiClient.get('/admin/users'),
        apiClient.get('/admin/products'),
        apiClient.get('/admin/orders'),
      ]);

      const users = usersRes.status === 'fulfilled' ? usersRes.value : [];
      const products = productsRes.status === 'fulfilled' ? productsRes.value : [];
      const orders = ordersRes.status === 'fulfilled' ? ordersRes.value : [];

      // Calculate stats
      const today = new Date().toISOString().split('T')[0];
      const ordersToday = orders.filter(o => o.created_at?.startsWith(today));
      const revenueToday = ordersToday.reduce((sum, o) => sum + (o.total_amount || 0), 0);

      setStats({
        total_users: users.length,
        total_products: products.length,
        total_orders_today: ordersToday.length,
        revenue_today: revenueToday,
        pending_moderation: {
          products: products.filter(p => p.status === 'pending' || !p.approved).length,
          users: users.filter(u => !u.approved).length,
        },
      });

      setRecentOrders(orders.slice(0, 5));
      setPendingProducts(products.filter(p => p.status === 'pending' || !p.approved).slice(0, 5));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Error al cargar los datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveProduct = async (productId) => {
    try {
      await apiClient.put(`/admin/products/${productId}/approve`, {});
      toast.success('Producto aprobado');
      fetchDashboardData();
    } catch (error) {
      toast.error('Error al aprobar producto');
    }
  };

  const handleRejectProduct = async (productId) => {
    try {
      await apiClient.put(`/admin/products/${productId}/approve?approved=false`, {});
      toast.success('Producto rechazado');
      fetchDashboardData();
    } catch (error) {
      toast.error('Error al rechazar producto');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-950"></div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-stone-950" data-testid="admin-dashboard-title">
            Panel de Administración
          </h1>
          <p className="text-stone-500 mt-1">
            Gestiona usuarios, productos y órdenes de la plataforma
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-stone-100 border border-stone-200 rounded-xl p-4">
            <div className="text-3xl font-bold text-stone-950">{stats.total_users}</div>
            <div className="text-sm text-stone-600">Usuarios</div>
          </div>
          <div className="bg-stone-100 border border-stone-200 rounded-xl p-4">
            <div className="text-3xl font-bold text-stone-950">{stats.total_products}</div>
            <div className="text-sm text-stone-600">Productos</div>
          </div>
          <div className="bg-stone-100 border border-stone-200 rounded-xl p-4">
            <div className="text-3xl font-bold text-stone-950">{stats.total_orders_today}</div>
            <div className="text-sm text-stone-600">Órdenes Hoy</div>
          </div>
          <div className="bg-stone-100 border border-stone-200 rounded-xl p-4">
            <div className="text-3xl font-bold text-stone-950">
              {stats.pending_moderation.products + stats.pending_moderation.users}
            </div>
            <div className="text-sm text-stone-600">Pendientes</div>
          </div>
          <div className="bg-stone-100 border border-stone-200 rounded-xl p-4">
            <div className="text-3xl font-bold text-stone-950">${stats.revenue_today.toFixed(0)}</div>
            <div className="text-sm text-stone-600">Ingresos Hoy</div>
          </div>
        </div>

        {/* Alerts */}
        {(stats.pending_moderation.products > 0 || stats.pending_moderation.users > 0) && (
          <div className="bg-stone-100 border border-stone-200 rounded-xl p-4 mb-8">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-stone-700 mt-0.5" />
              <div>
                <h3 className="font-semibold text-stone-950">Moderación Pendiente</h3>
                <p className="text-stone-700 text-sm mt-1">
                  Tienes {stats.pending_moderation.products} productos y {stats.pending_moderation.users} usuarios pendientes de revisión.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Pending Products */}
            <div className="bg-white rounded-xl border border-stone-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-stone-950">
                  Productos Pendientes
                </h2>
                <Link to="/admin/products" className="text-stone-950 text-sm hover:underline flex items-center gap-1">
                  Ver todos <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {pendingProducts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-stone-400 mx-auto mb-3" />
                  <p className="text-stone-500">No hay productos pendientes de moderación</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingProducts.map((product) => (
                    <div key={product.product_id} className="flex justify-between items-center p-3 bg-stone-50 rounded-xl">
                      <div>
                        <div className="font-medium text-stone-950">{product.name}</div>
                        <div className="text-sm text-stone-600">
                          Por: {product.producer_name} ({product.seller_type || 'producer'})
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="px-3 py-1.5 text-sm font-medium bg-stone-950 hover:bg-stone-800 text-white rounded-xl transition-colors"
                          onClick={() => handleApproveProduct(product.product_id)}
                        >
                          Aprobar
                        </button>
                        <button type="button" className="px-3 py-1.5 text-sm font-medium border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors text-stone-700" onClick={() => handleRejectProduct(product.product_id)}>
                          Rechazar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-xl border border-stone-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-stone-950">
                  Órdenes Recientes
                </h2>
                <Link to="/admin/orders" className="text-stone-950 text-sm hover:underline flex items-center gap-1">
                  Ver todas <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {recentOrders.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingBag className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                  <p className="text-stone-500">No hay órdenes recientes</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentOrders.map((order) => (
                    <div key={order.order_id} className="flex justify-between items-center p-3 bg-stone-50 rounded-xl">
                      <div>
                        <div className="font-medium text-stone-950">#{order.order_id?.slice(-6)}</div>
                        <div className="text-sm text-stone-600">
                          {order.line_items?.length || 0} items • ${asNumber(order.total_amount).toFixed(2)}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${['completed'].includes(order.status) ? 'bg-stone-950 text-white' : ['pending', 'processing', 'shipped'].includes(order.status) ? 'bg-stone-200 text-stone-700' : 'border border-stone-200 text-stone-400 bg-white'}`}>
                        {order.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-stone-200 p-6">
              <h2 className="text-lg font-semibold text-stone-950 mb-4">
                Gestión Rápida
              </h2>
              <div className="space-y-2">
                <Link to="/admin/users" className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl hover:bg-stone-100 transition-colors">
                  <Users className="w-5 h-5 text-stone-950" />
                  <span>Gestionar Usuarios</span>
                </Link>
                <Link to="/admin/products" className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl hover:bg-stone-100 transition-colors">
                  <Package className="w-5 h-5 text-stone-950" />
                  <span>Todos los Productos</span>
                </Link>
                <Link to="/admin/orders" className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl hover:bg-stone-100 transition-colors">
                  <ShoppingBag className="w-5 h-5 text-stone-950" />
                  <span>Todas las Órdenes</span>
                </Link>
                <Link to="/admin/influencers" className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl hover:bg-stone-100 transition-colors">
                  <Percent className="w-5 h-5 text-stone-950" />
                  <span>Influencers</span>
                </Link>
                <Link to="/admin/producers" className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl hover:bg-stone-100 transition-colors">
                  <Store className="w-5 h-5 text-stone-950" />
                  <span>Productores</span>
                </Link>
                <Link to="/admin/discounts" className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl hover:bg-stone-100 transition-colors">
                  <CreditCard className="w-5 h-5 text-stone-950" />
                  <span>Códigos de Descuento</span>
                </Link>
              </div>
            </div>

            {/* System Status */}
            <div className="bg-stone-50 rounded-xl border border-stone-200 p-6">
              <h3 className="font-semibold text-stone-950 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-stone-950" />
                Estado del Sistema
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-stone-600">API Status</span>
                  <span className="text-stone-700 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Online
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600">Base de datos</span>
                  <span className="text-stone-700 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Conectada
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600">Pagos (Stripe)</span>
                  <span className="text-stone-700 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Activo
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
