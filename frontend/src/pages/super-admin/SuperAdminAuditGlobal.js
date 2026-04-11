import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../services/api/client';
import { SACard, SAPageHeader, SAInput, SASelect, SeverityBadge } from '../../components/super-admin/SAUI';
import { Loader2 } from 'lucide-react';

export default function SuperAdminAuditGlobal() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ country_code: '', admin_id: '', action: '', severity: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '200' });
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const data = await apiClient.get(`/super-admin/audit-log/global?${params.toString()}`);
      setItems(data?.items || []);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <SAPageHeader
        title={t('superAdmin.audit.title', 'Auditoría global')}
        subtitle={t('superAdmin.audit.subtitle', 'Acciones de country admins y super admins unificadas.')}
      />

      <SACard className="p-4 flex flex-wrap items-center gap-2">
        <SAInput value={filters.country_code} onChange={(v) => setFilters({ ...filters, country_code: v })} placeholder="País" className="w-32" />
        <SAInput value={filters.admin_id} onChange={(v) => setFilters({ ...filters, admin_id: v })} placeholder="Admin ID" className="w-44" />
        <SAInput value={filters.action} onChange={(v) => setFilters({ ...filters, action: v })} placeholder="Action" className="w-44" />
        <SASelect value={filters.severity} onChange={(v) => setFilters({ ...filters, severity: v })} options={[
          { value: '', label: t('superAdmin.audit.allSeverity', 'Todas las severidades') },
          { value: 'info', label: 'info' },
          { value: 'warning', label: 'warning' },
          { value: 'critical', label: 'critical' },
        ]} />
      </SACard>

      <SACard className="overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 text-white/40 animate-spin" /></div>
        ) : items.length === 0 ? (
          <p className="p-12 text-center text-sm text-white/40">{t('superAdmin.audit.empty', 'Sin resultados')}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-white/50 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">{t('common.date', 'Fecha')}</th>
                <th className="text-left px-4 py-3">{t('common.source', 'Origen')}</th>
                <th className="text-left px-4 py-3">{t('common.country', 'País')}</th>
                <th className="text-left px-4 py-3">Admin</th>
                <th className="text-left px-4 py-3">Action</th>
                <th className="text-left px-4 py-3">Target</th>
                <th className="text-left px-4 py-3">{t('common.severity', 'Severidad')}</th>
                <th className="text-left px-4 py-3">{t('common.reason', 'Motivo')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {items.map((it) => (
                <tr key={it.log_id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-2 text-white/60 text-xs whitespace-nowrap">{new Date(it.timestamp).toLocaleString()}</td>
                  <td className="px-4 py-2 text-white/60 text-xs">{it.source}</td>
                  <td className="px-4 py-2 text-white/80">{it.country_code || '—'}</td>
                  <td className="px-4 py-2 text-white/60 text-xs">{(it.admin_user_id || '').slice(-8)}</td>
                  <td className="px-4 py-2 text-white">{it.action}</td>
                  <td className="px-4 py-2 text-white/60 text-xs">{it.target_type}:{String(it.target_id || '').slice(-8)}</td>
                  <td className="px-4 py-2"><SeverityBadge severity={it.severity || 'info'} /></td>
                  <td className="px-4 py-2 text-white/60 text-xs max-w-xs truncate">{it.reason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SACard>
    </div>
  );
}
