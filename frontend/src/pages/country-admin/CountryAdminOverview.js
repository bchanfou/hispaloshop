import React, { useEffect, useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TrendingUp, Users, ShieldCheck, RotateCcw, Clock, AlertTriangle, Headphones, Flag, Sparkles, Timer } from 'lucide-react';
import { apiClient } from '../../services/api/client';

function KpiCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-2xl bg-stone-100 flex items-center justify-center">
          <Icon className="w-5 h-5 text-stone-700" strokeWidth={1.5} />
        </div>
      </div>
      <p className="text-2xl font-semibold text-stone-950">{value}</p>
      <p className="text-xs text-stone-500 mt-1">{label}</p>
      {sub && <p className="text-xs text-stone-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function CountryAdminOverview() {
  const { t } = useTranslation();
  const { overview } = useOutletContext() || {};
  const [supportMetrics, setSupportMetrics] = useState(null);
  const [modMetrics, setModMetrics] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, m] = await Promise.all([
          apiClient.get('/country-admin/support/metrics?period=30d').catch(() => null),
          apiClient.get('/country-admin/moderation/metrics?period=30d').catch(() => null),
        ]);
        if (cancelled) return;
        setSupportMetrics(s);
        setModMetrics(m);
      } catch {
        /* tolerate failures — overview KPIs are still shown */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!overview) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-stone-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  const k = overview.kpis || {};
  const goal = overview.weekly_goal || {};
  const actions = overview.action_items || {};
  const currency = overview.currency || 'EUR';

  const fmt = (v) => new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(v || 0);
  const fmtPct = (v) => v == null ? '—' : `${v}%`;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-stone-950 tracking-tight">
          {t('countryAdmin.overview.title', 'Inicio')}
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          {t('countryAdmin.overview.subtitle', 'Salud del marketplace local en un vistazo.')}
        </p>
      </header>

      {/* Marketplace KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={TrendingUp}
          label={t('countryAdmin.kpi.gmvMonth', 'GMV mes')}
          value={fmt(k.gmv_month_local)}
          sub={k.gmv_month_usd ? `≈ $${k.gmv_month_usd.toLocaleString()}` : null}
        />
        <KpiCard
          icon={Users}
          label={t('countryAdmin.kpi.activeSellers', 'Sellers activos')}
          value={k.active_sellers ?? 0}
        />
        <KpiCard
          icon={ShieldCheck}
          label={t('countryAdmin.kpi.pendingVerifications', 'Verificaciones pendientes')}
          value={k.pending_verifications ?? 0}
        />
        <KpiCard
          icon={RotateCcw}
          label={t('countryAdmin.kpi.refundRate', 'Refund rate')}
          value={fmtPct(k.refund_rate_pct)}
        />
      </div>

      {/* Operations KPI cards (F-4 + reports/auto-flagged) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={Headphones}
          label={t('countryAdmin.kpi.openTickets', 'Tickets abiertos')}
          value={supportMetrics?.open_count ?? '—'}
        />
        <KpiCard
          icon={Timer}
          label={t('countryAdmin.kpi.slaAtRisk', 'SLA en riesgo')}
          value={supportMetrics?.sla_at_risk ?? '—'}
        />
        <KpiCard
          icon={Flag}
          label={t('countryAdmin.kpi.pendingReports', 'Reports pendientes')}
          value={modMetrics?.pending ?? '—'}
        />
        <KpiCard
          icon={Sparkles}
          label={t('countryAdmin.kpi.aiFlagged', 'Auto-flagged sin revisar')}
          value={modMetrics?.auto_flagged ?? '—'}
        />
      </div>

      {/* Weekly goal */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-stone-950">
            {t('countryAdmin.weeklyGoal', 'Objetivo semanal')}
          </h2>
          <p className="text-sm text-stone-500">
            {goal.goal_cents ? fmt(goal.goal_cents / 100) : t('countryAdmin.noGoal', 'Sin objetivo')}
          </p>
        </div>
        <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-stone-950 transition-all"
            style={{ width: `${Math.min(100, goal.progress_pct || 0)}%` }}
          />
        </div>
        <p className="text-xs text-stone-500 mt-2">
          {goal.current_cents ? fmt(goal.current_cents / 100) : '—'}
          {goal.progress_pct != null && ` · ${goal.progress_pct}%`}
        </p>
      </div>

      {/* Action items */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <h2 className="text-base font-semibold text-stone-950 mb-4">
          {t('countryAdmin.actionItems', 'Acciones requeridas hoy')}
        </h2>
        <div className="space-y-3">
          {actions.overdue_verifications > 0 && (
            <Link to="/country-admin/verifications" className="flex items-center justify-between p-4 bg-stone-50 rounded-xl hover:bg-stone-100 transition-colors">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-stone-700" strokeWidth={1.5} />
                <span className="text-sm text-stone-950">
                  {t('countryAdmin.overdueVerifications', '{{n}} verificaciones pendientes >24h', { n: actions.overdue_verifications })}
                </span>
              </div>
              <span className="text-xs text-stone-500">{t('common.review', 'Revisar')}</span>
            </Link>
          )}
          {actions.reported_products > 0 && (
            <Link to="/country-admin/products?status=reported" className="flex items-center justify-between p-4 bg-stone-50 rounded-xl hover:bg-stone-100 transition-colors">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-stone-700" strokeWidth={1.5} />
                <span className="text-sm text-stone-950">
                  {t('countryAdmin.reportedProducts', '{{n}} productos reportados', { n: actions.reported_products })}
                </span>
              </div>
              <span className="text-xs text-stone-500">{t('common.review', 'Revisar')}</span>
            </Link>
          )}
          {actions.open_tickets > 0 && (
            <Link to="/country-admin/support" className="flex items-center justify-between p-4 bg-stone-50 rounded-xl hover:bg-stone-100 transition-colors">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-stone-700" strokeWidth={1.5} />
                <span className="text-sm text-stone-950">
                  {t('countryAdmin.openTickets', '{{n}} tickets de soporte abiertos', { n: actions.open_tickets })}
                </span>
              </div>
              <span className="text-xs text-stone-500">{t('common.review', 'Revisar')}</span>
            </Link>
          )}
          {!actions.overdue_verifications && !actions.reported_products && !actions.open_tickets && (
            <p className="text-sm text-stone-500 text-center py-6">
              {t('countryAdmin.allClear', 'Todo bajo control. Sin acciones urgentes.')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
