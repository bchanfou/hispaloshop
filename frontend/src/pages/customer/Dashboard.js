import React from 'react';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { Button } from '../../components/ui/button';
import { Link } from 'react-router-dom';

export default function CustomerDashboard() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="font-heading text-4xl font-bold text-text-primary mb-8" data-testid="dashboard-title">
          Welcome, {user?.name}
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link to="/orders" className="bg-white p-6 rounded-xl border border-stone-200 hover:shadow-md transition-all" data-testid="orders-card">
            <h3 className="font-heading text-xl font-bold text-text-primary mb-2">My Orders</h3>
            <p className="text-text-muted">View your order history</p>
          </Link>
          <Link to="/profile" className="bg-white p-6 rounded-xl border border-stone-200 hover:shadow-md transition-all" data-testid="profile-card">
            <h3 className="font-heading text-xl font-bold text-text-primary mb-2">Profile</h3>
            <p className="text-text-muted">Manage your preferences</p>
          </Link>
          <Link to="/products" className="bg-white p-6 rounded-xl border border-stone-200 hover:shadow-md transition-all" data-testid="products-card">
            <h3 className="font-heading text-xl font-bold text-text-primary mb-2">Shop</h3>
            <p className="text-text-muted">Browse products</p>
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}