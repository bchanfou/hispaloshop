import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Check, ArrowLeft, AlertCircle, ShoppingBag, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import apiClient from '../services/api/client';



export default function CheckoutSuccessPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    if (!sessionId) { setStatus('error'); return; }

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
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-cream)' }}>
      {/* Main Content - Centered */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 md:py-16">
        <div className="w-full max-w-md text-center">
          {status === 'checking' && (
            <div
              data-testid="payment-checking"
              className="p-6 md:p-8"
              style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }}
            >
              <div
                className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-4 md:mb-6 animate-spin rounded-full"
                style={{ borderWidth: 2, borderStyle: 'solid', borderColor: 'var(--color-border)', borderTopColor: 'var(--color-black)' }}
              ></div>
              <h1
                className="text-[18px] md:text-[22px] font-semibold mb-2 md:mb-4"
                style={{ color: 'var(--color-black)', fontFamily: 'var(--font-sans)' }}
              >
                {t('checkout.processing', 'Procesando Pago...')}
              </h1>
              <p className="text-sm md:text-base" style={{ color: 'var(--color-stone)' }}>
                {t('checkout.pleaseWait', 'Por favor espera mientras confirmamos tu pedido')}
              </p>
            </div>
          )}

          {status === 'success' && (
            <div
              data-testid="payment-success"
              className="p-6 md:p-8"
              style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }}
            >
              <div
                className="flex items-center justify-center mx-auto mb-4 md:mb-6"
                style={{
                  width: 64,
                  height: 64,
                  background: 'var(--color-green)',
                  borderRadius: '50%',
                  boxShadow: '0 0 0 8px var(--color-green-light)',
                }}
              >
                <Check className="w-8 h-8" style={{ color: '#fff' }} strokeWidth={2.5} />
              </div>
              <h1
                className="text-[20px] md:text-[24px] font-semibold mb-2 md:mb-4"
                style={{ color: 'var(--color-black)', fontFamily: 'var(--font-sans)' }}
              >
                {t('checkout.orderConfirmed', '¡Pedido Confirmado!')}
              </h1>
              <p className="text-sm md:text-base mb-6 md:mb-8 px-2" style={{ color: 'var(--color-stone)' }}>
                {t('checkout.thankYou', 'Gracias por tu compra. Tu pedido ha sido procesado correctamente.')}
              </p>

              {/* Action buttons - Stack on mobile, inline on desktop */}
              <div className="flex flex-col md:flex-row gap-3 md:gap-4 md:justify-center">
                <Link
                  to="/dashboard/orders"
                  className="flex w-full items-center justify-center gap-2 py-3 text-[14px] font-semibold transition-colors md:w-auto md:px-6"
                  style={{
                    background: 'var(--color-black)',
                    color: '#fff',
                    borderRadius: 'var(--radius-full)',
                  }}
                  data-testid="view-orders-button"
                >
                  <ShoppingBag className="w-4 h-4" />
                  {t('checkout.viewOrders', 'Ver Pedidos')}
                </Link>
                <Link
                  to="/products"
                  className="flex w-full items-center justify-center gap-2 py-3 text-[14px] font-semibold transition-colors md:w-auto md:px-6"
                  style={{
                    background: 'var(--color-white)',
                    color: 'var(--color-black)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-full)',
                  }}
                  data-testid="continue-shopping-button"
                >
                  {t('checkout.continueShopping', 'Seguir Comprando')}
                </Link>
              </div>
            </div>
          )}

          {(status === 'error' || status === 'timeout') && (
            <div
              data-testid="payment-error"
              className="p-6 md:p-8"
              style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }}
            >
              <div
                className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center mx-auto mb-4 md:mb-6"
                style={{ background: 'var(--color-surface)', borderRadius: '50%' }}
              >
                <AlertCircle className="w-8 h-8 md:w-10 md:h-10" style={{ color: 'var(--color-stone)' }} />
              </div>
              <h1
                className="text-[18px] md:text-[22px] font-semibold mb-2 md:mb-4"
                style={{ color: 'var(--color-black)', fontFamily: 'var(--font-sans)' }}
              >
                {status === 'timeout'
                  ? t('checkout.timeout', 'Tiempo de espera agotado')
                  : t('checkout.error', 'Error en el Pago')
                }
              </h1>
              <p className="text-sm md:text-base mb-6 md:mb-8 px-2" style={{ color: 'var(--color-stone)' }}>
                {status === 'timeout'
                  ? t('checkout.timeoutMessage', 'No pudimos confirmar tu pago. Si se realizó el cargo, contacta con soporte.')
                  : t('checkout.errorMessage', 'Hubo un problema procesando tu pago. Por favor, inténtalo de nuevo.')
                }
              </p>
              <div className="flex flex-col md:flex-row gap-3 md:gap-4 md:justify-center">
                <Link
                  to="/cart"
                  className="flex w-full items-center justify-center gap-2 py-3 text-[14px] font-semibold transition-colors md:w-auto md:px-6"
                  style={{
                    background: 'var(--color-black)',
                    color: '#fff',
                    borderRadius: 'var(--radius-full)',
                  }}
                  data-testid="back-to-cart-button"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t('checkout.backToCart', 'Volver al Carrito')}
                </Link>
                <Link
                  to="/"
                  className="flex w-full items-center justify-center gap-2 py-3 text-[14px] font-semibold transition-colors md:w-auto md:px-6"
                  style={{
                    background: 'var(--color-white)',
                    color: 'var(--color-black)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-full)',
                  }}
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
    </div>
  );
}
