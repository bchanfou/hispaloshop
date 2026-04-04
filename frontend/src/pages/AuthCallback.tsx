// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRef } from 'react';
import { redirectAfterAuth } from '../lib/navigation';
import { useTranslation } from 'react-i18next';

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { checkAuth } = useAuth();
  const { t } = useTranslation();
  const hasProcessed = useRef(false);
  const timerRef = useRef(null);
  const [error, setError] = useState(null);
  useEffect(() => () => clearTimeout(timerRef.current), []);

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
          timerRef.current = setTimeout(() => navigate('/login', { replace: true }), 3000);
          return;
        }

        if (token) {
          const user = await checkAuth();
          if (user) {
            if (!user.onboarding_completed) {
              if (user.role === 'customer') navigate('/onboarding', { replace: true });
              else if (user.role === 'producer') navigate('/producer/verification', { replace: true });
              else if (user.role === 'influencer') navigate('/influencer/fiscal-setup', { replace: true });
              else if (user.role === 'importer') navigate('/producer/verification', { replace: true });
              else navigate('/', { replace: true });
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
          if (!user.onboarding_completed) {
            if (user.role === 'customer') navigate('/onboarding', { replace: true });
            else if (user.role === 'producer') navigate('/producer/verification', { replace: true });
            else if (user.role === 'influencer') navigate('/influencer/fiscal-setup', { replace: true });
            else if (user.role === 'importer') navigate('/importer/dashboard', { replace: true });
            else navigate('/', { replace: true });
          } else {
            redirectAfterAuth(user, navigate);
          }
          return;
        }
        navigate('/login', { replace: true });

      } catch (error) {
        setError('Authentication failed');
        timerRef.current = setTimeout(() => navigate('/login', { replace: true }), 2000);
      }
    };

    processAuth();
  }, [location, navigate, checkAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center" data-testid="auth-callback-page">
      <div className="text-center">
        {error ? (
          <div>
            <p className="text-stone-950 mb-2" data-testid="auth-error">{error}</p>
            <p className="text-stone-500">Redirigiendo...</p>
          </div>
        ) : (
          <div>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-950 mx-auto mb-4" data-testid="auth-loading"></div>
            <p className="text-stone-500">{t('auth_callback.completandoInicioDeSesion', 'Completando inicio de sesión...')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
