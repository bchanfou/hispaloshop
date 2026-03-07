import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ConsumerDashboard from './consumer/ConsumerDashboard';
import InfluencerDashboard from './influencer/InfluencerDashboard';
import ProducerDashboard from './producer/ProducerDashboard';
import ImporterDashboard from './importer/ImporterDashboard';

function DashboardPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-stone-300 border-t-stone-700 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Detect role and render appropriate dashboard
  const role = user.role || 'consumer';

  switch (role) {
    case 'influencer':
      return <InfluencerDashboard />;
    case 'producer':
    case 'importer':
      return <ProducerDashboard />;
    case 'admin':
    case 'super_admin':
      return <Navigate to="/admin" replace />;
    case 'consumer':
    default:
      return <ConsumerDashboard />;
  }
}

export default DashboardPage;
