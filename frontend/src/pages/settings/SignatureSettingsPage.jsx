import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Info, Upload, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/services/api/client';

const V2 = {
  black: '#0A0A0A',
  cream: '#F7F6F2',
  stone: '#8A8881',
  white: '#FFFFFF',
  border: '#E5E2DA',
  surface: '#F0EDE8',
  green: '#2E7D52',
  greenLight: '#E8F5EE',
  amber: '#B45309',
  amberLight: '#FEF3C7',
  fontSans: 'Inter, sans-serif',
  radiusMd: 12,
  radiusFull: 9999,
};

const CHECKERBOARD_BG =
  'repeating-conic-gradient(#d4d4d4 0% 25%, transparent 0% 50%) 0 0 / 12px 12px';

function dataURLtoBlob(dataURL) {
  const [header, base64] = dataURL.split(',');
  const mime = header.match(/:(.*?);/)[1];
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
  return new Blob([array], { type: mime });
}

export default function SignatureSettingsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '';

  const [activeTab, setActiveTab] = useState('draw');
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [uploadedSig, setUploadedSig] = useState(null);
  const [sigPreview, setSigPreview] = useState(null);
  const [stampFile, setStampFile] = useState(null);
  const [stampPreview, setStampPreview] = useState(null);
  const [saving, setSaving] = useState(false);

  // Existing signature state
  const [existingSig, setExistingSig] = useState(null);
  const [existingStamp, setExistingStamp] = useState(null);
  const [configuredAt, setConfiguredAt] = useState(null);
  const [loadingSig, setLoadingSig] = useState(true);

  const canvasRef = useRef(null);
  const sigInputRef = useRef(null);
  const stampInputRef = useRef(null);

  /* ── Load existing signature ──────────────────────────── */
  useEffect(() => {
    apiClient
      .get('/users/me/signature')
      .then((data) => {
        if (data?.signature_url) setExistingSig(data.signature_url);
        if (data?.stamp_url) {
          setExistingStamp(data.stamp_url);
          setStampPreview(data.stamp_url);
        }
        if (data?.configured_at) setConfiguredAt(data.configured_at);
      })
      .catch(() => {})
      .finally(() => setLoadingSig(false));
  }, []);

  /* ── Canvas setup ────────────────────────────────────── */
  useEffect(() => {
    if (activeTab !== 'draw') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = V2.black;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setHasDrawn(false);
  }, [activeTab]);

  /* ── Drawing helpers ─────────────────────────────────── */
  const getPos = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return {
      x: (touch.clientX - rect.left) * (canvas.width / rect.width),
      y: (touch.clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  const startDraw = useCallback(
    (e) => {
      e.preventDefault();
      const ctx = canvasRef.current.getContext('2d');
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      setIsDrawing(true);
      setHasDrawn(true);
    },
    [getPos],
  );

  const draw = useCallback(
    (e) => {
      if (!isDrawing) return;
      e.preventDefault();
      const ctx = canvasRef.current.getContext('2d');
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    },
    [isDrawing, getPos],
  );

  const endDraw = useCallback(() => setIsDrawing(false), []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }, []);

  /* ── File handlers ───────────────────────────────────── */
  const handleSigFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (sigPreview) URL.revokeObjectURL(sigPreview);
    setUploadedSig(file);
    setSigPreview(URL.createObjectURL(file));
  };

  const handleStampFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (stampPreview) URL.revokeObjectURL(stampPreview);
    setStampFile(file);
    setStampPreview(URL.createObjectURL(file));
  };

  /* ── Preview data URL from canvas ────────────────────── */
  const getCanvasDataURL = () => canvasRef.current?.toDataURL('image/png');

  const currentSigPreview =
    activeTab === 'draw'
      ? hasDrawn
        ? getCanvasDataURL()
        : existingSig
      : sigPreview || existingSig;

  /* ── Save ────────────────────────────────────────────── */
  const handleSave = async () => {
    let sigBlob;

    if (activeTab === 'draw') {
      if (!hasDrawn && !existingSig) {
        toast.error('Dibuja tu firma antes de guardar');
        return;
      }
      if (hasDrawn) {
        sigBlob = dataURLtoBlob(getCanvasDataURL());
      }
    } else {
      if (!uploadedSig && !existingSig) {
        toast.error('Sube una imagen de tu firma');
        return;
      }
      if (uploadedSig) {
        sigBlob = uploadedSig;
      }
    }

    // If no new sig blob but existing one, and we have a new stamp, still save
    if (!sigBlob && !existingSig && !stampFile) {
      toast.error('Configura tu firma antes de guardar');
      return;
    }

    // If nothing changed, just navigate back
    if (!sigBlob && !stampFile) {
      toast.info('No hay cambios que guardar');
      if (returnTo) navigate(returnTo);
      else navigate(-1);
      return;
    }

    const fd = new FormData();
    if (sigBlob) {
      fd.append('signature', sigBlob, 'signature.png');
    } else {
      // Need to send existing as a dummy to keep the endpoint happy
      // Actually we need a signature file - download existing and re-upload
      try {
        const resp = await fetch(existingSig);
        const blob = await resp.blob();
        fd.append('signature', blob, 'signature.png');
      } catch {
        toast.error('Error al procesar la firma existente');
        return;
      }
    }
    if (stampFile) fd.append('stamp', stampFile, 'stamp.png');

    setSaving(true);
    try {
      const result = await apiClient.post('/users/me/signature', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Firma guardada');
      setExistingSig(result?.signature_url || existingSig);
      setConfiguredAt(result?.configured_at || new Date().toISOString());
      if (returnTo) {
        navigate(returnTo);
      } else {
        navigate(-1);
      }
    } catch {
      toast.error('Error al guardar la firma');
    } finally {
      setSaving(false);
    }
  };

  /* ── Label component ─────────────────────────────────── */
  const SectionLabel = ({ children }) => (
    <p
      style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: V2.stone,
        fontFamily: V2.fontSans,
        margin: 0,
      }}
    >
      {children}
    </p>
  );

  /* ── Tabs ────────────────────────────────────────────── */
  const tabs = [
    { key: 'draw', label: 'Dibujar' },
    { key: 'upload', label: 'Subir imagen' },
  ];

  const goBack = () => {
    if (returnTo) navigate(returnTo);
    else navigate(-1);
  };

  /* ────────────────────────────────────────────────────── */
  return (
    <motion.div
      className="fixed inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        fontFamily: V2.fontSans,
        background: V2.cream,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* ── TopBar ──────────────────────────────────────── */}
      <div
        className="flex items-center gap-3"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: `${V2.cream}e6`,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          padding: '12px 16px',
          borderBottom: `1px solid ${V2.border}`,
        }}
      >
        <button
          onClick={goBack}
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
          Firma digital
        </span>
      </div>

      {/* ── Scrollable body ─────────────────────────────── */}
      <div
        className="flex flex-col gap-6"
        style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 32px' }}
      >
        {/* ── Status card ─────────────────────────────── */}
        {!loadingSig && (
          existingSig ? (
            <div
              className="flex items-start gap-3"
              style={{
                background: V2.greenLight,
                border: `1px solid ${V2.green}33`,
                borderRadius: V2.radiusMd,
                padding: 14,
              }}
            >
              <div
                className="flex items-center justify-center shrink-0"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: V2.radiusFull,
                  background: V2.green,
                }}
              >
                <Check size={16} style={{ color: V2.white }} strokeWidth={2.5} />
              </div>
              <div className="flex-1">
                <p style={{ fontSize: 13, fontWeight: 600, color: V2.black, margin: 0 }}>
                  Firma configurada
                </p>
                {configuredAt && (
                  <p style={{ fontSize: 11, color: V2.stone, margin: '2px 0 0' }}>
                    Configurada el {new Date(configuredAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>
              <button
                onClick={() => { setExistingSig(null); clearCanvas?.(); }}
                style={{
                  background: 'transparent',
                  border: `1px solid ${V2.border}`,
                  borderRadius: V2.radiusFull,
                  padding: '4px 12px',
                  fontSize: 11,
                  color: V2.stone,
                  cursor: 'pointer',
                  fontFamily: V2.fontSans,
                }}
              >
                Actualizar
              </button>
            </div>
          ) : (
            <div
              className="flex items-start gap-3"
              style={{
                background: V2.amberLight,
                border: `1px solid ${V2.amber}33`,
                borderRadius: V2.radiusMd,
                padding: 14,
              }}
            >
              <Info size={18} style={{ color: V2.amber, flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: V2.black, margin: 0 }}>
                  Sin firma configurada
                </p>
                <p style={{ fontSize: 11, color: V2.stone, margin: '2px 0 0' }}>
                  Necesitas configurar tu firma para poder firmar contratos B2B.
                </p>
              </div>
            </div>
          )
        )}

        {/* ── Existing signature preview ──────────────── */}
        {existingSig && (
          <div className="flex flex-col gap-2">
            <SectionLabel>Firma actual</SectionLabel>
            <div
              className="flex items-center justify-center"
              style={{
                width: '100%',
                height: 100,
                borderRadius: V2.radiusMd,
                border: `1px solid ${V2.border}`,
                background: CHECKERBOARD_BG,
                position: 'relative',
              }}
            >
              <img
                src={existingSig}
                alt="Firma actual"
                style={{ maxWidth: '90%', maxHeight: 80, objectFit: 'contain' }}
              />
              {existingStamp && (
                <img
                  src={existingStamp}
                  alt="Sello"
                  style={{
                    position: 'absolute',
                    bottom: 8,
                    right: 8,
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    opacity: 0.6,
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* ── Section 1: Explanation ────────────────────── */}
        <div
          className="flex gap-3"
          style={{
            background: V2.surface,
            borderRadius: V2.radiusMd,
            padding: 16,
          }}
        >
          <Info
            size={18}
            style={{ color: V2.stone, flexShrink: 0, marginTop: 2 }}
          />
          <div className="flex flex-col gap-1">
            <p style={{ fontSize: 13, color: V2.black, margin: 0, lineHeight: 1.5 }}>
              Tu firma digital se aplica automáticamente a los contratos B2B que
              firmes en Hispaloshop. Solo necesitas configurarla una vez.
            </p>
            <p style={{ fontSize: 12, color: V2.stone, margin: 0, lineHeight: 1.4 }}>
              La firma queda registrada con timestamp y hash SHA-256 para
              garantizar su autenticidad.
            </p>
          </div>
        </div>

        {/* ── Section 2: Signature ──────────────────────── */}
        <div className="flex flex-col gap-3">
          <SectionLabel>{existingSig ? 'Actualizar firma' : 'Firma manuscrita'}</SectionLabel>

          {/* Tabs */}
          <div
            className="flex"
            style={{
              background: V2.surface,
              borderRadius: V2.radiusFull,
              padding: 3,
            }}
          >
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className="flex-1 flex items-center justify-center"
                style={{
                  height: 34,
                  borderRadius: V2.radiusFull,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                  fontFamily: V2.fontSans,
                  transition: 'all .2s',
                  background: activeTab === t.key ? V2.black : 'transparent',
                  color: activeTab === t.key ? V2.white : V2.stone,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Draw tab */}
          {activeTab === 'draw' && (
            <div className="flex flex-col gap-2">
              <div style={{ position: 'relative' }}>
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={endDraw}
                  onMouseLeave={endDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={endDraw}
                  style={{
                    width: '100%',
                    height: 120,
                    background: V2.white,
                    border: `1.5px dashed ${V2.border}`,
                    borderRadius: V2.radiusMd,
                    touchAction: 'none',
                    cursor: 'crosshair',
                    display: 'block',
                  }}
                />
                {!hasDrawn && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      fontSize: 13,
                      color: V2.stone,
                      pointerEvents: 'none',
                      userSelect: 'none',
                    }}
                  >
                    Dibuja tu firma aquí
                  </span>
                )}
              </div>
              <button
                onClick={clearCanvas}
                style={{
                  alignSelf: 'flex-start',
                  background: 'transparent',
                  border: 'none',
                  fontSize: 13,
                  color: V2.stone,
                  cursor: 'pointer',
                  fontFamily: V2.fontSans,
                  padding: '4px 0',
                }}
              >
                Limpiar
              </button>
            </div>
          )}

          {/* Upload tab */}
          {activeTab === 'upload' && (
            <div>
              <input
                ref={sigInputRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleSigFile}
                style={{ display: 'none' }}
              />

              {!sigPreview ? (
                <button
                  onClick={() => sigInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 w-full"
                  style={{
                    height: 120,
                    background: V2.white,
                    border: `1.5px dashed ${V2.border}`,
                    borderRadius: V2.radiusMd,
                    cursor: 'pointer',
                  }}
                >
                  <Upload size={24} style={{ color: V2.stone }} />
                  <span style={{ fontSize: 13, color: V2.stone }}>
                    Arrastra o pulsa para subir
                  </span>
                  <span style={{ fontSize: 11, color: V2.stone }}>
                    PNG con fondo transparente (recomendado) o JPG
                  </span>
                </button>
              ) : (
                <div
                  className="flex items-center justify-center"
                  onClick={() => sigInputRef.current?.click()}
                  style={{
                    width: '100%',
                    height: 120,
                    borderRadius: V2.radiusMd,
                    border: `1px solid ${V2.border}`,
                    background: CHECKERBOARD_BG,
                    cursor: 'pointer',
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src={sigPreview}
                    alt="Firma"
                    style={{
                      maxWidth: '90%',
                      maxHeight: 100,
                      objectFit: 'contain',
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Section 3: Company Stamp ──────────────────── */}
        <div className="flex flex-col gap-3">
          <SectionLabel>Sello empresarial (opcional)</SectionLabel>

          <input
            ref={stampInputRef}
            type="file"
            accept="image/png,image/jpeg"
            onChange={handleStampFile}
            style={{ display: 'none' }}
          />

          <div className="flex items-start gap-4">
            {!stampPreview ? (
              <button
                onClick={() => stampInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-1"
                style={{
                  width: 100,
                  height: 100,
                  flexShrink: 0,
                  background: V2.white,
                  border: `1.5px dashed ${V2.border}`,
                  borderRadius: '50%',
                  cursor: 'pointer',
                }}
              >
                <Upload size={20} style={{ color: V2.stone }} />
                <span style={{ fontSize: 11, color: V2.stone }}>Subir</span>
              </button>
            ) : (
              <div
                onClick={() => stampInputRef.current?.click()}
                style={{
                  width: 100,
                  height: 100,
                  flexShrink: 0,
                  borderRadius: '50%',
                  border: `1px solid ${V2.border}`,
                  overflow: 'hidden',
                  cursor: 'pointer',
                }}
              >
                <img
                  src={stampPreview}
                  alt="Sello"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              </div>
            )}

            <p style={{ fontSize: 11, color: V2.stone, margin: 0, paddingTop: 4, lineHeight: 1.5 }}>
              Se superpondrá sobre la firma en los contratos.
            </p>
          </div>
        </div>

        {/* ── Section 4: Preview ────────────────────────── */}
        <div className="flex flex-col gap-3">
          <SectionLabel>Vista previa</SectionLabel>

          <div
            style={{
              background: V2.white,
              border: `1px solid ${V2.border}`,
              borderRadius: V2.radiusMd,
              padding: 16,
              position: 'relative',
              minHeight: 100,
            }}
          >
            <span style={{ fontSize: 9, color: V2.stone }}>
              Firma del representante:
            </span>

            <div
              className="flex items-center justify-center"
              style={{
                minHeight: 60,
                margin: '8px 0 12px',
                position: 'relative',
              }}
            >
              {currentSigPreview ? (
                <>
                  <img
                    src={currentSigPreview}
                    alt="Preview"
                    style={{
                      maxHeight: 60,
                      maxWidth: '80%',
                      objectFit: 'contain',
                    }}
                  />
                  {stampPreview && (
                    <img
                      src={stampPreview}
                      alt="Sello"
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        opacity: 0.6,
                      }}
                    />
                  )}
                </>
              ) : (
                <span style={{ fontSize: 12, color: V2.stone }}>
                  Sin firma
                </span>
              )}
            </div>

            <div style={{ height: 1, background: V2.border }} />
          </div>
        </div>

        {/* ── Section 5: Save Button ────────────────────── */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 w-full"
          style={{
            height: 44,
            borderRadius: V2.radiusFull,
            border: 'none',
            background: V2.black,
            color: V2.white,
            fontSize: 15,
            fontWeight: 600,
            fontFamily: V2.fontSans,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
            transition: 'opacity .2s',
          }}
        >
          {saving && <Loader2 size={18} className="animate-spin" />}
          {saving ? 'Guardando...' : 'Guardar firma'}
        </button>
      </div>
    </motion.div>
  );
}
