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

function QuickAction({ icon: Icon, label, href, external }) {
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 p-3.5 transition-all text-sm font-semibold"
        style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', color: 'var(--color-black)' }}
      >
        <Icon className="w-5 h-5 shrink-0" style={{ color: 'var(--color-stone)' }} />
        {label}
        <ExternalLink className="w-3.5 h-3.5 ml-auto" style={{ color: 'var(--color-stone)' }} />
      </a>
    );
  }
  return (
    <Link
      to={href}
      className="flex items-center gap-3 p-3.5 transition-all text-sm font-semibold"
      style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', color: 'var(--color-black)' }}
    >
      <Icon className="w-5 h-5 shrink-0" style={{ color: 'var(--color-stone)' }} />
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

export default function ImporterDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [recentB2B, setRecentB2B] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('b2b');

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
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-stone)' }} />
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'var(--font-sans)', background: 'var(--color-cream)' }}>
      {/* Header */}
      <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--color-black)' }}>Panel de importador</h1>
      <p className="text-sm mb-4" style={{ color: 'var(--color-stone)' }}>B2B y B2C en una vista</p>

      {/* Tabs B2C / B2B */}
      <div className="flex gap-6 mb-6">
        {['b2b', 'b2c'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="pb-2 text-sm font-semibold uppercase tracking-wider transition-colors"
            style={{
              borderBottom: activeTab === tab ? '2px solid var(--color-black)' : '2px solid transparent',
              color: activeTab === tab ? 'var(--color-black)' : 'var(--color-stone)',
            }}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="mb-4">
          {alerts.map((alert, i) => (
            <AlertCard key={i} alert={alert} />
          ))}
        </div>
      )}

      {activeTab === 'b2b' ? (
        <>
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
              value={`3%`}
              label="Comisión"
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
      ) : (
        <>
          {/* B2C Tab */}
          <div className="mb-5">
            <KPICard
              icon={Store}
              value={stats?.store_orders || 0}
              label="Ventas B2C este mes"
              href="/producer/orders"
            />
          </div>
          <div className="p-4" style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
            <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--color-black)' }}>Pedidos B2C recientes</h3>
            <p className="text-sm" style={{ color: 'var(--color-stone)' }}>
              Los pedidos B2C se gestionan desde tu tienda online.
            </p>
            <Link to="/producer/orders" className="inline-flex items-center gap-1 mt-3 text-sm font-semibold" style={{ color: 'var(--color-black)' }}>
              Ver pedidos <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
