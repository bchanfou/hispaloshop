// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  DollarSign, TrendingUp, CreditCard,
  ExternalLink, Loader2, ShoppingBag, AlertCircle, ChevronDown, ChevronUp,
  Wallet, BarChart3, Receipt
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import apiClient from '../../services/api/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// ── Status badge component ──
function StatusBadge({ status }) {
  const config = {
    paid: { label: 'Pagado', cls: 'bg-stone-100 text-stone-700' },
    confirmed: { label: 'Confirmado', cls: 'bg-stone-100 text-stone-700' },
    preparing: { label: 'Preparando', cls: 'bg-stone-100 text-stone-700' },
    shipped: { label: 'Enviado', cls: 'bg-stone-200 text-stone-700' },
    delivered: { label: 'Entregado', cls: 'bg-stone-950 text-white' },
    pending: { label: 'Pendiente', cls: 'bg-stone-100 text-stone-600' },
    cancelled: { label: 'Cancelado', cls: 'bg-stone-200 text-stone-700' },
  };
  const { label, cls } = config[status] || { label: status, cls: 'bg-stone-100 text-stone-600' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`} data-testid={`status-badge-${status}`}>
      {label}
    </span>
  );
}

// ── Stat Card ──
function StatCard({ icon: Icon, label, value, sublabel, color = "default", testId }) {
  const colors = {
    green: { bg: 'bg-stone-100', icon: 'text-stone-700', border: 'border-stone-200' },
    blue: { bg: 'bg-stone-100', icon: 'text-stone-700', border: 'border-stone-200' },
    amber: { bg: 'bg-stone-100', icon: 'text-stone-700', border: 'border-stone-200' },
    red: { bg: 'bg-stone-100', icon: 'text-stone-700', border: 'border-stone-200' },
    default: { bg: 'bg-stone-50', icon: 'text-stone-600', border: 'border-stone-200' },
  };
  const c = colors[color] || colors.default;
  return (
    <div className={`bg-white rounded-2xl shadow-sm p-5 transition-shadow hover:shadow-md`} data-testid={testId}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-2xl ${c.bg}`}>
          <Icon className={`w-4 h-4 ${c.icon}`} />
        </div>
        <span className="text-sm text-stone-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-stone-950 tracking-tight">{value}</p>
      {sublabel && <p className="text-xs text-stone-500 mt-1">{sublabel}</p>}
    </div>
  );
}

// ── Monthly Chart ──
function MonthlyChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-52 text-stone-500">
        <BarChart3 className="w-10 h-10 mb-2 opacity-30" />
        <p className="text-sm">Sin datos de ventas aun</p>
      </div>
    );
  }

  // Take last 6 months (most recent) from chronologically-sorted data
  const chartData = [...data].slice(-6).map(item => ({
    month: item.month.slice(5),  // "02" from "2026-02"
    Bruto: item.gross,
    Neto: item.net,
    Pedidos: item.orders
  }));

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v}€`} />
          <Tooltip
            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e5e5', fontSize: '12px' }}
            formatter={(val, name) => [`${val.toFixed(2)}€`, name]}
          />
          <Bar dataKey="Bruto" fill="#d6d3d1" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Neto" fill="#1c1917" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Order Row ──
function OrderRow({ order, expanded, onToggle }) {
  return (
    <div className="border-b border-stone-100 last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-stone-50/50 transition-colors text-left"
        data-testid={`order-row-${order.order_id}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Receipt className="w-4 h-4 text-stone-500 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-stone-950 truncate">
              #{String(order.order_id).slice(-8)}
            </p>
            <p className="text-xs text-stone-500">
              {order.customer_name} · {new Date(order.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <StatusBadge status={order.status} />
          <div className="text-right">
            <p className="text-sm font-semibold text-stone-700">+{(order.net_earnings ?? 0).toFixed(2)}€</p>
            <p className="text-[10px] text-stone-500">{(order.gross_amount ?? 0).toFixed(2)}€ bruto</p>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-stone-500" /> : <ChevronDown className="w-4 h-4 text-stone-500" />}
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-3 bg-stone-50/50">
          <div className="space-y-1.5 ml-7">
            {(order.items || []).map((item, i) => (
              <div key={i} className="flex justify-between text-xs text-stone-600">
                <span>{item.quantity}x {item.product_name}</span>
                <span>{(item.subtotal ?? 0).toFixed(2)}€</span>
              </div>
            ))}
            <div className="pt-1.5 mt-1.5 border-t border-stone-200 flex justify-between text-xs">
              <span className="text-stone-500">Comisión plataforma ({(order.gross_amount ?? 0) > 0 ? ((order.platform_fee ?? 0) / (order.gross_amount || 1) * 100).toFixed(0) : 0}%)</span>
              <span className="text-stone-600">-{(order.platform_fee ?? 0).toFixed(2)}€</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ──
export default function ProducerPayments() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [openingDashboard, setOpeningDashboard] = useState(false);
  const [visibleOrders, setVisibleOrders] = useState(20);

  useEffect(() => { fetchPayments(); }, []);

  const fetchPayments = async () => {
    try {
      const data = await apiClient.get('/producer/payments');
      setData(data);
    } catch {
      toast.error('Error al cargar datos de pagos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenStripeDashboard = async () => {
    setOpeningDashboard(true);
    try {
      const response = await apiClient.post('/producer/stripe/create-login-link', {});
      if (response?.url) {
        window.open(response.url, '_blank');
      } else {
        toast.error('No se pudo obtener el enlace de Stripe');
      }
    } catch (error) {
      toast.error('Error al abrir el dashboard de Stripe');
    } finally {
      setOpeningDashboard(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[975px] mx-auto space-y-6">
        <div className="space-y-1">
          <div className="h-8 w-40 bg-stone-100 rounded-2xl animate-pulse" />
          <div className="h-4 w-56 bg-stone-100 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-stone-100 rounded-2xl animate-pulse" />
                <div className="h-3 w-20 bg-stone-100 rounded animate-pulse" />
              </div>
              <div className="h-6 w-24 bg-stone-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-5 h-64 animate-pulse" />
          <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm p-5 h-64 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="w-10 h-10 text-stone-400 mb-3" />
        <p className="text-stone-500">Error al cargar datos de pagos</p>
        <button type="button" onClick={fetchPayments} className="mt-4 px-4 py-2 border border-stone-200 rounded-2xl text-stone-700 hover:bg-stone-50 transition-colors">Reintentar</button>
      </div>
    );
  }

  const commissionPct = Math.round((data.commission_rate || 0.18) * 100);

  return (
    <div className="max-w-[975px] mx-auto space-y-6" data-testid="producer-payments-dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-stone-950" data-testid="payments-title">
            Ganancias
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Resumen de tus ventas y pagos
          </p>
        </div>
        {data.stripe_connected && (
          <button
            type="button"
            onClick={handleOpenStripeDashboard}
            disabled={openingDashboard}
            className="flex items-center gap-2 px-3 py-1.5 border border-stone-200 rounded-2xl text-sm text-stone-700 hover:bg-stone-50 transition-colors self-start"
            data-testid="open-stripe-dashboard"
          >
            {openingDashboard ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ExternalLink className="w-4 h-4" />
            )}
            Dashboard Stripe
          </button>
        )}
      </div>

      {/* Solicitar pago CTA */}
      <button
        type="button"
        onClick={() => toast.info('Los pagos se procesan automáticamente cada 15 días')}
        className="bg-stone-950 text-white rounded-full px-6 py-2.5 text-sm font-semibold hover:bg-stone-800 transition-colors"
        data-testid="request-payout-cta"
      >
        Solicitar pago
      </button>

      {/* Fiscal summary */}
      {data.tax_withholding_pct != null && (
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white">
            <Receipt className="w-4 h-4 text-stone-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-stone-950">Retención fiscal aplicada</p>
            <p className="text-xs text-stone-500">Se retiene el <strong className="text-stone-700">{data.tax_withholding_pct}%</strong> sobre tus ganancias netas según tu configuración fiscal.</p>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          icon={DollarSign}
          label={t('producer.grossSales')}
          value={`${(data.total_gross ?? 0).toFixed(2)}€`}
          sublabel={`${data.paid_orders ?? 0} pedidos completados`}
          color="blue"
          testId="stat-gross"
        />
        <StatCard
          icon={TrendingUp}
          label={`Tus ganancias (${100 - commissionPct}%)`}
          value={`${(data.total_net ?? 0).toFixed(2)}€`}
          sublabel={t('producer.afterCommission')}
          color="green"
          testId="stat-net"
        />
        <StatCard
          icon={CreditCard}
          label={`Comisión plataforma (${commissionPct}%)`}
          value={`${(data.total_platform_fee ?? 0).toFixed(2)}€`}
          color="amber"
          testId="stat-fees"
        />
        <StatCard
          icon={Wallet}
          label={t('producer.pendingPayout')}
          value={`${(data.pending_payout ?? 0).toFixed(2)}€`}
          sublabel={data.stripe_connected ? 'Stripe conectado' : 'Conecta Stripe'}
          color={data.pending_payout > 0 ? 'green' : 'default'}
          testId="stat-pending"
        />
      </div>

      {/* Stripe Connect Banner (if not connected) */}
      {!data.stripe_connected && (
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4" data-testid="stripe-connect-banner">
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2.5 bg-stone-100 rounded-2xl">
              <AlertCircle className="w-5 h-5 text-stone-700" />
            </div>
            <div>
              <h3 className="font-medium text-stone-950 text-sm">Conecta Stripe para recibir pagos</h3>
              <p className="text-xs text-stone-600 mt-0.5">
                Tus ganancias se acumulan, pero necesitas Stripe Connect para recibir transferencias automáticas.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              try {
                const res = await apiClient.post('/producer/stripe/create-account', {});
                if (res.url) window.location.href = res.url;
                else toast.success('Cuenta de Stripe ya creada');
              } catch (e) {
                toast.error(e.message || 'Error');
              }
            }}
            className="px-3 py-1.5 bg-stone-950 hover:bg-stone-800 text-white text-sm rounded-2xl transition-colors self-start"
            data-testid="connect-stripe-cta"
          >
            Conectar Stripe
          </button>
        </div>
      )}

      {/* Chart + Recent Orders Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
        {/* Monthly Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-stone-500" />
            <h2 className="font-medium text-stone-950 text-sm">Ventas mensuales</h2>
          </div>
          <MonthlyChart data={data.monthly_summary || []} />
          <div className="flex items-center gap-4 mt-3 text-xs text-stone-500 justify-center">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#d6d3d1]" /> Bruto
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-stone-950" /> Neto
            </span>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-stone-500" />
              <h2 className="font-medium text-stone-950 text-sm">Pedidos recientes</h2>
            </div>
            <span className="text-xs text-stone-500">{(data.recent_orders || []).length} pedidos</span>
          </div>
          <div className="max-h-[400px] overflow-y-auto" data-testid="recent-orders-list">
            {(data.recent_orders || []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-stone-500">
                <ShoppingBag className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm">Aún no tienes pedidos</p>
              </div>
            ) : (
              <>
                {(data.recent_orders || []).slice(0, visibleOrders).map((order) => (
                  <OrderRow
                    key={order.order_id}
                    order={order}
                    expanded={expandedOrder === order.order_id}
                    onToggle={() => setExpandedOrder(
                      expandedOrder === order.order_id ? null : order.order_id
                    )}
                  />
                ))}
                {(data.recent_orders || []).length > visibleOrders && (
                  <button
                    type="button"
                    onClick={() => setVisibleOrders(prev => prev + 20)}
                    className="w-full py-3 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors border-t border-stone-100"
                    data-testid="load-more-orders"
                  >
                    Cargar más ({(data.recent_orders.length - visibleOrders)} restantes)
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Monthly Breakdown Table */}
      {(data.monthly_summary || []).length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden" data-testid="monthly-breakdown">
          <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
            <h2 className="font-medium text-stone-950 text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-stone-500" />
              Desglose mensual
            </h2>
            <button
              onClick={() => {
                const rows = [['Mes', 'Pedidos', 'Bruto (€)', 'Neto (€)']];
                (data.monthly_summary || []).forEach(m => {
                  rows.push([m.month || '', m.orders || 0, Number(m.gross || 0).toFixed(2), Number(m.net || 0).toFixed(2)]);
                });
                const csv = rows.map(r => r.join(',')).join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `hispaloshop-pagos-${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success('CSV exportado');
              }}
              className="text-xs font-semibold text-stone-500 hover:text-stone-950 transition-colors"
            >
              Exportar CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50/80 text-stone-500">
                  <th className="text-left px-4 py-2.5 font-medium">Mes</th>
                  <th className="text-right px-4 py-2.5 font-medium">Pedidos</th>
                  <th className="text-right px-4 py-2.5 font-medium">Bruto</th>
                  <th className="text-right px-4 py-2.5 font-medium">Neto</th>
                </tr>
              </thead>
              <tbody>
                {data.monthly_summary.map((m) => (
                  <tr key={m.month} className="border-t border-stone-100 hover:bg-stone-50/50">
                    <td className="px-4 py-2.5 font-medium text-stone-950">
                      {new Date(m.month + '-01').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                    </td>
                    <td className="text-right px-4 py-2.5 text-stone-600">{m.orders}</td>
                    <td className="text-right px-4 py-2.5 text-stone-600">{m.gross.toFixed(2)}€</td>
                    <td className="text-right px-4 py-2.5 font-medium text-stone-700">{m.net.toFixed(2)}€</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info footer */}
      <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 text-sm text-stone-500">
        <p>
          <strong className="text-stone-600">Cómo funcionan los pagos:</strong> Cada venta se divide automáticamente.
          Tú recibes el <strong>{100 - commissionPct}%</strong> y la plataforma retiene el <strong>{commissionPct}%</strong> de comisión.
          {data.stripe_connected 
            ? ' Las transferencias se procesan automáticamente a tu cuenta bancaria vía Stripe.'
            : ' Conecta Stripe Connect para activar las transferencias automáticas.'}
        </p>
      </div>
    </div>
  );
}
