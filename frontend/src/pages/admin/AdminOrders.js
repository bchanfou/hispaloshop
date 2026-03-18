import React, { useState, useEffect } from 'react';
import apiClient from '../../services/api/client';
import { Search, ShoppingBag, DollarSign, TrendingUp, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { asLowerText, asNumber } from '../../utils/safe';
import { toast } from 'sonner';



export default function AdminOrders() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState({ payments: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('orders');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [ordersData, paymentsData] = await Promise.all([
        apiClient.get('/admin/orders'),
        apiClient.get('/admin/payments'),
      ]);
      setOrders(ordersData);
      setPayments(paymentsData);
    } catch (error) {
      // Sentry captures this automatically
    } finally {
      setLoading(false);
    }
  };

  const searchNeedle = asLowerText(searchTerm);
  const filteredOrders = orders.filter(o => 
    asLowerText(o.order_id).includes(searchNeedle) ||
    asLowerText(o.user_email).includes(searchNeedle) ||
    asLowerText(o.user_name).includes(searchNeedle)
  );

  const exportCSV = () => {
    const headers = ['Order ID', 'Customer', 'Items', 'Total', 'Status', 'Date'];
    const rows = filteredOrders.map(o => [
      o.order_id,
      `${o.user_name || ''} <${o.user_email || ''}>`,
      o.line_items?.length || 0,
      asNumber(o.total_amount).toFixed(2),
      o.status,
      o.created_at ? new Date(o.created_at).toLocaleDateString() : 'N/A',
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orders.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado');
  };

  const statusColors = {
    pending: 'bg-stone-200 text-stone-700',
    processing: 'bg-stone-200 text-stone-700',
    completed: 'bg-stone-950 text-white',
    cancelled: 'border border-stone-200 text-stone-400 bg-white',
    shipped: 'bg-stone-200 text-stone-700'
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-stone-950 mb-2">
        {t('adminOrders.title')}
      </h1>
      <p className="text-stone-500 mb-6">{t('adminOrders.subtitle')}</p>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-stone-100 rounded-xl">
              <ShoppingBag className="w-5 h-5 text-stone-700" />
            </div>
            <div>
              <p className="text-sm text-stone-500">{t('adminOrders.summary.totalOrders')}</p>
              <p className="text-2xl font-bold text-stone-950">{orders.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-stone-100 rounded-xl">
              <DollarSign className="w-5 h-5 text-stone-700" />
            </div>
            <div>
              <p className="text-sm text-stone-500">{t('adminOrders.summary.totalRevenue')}</p>
              <p className="text-2xl font-bold text-stone-950">
                {asNumber(payments.summary?.total_amount).toFixed(2)}€
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-stone-100 rounded-xl">
              <TrendingUp className="w-5 h-5 text-stone-700" />
            </div>
            <div>
              <p className="text-sm text-stone-500">{t('adminOrders.summary.platformCommission')}</p>
              <p className="text-2xl font-bold text-stone-950">
                {asNumber(payments.summary?.platform_commission).toFixed(2)}€
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-stone-100 rounded-xl">
              <DollarSign className="w-5 h-5 text-stone-700" />
            </div>
            <div>
              <p className="text-sm text-stone-500">{t('adminOrders.summary.producerPayouts')}</p>
              <p className="text-2xl font-bold text-stone-950">
                {asNumber(payments.summary?.producer_share).toFixed(2)}€
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-stone-200">
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-4 px-2 font-medium transition-colors ${
            activeTab === 'orders'
              ? 'text-stone-950 border-b-2 border-stone-950'
              : 'text-stone-500 hover:text-stone-950'
          }`}
        >
          {t('adminOrders.tabs.orders')}
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-4 px-2 font-medium transition-colors ${
            activeTab === 'payments'
              ? 'text-stone-950 border-b-2 border-stone-950'
              : 'text-stone-500 hover:text-stone-950'
          }`}
        >
          {t('adminOrders.tabs.payments')}
        </button>
      </div>

      {/* Search + Export */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
          <input
            type="text"
            placeholder={activeTab === 'orders' ? t('adminOrders.searchOrdersPlaceholder') : t('adminOrders.searchPaymentsPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-stone-200 rounded-xl bg-white text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950"
            data-testid="search-input"
          />
        </div>
        {activeTab === 'orders' && (
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors text-stone-700 shrink-0"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
        )}
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-stone-500">{t('common.loading')}</div>
        ) : activeTab === 'orders' ? (
          filteredOrders.length === 0 ? (
            <div className="p-8 text-center text-stone-500">{t('adminOrders.noOrders')}</div>
          ) : (
            <table className="w-full" data-testid="orders-table">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-medium text-stone-600">{t('adminOrders.ordersTable.orderId')}</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-stone-600">{t('adminOrders.ordersTable.customer')}</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-stone-600">{t('adminOrders.ordersTable.items')}</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-stone-600">{t('adminOrders.ordersTable.total')}</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-stone-600">{t('adminOrders.ordersTable.status')}</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-stone-600">{t('adminOrders.ordersTable.date')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {filteredOrders.map((order) => (
                  <tr key={order.order_id} className="hover:bg-stone-50">
                    <td className="px-6 py-4">
                      <p className="font-mono text-sm text-stone-950">{order.order_id}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-stone-950">{order.user_name}</p>
                      <p className="text-sm text-stone-500">{order.user_email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-stone-950">{t('adminOrders.ordersTable.itemsCount', { count: order.line_items?.length || 0 })}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-stone-950">{asNumber(order.total_amount).toFixed(2)}€</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColors[order.status] || 'bg-stone-100 text-stone-700'}`}>
                        {t(`adminOrders.status.${order.status}`) || order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-stone-500 text-sm">
                        {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A'}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          payments.payments?.length === 0 ? (
            <div className="p-8 text-center text-stone-500">{t('adminOrders.noPayments')}</div>
          ) : (
            <table className="w-full" data-testid="payments-table">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-medium text-stone-600">{t('adminOrders.paymentsTable.transactionId')}</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-stone-600">{t('adminOrders.paymentsTable.orderId')}</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-stone-600">{t('adminOrders.paymentsTable.amount')}</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-stone-600">{t('adminOrders.paymentsTable.status')}</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-stone-600">{t('adminOrders.paymentsTable.date')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {payments.payments.map((payment) => (
                  <tr key={payment.transaction_id} className="hover:bg-stone-50">
                    <td className="px-6 py-4">
                      <p className="font-mono text-sm text-stone-950">{payment.transaction_id}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-mono text-sm text-stone-500">{payment.order_id || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-stone-950">
                        ${asNumber(payment.amount).toFixed(2)} {payment.currency?.toUpperCase()}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${['paid', 'succeeded', 'completed'].includes(payment.payment_status || payment.status) ? 'bg-stone-950 text-white' : ['pending', 'processing'].includes(payment.payment_status || payment.status) ? 'bg-stone-200 text-stone-700' : 'border border-stone-200 text-stone-400 bg-white'}`}>
                        {t(`adminOrders.status.${payment.payment_status || payment.status}`) || payment.payment_status || payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-stone-500 text-sm">
                        {payment.created_at ? new Date(payment.created_at).toLocaleDateString() : 'N/A'}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  );
}
