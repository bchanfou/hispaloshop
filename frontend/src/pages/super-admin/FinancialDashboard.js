import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../services/api/client';
import { useTranslation } from 'react-i18next';
import {
  DollarSign, TrendingUp, Download, AlertTriangle,
  Loader2, Globe, Receipt, Clock, CheckCircle,
  ChevronDown, ChevronUp, RefreshCw, Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const REGION_COLORS = { US: '#007AFF', EU: '#34C759', KR: '#FF9500', Other: '#5856D6' };
const EVENT_LABELS = {
  order_paid: 'Pago recibido',
  seller_transfer: 'Transferencia a productor',
  influencer_scheduled: 'Influencer programado',
  influencer_paid: 'Influencer pagado',
  refund: 'Reembolso',
};

const safeNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const fixed2 = (value) => safeNumber(value).toFixed(2);

function SACard({ children, className = '' }) {
  return (
    <div className={`bg-[#1C1C1E] rounded-[14px] border border-white/[0.08] p-5 ${className}`}>
      {children}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color = '#007AFF', testId }) {
  return (
    <SACard className="!p-4" data-testid={testId}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-white/30" />
        <span className="text-[10px] text-white/30 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-xl font-extrabold" style={{ color }}>{value}</p>
      {sub && <p className="text-[11px] text-white/30 mt-0.5">{sub}</p>}
    </SACard>
  );
}

function EventBadge({ type }) {
  const config = {
    order_paid: 'bg-[#34C759]/15 text-[#34C759]',
    seller_transfer: 'bg-[#007AFF]/15 text-[#007AFF]',
    influencer_scheduled: 'bg-[#FF9500]/15 text-[#FF9500]',
    influencer_paid: 'bg-[#5856D6]/15 text-[#5856D6]',
    refund: 'bg-[#FF3B30]/15 text-[#FF3B30]',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${config[type] || 'bg-white/[0.08] text-white/40'}`}>
      {EVENT_LABELS[type] || type}
    </span>
  );
}

const DarkTooltip = ({ active, payload, label, formatter }) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-[#2C2C2E] border border-white/[0.1] rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-white/50 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-white font-medium">
          {p.name}: {formatter ? formatter(p.value, p.name)[0] : p.value}
        </p>
      ))}
    </div>
  );
};

export default function FinancialDashboard() {
  const { t } = useTranslation();
  const [ledger, setLedger] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [expandedRow, setExpandedRow] = useState(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [ledgerData, payoutsPayload] = await Promise.all([
        apiClient.get('/admin/financial-ledger?limit=500'),
        apiClient.get('/payments/scheduled-payouts'),
      ]);
      setLedger(ledgerData || null);
      setPayouts(Array.isArray(payoutsPayload) ? payoutsPayload : (Array.isArray(payoutsPayload?.payouts) ? payoutsPayload.payouts : []));
    } catch (err) {
      toast.error('Error cargando datos financieros');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleProcessPayouts = async () => {
    setProcessing(true);
    try {
      await apiClient.post('/payments/process-influencer-payouts', {});
      toast.success(t('admin.pendingPayouts') + ' - OK');
      fetchData();
    } catch (err) {
      toast.error('Error procesando payouts');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadExcel = async () => {
    setDownloading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      const blob = await apiClient.get(`/admin/export/financial-report?${params.toString()}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      const suffix = dateFrom && dateTo ? `_${dateFrom}_al_${dateTo}` : `_${new Date().toISOString().slice(0, 10)}`;
      link.setAttribute('download', `hispaloshop_contabilidad${suffix}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Reporte descargado correctamente');
    } catch (err) {
      toast.error('Error descargando reporte');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-white/30" />
      </div>
    );
  }

  const entries = Array.isArray(ledger?.entries) ? ledger.entries : [];
  const summary = ledger?.summary && typeof ledger.summary === 'object' ? ledger.summary : {};

  // Regional breakdown
  const euCountries = new Set(['ES','FR','DE','IT','PT','NL','BE','AT','IE','GR','PL','SE','DK','FI','NO']);
  const regionData = { US: 0, EU: 0, KR: 0, Other: 0 };
  const monthlyByRegion = {};

  entries.forEach(e => {
    if (e.event_type !== 'order_paid') return;
    const c = e.buyer_country || '';
    const amount = e.usd_equivalent || 0;
    if (c === 'US') regionData.US += amount;
    else if (c === 'KR') regionData.KR += amount;
    else if (euCountries.has(c)) regionData.EU += amount;
    else regionData.Other += amount;

    const month = (e.created_at || '').slice(0, 7);
    if (!monthlyByRegion[month]) monthlyByRegion[month] = { month, US: 0, EU: 0, KR: 0, Other: 0 };
    if (c === 'US') monthlyByRegion[month].US += amount;
    else if (c === 'KR') monthlyByRegion[month].KR += amount;
    else if (euCountries.has(c)) monthlyByRegion[month].EU += amount;
    else monthlyByRegion[month].Other += amount;
  });

  const pieData = Object.entries(regionData)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));

  const barData = Object.values(monthlyByRegion)
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6)
    .map(d => ({ ...d, month: d.month.slice(5) }));

  const pendingPayouts = payouts.filter(p => p.status === 'scheduled');
  const duePayouts = pendingPayouts.filter(p => new Date(p.due_date) <= new Date());

  const filteredEntries = filter === 'all'
    ? entries.slice(0, 50)
    : entries.filter(e => e.event_type === filter).slice(0, 50);

  return (
    <div className="max-w-[1000px] mx-auto pb-16 space-y-5" data-testid="financial-dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white mb-1" data-testid="financial-title">
            Contabilidad
          </h1>
          <p className="text-sm text-white/40">Ledger financiero, impuestos y consolidación USD</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchData}
            data-testid="refresh-btn"
            className="px-3 py-2 bg-white/[0.08] rounded-xl text-white/60 hover:bg-white/[0.12] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5856D6]"
            title="Desde"
          />
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5856D6]"
            title="Hasta"
          />
          <button
            onClick={handleDownloadExcel}
            disabled={downloading}
            data-testid="download-excel-btn"
            className="px-4 py-2 bg-white/[0.08] rounded-xl text-white/60 hover:bg-white/[0.12] transition-colors disabled:opacity-50 inline-flex items-center text-sm"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span className="ml-1.5">Excel</span>
          </button>
        </div>
      </div>

      {/* Pending payouts alert */}
      {duePayouts.length > 0 && (
        <div className="bg-[#FF9500]/10 border border-[#FF9500]/20 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3" data-testid="due-payouts-alert">
          <div className="flex items-center gap-2 flex-1">
            <AlertTriangle className="w-5 h-5 text-[#FF9500] flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-white">
                {duePayouts.length} payout{duePayouts.length > 1 ? 's' : ''} de influencer pendiente{duePayouts.length > 1 ? 's' : ''}
              </p>
              <p className="text-xs text-white/40">
                Total: {duePayouts.reduce((s, p) => s + safeNumber(p.amount), 0).toFixed(2)}€
              </p>
            </div>
          </div>
          <button
            onClick={handleProcessPayouts}
            disabled={processing}
            className="px-4 py-2 bg-[#FF9500] hover:bg-[#E08600] disabled:opacity-50 text-white rounded-xl transition-colors self-start inline-flex items-center text-sm font-semibold"
            data-testid="process-payouts-btn"
          >
            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            <span className="ml-1.5">Ejecutar payouts</span>
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard icon={DollarSign} label={t('superAdmin.grossRevenue')} value={`${fixed2(summary.total_gross)}€`} color="#34C759" testId="stat-gross" />
        <StatCard icon={TrendingUp} label={t('superAdmin.platformCommission')} value={`${fixed2(summary.total_platform_fee)}€`} color="#007AFF" testId="stat-platform-fee" />
        <StatCard icon={Receipt} label={t('superAdmin.paidToSellers')} value={`${fixed2(summary.total_seller_net)}€`} color="#FF9500" testId="stat-seller-net" />
        <StatCard icon={Globe} label="Consolidado USD" value={`$${fixed2(summary.total_usd_equivalent)}`} sub="Florida LLC" color="#5856D6" testId="stat-usd" />
        <StatCard
          icon={Clock}
          label={t('superAdmin.pendingPayouts')}
          value={pendingPayouts.length}
          sub={`${duePayouts.length} vencidos`}
          color={duePayouts.length > 0 ? '#FF3B30' : '#34C759'}
          testId="stat-payouts"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly Revenue by Region */}
        <SACard className="lg:col-span-2">
          <h2 className="text-[15px] font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-white/30" />
            Ingresos mensuales por región (USD)
          </h2>
          {barData.length > 0 ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} barGap={1}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.35)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.35)' }} tickFormatter={v => `$${v}`} axisLine={false} tickLine={false} />
                  <Tooltip content={<DarkTooltip formatter={(v, name) => [`$${fixed2(v)}`, name]} />} />
                  <Bar dataKey="US" stackId="a" fill={REGION_COLORS.US} />
                  <Bar dataKey="EU" stackId="a" fill={REGION_COLORS.EU} />
                  <Bar dataKey="KR" stackId="a" fill={REGION_COLORS.KR} />
                  <Bar dataKey="Other" stackId="a" fill={REGION_COLORS.Other} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-52 flex items-center justify-center text-white/30 text-sm">Sin datos</div>
          )}
          <div className="flex items-center gap-4 mt-3 justify-center text-xs text-white/40">
            {Object.entries(REGION_COLORS).map(([k, c]) => (
              <span key={k} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} /> {k}
              </span>
            ))}
          </div>
        </SACard>

        {/* Pie chart: Revenue by Region */}
        <SACard>
          <h2 className="text-[15px] font-bold text-white mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-white/30" />
            Distribución por región
          </h2>
          {pieData.length > 0 ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={REGION_COLORS[entry.name] || '#5856D6'} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={<DarkTooltip formatter={(v) => [`$${fixed2(v)}`, 'USD']} />}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-52 flex items-center justify-center text-white/30 text-sm">Sin datos</div>
          )}
        </SACard>
      </div>

      {/* Ledger Table */}
      <SACard className="overflow-hidden !p-0" data-testid="ledger-table">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
          <h2 className="text-[15px] font-bold text-white flex items-center gap-2">
            <Receipt className="w-4 h-4 text-white/30" />
            Ledger financiero
          </h2>
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-white/30" />
            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="text-xs bg-white/[0.06] border border-white/[0.08] rounded-lg px-2 py-1.5 text-white focus:outline-none"
              data-testid="ledger-filter"
            >
              <option value="all" className="bg-[#1C1C1E]">Todos</option>
              <option value="order_paid" className="bg-[#1C1C1E]">Pagos</option>
              <option value="seller_transfer" className="bg-[#1C1C1E]">Transferencias</option>
              <option value="influencer_scheduled" className="bg-[#1C1C1E]">Influencer prog.</option>
              <option value="influencer_paid" className="bg-[#1C1C1E]">Influencer pagado</option>
              <option value="refund" className="bg-[#1C1C1E]">Reembolsos</option>
            </select>
          </div>
        </div>
        <div className="max-h-[500px] overflow-y-auto">
          {filteredEntries.length === 0 ? (
            <div className="py-12 text-center">
              <Receipt className="w-10 h-10 mx-auto mb-2 text-white/10" />
              <p className="text-sm text-white/30">Sin entradas en el ledger</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#1C1C1E]">
                <tr className="text-white/30 text-[11px] uppercase tracking-wider">
                  <th className="text-left px-5 py-2.5 font-medium">Fecha</th>
                  <th className="text-left px-3 py-2.5 font-medium">Evento</th>
                  <th className="text-left px-3 py-2.5 font-medium">Order</th>
                  <th className="text-right px-3 py-2.5 font-medium">Importe</th>
                  <th className="text-right px-3 py-2.5 font-medium">Impuesto</th>
                  <th className="text-right px-3 py-2.5 font-medium">USD</th>
                  <th className="text-left px-3 py-2.5 font-medium">País</th>
                  <th className="px-2 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((e, idx) => (
                  <React.Fragment key={e.ledger_id || idx}>
                    <tr
                      className="border-t border-white/[0.06] hover:bg-white/[0.03] cursor-pointer transition-colors"
                      onClick={() => setExpandedRow(expandedRow === idx ? null : idx)}
                      data-testid={`ledger-row-${idx}`}
                    >
                      <td className="px-5 py-2.5 text-white/50 whitespace-nowrap">
                        {(e.created_at || '').slice(0, 10)}
                      </td>
                      <td className="px-3 py-2.5"><EventBadge type={e.event_type} /></td>
                      <td className="px-3 py-2.5 text-white/40 font-mono">
                        {(e.order_id || '').slice(-8)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium text-white">
                        {fixed2(e.product_subtotal)} {e.currency}
                      </td>
                      <td className="px-3 py-2.5 text-right text-white/35">
                        {safeNumber(e.product_tax_amount) > 0 ? `${fixed2(e.product_tax_amount)}` : '-'}
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium text-white/60">
                        ${fixed2(e.usd_equivalent)}
                      </td>
                      <td className="px-3 py-2.5 text-white/35">{e.buyer_country || '-'}</td>
                      <td className="px-2 py-2.5">
                        {expandedRow === idx ? <ChevronUp className="w-3.5 h-3.5 text-white/30" /> : <ChevronDown className="w-3.5 h-3.5 text-white/30" />}
                      </td>
                    </tr>
                    {expandedRow === idx && (
                      <tr className="bg-white/[0.02]">
                        <td colSpan={8} className="px-5 py-3">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                            <div><span className="text-white/30">Productor:</span> <span className="text-white/50">{e.seller_id || '-'}</span></div>
                            <div><span className="text-white/30">Neto productor:</span> <span className="text-white/50">{fixed2(e.seller_net)} {e.currency}</span></div>
                            <div><span className="text-white/30">Platform Fee:</span> <span className="text-white/50">{fixed2(e.platform_fee)} {e.currency}</span></div>
                            <div><span className="text-white/30">Platform Net:</span> <span className="text-white/50">{fixed2(e.platform_net)} {e.currency}</span></div>
                            <div><span className="text-white/30">Tax Type:</span> <span className="text-white/50">{e.product_tax_type}</span></div>
                            <div><span className="text-white/30">VAT Rate:</span> <span className="text-white/50">{(safeNumber(e.vat_rate_applied) * 100).toFixed(1)}%</span></div>
                            <div><span className="text-white/30">Reverse Charge:</span> <span className="text-white/50">{e.reverse_charge_applied ? 'Sí' : 'No'}</span></div>
                            <div><span className="text-white/30">Transfer ID:</span> <span className="text-white/50 font-mono">{e.transfer_id || '-'}</span></div>
                            {e.influencer_id && (
                              <div><span className="text-white/30">Influencer:</span> <span className="text-white/50">{e.influencer_id}</span></div>
                            )}
                            {safeNumber(e.influencer_amount) > 0 && (
                              <div><span className="text-white/30">Influencer Amount:</span> <span className="text-white/50">{fixed2(e.influencer_amount)} {e.currency}</span></div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </SACard>

      {/* Scheduled Payouts Table */}
      {pendingPayouts.length > 0 && (
        <SACard className="overflow-hidden !p-0" data-testid="scheduled-payouts-table">
          <div className="px-5 py-3.5 border-b border-white/[0.06]">
            <h2 className="text-[15px] font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-white/30" />
              Payouts programados ({pendingPayouts.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-white/30 text-[11px] uppercase tracking-wider border-b border-white/[0.06]">
                  <th className="text-left px-5 py-2.5 font-medium">Influencer</th>
                  <th className="text-left px-3 py-2.5 font-medium">Order</th>
                  <th className="text-right px-3 py-2.5 font-medium">Importe</th>
                  <th className="text-left px-3 py-2.5 font-medium">Fecha pago</th>
                  <th className="text-left px-3 py-2.5 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {pendingPayouts.map((p) => {
                  const isDue = new Date(p.due_date) <= new Date();
                  return (
                    <tr key={p.payout_id} className="border-t border-white/[0.06]">
                      <td className="px-5 py-2.5 text-white/50">{p.influencer_id}</td>
                      <td className="px-3 py-2.5 font-mono text-white/35">{(p.order_id || '').slice(-8)}</td>
                      <td className="px-3 py-2.5 text-right font-medium text-white">{fixed2(p.amount)} {p.currency}</td>
                      <td className="px-3 py-2.5 text-white/50">{(p.due_date || '').slice(0, 10)}</td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${isDue ? 'bg-[#FF3B30]/15 text-[#FF3B30]' : 'bg-[#FF9500]/15 text-[#FF9500]'}`}>
                          {isDue ? 'Vencido' : 'Pendiente'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SACard>
      )}
    </div>
  );
}
