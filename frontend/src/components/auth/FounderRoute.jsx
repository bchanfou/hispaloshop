import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * FounderRoute — wraps founder-only routes inside the super-admin tree.
 * Assumes the parent ProtectedRoute already enforces super_admin role.
 */
export default function FounderRoute({ children }) {
  const { user, loading, initialized } = useAuth();

  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0c0a09]">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user || user.role !== 'super_admin' || !user.is_founder) {
    return <Navigate to="/super-admin/overview" replace />;
  }
  return children;
}
