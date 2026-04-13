// @ts-nocheck
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Check, Package, FileText, Sparkles, ExternalLink, Upload, Eye, Download, Plus, Clock, Truck, CreditCard, Shield, PackageCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import apiClient from '../../services/api/client';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

/* -- Timeline stages -- */
import i18n from "../../locales/i18n";
const STAGES = [{
  key: 'contract_signed',
  label: 'Firmado'
}, {
  key: 'payment_confirmed',
  label: 'Pagado'
}, {
  key: 'in_transit',
  label: 'Enviado'
}, {
  key: 'customs_clearance',
  label: 'Aduana'
}, {
  key: 'delivered',
  label: 'Entregado'
}];
const STATUS_TO_STEP = {
  contract_generated: 0,
  contract_pending: 0,
  contract_signed: 0,
  payment_pending: 1,
  payment_confirmed: 1,
  in_transit: 2,
  customs_clearance: 3,
  delivered: 4,
  completed: 4
};

/* -- Carrier helpers -- */
const CARRIERS = ['Correos Express', 'MRW', 'DHL', 'FedEx', 'UPS', 'SEUR', 'GLS', 'Otro'];
const carrierTrackingUrl = (carrier, code) => {
  const c = carrier?.toLowerCase() || '';
  if (c.includes('correos')) return `https://www.correosexpress.com/web/correosexpress/detalle-envio?tracking=${code}`;
  if (c.includes('mrw')) return `https://www.mrw.es/seguimiento_envios/MRW_seguimiento.asp?codigo=${code}`;
  if (c.includes('dhl')) return `https://www.dhl.com/es-es/home/tracking.html?tracking-id=${code}`;
  if (c.includes('fedex')) return `https://www.fedex.com/fedextrack/?trknbr=${code}`;
  if (c.includes('ups')) return `https://www.ups.com/track?tracknum=${code}`;
  if (c.includes('seur')) return `https://www.seur.com/livetracking/?segOnlineIdentworlds=${code}`;
  if (c.includes('gls')) return `https://www.gls-spain.es/es/seguimiento-de-envios/?match=${code}`;
  return null;
};

/* -- Pulse keyframe style (injected once) -- */
/* -- Stage icons for vertical timeline -- */
const STAGE_ICONS = {
  contract_signed: FileText,
  payment_confirmed: CreditCard,
  in_transit: Truck,
  customs_clearance: Shield,
  delivered: PackageCheck
};

/* -- Format timestamp helper -- */
const fmtTimestamp = iso => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const date = d.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  const time = d.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  });
  return {
    date,
    time
  };
};
const safeDateStr = (iso, opts) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-ES', opts);
};
const PULSE_CSS = `
@keyframes b2b-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(12,10,9,.45); }
  70%  { box-shadow: 0 0 0 8px rgba(12,10,9,0); }
  100% { box-shadow: 0 0 0 0 rgba(12,10,9,0); }
}
`;

/* ======================================================= */
export default function B2BTrackingPage() {
  const {
    operationId
  } = useParams();
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const [operation, setOperation] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  /* shipping form */
  const [trackingNum, setTrackingNum] = useState('');
  const [selectedCarrier, setSelectedCarrier] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRefs = useRef({});
  const extraFileRef = useRef(null);

  /* -- fetch helpers -- */
  const fetchOperation = useCallback(async () => {
    try {
      const {
        data
      } = await apiClient.get(`/b2b/operations/${operationId}`);
      setOperation(data);
    } catch {
      toast.error(i18n.t('b2_b_tracking.errorAlCargarLaOperacion', 'Error al cargar la operación'));
    } finally {
      setLoading(false);
    }
  }, [operationId]);
  const fetchDocuments = useCallback(async () => {
    try {
      const {
        data
      } = await apiClient.get(`/b2b/operations/${operationId}/documents`);
      setDocuments(Array.isArray(data) ? data : []);
    } catch {/* silent */}
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

  /* -- derived -- */
  const isProducer = user?.role === 'producer' || user?.role === 'seller';
  const isBuyer = !isProducer;
  const currentStep = STATUS_TO_STEP[operation?.status] ?? 0;
  const shipment = operation?.shipment || null;
  const last8 = operationId ? String(operationId).slice(-8).toUpperCase() : '';

  /* -- handlers -- */
  const handleShip = async () => {
    if (!trackingNum.trim() || !selectedCarrier) {
      toast.error('Rellena todos los campos');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post(`/b2b/operations/${operationId}/ship`, {
        tracking_number: trackingNum.trim(),
        carrier: selectedCarrier
      });
      toast.success(i18n.t('b2_b_tracking.envioConfirmado', 'Envío confirmado'));
      fetchOperation();
    } catch {
      toast.error(i18n.t('b2_b_tracking.noSePudoConfirmarElEnvio', 'No se pudo confirmar el envío'));
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
  const handleExtraDoc = async e => {
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

  /* -- payment section logic -- */
  const showFinalPayment = (() => {
    if (!operation) return false;
    const isSplit = operation.payment_terms === 'letter_of_credit';
    const rightStatus = ['in_transit', 'delivered', 'customs_clearance'].includes(operation.status);
    const noFinal = !(operation.payments || []).some(p => p.type === 'final');
    return isSplit && rightStatus && noFinal;
  })();
  const finalAmount = operation?.final_amount ? new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  }).format(operation.final_amount) : '';

  /* -- loading / error -- */
  if (loading) {
    return <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="text-stone-500 text-sm">Cargando...</div>
      </div>;
  }
  if (!operation) {
    return <div className="fixed inset-0 flex flex-col items-center justify-center gap-3 bg-white px-6">
        <div className="text-stone-950 text-[15px] font-semibold">{i18n.t('b2_b_tracking.operacionNoEncontrada', 'Operación no encontrada')}</div>
        <p className="text-stone-500 text-[13px] text-center">{i18n.t('b2_b_tracking.noSePudoCargarLaOperacionSolicitad', 'No se pudo cargar la operación solicitada.')}</p>
        <button onClick={() => {
        setLoading(true);
        fetchOperation();
      }} className="bg-stone-950 text-white rounded-full px-6 py-2.5 text-sm font-semibold border-none cursor-pointer">
          Reintentar
        </button>
        <button onClick={() => navigate(-1)} className="text-stone-500 text-[13px] bg-transparent border-none cursor-pointer">
          Volver
        </button>
      </div>;
  }

  /* ======================================================= */
  return <div className="fixed inset-0 flex flex-col bg-white">
      {/* inject pulse animation */}
      <style>{PULSE_CSS}</style>

      {/* -- TopBar -- */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-white/80 backdrop-blur-xl border-b border-stone-200">
        <button onClick={() => navigate(-1)} aria-label="Volver" className="flex items-center justify-center w-9 h-9 bg-transparent border-none cursor-pointer">
          <ArrowLeft size={20} className="text-stone-950" />
        </button>
        <div className="text-sm font-semibold text-stone-950 tracking-tight">
          Operación #HSP-B2B-{last8}
        </div>
        <button onClick={() => navigate(`/messages/${operationId}?type=b2b`)} aria-label={i18n.t('b2_b_tracking.abrirChatDeLaOperacion', 'Abrir chat de la operación')} className="flex items-center justify-center w-9 h-9 bg-transparent border-none cursor-pointer">
          <MessageCircle size={20} className="text-stone-950" />
        </button>
      </div>

      {/* -- Scrollable body -- */}
      <div className="flex-1 overflow-y-auto p-4 pb-[max(16px,env(safe-area-inset-bottom))]">
        <div className="flex flex-col gap-4">

          {/* === Section 1 -- Timeline === */}
          <div className="bg-white shadow-sm rounded-xl p-4">
            <div className="flex items-center relative">
              {STAGES.map((stage, i) => {
              const completed = i < currentStep;
              const active = i === currentStep;

              /* find date for completed stages */
              const stageDate = operation?.timeline?.[stage.key];
              return <React.Fragment key={stage.key}>
                    {/* connector line (before every step except first) */}
                    {i > 0 && <div className={`flex-1 h-0.5 ${completed || active ? 'bg-stone-950' : 'bg-stone-200'}`} />}

                    {/* step column */}
                    <div className="flex flex-col items-center min-w-[36px]">
                      {/* circle */}
                      <div className={`relative flex items-center justify-center w-7 h-7 rounded-full ${completed ? 'bg-stone-950' : active ? 'bg-stone-950' : 'bg-transparent border-[1.5px] border-stone-500'}${active ? ' step-active' : ''}`}>
                        {active && <motion.div animate={{
                      scale: [1, 1.2, 1]
                    }} transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut'
                    }} className="absolute inset-0 rounded-full bg-stone-950/20" />}
                        {completed ? <Check size={14} className="text-white" strokeWidth={2.5} /> : <span className={`text-[11px] font-semibold ${active ? 'text-white' : 'text-stone-500'}`}>
                            {i + 1}
                          </span>}
                      </div>

                      {/* label */}
                      <span className={`text-[10px] mt-1.5 text-center whitespace-nowrap ${completed || active ? 'text-stone-950 font-semibold' : 'text-stone-500'}`}>
                        {stage.label}
                      </span>

                      {/* date */}
                      {stageDate && <span className="text-[9px] text-stone-500 mt-0.5">
                          {safeDateStr(stageDate, {
                      day: 'numeric',
                      month: 'short'
                    })}
                        </span>}
                    </div>
                  </React.Fragment>;
            })}
            </div>
          </div>

          {/* === Estimated Delivery === */}
          {shipment?.estimated_delivery && <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3">
              <Clock size={16} className="text-stone-500 flex-shrink-0" />
              <span className="text-[13px] text-stone-950 font-medium">
                Entrega estimada: {safeDateStr(shipment.estimated_delivery, {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
              </span>
            </div>}

          {/* === Tracking History Timeline === */}
          {operation?.status_history && operation.status_history.length > 0 && <div className="bg-white shadow-sm rounded-xl p-4">
              <div className="text-sm font-semibold text-stone-950 mb-3.5">Historial de seguimiento</div>
              <div className="relative pl-6">
                {/* Connecting vertical line */}
                <div className="absolute left-[9px] top-2 bottom-2 w-[2px] bg-stone-200" />

                {operation.status_history.map((entry, idx) => {
              const stageKey = entry.status || entry.stage;
              const stageMatch = STAGES.find(s => s.key === stageKey);
              const label = stageMatch?.label || entry.label || stageKey;
              const Icon = STAGE_ICONS[stageKey] || Clock;
              const ts = fmtTimestamp(entry.timestamp || entry.created_at || entry.date);
              const isLatest = idx === 0;
              return <div key={idx} className="relative flex items-start gap-3 mb-4 last:mb-0">
                      {/* Dot */}
                      <div className={`absolute -left-6 top-0.5 flex items-center justify-center w-5 h-5 rounded-full z-10 ${isLatest ? 'bg-stone-950' : 'bg-stone-200'}`}>
                        <Icon size={11} className={isLatest ? 'text-white' : 'text-stone-500'} strokeWidth={2} />
                      </div>

                      {/* Content */}
                      <div className="flex flex-col">
                        <span className={`text-[13px] font-medium ${isLatest ? 'text-stone-950' : 'text-stone-600'}`}>
                          {label}
                        </span>
                        {ts && <span className="text-[11px] text-stone-500 mt-0.5">
                            {ts.date} · {ts.time}
                          </span>}
                        {entry.description && <span className="text-[11px] text-stone-500 mt-0.5">
                            {entry.description}
                          </span>}
                      </div>
                    </div>;
            })}
              </div>
            </div>}

          {/* === Section 2 -- Shipping === */}
          <div className="bg-white shadow-sm rounded-xl p-4">
            {!shipment && isProducer && <div className="flex flex-col gap-3.5">
                <div className="text-sm font-semibold text-stone-950">{i18n.t('b2_b_tracking.confirmarEnvio', 'Confirmar envío')}</div>

                {/* tracking number input */}
                <input type="text" placeholder={i18n.t('orders.shipping.trackingNumber', 'Número de seguimiento')} value={trackingNum} onChange={e => setTrackingNum(e.target.value)} className="w-full h-11 border border-stone-200 rounded-xl px-3 text-[13px] text-stone-950 bg-white outline-none box-border" />

                {/* carrier pills */}
                <div>
                  <div className="text-xs text-stone-500 mb-2">Transportista</div>
                  <div className="flex flex-wrap gap-2">
                    {CARRIERS.map(c => <button key={c} onClick={() => setSelectedCarrier(c)} className={`h-[34px] px-3.5 rounded-full text-xs font-medium cursor-pointer transition-all duration-150 border ${selectedCarrier === c ? 'border-stone-950 bg-stone-950 text-white' : 'border-stone-200 bg-white text-stone-950'}`}>
                        {c}
                      </button>)}
                  </div>
                </div>

                {/* submit */}
                <button onClick={handleShip} disabled={submitting} className="w-full h-11 rounded-full bg-stone-950 text-white text-sm font-semibold border-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
                  {submitting ? 'Enviando...' : i18n.t('b2_b_tracking.confirmarEnvio', 'Confirmar envío')}
                </button>
              </div>}

            {!shipment && isBuyer && <div className="flex flex-col items-center justify-center p-7 bg-stone-100 rounded-xl">
                <Package size={32} className="text-stone-500" />
                <span className="text-[13px] text-stone-500 mt-2.5 text-center">
                  Esperando confirmación de envío del productor
                </span>
              </div>}

            {shipment && <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-stone-950">{shipment.carrier}</span>
                  <span className="text-[13px] text-stone-500">{shipment.tracking_number}</span>
                </div>

                {shipment.last_status && <div className="text-[13px] text-stone-950">
                    Último estado: <span className="font-medium">{shipment.last_status}</span>
                  </div>}

                {shipment.estimated_delivery && <div className="text-[13px] text-stone-500">
                    Entrega estimada: {safeDateStr(shipment.estimated_delivery, {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
                  </div>}

                {(() => {
              const url = carrierTrackingUrl(shipment.carrier, shipment.tracking_number);
              return url ? <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Rastrear envío en ${shipment.carrier}`} className="flex items-center justify-center w-full h-11 rounded-full bg-white border border-stone-200 text-[13px] font-medium text-stone-950 no-underline gap-1.5 mt-1">
                      Rastrear en {shipment.carrier} <ExternalLink size={14} />
                    </a> : null;
            })()}
              </div>}
          </div>

          {/* === Section 3 -- Documentation === */}
          <div className="bg-white shadow-sm rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText size={18} className="text-stone-950" />
              <span className="text-sm font-semibold text-stone-950">{i18n.t('b2_b_tracking.documentacion', 'Documentación')}</span>
            </div>
            <div className="text-xs text-stone-500 mb-3.5">
              Documentos necesarios para esta operación
            </div>

            {documents.map((doc, idx) => {
            const isUploaded = doc.status === 'uploaded';
            const isPending = doc.status === 'pending';
            const isExpired = doc.status === 'expired';
            return <React.Fragment key={doc.id || idx}>
                  {idx > 0 && <div className="h-px bg-stone-200 my-2.5" />}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText size={16} className="text-stone-500 flex-shrink-0" />
                        <span className="text-[13px] text-stone-950 overflow-hidden text-ellipsis whitespace-nowrap">
                          {doc.name || doc.document_type}
                        </span>
                      </div>

                      {/* status badge */}
                      {isUploaded && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap bg-stone-100 text-stone-950">Subido</span>}
                      {isPending && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap bg-stone-50 text-stone-500">Pendiente</span>}
                      {isExpired && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap bg-stone-100 text-stone-600">Vencido</span>}
                    </div>

                    {/* actions row */}
                    <div className="flex items-center gap-2.5 ml-6">
                      {isUploaded && <>
                          <button onClick={() => window.open(doc.url, '_blank')} className="flex items-center gap-1 text-[10px] text-stone-600 bg-transparent border-none cursor-pointer">
                            <Eye size={12} /> Ver
                          </button>
                          <a href={doc.url} download className="flex items-center gap-1 text-[10px] text-stone-600 no-underline">
                            <Download size={12} /> Descargar
                          </a>
                        </>}

                      {isPending && isProducer && <>
                          <input type="file" ref={el => {
                      fileInputRefs.current[doc.name || doc.document_type] = el;
                    }} className="hidden" onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) handleDocUpload(f, doc.name || doc.document_type);
                    }} />
                          <button onClick={() => fileInputRefs.current[doc.name || doc.document_type]?.click()} className="flex items-center gap-1 text-[10px] text-stone-600 bg-transparent border-none cursor-pointer font-medium">
                            <Upload size={12} /> Subir
                          </button>
                        </>}

                      {isExpired && doc.expiry_date && <span className="text-[10px] text-stone-500">
                          Renueva antes del {safeDateStr(doc.expiry_date)}
                        </span>}
                    </div>
                  </div>
                </React.Fragment>;
          })}

            {/* extra doc button */}
            <input type="file" ref={extraFileRef} className="hidden" onChange={handleExtraDoc} />
            <button onClick={() => extraFileRef.current?.click()} className="flex items-center justify-center w-full mt-3.5 h-[42px] rounded-xl border-[1.5px] border-dashed border-stone-200 bg-transparent text-[13px] text-stone-500 cursor-pointer gap-1.5">
              <Plus size={14} /> Subir documento adicional
            </button>
          </div>

          {/* === Section 4 -- Pedro AI === */}
          <div className="bg-stone-100 shadow-sm rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2.5">
              <Sparkles size={20} className="text-stone-950" />
              <span className="text-[13px] font-semibold text-stone-950">
                Pedro AI &middot; Asistente B2B
              </span>
            </div>

            <div className="text-xs text-stone-950 mb-3.5 leading-relaxed">
              Revisa la documentación pendiente antes del envío.
            </div>

            <button onClick={() => toast.info(i18n.t('b2_b_tracking.proximamente', 'Próximamente'))} className="flex items-center justify-center w-full h-10 rounded-full bg-white border border-stone-200 text-[13px] font-medium text-stone-950 cursor-pointer">
              Consultar a la IA
            </button>
          </div>

          {/* === Section 5 -- Final Payment === */}
          {showFinalPayment && <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
              <div className="text-sm font-semibold text-stone-950 mb-3">
                Pago final pendiente {finalAmount ? `· ${finalAmount}` : ''}
              </div>

              {isBuyer ? <button onClick={() => navigate(`/b2b/payment/${operationId}?type=final`)} className="w-full h-11 rounded-full bg-stone-950 text-white text-sm font-semibold border-none cursor-pointer">
                  Pagar ahora
                </button> : <div className="text-xs text-stone-500">
                  El comprador realizará el pago final tras la entrega
                </div>}
            </div>}

        </div>
      </div>
    </div>;
}