import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { redirectAfterAuth } from '../lib/navigation';

/**
 * Hook for authentication with automatic role-based redirect
 */
export function useAuthRedirect() {
  const navigate = useNavigate();
  const { login, register, user } = useAuth();

  /**
   * Login with automatic redirect based on user role
   * @param {Object} credentials - {email, password}
   * @param {string} intendedRoute - Optional route to redirect after login (e.g., from ?redirect=/cart)
   */
  const loginWithRedirect = useCallback(async (credentials, intendedRoute = null) => {
    const data = await login(credentials);
    
    if (data?.user) {
      // Check if onboarding is needed for customers
      const needsOnboarding = data.user.role === 'customer' && !data.user.onboarding_completed;
      
      if (needsOnboarding) {
        navigate('/onboarding');
      } else {
        redirectAfterAuth(data.user, navigate, intendedRoute);
      }
    }
    
    return data;
  }, [login, navigate]);

  /**
   * Register with automatic redirect
   * @param {Object} payload - Registration data
   * @param {string} intendedRoute - Optional route to redirect after registration
   */
  const registerWithRedirect = useCallback(async (payload, intendedRoute = null) => {
    const data = await register(payload);
    
    if (data?.user) {
      // New customers go to onboarding first
      if (data.user.role === 'customer') {
        navigate('/onboarding');
      } else {
        redirectAfterAuth(data.user, navigate, intendedRoute);
      }
    }
    
    return data;
  }, [register, navigate]);

  /**
   * Get the appropriate dashboard link for the current user
   */
  const getDashboardLink = useCallback(() => {
    if (!user) return '/login';
    
    switch (user.role) {
      case 'customer':
        return '/dashboard';
      case 'producer':
      case 'importer':
        return '/producer';
      case 'influencer':
        return '/influencer/dashboard';
      case 'admin':
      case 'super_admin':
        return '/admin';
      default:
        return '/dashboard';
    }
  }, [user]);

  return {
    loginWithRedirect,
    registerWithRedirect,
    getDashboardLink,
  };
}

export default useAuthRedirect;
