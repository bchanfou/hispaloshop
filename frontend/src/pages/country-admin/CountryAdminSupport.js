import React, { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../services/api/client';
import { Loader2, Search, AlertTriangle } from 'lucide-react';

const STATUSES = ['', 'awaiting_admin', 'in_progress', 'awaiting_user', 'escalated', 'resolved', 'closed'];

const PRIORITY_BADGE = {
  critical: 'bg-stone-950 text-white',
  high: 'bg-stone-700 text-white',
  normal: 'bg-stone-200 text-stone-700',
  low: 'bg-stone-100 text-stone-600',
};

function slaIndicator(ticket) {
  // Stone palette: filled = OK, ringed = at risk, solid black = breach.
  if (ticket.first_response_at) return { color: 'bg-stone-400', label: 'OK' };
  if (!ticket.sla_first_response_due) return { color: 'bg-stone-200', label: '—' };
  const due = new Date(ticket.sla_first_response_due);
  const now = new Date();
  const diffMin = (due - now) / 60000;
  if (diffMin < 0) return { color: 'bg-stone-950 ring-2 ring-stone-300', label: 'breach' };
  if (diffMin < 60) return { color: 'bg-stone-700 ring-2 ring-stone-200', label: 'risk' };
  return { color: 'bg-stone-400', label: 'OK' };
}

export default function CountryAdminSupport() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') || 'awaiting_admin';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState('');
  const [category, setCategory] = useState('');
  const [metrics, setMetrics] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (status) params.set('status', status);
      if (priority) params.set('priority', priority);
      if (category) params.set('category', category);
      if (search) params.set('search', search);
      const data = await apiClient.get(`/country-admin/support/tickets?${params.toString()}`);
      setItems(data?.items || []);
    } finally {
      setLoading(false);
    }
  }, [status, priority, category, search]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    apiClient.get('/country-admin/support/metrics?period=30d').then(setMetrics).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-stone-950 tracking-tight">{t('countryAdmin.support.title', 'Soporte')}</h1>
        <p className="text-sm text-stone-500 mt-1">{t('countryAdmin.support.subtitle', 'Tickets de tu país.')}</p>
      </header>

      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white border border-stone-200 rounded-2xl p-4">
            <p className="text-xs text-stone-500">{t('countryAdmin.support.openCount', 'Abiertos (30d)')}</p>
            <p className="text-2xl font-semibold text-stone-950">{metrics.open_count}</p>
          </div>
          <div className="bg-white border border-stone-200 rounded-2xl p-4">
            <p className="text-xs text-stone-500">{t('countryAdmin.support.slaAtRisk', 'SLA en riesgo')}</p>
            <p className="text-2xl font-semibold text-stone-950">{metrics.sla_at_risk}</p>
          </div>
          <div className="bg-white border border-stone-200 rounded-2xl p-4">
            <p className="text-xs text-stone-500">{t('countryAdmin.support.avgResponse', 'Avg primera resp.')}</p>
            <p className="text-2xl font-semibold text-stone-950">{metrics.avg_first_response_minutes ?? '—'}<span className="text-sm font-normal text-stone-500"> min</span></p>
          </div>
          <div className="bg-white border border-stone-200 rounded-2xl p-4">
            <p className="text-xs text-stone-500">CSAT</p>
            <p className="text-2xl font-semibold text-stone-950">{metrics.csat_avg ?? '—'}<span className="text-sm font-normal text-stone-500"> / 5</span></p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {STATUSES.map((s) => (
          <button
            key={s || 'all'}
            onClick={() => setSearchParams(s ? { status: s } : {})}
            className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
              status === s ? 'bg-stone-950 text-white' : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
            }`}
          >
            {s ? t(`support.status.${s}`, s.replace('_', ' ')) : t('common.all', 'Todos')}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" strokeWidth={1.5} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('common.search', 'Buscar por subject o número...')}
            className="w-full pl-10 pr-3 py-2 rounded-xl border border-stone-200 text-sm bg-white"
          />
        </div>
        <select value={priority} onChange={(e) => setPriority(e.target.value)} className="px-3 py-2 rounded-xl border border-stone-200 text-sm bg-white">
          <option value="">{t('countryAdmin.support.allPriorities', 'Todas las prioridades')}</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="normal">Normal</option>
          <option value="low">Low</option>
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-3 py-2 rounded-xl border border-stone-200 text-sm bg-white">
          <option value="">{t('countryAdmin.support.allCategories', 'Todas las categorías')}</option>
          <option value="order_issue">Order issue</option>
          <option value="payment_issue">Payment issue</option>
          <option value="account_issue">Account issue</option>
          <option value="fiscal_issue">Fiscal issue</option>
          <option value="b2b_operation">B2B operation</option>
          <option value="bug_report">Bug report</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 text-stone-400 animate-spin" /></div>
        ) : items.length === 0 ? (
          <p className="p-12 text-center text-sm text-stone-500">{t('countryAdmin.support.empty', 'No hay tickets en este estado.')}</p>
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden md:table w-full text-sm">
              <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3">SLA</th>
                  <th className="text-left px-4 py-3">Ticket</th>
                  <th className="text-left px-4 py-3">{t('countryAdmin.support.user', 'Usuario')}</th>
                  <th className="text-left px-4 py-3">{t('countryAdmin.support.priority', 'Prioridad')}</th>
                  <th className="text-left px-4 py-3">{t('countryAdmin.support.lastUpdate', 'Última actividad')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {items.map((it) => {
                  const ind = slaIndicator(it);
                  return (
                    <tr key={it.ticket_id} className="hover:bg-stone-50">
                      <td className="px-4 py-3">
                        <span className={`inline-block w-2 h-2 rounded-full ${ind.color}`} title={ind.label} />
                      </td>
                      <td className="px-4 py-3">
                        <Link to={`/country-admin/support/${it.ticket_id}`} className="block">
                          <p className="text-xs text-stone-400 font-mono">{it.ticket_number}</p>
                          <p className="font-medium text-stone-950 truncate max-w-md">{it.subject}</p>
                          <p className="text-xs text-stone-500">{t(`support.cat.${it.category}`, it.category)}</p>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-stone-700 text-xs">{it.user_role}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${PRIORITY_BADGE[it.priority] || 'bg-stone-100 text-stone-700'}`}>
                          {it.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-stone-500 text-xs">{new Date(it.updated_at).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile cards */}
            <ul className="md:hidden divide-y divide-stone-100">
              {items.map((it) => {
                const ind = slaIndicator(it);
                return (
                  <li key={it.ticket_id}>
                    <Link to={`/country-admin/support/${it.ticket_id}`} className="block p-4 active:bg-stone-50">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`inline-block w-2 h-2 rounded-full ${ind.color}`} title={ind.label} />
                          <span className="text-xs text-stone-400 font-mono">{it.ticket_number}</span>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${PRIORITY_BADGE[it.priority] || 'bg-stone-100 text-stone-700'}`}>
                          {it.priority}
                        </span>
                      </div>
                      <p className="font-medium text-stone-950 text-sm">{it.subject}</p>
                      <p className="text-xs text-stone-500 mt-1">
                        {t(`support.cat.${it.category}`, it.category)} · {it.user_role} · {new Date(it.updated_at).toLocaleString()}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
