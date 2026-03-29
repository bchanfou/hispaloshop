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
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="w-8 h-8 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
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

  const PENDING_ALLOWED = ['/pending-approval', '/producer/verification', '/influencer/fiscal-setup'];
  if (isPendingApproval && !PENDING_ALLOWED.includes(location.pathname)) {
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
