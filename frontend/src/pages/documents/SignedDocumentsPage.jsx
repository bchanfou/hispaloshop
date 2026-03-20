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
import apiClient from '@/services/api/client';

const V2 = {
  black: '#0A0A0A',
  cream: '#ffffff',
  stone: '#8A8881',
  white: '#FFFFFF',
  border: '#E5E2DA',
  surface: '#F0EDE8',
  green: '#0c0a09',
  greenLight: '#f5f5f4',
  red: '#DC2626',
  redLight: '#FEE2E2',
  amber: '#78716c',
  amberLight: '#fafaf9',
  fontSans: 'Inter, sans-serif',
  radiusMd: 12,
  radiusFull: 9999,
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const shortHash = (h) => (h ? `${String(h).slice(0, 12)}…` : '—');

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
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: V2.white,
          borderRadius: V2.radiusMd,
          padding: 24,
          width: '90%',
          maxWidth: 380,
          fontFamily: V2.fontSans,
        }}
      >
        {loading ? (
          <div className="flex flex-col items-center py-8 gap-3">
            <Loader2 size={28} className="animate-spin" style={{ color: V2.stone }} />
            <p style={{ fontSize: 13, color: V2.stone }}>
              Verificando integridad del documento...
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center py-6 gap-3">
            <div
              className="flex items-center justify-center"
              style={{ width: 48, height: 48, borderRadius: V2.radiusFull, background: V2.redLight }}
            >
              <X size={24} style={{ color: V2.red }} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: V2.black }}>{error}</p>
            <button
              onClick={onClose}
              style={{
                marginTop: 8,
                background: V2.black,
                color: V2.white,
                border: 'none',
                borderRadius: V2.radiusFull,
                padding: '10px 24px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: V2.fontSans,
              }}
            >
              Cerrar
            </button>
          </div>
        ) : result?.verified ? (
          <div className="flex flex-col items-center text-center gap-3">
            <div
              className="flex items-center justify-center"
              style={{ width: 48, height: 48, borderRadius: V2.radiusFull, background: V2.green }}
            >
              <Check size={28} style={{ color: V2.white }} strokeWidth={2.5} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: V2.black }}>
              Documento íntegro
            </p>
            <p style={{ fontSize: 12, color: V2.stone }}>
              El contrato no ha sido modificado desde su firma.
            </p>
            <div
              style={{
                width: '100%',
                background: V2.surface,
                borderRadius: 8,
                padding: 12,
                marginTop: 4,
              }}
            >
              <p style={{ fontSize: 10, color: V2.stone, margin: 0 }}>Hash SHA-256</p>
              <p
                style={{
                  fontSize: 10,
                  fontFamily: 'monospace',
                  color: V2.black,
                  margin: '4px 0 0',
                  wordBreak: 'break-all',
                }}
              >
                {showFullHash ? result.stored_hash : shortHash(result.stored_hash)}
              </p>
              {!showFullHash && (
                <button
                  onClick={() => setShowFullHash(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: 10,
                    color: V2.stone,
                    cursor: 'pointer',
                    padding: 0,
                    marginTop: 4,
                    textDecoration: 'underline',
                    fontFamily: V2.fontSans,
                  }}
                >
                  Ver completo
                </button>
              )}
            </div>
            <p style={{ fontSize: 10, color: V2.stone }}>
              Verificado el {fmtDate(result.verified_at)}
            </p>
            <button
              onClick={onClose}
              style={{
                marginTop: 4,
                background: V2.black,
                color: V2.white,
                border: 'none',
                borderRadius: V2.radiusFull,
                padding: '10px 24px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: V2.fontSans,
              }}
            >
              Cerrar
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center gap-3">
            <div
              className="flex items-center justify-center"
              style={{ width: 48, height: 48, borderRadius: V2.radiusFull, background: V2.red }}
            >
              <X size={28} style={{ color: V2.white }} strokeWidth={2.5} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: V2.black }}>
              El documento ha sido modificado
            </p>
            <p style={{ fontSize: 12, color: V2.stone }}>
              El hash del documento no coincide con el registrado en el momento de la firma. Contacta con soporte.
            </p>
            <div
              style={{
                width: '100%',
                background: V2.redLight,
                borderRadius: 8,
                padding: 12,
                marginTop: 4,
              }}
            >
              <div style={{ marginBottom: 8 }}>
                <p style={{ fontSize: 10, color: V2.stone, margin: 0 }}>Hash guardado</p>
                <p style={{ fontSize: 9, fontFamily: 'monospace', color: V2.black, margin: '2px 0 0', wordBreak: 'break-all' }}>
                  {result?.stored_hash || '—'}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 10, color: V2.stone, margin: 0 }}>Hash actual</p>
                <p style={{ fontSize: 9, fontFamily: 'monospace', color: V2.red, margin: '2px 0 0', wordBreak: 'break-all' }}>
                  {result?.calculated_hash || '—'}
                </p>
              </div>
            </div>
            <div className="flex gap-2 w-full" style={{ marginTop: 4 }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  background: V2.surface,
                  color: V2.black,
                  border: 'none',
                  borderRadius: V2.radiusFull,
                  padding: '10px 0',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: V2.fontSans,
                }}
              >
                Cerrar
              </button>
              <button
                onClick={() => { window.location.href = '/support'; }}
                style={{
                  flex: 1,
                  background: V2.black,
                  color: V2.white,
                  border: 'none',
                  borderRadius: V2.radiusFull,
                  padding: '10px 0',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: V2.fontSans,
                }}
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
    <div
      style={{
        background: V2.white,
        border: `1px solid ${V2.border}`,
        borderRadius: V2.radiusMd,
        padding: 16,
        fontFamily: V2.fontSans,
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: V2.black, margin: 0 }}>
            #HSP-B2B-{contract.operation_id_short}
          </p>
          <p style={{ fontSize: 12, color: V2.stone, margin: '2px 0 0' }}>
            {contract.counterpart_name}
          </p>
        </div>
        <span
          className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold"
          style={{
            background: isSigned ? V2.greenLight : V2.amberLight,
            color: isSigned ? V2.green : V2.amber,
          }}
        >
          {isSigned ? 'Firmado' : 'En curso'}
        </span>
      </div>

      <div className="space-y-1 mb-3">
        <div className="flex items-center justify-between text-xs">
          <span style={{ color: V2.stone }}>Producto</span>
          <span style={{ color: V2.black, fontWeight: 500 }}>{contract.product_name}</span>
        </div>
        {contract.quantity > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span style={{ color: V2.stone }}>Cantidad</span>
            <span style={{ color: V2.black, fontWeight: 500 }}>{contract.quantity} uds</span>
          </div>
        )}
        {contract.total_amount > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span style={{ color: V2.stone }}>Importe</span>
            <span style={{ color: V2.black, fontWeight: 500 }}>{(Number(contract.total_amount) || 0).toFixed(2)}€</span>
          </div>
        )}
        <div className="flex items-center justify-between text-xs">
          <span style={{ color: V2.stone }}>Fecha de firma</span>
          <span style={{ color: V2.black, fontWeight: 500 }}>{fmtDate(contract.signed_at)}</span>
        </div>
      </div>

      {contract.contract_hash && (
        <div className="mb-3 px-3 py-2" style={{ background: V2.surface, borderRadius: 8 }}>
          <p style={{ fontSize: 9, color: V2.stone, margin: 0 }}>Hash de integridad</p>
          <p style={{ fontSize: 10, fontFamily: 'monospace', color: V2.black, margin: '2px 0 0' }}>
            {shortHash(contract.contract_hash)}
          </p>
        </div>
      )}

      <div className="flex gap-2">
        {contract.pdf_url && (
          <button
            onClick={() => window.open(contract.pdf_url, '_blank')}
            className="flex-1 flex items-center justify-center gap-1.5"
            style={{
              height: 36,
              background: V2.black,
              color: V2.white,
              border: 'none',
              borderRadius: V2.radiusFull,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: V2.fontSans,
            }}
          >
            <Download size={14} />
            Descargar PDF
          </button>
        )}
        <button
          onClick={() => onVerify(contract.operation_id)}
          className="flex items-center justify-center gap-1.5"
          style={{
            height: 36,
            background: V2.surface,
            color: V2.black,
            border: 'none',
            borderRadius: V2.radiusFull,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: V2.fontSans,
            padding: '0 16px',
          }}
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
    <div
      className="min-h-screen"
      style={{ background: V2.cream, fontFamily: V2.fontSans }}
    >
      {/* TopBar */}
      <div
        className="sticky top-0 z-40 flex items-center gap-3"
        style={{
          background: `${V2.cream}e6`,
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
            color: V2.black,
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <span style={{ fontSize: 16, fontWeight: 600, color: V2.black }}>
          Mis documentos
        </span>
      </div>

      <div className="max-w-xl mx-auto px-4 py-5">
        {/* Tabs */}
        <div
          className="flex gap-0 p-1 mb-5"
          style={{ borderRadius: V2.radiusFull, background: V2.surface }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-all"
              style={{
                borderRadius: V2.radiusFull,
                background: activeTab === tab.key ? V2.white : 'transparent',
                color: activeTab === tab.key ? V2.black : V2.stone,
                boxShadow: activeTab === tab.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <tab.icon size={13} />
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={24} className="animate-spin" style={{ color: V2.stone }} />
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
                  <div className="text-center py-16">
                    <FileText size={32} style={{ color: V2.stone, margin: '0 auto 12px' }} />
                    <p style={{ fontSize: 14, color: V2.stone }}>
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
                      style={{
                        background: V2.white,
                        border: `1px solid ${V2.border}`,
                        borderRadius: V2.radiusMd,
                        padding: 16,
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p style={{ fontSize: 13, fontWeight: 600, color: V2.black, margin: 0 }}>
                          {cert.name || cert.type || 'Certificado'}
                        </p>
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{
                            background: cert.status === 'approved' ? V2.greenLight : cert.status === 'expired' ? V2.redLight : V2.surface,
                            color: cert.status === 'approved' ? V2.green : cert.status === 'expired' ? V2.red : V2.stone,
                          }}
                        >
                          {cert.status === 'approved' ? 'Aprobado' : cert.status === 'expired' ? 'Caducado' : cert.status === 'pending' ? 'Pendiente' : cert.status}
                        </span>
                      </div>
                      {cert.expiry_date && (
                        <p style={{ fontSize: 11, color: V2.stone, margin: 0 }}>
                          Caduca: {fmtDate(cert.expiry_date)}
                        </p>
                      )}
                      {cert.url && (
                        <button
                          onClick={() => window.open(cert.url, '_blank')}
                          className="flex items-center gap-1.5 mt-3"
                          style={{
                            background: 'none',
                            border: 'none',
                            fontSize: 12,
                            color: V2.stone,
                            cursor: 'pointer',
                            padding: 0,
                            fontFamily: V2.fontSans,
                          }}
                        >
                          <Download size={13} />
                          Descargar
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-16">
                    <Award size={32} style={{ color: V2.stone, margin: '0 auto 12px' }} />
                    <p style={{ fontSize: 14, color: V2.stone }}>
                      No tienes certificados subidos
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Invoices tab (placeholder) */}
            {activeTab === 'invoices' && (
              <div className="text-center py-16">
                <Receipt size={32} style={{ color: V2.stone, margin: '0 auto 12px' }} />
                <p style={{ fontSize: 14, fontWeight: 500, color: V2.black }}>
                  Facturas
                </p>
                <p style={{ fontSize: 13, color: V2.stone, marginTop: 4 }}>
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
