import React from 'react';
import API_BASE_URL from '../../config/api';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

export default function ProducerProducts() {
  return (
    <div className="min-h-screen bg-stone-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-stone-950 mb-8">My Products</h1>
        <p className="text-stone-500">Product management coming soon</p>
      </div>
      <Footer />
    </div>
  );
}
