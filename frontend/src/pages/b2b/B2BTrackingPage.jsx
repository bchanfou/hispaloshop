import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MessageCircle,
  Check,
  Package,
  FileText,
  Sparkles,
  ExternalLink,
  Upload,
  Eye,
  Download,
  Plus,
} from 'lucide-react';
import apiClient from '@/services/api/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

/* ── V2 design tokens ─────────────────────────────── */
const V2 = {
  black:       '#0A0A0A',
  cream:       '#F7F6F2',
  stone:       '#8A8881',
  white:       '#FFFFFF',
  border:      '#E5E2DA',
  surface:     '#F0EDE8',
  green:       '#0c0a09',
  greenLight:  '#f5f5f4',
  greenBorder: '#d6d3d1',
  blue:        '#57534e',
  blueLight:   '#f5f5f4',
  amber:       '#78716c',
  amberLight:  '#fafaf9',
  red:         '#dc2626',
  redLight:    '#fef2f2',
  fontSans:    'Inter, sans-serif',
  radiusMd:    12,
  radiusFull:  9999,
};

/* ── Timeline stages ──────────────────────────────── */
const STAGES = [
  { key: 'contract_signed',    label: 'Firmado' },
  { key: 'payment_confirmed',  label: 'Pagado' },
  { key: 'in_transit',         label: 'Enviado' },
  { key: 'customs_clearance',  label: 'Aduana' },
  { key: 'delivered',          label: 'Entregado' },
];

const STATUS_TO_STEP = {
  contract_generated: 0,
  contract_pending:  0,
  contract_signed:   0,
  payment_pending:   1,
  payment_confirmed: 1,
  in_transit:        2,
  customs_clearance: 3,
  delivered:         4,
  completed:         4,
};

/* ── Carrier helpers ──────────────────────────────── */
const CARRIERS = [
  'Correos Express', 'MRW', 'DHL', 'FedEx', 'UPS', 'SEUR', 'GLS', 'Otro',
];

const carrierTrackingUrl = (carrier, code) => {
  const c = carrier?.toLowerCase() || '';
  if (c.includes('correos'))  return `https://www.correosexpress.com/web/correosexpress/detalle-envio?tracking=${code}`;
  if (c.includes('mrw'))      return `https://www.mrw.es/seguimiento_envios/MRW_seguimiento.asp?codigo=${code}`;
  if (c.includes('dhl'))      return `https://www.dhl.com/es-es/home/tracking.html?tracking-id=${code}`;
  if (c.includes('fedex'))    return `https://www.fedex.com/fedextrack/?trknbr=${code}`;
  if (c.includes('ups'))      return `https://www.ups.com/track?tracknum=${code}`;
  if (c.includes('seur'))     return `https://www.seur.com/livetracking/?segOnlineIdentworlds=${code}`;
  if (c.includes('gls'))      return `https://www.gls-spain.es/es/seguimiento-de-envios/?match=${code}`;
  return null;
};

/* ── Pulse keyframe style (injected once) ─────────── */
const PULSE_CSS = `
@keyframes b2b-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(12,10,9,.45); }
  70%  { box-shadow: 0 0 0 8px rgba(12,10,9,0); }
  100% { box-shadow: 0 0 0 0 rgba(12,10,9,0); }
}
`;

/* ════════════════════════════════════════════════════ */
export default function B2BTrackingPage() {
  const { operationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [operation, setOperation]   = useState(null);
  const [documents, setDocuments]   = useState([]);
  const [loading, setLoading]       = useState(true);

  /* shipping form */
  const [trackingNum, setTrackingNum]     = useState('');
  const [selectedCarrier, setSelectedCarrier] = useState('');
  const [submitting, setSubmitting]       = useState(false);

  const fileInputRefs = useRef({});
  const extraFileRef  = useRef(null);

  /* ── fetch helpers ─────────────────────────────── */
  const fetchOperation = useCallback(async () => {
    try {
      const { data } = await apiClient.get(`/b2b/operations/${operationId}`);
      setOperation(data);
    } catch {
      toast.error('Error al cargar la operación');
    } finally {
      setLoading(false);
    }
  }, [operationId]);

  const fetchDocuments = useCallback(async () => {
    try {
      const { data } = await apiClient.get(`/b2b/operations/${operationId}/documents`);
      setDocuments(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
  }, [operationId]);

  useEffect(() => {
    fetchOperation();
    fetchDocuments();
  }, [fetchOperation, fetchDocuments]);

  /* poll operation every 10 s */
  useEffect(() => {
    const id = setInterval(fetchOperation, 10_000);
    return () => clearInterval(id);
  }, [fetchOperation]);

  /* ── derived ───────────────────────────────────── */
  const isProducer   = user?.role === 'producer' || user?.role === 'seller';
  const isBuyer      = !isProducer;
  const currentStep  = STATUS_TO_STEP[operation?.status] ?? 0;
  const shipment     = operation?.shipment || null;
  const last8        = operationId ? String(operationId).slice(-8).toUpperCase() : '';

  /* ── handlers ──────────────────────────────────── */
  const handleShip = async () => {
    if (!trackingNum.trim() || !selectedCarrier) {
      toast.error('Rellena todos los campos');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post(`/b2b/operations/${operationId}/ship`, {
        tracking_number: trackingNum.trim(),
        carrier: selectedCarrier,
      });
      toast.success('Envío confirmado');
      fetchOperation();
    } catch {
      toast.error('No se pudo confirmar el envío');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDocUpload = async (file, docName) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('document_type', docName);
    try {
      await apiClient.post(`/b2b/operations/${operationId}/documents`, fd);
      toast.success('Documento subido');
      fetchDocuments();
    } catch {
      toast.error('Error al subir documento');
    }
  };

  const handleExtraDoc = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('document_type', file.name);
    try {
      await apiClient.post(`/b2b/operations/${operationId}/documents`, fd);
      toast.success('Documento subido');
      fetchDocuments();
    } catch {
      toast.error('Error al subir documento');
    }
  };

  /* ── payment section logic ─────────────────────── */
  const showFinalPayment = (() => {
    if (!operation) return false;
    const isSplit = operation.payment_terms === 'letter_of_credit';
    const rightStatus = ['in_transit', 'delivered', 'customs_clearance'].includes(operation.status);
    const noFinal = !(operation.payments || []).some((p) => p.type === 'final');
    return isSplit && rightStatus && noFinal;
  })();

  const finalAmount = operation?.final_amount
    ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(operation.final_amount)
    : '';

  /* ── loading / error ───────────────────────────── */
  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: V2.cream, fontFamily: V2.fontSans }}>
        <div style={{ color: V2.stone, fontSize: 14 }}>Cargando...</div>
      </div>
    );
  }

  if (!operation) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-3" style={{ background: V2.cream, fontFamily: V2.fontSans }}>
        <div style={{ color: V2.black, fontSize: 15, fontWeight: 600 }}>Operación no encontrada</div>
        <button
          onClick={() => navigate(-1)}
          style={{ color: V2.stone, fontSize: 13, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Volver
        </button>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════ */
  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: V2.cream, fontFamily: V2.fontSans }}>
      {/* inject pulse animation */}
      <style>{PULSE_CSS}</style>

      {/* ── TopBar ─────────────────────────────────── */}
      <div
        className="sticky top-0 z-30 flex items-center justify-between px-4"
        style={{
          height: 56,
          background: 'rgba(247,246,242,.82)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${V2.border}`,
        }}
      >
        <button onClick={() => navigate(-1)} className="flex items-center justify-center" style={{ width: 36, height: 36, background: 'none', border: 'none', cursor: 'pointer' }}>
          <ArrowLeft size={20} color={V2.black} />
        </button>
        <div style={{ fontSize: 14, fontWeight: 600, color: V2.black, letterSpacing: '-0.01em' }}>
          Operación #HSP-B2B-{last8}
        </div>
        <button
          onClick={() => navigate(`/b2b/chat/${operationId}`)}
          className="flex items-center justify-center"
          style={{ width: 36, height: 36, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <MessageCircle size={20} color={V2.black} />
        </button>
      </div>

      {/* ── Scrollable body ────────────────────────── */}
      <div className="flex-1 overflow-y-auto" style={{ padding: 16, paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
        <div className="flex flex-col" style={{ gap: 16 }}>

          {/* ═══ Section 1 — Timeline ═══════════════ */}
          <div style={{ background: V2.white, border: `1px solid ${V2.border}`, borderRadius: V2.radiusMd, padding: 16 }}>
            <div className="flex items-center" style={{ position: 'relative' }}>
              {STAGES.map((stage, i) => {
                const completed = i < currentStep;
                const active    = i === currentStep;
                const pending   = i > currentStep;

                /* find date for completed stages */
                const stageDate = operation?.timeline?.[stage.key];

                return (
                  <React.Fragment key={stage.key}>
                    {/* connector line (before every step except first) */}
                    {i > 0 && (
                      <div className="flex-1" style={{ height: 2, background: completed || active ? V2.black : V2.border }} />
                    )}

                    {/* step column */}
                    <div className="flex flex-col items-center" style={{ minWidth: 36 }}>
                      {/* circle */}
                      <div
                        className={`flex items-center justify-center${active ? ' step-active' : ''}`}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          ...(completed
                            ? { background: V2.black }
                            : active
                              ? { background: V2.green }
                              : { background: 'transparent', border: `1.5px solid ${V2.stone}` }),
                        }}
                      >
                        {completed ? (
                          <Check size={14} color={V2.white} strokeWidth={2.5} />
                        ) : (
                          <span style={{ fontSize: 11, fontWeight: 600, color: active ? V2.white : V2.stone }}>
                            {i + 1}
                          </span>
                        )}
                      </div>

                      {/* label */}
                      <span style={{ fontSize: 10, color: completed || active ? V2.black : V2.stone, marginTop: 6, fontWeight: active ? 600 : 400, textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {stage.label}
                      </span>

                      {/* date */}
                      {stageDate && (
                        <span style={{ fontSize: 9, color: V2.stone, marginTop: 2 }}>
                          {new Date(stageDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* ═══ Section 2 — Shipping ═══════════════ */}
          <div style={{ background: V2.white, border: `1px solid ${V2.border}`, borderRadius: V2.radiusMd, padding: 16 }}>
            {!shipment && isProducer && (
              <div className="flex flex-col" style={{ gap: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: V2.black }}>Confirmar envío</div>

                {/* tracking number input */}
                <input
                  type="text"
                  placeholder="Número de seguimiento"
                  value={trackingNum}
                  onChange={(e) => setTrackingNum(e.target.value)}
                  style={{
                    width: '100%',
                    height: 44,
                    border: `1px solid ${V2.border}`,
                    borderRadius: V2.radiusMd,
                    padding: '0 12px',
                    fontSize: 13,
                    fontFamily: V2.fontSans,
                    color: V2.black,
                    background: V2.white,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />

                {/* carrier pills */}
                <div>
                  <div style={{ fontSize: 12, color: V2.stone, marginBottom: 8 }}>Transportista</div>
                  <div className="flex flex-wrap" style={{ gap: 8 }}>
                    {CARRIERS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setSelectedCarrier(c)}
                        style={{
                          height: 34,
                          padding: '0 14px',
                          borderRadius: V2.radiusFull,
                          fontSize: 12,
                          fontFamily: V2.fontSans,
                          fontWeight: 500,
                          cursor: 'pointer',
                          border: `1px solid ${selectedCarrier === c ? V2.black : V2.border}`,
                          background: selectedCarrier === c ? V2.black : V2.white,
                          color: selectedCarrier === c ? V2.white : V2.black,
                          transition: 'all .15s',
                        }}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* submit */}
                <button
                  onClick={handleShip}
                  disabled={submitting}
                  style={{
                    width: '100%',
                    height: 44,
                    borderRadius: V2.radiusFull,
                    background: V2.black,
                    color: V2.white,
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: V2.fontSans,
                    border: 'none',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.6 : 1,
                  }}
                >
                  {submitting ? 'Enviando...' : 'Confirmar envío'}
                </button>
              </div>
            )}

            {!shipment && isBuyer && (
              <div className="flex flex-col items-center justify-center" style={{ padding: '28px 16px', background: V2.surface, borderRadius: V2.radiusMd }}>
                <Package size={32} color={V2.stone} />
                <span style={{ fontSize: 13, color: V2.stone, marginTop: 10, textAlign: 'center' }}>
                  Esperando confirmación de envío del productor
                </span>
              </div>
            )}

            {shipment && (
              <div className="flex flex-col" style={{ gap: 10 }}>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 14, fontWeight: 600, color: V2.black }}>{shipment.carrier}</span>
                  <span style={{ fontSize: 13, color: V2.stone }}>{shipment.tracking_number}</span>
                </div>

                {shipment.last_status && (
                  <div style={{ fontSize: 13, color: V2.black }}>
                    Último estado: <span style={{ fontWeight: 500 }}>{shipment.last_status}</span>
                  </div>
                )}

                {shipment.estimated_delivery && (
                  <div style={{ fontSize: 13, color: V2.stone }}>
                    Entrega estimada: {new Date(shipment.estimated_delivery).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                )}

                {(() => {
                  const url = carrierTrackingUrl(shipment.carrier, shipment.tracking_number);
                  return url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center"
                      style={{
                        width: '100%',
                        height: 44,
                        borderRadius: V2.radiusFull,
                        background: V2.white,
                        border: `1px solid ${V2.border}`,
                        fontSize: 13,
                        fontWeight: 500,
                        color: V2.black,
                        textDecoration: 'none',
                        gap: 6,
                        marginTop: 4,
                        fontFamily: V2.fontSans,
                      }}
                    >
                      Rastrear en {shipment.carrier} <ExternalLink size={14} />
                    </a>
                  ) : null;
                })()}
              </div>
            )}
          </div>

          {/* ═══ Section 3 — Documentation ══════════ */}
          <div style={{ background: V2.white, border: `1px solid ${V2.border}`, borderRadius: V2.radiusMd, padding: 16 }}>
            <div className="flex items-center" style={{ gap: 8, marginBottom: 4 }}>
              <FileText size={18} color={V2.black} />
              <span style={{ fontSize: 14, fontWeight: 600, color: V2.black }}>Documentación</span>
            </div>
            <div style={{ fontSize: 12, color: V2.stone, marginBottom: 14 }}>
              Documentos necesarios para esta operación
            </div>

            {documents.map((doc, idx) => {
              const isUploaded = doc.status === 'uploaded';
              const isPending  = doc.status === 'pending';
              const isExpired  = doc.status === 'expired';

              const badgeStyle = {
                fontSize: 10,
                fontWeight: 500,
                padding: '3px 8px',
                borderRadius: V2.radiusFull,
                whiteSpace: 'nowrap',
              };

              return (
                <React.Fragment key={doc.id || idx}>
                  {idx > 0 && <div style={{ height: 0.5, background: V2.border, margin: '10px 0' }} />}
                  <div className="flex flex-col" style={{ gap: 6 }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center" style={{ gap: 8, minWidth: 0 }}>
                        <FileText size={16} color={V2.stone} style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: V2.black, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {doc.name || doc.document_type}
                        </span>
                      </div>

                      {/* status badge */}
                      {isUploaded && (
                        <span style={{ ...badgeStyle, background: V2.greenLight, color: V2.green }}>Subido</span>
                      )}
                      {isPending && (
                        <span style={{ ...badgeStyle, background: V2.amberLight, color: V2.amber }}>Pendiente</span>
                      )}
                      {isExpired && (
                        <span style={{ ...badgeStyle, background: V2.redLight, color: V2.red }}>Vencido</span>
                      )}
                    </div>

                    {/* actions row */}
                    <div className="flex items-center" style={{ gap: 10, marginLeft: 24 }}>
                      {isUploaded && (
                        <>
                          <button
                            onClick={() => window.open(doc.url, '_blank')}
                            className="flex items-center"
                            style={{ gap: 4, fontSize: 10, color: V2.blue, background: 'none', border: 'none', cursor: 'pointer', fontFamily: V2.fontSans }}
                          >
                            <Eye size={12} /> Ver
                          </button>
                          <a
                            href={doc.url}
                            download
                            className="flex items-center"
                            style={{ gap: 4, fontSize: 10, color: V2.blue, textDecoration: 'none', fontFamily: V2.fontSans }}
                          >
                            <Download size={12} /> Descargar
                          </a>
                        </>
                      )}

                      {isPending && isProducer && (
                        <>
                          <input
                            type="file"
                            ref={(el) => { fileInputRefs.current[doc.name || doc.document_type] = el; }}
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleDocUpload(f, doc.name || doc.document_type);
                            }}
                          />
                          <button
                            onClick={() => fileInputRefs.current[doc.name || doc.document_type]?.click()}
                            className="flex items-center"
                            style={{ gap: 4, fontSize: 10, color: V2.blue, background: 'none', border: 'none', cursor: 'pointer', fontFamily: V2.fontSans, fontWeight: 500 }}
                          >
                            <Upload size={12} /> Subir
                          </button>
                        </>
                      )}

                      {isExpired && doc.expiry_date && (
                        <span style={{ fontSize: 10, color: V2.red }}>
                          Renueva antes del {new Date(doc.expiry_date).toLocaleDateString('es-ES')}
                        </span>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}

            {/* extra doc button */}
            <input type="file" ref={extraFileRef} className="hidden" onChange={handleExtraDoc} />
            <button
              onClick={() => extraFileRef.current?.click()}
              className="flex items-center justify-center w-full"
              style={{
                marginTop: 14,
                height: 42,
                borderRadius: V2.radiusMd,
                border: `1.5px dashed ${V2.border}`,
                background: 'transparent',
                fontSize: 13,
                color: V2.stone,
                cursor: 'pointer',
                fontFamily: V2.fontSans,
                gap: 6,
              }}
            >
              <Plus size={14} /> Subir documento adicional
            </button>
          </div>

          {/* ═══ Section 4 — Pedro AI ══════════════ */}
          <div style={{ background: V2.greenLight, border: `1px solid ${V2.greenBorder}`, borderRadius: V2.radiusMd, padding: 16 }}>
            <div className="flex items-center" style={{ gap: 8, marginBottom: 10 }}>
              <Sparkles size={20} color={V2.green} />
              <span style={{ fontSize: 13, fontWeight: 600, color: V2.green }}>
                Pedro AI &middot; Asistente B2B
              </span>
            </div>

            <div style={{ fontSize: 12, color: V2.black, marginBottom: 14, lineHeight: 1.5 }}>
              Revisa la documentación pendiente antes del envío.
            </div>

            <button
              onClick={() => toast.info('Próximamente')}
              className="flex items-center justify-center"
              style={{
                width: '100%',
                height: 40,
                borderRadius: V2.radiusFull,
                background: V2.white,
                border: `1px solid ${V2.greenBorder}`,
                fontSize: 13,
                fontWeight: 500,
                color: V2.green,
                cursor: 'pointer',
                fontFamily: V2.fontSans,
              }}
            >
              Consultar a la IA
            </button>
          </div>

          {/* ═══ Section 5 — Final Payment ══════════ */}
          {showFinalPayment && (
            <div style={{ background: V2.amberLight, border: `1px solid ${V2.amber}`, borderRadius: V2.radiusMd, padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: V2.black, marginBottom: 12 }}>
                Pago final pendiente {finalAmount ? `· ${finalAmount}` : ''}
              </div>

              {isBuyer ? (
                <button
                  onClick={() => navigate(`/b2b/payment/${operationId}?type=final`)}
                  style={{
                    width: '100%',
                    height: 44,
                    borderRadius: V2.radiusFull,
                    background: V2.black,
                    color: V2.white,
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: V2.fontSans,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Pagar ahora
                </button>
              ) : (
                <div style={{ fontSize: 12, color: V2.stone }}>
                  El comprador realizará el pago final tras la entrega
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
