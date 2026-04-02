// @ts-nocheck
import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package, ShoppingBag, Factory, Store, Search, Award, FileCheck,
  ArrowRight, AlertTriangle,
  Loader2, Globe, MessageCircle, TrendingUp, Eye, Plus,
  Clock, ChevronRight, BarChart3, PenTool, FileText, KeyRound, CreditCard
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';
import apiClient from '../../services/api/client';
import { useChatContext } from '../../context/chat/ChatProvider';
import { toast } from 'sonner';
import { OperationCard } from '../b2b/B2BOperationsDashboard';
import { useTranslation } from 'react-i18next';

/* ─── Shared Components ─── */

function KPICard({ label, value, icon: Icon, href, description }) {
  const Wrapper = href ? Link : 'div';
  return (
    <Wrapper to={href} className="p-4 bg-white rounded-2xl shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 flex items-center justify-center shrink-0 rounded-2xl bg-stone-100">
          <Icon className="w-4 h-4 text-stone-500" />
        </div>
      </div>
      <p className="text-2xl font-extrabold tracking-tight text-stone-950">{value}</p>
      <p className="text-xs mt-0.5 text-stone-500">{label}</p>
      {description && <p className="text-[11px] mt-0.5 text-stone-400">{description}</p>}
    </Wrapper>
  );
}

function AlertCard({ alert }) {
  const isDanger = alert.type === 'danger';
  return (
    <div className={`flex items-start gap-3 p-3 mb-2 rounded-2xl border ${isDanger ? 'bg-stone-100 border-stone-200' : 'bg-stone-100 border-stone-200'}`}>
      <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${isDanger ? 'text-stone-700' : 'text-stone-500'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-stone-950">{alert.title}</p>
        {alert.message && <p className="text-xs mt-0.5 text-stone-500">{alert.message}</p>}
      </div>
      {alert.action_href && (
        <Link to={alert.action_href} className="text-xs font-bold shrink-0 hover:underline text-stone-950">
          {alert.action_label || 'Ver'} <ArrowRight className="w-3 h-3 inline" />
        </Link>
      )}
    </div>
  );
}

function QuickAction({ icon: Icon, label, href, variant = 'default' }) {
  const isPrimary = variant === 'primary';
  return (
    <Link
      to={href}
      className={`flex items-center gap-3 p-3.5 rounded-2xl transition-all text-sm font-semibold ${
        isPrimary ? 'bg-stone-950 text-white' : 'bg-white border border-stone-200 text-stone-950 hover:border-stone-200'
      }`}
    >
      <Icon className={`w-5 h-5 shrink-0 ${isPrimary ? 'text-white' : 'text-stone-500'}`} />
      {label}
    </Link>
  );
}

function ImporterPlanCard({ plan }) {
  if (plan === 'ELITE' || plan === 'elite') {
    return (
      <Link
        to="/importer/catalog"
        className="flex items-center gap-3.5 p-4 transition-colors bg-stone-950 rounded-2xl text-white"
      >
        <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 bg-white/10">
          <Globe className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">Agente Comercial IA</p>
          <p className="text-xs mt-0.5 text-white/45">
            Busca productores globales · Analiza mercados · Genera contratos
          </p>
        </div>
        <ArrowRight className="w-5 h-5 shrink-0 text-white/45" />
      </Link>
    );
  }

  return (
    <div className="p-4 bg-white rounded-2xl border-2 border-stone-200">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-stone-950">
          Plan {(plan || 'FREE').toUpperCase()} · Actualizar a ELITE
        </p>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
          ELITE
        </span>
      </div>
      <div className="space-y-1.5 mb-4">
        {[
          'Agente Comercial IA para importadores',
          'Matching con productores globales',
          t('importer_dashboard.contratosB2bGeneradosAutomaticamente', 'Contratos B2B generados automáticamente'),
          'Comisión reducida al 15%',
        ].map(f => (
          <p key={f} className="text-xs flex items-center gap-1.5 text-stone-500">
            <span className="font-bold text-stone-950">✓</span> {f}
          </p>
        ))}
      </div>
      <Link
        to="/settings/plan"
        className="block w-full text-center py-2.5 text-sm font-medium transition-colors bg-stone-950 text-white rounded-2xl"
      >
        Actualizar a ELITE · 249 €/mes <ArrowRight className="w-4 h-4 inline ml-1" />
      </Link>
    </div>
  );
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  if (diff < 0) return 'ahora';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

function B2BOrderStatusBadge({ status }) {
  const config = {
    pending: { label: 'Esperando productor', cls: 'bg-stone-100 text-stone-500' },
    pending_producer: { label: 'Esperando productor', cls: 'bg-stone-100 text-stone-500' },
    confirmed_by_producer: { label: 'Confirmado', cls: 'bg-stone-100 text-stone-950' },
    paid: { label: 'Pagado', cls: 'bg-stone-100 text-stone-950' },
    shipped: { label: 'En camino', cls: 'bg-stone-100 text-stone-500' },
    delivered: { label: 'Recibido', cls: 'bg-stone-950 text-white' },
    cancelled: { label: 'Cancelado', cls: 'bg-white text-stone-500' },
    rejected: { label: 'Rechazado', cls: 'bg-stone-100 text-stone-700' },
  };
  const c = config[status] || { label: status, cls: 'bg-stone-100 text-stone-500' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.cls}`}>
      {c.label}
    </span>
  );
}

function B2COrderStatusBadge({ status }) {
  const config = {
    pending: { label: 'Pendiente', cls: 'bg-stone-100 text-stone-700' },
    processing: { label: 'Procesando', cls: 'bg-stone-100 text-stone-700' },
    shipped: { label: 'Enviado', cls: 'bg-stone-100 text-stone-500' },
    delivered: { label: 'Entregado', cls: 'bg-stone-100 text-stone-950' },
    cancelled: { label: 'Cancelado', cls: 'bg-stone-100 text-stone-700' },
    refunded: { label: 'Reembolsado', cls: 'bg-stone-100 text-stone-700' },
  };
  const c = config[status] || { label: status, cls: 'bg-stone-100 text-stone-500' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.cls}`}>
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
    <div className="flex gap-1 p-0.5 rounded-full bg-stone-100">
      {options.map(o => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`px-3 py-1 text-[11px] font-semibold transition-all rounded-full ${
            value === o.key ? 'bg-white text-stone-950 shadow-sm' : 'bg-transparent text-stone-500'
          }`}
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
  const { convertAndFormatPrice } = useLocale();
  const navigate = useNavigate();
  const { openConversation } = useChatContext();

  const handleB2BChat = async (producerId) => {
    try {
      const conv = await openConversation(producerId, 'b2b');
      const conversationId = conv?.id || conv?.conversation_id;
      if (conversationId) navigate(`/messages/${conversationId}`);
    } catch {
      toast.error(t('product_detail.noSePudoAbrirElChat', 'No se pudo abrir el chat'));
    }
  };

  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [recentB2B, setRecentB2B] = useState([]);
  const [b2cOrders, setB2cOrders] = useState([]);
  const [b2bOperations, setB2bOperations] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState('b2c');
  const [period, setPeriod] = useState('month');

  const loadData = useCallback(() => {
    let active = true;
    setError(false);
    setLoading(true);
    Promise.all([
      apiClient.get(`/importer/stats?period=${period}`).catch(() => null),
      apiClient.get('/importer/alerts').catch(() => []),
      apiClient.get('/importer/b2b-orders?limit=3').catch(() => ({ orders: [] })),
      apiClient.get('/producer/orders').catch(() => []),
      apiClient.get('/b2b/operations').catch(() => []),
      apiClient.get('/products?seller_id=me&limit=5&sort=sales').catch(() => []),
    ]).then(([s, a, b, orders, ops, products]) => {
      if (!active) return;
      setStats(s || {});
      setAlerts(Array.isArray(a) ? a : []);
      setRecentB2B(Array.isArray(b?.orders) ? b.orders : []);
      setB2cOrders(Array.isArray(orders) ? orders : []);
      setB2bOperations(Array.isArray(ops) ? ops : (ops?.operations || []));
      setTopProducts(Array.isArray(products) ? products.slice(0, 3) : (Array.isArray(products?.products) ? products.products : []).slice(0, 3));
    }).catch(() => {
      if (active) setError(true);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [period]);

  useEffect(() => {
    return loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="bg-stone-50">
        <div className="h-8 w-48 rounded-2xl bg-stone-100 animate-pulse mb-2" />
        <div className="h-4 w-32 rounded-2xl bg-stone-100 animate-pulse mb-5" />
        <div className="grid grid-cols-2 gap-3 mb-5">
          {[0,1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-stone-100 animate-pulse" />)}
        </div>
        <div className="h-40 rounded-2xl bg-stone-100 animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3" >
        <AlertTriangle className="w-10 h-10 text-stone-500" />
        <p className="text-sm font-semibold text-stone-950">{t('importer_dashboard.errorAlCargarElPanel', 'Error al cargar el panel')}</p>
        <button
          onClick={loadData}
          className="px-5 py-2 text-sm font-semibold transition-colors bg-stone-950 text-white rounded-2xl border-none cursor-pointer"
        >
          Reintentar
        </button>
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
    <div className="bg-stone-50">
     <div className="max-w-[975px] mx-auto">
      {/* Header with company name + plan badge */}
      <div className="flex items-center gap-3 mb-1">
        <h1 className="text-2xl font-bold text-stone-950">{companyName}</h1>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-stone-100 text-stone-500">
          {planLabel}
        </span>
      </div>
      <p className="text-sm mb-5 text-stone-500">Panel de importador</p>

      {/* Mode Selector Tabs — large pill style */}
      <div className="flex gap-0 mb-6 p-1 rounded-2xl bg-stone-100">
        {[
          { key: 'b2c', label: 'B2C Consumidor', icon: Store },
          { key: 'b2b', label: 'B2B Mayorista', icon: Factory },
        ].map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all rounded-2xl ${
                isActive ? 'bg-white text-stone-950 shadow-sm' : 'bg-transparent text-stone-500'
              }`}
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
            <h2 className="text-sm font-bold text-stone-950">Resumen</h2>
            <PeriodSelector value={period} onChange={setPeriod} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <KPICard
              icon={TrendingUp}
              value={convertAndFormatPrice(stats?.volume_month || 0, 'EUR')}
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
                <h2 className="text-sm font-bold text-stone-950">Pedidos pendientes</h2>
                <Link to="/producer/orders" className="text-xs font-semibold hover:underline text-stone-500">
                  Ver todos <ArrowRight className="w-3 h-3 inline" />
                </Link>
              </div>
              <div className="space-y-2">
                {pendingB2cOrders.slice(0, 4).map((order, i) => (
                  <div
                    key={order.order_id || i}
                    className="flex items-center gap-3 p-3.5 bg-white rounded-2xl shadow-sm"
                  >
                    <div className="w-9 h-9 flex items-center justify-center shrink-0 rounded-2xl bg-stone-100">
                      <Clock className="w-4 h-4 text-stone-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate text-stone-950">
                        {order.customer_name || 'Cliente'}
                      </p>
                      <p className="text-xs text-stone-500">
                        {(order.items || []).length} producto{(order.items || []).length !== 1 ? 's' : ''} · {formatRelativeTime(order.created_at)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-stone-950">
                        {convertAndFormatPrice(order.total || 0, 'EUR')}
                      </p>
                      <B2COrderStatusBadge status={order.status} />
                    </div>
                    <Link
                      to={`/producer/orders`}
                      className="w-8 h-8 shrink-0 rounded-full bg-stone-950 flex items-center justify-center"
                    >
                      <ChevronRight className="w-4 h-4 text-white" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick actions B2C */}
          <div className="mb-5">
            <h2 className="text-sm font-bold mb-3 text-stone-950">{t('sellerAI.quickActions', 'Acciones rápidas')}</h2>
            <div className="grid grid-cols-2 gap-2">
              <QuickAction icon={Store} label="Ver mi tienda" href="/producer/store-profile" />
              <QuickAction icon={Plus} label="Publicar producto" href="/producer/products/new" variant="primary" />
            </div>
          </div>

          {/* Top products this week */}
          <div className="p-4 mb-5 bg-white rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-stone-950">Top productos esta semana</h3>
              <Link to="/producer/products" className="text-xs font-semibold hover:underline text-stone-500">
                Ver todos <ArrowRight className="w-3 h-3 inline" />
              </Link>
            </div>
            {topProducts.length > 0 ? topProducts.map((product, i) => (
              <div
                key={product.product_id || i}
                className={`flex items-center gap-3 py-2.5 ${i < topProducts.length - 1 ? 'border-b border-stone-200' : ''}`}
              >
                <div
                  className="w-10 h-10 shrink-0 overflow-hidden rounded-2xl bg-stone-100"
                >
                  {product.images?.[0] ? (
                    <img loading="lazy" src={product.images[0]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-4 h-4 text-stone-500" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate text-stone-950">
                    {product.name}
                  </p>
                  <p className="text-xs text-stone-500">
                    {product.price ? convertAndFormatPrice(product.price, 'EUR') : ''} · Stock: {product.stock ?? '—'}
                  </p>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0 bg-stone-100 text-stone-500">
                  #{i + 1}
                </span>
              </div>
            )) : (
              <p className="text-sm py-3 text-stone-500">
                Aún no tienes productos publicados.
              </p>
            )}
          </div>

          {/* B2C recent orders (completed) */}
          {b2cOrders.filter(o => o.status !== 'pending' && o.status !== 'processing').length > 0 && (
            <div className="p-4 bg-white rounded-2xl shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-stone-950">Pedidos B2C recientes</h3>
                <Link to="/producer/orders" className="text-xs font-semibold hover:underline text-stone-500">
                  Ver todos <ArrowRight className="w-3 h-3 inline" />
                </Link>
              </div>
              {b2cOrders.filter(o => o.status !== 'pending' && o.status !== 'processing').slice(0, 3).map((order, i) => (
                <div
                  key={order.order_id || i}
                  className={`flex items-center justify-between py-2.5 ${i < 2 ? 'border-b border-stone-200' : ''}`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate text-stone-950">
                      {order.customer_name || 'Cliente'}
                    </p>
                    <p className="text-xs text-stone-500">
                      {(order.items || []).length} producto{(order.items || []).length !== 1 ? 's' : ''} · {formatRelativeTime(order.created_at)}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-bold text-stone-950">
                      {convertAndFormatPrice(order.total || 0, 'EUR')}
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

          {/* Section header */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-stone-950">Mis Importaciones (B2B)</h2>
            <Link to="/b2b/operations" className="text-xs font-semibold hover:underline flex items-center gap-1 text-stone-500">
              Ver operaciones B2B <ArrowRight className="w-3 h-3 inline" />
            </Link>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <KPICard
              icon={Package}
              value={stats?.b2b_active_orders || stats?.total_orders || 0}
              label="Pedidos B2B activos"
              href="/importer/orders"
            />
            <KPICard
              icon={ShoppingBag}
              value={convertAndFormatPrice(stats?.volume_month || 0, 'EUR')}
              label="Volumen este mes"
            />
            <KPICard
              icon={Factory}
              value={stats?.active_suppliers || (stats?.countries_of_origin || []).length || 0}
              label="Proveedores activos"
              href="/importer/catalog"
            />
            {stats?.b2b_operations_count != null ? (
              <KPICard
                icon={FileCheck}
                value={stats.b2b_operations_count}
                label="Operaciones B2B"
                href="/b2b/operations"
              />
            ) : (
              <KPICard
                icon={Store}
                value="3%"
                label=t('influencer.commissionRate', 'Comisión')
              />
            )}
          </div>

          {/* Operations requiring action */}
          {actionableOps.length > 0 && (
            <div className="mb-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-stone-950">{t('importer_dashboard.requierenTuAccion', 'Requieren tu acción')}</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
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
                  className="flex items-center justify-center gap-2 mt-3 py-2.5 text-sm font-semibold transition-colors text-stone-950 rounded-2xl border border-stone-200 bg-white"
                >
                  Ver todas las operaciones <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          )}

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-2 mb-5">
            <QuickAction icon={Search} label=t('importer_dashboard.catalogoB2b', 'Catálogo B2B') href="/importer/catalog" />
            <QuickAction icon={Package} label="Mis pedidos B2B" href="/importer/orders" />
            <QuickAction icon={Award} label="Certificados" href="/importer/certificates" />
            <QuickAction icon={FileCheck} label="Operaciones B2B" href="/b2b/operations" />
          </div>

          {/* Plan card */}
          <div className="mb-5">
            <ImporterPlanCard plan={stats?.plan || 'FREE'} />
          </div>

          {/* Últimos proveedores */}
          <div className="p-4 mb-5 bg-white rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-stone-950">Últimos proveedores</h3>
              <Link to="/b2b/marketplace" className="text-xs font-semibold hover:underline text-stone-500">
                Explorar <ArrowRight className="w-3 h-3 inline" />
              </Link>
            </div>
            {recentB2B.length > 0 ? (
              recentB2B
                .filter((order, i, arr) => arr.findIndex(o => o.producer_id === order.producer_id) === i)
                .slice(0, 5)
                .map((order, i, arr) => (
                  <div
                    key={order.producer_id || i}
                    className={`flex items-center gap-3 py-2.5 ${i < arr.length - 1 ? 'border-b border-stone-200' : ''}`}
                  >
                    <div className="w-9 h-9 flex items-center justify-center shrink-0 rounded-full bg-stone-100 overflow-hidden">
                      {order.producer_avatar ? (
                        <img src={order.producer_avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-stone-500">
                          {(order.producer_name || 'P').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate text-stone-950">
                        {order.producer_name || 'Productor'}
                      </p>
                      <p className="text-xs text-stone-500">
                        Último pedido: {(() => { const d = order.created_at ? new Date(order.created_at) : null; return d && !isNaN(d.getTime()) ? d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'; })()}
                      </p>
                    </div>
                    {order.producer_id && (
                      <button
                        onClick={() => handleB2BChat(order.producer_id)}
                        className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full bg-stone-100 border-none cursor-pointer"
                        aria-label="Chat B2B"
                      >
                        <MessageCircle className="w-4 h-4 text-stone-500" />
                      </button>
                    )}
                  </div>
                ))
            ) : (
              <div className="flex flex-col items-center py-6 gap-3">
                <Factory className="w-8 h-8 text-stone-300" />
                <p className="text-sm text-stone-500">{t('importer_dashboard.aunNoTienesProveedores', 'Aún no tienes proveedores')}</p>
                <Link
                  to="/b2b/marketplace"
                  className="px-5 py-2.5 bg-stone-950 text-white rounded-full text-sm font-bold hover:bg-stone-800 transition-colors inline-flex items-center gap-1.5"
                >
                  Explorar marketplace <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>

          {/* Recent B2B orders */}
          {recentB2B.length > 0 && (
            <div className="p-4 bg-white rounded-2xl shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-stone-950">Pedidos B2B recientes</h3>
                <Link to="/importer/orders" className="text-xs font-semibold hover:underline text-stone-500">
                  Ver todos <ArrowRight className="w-3 h-3 inline" />
                </Link>
              </div>
              {recentB2B.map((order, i) => (
                <div
                  key={order.id || i}
                  className={`flex items-center justify-between py-2.5 ${i < recentB2B.length - 1 ? 'border-b border-stone-200' : ''}`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate text-stone-950">
                      {order.producer_name || 'Productor'}
                    </p>
                    <p className="text-xs text-stone-500">
                      {order.items_count || 1} productos · {formatRelativeTime(order.created_at)}
                    </p>
                  </div>
                  {order.producer_id && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleB2BChat(order.producer_id); }}
                      className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full bg-stone-100 border-none cursor-pointer"
                      aria-label="Chat B2B"
                    >
                      <MessageCircle className="w-4 h-4 text-stone-500" />
                    </button>
                  )}
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-bold text-stone-950">
                      {convertAndFormatPrice(order.total || 0, 'EUR')}
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
            className="flex items-center justify-center gap-2 mt-4 py-3 text-sm font-semibold transition-colors text-stone-950 rounded-2xl border border-stone-200 bg-white"
          >
            Ver todas las operaciones B2B <ArrowRight className="w-4 h-4" />
          </Link>

          {/* Active certificates */}
          <div className="mt-5 p-4 bg-white rounded-2xl shadow-sm">
            <h3 className="text-sm font-bold mb-3 text-stone-950">Certificados activos</h3>
            <div className="flex flex-wrap gap-2">
              {(stats?.certificates || []).length > 0 ? (stats.certificates || []).map((cert, i) => (
                <span key={i} className="px-3 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-950">
                  {cert.name || cert}
                </span>
              )) : (
                <p className="text-sm text-stone-500">Sin certificados activos</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Account & Configuration */}
      <div className="mt-5 p-4 bg-white rounded-2xl shadow-sm">
        <h3 className="text-sm font-bold mb-3 text-stone-950">{t('producer_overview.cuentaYConfiguracion', 'Cuenta y configuración')}</h3>
        <div className="space-y-1">
          {[
            {
              icon: PenTool,
              label: 'Firma digital',
              sublabel: user?.signature_url ? 'Configurada' : 'Pendiente',
              sublabelCls: user?.signature_url ? 'text-stone-950' : 'text-stone-700',
              to: '/settings/signature',
            },
            { icon: FileText, label: 'Mis documentos', sublabel: 'Contratos y certificados', to: '/documents' },
            { icon: CreditCard, label: t('producer_payments.metodoDeCobro', 'Método de cobro'), sublabel: 'Stripe o transferencia', to: '/producer/payments' },
            { icon: KeyRound, label: t('producer_overview.cambiarContrasena', 'Cambiar contraseña'), sublabel: '', to: '/settings/password' },
          ].map((item, i) => (
            <Link
              key={i}
              to={item.to}
              className="flex items-center gap-3 p-3 transition-colors rounded-2xl"
            >
              <div className="w-8 h-8 flex items-center justify-center shrink-0 rounded-2xl bg-stone-100">
                <item.icon className="w-4 h-4 text-stone-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-950">{item.label}</p>
                {item.sublabel && (
                  <p className={`text-[11px] ${item.sublabelCls || 'text-stone-500'}`}>{item.sublabel}</p>
                )}
              </div>
              <ChevronRight className="w-4 h-4 shrink-0 text-stone-500" />
            </Link>
          ))}
        </div>
      </div>
     </div>
    </div>
  );
}
