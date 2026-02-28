import React, { useEffect, useState } from 'react';
import API_BASE_URL from '../../config/api';
import axios from 'axios';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

const API = API_BASE_URL;
export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchOrders();
  }, []);
  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders`, { withCredentials: true });
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="font-heading text-4xl font-bold text-text-primary mb-8" data-testid="orders-title">My Orders</h1>
        {loading ? (
          <p className="text-text-muted" data-testid="orders-loading">Loading orders...</p>
        ) : orders.length === 0 ? (
          <p className="text-text-muted" data-testid="no-orders">No orders yet</p>
        ) : (
          <div className="space-y-4" data-testid="orders-list">
            {orders.map((order) => (
              <div key={order.order_id} className="bg-white p-6 rounded-xl border border-stone-200" data-testid={`order-${order.order_id}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="font-bold text-text-primary" data-testid="order-id">Order #{order.order_id}</p>
                    <p className="text-sm text-text-muted" data-testid="order-date">{new Date(order.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    order.status === 'paid' ? 'bg-green-100 text-green-800' :
                    order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                    order.status === 'completed' ? 'bg-primary/10 text-primary' :
                    'bg-stone-100 text-stone-800'
                  }`} data-testid="order-status">                    {order.status}
                  </span>
                </div>
                <div className="space-y-2">
                  {order.line_items?.map((item, idx) => (
                    <p key={idx} className="text-text-secondary text-sm" data-testid={`order-item-${idx}`}>
                      {item.product_name} x {item.quantity}
                    </p>
                  ))}
                <p className="font-bold text-primary mt-4" data-testid="order-total">Total: ${order.total_amount.toFixed(2)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
