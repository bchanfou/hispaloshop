import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package, ShoppingBag, Factory, Store, Search, Award,
  ExternalLink, Crown, Zap, ArrowRight, AlertTriangle,
  Loader2, Globe
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api/client';

function KPICard({ label, value, icon: Icon, href }) {
  const Wrapper = href ? Link : 'div';
  return (
    <Wrapper
      to={href}
      className="bg-white rounded-xl border border-stone-200 p-4 hover:shadow-sm transition-all"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-lg bg-stone-100 flex items-center justify-center shrink-0">
          <Icon className="w-4.5 h-4.5 text-stone-700" />
        </div>
      </div>
      <p className="text-2xl font-extrabold text-stone-950 tracking-tight">{value}</p>
      <p className="text-xs text-stone-500 mt-0.5">{label}</p>
    </Wrapper>
  );
}

function AlertCard({ alert }) {
  const isDanger = alert.type === 'danger';
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border mb-2 ${
      isDanger ? 'bg-stone-100 border-stone-300' : 'bg-stone-50 border-stone-200'
    }`}>
      <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${isDanger ? 'text-stone-700' : 'text-stone-500'}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${isDanger ? 'text-stone-950' : 'text-stone-700'}`}>
          {alert.title}
        </p>
        {alert.message && (
          <p className="text-xs text-stone-500 mt-0.5">{alert.message}</p>
        )}
      </div>
      {alert.action_href && (
        <Link to={alert.action_href} className="text-xs font-bold text-stone-950 shrink-0 hover:underline">
          {alert.action_label || 'Ver'} <ArrowRight className="w-3 h-3 inline" />
        </Link>
      )}
    </div>
  );
}

function QuickAction({ icon: Icon, label, href, external }) {
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 p-3.5 bg-white rounded-xl border border-stone-200 hover:shadow-sm transition-all text-sm font-semibold text-stone-950"
      >
        <Icon className="w-5 h-5 text-stone-500 shrink-0" />
        {label}
        <ExternalLink className="w-3.5 h-3.5 text-stone-400 ml-auto" />
      </a>
    );
  }
  return (
    <Link
      to={href}
      className="flex items-center gap-3 p-3.5 bg-white rounded-xl border border-stone-200 hover:shadow-sm transition-all text-sm font-semibold text-stone-950"
    >
      <Icon className="w-5 h-5 text-stone-500 shrink-0" />
      {label}
    </Link>
  );
}

function ImporterPlanCard({ plan }) {
  if (plan === 'ELITE' || plan === 'elite') {
    return (
      <Link
        to="/producer/commercial-ai"
        className="flex items-center gap-3.5 p-4 bg-stone-950 rounded-xl text-white hover:bg-stone-800 transition-colors"
      >
        <div className="w-11 h-11 rounded-full bg-stone-800 flex items-center justify-center shrink-0">
          <Globe className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">Agente Comercial IA</p>
          <p className="text-xs text-stone-400 mt-0.5">
            Busca productores globales · Analiza mercados · Genera contratos
          </p>
        </div>
        <ArrowRight className="w-5 h-5 text-stone-400 shrink-0" />
      </Link>
    );
  }

  return (
    <div className="bg-white rounded-xl border-2 border-stone-300 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-stone-950">
          Plan {(plan || 'FREE').toUpperCase()} · Actualizar a ELITE
        </p>
        <span className="text-[10px] font-bold uppercase tracking-wider bg-stone-950 text-white px-2 py-0.5 rounded-full">
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
          <p key={f} className="text-xs text-stone-600 flex items-center gap-1.5">
            <span className="text-stone-950 font-bold">✓</span> {f}
          </p>
        ))}
      </div>
      <Link
        to="/producer/plan"
        className="block w-full text-center py-2.5 bg-stone-950 hover:bg-stone-800 text-white text-sm font-medium rounded-xl transition-colors"
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
    pending_producer: { label: 'Esperando productor', bg: 'bg-stone-100 text-stone-700' },
    confirmed_by_producer: { label: 'Confirmado', bg: 'bg-stone-200 text-stone-800' },
    paid: { label: 'Pagado', bg: 'bg-stone-100 text-stone-700' },
    shipped: { label: 'En camino', bg: 'bg-stone-100 text-stone-700' },
    delivered: { label: 'Recibido', bg: 'bg-stone-950 text-white' },
    cancelled: { label: 'Cancelado', bg: 'border border-stone-200 text-stone-400 bg-white' },
    rejected: { label: 'Rechazado', bg: 'border border-stone-200 text-stone-400 bg-white' },
  };
  const c = config[status] || { label: status, bg: 'bg-stone-100 text-stone-600' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.bg}`}>
      {c.label}
    </span>
  );
}

export default function ImporterDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [recentB2B, setRecentB2B] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiClient.get('/importer/stats').catch(() => null),
      apiClient.get('/importer/alerts').catch(() => []),
      apiClient.get('/importer/b2b-orders?limit=3').catch(() => ({ orders: [] })),
    ]).then(([s, a, b]) => {
      if (!active) return;
      setStats(s || {});
      setAlerts(Array.isArray(a) ? a : []);
      setRecentB2B(b?.orders || []);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-stone-500" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <h1 className="text-2xl font-bold text-stone-950 mb-1">Panel de importador</h1>
      <p className="text-sm text-stone-500 mb-6">B2B y B2C en una vista</p>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="mb-4">
          {alerts.map((alert, i) => (
            <AlertCard key={i} alert={alert} />
          ))}
        </div>
      )}

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
          value={stats?.store_orders || 0}
          label="Ventas B2C este mes"
          href="/producer/orders"
        />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-2 mb-5">
        <QuickAction icon={Search} label="Catálogo B2B" href="/importer/catalog" />
        <QuickAction icon={Package} label="Mis pedidos B2B" href="/importer/orders" />
        <QuickAction icon={Award} label="Certificados" href="/importer/certificates" />
        <QuickAction
          icon={Store}
          label="Mi tienda"
          href={`/${user?.username}/tienda`}
          external
        />
      </div>

      {/* Plan card */}
      <div className="mb-5">
        <ImporterPlanCard plan={stats?.plan || 'FREE'} />
      </div>

      {/* Recent B2B orders */}
      {recentB2B.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-stone-950">Pedidos B2B recientes</h3>
            <Link to="/importer/orders" className="text-xs font-semibold text-stone-600 hover:text-stone-950">
              Ver todos <ArrowRight className="w-3 h-3 inline" />
            </Link>
          </div>
          {recentB2B.map((order, i) => (
            <div
              key={order.id || i}
              className={`flex items-center justify-between py-2.5 ${
                i < recentB2B.length - 1 ? 'border-b border-stone-100' : ''
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-stone-950 truncate">
                  {order.producer_name || 'Productor'}
                </p>
                <p className="text-xs text-stone-500">
                  {order.items_count || 1} productos · {formatRelativeTime(order.created_at)}
                </p>
              </div>
              <div className="text-right shrink-0 ml-3">
                <p className="text-sm font-bold text-stone-950">
                  {(order.total || 0).toFixed(2)}€
                </p>
                <B2BOrderStatusBadge status={order.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
