// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  FileText,
  Download,
  ShieldCheck,
  Loader2,
  Check,
  X,
  Award,
  Receipt,
} from 'lucide-react';
import apiClient from '../../services/api/client';

const fmtDate = (iso) => {
  if (!iso) return '\u2014';
  return new Date(iso).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const shortHash = (h) => (h ? `${String(h).slice(0, 12)}\u2026` : '\u2014');

/* ── Verification Modal ──────────────────────────────── */
function VerifyModal({ operationId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showFullHash, setShowFullHash] = useState(false);

  useEffect(() => {
    apiClient
      .get(`/documents/verify/${operationId}`)
      .then((data) => setResult(data))
      .catch((e) => setError(e?.message || 'Error al verificar'))
      .finally(() => setLoading(false));
  }, [operationId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="w-[90%] max-w-[380px] rounded-2xl bg-white p-6"
      >
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 size={28} className="animate-spin text-stone-500" />
            <p className="text-[13px] text-stone-500">
              Verificando integridad del documento...
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <X size={24} className="text-red-600" />
            </div>
            <p className="text-sm font-semibold text-stone-950">{error}</p>
            <button
              onClick={onClose}
              className="mt-2 rounded-full bg-stone-950 px-6 py-2.5 text-[13px] font-semibold text-white"
            >
              Cerrar
            </button>
          </div>
        ) : result?.verified ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-950">
              <Check size={28} className="text-white" strokeWidth={2.5} />
            </div>
            <p className="text-[15px] font-semibold text-stone-950">
              Documento íntegro
            </p>
            <p className="text-xs text-stone-500">
              El contrato no ha sido modificado desde su firma.
            </p>
            <div className="mt-1 w-full rounded-lg bg-stone-100 p-3">
              <p className="text-[10px] text-stone-500">Hash SHA-256</p>
              <p className="mt-1 break-all font-mono text-[10px] text-stone-950">
                {showFullHash ? result.stored_hash : shortHash(result.stored_hash)}
              </p>
              {!showFullHash && (
                <button
                  onClick={() => setShowFullHash(true)}
                  className="mt-1 bg-transparent p-0 text-[10px] text-stone-500 underline"
                >
                  Ver completo
                </button>
              )}
            </div>
            <p className="text-[10px] text-stone-500">
              Verificado el {fmtDate(result.verified_at)}
            </p>
            <button
              onClick={onClose}
              className="mt-1 rounded-full bg-stone-950 px-6 py-2.5 text-[13px] font-semibold text-white"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600">
              <X size={28} className="text-white" strokeWidth={2.5} />
            </div>
            <p className="text-[15px] font-semibold text-stone-950">
              El documento ha sido modificado
            </p>
            <p className="text-xs text-stone-500">
              El hash del documento no coincide con el registrado en el momento de la firma. Contacta con soporte.
            </p>
            <div className="mt-1 w-full rounded-lg bg-red-50 p-3">
              <div className="mb-2">
                <p className="text-[10px] text-stone-500">Hash guardado</p>
                <p className="mt-0.5 break-all font-mono text-[9px] text-stone-950">
                  {result?.stored_hash || '\u2014'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-stone-500">Hash actual</p>
                <p className="mt-0.5 break-all font-mono text-[9px] text-red-600">
                  {result?.calculated_hash || '\u2014'}
                </p>
              </div>
            </div>
            <div className="mt-1 flex w-full gap-2">
              <button
                onClick={onClose}
                className="flex-1 rounded-full bg-stone-100 py-2.5 text-[13px] font-semibold text-stone-950"
              >
                Cerrar
              </button>
              <button
                onClick={() => { window.location.href = '/support'; }}
                className="flex-1 rounded-full bg-stone-950 py-2.5 text-[13px] font-semibold text-white"
              >
                Contactar soporte
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

/* ── Contract Card ───────────────────────────────────── */
function ContractCard({ contract, onVerify }) {
  const isSigned = contract.status === 'contract_signed' || contract.status === 'completed';

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-stone-950">
            #HSP-B2B-{contract.operation_id_short}
          </p>
          <p className="mt-0.5 text-xs text-stone-500">
            {contract.counterpart_name}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
            isSigned
              ? 'bg-stone-100 text-stone-950'
              : 'bg-stone-50 text-stone-500'
          }`}
        >
          {isSigned ? 'Firmado' : 'En curso'}
        </span>
      </div>

      <div className="mb-3 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-stone-500">Producto</span>
          <span className="font-medium text-stone-950">{contract.product_name}</span>
        </div>
        {contract.quantity > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-stone-500">Cantidad</span>
            <span className="font-medium text-stone-950">{contract.quantity} uds</span>
          </div>
        )}
        {contract.total_amount > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-stone-500">Importe</span>
            <span className="font-medium text-stone-950">{(Number(contract.total_amount) || 0).toFixed(2)}\u20AC</span>
          </div>
        )}
        <div className="flex items-center justify-between text-xs">
          <span className="text-stone-500">Fecha de firma</span>
          <span className="font-medium text-stone-950">{fmtDate(contract.signed_at)}</span>
        </div>
      </div>

      {contract.contract_hash && (
        <div className="mb-3 rounded-lg bg-stone-100 px-3 py-2">
          <p className="text-[9px] text-stone-500">Hash de integridad</p>
          <p className="mt-0.5 font-mono text-[10px] text-stone-950">
            {shortHash(contract.contract_hash)}
          </p>
        </div>
      )}

      <div className="flex gap-2">
        {contract.pdf_url && (
          <button
            onClick={() => window.open(contract.pdf_url, '_blank')}
            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-stone-950 text-xs font-semibold text-white"
          >
            <Download size={14} />
            Descargar PDF
          </button>
        )}
        <button
          onClick={() => onVerify(contract.operation_id)}
          className="flex h-9 items-center justify-center gap-1.5 rounded-full bg-stone-100 px-4 text-xs font-semibold text-stone-950"
        >
          <ShieldCheck size={14} />
          Verificar
        </button>
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────── */
export default function SignedDocumentsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('contracts');
  const [contracts, setContracts] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiClient.get('/documents/contracts').catch(() => ({ contracts: [] })),
      apiClient.get('/verification/status').catch(() => null),
    ]).then(([contractsData, verificationData]) => {
      if (!active) return;
      setContracts(contractsData?.contracts || []);
      const certs = verificationData?.documents?.certificates || [];
      setCertificates(Array.isArray(certs) ? certs : []);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const tabs = [
    { key: 'contracts', label: 'Contratos B2B', icon: FileText },
    { key: 'certificates', label: 'Certificados', icon: Award },
    { key: 'invoices', label: 'Facturas', icon: Receipt },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* TopBar */}
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-stone-200 bg-white/90 px-4 py-3 backdrop-blur-xl">
        <button
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-transparent text-stone-950 active:bg-stone-100"
          aria-label="Volver"
        >
          <ArrowLeft size={20} />
        </button>
        <span className="text-base font-semibold text-stone-950">
          Mis documentos
        </span>
      </div>

      <div className="mx-auto max-w-[975px] px-4 py-5">
        {/* Tabs */}
        <div className="mb-5 flex gap-0 rounded-full bg-stone-100 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-xs font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-white text-stone-950 shadow-sm'
                  : 'bg-transparent text-stone-500'
              }`}
            >
              <tab.icon size={13} />
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={24} className="animate-spin text-stone-500" />
          </div>
        ) : (
          <>
            {/* Contracts tab */}
            {activeTab === 'contracts' && (
              <div className="space-y-3">
                {contracts.length > 0 ? (
                  contracts.map((c) => (
                    <ContractCard
                      key={c.operation_id}
                      contract={c}
                      onVerify={setVerifyingId}
                    />
                  ))
                ) : (
                  <div className="py-16 text-center">
                    <FileText size={32} className="mx-auto mb-3 text-stone-300" />
                    <p className="text-sm text-stone-500">
                      No tienes contratos firmados todavía
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Certificates tab */}
            {activeTab === 'certificates' && (
              <div className="space-y-3">
                {certificates.length > 0 ? (
                  certificates.map((cert, i) => (
                    <div
                      key={i}
                      className="rounded-2xl border border-stone-200 bg-white p-4"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-[13px] font-semibold text-stone-950">
                          {cert.name || cert.type || 'Certificado'}
                        </p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            cert.status === 'approved'
                              ? 'bg-stone-100 text-stone-950'
                              : cert.status === 'expired'
                                ? 'bg-red-50 text-red-600'
                                : 'bg-stone-100 text-stone-500'
                          }`}
                        >
                          {cert.status === 'approved' ? 'Aprobado' : cert.status === 'expired' ? 'Caducado' : cert.status === 'pending' ? 'Pendiente' : cert.status}
                        </span>
                      </div>
                      {cert.expiry_date && (
                        <p className="text-[11px] text-stone-500">
                          Caduca: {fmtDate(cert.expiry_date)}
                        </p>
                      )}
                      {cert.url && (
                        <button
                          onClick={() => window.open(cert.url, '_blank')}
                          className="mt-3 flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-950"
                        >
                          <Download size={13} />
                          Descargar
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-16 text-center">
                    <Award size={32} className="mx-auto mb-3 text-stone-300" />
                    <p className="text-sm text-stone-500">
                      No tienes certificados subidos
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Invoices tab (placeholder) */}
            {activeTab === 'invoices' && (
              <div className="py-16 text-center">
                <Receipt size={32} className="mx-auto mb-3 text-stone-300" />
                <p className="text-sm font-medium text-stone-950">
                  Facturas
                </p>
                <p className="mt-1 text-[13px] text-stone-500">
                  Las facturas estarán disponibles próximamente
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Verification Modal */}
      <AnimatePresence>
        {verifyingId && (
          <VerifyModal
            operationId={verifyingId}
            onClose={() => setVerifyingId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
