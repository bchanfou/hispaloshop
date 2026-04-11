import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../services/api/client';
import { Loader2 } from 'lucide-react';

const ACTION_LABELS = {
  verification_approved: 'Verificación aprobada',
  verification_rejected: 'Verificación rechazada',
  product_approve: 'Producto aprobado',
  product_reject: 'Producto rechazado',
  product_hide: 'Producto ocultado',
  user_suspended: 'Usuario suspendido',
  user_unsuspended: 'Usuario reactivado',
  weekly_goal_updated: 'Objetivo semanal actualizado',
  default_shipping_updated: 'Envío por defecto actualizado',
};

export default function CountryAdminAuditLog() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (actionFilter) params.set('action', actionFilter);
      const data = await apiClient.get(`/country-admin/audit-log?${params.toString()}`);
      setItems(data?.items || []);
    } finally {
      setLoading(false);
    }
  }, [actionFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-stone-950 tracking-tight">
          {t('countryAdmin.audit.title', 'Auditoría')}
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          {t('countryAdmin.audit.subtitle', 'Historial transparente de tus acciones de moderación.')}
        </p>
      </header>

      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-4 py-2 rounded-xl border border-stone-200 text-sm bg-white"
        >
          <option value="">{t('countryAdmin.audit.allActions', 'Todas las acciones')}</option>
          {Object.entries(ACTION_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{t(`countryAdmin.audit.actions.${k}`, v)}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-6 h-6 text-stone-400 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-sm text-stone-500">
            {t('countryAdmin.audit.empty', 'Sin entradas de auditoría.')}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">{t('countryAdmin.audit.col.timestamp', 'Fecha')}</th>
                <th className="text-left px-4 py-3">{t('countryAdmin.audit.col.action', 'Acción')}</th>
                <th className="text-left px-4 py-3">{t('countryAdmin.audit.col.target', 'Objetivo')}</th>
                <th className="text-left px-4 py-3">{t('countryAdmin.audit.col.reason', 'Motivo')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {items.map((it) => (
                <tr key={it.log_id} className="hover:bg-stone-50">
                  <td className="px-4 py-3 text-stone-500 text-xs whitespace-nowrap">
                    {new Date(it.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-stone-950">
                    {t(`countryAdmin.audit.actions.${it.action}`, ACTION_LABELS[it.action] || it.action)}
                  </td>
                  <td className="px-4 py-3 text-stone-700 text-xs">
                    <span className="capitalize">{it.target_type}</span> · {String(it.target_id).slice(-8)}
                  </td>
                  <td className="px-4 py-3 text-stone-500 text-xs max-w-xs truncate">
                    {it.reason || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
