// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRef } from 'react';
import { redirectAfterAuth } from '../lib/navigation';

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { checkAuth } = useAuth();
  const hasProcessed = useRef(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Prevent double execution in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      try {
        // Check for token in URL (from our Google OAuth callback)
        const params = new URLSearchParams(location.search);
        const authError = params.get('error');
        const token = params.get('token');

        if (authError) {
          setError(authError);
          setTimeout(() => navigate('/login', { replace: true }), 3000);
          return;
        }

        if (token) {
          const user = await checkAuth();
          if (user) {
            const needsOnboarding = user.role === 'customer' && !user.onboarding_completed;
            if (needsOnboarding) {
              navigate('/onboarding', { replace: true });
            } else {
              redirectAfterAuth(user, navigate);
            }
            return;
          }
          throw new Error('Google session was not established');
        }

        // No token found - check if user is already authenticated
        const user = await checkAuth();
        if (user) {
          const needsOnboarding = user.role === 'customer' && !user.onboarding_completed;
          if (needsOnboarding) {
            navigate('/onboarding', { replace: true });
          } else {
            redirectAfterAuth(user, navigate);
          }
          return;
        }
        navigate('/login', { replace: true });

      } catch (error) {
        setError('Authentication failed');
        setTimeout(() => navigate('/login', { replace: true }), 2000);
      }
    };

    processAuth();
  }, [location, navigate, checkAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center" data-testid="auth-callback-page">
      <div className="text-center">
        {error ? (
          <div>
            <p className="text-stone-700 mb-2" data-testid="auth-error">{error}</p>
            <p className="text-stone-500">Redirigiendo...</p>
          </div>
        ) : (
          <div>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-950 mx-auto mb-4" data-testid="auth-loading"></div>
            <p className="text-stone-500">Completando inicio de sesión...</p>
          </div>
        )}
      </div>
    </div>
  );
}
