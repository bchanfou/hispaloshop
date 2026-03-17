import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Loader2, ArrowRight } from 'lucide-react';
import apiClient from '../../services/api/client';

/* Dark theme uses CSS variables from .superadmin-theme or fallback hardcoded values.
   All colors reference dark-themed tokens. */

const dark = {
  bg: '#0A0A0A',
  card: '#1C1C1E',
  border: 'rgba(255,255,255,0.08)',
  text: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.40)',
  textSubtle: 'rgba(255,255,255,0.30)',
  accent: '#0c0a09',        /* stone-950 black */
  accentBlue: '#a8a29e',
  accentPurple: '#78716c',
  accentAmber: '#57534e',
  hoverBg: 'rgba(255,255,255,0.08)',
  cardHover: 'rgba(255,255,255,0.04)',
};

function SACard({ children, className = '', style = {} }) {
  return (
    <div
      className={className}
      style={{ background: dark.card, borderRadius: '14px', border: `1px solid ${dark.border}`, padding: '16px', ...style }}
    >
      {children}
    </div>
  );
}

function KPICard({ label, value, sub, color = dark.accent }) {
  return (
    <SACard>
      <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: dark.textSubtle }}>{label}</p>
      <p className="text-[26px] font-extrabold tracking-tight leading-none mb-1" style={{ color }}>
        {value}
      </p>
      <p className="text-[11px]" style={{ color: dark.textSubtle }}>{sub}</p>
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
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: dark.textSubtle }} />
      </div>
    );
  }

  if (!data) {
    return (
      <SACard className="text-center py-12">
        <AlertTriangle className="w-8 h-8 mx-auto mb-3" style={{ color: dark.textSubtle }} />
        <h2 className="text-lg font-bold mb-1" style={{ color: dark.text }}>No se pudo cargar el overview</h2>
        <p className="text-sm" style={{ color: dark.textMuted }}>Revisa la conexión con el backend.</p>
      </SACard>
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
    <div className="superadmin-theme max-w-[1000px] mx-auto pb-16" style={{ fontFamily: 'var(--font-sans, Inter, sans-serif)' }}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[26px] font-extrabold tracking-tight mb-1" style={{ color: dark.text }}>Panel Global</h1>
        <p className="text-sm" style={{ color: dark.textMuted }}>{formatDate()}</p>
      </div>

      {/* KPI Grid 2x2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KPICard
          label="MRR"
          value={`${mrr}€`}
          sub={`ARR ~${Math.round(mrr * 12).toLocaleString()}€`}
          color={dark.accent}
        />
        <KPICard
          label="GMV 30d"
          value={`${Math.round(gmvMonth)}€`}
          sub={`${orders.last_30d || 0} pedidos`}
          color={dark.accent}
        />
        <KPICard
          label="Usuarios"
          value={users.total || 0}
          sub={`+${users.new_7d || 0} últimos 7d`}
          color={dark.text}
        />
        <KPICard
          label="Comisiones"
          value={`${Math.round(revenue.platform_commission || 0)}€`}
          sub="Total acumulado"
          color={dark.accent}
        />
      </div>

      {/* Pending actions */}
      <SACard className="mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold" style={{ color: dark.text }}>Acciones pendientes</h3>
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
              className="flex items-center justify-between px-3 py-2.5 transition-colors"
              style={{ borderRadius: '8px', background: dark.cardHover }}
            >
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.60)' }}>{item.label}</span>
              <div className="flex items-center gap-2">
                {item.count > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center" style={{ background: dark.accentPurple, color: '#fff' }}>
                    {item.count}
                  </span>
                )}
                <ArrowRight className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.20)' }} />
              </div>
            </Link>
          ))}
        </div>
      </SACard>

      {/* Countries list — real data from /superadmin/overview */}
      {countries.length > 0 && (
        <SACard className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold" style={{ color: dark.text }}>Paises</h3>
            <Link to="/super-admin/markets" className="text-xs font-semibold" style={{ color: dark.accentPurple }}>
              Gestionar
            </Link>
          </div>
          <div className="space-y-2">
            {countries.map((c, i) => {
              const statusStyles = {
                active: { bg: 'rgba(12,10,9,0.15)', border: dark.accent, color: dark.accent },
                beta: { bg: 'rgba(255,149,0,0.12)', border: dark.accentAmber, color: dark.accentAmber },
                pending: { bg: 'var(--color-surface)', border: 'var(--color-red)', color: 'var(--color-red)' },
              };
              const s = statusStyles[c.status] || statusStyles.pending;
              return (
                <div key={c.code || i} className="flex items-center justify-between py-2" style={{ borderBottom: `1px solid ${dark.border}` }}>
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{c.flag || '\uD83C\uDF10'}</span>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: dark.text }}>{c.name}</p>
                      <p className="text-xs" style={{ color: dark.textMuted }}>{c.producers || 0} productores · {c.users || 0} usuarios</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>
                      {c.status}
                    </span>
                    {!c.admin && (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: 'var(--color-surface)', color: 'var(--color-red)' }}>
                        Sin admin
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </SACard>
      )}

      {/* Plan distribution */}
      <SACard className="mb-5">
        <h3 className="text-sm font-bold mb-3" style={{ color: dark.text }}>Distribución de planes</h3>
        <div className="space-y-3">
          {[
            { label: 'FREE', count: planDist.FREE || 0, color: 'rgba(255,255,255,0.30)' },
            { label: 'PRO', count: planDist.PRO || 0, color: dark.accent },
            { label: 'ELITE', count: planDist.ELITE || 0, color: dark.accentAmber },
          ].map(p => (
            <div key={p.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold" style={{ color: dark.text }}>{p.label}</span>
                <span className="text-xs" style={{ color: dark.textMuted }}>{p.count}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: dark.cardHover }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${(p.count / planTotal) * 100}%`, background: p.color }} />
              </div>
            </div>
          ))}
        </div>
      </SACard>

      {/* GDPR Alerts */}
      {gdprAlerts.length > 0 && (
        <SACard className="mb-5" style={{ border: `1px solid #FF3B30` }}>
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: dark.text }}>
            <span>\u26A0\uFE0F</span> Alertas GDPR
          </h3>
          <div className="space-y-2">
            {gdprAlerts.map((alert, i) => (
              <div key={i} className="flex items-start gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.60)' }}>
                <span>\u26A0\uFE0F</span>
                <p>{alert.message || alert}</p>
              </div>
            ))}
          </div>
        </SACard>
      )}

      {/* Users by role + Visits side by side */}
      <div className="grid md:grid-cols-2 gap-4 mb-5">
        <SACard>
          <h3 className="text-sm font-bold mb-3" style={{ color: dark.text }}>Usuarios por rol</h3>
          <div className="space-y-2">
            {Object.entries(users.by_role || {}).map(([role, count]) => (
              <div key={role} className="flex items-center justify-between py-1.5" style={{ borderBottom: `1px solid ${dark.border}` }}>
                <span className="text-xs capitalize" style={{ color: 'rgba(255,255,255,0.50)' }}>{role.replace('_', ' ')}</span>
                <span className="text-sm font-bold" style={{ color: dark.text }}>{count}</span>
              </div>
            ))}
          </div>
        </SACard>

        <SACard>
          <h3 className="text-sm font-bold mb-3" style={{ color: dark.text }}>Visitas</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="rounded-xl p-3 text-center" style={{ background: dark.cardHover }}>
              <p className="text-xl font-extrabold" style={{ color: dark.accent }}>{visits.total || 0}</p>
              <p className="text-[10px]" style={{ color: dark.textSubtle }}>Total</p>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: dark.cardHover }}>
              <p className="text-xl font-extrabold" style={{ color: dark.accent }}>{visits.last_7d || 0}</p>
              <p className="text-[10px]" style={{ color: dark.textSubtle }}>Últimos 7d</p>
            </div>
          </div>
          {(visits.by_country || []).slice(0, 5).map((v, i) => (
            <div key={i} className="flex items-center justify-between py-1" style={{ borderBottom: `1px solid ${dark.border}` }}>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.50)' }}>{v.country || 'Desconocido'}</span>
              <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.70)' }}>{v.count}</span>
            </div>
          ))}
        </SACard>
      </div>

      {/* Top sellers */}
      {(data?.top_sellers || []).length > 0 && (
        <SACard className="mb-5">
          <h3 className="text-sm font-bold mb-3" style={{ color: dark.text }}>Top vendedores (30d)</h3>
          {data.top_sellers.map((seller, i) => (
            <div
              key={seller.seller_id || i}
              className="flex items-center justify-between py-2.5"
              style={{ borderBottom: i < data.top_sellers.length - 1 ? `1px solid ${dark.border}` : 'none' }}
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold w-5" style={{ color: dark.textSubtle }}>{i + 1}</span>
                <span className="text-sm font-semibold" style={{ color: dark.text }}>{seller.name}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold" style={{ color: dark.accent }}>{seller.revenue?.toFixed(0)}€</span>
                <span className="text-[10px] ml-2" style={{ color: dark.textSubtle }}>{seller.orders} pedidos</span>
              </div>
            </div>
          ))}
        </SACard>
      )}

      {/* Recent activity */}
      <SACard>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold" style={{ color: dark.text }}>Actividad reciente</h3>
          <Link to="/super-admin/finance" className="text-xs font-semibold hover:underline" style={{ color: dark.accentPurple }}>
            Ver todo
          </Link>
        </div>
        {(data?.recent_orders || []).slice(0, 5).map((order, i) => (
          <div
            key={order.order_id || i}
            className="flex items-center justify-between py-2.5"
            style={{ borderBottom: i < Math.min((data?.recent_orders || []).length, 5) - 1 ? `1px solid ${dark.border}` : 'none' }}
          >
            <div>
              <p className="text-sm font-semibold" style={{ color: dark.text }}>#{(order.order_id || '').slice(-8)}</p>
              <p className="text-[11px]" style={{ color: dark.textMuted }}>{order.user_name || 'Usuario'}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold" style={{ color: dark.text }}>{Number(order.total_amount || 0).toFixed(2)}€</p>
              <p className="text-[11px] capitalize" style={{ color: dark.textMuted }}>{order.status}</p>
            </div>
          </div>
        ))}
        {(data?.recent_orders || []).length === 0 && (
          <p className="text-sm py-4 text-center" style={{ color: dark.textSubtle }}>Sin actividad reciente</p>
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
            className="px-4 py-3 text-sm font-semibold text-center transition-colors"
            style={{ background: dark.cardHover, borderRadius: 'var(--radius-xl)', color: 'rgba(255,255,255,0.60)' }}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
