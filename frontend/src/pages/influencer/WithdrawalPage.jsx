import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, CreditCard, Building2, Loader2, Check, AlertTriangle, Info,
} from 'lucide-react';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';

export default function WithdrawalPage() {
  const navigate = useNavigate();
  const [fiscal, setFiscal] = useState(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null); // null | { net_amount, method, ... }

  useEffect(() => {
    Promise.all([
      apiClient.get('/influencer/fiscal/status').catch(() => null),
      apiClient.get('/influencer/dashboard').catch(() => null),
    ]).then(([f, d]) => {
      setFiscal(f);
      setBalance(d?.payment_schedule?.available_to_withdraw || d?.available_balance || 0);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-stone)' }} />
      </div>
    );
  }

  const isSpain = fiscal?.tax_country === 'ES';
  const withholdingPct = fiscal?.withholding_pct || 0;
  const gross = balance;
  const withholding = isSpain ? Math.round(gross * (withholdingPct / 100) * 100) / 100 : 0;
  const transferFee = fiscal?.payout_method === 'sepa' ? 0 : 0.25;
  const net = Math.max(0, Math.round((gross - withholding - transferFee) * 100) / 100);
  const canWithdraw = net >= 20;
  const methodLabel = fiscal?.payout_method === 'sepa' ? 'cuenta bancaria' : 'Stripe';

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await apiClient.post('/influencer/request-withdrawal', {
        method: fiscal?.payout_method === 'sepa' ? 'bank_transfer' : 'stripe',
      });
      setSuccess({
        net_amount: res.net_amount || net,
        gross_amount: res.gross_amount || gross,
        withholding: res.withholding || withholding,
        method: fiscal?.payout_method || 'stripe',
        transfer_fee: res.transfer_fee || transferFee,
      });
    } catch (err) {
      toast.error(err?.message || err?.detail || 'Error al procesar el cobro');
    } finally {
      setSubmitting(false);
    }
  };

  // Success screen
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4" style={{ fontFamily: 'var(--font-sans)', background: 'var(--color-cream)', minHeight: '100vh' }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5" style={{ background: 'var(--color-green)' }}>
          <Check className="w-7 h-7" style={{ color: '#fff' }} strokeWidth={2.5} />
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-black)' }}>¡Cobro en camino!</h2>
        <p className="text-sm text-center mb-6" style={{ color: 'var(--color-stone)' }}>
          Transferiremos {success.net_amount.toFixed(2)}€ a tu {success.method === 'sepa' ? 'cuenta bancaria' : 'cuenta Stripe'}
        </p>
        <p className="text-xs mb-6" style={{ color: 'var(--color-stone)' }}>
          {success.method === 'sepa' ? 'Tiempo estimado: 1-3 días hábiles' : 'Tiempo estimado: En minutos'}
        </p>

        <div className="w-full max-w-xs p-4 space-y-2 mb-6" style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)' }}>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--color-stone)' }}>Bruto</span>
            <span className="font-semibold" style={{ color: 'var(--color-black)' }}>{success.gross_amount.toFixed(2)}€</span>
          </div>
          {success.withholding > 0 && (
            <div className="flex justify-between text-sm">
              <span style={{ color: 'var(--color-stone)' }}>Retención IRPF</span>
              <span style={{ color: 'var(--color-red)' }}>−{success.withholding.toFixed(2)}€</span>
            </div>
          )}
          {success.transfer_fee > 0 && (
            <div className="flex justify-between text-sm">
              <span style={{ color: 'var(--color-stone)' }}>Fee transferencia</span>
              <span style={{ color: 'var(--color-red)' }}>−{success.transfer_fee.toFixed(2)}€</span>
            </div>
          )}
          <div className="pt-2 flex justify-between text-sm font-bold" style={{ borderTop: '1px solid var(--color-border)' }}>
            <span style={{ color: 'var(--color-black)' }}>Neto</span>
            <span style={{ color: 'var(--color-green)' }}>{success.net_amount.toFixed(2)}€</span>
          </div>
          <div className="flex justify-between text-xs pt-1">
            <span style={{ color: 'var(--color-stone)' }}>Método</span>
            <span style={{ color: 'var(--color-stone)' }}>{success.method === 'sepa' ? 'SEPA' : 'Stripe'}</span>
          </div>
        </div>

        <button
          onClick={() => navigate('/influencer/dashboard')}
          className="w-full max-w-xs py-3 text-sm font-semibold transition-colors"
          style={{ background: 'var(--color-black)', color: '#fff', borderRadius: 'var(--radius-xl)', border: 'none', cursor: 'pointer' }}
        >
          Volver al dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'var(--font-sans)', background: 'var(--color-cream)', minHeight: '100vh' }}>
      {/* TopBar */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <ArrowLeft className="w-5 h-5" style={{ color: 'var(--color-black)' }} />
        </button>
        <h1 className="text-lg font-bold" style={{ color: 'var(--color-black)' }}>Solicitar cobro</h1>
      </div>

      {/* Balance card (dark) */}
      <div className="p-5 mb-5" style={{ background: 'var(--color-black)', borderRadius: 'var(--radius-xl)' }}>
        <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Balance disponible</p>
        <p className="text-3xl font-bold mb-1" style={{ color: '#fff' }}>{gross.toFixed(2)}€</p>
        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>Disponible para cobro</p>
      </div>

      {/* Breakdown card */}
      <div className="p-5 mb-5" style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--color-stone)' }}>Comisión bruta</span>
            <span className="font-semibold" style={{ color: 'var(--color-black)' }}>{gross.toFixed(2)}€</span>
          </div>

          {isSpain && (
            <div className="flex justify-between text-sm items-start">
              <div className="flex items-center gap-1">
                <span style={{ color: 'var(--color-stone)' }}>Retención IRPF ({withholdingPct}%)</span>
              </div>
              <span className="font-semibold" style={{ color: 'var(--color-red)' }}>−{withholding.toFixed(2)}€</span>
            </div>
          )}

          <div className="flex justify-between text-sm items-start">
            <div className="flex items-center gap-1">
              <span style={{ color: 'var(--color-stone)' }}>Fee de transferencia</span>
            </div>
            <span className="font-semibold" style={{ color: transferFee > 0 ? 'var(--color-red)' : 'var(--color-green)' }}>
              {transferFee > 0 ? `−${transferFee.toFixed(2)}€` : '0€'}
            </span>
          </div>

          <div className="pt-3 flex justify-between" style={{ borderTop: '1px solid var(--color-border)' }}>
            <span className="text-sm font-bold" style={{ color: 'var(--color-black)' }}>RECIBIRÁS</span>
            <span className="text-base font-bold" style={{ color: 'var(--color-green)' }}>{net.toFixed(2)}€</span>
          </div>
        </div>
      </div>

      {/* Insufficient balance warning */}
      {!canWithdraw && (
        <div className="p-4 mb-5 flex items-start gap-3" style={{ background: 'var(--color-amber-light)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-amber)' }}>
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--color-amber)' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-black)' }}>Balance insuficiente</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-stone)' }}>
              Mínimo 20€ neto para solicitar cobro · Te faltan {(20 - net).toFixed(2)}€
            </p>
          </div>
        </div>
      )}

      {/* Payout method */}
      <div className="p-4 mb-5 flex items-center justify-between" style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-3">
          {fiscal?.payout_method === 'sepa' ? (
            <Building2 className="w-5 h-5" style={{ color: 'var(--color-stone)' }} />
          ) : (
            <CreditCard className="w-5 h-5" style={{ color: 'var(--color-stone)' }} />
          )}
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-black)' }}>
              {fiscal?.payout_method === 'sepa' ? 'Transferencia SEPA' : 'Stripe'}
            </p>
            <p className="text-xs" style={{ color: 'var(--color-stone)' }}>
              {fiscal?.payout_method === 'sepa'
                ? `···· ${fiscal?.sepa_iban_last4 || '****'}`
                : 'Cuenta conectada'}
            </p>
          </div>
        </div>
        <Link to="/influencer/fiscal-setup" className="text-xs font-semibold" style={{ color: 'var(--color-stone)' }}>
          Cambiar
        </Link>
      </div>

      {/* Tax info (ES only) */}
      {isSpain && (
        <div className="p-4 mb-5 flex items-start gap-3" style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)' }}>
          <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--color-stone)' }} />
          <p className="text-[10px] leading-relaxed" style={{ color: 'var(--color-stone)' }}>
            Este cobro será declarado por Hispaloshop SL como rendimiento de actividad económica.
            Recibirás un certificado de retenciones en enero para tu declaración de la renta.
          </p>
        </div>
      )}

      {/* Confirm button — GREEN (payment action) */}
      <button
        onClick={handleSubmit}
        disabled={!canWithdraw || submitting}
        className="w-full py-3.5 text-sm font-semibold transition-colors mb-8 flex items-center justify-center gap-2"
        style={{
          background: canWithdraw ? 'var(--color-green)' : 'var(--color-surface)',
          color: canWithdraw ? '#fff' : 'var(--color-stone)',
          borderRadius: 'var(--radius-xl)',
          border: 'none',
          cursor: canWithdraw ? 'pointer' : 'not-allowed',
          height: 46,
        }}
      >
        {submitting ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          `Recibir ${net.toFixed(2)}€`
        )}
      </button>
    </div>
  );
}
