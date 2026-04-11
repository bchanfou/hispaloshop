import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient, API_BASE_URL } from '../../services/api/client';
import { SACard, SAPageHeader, SAInput, SAButton, SASelect } from '../../components/super-admin/SAUI';
import { Download, Loader2 } from 'lucide-react';

export default function SuperAdminLedger() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ country_code: '', event_type: '', from_date: '', to_date: '' });
  const [offset, setOffset] = useState(0);
  const limit = 100;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const data = await apiClient.get(`/super-admin/ledger/global?${params.toString()}`);
      setItems(data?.items || []);
      setTotal(data?.total || 0);
    } finally {
      setLoading(false);
    }
  }, [filters, offset]);

  useEffect(() => { load(); }, [load]);

  const exportCsv = () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    window.open(`${API_BASE_URL}/super-admin/ledger/global/export?${params.toString()}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <SAPageHeader
        title={t('superAdmin.ledger.title', 'Ledger global')}
        subtitle={t('superAdmin.ledger.subtitle', 'Movimientos financieros de toda la plataforma.')}
        right={<SAButton variant="secondary" onClick={exportCsv}><Download className="w-4 h-4" />CSV</SAButton>}
      />

      <SACard className="p-4 flex flex-wrap items-center gap-2">
        <SAInput value={filters.country_code} onChange={(v) => { setFilters({ ...filters, country_code: v }); setOffset(0); }} placeholder="País (ES, KR, US)" className="w-32" />
        <SAInput value={filters.event_type} onChange={(v) => { setFilters({ ...filters, event_type: v }); setOffset(0); }} placeholder="Event type" className="w-40" />
        <SAInput type="date" value={filters.from_date} onChange={(v) => { setFilters({ ...filters, from_date: v }); setOffset(0); }} className="w-44" />
        <SAInput type="date" value={filters.to_date} onChange={(v) => { setFilters({ ...filters, to_date: v }); setOffset(0); }} className="w-44" />
      </SACard>

      <SACard className="overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 text-white/40 animate-spin" /></div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-white/[0.03] text-white/50 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3">{t('common.date', 'Fecha')}</th>
                  <th className="text-left px-4 py-3">{t('common.country', 'País')}</th>
                  <th className="text-left px-4 py-3">Event</th>
                  <th className="text-right px-4 py-3">Subtotal</th>
                  <th className="text-right px-4 py-3">VAT</th>
                  <th className="text-right px-4 py-3">Platform</th>
                  <th className="text-right px-4 py-3">Net</th>
                  <th className="text-right px-4 py-3">USD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {items.map((it) => (
                  <tr key={it.ledger_id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-2 text-white/70 text-xs whitespace-nowrap">{new Date(it.created_at).toLocaleString()}</td>
                    <td className="px-4 py-2 text-white/80">{it.buyer_country || '—'}</td>
                    <td className="px-4 py-2 text-white">{it.event_type}</td>
                    <td className="px-4 py-2 text-right text-white/80">{it.product_subtotal} {it.currency}</td>
                    <td className="px-4 py-2 text-right text-white/60">{it.product_tax_amount}</td>
                    <td className="px-4 py-2 text-right text-white/80">{it.platform_fee}</td>
                    <td className="px-4 py-2 text-right text-white/80">{it.seller_net}</td>
                    <td className="px-4 py-2 text-right text-white/60">${it.usd_equivalent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-white/40">
              <span>{t('common.showing', 'Mostrando')} {items.length} / {total}</span>
              <div className="flex items-center gap-2">
                <SAButton variant="secondary" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}>← {t('common.prev', 'Anterior')}</SAButton>
                <SAButton variant="secondary" disabled={offset + limit >= total} onClick={() => setOffset(offset + limit)}>{t('common.next', 'Siguiente')} →</SAButton>
              </div>
            </div>
          </>
        )}
      </SACard>
    </div>
  );
}
