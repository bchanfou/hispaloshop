import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
  DollarSign, TrendingUp, Download, AlertTriangle,
  Loader2, Globe, Receipt, Clock, CheckCircle,
  ChevronDown, ChevronUp, RefreshCw, Filter
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { API } from '../../utils/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const REGION_COLORS = { US: '#3b82f6', EU: '#10b981', KR: '#f59e0b', Other: '#6b7280' };
const EVENT_LABELS = {
  order_paid: 'Pago recibido',
  seller_transfer: 'Transferencia a productor',
  influencer_scheduled: 'Influencer programado',
  influencer_paid: 'Influencer pagado',
  refund: 'Reembolso',
};

function StatCard({ icon: Icon, label, value, sub, color = 'blue', testId }) {
  const palette = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    slate: 'bg-stone-50 text-stone-600 border-stone-200',
  };
  const cls = palette[color] || palette.blue;
  return (
    <div className={`bg-white rounded-xl border p-4 ${cls.split(' ').pop()}`} data-testid={testId}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-lg ${cls.split(' ').slice(0, 2).join(' ')}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-xs text-text-muted uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-xl font-bold text-text-primary">{value}</p>
      {sub && <p className="text-[11px] text-text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

function EventBadge({ type }) {
  const config = {
    order_paid: 'bg-green-100 text-green-700',
    seller_transfer: 'bg-blue-100 text-blue-700',
    influencer_scheduled: 'bg-amber-100 text-amber-700',
    influencer_paid: 'bg-purple-100 text-purple-700',
    refund: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${config[type] || 'bg-gray-100 text-gray-600'}`}>
      {EVENT_LABELS[type] || type}
    </span>
  );
}

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
      const [ledgerRes, payoutsRes] = await Promise.all([
        axios.get(`${API}/admin/financial-ledger?limit=500`, { withCredentials: true }),
        axios.get(`${API}/payments/scheduled-payouts`, { withCredentials: true }),
      ]);
      setLedger(ledgerRes.data);
      setPayouts(payoutsRes.data);
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
      await axios.post(`${API}/payments/process-influencer-payouts`, {}, { withCredentials: true });
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
      const response = await axios.get(`${API}/admin/export/financial-report?${params.toString()}`, {
        withCredentials: true,
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
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
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
      </div>
    );
  }

  const entries = ledger?.entries || [];
  const summary = ledger?.summary || {};

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

  // Pending payouts alert
  const pendingPayouts = payouts.filter(p => p.status === 'scheduled');
  const duePayouts = pendingPayouts.filter(p => new Date(p.due_date) <= new Date());

  // Filtered entries
  const filteredEntries = filter === 'all'
    ? entries.slice(0, 50)
    : entries.filter(e => e.event_type === filter).slice(0, 50);

  return (
    <div className="space-y-5" data-testid="financial-dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-text-primary" data-testid="financial-title">
            Contabilidad
          </h1>
          <p className="text-sm text-text-muted mt-0.5">Ledger financiero, impuestos y consolidacion USD</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} data-testid="refresh-btn">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="border border-stone-200 rounded-lg px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-stone-400"
            title="Desde"
          />
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="border border-stone-200 rounded-lg px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-stone-400"
            title="Hasta"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadExcel}
            disabled={downloading}
            data-testid="download-excel-btn"
            className="bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span className="ml-1.5">Descargar Excel</span>
          </Button>
        </div>
      </div>

      {/* Pending payouts alert */}
      {duePayouts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3" data-testid="due-payouts-alert">
          <div className="flex items-center gap-2 flex-1">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-900">
                {duePayouts.length} payout{duePayouts.length > 1 ? 's' : ''} de influencer pendiente{duePayouts.length > 1 ? 's' : ''} de ejecutar
              </p>
              <p className="text-xs text-amber-700">
                Total: {duePayouts.reduce((s, p) => s + p.amount, 0).toFixed(2)}€
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleProcessPayouts}
            disabled={processing}
            className="bg-amber-600 hover:bg-amber-700 text-white self-start"
            data-testid="process-payouts-btn"
          >
            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            <span className="ml-1.5">Ejecutar payouts</span>
          </Button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard icon={DollarSign} label={t('superAdmin.grossRevenue')} value={`${summary.total_gross?.toFixed(2) || '0.00'}€`} color="blue" testId="stat-gross" />
        <StatCard icon={TrendingUp} label={t('superAdmin.platformCommission')} value={`${summary.total_platform_fee?.toFixed(2) || '0.00'}€`} color="green" testId="stat-platform-fee" />
        <StatCard icon={Receipt} label={t('superAdmin.paidToSellers')} value={`${summary.total_seller_net?.toFixed(2) || '0.00'}€`} color="amber" testId="stat-seller-net" />
        <StatCard icon={Globe} label="Consolidado USD" value={`$${summary.total_usd_equivalent?.toFixed(2) || '0.00'}`} sub="Florida LLC" color="slate" testId="stat-usd" />
        <StatCard
          icon={Clock}
          label={t('superAdmin.pendingPayouts')}
          value={pendingPayouts.length}
          sub={`${duePayouts.length} vencidos`}
          color={duePayouts.length > 0 ? 'red' : 'slate'}
          testId="stat-payouts"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly Revenue by Region */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-stone-200 p-5">
          <h2 className="text-sm font-medium text-text-primary mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-text-muted" />
            Ingresos mensuales por region (USD)
          </h2>
          {barData.length > 0 ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} barGap={1}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e5e5', fontSize: '12px' }}
                    formatter={(v, name) => [`$${v.toFixed(2)}`, name]}
                  />
                  <Bar dataKey="US" stackId="a" fill={REGION_COLORS.US} />
                  <Bar dataKey="EU" stackId="a" fill={REGION_COLORS.EU} />
                  <Bar dataKey="KR" stackId="a" fill={REGION_COLORS.KR} />
                  <Bar dataKey="Other" stackId="a" fill={REGION_COLORS.Other} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-52 flex items-center justify-center text-text-muted text-sm">Sin datos</div>
          )}
          <div className="flex items-center gap-4 mt-3 justify-center text-xs text-text-muted">
            {Object.entries(REGION_COLORS).map(([k, c]) => (
              <span key={k} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} /> {k}
              </span>
            ))}
          </div>
        </div>

        {/* Pie chart: Revenue by Region */}
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h2 className="text-sm font-medium text-text-primary mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-text-muted" />
            Distribucion por region
          </h2>
          {pieData.length > 0 ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={REGION_COLORS[entry.name] || '#6b7280'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`$${v.toFixed(2)}`, 'USD']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-52 flex items-center justify-center text-text-muted text-sm">Sin datos</div>
          )}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden" data-testid="ledger-table">
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
          <h2 className="text-sm font-medium text-text-primary flex items-center gap-2">
            <Receipt className="w-4 h-4 text-text-muted" />
            Ledger financiero
          </h2>
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-text-muted" />
            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="text-xs border border-stone-200 rounded-lg px-2 py-1 bg-white"
              data-testid="ledger-filter"
            >
              <option value="all">Todos</option>
              <option value="order_paid">Pagos</option>
              <option value="seller_transfer">Transferencias</option>
              <option value="influencer_scheduled">Influencer prog.</option>
              <option value="influencer_paid">Influencer pagado</option>
              <option value="refund">Reembolsos</option>
            </select>
          </div>
        </div>
        <div className="max-h-[500px] overflow-y-auto">
          {filteredEntries.length === 0 ? (
            <div className="py-12 text-center text-text-muted text-sm">
              <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30" />
              Sin entradas en el ledger
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-stone-50/80 sticky top-0">
                <tr className="text-text-muted">
                  <th className="text-left px-4 py-2 font-medium">Fecha</th>
                  <th className="text-left px-3 py-2 font-medium">Evento</th>
                  <th className="text-left px-3 py-2 font-medium">Order</th>
                  <th className="text-right px-3 py-2 font-medium">Importe</th>
                  <th className="text-right px-3 py-2 font-medium">Impuesto</th>
                  <th className="text-right px-3 py-2 font-medium">USD</th>
                  <th className="text-left px-3 py-2 font-medium">Pais</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((e, idx) => (
                  <React.Fragment key={e.ledger_id || idx}>
                    <tr
                      className="border-t border-stone-100 hover:bg-stone-50/50 cursor-pointer"
                      onClick={() => setExpandedRow(expandedRow === idx ? null : idx)}
                      data-testid={`ledger-row-${idx}`}
                    >
                      <td className="px-4 py-2.5 text-text-secondary whitespace-nowrap">
                        {(e.created_at || '').slice(0, 10)}
                      </td>
                      <td className="px-3 py-2.5"><EventBadge type={e.event_type} /></td>
                      <td className="px-3 py-2.5 text-text-secondary font-mono">
                        {(e.order_id || '').slice(-8)}
                      </td>
                      <td className={`px-3 py-2.5 text-right font-medium ${e.product_subtotal < 0 ? 'text-red-600' : 'text-text-primary'}`}>
                        {e.product_subtotal?.toFixed(2)} {e.currency}
                      </td>
                      <td className="px-3 py-2.5 text-right text-text-muted">
                        {e.product_tax_amount > 0 ? `${e.product_tax_amount.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium text-text-secondary">
                        ${e.usd_equivalent?.toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5 text-text-muted">{e.buyer_country || '-'}</td>
                      <td className="px-2 py-2.5">
                        {expandedRow === idx ? <ChevronUp className="w-3.5 h-3.5 text-text-muted" /> : <ChevronDown className="w-3.5 h-3.5 text-text-muted" />}
                      </td>
                    </tr>
                    {expandedRow === idx && (
                      <tr className="bg-stone-50/50">
                        <td colSpan={8} className="px-4 py-3">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                            <div><span className="text-text-muted">Productor:</span> <span className="text-text-secondary">{e.seller_id || '-'}</span></div>
                            <div><span className="text-text-muted">Neto productor:</span> <span className="text-text-secondary">{e.seller_net?.toFixed(2)} {e.currency}</span></div>
                            <div><span className="text-text-muted">Platform Fee:</span> <span className="text-text-secondary">{e.platform_fee?.toFixed(2)} {e.currency}</span></div>
                            <div><span className="text-text-muted">Platform Net:</span> <span className="text-text-secondary">{e.platform_net?.toFixed(2)} {e.currency}</span></div>
                            <div><span className="text-text-muted">Tax Type:</span> <span className="text-text-secondary">{e.product_tax_type}</span></div>
                            <div><span className="text-text-muted">VAT Rate:</span> <span className="text-text-secondary">{(e.vat_rate_applied * 100).toFixed(1)}%</span></div>
                            <div><span className="text-text-muted">Reverse Charge:</span> <span className="text-text-secondary">{e.reverse_charge_applied ? 'Si' : 'No'}</span></div>
                            <div><span className="text-text-muted">Transfer ID:</span> <span className="text-text-secondary font-mono">{e.transfer_id || '-'}</span></div>
                            {e.influencer_id && (
                              <div><span className="text-text-muted">Influencer:</span> <span className="text-text-secondary">{e.influencer_id}</span></div>
                            )}
                            {e.influencer_amount > 0 && (
                              <div><span className="text-text-muted">Influencer Amount:</span> <span className="text-text-secondary">{e.influencer_amount?.toFixed(2)} {e.currency}</span></div>
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
      </div>

      {/* Scheduled Payouts Table */}
      {pendingPayouts.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden" data-testid="scheduled-payouts-table">
          <div className="px-4 py-3 border-b border-stone-100">
            <h2 className="text-sm font-medium text-text-primary flex items-center gap-2">
              <Clock className="w-4 h-4 text-text-muted" />
              Payouts programados ({pendingPayouts.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-stone-50/80">
                <tr className="text-text-muted">
                  <th className="text-left px-4 py-2 font-medium">Influencer</th>
                  <th className="text-left px-3 py-2 font-medium">Order</th>
                  <th className="text-right px-3 py-2 font-medium">Importe</th>
                  <th className="text-left px-3 py-2 font-medium">Fecha pago</th>
                  <th className="text-left px-3 py-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {pendingPayouts.map((p) => {
                  const isDue = new Date(p.due_date) <= new Date();
                  return (
                    <tr key={p.payout_id} className="border-t border-stone-100">
                      <td className="px-4 py-2.5 text-text-secondary">{p.influencer_id}</td>
                      <td className="px-3 py-2.5 font-mono text-text-muted">{(p.order_id || '').slice(-8)}</td>
                      <td className="px-3 py-2.5 text-right font-medium text-text-primary">{p.amount?.toFixed(2)} {p.currency}</td>
                      <td className="px-3 py-2.5 text-text-secondary">{(p.due_date || '').slice(0, 10)}</td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${isDue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {isDue ? 'Vencido' : 'Pendiente'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
