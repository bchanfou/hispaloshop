// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Shield, Check, AlertCircle } from 'lucide-react';
import apiClient from '../../services/api/client';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';

const fmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

const PAYMENT_TERMS = {
  prepaid: '100% adelantado',
  net_30: 'Net 30 días',
  net_60: 'Net 60 días',
  letter_of_credit: 'Carta de crédito',
};

let stripeLoader;
function loadStripeJs() {
  if (window.Stripe) return Promise.resolve(window.Stripe);
  if (!stripeLoader) {
    stripeLoader = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.async = true;
      script.onload = () => resolve(window.Stripe);
      script.onerror = () => reject(new Error('Failed to load Stripe'));
      document.body.appendChild(script);
    });
  }
  return stripeLoader;
}

export default function B2BPaymentPage() {
  const { operationId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const paymentType = searchParams.get('type') || 'deposit';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [operation, setOperation] = useState(null);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [paying, setPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [successAmount, setSuccessAmount] = useState(null);

  const paymentRef = useRef(null);
  const stripeRef = useRef(null);
  const elementsRef = useRef(null);

  const isBuyer = user?._id === operation?.buyer_id;
  const isSeller = user?._id === operation?.seller_id;
  const last8 = operationId ? String(operationId).slice(-8) : '';

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [opRes, piRes] = await Promise.all([
        apiClient.get(`/b2b/operations/${operationId}`),
        apiClient.get(`/b2b/operations/${operationId}/payment-info`),
      ]);
      setOperation(opRes.data);
      setPaymentInfo(piRes.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar los datos de pago');
    } finally {
      setLoading(false);
    }
  }, [operationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* Stripe setup for buyer */
  useEffect(() => {
    if (!operation || !paymentInfo || !isBuyer || paymentSuccess) return;
    if (operation.payment_status === 'paid' || operation.payment_status === 'deposit_paid') {
      setPaymentSuccess(true);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const StripeFactory = await loadStripeJs();
        if (cancelled) return;

        const { data } = await apiClient.post(`/b2b/operations/${operationId}/pay`, {
          payment_type: paymentType,
        });
        if (cancelled) return;

        const stripe = StripeFactory(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);
        stripeRef.current = stripe;

        const elements = stripe.elements({
          clientSecret: data.client_secret,
          appearance: {
            theme: 'stripe',
            variables: {
              colorPrimary: '#0A0A0A',
              fontFamily: 'Inter, sans-serif',
              borderRadius: '12px',
            },
          },
        });
        elementsRef.current = elements;

        const paymentElement = elements.create('payment');
        if (paymentRef.current) paymentElement.mount(paymentRef.current);

        setSuccessAmount(data.amount);
      } catch (err) {
        if (!cancelled) {
          toast.error('No se pudo inicializar el pago');
        }
      }
    })();

    return () => { cancelled = true; };
  }, [operation, paymentInfo, isBuyer, operationId, paymentType, paymentSuccess]);

  const handlePay = async () => {
    if (!stripeRef.current || !elementsRef.current) return;
    setPaying(true);
    try {
      const { error: stripeError } = await stripeRef.current.confirmPayment({
        elements: elementsRef.current,
        confirmParams: {
          return_url: `${window.location.origin}/b2b/tracking/${operationId}`,
        },
      });
      if (stripeError) {
        toast.error(stripeError.message);
      }
    } catch (err) {
      toast.error('Error al procesar el pago');
    } finally {
      setPaying(false);
    }
  };

  /* -- Render helpers -- */

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white font-sans">
        <Loader2 size={32} className="animate-spin text-stone-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 px-6 bg-white font-sans">
        <AlertCircle size={32} className="text-stone-500" />
        <p className="text-stone-950 text-[15px]">{error}</p>
        <button
          onClick={fetchData}
          className="bg-stone-950 text-white border-none rounded-full px-7 py-2.5 text-sm cursor-pointer"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const totalBruto = paymentInfo?.subtotal ?? 0;
  const stripeFee = paymentInfo?.stripe_fee ?? 0;
  const platformFee = paymentInfo?.platform_fee ?? 0;
  const buyerTotal = paymentInfo?.buyer_total ?? 0;
  const sellerReceives = paymentInfo?.seller_receives ?? 0;
  const depositPaid = operation?.payment_status === 'deposit_paid' || operation?.payment_status === 'paid';

  return (
    <div className="fixed inset-0 flex flex-col bg-white font-sans">
      {/* TopBar */}
      <div className="sticky top-0 z-20 flex items-center gap-3 px-4 h-14 bg-white/85 backdrop-blur-xl border-b border-stone-200">
        <button
          onClick={() => navigate(-1)}
          className="bg-transparent border-none cursor-pointer p-1"
        >
          <ArrowLeft size={20} className="text-stone-950" />
        </button>
        <span className="text-[15px] font-semibold text-stone-950">
          Pago B2B · #HSP-B2B-{last8}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-10 pt-5 flex flex-col gap-4">

        {/* Section 1: Contract Summary */}
        <div className="bg-white border border-stone-200 rounded-xl p-5 flex flex-col gap-3">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[15px] font-semibold text-stone-950 m-0">
                {operation?.product_name}
              </p>
              <p className="text-[13px] text-stone-500 mt-1 mb-0">
                {operation?.quantity} {operation?.unit}
              </p>
            </div>
            <span className="bg-stone-100 text-stone-950 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap">
              Contrato firmado ✓
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[13px] text-stone-500">Total bruto</span>
            <span className="text-sm font-semibold text-stone-950">{fmt.format(totalBruto)}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[13px] text-stone-500">Condiciones de pago</span>
            <span className="text-[13px] text-stone-950">
              {PAYMENT_TERMS[operation?.payment_terms] || operation?.payment_terms}
            </span>
          </div>
        </div>

        {/* Section 2: Payment Breakdown */}
        <div className="bg-white border border-stone-200 rounded-xl p-5 flex flex-col gap-2.5">
          {isBuyer && (
            <>
              <Row label="Subtotal" value={fmt.format(totalBruto)} />
              <Row label="Fee Stripe (1,4% + 0,25€)" value={`+${fmt.format(stripeFee)}`} />
              <p className="text-[10px] text-stone-500 -mt-1.5 pl-3 m-0">
                ↳ Asumido por el comprador
              </p>
              <hr className="border-none border-t border-stone-200 my-1" />
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-stone-950">TOTAL A PAGAR</span>
                <span className="text-[15px] font-bold text-stone-950">{fmt.format(buyerTotal)}</span>
              </div>
            </>
          )}

          {isSeller && (
            <>
              <Row label="Precio bruto" value={fmt.format(totalBruto)} />
              <Row label="Comisión Hispaloshop (3%)" value={`−${fmt.format(platformFee)}`} />
              <p className="text-[10px] text-stone-500 -mt-1.5 pl-3 m-0">
                ↳ Comisión de plataforma
              </p>
              <hr className="border-none border-t border-stone-200 my-1" />
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-stone-950">RECIBIRÁS</span>
                <span className="text-[15px] font-bold text-stone-950">{fmt.format(sellerReceives)}</span>
              </div>
            </>
          )}
        </div>

        {/* Section 3: Payment Form (buyer only, not yet paid) */}
        {isBuyer && !depositPaid && !paymentSuccess && (
          <div className="bg-white border border-stone-200 rounded-xl p-5 flex flex-col gap-4">
            <div ref={paymentRef} className="min-h-[120px]" />

            <button
              onClick={handlePay}
              disabled={paying}
              className="w-full h-[46px] bg-stone-950 text-white border-none rounded-full text-[15px] font-semibold cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {paying && <Loader2 size={18} className="animate-spin" />}
              Pagar {fmt.format(successAmount ?? buyerTotal)}
            </button>

            <div className="flex items-center justify-center gap-1 -mt-1">
              <Shield size={14} className="text-stone-500" />
              <span className="text-xs text-stone-500">Pago seguro con Stripe</span>
            </div>
          </div>
        )}

        {/* Section 4: Seller waiting state */}
        {isSeller && !depositPaid && !paymentSuccess && (
          <div className="bg-stone-100 rounded-xl p-5 flex flex-col items-center gap-3 text-center">
            <Loader2 size={32} className="animate-spin text-stone-950" />
            <p className="text-sm text-stone-500 m-0">
              Esperando el pago del comprador...
            </p>
            <p className="text-xs text-stone-500 m-0">
              Recibirás una notificación cuando el pago se procese
            </p>
          </div>
        )}

        {/* Section 5: Payment received */}
        {(depositPaid || paymentSuccess) && (
          <div className="bg-stone-100 border border-stone-300 rounded-xl p-5 flex flex-col items-center gap-3 text-center">
            <div className="w-11 h-11 rounded-full bg-stone-950 flex items-center justify-center">
              <Check size={24} className="text-white" />
            </div>

            <p className="text-[15px] font-semibold text-stone-950 m-0">
              {paymentType === 'deposit' ? '✓ Anticipo recibido' : '✓ Pago recibido'} · {fmt.format(successAmount ?? buyerTotal)}
            </p>

            {paymentType === 'deposit' && (
              <p className="text-xs text-stone-500 m-0">
                Los fondos están retenidos hasta que subas la documentación de envío
              </p>
            )}

            <button
              onClick={() => navigate(`/b2b/tracking/${operationId}`)}
              className="w-full h-[46px] bg-stone-950 text-white border-none rounded-full text-[15px] font-semibold cursor-pointer"
            >
              Ir al seguimiento →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* -- Tiny row helper -- */
function Row({ label, value }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[13px] text-stone-500">{label}</span>
      <span className="text-[13px] text-stone-950">{value}</span>
    </div>
  );
}
