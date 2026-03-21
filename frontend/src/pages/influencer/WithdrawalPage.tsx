// @ts-nocheck
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, CreditCard, Building2, Loader2, Check, AlertTriangle, Info,
} from 'lucide-react';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';
import { useLocale } from '../../context/LocaleContext';

export default function WithdrawalPage() {
  const navigate = useNavigate();
  const { convertAndFormatPrice } = useLocale();
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
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#78716c' }} />
      </div>
    );
  }

  const isSpain = fiscal?.tax_country === 'ES';
  const withholdingPct = fiscal?.withholding_pct || 0;
  const gross = balance;
  const withholding = isSpain ? Math.round(gross * (withholdingPct / 100) * 100) / 100 : 0;
  const isSEPA = ['sepa', 'bank_transfer'].includes(fiscal?.payout_method);
  const transferFee = isSEPA ? 0 : 0.25;
  const netRaw = gross - withholding - transferFee;
  const net = Math.max(0, Math.round(netRaw * 100) / 100);
  const canWithdraw = net >= 20;
  const methodLabel = isSEPA ? 'cuenta bancaria' : 'Stripe';

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      const res = await apiClient.post('/influencer/request-withdrawal', {
        method: isSEPA ? 'bank_transfer' : 'stripe',
      });
      setSuccess({
        net_amount: res.net_amount || net,
        gross_amount: res.gross_amount || gross,
        withholding: res.withholding || withholding,
        method: fiscal?.payout_method || 'stripe',
        transfer_fee: res.transfer_fee || transferFee,
      });
    } catch (err) {
      toast.error(err?.message || err?.detail || 'Error al procesar el cobro. Inténtalo de nuevo.', {
        action: { label: 'Reintentar', onClick: () => handleSubmit() },
      });
    } finally {
      setSubmitting(false);
    }
  }, [isSEPA, net, gross, withholding, fiscal?.payout_method, transferFee]);

  // Success screen
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4" style={{ fontFamily: 'inherit', background: '#fafaf9', minHeight: '100vh' }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5" style={{ background: '#0c0a09' }}>
          <Check className="w-7 h-7" style={{ color: '#fff' }} strokeWidth={2.5} />
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: '#0c0a09' }}>¡Cobro en camino!</h2>
        <p className="text-sm text-center mb-6" style={{ color: '#78716c' }}>
          Transferiremos {convertAndFormatPrice(Number(success.net_amount || 0))} a tu {success.method === 'sepa' ? 'cuenta bancaria' : 'cuenta Stripe'}
        </p>
        <p className="text-xs mb-6" style={{ color: '#78716c' }}>
          {success.method === 'sepa' ? 'Tiempo estimado: 1-3 días hábiles' : 'Tiempo estimado: En minutos'}
        </p>

        <div className="w-full max-w-xs p-4 space-y-2 mb-6" style={{ background: '#f5f5f4', borderRadius: '16px' }}>
          <div className="flex justify-between text-sm">
            <span style={{ color: '#78716c' }}>Bruto</span>
            <span className="font-semibold" style={{ color: '#0c0a09' }}>{convertAndFormatPrice(Number(success.gross_amount || 0))}</span>
          </div>
          {success.withholding > 0 && (
            <div className="flex justify-between text-sm">
              <span style={{ color: '#78716c' }}>Retención IRPF</span>
              <span style={{ color: '#78716c' }}>−{convertAndFormatPrice(Number(success.withholding || 0))}</span>
            </div>
          )}
          {success.transfer_fee > 0 && (
            <div className="flex justify-between text-sm">
              <span style={{ color: '#78716c' }}>Fee transferencia</span>
              <span style={{ color: '#78716c' }}>−{convertAndFormatPrice(Number(success.transfer_fee || 0))}</span>
            </div>
          )}
          <div className="pt-2 flex justify-between text-sm font-bold" style={{ borderTop: '1px solid #e7e5e4' }}>
            <span style={{ color: '#0c0a09' }}>Neto</span>
            <span style={{ color: '#0c0a09' }}>{convertAndFormatPrice(Number(success.net_amount || 0))}</span>
          </div>
          <div className="flex justify-between text-xs pt-1">
            <span style={{ color: '#78716c' }}>Método</span>
            <span style={{ color: '#78716c' }}>{success.method === 'sepa' ? 'SEPA' : 'Stripe'}</span>
          </div>
        </div>

        <button
          onClick={() => navigate('/influencer/dashboard')}
          className="w-full max-w-xs py-3 text-sm font-semibold transition-colors"
          style={{ background: '#0c0a09', color: '#fff', borderRadius: '16px', border: 'none', cursor: 'pointer' }}
        >
          Volver al dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'inherit', background: '#fafaf9', minHeight: '100vh' }}>
      {/* TopBar */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <ArrowLeft className="w-5 h-5" style={{ color: '#0c0a09' }} />
        </button>
        <h1 className="text-lg font-bold" style={{ color: '#0c0a09' }}>Solicitar cobro</h1>
      </div>

      {/* Balance card (dark) */}
      <div className="p-5 mb-5" style={{ background: '#0c0a09', borderRadius: '16px' }}>
        <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Balance disponible</p>
        <p className="text-3xl font-bold mb-1" style={{ color: '#fff' }}>{convertAndFormatPrice(Number(gross || 0))}</p>
        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>Disponible para cobro</p>
      </div>

      {/* Breakdown card */}
      <div className="p-5 mb-5" style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e7e5e4' }}>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span style={{ color: '#78716c' }}>Comisión bruta</span>
            <span className="font-semibold" style={{ color: '#0c0a09' }}>{convertAndFormatPrice(Number(gross || 0))}</span>
          </div>

          {isSpain && (
            <div className="flex justify-between text-sm items-start">
              <div className="flex items-center gap-1">
                <span style={{ color: '#78716c' }}>Retención IRPF ({withholdingPct}%)</span>
              </div>
              <span className="font-semibold" style={{ color: '#78716c' }}>−{convertAndFormatPrice(Number(withholding || 0))}</span>
            </div>
          )}

          <div className="flex justify-between text-sm items-start">
            <div className="flex items-center gap-1">
              <span style={{ color: '#78716c' }} title="La comisión real puede variar según tu método de pago">Fee de transferencia (aprox.)</span>
            </div>
            <span className="font-semibold" style={{ color: transferFee > 0 ? '#78716c' : '#0c0a09' }}>
              {transferFee > 0 ? `−${convertAndFormatPrice(Number(transferFee || 0))}` : convertAndFormatPrice(0)}
            </span>
          </div>

          <div className="pt-3 flex justify-between" style={{ borderTop: '1px solid #e7e5e4' }}>
            <span className="text-sm font-bold" style={{ color: '#0c0a09' }}>RECIBIRÁS</span>
            <span className="text-base font-bold" style={{ color: '#0c0a09' }}>{convertAndFormatPrice(Number(net || 0))}</span>
          </div>
        </div>
      </div>

      {/* Insufficient balance warning */}
      {!canWithdraw && (
        <div className="p-4 mb-5 flex items-start gap-3" style={{ background: '#f5f5f4', borderRadius: '16px', border: '1px solid #d6d3d1' }}>
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#57534e' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: '#0c0a09' }}>Casi llegas</p>
            <p className="text-xs mt-0.5" style={{ color: '#78716c' }}>
              Estás a {convertAndFormatPrice(Math.max(0, 20 - Number(net || 0)))} de poder solicitar tu cobro (mínimo {convertAndFormatPrice(20)} neto)
            </p>
          </div>
        </div>
      )}

      {/* Payout method */}
      <div className="p-4 mb-5 flex items-center justify-between" style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e7e5e4' }}>
        <div className="flex items-center gap-3">
          {isSEPA ? (
            <Building2 className="w-5 h-5" style={{ color: '#78716c' }} />
          ) : (
            <CreditCard className="w-5 h-5" style={{ color: '#78716c' }} />
          )}
          <div>
            <p className="text-sm font-semibold" style={{ color: '#0c0a09' }}>
              {isSEPA ? 'Transferencia SEPA' : 'Stripe'}
            </p>
            <p className="text-xs" style={{ color: '#78716c' }}>
              {isSEPA
                ? `···· ${fiscal?.sepa_iban_last4 || '****'}`
                : 'Cuenta conectada'}
            </p>
          </div>
        </div>
        <Link to="/influencer/fiscal-setup" className="text-xs font-semibold" style={{ color: '#78716c' }}>
          Cambiar
        </Link>
      </div>

      {/* Tax info (ES only) */}
      {isSpain && (
        <div className="p-4 mb-5 flex items-start gap-3" style={{ background: '#f5f5f4', borderRadius: '16px' }}>
          <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#78716c' }} />
          <p className="text-[10px] leading-relaxed" style={{ color: '#78716c' }}>
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
          background: canWithdraw ? '#0c0a09' : '#f5f5f4',
          color: canWithdraw ? '#fff' : '#78716c',
          borderRadius: '16px',
          border: 'none',
          cursor: canWithdraw ? 'pointer' : 'not-allowed',
          height: 46,
        }}
      >
        {submitting ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          `Recibir ${convertAndFormatPrice(Number(net || 0))}`
        )}
      </button>
    </div>
  );
}
