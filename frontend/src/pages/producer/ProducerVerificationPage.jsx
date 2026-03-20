import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Check, Upload, Loader2, AlertCircle, Clock,
  Building2, Camera, Award, Plus, X, ChevronRight, ShieldCheck,
} from 'lucide-react';
import apiClient from '../../services/api/client';

/* ── Design tokens ──────────────────────────────────────── */
const T = {
  black: '#0A0A0A', cream: '#ffffff', stone: '#8A8881',
  white: '#FFFFFF', border: '#E5E2DA', surface: '#F0EDE8',
  green: '#0c0a09', greenLight: '#f5f5f4',
  amber: '#78716c', amberLight: '#fafaf9',
  red: '#DC2626', redLight: '#FEE2E2',
  blue: '#3060A0', blueLight: '#EBF0F8',
  radius: '16px', radiusMd: '12px',
};

const CERT_TYPES = [
  { id: 'ecological_eu', label: 'Ecológico EU', emoji: '🌿' },
  { id: 'dop', label: 'DOP', emoji: '🏆' },
  { id: 'igp', label: 'IGP', emoji: '🥇' },
  { id: 'halal', label: 'Halal', emoji: '☪️' },
  { id: 'gluten_free', label: 'Sin gluten', emoji: '🌾' },
  { id: 'vegan', label: 'Vegano', emoji: '🌱' },
  { id: 'other', label: 'Otro', emoji: '📋' },
];

/* ── Stepper ────────────────────────────────────────────── */
function StepIndicator({ steps, current }) {
  return (
    <div
      className="flex items-center justify-between p-5 mb-5"
      style={{ background: T.black, borderRadius: T.radius }}
    >
      {steps.map((s, i) => {
        const done = s.done;
        const active = i === current;
        return (
          <React.Fragment key={i}>
            {i > 0 && (
              <div className="flex-1 h-px mx-2" style={{ background: done ? T.white : 'rgba(255,255,255,0.2)' }} />
            )}
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0${active && !done ? ' step-active' : ''}`}
                style={{
                  background: done ? T.white : active ? T.green : 'rgba(255,255,255,0.15)',
                  color: done ? T.black : T.white,
                }}
              >
                {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className="text-xs font-medium hidden sm:block" style={{ color: done || active ? T.white : 'rgba(255,255,255,0.5)' }}>
                {s.label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ── Status Card ────────────────────────────────────────── */
function StatusCard({ status, children }) {
  const styles = {
    verified: { bg: T.greenLight, border: T.green, icon: Check, color: T.green },
    rejected: { bg: T.redLight, border: T.red, icon: AlertCircle, color: T.red },
    manual_review: { bg: T.amberLight, border: T.amber, icon: Clock, color: T.amber },
    pending: { bg: T.blueLight, border: T.blue, icon: Loader2, color: T.blue },
  };
  const s = styles[status] || styles.pending;
  const Icon = s.icon;
  return (
    <div
      className="p-4 flex items-start gap-3"
      style={{ background: s.bg, borderRadius: T.radius, border: `1px solid ${s.border}30` }}
    >
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${status === 'pending' ? 'animate-spin' : ''}`} style={{ color: s.color }} />
      <div className="flex-1 text-sm" style={{ color: s.color }}>{children}</div>
    </div>
  );
}

/* ── Upload Area ────────────────────────────────────────── */
function UploadArea({ accept, maxSize, hint, onFile, uploading }) {
  const ref = useRef(null);
  const handleChange = (e) => {
    const f = e.target.files?.[0];
    if (f) onFile(f);
  };
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 p-8 cursor-pointer transition-colors"
      style={{
        border: `2px dashed ${T.border}`,
        borderRadius: T.radius,
        background: T.surface,
        opacity: uploading ? 0.5 : 1,
        pointerEvents: uploading ? 'none' : 'auto',
      }}
      onClick={() => ref.current?.click()}
    >
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={handleChange} />
      {uploading ? (
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: T.stone }} />
      ) : (
        <Upload className="w-8 h-8" style={{ color: T.stone }} />
      )}
      <p className="text-sm font-medium text-center" style={{ color: T.black }}>
        {uploading ? 'Verificando con IA...' : 'Pulsa para subir'}
      </p>
      {hint && <p className="text-xs text-center" style={{ color: T.stone }}>{hint}</p>}
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────── */
export default function ProducerVerificationPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [vs, setVs] = useState(null); // verification_status

  // Upload states
  const [cifUploading, setCifUploading] = useState(false);
  const [facilityUploading, setFacilityUploading] = useState(false);
  const [certUploading, setCertUploading] = useState(false);
  const [selectedCertType, setSelectedCertType] = useState('ecological_eu');

  const fetchStatus = useCallback(async () => {
    try {
      const data = await apiClient.get('/verification/status');
      setVs(data);
    } catch {
      setVs({
        is_verified: false,
        documents: { cif_nif: {}, facility_photo: {}, certificates: [] },
        blocked_from_selling: true,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // Polling while any doc is pending
  useEffect(() => {
    if (!vs) return;
    const cif = vs.documents?.cif_nif?.status;
    const fac = vs.documents?.facility_photo?.status;
    const anyPending = cif === 'pending' || fac === 'pending';
    if (!anyPending) return;
    const id = setInterval(fetchStatus, 2000);
    return () => clearInterval(id);
  }, [vs, fetchStatus]);

  // Derived
  const docs = vs?.documents || {};
  const cifDoc = docs.cif_nif || {};
  const facilityDoc = docs.facility_photo || {};
  const certs = docs.certificates || [];

  const cifDone = cifDoc.status === 'verified';
  const facilityDone = facilityDoc.status === 'verified';
  const certsDone = certs.some(c => c.status === 'verified');

  // Current active step
  const currentStep = cifDone ? (facilityDone ? 2 : 1) : 0;
  const steps = [
    { label: 'CIF/NIF', done: cifDone },
    { label: 'Instalación', done: facilityDone },
    { label: 'Certificado', done: certsDone },
  ];

  /* ── Upload handlers ─────────────────────────────────── */

  const handleCifUpload = async (file) => {
    setCifUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await apiClient.post('/verification/cif-nif', fd);
      await fetchStatus();
    } catch {
      // handled silently
    } finally {
      setCifUploading(false);
    }
  };

  const handleFacilityUpload = async (file) => {
    setFacilityUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await apiClient.post('/verification/facility-photo', fd);
      await fetchStatus();
    } catch {
      // handled silently
    } finally {
      setFacilityUploading(false);
    }
  };

  const handleCertUpload = async (file) => {
    setCertUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('cert_type', selectedCertType);
      await apiClient.post('/verification/certificate', fd);
      await fetchStatus();
    } catch {
      // handled silently
    } finally {
      setCertUploading(false);
    }
  };

  /* ── Render ──────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: T.stone }} />
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'inherit', background: T.cream, minHeight: '100dvh' }}>
      {/* TopBar */}
      <div className="flex items-center gap-3 p-4 pb-2">
        <button onClick={() => navigate(-1)} className="p-1.5" style={{ color: T.black }}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold" style={{ color: T.black }}>Verificación de cuenta</h1>
      </div>

      <div className="px-4 pb-8">
        {/* Stepper */}
        <StepIndicator steps={steps} current={currentStep} />

        {/* ── Section 1: CIF/NIF ──────────────────────── */}
        <section className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4" style={{ color: T.stone }} />
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: T.stone }}>
              Documento CIF o NIF
            </span>
          </div>

          {!cifDoc.status && (
            <>
              <p className="text-sm mb-3" style={{ color: T.stone }}>
                Sube tu CIF empresarial o NIF personal. Debe ser el documento oficial de la AEAT.
              </p>
              <UploadArea
                accept=".pdf,.jpg,.jpeg,.png"
                maxSize="5MB"
                hint="PDF, JPG, PNG · Máx 5MB"
                onFile={handleCifUpload}
                uploading={cifUploading}
              />
            </>
          )}

          {cifDoc.status === 'pending' && (
            <StatusCard status="pending">
              <p className="font-semibold">Verificando con IA...</p>
            </StatusCard>
          )}

          {cifDoc.status === 'verified' && (
            <StatusCard status="verified">
              <p className="font-semibold">CIF/NIF verificado</p>
              {cifDoc.number && <p className="mt-1">Número: {cifDoc.number}</p>}
              {cifDoc.entity_name && <p>Entidad: {cifDoc.entity_name}</p>}
            </StatusCard>
          )}

          {cifDoc.status === 'rejected' && (
            <div>
              <StatusCard status="rejected">
                <p className="font-semibold">Documento rechazado</p>
                <p className="mt-1">{cifDoc.rejection_reason}</p>
              </StatusCard>
              <button
                className="w-full mt-3 py-2.5 text-sm font-semibold transition-colors"
                style={{ background: T.black, color: T.white, borderRadius: T.radius }}
                onClick={() => {
                  setVs(prev => ({
                    ...prev,
                    documents: { ...prev.documents, cif_nif: {} },
                  }));
                }}
              >
                Subir nuevo documento
              </button>
            </div>
          )}

          {cifDoc.status === 'manual_review' && (
            <StatusCard status="manual_review">
              <p className="font-semibold">En revisión manual</p>
              <p className="mt-1">Nuestro equipo revisará tu documento en 48-72h hábiles.</p>
            </StatusCard>
          )}
        </section>

        {/* ── Section 2: Facility Photo ───────────────── */}
        <section className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <Camera className="w-4 h-4" style={{ color: T.stone }} />
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: T.stone }}>
              Foto de instalación
            </span>
          </div>

          {!facilityDoc.status && (
            <>
              <p className="text-sm mb-3" style={{ color: T.stone }}>
                Sube una foto de tu local, obrador, finca, almacén o lugar de trabajo.
                La IA verificará que es una instalación real relacionada con la producción de alimentos.
              </p>
              <ul className="text-xs mb-3 space-y-1" style={{ color: T.stone }}>
                <li>• Foto real, no ilustraciones</li>
                <li>• Buena iluminación</li>
                <li>• Que se vea la actividad</li>
              </ul>
              <UploadArea
                accept=".jpg,.jpeg,.png,.heic"
                maxSize="10MB"
                hint="JPG, PNG, HEIC · Máx 10MB"
                onFile={handleFacilityUpload}
                uploading={facilityUploading}
              />
            </>
          )}

          {facilityDoc.status === 'pending' && (
            <StatusCard status="pending">
              <p className="font-semibold">Verificando con IA...</p>
            </StatusCard>
          )}

          {facilityDoc.status === 'verified' && (
            <StatusCard status="verified">
              <p className="font-semibold">Instalación verificada</p>
              {facilityDoc.ai_assessment && <p className="mt-1">{facilityDoc.ai_assessment}</p>}
            </StatusCard>
          )}

          {facilityDoc.status === 'rejected' && (
            <div>
              <StatusCard status="rejected">
                <p className="font-semibold">Foto rechazada</p>
                <p className="mt-1">{facilityDoc.rejection_reason}</p>
              </StatusCard>
              <button
                className="w-full mt-3 py-2.5 text-sm font-semibold transition-colors"
                style={{ background: T.black, color: T.white, borderRadius: T.radius }}
                onClick={() => {
                  setVs(prev => ({
                    ...prev,
                    documents: { ...prev.documents, facility_photo: {} },
                  }));
                }}
              >
                Subir nueva foto
              </button>
            </div>
          )}

          {facilityDoc.status === 'manual_review' && (
            <StatusCard status="manual_review">
              <p className="font-semibold">En revisión manual</p>
              <p className="mt-1">Nuestro equipo revisará tu foto en 48-72h hábiles.</p>
            </StatusCard>
          )}
        </section>

        {/* ── Section 3: Certificates ─────────────────── */}
        <section className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-4 h-4" style={{ color: T.stone }} />
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: T.stone }}>
              Al menos 1 certificado válido
            </span>
          </div>

          {/* Cert type selector */}
          <div className="flex flex-wrap gap-2 mb-4">
            {CERT_TYPES.map(ct => (
              <button
                key={ct.id}
                className="px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  borderRadius: '999px',
                  border: `1px solid ${selectedCertType === ct.id ? T.black : T.border}`,
                  background: selectedCertType === ct.id ? T.black : T.white,
                  color: selectedCertType === ct.id ? T.white : T.black,
                }}
                onClick={() => setSelectedCertType(ct.id)}
              >
                {ct.emoji} {ct.label}
              </button>
            ))}
          </div>

          {/* Upload area for new cert */}
          <UploadArea
            accept=".pdf,.jpg,.jpeg,.png"
            maxSize="5MB"
            hint={`Certificado de ${CERT_TYPES.find(c => c.id === selectedCertType)?.label} · PDF, JPG, PNG · Máx 5MB`}
            onFile={handleCertUpload}
            uploading={certUploading}
          />

          {/* Uploaded certificates list */}
          {certs.length > 0 && (
            <div className="mt-4 space-y-2">
              {certs.map((c, i) => {
                const typeInfo = CERT_TYPES.find(t => t.id === c.type) || { emoji: '📋', label: c.type };
                const isExpired = c.status === 'expired';
                const hasWarning = c.expiry_date && !isExpired && (() => {
                  const d = new Date(c.expiry_date);
                  const now = new Date();
                  return (d - now) / 86400000 <= 30;
                })();
                const daysLeft = c.expiry_date && !isExpired ? Math.ceil((new Date(c.expiry_date) - new Date()) / 86400000) : null;

                return (
                  <div
                    key={c.cert_id || i}
                    className="flex items-center gap-3 p-3"
                    style={{ background: T.white, borderRadius: T.radius, border: `1px solid ${T.border}` }}
                  >
                    <span className="text-lg">{typeInfo.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: T.black }}>{typeInfo.label}</p>
                      {c.issued_to && <p className="text-xs truncate" style={{ color: T.stone }}>{c.issued_to}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {c.status === 'verified' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: T.greenLight, color: T.green }}>
                          Verificado
                        </span>
                      )}
                      {c.status === 'rejected' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: T.redLight, color: T.red }}>
                          Rechazado
                        </span>
                      )}
                      {c.status === 'manual_review' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: T.amberLight, color: T.amber }}>
                          En revisión
                        </span>
                      )}
                      {isExpired && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: T.redLight, color: T.red }}>
                          Caducado
                        </span>
                      )}
                      {hasWarning && daysLeft !== null && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: T.amberLight, color: T.amber }}>
                          Caduca en {daysLeft}d
                        </span>
                      )}
                      {c.status === 'pending' && (
                        <Loader2 className="w-4 h-4 animate-spin" style={{ color: T.blue }} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Global Status ───────────────────────────── */}
        <AnimatePresence mode="wait">
          {vs?.is_verified && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 text-center"
              style={{ background: T.greenLight, borderRadius: T.radius, border: `1px solid ${T.green}30` }}
            >
              <div
                className="w-14 h-14 mx-auto mb-3 rounded-full flex items-center justify-center"
                style={{ background: T.green }}
              >
                <ShieldCheck className="w-7 h-7" style={{ color: T.white }} />
              </div>
              <h2 className="text-lg font-bold mb-1" style={{ color: T.green }}>Cuenta verificada</h2>
              <p className="text-sm mb-4" style={{ color: T.green }}>
                Ya puedes publicar y vender en Hispaloshop
              </p>
              <button
                className="w-full py-3 text-sm font-bold transition-colors"
                style={{ background: T.green, color: T.white, borderRadius: T.radius }}
                onClick={() => navigate('/producer/products')}
              >
                Publicar mi primer producto
              </button>
            </motion.div>
          )}

          {vs?.admin_review_required && !vs?.is_verified && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 text-center"
              style={{ background: T.amberLight, borderRadius: T.radius, border: `1px solid ${T.amber}30` }}
            >
              <Clock className="w-10 h-10 mx-auto mb-2" style={{ color: T.amber }} />
              <h2 className="text-base font-bold mb-1" style={{ color: T.amber }}>En revisión manual</h2>
              <p className="text-sm" style={{ color: T.amber }}>
                Nuestro equipo revisará tu documentación en 48-72h hábiles. Te avisaremos por email.
              </p>
            </motion.div>
          )}

          {!vs?.is_verified && !vs?.admin_review_required && (cifDone || facilityDone || certsDone) && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5"
              style={{ background: T.surface, borderRadius: T.radius, border: `1px solid ${T.border}` }}
            >
              <h2 className="text-sm font-bold mb-3" style={{ color: T.black }}>Completa la verificación</h2>
              <div className="space-y-2">
                {!cifDone && (
                  <div className="flex items-center gap-2 text-sm" style={{ color: T.amber }}>
                    <AlertCircle className="w-4 h-4 shrink-0" /> Falta: CIF/NIF
                  </div>
                )}
                {!facilityDone && (
                  <div className="flex items-center gap-2 text-sm" style={{ color: T.amber }}>
                    <AlertCircle className="w-4 h-4 shrink-0" /> Falta: Foto de instalación
                  </div>
                )}
                {!certsDone && (
                  <div className="flex items-center gap-2 text-sm" style={{ color: T.amber }}>
                    <AlertCircle className="w-4 h-4 shrink-0" /> Falta: Al menos 1 certificado
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
