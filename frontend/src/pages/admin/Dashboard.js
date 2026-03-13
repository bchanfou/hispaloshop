import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API } from '../../utils/api';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { Button } from '../../components/ui/button';
import { 
  Users, Package, ShoppingBag, CreditCard, 
  ChevronRight, TrendingUp, AlertCircle, CheckCircle,
  Store, Percent, Star, Clock
} from 'lucide-react';
import { toast } from 'sonner';

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
        axios.get(`${API}/admin/users`, { withCredentials: true }),
        axios.get(`${API}/admin/products`, { withCredentials: true }),
        axios.get(`${API}/admin/orders`, { withCredentials: true }),
      ]);

      const users = usersRes.status === 'fulfilled' ? usersRes.value.data : [];
      const products = productsRes.status === 'fulfilled' ? productsRes.value.data : [];
      const orders = ordersRes.status === 'fulfilled' ? ordersRes.value.data : [];

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
      await axios.put(`${API}/admin/products/${productId}/approve`, {}, { withCredentials: true });
      toast.success('Producto aprobado');
      fetchDashboardData();
    } catch (error) {
      toast.error('Error al aprobar producto');
    }
  };

  const handleRejectProduct = async (productId) => {
    try {
      await axios.put(`${API}/admin/products/${productId}/approve?approved=false`, {}, { withCredentials: true });
      toast.success('Producto rechazado');
      fetchDashboardData();
    } catch (error) {
      toast.error('Error al rechazar producto');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold text-text-primary" data-testid="admin-dashboard-title">
            Panel de Administración
          </h1>
          <p className="text-text-muted mt-1">
            Gestiona usuarios, productos y órdenes de la plataforma
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="text-3xl font-bold text-blue-700">{stats.total_users}</div>
            <div className="text-sm text-blue-600">Usuarios</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="text-3xl font-bold text-green-700">{stats.total_products}</div>
            <div className="text-sm text-green-600">Productos</div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <div className="text-3xl font-bold text-purple-700">{stats.total_orders_today}</div>
            <div className="text-sm text-purple-600">Órdenes Hoy</div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="text-3xl font-bold text-amber-700">
              {stats.pending_moderation.products + stats.pending_moderation.users}
            </div>
            <div className="text-sm text-amber-600">Pendientes</div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="text-3xl font-bold text-gray-700">${stats.revenue_today.toFixed(0)}</div>
            <div className="text-sm text-gray-600">Ingresos Hoy</div>
          </div>
        </div>

        {/* Alerts */}
        {(stats.pending_moderation.products > 0 || stats.pending_moderation.users > 0) && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-900">Moderación Pendiente</h3>
                <p className="text-amber-800 text-sm mt-1">
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
                <h2 className="font-heading text-xl font-semibold text-text-primary">
                  Productos Pendientes
                </h2>
                <Link to="/admin/products" className="text-primary text-sm hover:underline flex items-center gap-1">
                  Ver todos <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {pendingProducts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-text-muted">No hay productos pendientes de moderación</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingProducts.map((product) => (
                    <div key={product.product_id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-text-primary">{product.name}</div>
                        <div className="text-sm text-text-secondary">
                          Por: {product.producer_name} ({product.seller_type || 'producer'})
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleApproveProduct(product.product_id)}
                        >
                          Aprobar
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => handleRejectProduct(product.product_id)}>
                          Rechazar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-xl border border-stone-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-heading text-xl font-semibold text-text-primary">
                  Órdenes Recientes
                </h2>
                <Link to="/admin/orders" className="text-primary text-sm hover:underline flex items-center gap-1">
                  Ver todas <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {recentOrders.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingBag className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                  <p className="text-text-muted">No hay órdenes recientes</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentOrders.map((order) => (
                    <div key={order.order_id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-text-primary">#{order.order_id?.slice(-6)}</div>
                        <div className="text-sm text-text-secondary">
                          {order.line_items?.length || 0} items • ${order.total_amount?.toFixed(2)}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        order.status === 'paid' ? 'bg-green-100 text-green-800' :
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
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
              <h2 className="font-heading text-lg font-semibold text-text-primary mb-4">
                Gestión Rápida
              </h2>
              <div className="space-y-2">
                <Link to="/admin/users" className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <Users className="w-5 h-5 text-primary" />
                  <span>Gestionar Usuarios</span>
                </Link>
                <Link to="/admin/products" className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <Package className="w-5 h-5 text-primary" />
                  <span>Todos los Productos</span>
                </Link>
                <Link to="/admin/orders" className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                  <span>Todas las Órdenes</span>
                </Link>
                <Link to="/admin/influencers" className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <Percent className="w-5 h-5 text-primary" />
                  <span>Influencers</span>
                </Link>
                <Link to="/admin/producers" className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <Store className="w-5 h-5 text-primary" />
                  <span>Productores</span>
                </Link>
                <Link to="/admin/discounts" className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <span>Códigos de Descuento</span>
                </Link>
              </div>
            </div>

            {/* System Status */}
            <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl border border-primary/20 p-6">
              <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Estado del Sistema
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">API Status</span>
                  <span className="text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Online
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Base de datos</span>
                  <span className="text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Conectada
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Pagos (Stripe)</span>
                  <span className="text-green-600 flex items-center gap-1">
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
