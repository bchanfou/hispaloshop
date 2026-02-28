import React from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

export default function AdminProducers() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="font-heading text-4xl font-bold text-text-primary mb-8">Producer Management</h1>
        <p className="text-text-muted">Producer approval system coming soon</p>
      </div>
      <Footer />
    </div>
  );
}