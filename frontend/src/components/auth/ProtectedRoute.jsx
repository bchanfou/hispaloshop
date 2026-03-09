import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getDefaultRoute } from '../../lib/navigation';

export default function ProtectedRoute({
  children,
  allowedRoles = [],
  requireOnboarding = true,
}) {
  const { user, loading, initialized } = useAuth();
  const location = useLocation();

  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F1E8]">
        <div className="w-8 h-8 border-2 border-[#2D5A3D] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const onboardingCompleted = Boolean(user.onboarding_completed);
  const isPendingApproval =
    user.approved === false &&
    ['producer', 'importer', 'influencer'].includes(user.role);

  if (isPendingApproval && location.pathname !== '/pending-approval') {
    return <Navigate to="/pending-approval" replace />;
  }

  if (
    requireOnboarding &&
    user.role === 'customer' &&
    !onboardingCompleted &&
    location.pathname !== '/onboarding'
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to={getDefaultRoute(user, onboardingCompleted)} replace />;
  }

  return children;
}
