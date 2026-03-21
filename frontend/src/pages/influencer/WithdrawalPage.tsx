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
        <Loader2 className="w-6 h-6 animate-spin text-stone-500" />
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
      <div className="flex flex-col items-center justify-center py-16 px-4 bg-stone-50 min-h-screen">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5 bg-stone-950">
          <Check className="w-7 h-7 text-white" strokeWidth={2.5} />
        </div>
        <h2 className="text-xl font-bold mb-2 text-stone-950">¡Cobro en camino!</h2>
        <p className="text-sm text-center mb-6 text-stone-500">
          Transferiremos {convertAndFormatPrice(Number(success.net_amount || 0))} a tu {success.method === 'sepa' ? 'cuenta bancaria' : 'cuenta Stripe'}
        </p>
        <p className="text-xs mb-6 text-stone-500">
          {success.method === 'sepa' ? 'Tiempo estimado: 1-3 días hábiles' : 'Tiempo estimado: En minutos'}
        </p>

        <div className="w-full max-w-xs p-4 space-y-2 mb-6 bg-stone-100 rounded-2xl">
          <div className="flex justify-between text-sm">
            <span className="text-stone-500">Bruto</span>
            <span className="font-semibold text-stone-950">{convertAndFormatPrice(Number(success.gross_amount || 0))}</span>
          </div>
          {success.withholding > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Retención IRPF</span>
              <span className="text-stone-500">−{convertAndFormatPrice(Number(success.withholding || 0))}</span>
            </div>
          )}
          {success.transfer_fee > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Fee transferencia</span>
              <span className="text-stone-500">−{convertAndFormatPrice(Number(success.transfer_fee || 0))}</span>
            </div>
          )}
          <div className="pt-2 flex justify-between text-sm font-bold border-t border-stone-200">
            <span className="text-stone-950">Neto</span>
            <span className="text-stone-950">{convertAndFormatPrice(Number(success.net_amount || 0))}</span>
          </div>
          <div className="flex justify-between text-xs pt-1">
            <span className="text-stone-500">Método</span>
            <span className="text-stone-500">{success.method === 'sepa' ? 'SEPA' : 'Stripe'}</span>
          </div>
        </div>

        <button
          onClick={() => navigate('/influencer/dashboard')}
          className="w-full max-w-xs py-3 text-sm font-semibold transition-colors bg-stone-950 text-white rounded-full border-none cursor-pointer"
        >
          Volver al dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="bg-stone-50 min-h-screen">
      {/* TopBar */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="bg-transparent border-none cursor-pointer">
          <ArrowLeft className="w-5 h-5 text-stone-950" />
        </button>
        <h1 className="text-lg font-bold text-stone-950">Solicitar cobro</h1>
      </div>

      <div className="max-w-[600px] mx-auto px-4">
        {/* Balance card (dark) */}
        <div className="p-5 mb-5 bg-stone-950 rounded-2xl">
          <p className="text-[9px] uppercase tracking-wider mb-1 text-white/45">Balance disponible</p>
          <p className="text-3xl font-bold mb-1 text-white">{convertAndFormatPrice(Number(gross || 0))}</p>
          <p className="text-[10px] text-white/50">Disponible para cobro</p>
        </div>

        {/* Breakdown card */}
        <div className="p-5 mb-5 bg-white rounded-2xl border border-stone-200">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Comisión bruta</span>
              <span className="font-semibold text-stone-950">{convertAndFormatPrice(Number(gross || 0))}</span>
            </div>

            {isSpain && (
              <div className="flex justify-between text-sm items-start">
                <div className="flex items-center gap-1">
                  <span className="text-stone-500">Retención IRPF ({withholdingPct}%)</span>
                </div>
                <span className="font-semibold text-stone-500">−{convertAndFormatPrice(Number(withholding || 0))}</span>
              </div>
            )}

            <div className="flex justify-between text-sm items-start">
              <div className="flex items-center gap-1">
                <span className="text-stone-500" title="La comisión real puede variar según tu método de pago">Fee de transferencia (aprox.)</span>
              </div>
              <span className={`font-semibold ${transferFee > 0 ? 'text-stone-500' : 'text-stone-950'}`}>
                {transferFee > 0 ? `−${convertAndFormatPrice(Number(transferFee || 0))}` : convertAndFormatPrice(0)}
              </span>
            </div>

            <div className="pt-3 flex justify-between border-t border-stone-200">
              <span className="text-sm font-bold text-stone-950">RECIBIRÁS</span>
              <span className="text-base font-bold text-stone-950">{convertAndFormatPrice(Number(net || 0))}</span>
            </div>
          </div>
        </div>

        {/* Insufficient balance warning */}
        {!canWithdraw && (
          <div className="p-4 mb-5 flex items-start gap-3 bg-stone-100 rounded-2xl border border-stone-300">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-stone-600" />
            <div>
              <p className="text-sm font-semibold text-stone-950">Casi llegas</p>
              <p className="text-xs mt-0.5 text-stone-500">
                Estás a {convertAndFormatPrice(Math.max(0, 20 - Number(net || 0)))} de poder solicitar tu cobro (mínimo {convertAndFormatPrice(20)} neto)
              </p>
            </div>
          </div>
        )}

        {/* Payout method */}
        <div className="p-4 mb-5 flex items-center justify-between bg-white rounded-2xl border border-stone-200">
          <div className="flex items-center gap-3">
            {isSEPA ? (
              <Building2 className="w-5 h-5 text-stone-500" />
            ) : (
              <CreditCard className="w-5 h-5 text-stone-500" />
            )}
            <div>
              <p className="text-sm font-semibold text-stone-950">
                {isSEPA ? 'Transferencia SEPA' : 'Stripe'}
              </p>
              <p className="text-xs text-stone-500">
                {isSEPA
                  ? `···· ${fiscal?.sepa_iban_last4 || '****'}`
                  : 'Cuenta conectada'}
              </p>
            </div>
          </div>
          <Link to="/influencer/fiscal-setup" className="text-xs font-semibold text-stone-500">
            Cambiar
          </Link>
        </div>

        {/* Tax info (ES only) */}
        {isSpain && (
          <div className="p-4 mb-5 flex items-start gap-3 bg-stone-100 rounded-2xl">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-stone-500" />
            <p className="text-[10px] leading-relaxed text-stone-500">
              Este cobro será declarado por Hispaloshop SL como rendimiento de actividad económica.
              Recibirás un certificado de retenciones en enero para tu declaración de la renta.
            </p>
          </div>
        )}

        {/* Confirm button */}
        <button
          onClick={handleSubmit}
          disabled={!canWithdraw || submitting}
          className={`w-full h-12 text-sm font-semibold transition-colors mb-8 flex items-center justify-center gap-2 rounded-full border-none ${
            canWithdraw
              ? 'bg-stone-950 text-white cursor-pointer'
              : 'bg-stone-100 text-stone-500 cursor-not-allowed'
          }`}
        >
          {submitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            `Recibir ${convertAndFormatPrice(Number(net || 0))}`
          )}
        </button>
      </div>
    </div>
  );
}
