import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { CheckCircle, ArrowLeft, AlertCircle, ShoppingBag, Home } from 'lucide-react';
import BackButton from '../components/BackButton';
import { API } from '../utils/api';
import { useTranslation } from 'react-i18next';



export default function CheckoutSuccessPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState('checking');
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (sessionId) {
      pollPaymentStatus();
    }
  }, [sessionId]);

  const pollPaymentStatus = async () => {
    if (attempts >= 5) {
      setStatus('timeout');
      return;
    }

    try {
      const response = await axios.get(`${API}/payments/checkout-status/${sessionId}`, {
        withCredentials: true
      });

      if (response.data.payment_status === 'paid') {
        setStatus('success');
      } else {
        setAttempts(attempts + 1);
        setTimeout(pollPaymentStatus, 2000);
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Mobile Header */}
      <div className="md:hidden sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-stone-200 safe-area-top">
        <div className="flex items-center h-14 px-4">
          <Link 
            to="/"
            className="p-2 -ml-2 text-text-primary hover:bg-stone-100 rounded-full transition-colors"
            data-testid="mobile-home-btn"
          >
            <Home className="w-5 h-5" />
          </Link>
          <h1 className="flex-1 text-center font-semibold text-text-primary pr-8">
            {status === 'success' ? t('checkout.success', 'Pedido Confirmado') : t('checkout.processing', 'Procesando')}
          </h1>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:block">
        <Header />
      </div>
      <div className="max-w-md mx-auto px-4 pt-2"><BackButton /></div>

      {/* Main Content - Centered */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 md:py-16">
        <div className="w-full max-w-md text-center">
          {status === 'checking' && (
            <div data-testid="payment-checking" className="bg-white p-6 md:p-8 rounded-2xl border border-stone-200 shadow-sm">
              <div className="animate-spin rounded-full h-12 w-12 md:h-16 md:w-16 border-b-2 border-primary mx-auto mb-4 md:mb-6"></div>
              <h1 className="font-heading text-xl md:text-3xl font-bold text-text-primary mb-2 md:mb-4">
                {t('checkout.processing', 'Procesando Pago...')}
              </h1>
              <p className="text-sm md:text-base text-text-muted">
                {t('checkout.pleaseWait', 'Por favor espera mientras confirmamos tu pedido')}
              </p>
            </div>
          )}
          
          {status === 'success' && (
            <div data-testid="payment-success" className="bg-white p-6 md:p-8 rounded-2xl border border-stone-200 shadow-sm">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                <CheckCircle className="w-8 h-8 md:w-10 md:h-10 text-green-600" />
              </div>
              <h1 className="font-heading text-2xl md:text-4xl font-bold text-text-primary mb-2 md:mb-4">
                {t('checkout.orderConfirmed', '¡Pedido Confirmado!')}
              </h1>
              <p className="text-sm md:text-base text-text-secondary mb-6 md:mb-8 px-2">
                {t('checkout.thankYou', 'Gracias por tu compra. Tu pedido ha sido procesado correctamente.')}
              </p>
              
              {/* Action buttons - Stack on mobile, inline on desktop */}
              <div className="flex flex-col md:flex-row gap-3 md:gap-4 md:justify-center">
                <Link to="/dashboard/orders" className="w-full md:w-auto">
                  <Button 
                    className="w-full bg-primary hover:bg-primary-hover text-white rounded-full h-12 md:h-11 text-base md:text-sm font-medium" 
                    data-testid="view-orders-button"
                  >
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    {t('checkout.viewOrders', 'Ver Pedidos')}
                  </Button>
                </Link>
                <Link to="/products" className="w-full md:w-auto">
                  <Button 
                    variant="outline" 
                    className="w-full rounded-full h-12 md:h-11 text-base md:text-sm font-medium border-stone-300" 
                    data-testid="continue-shopping-button"
                  >
                    {t('checkout.continueShopping', 'Seguir Comprando')}
                  </Button>
                </Link>
              </div>
            </div>
          )}
          
          {(status === 'error' || status === 'timeout') && (
            <div data-testid="payment-error" className="bg-white p-6 md:p-8 rounded-2xl border border-stone-200 shadow-sm">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                <AlertCircle className="w-8 h-8 md:w-10 md:h-10 text-red-600" />
              </div>
              <h1 className="font-heading text-xl md:text-3xl font-bold text-text-primary mb-2 md:mb-4">
                {status === 'timeout' 
                  ? t('checkout.timeout', 'Tiempo de espera agotado')
                  : t('checkout.error', 'Error en el Pago')
                }
              </h1>
              <p className="text-sm md:text-base text-text-muted mb-6 md:mb-8 px-2">
                {status === 'timeout'
                  ? t('checkout.timeoutMessage', 'No pudimos confirmar tu pago. Si se realizó el cargo, contacta con soporte.')
                  : t('checkout.errorMessage', 'Hubo un problema procesando tu pago. Por favor, inténtalo de nuevo.')
                }
              </p>
              <div className="flex flex-col md:flex-row gap-3 md:gap-4 md:justify-center">
                <Link to="/cart" className="w-full md:w-auto">
                  <Button 
                    className="w-full bg-primary hover:bg-primary-hover text-white rounded-full h-12 md:h-11 text-base md:text-sm font-medium" 
                    data-testid="back-to-cart-button"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t('checkout.backToCart', 'Volver al Carrito')}
                  </Button>
                </Link>
                <Link to="/" className="w-full md:w-auto">
                  <Button 
                    variant="outline" 
                    className="w-full rounded-full h-12 md:h-11 text-base md:text-sm font-medium border-stone-300" 
                    data-testid="go-home-button"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    {t('common.home', 'Inicio')}
                  </Button>
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
