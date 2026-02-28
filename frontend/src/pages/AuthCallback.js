import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useRef } from 'react';
import { API } from '../utils/api';



export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();
  const hasProcessed = useRef(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Prevent double execution in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      try {
        // Extract session_id from URL fragment
        const hash = location.hash;
        const params = new URLSearchParams(hash.substring(1));
        const sessionId = params.get('session_id');

        if (!sessionId) {
          setError('No session ID found');
          return;
        }

        // Call backend to exchange session_id
        const response = await axios.get(`${API}/auth/session`, {
          headers: { 'X-Session-ID': sessionId },
          withCredentials: true
        });

        // Set user and navigate
        const userData = response.data.user;
        setUser(userData);

        // Set cookie
        document.cookie = `session_token=${response.data.session_token}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=none; secure`;

        // Navigate based on role
        if (userData.role === 'admin') {
          navigate('/admin/dashboard', { replace: true, state: { user: userData } });
        } else if (userData.role === 'producer') {
          navigate('/producer/dashboard', { replace: true, state: { user: userData } });
        } else {
          navigate('/dashboard', { replace: true, state: { user: userData } });
        }
      } catch (error) {
        console.error('Auth error:', error);
        setError('Authentication failed');
        setTimeout(() => navigate('/login', { replace: true }), 2000);
      }
    };

    processAuth();
  }, [location.hash, navigate, setUser]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center" data-testid="auth-callback-page">
      <div className="text-center">
        {error ? (
          <div>
            <p className="text-red-600 mb-2" data-testid="auth-error">{error}</p>
            <p className="text-text-muted">Redirecting to login...</p>
          </div>
        ) : (
          <div>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" data-testid="auth-loading"></div>
            <p className="text-text-muted">Completing sign in...</p>
          </div>
        )}
      </div>
    </div>
  );
}