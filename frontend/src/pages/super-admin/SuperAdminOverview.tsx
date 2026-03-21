// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import apiClient from '../../services/api/client';

function SACard({ children, className = '' }) {
  return (
    <div
      className={`bg-stone-900 rounded-[14px] border border-stone-800 p-4 hover:border-stone-700 transition-colors ${className}`}
    >
      {children}
    </div>
  );
}

function KPICard({ label, value, sub, light = false }) {
  return (
    <SACard>
      <p className="text-[11px] font-bold uppercase tracking-widest mb-2 text-stone-500">{label}</p>
      <p className={`text-[26px] font-extrabold tracking-tight leading-none mb-1 ${light ? 'text-stone-100' : 'text-stone-100'}`}>
        {value}
      </p>
      <p className="text-[11px] text-stone-500">{sub}</p>
    </SACard>
  );
}

function SkeletonCard({ className = '' }) {
  return (
    <div className={`bg-stone-900 rounded-[14px] border border-stone-800 p-4 animate-pulse ${className}`}>
      <div className="h-3 w-20 bg-stone-800 rounded mb-3" />
      <div className="h-7 w-24 bg-stone-800 rounded mb-2" />
      <div className="h-3 w-16 bg-stone-800 rounded" />
    </div>
  );
}

function formatDate() {
  return new Date().toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

export default function SuperAdminOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    apiClient.get('/superadmin/overview').then(d => {
      if (active) setData(d || null);
    }).catch(() => {
      if (active) setData(null);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <div className="max-w-[1100px] mx-auto pb-16">
        <div className="mb-8">
          <div className="h-7 w-48 bg-stone-800 rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-stone-800/60 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <SkeletonCard className="mb-5 !h-48" />
        <div className="grid md:grid-cols-2 gap-4 mb-5">
          <SkeletonCard className="!h-40" />
          <SkeletonCard className="!h-40" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-[1100px] mx-auto">
        <SACard className="text-center py-12">
          <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-stone-500" />
          <h2 className="text-lg font-bold mb-1 text-stone-100">No se pudo cargar el overview</h2>
          <p className="text-sm text-stone-400">Revisa la conexión con el backend.</p>
        </SACard>
      </div>
    );
  }

  const revenue = data?.revenue || {};
  const users = data?.users || {};
  const orders = data?.orders || {};
  const pending = data?.pending || {};
  const visits = data?.visits || {};
  const countries = data?.countries || [];
  const gdprAlerts = data?.gdpr_alerts || [];

  // Calculate MRR from subscriptions (simplified)
  const mrr = revenue.platform_commission ? Math.round(revenue.platform_commission / 12) : 0;
  const gmvMonth = revenue.last_30d || 0;

  // Plan distribution
  const planDist = data?.plan_distribution || { FREE: 0, PRO: 0, ELITE: 0 };
  const planTotal = (planDist.FREE || 0) + (planDist.PRO || 0) + (planDist.ELITE || 0) || 1;

  return (
    <div className="superadmin-theme max-w-[1100px] mx-auto pb-16" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[26px] font-extrabold tracking-tight mb-1 text-stone-100">Panel Global</h1>
        <p className="text-sm text-stone-400">{formatDate()}</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KPICard
          label="MRR"
          value={`${mrr}\u20AC`}
          sub={`ARR ~${Math.round(mrr * 12).toLocaleString()}\u20AC`}
        />
        <KPICard
          label="GMV 30d"
          value={`${Math.round(gmvMonth)}\u20AC`}
          sub={`${orders.last_30d || 0} pedidos`}
        />
        <KPICard
          label="Usuarios"
          value={users.total || 0}
          sub={`+${users.new_7d || 0} \u00FAltimos 7d`}
          light
        />
        <KPICard
          label="Comisiones"
          value={`${Math.round(revenue.platform_commission || 0)}\u20AC`}
          sub="Total acumulado"
        />
      </div>

      {/* Pending actions */}
      <SACard className="mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-stone-100">Acciones pendientes</h3>
        </div>
        <div className="space-y-2">
          {[
            { label: 'Vendedores pendientes', count: pending.sellers || 0, to: '/super-admin/users' },
            { label: 'Productos por revisar', count: pending.products || 0, to: '/super-admin/content' },
            { label: 'Certificados', count: pending.certificates || 0, to: '/super-admin/content' },
            { label: 'Contenido reportado', count: pending.flagged_posts || 0, to: '/super-admin/content' },
          ].map(item => (
            <Link
              key={item.label}
              to={item.to}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
            >
              <span className="text-sm text-stone-400">{item.label}</span>
              <div className="flex items-center gap-2">
                {item.count > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center bg-stone-600 text-stone-100">
                    {item.count}
                  </span>
                )}
                <ArrowRight className="w-4 h-4 text-stone-700" />
              </div>
            </Link>
          ))}
        </div>
      </SACard>

      {/* Countries list */}
      {countries.length > 0 && (
        <SACard className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-stone-100">Pa\u00EDses</h3>
            <Link to="/super-admin/markets" className="text-xs font-semibold text-stone-500 hover:text-stone-300 transition-colors">
              Gestionar
            </Link>
          </div>
          <div className="space-y-2">
            {countries.map((c, i) => (
              <div key={c.code || i} className="flex items-center justify-between py-2 border-b border-stone-800">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{c.flag || '\uD83C\uDF10'}</span>
                  <div>
                    <p className="text-sm font-semibold text-stone-100">{c.name}</p>
                    <p className="text-xs text-stone-400">{c.producers || 0} productores \u00B7 {c.users || 0} usuarios</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                    c.status === 'active'
                      ? 'bg-stone-800 border-stone-700 text-stone-300'
                      : c.status === 'beta'
                        ? 'bg-stone-800 border-stone-600 text-stone-400'
                        : 'bg-stone-800 border-stone-600 text-stone-400'
                  }`}>
                    {c.status}
                  </span>
                  {!c.admin && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-stone-800 border border-stone-600 text-stone-400">
                      Sin admin
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SACard>
      )}

      {/* Plan distribution */}
      <SACard className="mb-5">
        <h3 className="text-sm font-bold mb-3 text-stone-100">Distribuci\u00F3n de planes</h3>
        <div className="space-y-3">
          {[
            { label: 'FREE', count: planDist.FREE || 0, barClass: 'bg-stone-500' },
            { label: 'PRO', count: planDist.PRO || 0, barClass: 'bg-stone-300' },
            { label: 'ELITE', count: planDist.ELITE || 0, barClass: 'bg-stone-100' },
          ].map(p => (
            <div key={p.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-stone-100">{p.label}</span>
                <span className="text-xs text-stone-400">{p.count}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden bg-stone-800">
                <div className={`h-full rounded-full transition-all ${p.barClass}`} style={{ width: `${(p.count / planTotal) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </SACard>

      {/* GDPR Alerts */}
      {gdprAlerts.length > 0 && (
        <SACard className="mb-5 !border-stone-600">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-stone-100">
            <span>{'\u26A0\uFE0F'}</span> Alertas GDPR
          </h3>
          <div className="space-y-2">
            {gdprAlerts.map((alert, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-stone-400">
                <span>{'\u26A0\uFE0F'}</span>
                <p>{alert.message || alert}</p>
              </div>
            ))}
          </div>
        </SACard>
      )}

      {/* Users by role + Visits side by side */}
      <div className="grid md:grid-cols-2 gap-4 mb-5">
        <SACard>
          <h3 className="text-sm font-bold mb-3 text-stone-100">Usuarios por rol</h3>
          <div className="space-y-2">
            {Object.entries(users.by_role || {}).map(([role, count]) => (
              <div key={role} className="flex items-center justify-between py-1.5 border-b border-stone-800">
                <span className="text-xs capitalize text-stone-400">{role.replace('_', ' ')}</span>
                <span className="text-sm font-bold text-stone-100">{count}</span>
              </div>
            ))}
          </div>
        </SACard>

        <SACard>
          <h3 className="text-sm font-bold mb-3 text-stone-100">Visitas</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="rounded-2xl p-3 text-center bg-stone-800/60">
              <p className="text-xl font-extrabold text-stone-100">{visits.total || 0}</p>
              <p className="text-[10px] text-stone-500">Total</p>
            </div>
            <div className="rounded-2xl p-3 text-center bg-stone-800/60">
              <p className="text-xl font-extrabold text-stone-100">{visits.last_7d || 0}</p>
              <p className="text-[10px] text-stone-500">\u00DAltimos 7d</p>
            </div>
          </div>
          {(visits.by_country || []).slice(0, 5).map((v, i) => (
            <div key={i} className="flex items-center justify-between py-1 border-b border-stone-800">
              <span className="text-xs text-stone-400">{v.country || 'Desconocido'}</span>
              <span className="text-xs font-bold text-stone-300">{v.count}</span>
            </div>
          ))}
        </SACard>
      </div>

      {/* Top sellers */}
      {(data?.top_sellers || []).length > 0 && (
        <SACard className="mb-5">
          <h3 className="text-sm font-bold mb-3 text-stone-100">Top vendedores (30d)</h3>
          {data.top_sellers.map((seller, i) => (
            <div
              key={seller.seller_id || i}
              className="flex items-center justify-between py-2.5"
              style={{ borderBottom: i < data.top_sellers.length - 1 ? undefined : 'none' }}
              {...(i < data.top_sellers.length - 1 ? { className: 'flex items-center justify-between py-2.5 border-b border-stone-800' } : { className: 'flex items-center justify-between py-2.5' })}
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold w-5 text-stone-500">{i + 1}</span>
                <span className="text-sm font-semibold text-stone-100">{seller.name}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-stone-100">{seller.revenue?.toFixed(0)}\u20AC</span>
                <span className="text-[10px] ml-2 text-stone-500">{seller.orders} pedidos</span>
              </div>
            </div>
          ))}
        </SACard>
      )}

      {/* Recent activity */}
      <SACard>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-stone-100">Actividad reciente</h3>
          <Link to="/super-admin/finance" className="text-xs font-semibold text-stone-500 hover:text-stone-300 transition-colors">
            Ver todo
          </Link>
        </div>
        {(data?.recent_orders || []).slice(0, 5).map((order, i) => (
          <div
            key={order.order_id || i}
            className={`flex items-center justify-between py-2.5 ${i < Math.min((data?.recent_orders || []).length, 5) - 1 ? 'border-b border-stone-800' : ''}`}
          >
            <div>
              <p className="text-sm font-semibold text-stone-100">#{(order.order_id || '').slice(-8)}</p>
              <p className="text-[11px] text-stone-400">{order.user_name || 'Usuario'}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-stone-100">{Number(order.total_amount || 0).toFixed(2)}\u20AC</p>
              <p className="text-[11px] capitalize text-stone-400">{order.status}</p>
            </div>
          </div>
        ))}
        {(data?.recent_orders || []).length === 0 && (
          <p className="text-sm py-4 text-center text-stone-500">Sin actividad reciente</p>
        )}
      </SACard>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-5">
        {[
          { label: 'Pa\u00EDses', to: '/super-admin/markets' },
          { label: 'Admins', to: '/super-admin/admins' },
          { label: 'Finanzas', to: '/super-admin/finance' },
          { label: 'GDPR', to: '/super-admin/gdpr' },
        ].map(link => (
          <Link
            key={link.to}
            to={link.to}
            className="px-4 py-3 text-sm font-semibold text-center rounded-2xl bg-stone-800/60 text-stone-400 hover:bg-stone-800 hover:text-stone-300 transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
