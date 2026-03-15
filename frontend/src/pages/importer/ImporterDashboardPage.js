import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package, ShoppingBag, Factory, Store, Search, Award, FileCheck,
  ArrowRight, AlertTriangle,
  Loader2, Globe, MessageCircle, TrendingUp, Eye, Plus,
  Clock, ChevronRight, BarChart3, PenTool, FileText, KeyRound, CreditCard
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api/client';
import { useChatContext } from '../../context/chat/ChatProvider';
import { toast } from 'sonner';
import { OperationCard } from '../b2b/B2BOperationsDashboard';

/* ─── Shared Components ─── */

function KPICard({ label, value, icon: Icon, href, description }) {
  const Wrapper = href ? Link : 'div';
  return (
    <Wrapper
      to={href}
      className="p-4 transition-all"
      style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 flex items-center justify-center shrink-0" style={{ borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}>
          <Icon className="w-4.5 h-4.5" style={{ color: 'var(--color-stone)' }} />
        </div>
      </div>
      <p className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--color-black)' }}>{value}</p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--color-stone)' }}>{label}</p>
      {description && <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-stone)', opacity: 0.7 }}>{description}</p>}
    </Wrapper>
  );
}

function AlertCard({ alert }) {
  const isDanger = alert.type === 'danger';
  return (
    <div className="flex items-start gap-3 p-3 mb-2" style={{
      borderRadius: 'var(--radius-xl)',
      background: isDanger ? 'var(--color-red-light)' : 'var(--color-surface)',
      border: `1px solid ${isDanger ? 'var(--color-red)' : 'var(--color-border)'}`,
    }}>
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: isDanger ? 'var(--color-red)' : 'var(--color-stone)' }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: 'var(--color-black)' }}>
          {alert.title}
        </p>
        {alert.message && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-stone)' }}>{alert.message}</p>
        )}
      </div>
      {alert.action_href && (
        <Link to={alert.action_href} className="text-xs font-bold shrink-0 hover:underline" style={{ color: 'var(--color-black)' }}>
          {alert.action_label || 'Ver'} <ArrowRight className="w-3 h-3 inline" />
        </Link>
      )}
    </div>
  );
}

function QuickAction({ icon: Icon, label, href, variant = 'default' }) {
  const isGreen = variant === 'green';
  return (
    <Link
      to={href}
      className="flex items-center gap-3 p-3.5 transition-all text-sm font-semibold"
      style={{
        background: isGreen ? 'var(--color-green)' : 'var(--color-white)',
        borderRadius: 'var(--radius-xl)',
        border: isGreen ? 'none' : '1px solid var(--color-border)',
        color: isGreen ? '#fff' : 'var(--color-black)',
      }}
    >
      <Icon className="w-5 h-5 shrink-0" style={{ color: isGreen ? '#fff' : 'var(--color-stone)' }} />
      {label}
    </Link>
  );
}

function ImporterPlanCard({ plan }) {
  if (plan === 'ELITE' || plan === 'elite') {
    return (
      <Link
        to="/producer/commercial-ai"
        className="flex items-center gap-3.5 p-4 transition-colors"
        style={{ background: 'var(--color-black)', borderRadius: 'var(--radius-xl)', color: '#fff' }}
      >
        <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <Globe className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">Agente Comercial IA</p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Busca productores globales · Analiza mercados · Genera contratos
          </p>
        </div>
        <ArrowRight className="w-5 h-5 shrink-0" style={{ color: 'rgba(255,255,255,0.45)' }} />
      </Link>
    );
  }

  return (
    <div className="p-4" style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', border: '2px solid var(--color-border)' }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold" style={{ color: 'var(--color-black)' }}>
          Plan {(plan || 'FREE').toUpperCase()} · Actualizar a ELITE
        </p>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: 'var(--color-amber-light)', color: 'var(--color-amber)' }}>
          ELITE
        </span>
      </div>
      <div className="space-y-1.5 mb-4">
        {[
          'Agente Comercial IA para importadores',
          'Matching con productores globales',
          'Contratos B2B generados automáticamente',
          'Comisión reducida al 15%',
        ].map(f => (
          <p key={f} className="text-xs flex items-center gap-1.5" style={{ color: 'var(--color-stone)' }}>
            <span className="font-bold" style={{ color: 'var(--color-black)' }}>✓</span> {f}
          </p>
        ))}
      </div>
      <Link
        to="/producer/plan"
        className="block w-full text-center py-2.5 text-sm font-medium transition-colors"
        style={{ background: 'var(--color-black)', color: '#fff', borderRadius: 'var(--radius-xl)' }}
      >
        Actualizar a ELITE · 249€/mes <ArrowRight className="w-4 h-4 inline ml-1" />
      </Link>
    </div>
  );
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

function B2BOrderStatusBadge({ status }) {
  const config = {
    pending_producer: { label: 'Esperando productor', bg: 'var(--color-surface)', color: 'var(--color-stone)' },
    confirmed_by_producer: { label: 'Confirmado', bg: 'var(--color-green-light)', color: 'var(--color-green)' },
    paid: { label: 'Pagado', bg: 'var(--color-green-light)', color: 'var(--color-green)' },
    shipped: { label: 'En camino', bg: 'var(--color-surface)', color: 'var(--color-stone)' },
    delivered: { label: 'Recibido', bg: 'var(--color-black)', color: '#fff' },
    cancelled: { label: 'Cancelado', bg: 'var(--color-white)', color: 'var(--color-stone)' },
    rejected: { label: 'Rechazado', bg: 'var(--color-red-light)', color: 'var(--color-red)' },
  };
  const c = config[status] || { label: status, bg: 'var(--color-surface)', color: 'var(--color-stone)' };
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: c.bg, color: c.color }}>
      {c.label}
    </span>
  );
}

function B2COrderStatusBadge({ status }) {
  const config = {
    pending: { label: 'Pendiente', bg: 'var(--color-amber-light)', color: 'var(--color-amber)' },
    processing: { label: 'Procesando', bg: 'var(--color-blue-light)', color: 'var(--color-blue)' },
    shipped: { label: 'Enviado', bg: 'var(--color-surface)', color: 'var(--color-stone)' },
    delivered: { label: 'Entregado', bg: 'var(--color-green-light)', color: 'var(--color-green)' },
    cancelled: { label: 'Cancelado', bg: 'var(--color-red-light)', color: 'var(--color-red)' },
    refunded: { label: 'Reembolsado', bg: 'var(--color-red-light)', color: 'var(--color-red)' },
  };
  const c = config[status] || { label: status, bg: 'var(--color-surface)', color: 'var(--color-stone)' };
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: c.bg, color: c.color }}>
      {c.label}
    </span>
  );
}

/* ─── Period Selector ─── */

function PeriodSelector({ value, onChange }) {
  const options = [
    { key: 'today', label: 'Hoy' },
    { key: 'week', label: 'Semana' },
    { key: 'month', label: 'Mes' },
  ];
  return (
    <div className="flex gap-1 p-0.5" style={{ borderRadius: 'var(--radius-full)', background: 'var(--color-surface)' }}>
      {options.map(o => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className="px-3 py-1 text-[11px] font-semibold transition-all"
          style={{
            borderRadius: 'var(--radius-full)',
            background: value === o.key ? 'var(--color-white)' : 'transparent',
            color: value === o.key ? 'var(--color-black)' : 'var(--color-stone)',
            boxShadow: value === o.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ─── Main Component ─── */

export default function ImporterDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { openConversation } = useChatContext();

  const handleB2BChat = async (producerId) => {
    try {
      const conv = await openConversation(producerId, 'b2b');
      if (conv?.id) navigate(`/messages/${conv.id}`);
    } catch {
      toast.error('No se pudo abrir el chat');
    }
  };

  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [recentB2B, setRecentB2B] = useState([]);
  const [b2cOrders, setB2cOrders] = useState([]);
  const [b2bOperations, setB2bOperations] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('b2c');
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    let active = true;
    Promise.all([
      apiClient.get('/importer/stats').catch(() => null),
      apiClient.get('/importer/alerts').catch(() => []),
      apiClient.get('/importer/b2b-orders?limit=3').catch(() => ({ orders: [] })),
      apiClient.get('/producer/orders').catch(() => []),
      apiClient.get('/b2b/operations').catch(() => []),
      apiClient.get('/products?seller_id=me&limit=5&sort=sales').catch(() => []),
    ]).then(([s, a, b, orders, ops, products]) => {
      if (!active) return;
      setStats(s || {});
      setAlerts(Array.isArray(a) ? a : []);
      setRecentB2B(b?.orders || []);
      setB2cOrders(Array.isArray(orders) ? orders : []);
      setB2bOperations(Array.isArray(ops) ? ops : (ops?.operations || []));
      setTopProducts(Array.isArray(products) ? products.slice(0, 3) : (products?.products || []).slice(0, 3));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-stone)' }} />
      </div>
    );
  }

  const companyName = user?.company_name || user?.business_name || user?.name || 'Mi empresa';
  const planLabel = (stats?.plan || 'FREE').toUpperCase();
  const pendingB2cOrders = b2cOrders.filter(o => o.status === 'pending' || o.status === 'processing');
  const actionableOps = b2bOperations.filter(op => {
    const isImporter = op.buyer_id === user?.user_id;
    const actionStatuses = isImporter
      ? ['offer_received', 'contract_pending', 'contract_generated', 'payment_pending']
      : ['offer_sent', 'contract_signed', 'payment_confirmed', 'in_transit'];
    return actionStatuses.includes(op.status);
  });

  return (
    <div style={{ fontFamily: 'var(--font-sans)', background: 'var(--color-cream)' }}>
      {/* Header with company name + plan badge */}
      <div className="flex items-center gap-3 mb-1">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-black)' }}>{companyName}</h1>
        <span
          className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
          style={{ background: 'var(--color-surface)', color: 'var(--color-stone)' }}
        >
          {planLabel}
        </span>
      </div>
      <p className="text-sm mb-5" style={{ color: 'var(--color-stone)' }}>Panel de importador</p>

      {/* Mode Selector Tabs — large pill style */}
      <div className="flex gap-0 mb-6 p-1" style={{ borderRadius: 'var(--radius-xl)', background: 'var(--color-surface)' }}>
        {[
          { key: 'b2c', label: 'B2C Consumidor', icon: Store },
          { key: 'b2b', label: 'B2B Mayorista', icon: Factory },
        ].map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all"
              style={{
                borderRadius: 'var(--radius-md)',
                background: isActive ? 'var(--color-white)' : 'transparent',
                color: isActive ? 'var(--color-black)' : 'var(--color-stone)',
                boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="mb-4">
          {alerts.map((alert, i) => (
            <AlertCard key={i} alert={alert} />
          ))}
        </div>
      )}

      {activeTab === 'b2c' ? (
        <>
          {/* B2C Tab — Full seller dashboard */}

          {/* Period selector + KPIs */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold" style={{ color: 'var(--color-black)' }}>Resumen</h2>
            <PeriodSelector value={period} onChange={setPeriod} />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <KPICard
              icon={TrendingUp}
              value={`${(stats?.volume_month || 0).toFixed(0)}€`}
              label="Ventas B2C"
              description={`${stats?.store_orders || 0} pedidos`}
              href="/producer/orders"
            />
            <KPICard
              icon={Package}
              value={stats?.store_orders || 0}
              label="Pedidos"
              description={`${pendingB2cOrders.length} pendientes`}
              href="/producer/orders"
            />
            <KPICard
              icon={Eye}
              value={stats?.follower_count || 0}
              label="Seguidores tienda"
              href="/producer/store-profile"
            />
            <KPICard
              icon={BarChart3}
              value={stats?.total_products || 0}
              label="Productos activos"
              description={`${stats?.pending_products || 0} pendientes`}
              href="/producer/products"
            />
          </div>

          {/* Pending B2C orders */}
          {pendingB2cOrders.length > 0 && (
            <div className="mb-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold" style={{ color: 'var(--color-black)' }}>Pedidos pendientes</h2>
                <Link to="/producer/orders" className="text-xs font-semibold hover:underline" style={{ color: 'var(--color-stone)' }}>
                  Ver todos <ArrowRight className="w-3 h-3 inline" />
                </Link>
              </div>
              <div className="space-y-2">
                {pendingB2cOrders.slice(0, 4).map((order, i) => (
                  <div
                    key={order.order_id || i}
                    className="flex items-center gap-3 p-3.5"
                    style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}
                  >
                    <div className="w-9 h-9 flex items-center justify-center shrink-0" style={{ borderRadius: 'var(--radius-md)', background: 'var(--color-amber-light)' }}>
                      <Clock className="w-4 h-4" style={{ color: 'var(--color-amber)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-black)' }}>
                        {order.customer_name || 'Cliente'}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-stone)' }}>
                        {(order.items || []).length} producto{(order.items || []).length !== 1 ? 's' : ''} · {formatRelativeTime(order.created_at)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold" style={{ color: 'var(--color-black)' }}>
                        {(order.total || 0).toFixed(2)}€
                      </p>
                      <B2COrderStatusBadge status={order.status} />
                    </div>
                    <Link
                      to={`/producer/orders`}
                      className="shrink-0 flex items-center justify-center"
                      style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-black)' }}
                    >
                      <ChevronRight className="w-4 h-4" style={{ color: '#fff' }} />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick actions B2C */}
          <div className="mb-5">
            <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--color-black)' }}>Acciones rápidas</h2>
            <div className="grid grid-cols-2 gap-2">
              <QuickAction icon={Store} label="Ver mi tienda" href="/producer/store-profile" />
              <QuickAction icon={Plus} label="Publicar producto" href="/producer/products/new" variant="green" />
            </div>
          </div>

          {/* Top products this week */}
          <div className="p-4 mb-5" style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold" style={{ color: 'var(--color-black)' }}>Top productos esta semana</h3>
              <Link to="/producer/products" className="text-xs font-semibold hover:underline" style={{ color: 'var(--color-stone)' }}>
                Ver todos <ArrowRight className="w-3 h-3 inline" />
              </Link>
            </div>
            {topProducts.length > 0 ? topProducts.map((product, i) => (
              <div
                key={product.product_id || i}
                className="flex items-center gap-3 py-2.5"
                style={{ borderBottom: i < topProducts.length - 1 ? '1px solid var(--color-border)' : 'none' }}
              >
                <div
                  className="w-10 h-10 shrink-0 overflow-hidden"
                  style={{ borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}
                >
                  {product.images?.[0] ? (
                    <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-4 h-4" style={{ color: 'var(--color-stone)' }} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-black)' }}>
                    {product.name}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-stone)' }}>
                    {product.price ? `${product.price.toFixed(2)}€` : ''} · Stock: {product.stock ?? '—'}
                  </p>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: 'var(--color-surface)', color: 'var(--color-stone)' }}>
                  #{i + 1}
                </span>
              </div>
            )) : (
              <p className="text-sm py-3" style={{ color: 'var(--color-stone)' }}>
                Aún no tienes productos publicados.
              </p>
            )}
          </div>

          {/* B2C recent orders (completed) */}
          {b2cOrders.filter(o => o.status !== 'pending' && o.status !== 'processing').length > 0 && (
            <div className="p-4" style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold" style={{ color: 'var(--color-black)' }}>Pedidos B2C recientes</h3>
                <Link to="/producer/orders" className="text-xs font-semibold hover:underline" style={{ color: 'var(--color-stone)' }}>
                  Ver todos <ArrowRight className="w-3 h-3 inline" />
                </Link>
              </div>
              {b2cOrders.filter(o => o.status !== 'pending' && o.status !== 'processing').slice(0, 3).map((order, i) => (
                <div
                  key={order.order_id || i}
                  className="flex items-center justify-between py-2.5"
                  style={{ borderBottom: i < 2 ? '1px solid var(--color-border)' : 'none' }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-black)' }}>
                      {order.customer_name || 'Cliente'}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-stone)' }}>
                      {(order.items || []).length} producto{(order.items || []).length !== 1 ? 's' : ''} · {formatRelativeTime(order.created_at)}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-bold" style={{ color: 'var(--color-black)' }}>
                      {(order.total || 0).toFixed(2)}€
                    </p>
                    <B2COrderStatusBadge status={order.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* B2B Tab */}

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <KPICard
              icon={Package}
              value={stats?.b2b_active_orders || stats?.total_orders || 0}
              label="Pedidos B2B activos"
              href="/importer/orders"
            />
            <KPICard
              icon={ShoppingBag}
              value={`${(stats?.volume_month || 0).toFixed(0)}€`}
              label="Volumen este mes"
            />
            <KPICard
              icon={Factory}
              value={stats?.active_suppliers || (stats?.countries_of_origin || []).length || 0}
              label="Proveedores activos"
              href="/importer/catalog"
            />
            <KPICard
              icon={Store}
              value="3%"
              label="Comisión"
            />
          </div>

          {/* Operations requiring action */}
          {actionableOps.length > 0 && (
            <div className="mb-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold" style={{ color: 'var(--color-black)' }}>Requieren tu acción</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--color-red-light)', color: 'var(--color-red)' }}>
                  {actionableOps.length}
                </span>
              </div>
              <div className="space-y-2">
                {actionableOps.slice(0, 3).map(op => (
                  <OperationCard
                    key={op.id || op._id}
                    operation={op}
                    userId={user?.user_id}
                    onNavigate={(path) => navigate(path)}
                  />
                ))}
              </div>
              {actionableOps.length > 3 && (
                <Link
                  to="/b2b/operations"
                  className="flex items-center justify-center gap-2 mt-3 py-2.5 text-sm font-semibold transition-colors"
                  style={{ color: 'var(--color-black)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', background: 'var(--color-white)' }}
                >
                  Ver todas las operaciones <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          )}

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-2 mb-5">
            <QuickAction icon={Search} label="Catálogo B2B" href="/importer/catalog" />
            <QuickAction icon={Package} label="Mis pedidos B2B" href="/importer/orders" />
            <QuickAction icon={Award} label="Certificados" href="/importer/certificates" />
            <QuickAction icon={FileCheck} label="Operaciones B2B" href="/b2b/operations" />
          </div>

          {/* Plan card */}
          <div className="mb-5">
            <ImporterPlanCard plan={stats?.plan || 'FREE'} />
          </div>

          {/* Recent B2B orders */}
          {recentB2B.length > 0 && (
            <div className="p-4" style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold" style={{ color: 'var(--color-black)' }}>Pedidos B2B recientes</h3>
                <Link to="/importer/orders" className="text-xs font-semibold hover:underline" style={{ color: 'var(--color-stone)' }}>
                  Ver todos <ArrowRight className="w-3 h-3 inline" />
                </Link>
              </div>
              {recentB2B.map((order, i) => (
                <div
                  key={order.id || i}
                  className="flex items-center justify-between py-2.5"
                  style={{ borderBottom: i < recentB2B.length - 1 ? '1px solid var(--color-border)' : 'none' }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-black)' }}>
                      {order.producer_name || 'Productor'}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-stone)' }}>
                      {order.items_count || 1} productos · {formatRelativeTime(order.created_at)}
                    </p>
                  </div>
                  {order.producer_id && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleB2BChat(order.producer_id); }}
                      className="shrink-0 flex items-center justify-center"
                      style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: 'var(--color-surface)', border: 'none', cursor: 'pointer',
                      }}
                      aria-label="Chat B2B"
                    >
                      <MessageCircle className="w-4 h-4" style={{ color: 'var(--color-stone)' }} />
                    </button>
                  )}
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-bold" style={{ color: 'var(--color-black)' }}>
                      {(order.total || 0).toFixed(2)}€
                    </p>
                    <B2BOrderStatusBadge status={order.status} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Ver todas las operaciones B2B */}
          <Link
            to="/b2b/operations"
            className="flex items-center justify-center gap-2 mt-4 py-3 text-sm font-semibold transition-colors"
            style={{ color: 'var(--color-black)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', background: 'var(--color-white)' }}
          >
            Ver todas las operaciones B2B <ArrowRight className="w-4 h-4" />
          </Link>

          {/* Active certificates */}
          <div className="mt-5 p-4" style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
            <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--color-black)' }}>Certificados activos</h3>
            <div className="flex flex-wrap gap-2">
              {(stats?.certificates || []).length > 0 ? (stats.certificates || []).map((cert, i) => (
                <span key={i} className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'var(--color-green-light)', color: 'var(--color-green)' }}>
                  {cert.name || cert}
                </span>
              )) : (
                <p className="text-sm" style={{ color: 'var(--color-stone)' }}>Sin certificados activos</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Account & Configuration */}
      <div className="mt-5 p-4" style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
        <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--color-black)' }}>Cuenta y configuración</h3>
        <div className="space-y-1">
          {[
            {
              icon: PenTool,
              label: 'Firma digital',
              sublabel: user?.signature_url ? 'Configurada' : 'Pendiente',
              sublabelColor: user?.signature_url ? 'var(--color-green)' : 'var(--color-amber)',
              to: '/settings/signature',
            },
            { icon: FileText, label: 'Mis documentos', sublabel: 'Contratos y certificados', to: '/documents' },
            { icon: CreditCard, label: 'Datos bancarios', sublabel: 'Stripe Connect', to: '/producer/connect' },
            { icon: KeyRound, label: 'Cambiar contraseña', sublabel: '', to: '/settings/password' },
          ].map((item, i) => (
            <Link
              key={i}
              to={item.to}
              className="flex items-center gap-3 p-3 transition-colors"
              style={{ borderRadius: 'var(--radius-md)' }}
            >
              <div className="w-8 h-8 flex items-center justify-center shrink-0" style={{ borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}>
                <item.icon className="w-4 h-4" style={{ color: 'var(--color-stone)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--color-black)' }}>{item.label}</p>
                {item.sublabel && (
                  <p className="text-[11px]" style={{ color: item.sublabelColor || 'var(--color-stone)' }}>{item.sublabel}</p>
                )}
              </div>
              <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--color-stone)' }} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
