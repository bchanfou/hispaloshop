import React, { useState, useEffect } from 'react';
import {
  DollarSign, TrendingUp, CreditCard, ArrowUpRight,
  ArrowDownRight, Clock, CheckCircle, ExternalLink,
  Loader2, ShoppingBag, AlertCircle, ChevronDown, ChevronUp,
  Wallet, BarChart3, Receipt
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import apiClient from '../../services/api/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// ── Status badge component ──
function StatusBadge({ status }) {
  const config = {
    paid: { label: 'Pagado', cls: 'bg-green-100 text-green-700' },
    confirmed: { label: 'Confirmado', cls: 'bg-blue-100 text-blue-700' },
    preparing: { label: 'Preparando', cls: 'bg-yellow-100 text-yellow-700' },
    shipped: { label: 'Enviado', cls: 'bg-purple-100 text-purple-700' },
    delivered: { label: 'Entregado', cls: 'bg-green-100 text-green-700' },
    pending: { label: 'Pendiente', cls: 'bg-gray-100 text-gray-600' },
    cancelled: { label: 'Cancelado', cls: 'bg-red-100 text-red-700' },
  };
  const { label, cls } = config[status] || { label: status, cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`} data-testid={`status-badge-${status}`}>
      {label}
    </span>
  );
}

// ── Stat Card ──
function StatCard({ icon: Icon, label, value, sublabel, color = "default", testId }) {
  const colors = {
    green: { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-emerald-200' },
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-200' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-600', border: 'border-amber-200' },
    red: { bg: 'bg-red-50', icon: 'text-red-600', border: 'border-red-200' },
    default: { bg: 'bg-stone-50', icon: 'text-stone-600', border: 'border-stone-200' },
  };
  const c = colors[color] || colors.default;
  return (
    <div className={`bg-white rounded-xl border ${c.border} p-5 transition-shadow hover:shadow-sm`} data-testid={testId}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${c.bg}`}>
          <Icon className={`w-4 h-4 ${c.icon}`} />
        </div>
        <span className="text-sm text-text-muted">{label}</span>
      </div>
      <p className="text-2xl font-bold text-text-primary tracking-tight">{value}</p>
      {sublabel && <p className="text-xs text-text-muted mt-1">{sublabel}</p>}
    </div>
  );
}

// ── Monthly Chart ──
function MonthlyChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-52 text-text-muted">
        <BarChart3 className="w-10 h-10 mb-2 opacity-30" />
        <p className="text-sm">Sin datos de ventas aun</p>
      </div>
    );
  }

  const chartData = [...data].reverse().slice(-6).map(item => ({
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
          <Bar dataKey="Bruto" fill="#d4c5a9" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Neto" fill="#2D5A27" radius={[4, 4, 0, 0]} />
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
          <Receipt className="w-4 h-4 text-text-muted flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">
              #{order.order_id.slice(-8)}
            </p>
            <p className="text-xs text-text-muted">
              {order.customer_name} · {new Date(order.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <StatusBadge status={order.status} />
          <div className="text-right">
            <p className="text-sm font-semibold text-emerald-700">+{order.net_earnings.toFixed(2)}€</p>
            <p className="text-[10px] text-text-muted">{order.gross_amount.toFixed(2)}€ bruto</p>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-3 bg-stone-50/50">
          <div className="space-y-1.5 ml-7">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-xs text-text-secondary">
                <span>{item.quantity}x {item.product_name}</span>
                <span>{item.subtotal.toFixed(2)}€</span>
              </div>
            ))}
            <div className="pt-1.5 mt-1.5 border-t border-stone-200 flex justify-between text-xs">
              <span className="text-text-muted">Comisión plataforma ({(order.platform_fee / order.gross_amount * 100).toFixed(0)}%)</span>
              <span className="text-red-500">-{order.platform_fee.toFixed(2)}€</span>
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

  useEffect(() => { fetchPayments(); }, []);

  const fetchPayments = async () => {
    try {
      const data = await apiClient.get('/producer/payments');
      setData(data);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Error al cargar datos de pagos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenStripeDashboard = async () => {
    setOpeningDashboard(true);
    try {
      const response = await apiClient.post('/producer/stripe/create-login-link', {});
      if (response.url) {
        window.open(response.url, '_blank');
      }
    } catch (error) {
      toast.error('Error al abrir el dashboard de Stripe');
    } finally {
      setOpeningDashboard(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
        <p className="text-text-muted">Error al cargar datos de pagos</p>
        <Button onClick={fetchPayments} variant="outline" className="mt-4">Reintentar</Button>
      </div>
    );
  }

  const commissionPct = Math.round((data.commission_rate || 0.18) * 100);

  return (
    <div className="space-y-6" data-testid="producer-payments-dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-text-primary" data-testid="payments-title">
            Ganancias
          </h1>
          <p className="text-sm text-text-muted mt-0.5">
            Resumen de tus ventas y pagos
          </p>
        </div>
        {data.stripe_connected && (
          <Button
            variant="outline"
            onClick={handleOpenStripeDashboard}
            disabled={openingDashboard}
            className="flex items-center gap-2 self-start"
            data-testid="open-stripe-dashboard"
          >
            {openingDashboard ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ExternalLink className="w-4 h-4" />
            )}
            Dashboard Stripe
          </Button>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          icon={DollarSign}
          label={t('producer.grossSales')}
          value={`${data.total_gross.toFixed(2)}€`}
          sublabel={`${data.paid_orders} pedidos completados`}
          color="blue"
          testId="stat-gross"
        />
        <StatCard
          icon={TrendingUp}
          label={`Tus ganancias (${100 - commissionPct}%)`}
          value={`${data.total_net.toFixed(2)}€`}
          sublabel={t('producer.afterCommission')}
          color="green"
          testId="stat-net"
        />
        <StatCard
          icon={CreditCard}
          label={`Comisión plataforma (${commissionPct}%)`}
          value={`${data.total_platform_fee.toFixed(2)}€`}
          color="amber"
          testId="stat-fees"
        />
        <StatCard
          icon={Wallet}
          label={t('producer.pendingPayout')}
          value={`${data.pending_payout.toFixed(2)}€`}
          sublabel={data.stripe_connected ? 'Stripe conectado' : 'Conecta Stripe'}
          color={data.pending_payout > 0 ? 'green' : 'default'}
          testId="stat-pending"
        />
      </div>

      {/* Stripe Connect Banner (if not connected) */}
      {!data.stripe_connected && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4" data-testid="stripe-connect-banner">
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2.5 bg-amber-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-medium text-amber-900 text-sm">Conecta Stripe para recibir pagos</h3>
              <p className="text-xs text-amber-700 mt-0.5">
                Tus ganancias se acumulan, pero necesitas Stripe Connect para recibir transferencias automáticas.
              </p>
            </div>
          </div>
          <Button
            onClick={async () => {
              try {
                const res = await apiClient.post('/producer/stripe/create-account', {});
                if (res.url) window.location.href = res.url;
                else toast.success('Cuenta de Stripe ya creada');
              } catch (e) {
                toast.error(e.message || 'Error');
              }
            }}
            className="bg-amber-600 hover:bg-amber-700 text-white self-start"
            size="sm"
            data-testid="connect-stripe-cta"
          >
            Conectar Stripe
          </Button>
        </div>
      )}

      {/* Chart + Recent Orders Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
        {/* Monthly Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-stone-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-text-muted" />
            <h2 className="font-medium text-text-primary text-sm">Ventas mensuales</h2>
          </div>
          <MonthlyChart data={data.monthly_summary} />
          <div className="flex items-center gap-4 mt-3 text-xs text-text-muted justify-center">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#d4c5a9]" /> Bruto
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-accent" /> Neto
            </span>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-text-muted" />
              <h2 className="font-medium text-text-primary text-sm">Pedidos recientes</h2>
            </div>
            <span className="text-xs text-text-muted">{data.recent_orders.length} pedidos</span>
          </div>
          <div className="max-h-[400px] overflow-y-auto" data-testid="recent-orders-list">
            {data.recent_orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-text-muted">
                <ShoppingBag className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm">Aún no tienes pedidos</p>
              </div>
            ) : (
              data.recent_orders.map((order) => (
                <OrderRow
                  key={order.order_id}
                  order={order}
                  expanded={expandedOrder === order.order_id}
                  onToggle={() => setExpandedOrder(
                    expandedOrder === order.order_id ? null : order.order_id
                  )}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Monthly Breakdown Table */}
      {data.monthly_summary.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden" data-testid="monthly-breakdown">
          <div className="px-4 py-3 border-b border-stone-100">
            <h2 className="font-medium text-text-primary text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-text-muted" />
              Desglose mensual
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50/80 text-text-muted">
                  <th className="text-left px-4 py-2.5 font-medium">Mes</th>
                  <th className="text-right px-4 py-2.5 font-medium">Pedidos</th>
                  <th className="text-right px-4 py-2.5 font-medium">Bruto</th>
                  <th className="text-right px-4 py-2.5 font-medium">Neto</th>
                </tr>
              </thead>
              <tbody>
                {data.monthly_summary.map((m) => (
                  <tr key={m.month} className="border-t border-stone-100 hover:bg-stone-50/50">
                    <td className="px-4 py-2.5 font-medium text-text-primary">
                      {new Date(m.month + '-01').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                    </td>
                    <td className="text-right px-4 py-2.5 text-text-secondary">{m.orders}</td>
                    <td className="text-right px-4 py-2.5 text-text-secondary">{m.gross.toFixed(2)}€</td>
                    <td className="text-right px-4 py-2.5 font-medium text-emerald-700">{m.net.toFixed(2)}€</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info footer */}
      <div className="bg-stone-50 border border-stone-200 rounded-xl p-5 text-sm text-text-muted">
        <p>
          <strong className="text-text-secondary">Cómo funcionan los pagos:</strong> Cada venta se divide automáticamente.
          Tú recibes el <strong>{100 - commissionPct}%</strong> y la plataforma retiene el <strong>{commissionPct}%</strong> de comisión.
          {data.stripe_connected 
            ? ' Las transferencias se procesan automáticamente a tu cuenta bancaria vía Stripe.'
            : ' Conecta Stripe Connect para activar las transferencias automáticas.'}
        </p>
      </div>
    </div>
  );
}
