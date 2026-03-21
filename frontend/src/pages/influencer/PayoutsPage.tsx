// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, CreditCard, Loader2, Wallet, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import apiClient from '../../services/api/client';
import { useLocale } from '../../context/LocaleContext';

export default function PayoutsPage() {
  const { convertAndFormatPrice } = useLocale();
  const [payouts, setPayouts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loadingPayouts, setLoadingPayouts] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [withholdingSummary, setWithholdingSummary] = useState(null);
  const [payoutPage, setPayoutPage] = useState(1);
  const PAYOUTS_PER_PAGE = 10;

  const fetchPayouts = useCallback(async () => {
    try {
      const data = await apiClient.get('/influencer/payouts');
      setPayouts(Array.isArray(data?.payouts) ? data.payouts : []);
    } catch {
      setPayouts([]);
    } finally {
      setLoadingPayouts(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const data = await apiClient.get('/influencer/stats');
      setStats(data);
    } catch {
      setStats(null);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    fetchPayouts();
    fetchStats();
    // Fetch fiscal withholding summary
    apiClient.get('/influencer/fiscal/withholding-summary')
      .then(setWithholdingSummary)
      .catch(() => setWithholdingSummary(null));
  }, [fetchPayouts, fetchStats]);

  const connectStripe = async () => {
    setConnectingStripe(true);
    try {
      const data = await apiClient.post('/influencer/stripe/connect');
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch {
      toast.error('Error conectando con Stripe');
    } finally {
      setConnectingStripe(false);
    }
  };

  const loading = loadingPayouts || loadingStats;

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-xl mx-auto px-4 py-6 pb-28">
        <h1 className="text-xl font-bold text-stone-950 mb-6">Cobros</h1>

        {/* Balance card */}
        <div className="bg-stone-950 rounded-2xl p-6 mb-5 text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-stone-500 mb-2">
            Pendiente de cobro
          </p>
          {loadingStats ? (
            <Loader2 className="w-6 h-6 animate-spin text-stone-500 mx-auto" />
          ) : (
            <>
              <p className="text-4xl font-extrabold tracking-tight text-white mb-1">
                {convertAndFormatPrice(Number(stats?.pending_eur || 0))}
              </p>
              {(stats?.pending_eur || 0) >= 20 ? (
                <p className="text-sm text-stone-400 mb-4">
                  <span className="text-white">✓</span> Listo para cobrar
                </p>
              ) : (
                <p className="text-sm text-stone-500 mb-4">
                  Estás a {convertAndFormatPrice(Math.max(0, 20 - Number(stats?.pending_eur || 0)))} de poder solicitar tu cobro
                </p>
              )}

              {/* Stripe Connect CTA */}
              {!stats?.has_stripe_connect ? (
                <button
                  onClick={connectStripe}
                  disabled={connectingStripe}
                  className="bg-white text-stone-950 rounded-full px-6 py-3 text-sm font-bold hover:bg-stone-100 transition-colors disabled:opacity-50"
                >
                  {connectingStripe ? 'Conectando...' : 'Conectar cuenta bancaria →'}
                </button>
              ) : (
                <div className="flex items-center justify-center gap-2 text-xs text-stone-500">
                  <span className="text-white">✓</span>
                  Cuenta bancaria conectada
                </div>
              )}
            </>
          )}
        </div>

        {/* Next payout */}
        {stats?.next_payout_date && (
          <div className="bg-stone-100 border border-stone-200 rounded-2xl px-4 py-3 mb-5 text-sm text-stone-700 flex items-center gap-2">
            <CreditCard className="w-4 h-4 shrink-0" />
            Próximo pago automático el{' '}
            <strong>
              {new Date(stats.next_payout_date).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'long',
              })}
            </strong>
          </div>
        )}

        {/* Stripe fees info */}
        <div className="bg-white border border-stone-200 rounded-2xl px-4 py-3 mb-6 text-xs text-stone-500 leading-relaxed">
          Las comisiones de transferencia de Stripe (aprox. 1-2%) se descuentan automáticamente
          de cada pago. Recibirás el importe neto en tu cuenta bancaria.
        </div>

        {/* Fiscal summary */}
        {withholdingSummary && (withholdingSummary.total_withheld_cents > 0 || withholdingSummary.total_gross_cents > 0) && (
          <div className="bg-white border border-stone-200 rounded-2xl px-4 py-3 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-stone-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-stone-950">Resumen fiscal {new Date().getFullYear()}</p>
                <p className="text-xs text-stone-500">
                  Retenciones acumuladas: {convertAndFormatPrice(Math.round(Number(withholdingSummary.total_withheld_cents || 0)) / 100)}
                </p>
              </div>
            </div>
            <Link to="/influencer/fiscal-setup" className="text-xs font-semibold text-stone-500 hover:text-stone-950 transition-colors">
              Ver detalle
            </Link>
          </div>
        )}

        {/* Payout history */}
        <h3 className="text-base font-bold text-stone-950 mb-3 flex items-center gap-2">
          <Wallet className="w-4 h-4" />
          Historial de pagos
        </h3>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-stone-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : payouts.length === 0 ? (
          <div className="text-center py-10">
            <Wallet className="w-10 h-10 text-stone-300 mx-auto mb-3" />
            <p className="text-sm text-stone-500">
              Aún no tienes pagos. Comparte tu código y empieza a ganar.
            </p>
          </div>
        ) : (<>
          <div className="divide-y divide-stone-100">
            {payouts.slice((payoutPage - 1) * PAYOUTS_PER_PAGE, payoutPage * PAYOUTS_PER_PAGE).map((payout) => (
              <div
                key={payout.id}
                className="flex items-center justify-between py-4"
              >
                <div>
                  <p className="text-sm font-semibold text-stone-950">
                    {new Date(payout.paid_at).toLocaleDateString('es-ES', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                  <p className="text-xs text-stone-500">
                    {payout.commission_count} ventas
                    {payout.stripe_transfer_id && (
                      <> · Transfer #{payout.stripe_transfer_id.slice(-8)}</>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold text-stone-950">
                    {convertAndFormatPrice(Number(payout.net_amount_eur || 0))}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-600">
                    <CheckCircle2 className="w-3 h-3" />
                    Pagado
                  </span>
                </div>
              </div>
            ))}
          </div>
          {/* Pagination */}
          {payouts.length > PAYOUTS_PER_PAGE && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-stone-100">
              <button
                onClick={() => setPayoutPage(p => Math.max(1, p - 1))}
                disabled={payoutPage === 1}
                className="flex items-center gap-1 text-sm text-stone-600 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" /> Anterior
              </button>
              <span className="text-xs text-stone-500">
                {payoutPage} de {Math.ceil(payouts.length / PAYOUTS_PER_PAGE)}
              </span>
              <button
                onClick={() => setPayoutPage(p => Math.min(Math.ceil(payouts.length / PAYOUTS_PER_PAGE), p + 1))}
                disabled={payoutPage >= Math.ceil(payouts.length / PAYOUTS_PER_PAGE)}
                className="flex items-center gap-1 text-sm text-stone-600 disabled:opacity-40"
              >
                Siguiente <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
          </>
        )}
      </div>
    </div>
  );
}
