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
} from 'lucide-react';
import apiClient from '@/services/api/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

/* ── V2 Design Tokens ─────────────────────────────── */
const V2 = {
  black: '#0A0A0A',
  cream: '#F7F6F2',
  stone: '#8A8881',
  white: '#FFFFFF',
  border: '#E5E2DA',
  surface: '#F0EDE8',
  green: '#2E7D52',
  greenLight: '#E8F5EE',
  greenBorder: '#A0D0B0',
  blue: '#3060A0',
  blueLight: '#EBF0F8',
  amber: '#B45309',
  amberLight: '#FEF3C7',
  fontSans: 'Inter, sans-serif',
  radiusMd: 12,
  radiusFull: 9999,
};

/* ── Helpers ───────────────────────────────────────── */
const fmtDate = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const shortId = (id) => String(id).slice(-8).toUpperCase();
const shortHash = (h) => (h ? `${String(h).slice(0, 12)}…` : '—');

/* ── Component ─────────────────────────────────────── */
export default function B2BContractPage() {
  const { operationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [operation, setOperation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [signing, setSigning] = useState(false);
  const pollRef = useRef(null);

  /* ── Fetch ──────────────────────────────────────── */
  const fetchOperation = useCallback(async () => {
    try {
      const { data } = await apiClient.get(`/api/b2b/operations/${operationId}`);
      setOperation(data);
      setError(null);
      return data;
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo cargar la operación');
      return null;
    } finally {
      setLoading(false);
    }
  }, [operationId]);

  /* ── Mount + polling ────────────────────────────── */
  useEffect(() => {
    fetchOperation();
  }, [fetchOperation]);

  useEffect(() => {
    if (!operation) return;
    const shouldPoll = operation.status === 'offer_accepted' || operation.status === 'contract_pending';
    if (shouldPoll) {
      pollRef.current = setInterval(async () => {
        const fresh = await fetchOperation();
        if (fresh && fresh.status !== 'offer_accepted' && fresh.status !== 'contract_pending') {
          clearInterval(pollRef.current);
        }
      }, 2000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [operation?.status, fetchOperation]);

  /* ── Derived state ──────────────────────────────── */
  const isGenerating = operation?.status === 'offer_accepted';
  const contractReady =
    operation?.status === 'contract_generated' ||
    operation?.status === 'contract_pending' ||
    operation?.status === 'contract_signed' ||
    operation?.status === 'completed';

  const isSeller = operation?.seller_id === user?._id;
  const isBuyer = operation?.buyer_id === user?._id;
  const myRole = isSeller ? 'seller' : isBuyer ? 'buyer' : null;

  const sellerSigned = !!(operation?.contract?.seller_signature_at || operation?.contract?.seller_signed_at);
  const buyerSigned = !!(operation?.contract?.buyer_signature_at || operation?.contract?.buyer_signed_at);
  const bothSigned = sellerSigned && buyerSigned;
  const currentUserSigned =
    (isSeller && sellerSigned) || (isBuyer && buyerSigned);

  const pdfUrl = operation?.contract?.pdf_url;

  /* ── Sign handler ───────────────────────────────── */
  const handleSign = async () => {
    setSigning(true);
    try {
      await apiClient.post(`/api/b2b/operations/${operationId}/sign`);
      toast.success('Contrato firmado correctamente');
      await fetchOperation();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al firmar');
    } finally {
      setSigning(false);
    }
  };

  /* ── Loading / Error screens ────────────────────── */
  if (loading) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ background: V2.cream, fontFamily: V2.fontSans }}
      >
        <Loader2 size={28} className="animate-spin" style={{ color: V2.stone }} />
      </div>
    );
  }

  if (error || !operation) {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center gap-3"
        style={{ background: V2.cream, fontFamily: V2.fontSans, padding: 24 }}
      >
        <AlertCircle size={36} style={{ color: V2.amber }} />
        <p style={{ color: V2.black, fontSize: 15, fontWeight: 600 }}>
          Operación no encontrada
        </p>
        <p style={{ color: V2.stone, fontSize: 13, textAlign: 'center' }}>
          {error || 'La operación solicitada no existe o no tienes acceso.'}
        </p>
        <button
          onClick={() => navigate(-1)}
          style={{
            marginTop: 12,
            background: V2.black,
            color: V2.white,
            border: 'none',
            borderRadius: V2.radiusFull,
            padding: '10px 28px',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: V2.fontSans,
            cursor: 'pointer',
          }}
        >
          Volver
        </button>
      </div>
    );
  }

  /* ── Main render ────────────────────────────────── */
  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{
        background: V2.cream,
        fontFamily: V2.fontSans,
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* ── TopBar ───────────────────────────────── */}
      <div
        className="flex items-center justify-between"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: 'rgba(247,246,242,0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          padding: '12px 16px',
          borderBottom: `1px solid ${V2.border}`,
        }}
      >
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center"
          style={{
            width: 36,
            height: 36,
            borderRadius: V2.radiusFull,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={20} style={{ color: V2.black }} />
        </button>
        <span style={{ fontSize: 14, fontWeight: 600, color: V2.black }}>
          Contrato #HSP-B2B-{shortId(operationId)}
        </span>
        <button
          onClick={() => pdfUrl && window.open(pdfUrl, '_blank')}
          className="flex items-center justify-center"
          style={{
            width: 36,
            height: 36,
            borderRadius: V2.radiusFull,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            opacity: pdfUrl ? 1 : 0.35,
          }}
          disabled={!pdfUrl}
        >
          <Download size={20} style={{ color: V2.black }} />
        </button>
      </div>

      {/* ── Scrollable Body ──────────────────────── */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ padding: 16, paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }}
      >
        {/* ─ Section 1: Operation Status ─────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          style={{
            background: V2.black,
            borderRadius: V2.radiusMd,
            padding: 18,
            marginBottom: 16,
          }}
        >
          <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
            <div
              className="flex items-center justify-center"
              style={{
                width: 22,
                height: 22,
                borderRadius: V2.radiusFull,
                background: V2.green,
              }}
            >
              <Check size={13} style={{ color: V2.white }} strokeWidth={3} />
            </div>
            <span style={{ color: V2.white, fontSize: 14, fontWeight: 600 }}>
              Oferta v{operation.version ?? 1} aceptada
            </span>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 10 }}>
            {fmtDate(operation.accepted_at || operation.updated_at)}
          </p>
          <p style={{ color: V2.stone, fontSize: 9, fontFamily: 'monospace' }}>
            {shortHash(operation.integrity_hash || operation.hash)}
          </p>
          <p style={{ color: V2.stone, fontSize: 9, marginTop: 2 }}>
            Hash de integridad
          </p>
        </motion.div>

        {/* ─ Section 2: Contract Generation ──────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.06 }}
          style={{ marginBottom: 16 }}
        >
          <AnimatePresence mode="wait">
            {isGenerating && (
              <motion.div
                key="generating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center"
                style={{ padding: '40px 0' }}
              >
                <Loader2
                  size={32}
                  className="animate-spin"
                  style={{ color: V2.green, marginBottom: 14 }}
                />
                <p style={{ color: V2.stone, fontSize: 14, fontWeight: 500 }}>
                  La IA está generando el contrato...
                </p>
                <p style={{ color: V2.stone, fontSize: 12, marginTop: 4 }}>
                  Esto puede tardar unos segundos
                </p>
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
                  style={{
                    width: '100%',
                    height: 300,
                    borderRadius: V2.radiusMd,
                    border: `1px solid ${V2.border}`,
                    background: V2.white,
                  }}
                />
                <button
                  onClick={() => pdfUrl && window.open(pdfUrl, '_blank')}
                  className="flex items-center justify-center gap-2"
                  style={{
                    marginTop: 10,
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    color: V2.stone,
                    fontSize: 12,
                    cursor: 'pointer',
                    fontFamily: V2.fontSans,
                  }}
                >
                  <FileText size={14} />
                  Si no se muestra, pulsa para ver →
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ─ Section 3: Signatures ───────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.12 }}
          style={{
            background: V2.white,
            border: `1px solid ${V2.border}`,
            borderRadius: V2.radiusMd,
            padding: 18,
            marginBottom: 16,
          }}
        >
          <p style={{ fontSize: 14, fontWeight: 600, color: V2.black, marginBottom: 14 }}>
            Firmas digitales
          </p>

          {/* Seller row */}
          <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
            <div className="flex items-center gap-3">
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: V2.radiusFull,
                  background: V2.surface,
                }}
              />
              <span style={{ fontSize: 13, color: V2.black, fontWeight: 500 }}>
                {operation.seller_name || 'Vendedor'}
              </span>
            </div>
            {sellerSigned ? (
              <span style={{ fontSize: 11, color: V2.green, fontWeight: 500 }}>
                ✓ Firmado · {fmtDate(operation.contract?.seller_signature_at)}
              </span>
            ) : (
              <span style={{ fontSize: 11, color: V2.amber, fontWeight: 500 }}>
                Pendiente
              </span>
            )}
          </div>

          {/* Separator */}
          <div style={{ height: 0.5, background: V2.border, marginBottom: 12 }} />

          {/* Buyer row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: V2.radiusFull,
                  background: V2.surface,
                }}
              />
              <span style={{ fontSize: 13, color: V2.black, fontWeight: 500 }}>
                {operation.buyer_name || 'Comprador'}
              </span>
            </div>
            {buyerSigned ? (
              <span style={{ fontSize: 11, color: V2.green, fontWeight: 500 }}>
                ✓ Firmado · {fmtDate(operation.contract?.buyer_signature_at)}
              </span>
            ) : (
              <span style={{ fontSize: 11, color: V2.amber, fontWeight: 500 }}>
                Pendiente
              </span>
            )}
          </div>
        </motion.div>

        {/* ─ Section 4: Tu firma ─────────────────── */}
        {contractReady && myRole && !currentUserSigned && !bothSigned && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.18 }}
            style={{ marginBottom: 16 }}
          >
            <p style={{ fontSize: 14, fontWeight: 600, color: V2.black, marginBottom: 12 }}>
              Tu firma
            </p>

            {user?.signature_url ? (
              <>
                {/* Signature preview */}
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: '100%',
                    height: 50,
                    border: `1.5px dashed ${V2.border}`,
                    borderRadius: V2.radiusMd,
                    marginBottom: 14,
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src={user.signature_url}
                    alt="Tu firma"
                    style={{ maxHeight: 40, objectFit: 'contain' }}
                  />
                </div>

                {/* Sign button */}
                <button
                  onClick={handleSign}
                  disabled={signing}
                  className="flex items-center justify-center gap-2"
                  style={{
                    width: '100%',
                    height: 44,
                    background: V2.black,
                    color: V2.white,
                    border: 'none',
                    borderRadius: V2.radiusFull,
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: V2.fontSans,
                    cursor: signing ? 'default' : 'pointer',
                    opacity: signing ? 0.7 : 1,
                  }}
                >
                  {signing ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    'Aplicar mi firma y sellar'
                  )}
                </button>

                {/* Legal text */}
                <p style={{ color: V2.stone, fontSize: 10, marginTop: 10, lineHeight: 1.5 }}>
                  Al firmar confirmas que has leído y aceptas todos los términos del contrato.
                  La firma queda registrada con fecha, hora e IP.
                </p>
              </>
            ) : (
              <>
                {/* No signature card */}
                <div
                  className="flex items-center gap-3"
                  style={{
                    background: V2.blueLight,
                    border: `1px solid ${V2.border}`,
                    borderRadius: V2.radiusMd,
                    padding: 14,
                    marginBottom: 14,
                  }}
                >
                  <AlertCircle size={18} style={{ color: V2.blue, flexShrink: 0 }} />
                  <p style={{ color: V2.black, fontSize: 13 }}>
                    Necesitas subir tu firma digital antes de poder firmar contratos
                  </p>
                </div>

                <button
                  onClick={() => navigate('/settings/signature')}
                  style={{
                    width: '100%',
                    height: 44,
                    background: V2.black,
                    color: V2.white,
                    border: 'none',
                    borderRadius: V2.radiusFull,
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: V2.fontSans,
                    cursor: 'pointer',
                  }}
                >
                  Ir a configurar mi firma →
                </button>
              </>
            )}
          </motion.div>
        )}

        {/* ─ Section 5: Both signed ──────────────── */}
        {bothSigned && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            style={{
              background: V2.greenLight,
              border: `1px solid ${V2.greenBorder}`,
              borderRadius: V2.radiusMd,
              padding: 20,
              marginBottom: 16,
            }}
          >
            <div className="flex flex-col items-center" style={{ textAlign: 'center' }}>
              <div
                className="flex items-center justify-center"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: V2.radiusFull,
                  background: V2.green,
                  marginBottom: 12,
                }}
              >
                <Check size={32} style={{ color: V2.white }} strokeWidth={2.5} />
              </div>
              <p style={{ fontSize: 15, fontWeight: 600, color: V2.black, marginBottom: 4 }}>
                Contrato firmado por ambas partes
              </p>
              <p style={{ fontSize: 12, color: V2.stone }}>
                {fmtDate(
                  operation.contract?.buyer_signature_at > operation.contract?.seller_signature_at
                    ? operation.contract.buyer_signed_at
                    : operation.contract?.seller_signature_at
                )}
              </p>

              <button
                onClick={() => pdfUrl && window.open(pdfUrl, '_blank')}
                className="flex items-center justify-center gap-2"
                style={{
                  marginTop: 18,
                  width: '100%',
                  height: 44,
                  background: V2.black,
                  color: V2.white,
                  border: 'none',
                  borderRadius: V2.radiusFull,
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: V2.fontSans,
                  cursor: 'pointer',
                }}
              >
                <Download size={16} />
                Descargar contrato firmado
              </button>

              <button
                onClick={() => navigate(`/b2b/operations/${operationId}`)}
                style={{
                  marginTop: 8,
                  width: '100%',
                  height: 44,
                  background: V2.white,
                  color: V2.black,
                  border: `1px solid ${V2.border}`,
                  borderRadius: V2.radiusFull,
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: V2.fontSans,
                  cursor: 'pointer',
                }}
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