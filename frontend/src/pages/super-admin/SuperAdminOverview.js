import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
  Users, DollarSign, ShoppingBag, Package, AlertTriangle,
  TrendingUp, Clock, Shield, Loader2, ChevronRight, Star,
  UserCheck, FileCheck, Flag, RefreshCw, CheckCircle, Globe
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { API } from '../../utils/api';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function KPICard({ icon: Icon, label, value, sub, color = 'slate', href, badge }) {
  const colors = {
    slate: 'bg-slate-50 text-slate-600 border-slate-200',
    green: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    red: 'bg-red-50 text-red-600 border-red-200',
  };
  const cls = colors[color] || colors.slate;
  const Wrapper = href ? Link : 'div';
  return (
    <Wrapper to={href} className={`bg-white rounded-xl border p-4 hover:shadow-sm transition-all ${cls.split(' ').pop()} ${href ? 'cursor-pointer' : ''}`} data-testid={`kpi-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`p-1.5 rounded-lg ${cls.split(' ').slice(0, 2).join(' ')}`}>
          <Icon className="w-4 h-4" />
        </div>
        {badge > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{badge}</span>}
      </div>
      <p className="text-2xl font-bold text-text-primary">{value}</p>
      <p className="text-xs text-text-muted mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-text-muted mt-1">{sub}</p>}
    </Wrapper>
  );
}

function QuickAction({ label, count, href, icon: Icon }) {
  return (
    <Link to={href} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-stone-200 hover:border-purple-300 hover:shadow-sm transition-all" data-testid={`action-${label.slice(0, 10)}`}>
      <Icon className="w-4 h-4 text-purple-500 shrink-0" />
      <span className="text-sm text-text-primary flex-1">{label}</span>
      {count > 0 && <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">{count}</span>}
      <ChevronRight className="w-4 h-4 text-text-muted" />
    </Link>
  );
}

export default function SuperAdminOverview() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = async () => {
    try {
      setError(false);
      const res = await axios.get(`${API}/superadmin/overview`, { withCredentials: true });
      setData(res.data);
    } catch (err) {
      setData(null);
      setError(true);
      toast.error('Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!data) {
    return (
      <div className="bg-white rounded-xl border border-stone-200 p-6 text-center">
        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-text-primary mb-1">
          {error ? 'No se pudo cargar el overview' : 'Sin datos disponibles'}
        </h2>
        <p className="text-sm text-text-muted mb-4">
          {error ? 'Revisa la conexión con el backend e inténtalo de nuevo.' : 'No hay métricas para mostrar todavía.'}
        </p>
        <Button variant="outline" size="sm" onClick={() => { setLoading(true); fetchData(); }}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Reintentar
        </Button>
      </div>
    );
  }

  const { users, revenue, orders, pending, visits, top_sellers, recent_orders, recent_users } = data;
  const totalPending = pending.sellers + pending.products + pending.certificates + pending.flagged_posts;

  return (
    <div className="space-y-5" data-testid="superadmin-overview">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-purple-500" />
            <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Modo SuperAdmin</span>
          </div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-text-primary">Overview</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={() => { setLoading(true); fetchData(); }}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* === SEMAPHORE — Platform Status at a Glance === */}
      <div className="grid grid-cols-3 gap-3" data-testid="semaphore">
        <div className={`rounded-2xl p-5 text-center transition-all ${totalPending === 0 ? 'bg-emerald-50 border-2 border-emerald-200' : 'bg-emerald-50 border border-emerald-200'}`}>
          <div className={`w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center ${totalPending === 0 ? 'bg-emerald-500' : 'bg-emerald-200'}`}>
            <CheckCircle className="w-5 h-5 text-white" />
          </div>
          <p className="text-sm font-semibold text-emerald-700">{orders.total} pedidos</p>
          <p className="text-[10px] text-emerald-600">{revenue.total.toLocaleString()}€ revenue</p>
        </div>
        <Link to="/super-admin/users" className={`rounded-2xl p-5 text-center transition-all hover:scale-[1.02] ${pending.sellers > 0 ? 'bg-amber-50 border-2 border-amber-300' : 'bg-stone-50 border border-stone-200'}`}>
          <div className={`w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center ${pending.sellers > 0 ? 'bg-amber-500' : 'bg-stone-300'}`}>
            <UserCheck className="w-5 h-5 text-white" />
          </div>
          <p className="text-sm font-semibold">{pending.sellers > 0 ? `${pending.sellers} pendientes` : 'Todo OK'}</p>
          <p className="text-[10px] text-text-muted">Productores/Importadores</p>
        </Link>
        <Link to="/super-admin/content" className={`rounded-2xl p-5 text-center transition-all hover:scale-[1.02] ${pending.flagged_posts > 0 ? 'bg-red-50 border-2 border-red-300' : pending.products > 0 ? 'bg-amber-50 border-2 border-amber-300' : 'bg-stone-50 border border-stone-200'}`}>
          <div className={`w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center ${pending.flagged_posts > 0 ? 'bg-red-500' : pending.products > 0 ? 'bg-amber-500' : 'bg-stone-300'}`}>
            <Flag className="w-5 h-5 text-white" />
          </div>
          <p className="text-sm font-semibold">{pending.flagged_posts > 0 ? `${pending.flagged_posts} reportados` : pending.products > 0 ? `${pending.products} por revisar` : 'Todo OK'}</p>
          <p className="text-[10px] text-text-muted">Contenido</p>
        </Link>
      </div>

      {/* Pending Actions */}
      {totalPending > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" data-testid="pending-actions">
          {pending.sellers > 0 && <QuickAction label={t('superAdmin.approveSellers')} count={pending.sellers} href="/super-admin/users" icon={UserCheck} />}
          {pending.products > 0 && <QuickAction label={t('superAdmin.reviewProducts')} count={pending.products} href="/super-admin/content" icon={Package} />}
          {pending.certificates > 0 && <QuickAction label={t('superAdmin.pendingCertificates')} count={pending.certificates} href="/super-admin/content" icon={FileCheck} />}
          {pending.flagged_posts > 0 && <QuickAction label={t('superAdmin.reportedContent')} count={pending.flagged_posts} href="/super-admin/content" icon={Flag} />}
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard icon={Users} label={t('superAdmin.totalUsers')} value={users.total} sub={`+${users.new_7d} ${t('superAdmin.thisWeek', { count: users.new_7d }).replace(`+${users.new_7d} `, '')}`} color="blue" href="/super-admin/users" />
        <KPICard icon={DollarSign} label={t('superAdmin.totalRevenue')} value={`${revenue.total.toLocaleString()}€`} sub={`${revenue.last_30d.toLocaleString()}€`} color="green" href="/super-admin/finance" />
        <KPICard icon={ShoppingBag} label={t('superAdmin.totalOrders')} value={orders.total} sub={`${orders.last_30d}`} color="purple" />
        <KPICard icon={TrendingUp} label={t('superAdmin.platformCommission')} value={`${revenue.platform_commission.toLocaleString()}€`} color="amber" href="/super-admin/finance" />
      </div>

      {/* Visits Stats */}
      {visits && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-stone-200 p-5">
            <h2 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4 text-text-muted" /> Visits by country
            </h2>
            <div className="flex items-center gap-2 mb-3 text-xs text-text-muted">
              <span>{visits.total?.toLocaleString()} total</span>
              <span>·</span>
              <span>{visits.last_7d?.toLocaleString()} last 7 days</span>
            </div>
            <div className="space-y-2">
              {(visits.by_country || []).map(v => {
                const pct = visits.total > 0 ? (v.count / visits.total * 100) : 0;
                return (
                  <div key={v.country} className="flex items-center gap-2">
                    <span className="text-xs font-medium text-text-primary w-16">{v.country}</span>
                    <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-text-muted w-12 text-right">{v.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-stone-200 p-5">
            <h2 className="text-sm font-medium text-text-primary mb-3">Daily visits (7d)</h2>
            {visits.daily?.length > 0 ? (
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={visits.daily}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                    <Bar dataKey="count" name={t('admin.visits')} fill="#2D5A27" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="text-sm text-text-muted text-center py-8">No visit data</p>}
          </div>
        </div>
      )}

      {/* Users breakdown + Top sellers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Users by role */}
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h2 className="text-sm font-medium text-text-primary mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-text-muted" /> Usuarios por rol
          </h2>
          <div className="space-y-2">
            {Object.entries(users.by_role).map(([role, count]) => (
              <div key={role} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${role === 'super_admin' ? 'bg-purple-500' : role === 'admin' ? 'bg-blue-500' : role === 'producer' ? 'bg-emerald-500' : role === 'influencer' ? 'bg-amber-500' : 'bg-stone-400'}`} />
                  <span className="text-sm text-text-secondary capitalize">{role.replace('_', ' ')}</span>
                </div>
                <span className="text-sm font-semibold text-text-primary">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top sellers */}
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h2 className="text-sm font-medium text-text-primary mb-4 flex items-center gap-2">
            <Star className="w-4 h-4 text-text-muted" /> Top productores (30d)
          </h2>
          {top_sellers.length > 0 ? (
            <div className="space-y-3">
              {top_sellers.map((s, i) => (
                <div key={s.seller_id} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-text-muted w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{s.name}</p>
                    <p className="text-xs text-text-muted">{s.orders} pedidos</p>
                  </div>
                  <span className="text-sm font-bold text-emerald-600">{s.revenue.toLocaleString()}€</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted text-center py-4">Sin datos de ventas</p>
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-100">
            <h2 className="text-sm font-medium text-text-primary flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-text-muted" /> Pedidos recientes
            </h2>
          </div>
          <div className="divide-y divide-stone-100">
            {(recent_orders || []).map(o => (
              <div key={o.order_id} className="px-4 py-2.5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-text-primary">#{(o.order_id || '').slice(-8)}</p>
                  <p className="text-[10px] text-text-muted">{o.user_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-text-primary">{o.total_amount?.toFixed(2)}€</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${o.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-600'}`}>{o.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-100">
            <h2 className="text-sm font-medium text-text-primary flex items-center gap-2">
              <Users className="w-4 h-4 text-text-muted" /> Usuarios recientes
            </h2>
          </div>
          <div className="divide-y divide-stone-100">
            {(recent_users || []).map(u => (
              <div key={u.user_id} className="px-4 py-2.5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-text-primary">{u.name}</p>
                  <p className="text-[10px] text-text-muted">{(u.created_at || '').slice(0, 10)}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${u.role === 'producer' ? 'bg-emerald-100 text-emerald-700' : u.role === 'influencer' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                  {u.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

