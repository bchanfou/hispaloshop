import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Check, ArrowLeft, AlertCircle, ShoppingBag, Home } from 'lucide-react';
import BackButton from '../components/BackButton';
import { useTranslation } from 'react-i18next';
import apiClient from '../services/api/client';



export default function CheckoutSuccessPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;
    let attempt = 0;
    const MAX_ATTEMPTS = 8;
    const INTERVAL_MS = 2500;

    const poll = async () => {
      if (cancelled) return;
      if (attempt >= MAX_ATTEMPTS) {
        setStatus('timeout');
        return;
      }
      attempt++;
      try {
        const data = await apiClient.get(`/payments/checkout-status/${sessionId}`);
        if (data.payment_status === 'paid' || data.status === 'paid') {
          if (!cancelled) setStatus('success');
        } else if (!cancelled) {
          setTimeout(poll, INTERVAL_MS);
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        if (!cancelled) setStatus('error');
      }
    };

    poll();
    return () => { cancelled = true; };
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Mobile Header */}
      <div className="md:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 safe-area-top">
        <div className="flex items-center h-14 px-4">
          <Link
            to="/"
            className="p-2 -ml-2 text-stone-800 hover:bg-stone-100 rounded-full transition-colors"
            data-testid="mobile-home-btn"
          >
            <Home className="w-5 h-5" />
          </Link>
          <h1 className="flex-1 text-center text-[15px] font-semibold text-stone-950 pr-8">
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
              <div className="animate-spin rounded-full h-12 w-12 md:h-16 md:w-16 border-b-2 border-stone-950 mx-auto mb-4 md:mb-6"></div>
              <h1 className="text-[18px] md:text-[22px] font-semibold text-stone-950 mb-2 md:mb-4">
                {t('checkout.processing', 'Procesando Pago...')}
              </h1>
              <p className="text-sm md:text-base text-stone-500">
                {t('checkout.pleaseWait', 'Por favor espera mientras confirmamos tu pedido')}
              </p>
            </div>
          )}
          
          {status === 'success' && (
            <div data-testid="payment-success" className="bg-white p-6 md:p-8 rounded-2xl border border-stone-200 shadow-sm">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-stone-950 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 ring-8 ring-stone-200">
                <Check className="w-10 h-10 md:w-12 md:h-12 text-white" strokeWidth={2.5} />
              </div>
              <h1 className="text-[20px] md:text-[24px] font-semibold text-stone-950 mb-2 md:mb-4">
                {t('checkout.orderConfirmed', '¡Pedido Confirmado!')}
              </h1>
              <p className="text-sm md:text-base text-stone-600 mb-6 md:mb-8 px-2">
                {t('checkout.thankYou', 'Gracias por tu compra. Tu pedido ha sido procesado correctamente.')}
              </p>
              
              {/* Action buttons - Stack on mobile, inline on desktop */}
              <div className="flex flex-col md:flex-row gap-3 md:gap-4 md:justify-center">
                <Link
                  to="/dashboard/orders"
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-stone-950 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-stone-800 md:w-auto md:px-6"
                  data-testid="view-orders-button"
                >
                  <ShoppingBag className="w-4 h-4" />
                  {t('checkout.viewOrders', 'Ver Pedidos')}
                </Link>
                <Link
                  to="/products"
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-stone-200 py-3 text-[14px] font-semibold text-stone-950 transition-colors hover:bg-stone-50 md:w-auto md:px-6"
                  data-testid="continue-shopping-button"
                >
                  {t('checkout.continueShopping', 'Seguir Comprando')}
                </Link>
              </div>
            </div>
          )}
          
          {(status === 'error' || status === 'timeout') && (
            <div data-testid="payment-error" className="bg-white p-6 md:p-8 rounded-2xl border border-stone-200 shadow-sm">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                <AlertCircle className="w-8 h-8 md:w-10 md:h-10 text-stone-700" />
              </div>
              <h1 className="text-[18px] md:text-[22px] font-semibold text-stone-950 mb-2 md:mb-4">
                {status === 'timeout'
                  ? t('checkout.timeout', 'Tiempo de espera agotado')
                  : t('checkout.error', 'Error en el Pago')
                }
              </h1>
              <p className="text-sm md:text-base text-stone-500 mb-6 md:mb-8 px-2">
                {status === 'timeout'
                  ? t('checkout.timeoutMessage', 'No pudimos confirmar tu pago. Si se realizó el cargo, contacta con soporte.')
                  : t('checkout.errorMessage', 'Hubo un problema procesando tu pago. Por favor, inténtalo de nuevo.')
                }
              </p>
              <div className="flex flex-col md:flex-row gap-3 md:gap-4 md:justify-center">
                <Link
                  to="/cart"
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-stone-950 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-stone-800 md:w-auto md:px-6"
                  data-testid="back-to-cart-button"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t('checkout.backToCart', 'Volver al Carrito')}
                </Link>
                <Link
                  to="/"
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-stone-200 py-3 text-[14px] font-semibold text-stone-950 transition-colors hover:bg-stone-50 md:w-auto md:px-6"
                  data-testid="go-home-button"
                >
                  <Home className="w-4 h-4" />
                  {t('common.home', 'Inicio')}
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
