import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../services/api/client';
import { Loader2, Plus } from 'lucide-react';

const STATUS_COLORS = {
  open: 'bg-stone-100 text-stone-700',
  awaiting_admin: 'bg-stone-100 text-stone-700',
  awaiting_user: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-stone-100 text-stone-700',
  escalated: 'bg-amber-100 text-amber-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-stone-100 text-stone-500',
  reopened: 'bg-stone-100 text-stone-700',
};

export default function SupportTicketsPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    apiClient.get(`/support/tickets?${params.toString()}`)
      .then((data) => setItems(data?.items || []))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  return (
    <div className="min-h-screen bg-stone-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-stone-950">{t('support.tickets.title', 'Mis tickets')}</h1>
            <p className="text-sm text-stone-500 mt-1">{t('support.tickets.subtitle', 'Historial de tus solicitudes de soporte.')}</p>
          </div>
          <Link
            to="/support/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-950 text-white text-sm hover:bg-stone-800"
          >
            <Plus className="w-4 h-4" />
            {t('support.tickets.new', 'Nuevo ticket')}
          </Link>
        </header>

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {['', 'awaiting_admin', 'in_progress', 'awaiting_user', 'resolved', 'closed'].map((s) => (
            <button
              key={s || 'all'}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                statusFilter === s ? 'bg-stone-950 text-white' : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
              }`}
            >
              {s ? t(`support.status.${s}`, s.replace('_', ' ')) : t('common.all', 'Todos')}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-stone-400 animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
            <p className="text-sm text-stone-500">{t('support.tickets.empty', 'No tienes tickets de soporte todavía.')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((it) => (
              <Link
                key={it.ticket_id}
                to={`/support/tickets/${it.ticket_id}`}
                className="block bg-white rounded-2xl border border-stone-200 p-4 hover:border-stone-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs text-stone-400 font-mono mb-1">{it.ticket_number}</div>
                    <p className="font-medium text-stone-950 truncate">{it.subject}</p>
                    <p className="text-xs text-stone-500 mt-1">
                      {t(`support.cat.${it.category}`, it.category)} · {new Date(it.updated_at).toLocaleString()}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[it.status] || 'bg-stone-100 text-stone-700'}`}>
                    {t(`support.status.${it.status}`, it.status)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
