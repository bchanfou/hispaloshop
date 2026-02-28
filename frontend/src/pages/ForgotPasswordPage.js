import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { API } from '../utils/api';
import { useTranslation } from 'react-i18next';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      toast.error(t('forgotPassword.invalidEmail', 'Por favor ingresa un email válido'));
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/auth/forgot-password`, { email });
      setEmailSent(true);
      toast.success(t('forgotPassword.emailSent', '¡Email de recuperación enviado!'));
    } catch (error) {
      // Always show success message to prevent email enumeration
      setEmailSent(true);
    } finally {
      setLoading(false);
    }
  };

  // Email sent confirmation screen
  if (emailSent) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Mobile Header */}
        <div className="md:hidden sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-stone-200 safe-area-top">
          <div className="flex items-center h-14 px-4">
            <button 
              onClick={() => navigate('/login')}
              className="p-2 -ml-2 text-text-primary hover:bg-stone-100 rounded-full transition-colors"
              data-testid="mobile-back-btn"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="flex-1 text-center font-semibold text-text-primary pr-8">
              {t('forgotPassword.checkEmail', 'Revisa tu Email')}
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
            <div className="bg-white p-6 md:p-8 rounded-2xl border border-stone-200 shadow-sm text-center" data-testid="email-sent-card">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                <CheckCircle className="w-8 h-8 md:w-10 md:h-10 text-green-600" />
              </div>
              <h1 className="font-heading text-xl md:text-2xl font-bold text-text-primary mb-3 md:mb-4">
                {t('forgotPassword.checkEmail', 'Revisa tu Email')}
              </h1>
              <p className="text-sm md:text-base text-text-secondary mb-2">
                {t('forgotPassword.emailSentTo', 'Si existe una cuenta con')} <strong className="text-text-primary">{email}</strong>
              </p>
              <p className="text-sm md:text-base text-text-secondary mb-4 md:mb-6">
                {t('forgotPassword.receiveLinkSoon', 'recibirás un enlace de recuperación en breve.')}
              </p>
              <p className="text-xs md:text-sm text-text-muted mb-6 md:mb-8 px-2">
                {t('forgotPassword.checkSpam', '¿No recibiste el email? Revisa tu carpeta de spam o intenta de nuevo en unos minutos.')}
              </p>
              <Link to="/login" className="block">
                <Button 
                  className="w-full bg-primary hover:bg-primary-hover text-white rounded-full h-12 md:h-11 text-base md:text-sm font-medium"
                  data-testid="back-to-login-btn"
                >
                  {t('forgotPassword.backToLogin', 'Volver al Login')}
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Footer - Hidden on mobile */}
        <div className="hidden md:block">
          <Footer />
        </div>
      </div>
    );
  }

  // Main form screen
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Mobile Header */}
      <div className="md:hidden sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-stone-200 safe-area-top">
        <div className="flex items-center h-14 px-4">
          <button 
            onClick={() => navigate('/login')}
            className="p-2 -ml-2 text-text-primary hover:bg-stone-100 rounded-full transition-colors"
            data-testid="mobile-back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center font-semibold text-text-primary pr-8">
            {t('forgotPassword.titleShort', 'Recuperar Contraseña')}
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
          {/* Desktop back link */}
          <Link 
            to="/login" 
            className="hidden md:inline-flex items-center text-text-muted hover:text-text-primary mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('forgotPassword.backToLogin', 'Volver al Login')}
          </Link>

          <div className="bg-white p-6 md:p-8 rounded-2xl border border-stone-200 shadow-sm" data-testid="forgot-password-form">
            {/* Icon - Mobile only */}
            <div className="md:hidden w-14 h-14 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-6 h-6 text-text-primary" />
            </div>
            
            <h1 className="font-heading text-xl md:text-3xl font-bold text-text-primary mb-1 md:mb-2 text-center md:text-left">
              {t('forgotPassword.title', '¿Olvidaste tu Contraseña?')}
            </h1>
            <p className="text-sm md:text-base text-text-muted mb-6 md:mb-8 text-center md:text-left">
              {t('forgotPassword.description', 'Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.')}
            </p>

            <form onSubmit={handleSubmit}>
              <div className="mb-5 md:mb-6">
                <label className="block text-sm font-medium text-text-primary mb-2">
                  {t('auth.email', 'Email')}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted md:hidden" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    required
                    className="pl-10 md:pl-3 h-12 md:h-10 text-base md:text-sm rounded-xl md:rounded-lg"
                    data-testid="email-input"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-hover text-white rounded-full h-12 md:h-11 text-base md:text-sm font-medium shadow-sm hover:shadow-md transition-all duration-300 active:scale-[0.98]"
                data-testid="submit-btn"
              >
                {loading ? t('common.loading', 'Enviando...') : t('auth.sendResetLink', 'Enviar Enlace')}
              </Button>
            </form>

            {/* Mobile login link */}
            <div className="mt-6 text-center md:hidden">
              <Link to="/login" className="text-sm text-primary hover:text-primary-hover font-medium">
                {t('forgotPassword.backToLogin', 'Volver al Login')}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer - Hidden on mobile */}
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}
