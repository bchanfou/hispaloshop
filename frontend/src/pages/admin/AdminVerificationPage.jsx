import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Loader2, Check, X, AlertCircle, Clock, FileText,
  Camera, Award, ChevronRight, Send, Eye, ShieldCheck, ShieldX,
} from 'lucide-react';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';

/* ── Design tokens ──────────────────────────────────────── */
const T = {
  black: '#0A0A0A', cream: '#ffffff', stone: '#8A8881',
  white: '#FFFFFF', border: '#E5E2DA', surface: '#F0EDE8',
  green: '#0c0a09', greenLight: '#f5f5f4',
  amber: '#78716c', amberLight: '#fafaf9',
  red: '#DC2626', redLight: '#FEE2E2',
  radius: '16px',
};

const STATUS_LABELS = {
  verified: { label: 'Verificado', bg: T.greenLight, color: T.green },
  rejected: { label: 'Rechazado', bg: T.redLight, color: T.red },
  manual_review: { label: 'Revisión', bg: T.amberLight, color: T.amber },
  pending: { label: 'Pendiente', bg: T.surface, color: T.stone },
  expired: { label: 'Caducado', bg: T.redLight, color: T.red },
};

function DocBadge({ status }) {
  const s = STATUS_LABELS[status] || STATUS_LABELS.pending;
  return (
    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function DocThumb({ url, label, status, onClick }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 group">
      <div
        className="w-[52px] h-[52px] rounded-xl overflow-hidden flex items-center justify-center relative"
        style={{ border: `1px solid ${T.border}`, background: T.surface }}
      >
        {url ? (
          url.toLowerCase().endsWith('.pdf') ? (
            <FileText className="w-5 h-5" style={{ color: T.stone }} />
          ) : (
            <img src={url} alt={label} className="w-full h-full object-cover" />
          )
        ) : (
          <span className="text-[10px]" style={{ color: T.stone }}>—</span>
        )}
        <div className="absolute -bottom-1 -right-1">
          <DocBadge status={status} />
        </div>
      </div>
      <span className="text-[10px]" style={{ color: T.stone }}>{label}</span>
    </button>
  );
}

/* ── Verification Card ──────────────────────────────────── */
function VerificationCard({ item, onApprove, onReject, onRequestDocs, onViewDoc }) {
  const docs = item.documents || {};
  const cif = docs.cif_nif || {};
  const facility = docs.facility_photo || {};
  const certs = docs.certificates || [];

  return (
    <div className="p-4" style={{ background: T.white, borderRadius: T.radius, border: `1px solid ${T.border}` }}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
          style={{ background: T.surface, color: T.black }}
        >
          {(item.business_name || '?')[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate" style={{ color: T.black }}>{item.business_name}</p>
          <p className="text-[10px] truncate" style={{ color: T.stone }}>
            {item.email} · {item.country || 'ES'} · {item.role}
          </p>
        </div>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
          style={{ background: T.amberLight, color: T.amber }}
        >
          Revisión manual
        </span>
      </div>

      {/* Review reason */}
      {item.admin_review_reason && (
        <p className="text-[11px] mb-3 px-2 py-1.5" style={{ color: T.amber, background: T.amberLight, borderRadius: '8px' }}>
          {item.admin_review_reason}
        </p>
      )}

      {/* Document thumbnails */}
      <div className="flex items-start gap-3 mb-4 overflow-x-auto pb-1">
        <DocThumb
          url={cif.url}
          label="CIF/NIF"
          status={cif.status}
          onClick={() => onViewDoc(item, 'cif_nif', cif)}
        />
        <DocThumb
          url={facility.url}
          label="Instalación"
          status={facility.status}
          onClick={() => onViewDoc(item, 'facility_photo', facility)}
        />
        {certs.map((c, i) => (
          <DocThumb
            key={i}
            url={c.url}
            label={c.name || c.type}
            status={c.status}
            onClick={() => onViewDoc(item, 'certificate', c)}
          />
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          className="flex-1 py-2.5 text-xs font-bold transition-colors"
          style={{ background: T.green, color: T.white, borderRadius: T.radius }}
          onClick={() => onApprove(item)}
        >
          Aprobar
        </button>
        <button
          className="flex-1 py-2.5 text-xs font-bold transition-colors"
          style={{ background: T.white, color: T.black, borderRadius: T.radius, border: `1px solid ${T.border}` }}
          onClick={() => onRequestDocs(item)}
        >
          Solicitar docs
        </button>
        <button
          className="flex-1 py-2.5 text-xs font-bold transition-colors"
          style={{ background: T.red, color: T.white, borderRadius: T.radius }}
          onClick={() => onReject(item)}
        >
          Rechazar
        </button>
      </div>
    </div>
  );
}

/* ── Document Viewer Modal ──────────────────────────────── */
function DocumentModal({ doc, docType, item, onClose }) {
  if (!doc) return null;
  const isPdf = doc.url && doc.url.toLowerCase().endsWith('.pdf');
  const confidence = doc.confidence || doc.ai_confidence;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40 }}
        animate={{ y: 0 }}
        exit={{ y: 40 }}
        className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto"
        style={{ background: T.white, borderRadius: '20px 20px 0 0', padding: '20px' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold" style={{ color: T.black }}>
            {docType === 'cif_nif' ? 'CIF/NIF' : docType === 'facility_photo' ? 'Foto de instalación' : 'Certificado'}
          </h3>
          <button onClick={onClose}>
            <X className="w-5 h-5" style={{ color: T.stone }} />
          </button>
        </div>

        {/* Document viewer */}
        {doc.url && (
          <div className="mb-4 rounded-xl overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
            {isPdf ? (
              <div className="h-64 flex items-center justify-center" style={{ background: T.surface }}>
                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-medium" style={{ color: T.black }}>
                  <FileText className="w-5 h-5" /> Abrir PDF en nueva pestaña
                </a>
              </div>
            ) : (
              <img src={doc.url} alt="Document" className="w-full" style={{ maxHeight: '300px', objectFit: 'contain' }} />
            )}
          </div>
        )}

        {/* AI extracted info */}
        <div className="space-y-2 mb-4">
          {docType === 'cif_nif' && (
            <>
              {doc.number && <InfoRow label="Número" value={doc.number} />}
              {doc.entity_name && <InfoRow label="Entidad" value={doc.entity_name} />}
            </>
          )}
          {docType === 'facility_photo' && doc.ai_assessment && (
            <InfoRow label="Descripción IA" value={doc.ai_assessment} />
          )}
          {docType === 'certificate' && (
            <>
              {doc.issued_to && <InfoRow label="Emitido a" value={doc.issued_to} />}
              {doc.issuer && <InfoRow label="Emisor" value={doc.issuer} />}
              {doc.expiry_date && <InfoRow label="Caduca" value={doc.expiry_date} />}
            </>
          )}
          <DocBadge status={doc.status} />
          {confidence && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full ml-2"
              style={{
                background: confidence === 'high' ? T.greenLight : confidence === 'medium' ? T.amberLight : T.redLight,
                color: confidence === 'high' ? T.green : confidence === 'medium' ? T.amber : T.red,
              }}
            >
              Confianza {confidence}
            </span>
          )}
        </div>

        <button
          className="w-full py-2.5 text-sm font-semibold transition-colors"
          style={{ background: T.black, color: T.white, borderRadius: T.radius }}
          onClick={onClose}
        >
          Cerrar
        </button>
      </motion.div>
    </motion.div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="font-medium shrink-0" style={{ color: T.stone }}>{label}:</span>
      <span style={{ color: T.black }}>{value}</span>
    </div>
  );
}

/* ── Reject Modal ───────────────────────────────────────── */
function RejectModal({ item, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  const [docs, setDocs] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const toggleDoc = (d) => {
    setDocs(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

  const handleConfirm = async () => {
    if (!reason.trim()) return toast.error('Escribe un motivo');
    setSubmitting(true);
    await onConfirm(item.user_id, reason, docs);
    setSubmitting(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }}
        className="w-full sm:max-w-md"
        style={{ background: T.white, borderRadius: '20px 20px 0 0', padding: '20px' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-bold mb-4" style={{ color: T.black }}>Rechazar verificación</h3>

        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Motivo del rechazo (obligatorio)"
          rows={3}
          className="w-full p-3 text-sm mb-3 resize-none"
          style={{ border: `1px solid ${T.border}`, borderRadius: '12px', outline: 'none', color: T.black }}
        />

        <p className="text-xs font-medium mb-2" style={{ color: T.stone }}>Documentos problemáticos:</p>
        <div className="space-y-2 mb-4">
          {['CIF/NIF no válido', 'Foto de instalación no válida', 'Certificado no válido', 'Datos inconsistentes'].map(d => (
            <label key={d} className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: T.black }}>
              <input
                type="checkbox"
                checked={docs.includes(d)}
                onChange={() => toggleDoc(d)}
                className="accent-stone-950"
              />
              {d}
            </label>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            className="flex-1 py-2.5 text-sm font-semibold transition-colors"
            style={{ border: `1px solid ${T.border}`, borderRadius: T.radius, color: T.black, background: T.white }}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="flex-1 py-2.5 text-sm font-bold transition-colors disabled:opacity-50"
            style={{ background: T.red, color: T.white, borderRadius: T.radius }}
            onClick={handleConfirm}
            disabled={submitting || !reason.trim()}
          >
            {submitting ? <Loader2 className="w-4 h-4 mx-auto animate-spin" /> : 'Confirmar rechazo'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Request Docs Modal ─────────────────────────────────── */
function RequestDocsModal({ item, onClose, onConfirm }) {
  const name = item.business_name || 'Productor';
  const [message, setMessage] = useState(
    `Hola ${name}, hemos revisado tu documentación y necesitamos que nos envíes documentación adicional para completar la verificación.`
  );
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    await onConfirm(item.user_id, message);
    setSubmitting(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }}
        className="w-full sm:max-w-md"
        style={{ background: T.white, borderRadius: '20px 20px 0 0', padding: '20px' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-bold mb-4" style={{ color: T.black }}>Solicitar documentación</h3>

        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={4}
          className="w-full p-3 text-sm mb-4 resize-none"
          style={{ border: `1px solid ${T.border}`, borderRadius: '12px', outline: 'none', color: T.black }}
        />

        <div className="flex gap-2">
          <button
            className="flex-1 py-2.5 text-sm font-semibold transition-colors"
            style={{ border: `1px solid ${T.border}`, borderRadius: T.radius, color: T.black, background: T.white }}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="flex-1 py-2.5 text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: T.black, color: T.white, borderRadius: T.radius }}
            onClick={handleConfirm}
            disabled={submitting || !message.trim()}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Enviar</>}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Main Component ─────────────────────────────────────── */
export default function AdminVerificationPage() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  // Modals
  const [docModal, setDocModal] = useState(null); // { doc, docType, item }
  const [rejectModal, setRejectModal] = useState(null);
  const [docsModal, setDocsModal] = useState(null);

  const fetchQueue = useCallback(async () => {
    try {
      const data = await apiClient.get(`/admin/verification/queue?status=${filter}`);
      setQueue(data?.queue || []);
    } catch {
      setQueue([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    fetchQueue();
  }, [fetchQueue]);

  const handleApprove = async (item) => {
    try {
      await apiClient.post(`/admin/verification/${item.user_id}/approve`, {});
      toast.success(`${item.business_name} verificado`);
      fetchQueue();
    } catch {
      toast.error('Error al aprobar');
    }
  };

  const handleReject = async (userId, reason, docs) => {
    try {
      await apiClient.post(`/admin/verification/${userId}/reject`, { reason, documents: docs });
      toast.success('Verificación rechazada');
      setRejectModal(null);
      fetchQueue();
    } catch {
      toast.error('Error al rechazar');
    }
  };

  const handleRequestDocs = async (userId, message) => {
    try {
      await apiClient.post(`/admin/verification/${userId}/request-more-docs`, { message });
      toast.success('Solicitud enviada');
      setDocsModal(null);
    } catch {
      toast.error('Error al enviar solicitud');
    }
  };

  const filters = [
    { key: 'pending', label: 'Pendientes' },
    { key: 'approved', label: 'Aprobadas' },
    { key: 'rejected', label: 'Rechazadas' },
  ];

  const pendingCount = filter === 'pending' ? queue.length : null;

  return (
    <div style={{ fontFamily: 'inherit', background: T.cream }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <h1 className="text-xl font-bold" style={{ color: T.black }}>Verificaciones</h1>
        {pendingCount > 0 && (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: T.redLight, color: T.red }}
          >
            {pendingCount}
          </span>
        )}
      </div>
      <p className="text-sm mb-4" style={{ color: T.stone }}>Revisión manual de productores</p>

      {/* Filters */}
      <div className="flex gap-2 mb-5">
        {filters.map(f => (
          <button
            key={f.key}
            className="px-4 py-2 text-xs font-semibold transition-colors"
            style={{
              borderRadius: T.radius,
              background: filter === f.key ? T.black : T.white,
              color: filter === f.key ? T.white : T.black,
              border: `1px solid ${filter === f.key ? T.black : T.border}`,
            }}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: T.stone }} />
        </div>
      ) : queue.length === 0 ? (
        <div className="text-center py-16">
          <ShieldCheck className="w-10 h-10 mx-auto mb-3" style={{ color: T.stone }} />
          <p className="text-sm font-medium" style={{ color: T.stone }}>
            {filter === 'pending' ? 'No hay verificaciones pendientes' : `No hay verificaciones ${filter === 'approved' ? 'aprobadas' : 'rechazadas'}`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map(item => (
            <VerificationCard
              key={item.user_id}
              item={item}
              onApprove={handleApprove}
              onReject={(item) => setRejectModal(item)}
              onRequestDocs={(item) => setDocsModal(item)}
              onViewDoc={(item, docType, doc) => setDocModal({ doc, docType, item })}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {docModal && (
          <DocumentModal
            doc={docModal.doc}
            docType={docModal.docType}
            item={docModal.item}
            onClose={() => setDocModal(null)}
          />
        )}
        {rejectModal && (
          <RejectModal
            item={rejectModal}
            onClose={() => setRejectModal(null)}
            onConfirm={handleReject}
          />
        )}
        {docsModal && (
          <RequestDocsModal
            item={docsModal}
            onClose={() => setDocsModal(null)}
            onConfirm={handleRequestDocs}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
