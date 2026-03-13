import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import apiClient from '../services/api/client';

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
      const data = await apiClient.post('/auth/forgot-password', { email });
      if (data?.email_delivery_available === false) {
        toast.error('El servicio de email no esta configurado. No podremos enviar enlaces de recuperacion todavia.');
        return;
      }
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
            <div className="bg-white p-6 md:p-8 rounded-[28px] border border-stone-200 shadow-sm text-center" data-testid="email-sent-card">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                <CheckCircle className="w-8 h-8 md:w-10 md:h-10 text-stone-700" />
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-stone-950 mb-3 md:mb-4">
                {t('forgotPassword.checkEmail', 'Revisa tu Email')}
              </h1>
              <p className="text-sm md:text-base text-stone-600 mb-2">
                {t('forgotPassword.emailSentTo', 'Si existe una cuenta con')} <strong className="text-stone-950">{email}</strong>
              </p>
              <p className="text-sm md:text-base text-stone-600 mb-4 md:mb-6">
                {t('forgotPassword.receiveLinkSoon', 'recibirás un enlace de recuperación en breve.')}
              </p>
              <p className="text-xs md:text-sm text-stone-500 mb-6 md:mb-8 px-2">
                {t('forgotPassword.checkSpam', '¿No recibiste el email? Revisa tu carpeta de spam o intenta de nuevo en unos minutos.')}
              </p>
              <Link to="/login" className="block">
                <button
                  type="button"
                  className="w-full rounded-full bg-stone-950 h-12 md:h-11 text-base md:text-sm font-medium text-white transition-colors hover:bg-stone-800"
                  data-testid="back-to-login-btn"
                >
                  {t('forgotPassword.backToLogin', 'Volver al Login')}
                </button>
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
            className="hidden md:inline-flex items-center text-stone-500 hover:text-stone-950 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('forgotPassword.backToLogin', 'Volver al Login')}
          </Link>

          <div className="bg-white p-6 md:p-8 rounded-[28px] border border-stone-200 shadow-sm" data-testid="forgot-password-form">
            {/* Icon - Mobile only */}
            <div className="md:hidden w-14 h-14 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-6 h-6 text-stone-950" />
            </div>

            <h1 className="text-xl md:text-3xl font-bold text-stone-950 mb-1 md:mb-2 text-center md:text-left">
              {t('forgotPassword.title', '¿Olvidaste tu Contraseña?')}
            </h1>
            <p className="text-sm md:text-base text-stone-500 mb-6 md:mb-8 text-center md:text-left">
              {t('forgotPassword.description', 'Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.')}
            </p>

            <form onSubmit={handleSubmit}>
              <div className="mb-5 md:mb-6">
                <label className="block text-sm font-medium text-stone-950 mb-2">
                  {t('auth.email', 'Email')}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500 md:hidden" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    required
                    className="w-full pl-10 md:pl-3 h-12 md:h-10 text-base md:text-sm rounded-2xl border border-stone-200 bg-white outline-none focus:border-stone-950 transition-colors"
                    data-testid="email-input"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-stone-950 h-12 md:h-11 text-base md:text-sm font-medium text-white shadow-sm transition-all duration-300 hover:bg-stone-800 active:scale-[0.98] disabled:opacity-50"
                data-testid="submit-btn"
              >
                {loading ? t('common.loading', 'Enviando...') : t('auth.sendResetLink', 'Enviar Enlace')}
              </button>
            </form>

            {/* Mobile login link */}
            <div className="mt-6 text-center md:hidden">
              <Link to="/login" className="text-sm text-stone-600 hover:text-stone-950 font-medium transition-colors">
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
