import React from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="font-heading text-4xl font-bold text-text-primary mb-8" data-testid="admin-dashboard-title">Admin Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl border border-stone-200">
            <h3 className="font-heading text-xl font-bold">Producers</h3>
            <p className="text-text-muted mt-2">Manage producer approvals</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-stone-200">
            <h3 className="font-heading text-xl font-bold">Products</h3>
            <p className="text-text-muted mt-2">Approve products</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-stone-200">
            <h3 className="font-heading text-xl font-bold">Categories</h3>
            <p className="text-text-muted mt-2">Manage categories</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-stone-200">
            <h3 className="font-heading text-xl font-bold">Payments</h3>
            <p className="text-text-muted mt-2">View transactions</p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}