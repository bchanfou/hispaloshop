import React from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { useAuth } from '../../context/AuthContext';

export default function ProducerDashboard() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="font-heading text-4xl font-bold text-text-primary mb-4" data-testid="producer-dashboard-title">Producer Dashboard</h1>
        <p className="text-text-muted mb-8">Welcome, {user?.company_name || user?.name}</p>

        {!user?.approved && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8" data-testid="approval-pending">
            <p className="text-yellow-900 font-medium">Your account is pending admin approval.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-stone-200">
            <h3 className="font-heading text-xl font-bold">Products</h3>
            <p className="text-text-muted mt-2">Manage your products</p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-stone-200">
            <h3 className="font-heading text-xl font-bold">Orders</h3>
            <p className="text-text-muted mt-2">View your orders</p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-stone-200">
            <h3 className="font-heading text-xl font-bold">Certificates</h3>
            <p className="text-text-muted mt-2">Manage certificates</p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
