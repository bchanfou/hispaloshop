// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { CheckCircle, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../services/api/client';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const verificationCode = searchParams.get('code');
  const token = searchParams.get('token');
  const verificationValue = verificationCode || token;
  const verificationParam = verificationCode ? 'code' : 'token';
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (verificationValue) {
      verifyEmail();
    } else {
      setStatus('error');
      setMessage('No se proporcionó un código de verificación');
    }
  }, [verificationValue]);

  const verifyEmail = async () => {
    try {
      const data = await apiClient.post(`/auth/verify-email?${verificationParam}=${encodeURIComponent(verificationValue)}`);
      setStatus('success');
      setMessage(data.message || '¡Email verificado correctamente!');
      toast.success('Email verificado. Ya puedes iniciar sesión.');

      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      setStatus('error');
      setMessage(error.message || 'La verificación falló. El enlace puede haber expirado.');
      toast.error('Error en la verificación');
    }
  };

  const mobileTitle =
    status === 'verifying' ? 'Verificando email' :
    status === 'success'   ? 'Email verificado' :
    'Verificación fallida';

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {/* Mobile Header */}
      <div className="md:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 safe-area-top">
        <div className="flex items-center h-14 px-4">
          <button
            onClick={() => navigate('/login')}
            className="p-2 -ml-2 text-stone-950 hover:bg-stone-100 rounded-full transition-colors"
            data-testid="mobile-back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center font-medium text-stone-950 pr-8">
            {mobileTitle}
          </h1>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:block">
        <Header />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-6 md:py-12">
        <div className="w-full max-w-md">

          {status === 'verifying' && (
            <div className="bg-white p-6 md:p-8 rounded-[28px] border border-stone-200 shadow-sm text-center" data-testid="verifying-card">
              <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Loader2 className="w-8 h-8 text-stone-950 animate-spin" />
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-stone-950 mb-3">
                Verificando email...
              </h1>
              <p className="text-sm text-stone-500">
                Por favor espera mientras verificamos tu dirección de email
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="bg-white p-6 md:p-8 rounded-[28px] border border-stone-200 shadow-sm text-center" data-testid="success-card">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                <CheckCircle className="w-8 h-8 md:w-10 md:h-10 text-stone-700" />
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-stone-950 mb-3 md:mb-4">
                ¡Email verificado!
              </h1>
              <p className="text-sm md:text-base text-stone-600 mb-2">{message}</p>
              <p className="text-xs md:text-sm text-stone-500 mb-6 md:mb-8">
                Redirigiendo al login...
              </p>
              <Link
                to="/login"
                className="flex w-full items-center justify-center rounded-full bg-stone-950 h-12 md:h-11 text-base md:text-sm font-medium text-white transition-colors hover:bg-stone-800"
                data-testid="go-to-login-btn"
              >
                Ir al Login
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="bg-white p-6 md:p-8 rounded-[28px] border border-stone-200 shadow-sm text-center" data-testid="error-card">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                <AlertCircle className="w-8 h-8 md:w-10 md:h-10 text-stone-700" />
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-stone-950 mb-3 md:mb-4">
                Verificación fallida
              </h1>
              <p className="text-sm md:text-base text-stone-600 mb-6 md:mb-8">{message}</p>
              <div className="flex flex-col gap-3">
                <Link
                  to="/register"
                  className="flex w-full items-center justify-center rounded-full bg-stone-950 h-12 md:h-11 text-base md:text-sm font-medium text-white transition-colors hover:bg-stone-800"
                  data-testid="register-again-btn"
                >
                  Registrarse de nuevo
                </Link>
                <Link
                  to="/login"
                  className="flex w-full items-center justify-center rounded-full border border-stone-200 h-12 md:h-11 text-base md:text-sm font-medium text-stone-950 transition-colors hover:bg-stone-50"
                  data-testid="go-to-login-btn"
                >
                  Ir al Login
                </Link>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Footer - Hidden on mobile */}
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}
