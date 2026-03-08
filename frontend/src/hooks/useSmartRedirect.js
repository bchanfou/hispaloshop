/**
 * Hook para redirección inteligente post-login
 * Según rol y estado de onboarding
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export function useSmartRedirect() {
  const navigate = useNavigate();

  const redirectAfterLogin = useCallback((user) => {
    if (!user) return;

    // 1. Si no ha completado onboarding → /onboarding
    if (!user.onboardingCompleted) {
      navigate('/onboarding', { replace: true });
      return;
    }

    // 2. Si está pendiente de verificación → página de espera
    if (user.approved === false) {
      if (user.role === 'producer' || user.role === 'importer') {
        navigate('/pending-verification', { replace: true });
        return;
      }
    }

    // 3. Redirección según rol
    switch (user.role) {
      case 'admin':
        navigate('/admin', { replace: true });
        break;
      case 'super_admin':
        navigate('/super-admin', { replace: true });
        break;
      case 'producer':
      case 'importer':
        navigate('/producer', { replace: true });
        break;
      case 'influencer':
        navigate('/influencer/dashboard', { replace: true });
        break;
      case 'customer':
      default:
        navigate('/', { replace: true });
        break;
    }
  }, [navigate]);

  return { redirectAfterLogin };
}

export default useSmartRedirect;
