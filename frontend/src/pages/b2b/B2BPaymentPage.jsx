import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Shield, Check, AlertCircle } from 'lucide-react';
import apiClient from '../../services/api/client';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';

const V2 = {
  black: '#0A0A0A',
  cream: '#ffffff',
  stone: '#8A8881',
  white: '#FFFFFF',
  border: '#E5E2DA',
  surface: '#F0EDE8',
  green: '#0c0a09',
  greenLight: '#f5f5f4',
  greenBorder: '#d6d3d1',
  fontSans: 'Inter, sans-serif',
  radiusMd: 12,
  radiusFull: 9999,
};

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
              colorPrimary: V2.black,
              fontFamily: V2.fontSans,
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

  /* ── Render helpers ── */

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: V2.cream, fontFamily: V2.fontSans }}>
        <Loader2 size={32} className="animate-spin" style={{ color: V2.stone }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 px-6" style={{ background: V2.cream, fontFamily: V2.fontSans }}>
        <AlertCircle size={32} style={{ color: V2.stone }} />
        <p style={{ color: V2.black, fontSize: 15 }}>{error}</p>
        <button
          onClick={fetchData}
          style={{
            background: V2.black,
            color: V2.white,
            border: 'none',
            borderRadius: V2.radiusFull,
            padding: '10px 28px',
            fontSize: 14,
            fontFamily: V2.fontSans,
            cursor: 'pointer',
          }}
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
    <div className="fixed inset-0 flex flex-col" style={{ background: V2.cream, fontFamily: V2.fontSans }}>
      {/* TopBar */}
      <div
        className="sticky top-0 z-20 flex items-center gap-3 px-4"
        style={{
          height: 56,
          background: 'rgba(247,246,242,0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${V2.border}`,
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
        >
          <ArrowLeft size={20} style={{ color: V2.black }} />
        </button>
        <span style={{ fontSize: 15, fontWeight: 600, color: V2.black }}>
          Pago B2B · #HSP-B2B-{last8}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-10 pt-5" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Section 1: Contract Summary */}
        <div
          style={{
            background: V2.white,
            border: `1px solid ${V2.border}`,
            borderRadius: V2.radiusMd,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: 15, fontWeight: 600, color: V2.black, margin: 0 }}>
                {operation?.product_name}
              </p>
              <p style={{ fontSize: 13, color: V2.stone, margin: '4px 0 0' }}>
                {operation?.quantity} {operation?.unit}
              </p>
            </div>
            <span
              style={{
                background: V2.greenLight,
                color: V2.green,
                borderRadius: V2.radiusFull,
                padding: '3px 10px',
                fontSize: 11,
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              Contrato firmado ✓
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: V2.stone }}>Total bruto</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: V2.black }}>{fmt.format(totalBruto)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: V2.stone }}>Condiciones de pago</span>
            <span style={{ fontSize: 13, color: V2.black }}>
              {PAYMENT_TERMS[operation?.payment_terms] || operation?.payment_terms}
            </span>
          </div>
        </div>

        {/* Section 2: Payment Breakdown */}
        <div
          style={{
            background: V2.white,
            border: `1px solid ${V2.border}`,
            borderRadius: V2.radiusMd,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {isBuyer && (
            <>
              <Row label="Subtotal" value={fmt.format(totalBruto)} />
              <Row label="Fee Stripe (1,4% + 0,25€)" value={`+${fmt.format(stripeFee)}`} />
              <p style={{ fontSize: 10, color: V2.stone, margin: '-6px 0 0 0', paddingLeft: 12 }}>
                ↳ Asumido por el comprador
              </p>
              <hr style={{ border: 'none', borderTop: `1px solid ${V2.border}`, margin: '4px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: V2.black }}>TOTAL A PAGAR</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: V2.black }}>{fmt.format(buyerTotal)}</span>
              </div>
            </>
          )}

          {isSeller && (
            <>
              <Row label="Precio bruto" value={fmt.format(totalBruto)} />
              <Row label="Comisión Hispaloshop (3%)" value={`−${fmt.format(platformFee)}`} />
              <p style={{ fontSize: 10, color: V2.stone, margin: '-6px 0 0 0', paddingLeft: 12 }}>
                ↳ Comisión de plataforma
              </p>
              <hr style={{ border: 'none', borderTop: `1px solid ${V2.border}`, margin: '4px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: V2.black }}>RECIBIRÁS</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: V2.green }}>{fmt.format(sellerReceives)}</span>
              </div>
            </>
          )}
        </div>

        {/* Section 3: Payment Form (buyer only, not yet paid) */}
        {isBuyer && !depositPaid && !paymentSuccess && (
          <div
            style={{
              background: V2.white,
              border: `1px solid ${V2.border}`,
              borderRadius: V2.radiusMd,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div ref={paymentRef} style={{ minHeight: 120 }} />

            <button
              onClick={handlePay}
              disabled={paying}
              style={{
                width: '100%',
                height: 46,
                background: V2.green,
                color: V2.white,
                border: 'none',
                borderRadius: V2.radiusFull,
                fontSize: 15,
                fontWeight: 600,
                fontFamily: V2.fontSans,
                cursor: paying ? 'not-allowed' : 'pointer',
                opacity: paying ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {paying && <Loader2 size={18} className="animate-spin" />}
              Pagar {fmt.format(successAmount ?? buyerTotal)}
            </button>

            <div className="flex items-center justify-center gap-1" style={{ marginTop: -4 }}>
              <Shield size={14} style={{ color: V2.stone }} />
              <span style={{ fontSize: 12, color: V2.stone }}>Pago seguro con Stripe</span>
            </div>
          </div>
        )}

        {/* Section 4: Seller waiting state */}
        {isSeller && !depositPaid && !paymentSuccess && (
          <div
            style={{
              background: V2.surface,
              borderRadius: V2.radiusMd,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              textAlign: 'center',
            }}
          >
            <Loader2 size={32} className="animate-spin" style={{ color: V2.green }} />
            <p style={{ fontSize: 14, color: V2.stone, margin: 0 }}>
              Esperando el pago del comprador...
            </p>
            <p style={{ fontSize: 12, color: V2.stone, margin: 0 }}>
              Recibirás una notificación cuando el pago se procese
            </p>
          </div>
        )}

        {/* Section 5: Payment received */}
        {(depositPaid || paymentSuccess) && (
          <div
            style={{
              background: V2.greenLight,
              border: `1px solid ${V2.greenBorder}`,
              borderRadius: V2.radiusMd,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: V2.green,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Check size={24} style={{ color: V2.white }} />
            </div>

            <p style={{ fontSize: 15, fontWeight: 600, color: V2.black, margin: 0 }}>
              {paymentType === 'deposit' ? '✓ Anticipo recibido' : '✓ Pago recibido'} · {fmt.format(successAmount ?? buyerTotal)}
            </p>

            {paymentType === 'deposit' && (
              <p style={{ fontSize: 12, color: V2.stone, margin: 0 }}>
                Los fondos están retenidos hasta que subas la documentación de envío
              </p>
            )}

            <button
              onClick={() => navigate(`/b2b/tracking/${operationId}`)}
              style={{
                width: '100%',
                height: 46,
                background: V2.black,
                color: V2.white,
                border: 'none',
                borderRadius: V2.radiusFull,
                fontSize: 15,
                fontWeight: 600,
                fontFamily: V2.fontSans,
                cursor: 'pointer',
              }}
            >
              Ir al seguimiento →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Tiny row helper ── */
function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 13, color: V2.stone }}>{label}</span>
      <span style={{ fontSize: 13, color: V2.black }}>{value}</span>
    </div>
  );
}
