import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Loader2, ArrowRight } from 'lucide-react';
import apiClient from '../../services/api/client';

function SACard({ children, className = '' }) {
  return (
    <div className={`bg-[#1C1C1E] rounded-[14px] border border-white/[0.08] p-4 ${className}`}>
      {children}
    </div>
  );
}

function KPICard({ label, value, sub, color = '#34C759' }) {
  return (
    <SACard>
      <p className="text-[11px] font-bold uppercase tracking-widest text-white/30 mb-2">{label}</p>
      <p className="text-[26px] font-extrabold tracking-tight leading-none mb-1" style={{ color }}>
        {value}
      </p>
      <p className="text-[11px] text-white/30">{sub}</p>
    </SACard>
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
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-white/30" />
      </div>
    );
  }

  if (!data) {
    return (
      <SACard className="text-center py-12">
        <AlertTriangle className="w-8 h-8 text-white/30 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white mb-1">No se pudo cargar el overview</h2>
        <p className="text-sm text-white/40">Revisa la conexión con el backend.</p>
      </SACard>
    );
  }

  const revenue = data?.revenue || {};
  const users = data?.users || {};
  const orders = data?.orders || {};
  const pending = data?.pending || {};
  const visits = data?.visits || {};

  // Calculate MRR from subscriptions (simplified)
  const mrr = revenue.platform_commission ? Math.round(revenue.platform_commission / 12) : 0;
  const gmvMonth = revenue.last_30d || 0;

  return (
    <div className="max-w-[1000px] mx-auto pb-16">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[26px] font-extrabold tracking-tight text-white mb-1">Panel Global</h1>
        <p className="text-sm text-white/40">{formatDate()}</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KPICard
          label="MRR"
          value={`${mrr}€`}
          sub={`ARR ~${Math.round(mrr * 12).toLocaleString()}€`}
          color="#34C759"
        />
        <KPICard
          label="GMV 30d"
          value={`${Math.round(gmvMonth)}€`}
          sub={`${orders.last_30d || 0} pedidos`}
          color="#007AFF"
        />
        <KPICard
          label="Usuarios"
          value={users.total || 0}
          sub={`+${users.new_7d || 0} últimos 7d`}
          color="#5856D6"
        />
        <KPICard
          label="Comisiones"
          value={`${Math.round(revenue.platform_commission || 0)}€`}
          sub="Total acumulado"
          color="#FF9500"
        />
      </div>

      {/* Pending actions */}
      <SACard className="mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white">Acciones pendientes</h3>
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
              className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
            >
              <span className="text-sm text-white/60">{item.label}</span>
              <div className="flex items-center gap-2">
                {item.count > 0 && (
                  <span className="bg-[#5856D6] text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                    {item.count}
                  </span>
                )}
                <ArrowRight className="w-4 h-4 text-white/20" />
              </div>
            </Link>
          ))}
        </div>
      </SACard>

      {/* Users by role + Visits side by side */}
      <div className="grid md:grid-cols-2 gap-4 mb-5">
        <SACard>
          <h3 className="text-sm font-bold text-white mb-3">Usuarios por rol</h3>
          <div className="space-y-2">
            {Object.entries(users.by_role || {}).map(([role, count]) => (
              <div key={role} className="flex items-center justify-between py-1.5 border-b border-white/[0.06] last:border-0">
                <span className="text-xs text-white/50 capitalize">{role.replace('_', ' ')}</span>
                <span className="text-sm font-bold text-white">{count}</span>
              </div>
            ))}
          </div>
        </SACard>

        <SACard>
          <h3 className="text-sm font-bold text-white mb-3">Visitas</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-white/[0.04] rounded-lg p-3 text-center">
              <p className="text-xl font-extrabold text-[#007AFF]">{visits.total || 0}</p>
              <p className="text-[10px] text-white/30">Total</p>
            </div>
            <div className="bg-white/[0.04] rounded-lg p-3 text-center">
              <p className="text-xl font-extrabold text-[#34C759]">{visits.last_7d || 0}</p>
              <p className="text-[10px] text-white/30">Últimos 7d</p>
            </div>
          </div>
          {(visits.by_country || []).slice(0, 5).map((v, i) => (
            <div key={i} className="flex items-center justify-between py-1 border-b border-white/[0.06] last:border-0">
              <span className="text-xs text-white/50">{v.country || 'Desconocido'}</span>
              <span className="text-xs font-bold text-white/70">{v.count}</span>
            </div>
          ))}
        </SACard>
      </div>

      {/* Top sellers */}
      {(data?.top_sellers || []).length > 0 && (
        <SACard className="mb-5">
          <h3 className="text-sm font-bold text-white mb-3">Top vendedores (30d)</h3>
          {data.top_sellers.map((seller, i) => (
            <div
              key={seller.seller_id || i}
              className={`flex items-center justify-between py-2.5 ${i < data.top_sellers.length - 1 ? 'border-b border-white/[0.06]' : ''}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-white/30 w-5">{i + 1}</span>
                <span className="text-sm font-semibold text-white">{seller.name}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-[#34C759]">{seller.revenue?.toFixed(0)}€</span>
                <span className="text-[10px] text-white/30 ml-2">{seller.orders} pedidos</span>
              </div>
            </div>
          ))}
        </SACard>
      )}

      {/* Recent activity */}
      <SACard>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white">Actividad reciente</h3>
          <Link to="/super-admin/finance" className="text-xs text-[#5856D6] font-semibold hover:underline">
            Ver todo
          </Link>
        </div>
        {(data?.recent_orders || []).slice(0, 5).map((order, i) => (
          <div
            key={order.order_id || i}
            className={`flex items-center justify-between py-2.5 ${i < Math.min((data?.recent_orders || []).length, 5) - 1 ? 'border-b border-white/[0.06]' : ''}`}
          >
            <div>
              <p className="text-sm font-semibold text-white">#{(order.order_id || '').slice(-8)}</p>
              <p className="text-[11px] text-white/35">{order.user_name || 'Usuario'}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-white">{Number(order.total_amount || 0).toFixed(2)}€</p>
              <p className="text-[11px] text-white/35 capitalize">{order.status}</p>
            </div>
          </div>
        ))}
        {(data?.recent_orders || []).length === 0 && (
          <p className="text-sm text-white/30 py-4 text-center">Sin actividad reciente</p>
        )}
      </SACard>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-5">
        {[
          { label: 'Países', to: '/super-admin/markets' },
          { label: 'Admins', to: '/super-admin/admins' },
          { label: 'Finanzas', to: '/super-admin/finance' },
          { label: 'GDPR', to: '/super-admin/gdpr' },
        ].map(link => (
          <Link
            key={link.to}
            to={link.to}
            className="bg-white/[0.04] hover:bg-white/[0.08] rounded-xl px-4 py-3 text-sm font-semibold text-white/60 text-center transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
