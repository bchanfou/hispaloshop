/**
 * ProtectedRoute - Protege rutas privadas
 * Verifica: autenticación, onboarding completado, roles permitidos
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ 
  children, 
  allowedRoles = [],
  requireOnboarding = true 
}) {
  const { user, loading, initialized } = useAuth();
  const location = useLocation();

  // Esperar a que se verifique la sesión
  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F1E8]">
        <div className="w-8 h-8 border-2 border-[#2D5A3D] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // No autenticado → login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Verificar onboarding (excepto si estamos en /onboarding)
  if (requireOnboarding && 
      !user.onboardingCompleted && 
      location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  // Verificar roles
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirigir según rol
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'super_admin') return <Navigate to="/super-admin" replace />;
    if (user.role === 'producer' || user.role === 'importer') return <Navigate to="/producer" replace />;
    if (user.role === 'influencer') return <Navigate to="/influencer/dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
}
