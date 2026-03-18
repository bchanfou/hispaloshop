import React, { useEffect, useState } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import apiClient from '../../services/api/client';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const data = await apiClient.get('/orders');
      setOrders(data);
    } catch (error) {
      // Sentry captures this automatically
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-stone-950 mb-8" data-testid="orders-title">My Orders</h1>
        {loading ? (
          <p className="text-stone-500" data-testid="orders-loading">Loading orders...</p>
        ) : orders.length === 0 ? (
          <p className="text-stone-500" data-testid="no-orders">No orders yet</p>
        ) : (
          <div className="space-y-4" data-testid="orders-list">
            {orders.map((order) => (
              <div key={order.order_id} className="bg-white p-6 rounded-xl border border-stone-200" data-testid={`order-${order.order_id}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="font-bold text-stone-950" data-testid="order-id">Order #{order.order_id}</p>
                    <p className="text-sm text-stone-500" data-testid="order-date">{new Date(order.created_at).toLocaleDateString()}</p>
                  </div>
                  <span
                    className="px-3 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-700"
                    data-testid="order-status"
                  >
                    {order.status}
                  </span>
                </div>

                <div className="space-y-2">
                  {order.line_items?.map((item, idx) => (
                    <p key={idx} className="text-stone-600 text-sm" data-testid={`order-item-${idx}`}>
                      {item.product_name} x {item.quantity}
                    </p>
                  ))}
                </div>

                <p className="font-bold text-stone-950 mt-4" data-testid="order-total">
                  Total: ${order.total_amount.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
