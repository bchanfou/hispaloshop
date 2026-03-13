import React, { useEffect, useMemo, useState } from 'react';
import apiClient from '../../services/api/client';
import { Link } from 'react-router-dom';
import { Activity, AlertTriangle, BarChart3, FileCheck, Loader2, Shield, Users } from 'lucide-react';
import { toast } from 'sonner';

function MetricCard({ icon: Icon, title, value, description, to }) {
  return (
    <Link to={to} className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-stone-500">{title}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-stone-950">{value}</p>
          <p className="mt-2 text-sm text-stone-500">{description}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-100 text-stone-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Link>
  );
}

export default function SuperAdminOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = async () => {
    try {
      setError(false);
      const data = await apiClient.get('/superadmin/overview');
      setData(data || null);
    } catch {
      setData(null);
      setError(true);
      toast.error('Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const pendingTotal = useMemo(() => {
    if (!data?.pending) return 0;
    return (data.pending.sellers || 0) + (data.pending.products || 0) + (data.pending.certificates || 0) + (data.pending.flagged_posts || 0);
  }, [data]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-stone-500" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-stone-400" />
        <h2 className="mt-4 text-2xl font-semibold text-stone-950">No se pudo cargar el overview</h2>
        <p className="mt-2 text-sm text-stone-500">Revisa la conexión con el backend e inténtalo de nuevo.</p>
        <button className="mt-5 px-4 py-2 border border-stone-200 text-stone-600 rounded-lg hover:bg-stone-50 transition-colors" onClick={() => { setLoading(true); fetchData(); }}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="ds-page">
      <div className="ds-shell">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight text-stone-950">Superadmin overview</h1>
          <p className="mt-2 text-sm text-stone-500">Métricas del sistema, moderación, logs operativos y analítica de plataforma en una sola lectura.</p>
        </header>

        <section className="ds-section ds-grid-4">
          <MetricCard icon={Activity} title="System metrics" value={data?.orders?.total || 0} description="Pedidos registrados" to="/super-admin/insights" />
          <MetricCard icon={Shield} title="Moderation tools" value={pendingTotal} description="Elementos por revisar" to="/super-admin/content" />
          <MetricCard icon={FileCheck} title="Logs" value={data?.recent_orders?.length || 0} description="Actividad reciente visible" to="/super-admin/escalation" />
          <MetricCard icon={BarChart3} title="Platform analytics" value={data?.users?.total || 0} description="Usuarios totales" to="/super-admin/analytics" />
        </section>

        <section className="ds-section grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-stone-950">Moderación prioritaria</h2>
            <div className="mt-5 space-y-3">
              <Link to="/super-admin/users" className="flex items-center justify-between rounded-2xl border border-stone-100 bg-stone-50 p-4 text-sm text-stone-700 transition-all duration-200 hover:shadow-sm">
                <span>Vendedores pendientes</span>
                <span>{data?.pending?.sellers || 0}</span>
              </Link>
              <Link to="/super-admin/content" className="flex items-center justify-between rounded-2xl border border-stone-100 bg-stone-50 p-4 text-sm text-stone-700 transition-all duration-200 hover:shadow-sm">
                <span>Productos pendientes</span>
                <span>{data?.pending?.products || 0}</span>
              </Link>
              <Link to="/super-admin/content" className="flex items-center justify-between rounded-2xl border border-stone-100 bg-stone-50 p-4 text-sm text-stone-700 transition-all duration-200 hover:shadow-sm">
                <span>Contenido reportado</span>
                <span>{data?.pending?.flagged_posts || 0}</span>
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-stone-950">Actividad reciente</h2>
            <div className="mt-5 space-y-3">
              {(data?.recent_orders || []).slice(0, 4).map((order) => (
                <div key={order.order_id} className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-stone-950">#{(order.order_id || '').slice(-8)}</p>
                      <p className="mt-1 text-xs text-stone-500">{order.user_name || 'Usuario'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-stone-950">€{Number(order.total_amount || 0).toFixed(2)}</p>
                      <p className="mt-1 text-xs capitalize text-stone-500">{order.status}</p>
                    </div>
                  </div>
                </div>
              ))}
              {(data?.recent_orders || []).length === 0 ? <p className="text-sm text-stone-500">No hay actividad reciente visible.</p> : null}
            </div>
          </div>
        </section>

        <section className="ds-section rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-stone-950">Usuarios por rol</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(data?.users?.by_role || {}).map(([role, count]) => (
              <div key={role} className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
                <p className="text-sm capitalize text-stone-500">{role.replace('_', ' ')}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">{count}</p>
              </div>
            ))}
            {Object.keys(data?.users?.by_role || {}).length === 0 ? (
              <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
                <p className="text-sm text-stone-500">Sin datos de roles disponibles.</p>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
