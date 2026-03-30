// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, CreditCard, Loader2, Wallet, FileText, ChevronLeft, ChevronRight, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import apiClient from '../../services/api/client';
import { useLocale } from '../../context/LocaleContext';

const STATUS_TABS = [
  { key: 'all', label: 'Todos' },
  { key: 'paid', label: 'Pagados' },
  { key: 'pending', label: 'Pendientes' },
  { key: 'failed', label: 'Fallidos' },
];

function WithdrawalModal({ open, onClose, availableBalance, convertAndFormatPrice, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('sepa');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount(String(availableBalance || 0));
      setMethod('sepa');
    }
  }, [open, availableBalance]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast.error('Introduce un importe válido');
      return;
    }
    if (numAmount > (availableBalance || 0)) {
      toast.error('El importe supera tu saldo disponible');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post('/influencer/request-withdrawal', {
        amount: numAmount,
        method: method === 'sepa' ? 'bank_transfer' : method,
      });
      toast.success('Solicitud de retirada enviada');
      onSuccess?.();
      onClose();
    } catch {
      toast.error('Error al solicitar la retirada');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 border-none cursor-pointer"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4 text-stone-500" />
        </button>

        <h2 className="text-lg font-bold text-stone-950 mb-1">Solicitar retirada</h2>
        <p className="text-xs text-stone-500 mb-5">
          Disponible: {convertAndFormatPrice(availableBalance || 0)}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Importe (€)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max={availableBalance || 0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full h-12 rounded-xl border border-stone-200 px-4 text-sm text-stone-950 focus:outline-none focus:border-stone-400"
              placeholder="0.00"
              required
            />
          </div>

          {/* Method */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Método de pago</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full h-12 rounded-xl border border-stone-200 px-4 text-sm text-stone-950 bg-white focus:outline-none focus:border-stone-400"
            >
              <option value="sepa">Transferencia SEPA</option>
              <option value="stripe">Stripe</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 bg-stone-950 text-white rounded-full text-sm font-bold hover:bg-stone-800 transition-colors disabled:opacity-50 border-none cursor-pointer"
          >
            {submitting ? 'Enviando...' : 'Solicitar retirada'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function PayoutsPage() {
  const { convertAndFormatPrice } = useLocale();
  const [payouts, setPayouts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loadingPayouts, setLoadingPayouts] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [withholdingSummary, setWithholdingSummary] = useState(null);
  const [payoutPage, setPayoutPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
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

  // Filter payouts by status
  const filteredPayouts = statusFilter === 'all'
    ? payouts
    : payouts.filter((p) => {
        const s = (p.status || 'paid').toLowerCase();
        if (statusFilter === 'paid') return s === 'paid' || s === 'completed';
        if (statusFilter === 'pending') return s === 'pending' || s === 'processing';
        if (statusFilter === 'failed') return s === 'failed' || s === 'error' || s === 'rejected';
        return true;
      });

  // Reset page when filter changes
  useEffect(() => {
    setPayoutPage(1);
  }, [statusFilter]);

  const totalFilteredPages = Math.ceil(filteredPayouts.length / PAYOUTS_PER_PAGE);

  const getStatusBadge = (status) => {
    const s = (status || 'paid').toLowerCase();
    if (s === 'paid' || s === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-600">
          <CheckCircle2 className="w-3 h-3" />
          Pagado
        </span>
      );
    }
    if (s === 'pending' || s === 'processing') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-400">
          <Loader2 className="w-3 h-3 animate-spin" />
          Pendiente
        </span>
      );
    }
    if (s === 'failed' || s === 'error' || s === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-500">
          <AlertCircle className="w-3 h-3" />
          Fallido
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-500">
        {status}
      </span>
    );
  };

  const handleWithdrawalSuccess = () => {
    fetchPayouts();
    fetchStats();
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-[975px] mx-auto px-4 py-6 pb-28">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-stone-950">Cobros</h1>
          <button
            onClick={() => setShowWithdrawalModal(true)}
            disabled={!stats || (stats.available_to_withdraw ?? stats.pending_eur ?? 0) < 20}
            className="px-5 py-2.5 bg-stone-950 text-white rounded-full text-sm font-bold hover:bg-stone-800 transition-colors disabled:opacity-40 border-none cursor-pointer"
          >
            Solicitar retirada
          </button>
        </div>

        {/* Balance card */}
        <div className="bg-stone-950 rounded-2xl p-6 mb-5 text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-stone-500 mb-2">
            Pendiente de cobro
          </p>
          {loadingStats ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-10 w-32 bg-stone-800 rounded mx-auto" />
              <div className="h-4 w-48 bg-stone-800 rounded mx-auto" />
            </div>
          ) : (
            <>
              <p className="text-4xl font-extrabold tracking-tight text-white mb-1">
                {convertAndFormatPrice(Number(stats?.available_to_withdraw ?? stats?.pending_eur ?? 0))}
              </p>
              {(stats?.available_to_withdraw ?? stats?.pending_eur ?? 0) >= 20 ? (
                <p className="text-sm text-stone-400 mb-4">
                  <span className="text-white">✓</span> Listo para cobrar
                </p>
              ) : (
                <p className="text-sm text-stone-500 mb-4">
                  Estás a {convertAndFormatPrice(Math.max(0, 20 - Number(stats?.available_to_withdraw ?? stats?.pending_eur ?? 0)))} de poder solicitar tu cobro
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
          <div className="bg-stone-100 shadow-sm rounded-2xl px-4 py-3 mb-5 text-sm text-stone-700 flex items-center gap-2">
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
        <div className="bg-white shadow-sm rounded-2xl px-4 py-3 mb-6 text-xs text-stone-500 leading-relaxed">
          Las comisiones de transferencia de Stripe (aprox. 1-2%) se descuentan automáticamente
          de cada pago. Recibirás el importe neto en tu cuenta bancaria.
        </div>

        {/* Fiscal summary */}
        {withholdingSummary && ((withholdingSummary.withheld_ytd || 0) > 0 || (withholdingSummary.gross_ytd || 0) > 0) && (
          <div className="bg-white shadow-sm rounded-2xl px-4 py-3 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-stone-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-stone-950">Resumen fiscal {new Date().getFullYear()}</p>
                <p className="text-xs text-stone-500">
                  Retenciones acumuladas: {convertAndFormatPrice(Number(withholdingSummary.withheld_ytd || 0))}
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

        {/* Status filter tabs */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto no-scrollbar">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-colors border-none cursor-pointer ${
                statusFilter === tab.key
                  ? 'bg-stone-950 text-white'
                  : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-stone-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredPayouts.length === 0 ? (
          <div className="text-center py-10">
            <Wallet className="w-10 h-10 text-stone-300 mx-auto mb-3" />
            <p className="text-sm text-stone-500">
              {statusFilter === 'all'
                ? 'Aún no tienes pagos. Comparte tu código y empieza a ganar.'
                : 'No hay pagos con este estado.'}
            </p>
          </div>
        ) : (<>
          <div className="divide-y divide-stone-100">
            {filteredPayouts.slice((payoutPage - 1) * PAYOUTS_PER_PAGE, payoutPage * PAYOUTS_PER_PAGE).map((payout) => (
              <div
                key={payout.id}
                className="flex items-center justify-between py-4"
              >
                <div>
                  <p className="text-sm font-semibold text-stone-950">
                    {new Date(payout.paid_at || payout.created_at).toLocaleDateString('es-ES', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                  <p className="text-xs text-stone-500">
                    {payout.commission_count} ventas
                    {payout.stripe_transfer_id && (
                      <> · Transferencia #{payout.stripe_transfer_id.slice(-8)}</>
                    )}
                  </p>
                  {/* Fees breakdown */}
                  {(payout.fee_amount_eur != null || payout.withholding_amount_eur != null) && (
                    <div className="flex gap-3 mt-0.5">
                      {payout.fee_amount_eur != null && (
                        <span className="text-[11px] text-stone-400">
                          Comisión: {convertAndFormatPrice(Number(payout.fee_amount_eur))}
                        </span>
                      )}
                      {payout.withholding_amount_eur != null && (
                        <span className="text-[11px] text-stone-400">
                          Retención: {convertAndFormatPrice(Number(payout.withholding_amount_eur))}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-base font-bold text-stone-950">
                    {convertAndFormatPrice(Number(payout.net_amount_eur || 0))}
                  </p>
                  {getStatusBadge(payout.status)}
                </div>
              </div>
            ))}
          </div>
          {/* Pagination */}
          {filteredPayouts.length > PAYOUTS_PER_PAGE && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-stone-100">
              <button
                onClick={() => setPayoutPage(p => Math.max(1, p - 1))}
                disabled={payoutPage === 1}
                className="flex items-center gap-1 text-sm text-stone-600 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" /> Anterior
              </button>
              <span className="text-xs text-stone-500">
                {payoutPage} de {totalFilteredPages}
              </span>
              <button
                onClick={() => setPayoutPage(p => Math.min(totalFilteredPages, p + 1))}
                disabled={payoutPage >= totalFilteredPages}
                className="flex items-center gap-1 text-sm text-stone-600 disabled:opacity-40"
              >
                Siguiente <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
          </>
        )}
      </div>

      {/* Withdrawal Modal */}
      <WithdrawalModal
        open={showWithdrawalModal}
        onClose={() => setShowWithdrawalModal(false)}
        availableBalance={Number(stats?.available_to_withdraw ?? stats?.pending_eur ?? 0)}
        convertAndFormatPrice={convertAndFormatPrice}
        onSuccess={handleWithdrawalSuccess}
      />
    </div>
  );
}
