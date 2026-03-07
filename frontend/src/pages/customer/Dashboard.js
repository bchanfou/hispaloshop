import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API } from '../../utils/api';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { Button } from '../../components/ui/button';
import { 
  ShoppingBag, MapPin, Package, ChevronRight, 
  Heart, User, Bell, CreditCard, Clock, CheckCircle, Truck 
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    savedAddresses: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [ordersRes, profileRes] = await Promise.all([
        axios.get(`${API}/orders`, { withCredentials: true }),
        axios.get(`${API}/auth/me`, { withCredentials: true }),
      ]);

      const ordersData = ordersRes.data || [];
      setOrders(ordersData.slice(0, 5)); // Mostrar solo las 5 más recientes
      
      const addressesData = profileRes.data?.addresses || [];
      setAddresses(addressesData);

      setStats({
        totalOrders: ordersData.length,
        pendingOrders: ordersData.filter(o => ['paid', 'preparing', 'shipped'].includes(o.status)).length,
        savedAddresses: addressesData.length,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Error al cargar los datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'shipped':
        return <Truck className="w-4 h-4 text-blue-600" />;
      case 'paid':
      case 'preparing':
        return <Package className="w-4 h-4 text-amber-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pendiente',
      paid: 'Pagado',
      preparing: 'Preparando',
      shipped: 'Enviado',
      delivered: 'Entregado',
      cancelled: 'Cancelado',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      delivered: 'bg-green-100 text-green-800',
      shipped: 'bg-blue-100 text-blue-800',
      paid: 'bg-amber-100 text-amber-800',
      preparing: 'bg-amber-100 text-amber-800',
      pending: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
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
          <h1 className="font-heading text-3xl font-bold text-text-primary" data-testid="dashboard-title">
            Mi Cuenta
          </h1>
          <p className="text-text-muted mt-1">
            Bienvenido, {user?.name}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <div className="bg-white rounded-xl border border-stone-200 p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary">{user?.name}</h3>
                  <p className="text-sm text-text-muted">{user?.email}</p>
                </div>
              </div>
              <Link 
                to="/profile" 
                className="text-primary text-sm hover:underline mt-4 inline-block"
              >
                Editar perfil
              </Link>
            </div>

            {/* Quick Navigation */}
            <nav className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              <Link to="/orders" className="flex items-center justify-between p-4 hover:bg-stone-50 border-b border-stone-100">
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                  <span>Mis Órdenes</span>
                </div>
                <span className="bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded-full">
                  {stats.totalOrders}
                </span>
              </Link>
              <Link to="/profile" className="flex items-center justify-between p-4 hover:bg-stone-50 border-b border-stone-100">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-primary" />
                  <span>Direcciones</span>
                </div>
                <span className="bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded-full">
                  {stats.savedAddresses}
                </span>
              </Link>
              <Link to="/wishlist" className="flex items-center justify-between p-4 hover:bg-stone-50 border-b border-stone-100">
                <div className="flex items-center gap-3">
                  <Heart className="w-5 h-5 text-primary" />
                  <span>Lista de Deseos</span>
                </div>
              </Link>
              <Link to="/notifications" className="flex items-center justify-between p-4 hover:bg-stone-50">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-primary" />
                  <span>Notificaciones</span>
                </div>
              </Link>
            </nav>

            {/* Stats Summary */}
            <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl border border-primary/20 p-6">
              <h3 className="font-semibold text-text-primary mb-4">Resumen</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Total órdenes</span>
                  <span className="font-medium">{stats.totalOrders}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Pendientes</span>
                  <span className="font-medium text-amber-600">{stats.pendingOrders}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Direcciones</span>
                  <span className="font-medium">{stats.savedAddresses}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Recent Orders */}
            <div className="bg-white rounded-xl border border-stone-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-heading text-xl font-semibold text-text-primary">
                  Órdenes Recientes
                </h2>
                <Link to="/orders" className="text-primary text-sm hover:underline flex items-center gap-1">
                  Ver todas <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {orders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                  <p className="text-text-muted mb-4">No has realizado compras aún</p>
                  <Link to="/products">
                    <Button className="bg-primary hover:bg-primary-hover text-white">
                      Explorar Productos
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div 
                      key={order.order_id} 
                      className="border border-stone-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-medium text-text-primary">
                              Orden #{order.order_id?.slice(-6)}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(order.status)}`}>
                              {getStatusIcon(order.status)}
                              {getStatusLabel(order.status)}
                            </span>
                          </div>
                          <p className="text-sm text-text-muted mb-2">
                            {order.created_at && format(new Date(order.created_at), 'dd MMMM yyyy', { locale: es })}
                          </p>
                          <div className="text-sm text-text-secondary">
                            {order.line_items?.length || 0} productos
                            {order.line_items?.some(i => i.seller_type === 'importer') && (
                              <span className="ml-2 text-blue-600 text-xs bg-blue-50 px-2 py-0.5 rounded-full">
                                Incluye importados
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-text-primary text-lg">
                            ${order.total_amount?.toFixed(2)}
                          </p>
                          <Link 
                            to={`/orders/${order.order_id}`}
                            className="text-primary text-sm hover:underline mt-1 inline-block"
                          >
                            Ver detalles
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Saved Addresses */}
            <div className="bg-white rounded-xl border border-stone-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-heading text-xl font-semibold text-text-primary">
                  Direcciones Guardadas
                </h2>
                <Link to="/profile" className="text-primary text-sm hover:underline flex items-center gap-1">
                  Gestionar <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {addresses.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="w-10 h-10 text-stone-300 mx-auto mb-3" />
                  <p className="text-text-muted mb-4">No tienes direcciones guardadas</p>
                  <Link to="/profile">
                    <Button variant="outline" className="border-primary text-primary">
                      Añadir Dirección
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addresses.slice(0, 2).map((addr, idx) => (
                    <div 
                      key={idx} 
                      className={`border rounded-lg p-4 ${
                        addr.is_default ? 'border-primary bg-primary/5' : 'border-stone-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <MapPin className={`w-5 h-5 mt-0.5 ${addr.is_default ? 'text-primary' : 'text-text-muted'}`} />
                        <div className="flex-1">
                          <p className="font-medium text-text-primary">{addr.name || `Dirección ${idx + 1}`}</p>
                          <p className="text-sm text-text-secondary">{addr.street}</p>
                          <p className="text-sm text-text-secondary">
                            {addr.city}, {addr.postal_code}
                          </p>
                          <p className="text-sm text-text-secondary">{addr.country}</p>
                          {addr.is_default && (
                            <span className="text-xs text-primary font-medium mt-2 inline-block">
                              Dirección predeterminada
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {addresses.length > 2 && (
                    <Link to="/profile" className="border border-dashed border-stone-300 rounded-lg p-4 flex items-center justify-center hover:bg-stone-50 transition-colors">
                      <span className="text-text-muted">+ {addresses.length - 2} más</span>
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link to="/products" className="bg-white rounded-xl border border-stone-200 p-6 hover:shadow-md transition-shadow text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <ShoppingBag className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-medium text-text-primary">Comprar</h3>
                <p className="text-sm text-text-muted mt-1">Explorar productos</p>
              </Link>
              
              <Link to="/stores" className="bg-white rounded-xl border border-stone-200 p-6 hover:shadow-md transition-shadow text-center">
                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CreditCard className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-medium text-text-primary">Tiendas</h3>
                <p className="text-sm text-text-muted mt-1">Descubrir vendedores</p>
              </Link>
              
              <Link to="/orders" className="bg-white rounded-xl border border-stone-200 p-6 hover:shadow-md transition-shadow text-center">
                <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Package className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-medium text-text-primary">Mis Órdenes</h3>
                <p className="text-sm text-text-muted mt-1">Ver historial</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
