// @ts-nocheck
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Download,
  Check,
  Loader2,
  FileText,
  AlertCircle,
  Clock,
  Package,
  CreditCard,
  Truck,
  FileCheck,
  ShieldAlert,
} from 'lucide-react';
import apiClient from '../../services/api/client';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { captureException } from '../../lib/sentry';

/* -- Helpers -- */
const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const shortId = (id) => String(id).slice(-8).toUpperCase();
const shortHash = (h) => (h ? `${String(h).slice(0, 12)}…` : '—');

/* -- Component -- */
export default function B2BContractPage() {
  const { operationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [operation, setOperation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [signing, setSigning] = useState(false);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const pollRef = useRef(null);
  const pollAttemptsRef = useRef(0);
  const MAX_POLL_ATTEMPTS = 12;

  /* -- Fetch -- */
  const fetchOperation = useCallback(async () => {
    try {
      const res = await apiClient.get(`/b2b/operations/${operationId}`);
      const op = res?.data ?? res;
      setOperation(op);
      setError(null);
      return op;
    } catch (err) {
      captureException(err);
      setError(err?.data?.detail || err?.message || 'No se pudo cargar la operación');
      return null;
    } finally {
      setLoading(false);
    }
  }, [operationId]);

  /* -- Mount + polling -- */
  useEffect(() => {
    fetchOperation();
  }, [fetchOperation]);

  useEffect(() => {
    if (!operation) return;
    const shouldPoll = operation.status === 'offer_accepted' || operation.status === 'contract_pending';
    let cancelled = false;
    if (shouldPoll) {
      pollAttemptsRef.current = 0;
      pollRef.current = setInterval(async () => {
        pollAttemptsRef.current += 1;
        if (pollAttemptsRef.current >= MAX_POLL_ATTEMPTS) {
          clearInterval(pollRef.current);
          if (!cancelled) setPollTimedOut(true);
          return;
        }
        try {
          const fresh = await fetchOperation();
          if (cancelled) return;
          if (fresh && fresh.status !== 'offer_accepted' && fresh.status !== 'contract_pending') {
            clearInterval(pollRef.current);
          }
        } catch {
          // retry on next interval
        }
      }, 5000);
    }
    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [operation?.status, fetchOperation]);

  /* -- Derived state -- */
  const isGenerating = operation?.status === 'offer_accepted';
  const contractReady =
    operation?.status === 'contract_generated' ||
    operation?.status === 'contract_pending' ||
    operation?.status === 'contract_signed' ||
    operation?.status === 'completed';

  const userId = user?.user_id || user?._id || user?.id;
  const isSeller = operation?.seller_id === userId;
  const isBuyer = operation?.buyer_id === userId;
  const myRole = isSeller ? 'seller' : isBuyer ? 'buyer' : null;

  const lastOffer = operation?.offers?.length ? operation.offers[operation.offers.length - 1] : {};
  const sellerSigned = !!(operation?.contract?.seller_signature_at || operation?.contract?.seller_signed_at);
  const buyerSigned = !!(operation?.contract?.buyer_signature_at || operation?.contract?.buyer_signed_at);
  const bothSigned = sellerSigned && buyerSigned;
  const currentUserSigned =
    (isSeller && sellerSigned) || (isBuyer && buyerSigned);

  const pdfUrl = operation?.contract?.pdf_url;

  /* -- Sign handler -- */
  const handleSign = async () => {
    setSigning(true);
    try {
      await apiClient.post(`/b2b/operations/${operationId}/sign`);
      toast.success('Contrato firmado correctamente');
      await fetchOperation();
    } catch (err) {
      captureException(err);
      toast.error(err.response?.data?.detail || err.response?.data?.message || 'Error al firmar');
    } finally {
      setSigning(false);
    }
  };

  /* -- Role guard -- */
  if (user && user.role !== 'producer' && user.role !== 'importer') {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-3 bg-white px-6 text-center">
        <ShieldAlert size={36} className="text-stone-400" />
        <p className="text-stone-950 text-[15px] font-semibold">No tienes acceso a esta sección</p>
        <p className="text-stone-500 text-[13px]">Necesitas un perfil de productor o importador para acceder a los contratos B2B.</p>
        <button
          onClick={() => navigate('/')}
          className="bg-stone-950 text-white rounded-full px-6 py-2.5 text-sm font-semibold border-none cursor-pointer mt-2"
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  /* -- Loading / Error screens -- */
  if (loading) {
    return (
      <div className="fixed inset-0 flex flex-col bg-white p-4 pt-[60px]">
        <div className="h-10 w-48 rounded-2xl animate-pulse mb-4 bg-stone-100" />
        <div className="h-32 rounded-2xl animate-pulse mb-4 bg-stone-100" />
        <div className="h-24 rounded-2xl animate-pulse mb-4 bg-stone-100" />
        <div className="h-48 rounded-2xl animate-pulse bg-stone-100" />
      </div>
    );
  }

  if (error || !operation) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-3 bg-white p-6">
        <AlertCircle size={36} className="text-stone-500" />
        <p className="text-stone-950 text-[15px] font-semibold">
          Operación no encontrada
        </p>
        <p className="text-stone-500 text-[13px] text-center">
          {error || 'La operación solicitada no existe o no tienes acceso.'}
        </p>
        <div className="flex gap-3 mt-3">
          <button
            onClick={fetchOperation}
            className="bg-stone-950 text-white border-none rounded-full px-7 py-2.5 text-sm font-semibold cursor-pointer"
          >
            Reintentar
          </button>
          <button
            onClick={() => navigate(-1)}
            className="bg-white text-stone-950 border border-stone-200 rounded-full px-7 py-2.5 text-sm font-semibold cursor-pointer"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  /* -- Main render -- */
  return (
    <div className="fixed inset-0 flex flex-col bg-white pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {/* -- TopBar -- */}
      <div className="flex items-center justify-between sticky top-0 z-20 bg-white/85 backdrop-blur-xl px-4 py-3 border-b border-stone-200">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-9 h-9 rounded-full border-none bg-transparent cursor-pointer"
        >
          <ArrowLeft size={20} className="text-stone-950" />
        </button>
        <span className="text-sm font-semibold text-stone-950">
          Contrato #HSP-B2B-{shortId(operationId)}
        </span>
        <button
          onClick={() => pdfUrl && window.open(pdfUrl, '_blank')}
          className="flex items-center justify-center w-9 h-9 rounded-full border-none bg-transparent cursor-pointer disabled:opacity-35"
          disabled={!pdfUrl}
        >
          <Download size={20} className="text-stone-950" />
        </button>
      </div>

      {/* -- Scrollable Body -- */}
      <div className="flex-1 overflow-y-auto p-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
        {/* - Section 1: Operation Status - */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="bg-stone-950 rounded-xl p-[18px] mb-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center w-[22px] h-[22px] rounded-full bg-stone-950">
              <Check size={13} className="text-white" strokeWidth={3} />
            </div>
            <span className="text-white text-sm font-semibold">
              Oferta v{lastOffer.version ?? 1} aceptada
            </span>
          </div>
          <p className="text-white/70 text-xs mb-2.5">
            {fmtDate(operation.accepted_at || operation.updated_at)}
          </p>
          <p className="text-stone-500 text-[9px] font-mono">
            {shortHash(operation.integrity_hash || operation.hash)}
          </p>
          <p className="text-stone-500 text-[9px] mt-0.5">
            Hash de integridad
          </p>
        </motion.div>

        {/* - Section 2: Contract Generation - */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.06 }}
          className="mb-4"
        >
          <AnimatePresence mode="wait">
            {isGenerating && !pollTimedOut && (
              <motion.div
                key="generating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-10"
              >
                <Loader2
                  size={32}
                  className="animate-spin text-stone-950 mb-3.5"
                />
                <p className="text-stone-500 text-sm font-medium">
                  La IA está generando el contrato...
                </p>
                <p className="text-stone-500 text-xs mt-1">
                  Esto puede tardar unos segundos
                </p>
              </motion.div>
            )}

            {isGenerating && pollTimedOut && (
              <motion.div
                key="poll-timeout"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-10 px-5 text-center"
              >
                <AlertCircle size={32} className="text-stone-500 mb-3.5" />
                <p className="text-stone-950 text-sm font-semibold mb-2">
                  El contrato está tardando más de lo esperado
                </p>
                <p className="text-stone-500 text-[13px] leading-relaxed mb-5">
                  Recibirás una notificación cuando esté listo.
                </p>
                <button
                  onClick={() => navigate(-1)}
                  className="bg-stone-950 text-white border-none rounded-full px-7 py-2.5 text-sm font-semibold cursor-pointer"
                >
                  Volver
                </button>
              </motion.div>
            )}

            {contractReady && (
              <motion.div
                key="ready"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <iframe
                  src={pdfUrl}
                  title="Contrato PDF"
                  className="w-full h-[300px] rounded-xl border border-stone-200 bg-white"
                />
                <button
                  onClick={() => pdfUrl && window.open(pdfUrl, '_blank')}
                  className="flex items-center justify-center gap-2 mt-2.5 w-full bg-transparent border-none text-stone-500 text-xs cursor-pointer"
                >
                  <FileText size={14} />
                  Si no se muestra, pulsa para ver →
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* - Section 2.5: Contract Terms Summary - */}
        {contractReady && operation && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.09 }}
            className="rounded-2xl shadow-sm p-4 mb-4"
          >
            <p className="text-sm font-semibold text-stone-950 mb-3">
              Resumen de condiciones
            </p>

            <div className="flex flex-col gap-2.5">
              {/* Product */}
              {lastOffer.product_name && (
                <div className="flex items-start gap-2.5">
                  <Package size={15} className="text-stone-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] text-stone-500 block">Producto</span>
                    <span className="text-[13px] text-stone-950">
                      {lastOffer.product_name}{lastOffer.quantity ? ` (x${lastOffer.quantity} ${lastOffer.unit || ''})` : ''}
                    </span>
                  </div>
                </div>
              )}

              {/* Pricing */}
              {lastOffer.total_price > 0 && (
                <div className="flex items-start gap-2.5">
                  <CreditCard size={15} className="text-stone-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] text-stone-500 block">Precio total</span>
                    <span className="text-[13px] text-stone-950 font-medium">
                      {new Intl.NumberFormat('es-ES', { style: 'currency', currency: lastOffer.currency || 'EUR' }).format(lastOffer.total_price)}
                    </span>
                  </div>
                </div>
              )}

              {/* Delivery terms */}
              {lastOffer.delivery_days > 0 && (
                <div className="flex items-start gap-2.5">
                  <Truck size={15} className="text-stone-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] text-stone-500 block">Entrega</span>
                    <span className="text-[13px] text-stone-950">
                      {lastOffer.delivery_days} días
                    </span>
                  </div>
                </div>
              )}

              {/* Payment terms */}
              {lastOffer.payment_terms && (
                <div className="flex items-start gap-2.5">
                  <FileCheck size={15} className="text-stone-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] text-stone-500 block">Condiciones de pago</span>
                    <span className="text-[13px] text-stone-950">
                      {(lastOffer.payment_terms === 'prepaid' || lastOffer.payment_terms === 'full_prepay') ? 'Pago completo por adelantado'
                        : lastOffer.payment_terms === 'letter_of_credit' ? 'Carta de crédito (pago dividido)'
                        : lastOffer.payment_terms === 'net_30' ? 'Pago a 30 días'
                        : lastOffer.payment_terms === 'net_60' ? 'Pago a 60 días'
                        : lastOffer.payment_terms}
                    </span>
                  </div>
                </div>
              )}

              {/* Incoterm */}
              {lastOffer.incoterm && (
                <div className="flex items-start gap-2.5">
                  <FileText size={15} className="text-stone-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] text-stone-500 block">Incoterm</span>
                    <span className="text-[13px] text-stone-950 font-medium">
                      {lastOffer.incoterm}{lastOffer.incoterm_city ? ` — ${lastOffer.incoterm_city}` : ''}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* - Section 3: Signature Progress - */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.12 }}
          className="bg-white shadow-sm rounded-xl p-[18px] mb-4"
        >
          <p className="text-sm font-semibold text-stone-950 mb-3.5">
            Firmas digitales
          </p>

          {/* Signature progress indicators */}
          <div className="flex flex-col gap-2 mb-3.5 bg-stone-50 rounded-xl p-3">
            <div className="flex items-center gap-2">
              {buyerSigned ? (
                <Check size={14} className="text-stone-950" strokeWidth={2.5} />
              ) : (
                <Clock size={14} className="text-stone-500" />
              )}
              <span className={`text-[12px] font-medium ${buyerSigned ? 'text-stone-950' : 'text-stone-500'}`}>
                {buyerSigned ? 'Comprador firmo' : 'Esperando firma del comprador'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {sellerSigned ? (
                <Check size={14} className="text-stone-950" strokeWidth={2.5} />
              ) : (
                <Clock size={14} className="text-stone-500" />
              )}
              <span className={`text-[12px] font-medium ${sellerSigned ? 'text-stone-950' : 'text-stone-500'}`}>
                {sellerSigned ? 'Vendedor firmo' : 'Esperando firma del vendedor'}
              </span>
            </div>
          </div>

          {/* Seller row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-stone-100" />
              <span className="text-[13px] text-stone-950 font-medium">
                {operation.seller_name || 'Vendedor'}
              </span>
            </div>
            {sellerSigned ? (
              <span className="text-[11px] text-stone-950 font-medium">
                Firmado · {fmtDate(operation.contract?.seller_signature_at)}
              </span>
            ) : (
              <span className="text-[11px] text-stone-500 font-medium">
                Pendiente
              </span>
            )}
          </div>

          {/* Separator */}
          <div className="h-px bg-stone-200 mb-3" />

          {/* Buyer row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-stone-100" />
              <span className="text-[13px] text-stone-950 font-medium">
                {operation.buyer_name || 'Comprador'}
              </span>
            </div>
            {buyerSigned ? (
              <span className="text-[11px] text-stone-950 font-medium">
                Firmado · {fmtDate(operation.contract?.buyer_signature_at)}
              </span>
            ) : (
              <span className="text-[11px] text-stone-500 font-medium">
                Pendiente
              </span>
            )}
          </div>
        </motion.div>

        {/* - Section 4: Tu firma - */}
        {contractReady && myRole && !currentUserSigned && !bothSigned && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.18 }}
            className="mb-4"
          >
            <p className="text-sm font-semibold text-stone-950 mb-3">
              Tu firma
            </p>

            {user?.signature_url ? (
              <>
                {/* Signature preview */}
                <div className="flex items-center justify-center w-full h-[50px] border-[1.5px] border-dashed border-stone-200 rounded-xl mb-3.5 overflow-hidden">
                  <img
                    src={user.signature_url}
                    alt="Tu firma"
                    className="max-h-10 object-contain"
                  />
                </div>

                {/* Sign button */}
                <button
                  onClick={handleSign}
                  disabled={signing}
                  className="flex items-center justify-center gap-2 w-full h-11 bg-stone-950 text-white border-none rounded-full text-sm font-semibold cursor-pointer disabled:opacity-70 disabled:cursor-default"
                >
                  {signing ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    'Aplicar mi firma y sellar'
                  )}
                </button>

                {/* Legal text */}
                <p className="text-stone-500 text-[10px] mt-2.5 leading-relaxed">
                  Al firmar confirmas que has leído y aceptas todos los términos del contrato.
                  La firma queda registrada con fecha, hora e IP.
                </p>
              </>
            ) : (
              <>
                {/* No signature card */}
                <div className="flex items-center gap-3 bg-stone-100 border border-stone-200 rounded-xl p-3.5 mb-3.5">
                  <AlertCircle size={18} className="text-stone-600 flex-shrink-0" />
                  <p className="text-stone-950 text-[13px]">
                    Necesitas subir tu firma digital antes de poder firmar contratos
                  </p>
                </div>

                <button
                  onClick={() => navigate(`/settings/signature?returnTo=/b2b/contract/${operationId}`)}
                  className="w-full h-11 bg-stone-950 text-white border-none rounded-full text-sm font-semibold cursor-pointer"
                >
                  Ir a configurar mi firma →
                </button>
              </>
            )}
          </motion.div>
        )}

        {/* - Section 5: Both signed - */}
        {bothSigned && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-stone-100 shadow-sm rounded-xl p-5 mb-4"
          >
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-stone-950 mb-3">
                <Check size={32} className="text-white" strokeWidth={2.5} />
              </div>
              <p className="text-[15px] font-semibold text-stone-950 mb-1">
                Contrato firmado por ambas partes
              </p>
              <p className="text-xs text-stone-500">
                {fmtDate(
                  (operation.contract?.buyer_signature_at || '') > (operation.contract?.seller_signature_at || '')
                    ? (operation.contract?.buyer_signature_at || operation.contract?.buyer_signed_at)
                    : operation.contract?.seller_signature_at
                )}
              </p>

              <button
                onClick={() => pdfUrl && window.open(pdfUrl, '_blank')}
                className="flex items-center justify-center gap-2 mt-[18px] w-full h-11 bg-stone-950 text-white border-none rounded-full text-sm font-semibold cursor-pointer"
              >
                <Download size={16} />
                Descargar contrato firmado
              </button>

              <button
                onClick={() => navigate(`/b2b/tracking/${operationId}`)}
                className="mt-2 w-full h-11 bg-white text-stone-950 border border-stone-200 rounded-full text-sm font-semibold cursor-pointer"
              >
                Ir al seguimiento →
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
