// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, CreditCard, Loader2, Wallet, FileText, ChevronLeft, ChevronRight, X, AlertCircle, Info, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import apiClient from '../../services/api/client';
import { useLocale } from '../../context/LocaleContext';
import { useTranslation } from 'react-i18next';
import i18n from "../../locales/i18n";
import { Download } from 'lucide-react';
import { trackEvent } from '../../utils/analytics';
const STATUS_TABS = [{
  key: 'all',
  label: 'Todos'
}, {
  key: 'paid',
  label: 'Pagados'
}, {
  key: 'pending',
  label: 'Pendientes'
}, {
  key: 'failed',
  label: 'Fallidos'
}];
function WithdrawalModal({
  open,
  onClose,
  availableBalance,
  convertAndFormatPrice,
  onSuccess
}) {
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
  const handleSubmit = async e => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast.error(i18n.t('payouts.introduceUnImporteValido', 'Introduce un importe válido'));
      return;
    }
    if (numAmount > (availableBalance || 0)) {
      toast.error(i18n.t('payouts.elImporteSuperaTuSaldoDisponible', 'El importe supera tu saldo disponible'));
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post('/influencer/request-withdrawal', {
        amount: numAmount,
        method: method === 'sepa' ? 'bank_transfer' : method
      });
      toast.success('Solicitud de retirada enviada');
      onSuccess?.();
      onClose();
    } catch {
      toast.error(i18n.t('payouts.errorAlSolicitarLaRetirada', 'Error al solicitar la retirada'));
    } finally {
      setSubmitting(false);
    }
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 border-none cursor-pointer" aria-label="Cerrar">
          <X className="w-4 h-4 text-stone-500" />
        </button>

        <h2 className="text-lg font-bold text-stone-950 mb-1">Solicitar retirada</h2>
        <p className="text-xs text-stone-500 mb-5">
          Disponible: {convertAndFormatPrice(availableBalance || 0)}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">{i18n.t('payments.amount', 'Importe')}</label>
            <input type="number" step="0.01" min="0" max={availableBalance || 0} value={amount} onChange={e => setAmount(e.target.value)} className="w-full h-12 rounded-xl border border-stone-200 px-4 text-sm text-stone-950 focus:outline-none focus:border-stone-400" placeholder="0.00" required />
          </div>

          {/* Method */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">{i18n.t('checkout.metodoDePago', 'Método de pago')}</label>
            <select value={method} onChange={e => setMethod(e.target.value)} className="w-full h-12 rounded-xl border border-stone-200 px-4 text-sm text-stone-950 bg-white focus:outline-none focus:border-stone-400">
              <option value="sepa">Transferencia SEPA</option>
              <option value="stripe">Stripe</option>
            </select>
          </div>

          <button type="submit" disabled={submitting} className="w-full h-12 bg-stone-950 text-white rounded-full text-sm font-bold hover:bg-stone-800 transition-colors disabled:opacity-50 border-none cursor-pointer">
            {submitting ? 'Enviando...' : 'Solicitar retirada'}
          </button>
        </form>
      </div>
    </div>;
}
export default function PayoutsPage() {
  const {
    convertAndFormatPrice
  } = useLocale();
  const {
    t
  } = useTranslation();
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
  const MINIMUM_WITHDRAWAL = 20; // €20 synced with WithdrawalPage
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
    trackEvent('influencer_payouts_viewed');
    // Fetch fiscal withholding summary
    apiClient.get('/influencer/fiscal/withholding-summary').then(setWithholdingSummary).catch(() => setWithholdingSummary(null));
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
  const filteredPayouts = statusFilter === 'all' ? payouts : payouts.filter(p => {
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
  const getStatusBadge = status => {
    const s = (status || 'paid').toLowerCase();
    if (s === 'paid' || s === 'completed') {
      return <span className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-600">
          <CheckCircle2 className="w-3 h-3" />
          Pagado
        </span>;
    }
    if (s === 'pending' || s === 'processing') {
      return <span className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-400">
          <Loader2 className="w-3 h-3 animate-spin" />
          Pendiente
        </span>;
    }
    if (s === 'failed' || s === 'error' || s === 'rejected') {
      return <span className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-500">
          <AlertCircle className="w-3 h-3" />
          Fallido
        </span>;
    }
    return <span className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-500">
        {status}
      </span>;
  };
  const handleWithdrawalSuccess = () => {
    trackEvent('influencer_withdrawal_requested', { gross: stats?.available_to_withdraw || 0 });
    fetchPayouts();
    fetchStats();
  };

  const handleDownloadReceipt = (payout) => {
    trackEvent('influencer_receipt_downloaded');
    const w = window.open('', '_blank', 'width=600,height=700');
    if (!w) return;
    const date = payout.paid_at || payout.created_at;
    const dateStr = date ? new Date(date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    w.document.write(`<!DOCTYPE html><html><head><title>Recibo</title>
      <style>body{font-family:system-ui,sans-serif;padding:40px;color:#1c1917;max-width:500px;margin:0 auto}
      h1{font-size:18px;margin-bottom:4px}h2{font-size:13px;color:#78716c;margin-bottom:24px}
      table{width:100%;border-collapse:collapse;margin-bottom:16px}
      td{padding:8px 0;font-size:13px;border-bottom:1px solid #e7e5e4}
      td:last-child{text-align:right;font-weight:600}
      .total td{border-top:2px solid #1c1917;border-bottom:none;font-weight:700;font-size:15px}
      .footer{margin-top:32px;font-size:11px;color:#a8a29e;border-top:1px solid #e7e5e4;padding-top:16px}
      @media print{body{padding:20px}}</style>
      </head><body>
      <h1>HispaloShop</h1>
      <h2>Recibo de pago — ${dateStr}</h2>
      <table>
      <tr><td>Bruto</td><td>${(payout.gross_amount_eur || payout.net_amount_eur || 0).toFixed(2)} EUR</td></tr>
      ${payout.withholding_amount_eur ? `<tr><td>Retencion IRPF (15%)</td><td>-${Number(payout.withholding_amount_eur).toFixed(2)} EUR</td></tr>` : ''}
      ${payout.fee_amount_eur ? `<tr><td>Comision transferencia</td><td>-${Number(payout.fee_amount_eur).toFixed(2)} EUR</td></tr>` : ''}
      <tr class="total"><td>Neto recibido</td><td>${Number(payout.net_amount_eur || 0).toFixed(2)} EUR</td></tr>
      </table>
      <p style="font-size:12px;color:#57534e">${payout.commission_count || 0} ventas atribuidas</p>
      ${payout.stripe_transfer_id ? `<p style="font-size:11px;color:#a8a29e">Ref: ${payout.stripe_transfer_id}</p>` : ''}
      <div class="footer">Este documento es un recibo informativo. HispaloShop SL.</div>
      </body></html>`);
    w.document.close();
    w.print();
  };
  return <div className="min-h-screen bg-stone-50">
      <div className="max-w-[975px] mx-auto px-4 py-6 pb-28">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-stone-950">Cobros</h1>
          <button onClick={() => setShowWithdrawalModal(true)} disabled={!stats || (stats.available_to_withdraw ?? stats.pending_eur ?? 0) < MINIMUM_WITHDRAWAL} className="px-5 py-2.5 bg-stone-950 text-white rounded-full text-sm font-bold hover:bg-stone-800 transition-colors disabled:opacity-40 border-none cursor-pointer">
            Solicitar retirada
          </button>
        </div>

        {/* Balance card */}
        <div className="bg-stone-950 rounded-2xl p-6 mb-5 text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-stone-500 mb-2">
            Pendiente de cobro
          </p>
          {loadingStats ? <div className="space-y-3 animate-pulse">
              <div className="h-10 w-32 bg-stone-800 rounded mx-auto" />
              <div className="h-4 w-48 bg-stone-800 rounded mx-auto" />
            </div> : <>
              <p className="text-4xl font-extrabold tracking-tight text-white mb-1">
                {convertAndFormatPrice(Number(stats?.available_to_withdraw ?? stats?.pending_eur ?? 0))}
              </p>
              {(stats?.available_to_withdraw ?? stats?.pending_eur ?? 0) >= MINIMUM_WITHDRAWAL ? <p className="text-sm text-stone-400 mb-4 inline-flex items-center gap-1.5 justify-center">
                  <Check className="w-3.5 h-3.5 text-white" /> Listo para cobrar
                </p> : <p className="text-sm text-stone-500 mb-4">
                  Estás a {convertAndFormatPrice(Math.max(0, MINIMUM_WITHDRAWAL - Number(stats?.available_to_withdraw ?? stats?.pending_eur ?? 0)))} de poder solicitar tu cobro
                </p>}

              {/* Stripe Connect CTA */}
              {!stats?.has_stripe_connect ? <button onClick={connectStripe} disabled={connectingStripe} className="bg-white text-stone-950 rounded-full px-6 py-3 text-sm font-bold hover:bg-stone-100 transition-colors disabled:opacity-50">
                  {connectingStripe ? 'Conectando...' : 'Conectar cuenta bancaria'}
                </button> : <div className="flex items-center justify-center gap-2 text-xs text-stone-500">
                  <Check className="w-3.5 h-3.5 text-white" />
                  Cuenta bancaria conectada
                </div>}
            </>}
        </div>

        {/* Fiscal provisional disclaimer (US LLC — no withholding) */}
        <div className="mb-5 border border-stone-200 bg-stone-50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-stone-600" />
            <p className="text-xs leading-relaxed text-stone-600">
              {t('influencer_fiscal.disclaimer', 'HispaloShop opera desde Estados Unidos. No retenemos impuestos locales. Eres responsable de tu declaración fiscal.')}
            </p>
          </div>
        </div>

        {/* Next payout / D+15 pending */}
        {stats?.next_payout_date ? <div className="bg-stone-100 shadow-sm rounded-2xl px-4 py-3 mb-5 text-sm text-stone-700 flex items-center gap-2">
            <CreditCard className="w-4 h-4 shrink-0" />
            Próximo pago automático el{' '}
            <strong>
              {new Date(stats.next_payout_date).toLocaleDateString(undefined, {
            day: 'numeric',
            month: 'long'
          })}
            </strong>
          </div> : (stats?.pending_eur || 0) > 0 ? <div className="bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3 mb-5 text-sm text-stone-600 flex items-start gap-2">
            <CreditCard className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p>{t('payouts.pendingD15', 'Tienes comisiones pendientes de completar el periodo D+15.')}</p>
              <p className="text-xs text-stone-500 mt-1">{t('payouts.d15Explanation', 'Los fondos estan disponibles 15 dias despues de cada compra. Los pagos se transfieren manualmente en 1-3 dias habiles.')}</p>
            </div>
          </div> : null}

        {/* Stripe fees info */}
        <div className="bg-white shadow-sm rounded-2xl px-4 py-3 mb-6 text-xs text-stone-500 leading-relaxed">
          Las comisiones de transferencia de Stripe (aprox. 1-2%) se descuentan automáticamente
          de cada pago. Recibirás el importe neto en tu cuenta bancaria.
        </div>

        {/* Fiscal summary */}
        {withholdingSummary && ((withholdingSummary.withheld_ytd || 0) > 0 || (withholdingSummary.gross_ytd || 0) > 0) && <div className="bg-white shadow-sm rounded-2xl px-4 py-3 mb-6 flex items-center justify-between">
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
          </div>}

        {/* Payout history */}
        <h3 className="text-base font-bold text-stone-950 mb-3 flex items-center gap-2">
          <Wallet className="w-4 h-4" />
          Historial de pagos
        </h3>

        {/* Status filter tabs */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto no-scrollbar">
          {STATUS_TABS.map(tab => <button key={tab.key} onClick={() => setStatusFilter(tab.key)} className={`px-4 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-colors border-none cursor-pointer ${statusFilter === tab.key ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}>
              {tab.label}
            </button>)}
        </div>

        {loading ? <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-stone-100 rounded-2xl animate-pulse" />)}
          </div> : filteredPayouts.length === 0 ? <div className="text-center py-10">
            <Wallet className="w-10 h-10 text-stone-300 mx-auto mb-3" />
            <p className="text-sm text-stone-500">
              {statusFilter === 'all' ? t('payouts.aunNoTienesPagosComparteTuCodigo', 'Aún no tienes pagos. Comparte tu código y empieza a ganar.') : t('payouts.noHayPagosConEsteEstado', 'No hay pagos con este estado.')}
            </p>
          </div> : <>
          <div className="divide-y divide-stone-100">
            {filteredPayouts.slice((payoutPage - 1) * PAYOUTS_PER_PAGE, payoutPage * PAYOUTS_PER_PAGE).map(payout => <div key={payout.id} className="flex items-center justify-between py-4">
                <div>
                  <p className="text-sm font-semibold text-stone-950">
                    {(() => {
                  const d = new Date(payout.paid_at || payout.created_at || 0);
                  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, {
                    month: 'long',
                    year: 'numeric'
                  });
                })()}
                  </p>
                  <p className="text-xs text-stone-500">
                    {payout.commission_count} ventas
                    {payout.stripe_transfer_id && <> · Transferencia #{payout.stripe_transfer_id.slice(-8)}</>}
                  </p>
                  {/* Fees breakdown */}
                  {(payout.fee_amount_eur != null || payout.withholding_amount_eur != null) && <div className="flex gap-3 mt-0.5">
                      {payout.fee_amount_eur != null && <span className="text-[11px] text-stone-400">
                          Comisión: {convertAndFormatPrice(Number(payout.fee_amount_eur))}
                        </span>}
                      {payout.withholding_amount_eur != null && <span className="text-[11px] text-stone-400">
                          Retención: {convertAndFormatPrice(Number(payout.withholding_amount_eur))}
                        </span>}
                    </div>}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-base font-bold text-stone-950">
                      {convertAndFormatPrice(Number(payout.net_amount_eur || 0))}
                    </p>
                    {getStatusBadge(payout.status)}
                  </div>
                  {(payout.status === 'paid' || payout.status === 'completed') && (
                    <button onClick={() => handleDownloadReceipt(payout)} className="p-2 rounded-full hover:bg-stone-100 transition-colors text-stone-400 hover:text-stone-700" title={t('payouts.downloadReceipt', 'Descargar recibo')}>
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>)}
          </div>
          {/* Pagination */}
          {filteredPayouts.length > PAYOUTS_PER_PAGE && <div className="flex items-center justify-between mt-4 pt-3 border-t border-stone-100">
              <button onClick={() => setPayoutPage(p => Math.max(1, p - 1))} disabled={payoutPage === 1} className="flex items-center gap-1 text-sm text-stone-600 disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" /> Anterior
              </button>
              <span className="text-xs text-stone-500">
                {payoutPage} de {totalFilteredPages}
              </span>
              <button onClick={() => setPayoutPage(p => Math.min(totalFilteredPages, p + 1))} disabled={payoutPage >= totalFilteredPages} className="flex items-center gap-1 text-sm text-stone-600 disabled:opacity-40">
                Siguiente <ChevronRight className="w-4 h-4" />
              </button>
            </div>}
          </>}
      </div>

      {/* Withdrawal Modal */}
      <WithdrawalModal open={showWithdrawalModal} onClose={() => setShowWithdrawalModal(false)} availableBalance={Number(stats?.available_to_withdraw ?? stats?.pending_eur ?? 0)} convertAndFormatPrice={convertAndFormatPrice} onSuccess={handleWithdrawalSuccess} />
    </div>;
}