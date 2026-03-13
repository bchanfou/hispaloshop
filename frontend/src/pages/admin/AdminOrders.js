import React, { useState, useEffect } from 'react';
import apiClient from '../../services/api/client';
import { Input } from '../../components/ui/input';
import { Search, ShoppingBag, DollarSign, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { asLowerText, asNumber } from '../../utils/safe';



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
      console.error('Error fetching data:', error);
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

  const statusColors = {
    pending: 'bg-amber-100 text-amber-800',
    processing: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    shipped: 'bg-purple-100 text-purple-800'
  };

  return (
    <div>
      <h1 className="font-heading text-3xl font-bold text-text-primary mb-2">
        {t('adminOrders.title')}
      </h1>
      <p className="text-text-muted mb-6">{t('adminOrders.subtitle')}</p>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ShoppingBag className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-text-muted">{t('adminOrders.summary.totalOrders')}</p>
              <p className="text-2xl font-bold text-text-primary">{orders.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-text-muted">{t('adminOrders.summary.totalRevenue')}</p>
              <p className="text-2xl font-bold text-text-primary">
                {asNumber(payments.summary?.total_amount).toFixed(2)}€
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-text-muted">{t('adminOrders.summary.platformCommission')}</p>
              <p className="text-2xl font-bold text-text-primary">
                {asNumber(payments.summary?.platform_commission).toFixed(2)}€
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-text-muted">{t('adminOrders.summary.producerPayouts')}</p>
              <p className="text-2xl font-bold text-text-primary">
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
              ? 'text-primary border-b-2 border-primary' 
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          {t('adminOrders.tabs.orders')}
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-4 px-2 font-medium transition-colors ${
            activeTab === 'payments' 
              ? 'text-primary border-b-2 border-primary' 
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          {t('adminOrders.tabs.payments')}
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <Input
          placeholder={activeTab === 'orders' ? t('adminOrders.searchOrdersPlaceholder') : t('adminOrders.searchPaymentsPlaceholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
          data-testid="search-input"
        />
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-text-muted">{t('common.loading')}</div>
        ) : activeTab === 'orders' ? (
          filteredOrders.length === 0 ? (
            <div className="p-8 text-center text-text-muted">{t('adminOrders.noOrders')}</div>
          ) : (
            <table className="w-full" data-testid="orders-table">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-medium text-text-secondary">{t('adminOrders.ordersTable.orderId')}</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-text-secondary">{t('adminOrders.ordersTable.customer')}</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-text-secondary">{t('adminOrders.ordersTable.items')}</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-text-secondary">{t('adminOrders.ordersTable.total')}</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-text-secondary">{t('adminOrders.ordersTable.status')}</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-text-secondary">{t('adminOrders.ordersTable.date')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {filteredOrders.map((order) => (
                  <tr key={order.order_id} className="hover:bg-stone-50">
                    <td className="px-6 py-4">
                      <p className="font-mono text-sm text-text-primary">{order.order_id}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-text-primary">{order.user_name}</p>
                      <p className="text-sm text-text-muted">{order.user_email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-text-primary">{t('adminOrders.ordersTable.itemsCount', { count: order.line_items?.length || 0 })}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-text-primary">{asNumber(order.total_amount).toFixed(2)}€</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColors[order.status] || 'bg-gray-100 text-gray-800'}`}>
                        {t(`adminOrders.status.${order.status}`) || order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-text-muted text-sm">
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
            <div className="p-8 text-center text-text-muted">{t('adminOrders.noPayments')}</div>
          ) : (
            <table className="w-full" data-testid="payments-table">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-medium text-text-secondary">{t('adminOrders.paymentsTable.transactionId')}</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-text-secondary">{t('adminOrders.paymentsTable.orderId')}</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-text-secondary">{t('adminOrders.paymentsTable.amount')}</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-text-secondary">{t('adminOrders.paymentsTable.status')}</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-text-secondary">{t('adminOrders.paymentsTable.date')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {payments.payments.map((payment) => (
                  <tr key={payment.transaction_id} className="hover:bg-stone-50">
                    <td className="px-6 py-4">
                      <p className="font-mono text-sm text-text-primary">{payment.transaction_id}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-mono text-sm text-text-muted">{payment.order_id || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-text-primary">
                        ${asNumber(payment.amount).toFixed(2)} {payment.currency?.toUpperCase()}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                        payment.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {t(`adminOrders.status.${payment.payment_status || payment.status}`) || payment.payment_status || payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-text-muted text-sm">
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
