// @ts-nocheck
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Info, Upload, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../services/api/client';

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

  /* -- Load existing signature -- */
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

  /* -- Canvas setup -- */
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
    ctx.strokeStyle = '#0c0a09';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setHasDrawn(false);
  }, [activeTab]);

  /* -- Drawing helpers -- */
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

  /* -- File handlers -- */
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

  /* -- Preview data URL from canvas -- */
  const getCanvasDataURL = () => canvasRef.current?.toDataURL('image/png');

  const currentSigPreview =
    activeTab === 'draw'
      ? hasDrawn
        ? getCanvasDataURL()
        : existingSig
      : sigPreview || existingSig;

  /* -- Save -- */
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

    if (!sigBlob && !existingSig && !stampFile) {
      toast.error('Configura tu firma antes de guardar');
      return;
    }

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
      const result = await apiClient.post('/users/me/signature', fd);
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

  /* -- Label component -- */
  const SectionLabel = ({ children }) => (
    <p className="text-[10px] font-semibold tracking-widest uppercase text-stone-500">
      {children}
    </p>
  );

  /* -- Tabs -- */
  const tabs = [
    { key: 'draw', label: 'Dibujar' },
    { key: 'upload', label: 'Subir imagen' },
  ];

  const goBack = () => {
    if (returnTo) navigate(returnTo);
    else navigate(-1);
  };

  /* -- Render -- */
  return (
    <motion.div
      className="fixed inset-0 bg-white flex flex-col overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* TopBar */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-xl flex items-center gap-3 px-4 py-3 border-b border-stone-200">
        <button
          onClick={goBack}
          className="w-9 h-9 rounded-full border-none bg-transparent cursor-pointer text-stone-950 flex items-center justify-center"
        >
          <ArrowLeft size={20} />
        </button>
        <span className="text-base font-semibold text-stone-950">
          Firma digital
        </span>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-6 px-4 pt-5 pb-8">
        {/* Status card */}
        {!loadingSig && (
          existingSig ? (
            <div className="flex items-start gap-3 bg-stone-100 border border-stone-950/20 rounded-xl p-3.5">
              <div className="w-7 h-7 rounded-full bg-stone-950 flex items-center justify-center shrink-0">
                <Check size={16} className="text-white" strokeWidth={2.5} />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-stone-950">
                  Firma configurada
                </p>
                {configuredAt && (
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Configurada el {new Date(configuredAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>
              <button
                onClick={() => { setExistingSig(null); clearCanvas?.(); }}
                className="bg-transparent border border-stone-200 rounded-full px-3 py-1 text-[11px] text-stone-500 cursor-pointer"
              >
                Actualizar
              </button>
            </div>
          ) : (
            <div className="flex items-start gap-3 bg-stone-50 border border-stone-500/20 rounded-xl p-3.5">
              <Info size={18} className="text-stone-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[13px] font-semibold text-stone-950">
                  Sin firma configurada
                </p>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Necesitas configurar tu firma para poder firmar contratos B2B.
                </p>
              </div>
            </div>
          )
        )}

        {/* Existing signature preview */}
        {existingSig && (
          <div className="flex flex-col gap-2">
            <SectionLabel>Firma actual</SectionLabel>
            <div
              className="flex items-center justify-center w-full h-[100px] rounded-xl border border-stone-200 relative"
              style={{ background: CHECKERBOARD_BG }}
            >
              <img
                src={existingSig}
                alt="Firma actual"
                className="max-w-[90%] max-h-[80px] object-contain"
              />
              {existingStamp && (
                <img
                  src={existingStamp}
                  alt="Sello"
                  className="absolute bottom-2 right-2 w-9 h-9 rounded-full object-cover opacity-60"
                />
              )}
            </div>
          </div>
        )}

        {/* Section 1: Explanation */}
        <div className="flex gap-3 bg-stone-100 rounded-xl p-4">
          <Info size={18} className="text-stone-500 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <p className="text-[13px] text-stone-950 leading-relaxed">
              Tu firma digital se aplica automaticamente a los contratos B2B que
              firmes en Hispaloshop. Solo necesitas configurarla una vez.
            </p>
            <p className="text-xs text-stone-500 leading-snug">
              La firma queda registrada con timestamp y hash SHA-256 para
              garantizar su autenticidad.
            </p>
          </div>
        </div>

        {/* Section 2: Signature */}
        <div className="flex flex-col gap-3">
          <SectionLabel>{existingSig ? 'Actualizar firma' : 'Firma manuscrita'}</SectionLabel>

          {/* Tabs */}
          <div className="flex bg-stone-100 rounded-full p-[3px]">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex-1 flex items-center justify-center h-[34px] rounded-full border-none cursor-pointer text-[13px] font-medium transition-all duration-200 ${
                  activeTab === t.key
                    ? 'bg-stone-950 text-white'
                    : 'bg-transparent text-stone-500'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Draw tab */}
          {activeTab === 'draw' && (
            <div className="flex flex-col gap-2">
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={endDraw}
                  onMouseLeave={endDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={endDraw}
                  className="w-full h-[120px] bg-white border-[1.5px] border-dashed border-stone-200 rounded-2xl block"
                  style={{ touchAction: 'none', cursor: 'crosshair' }}
                />
                {!hasDrawn && (
                  <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[13px] text-stone-500 pointer-events-none select-none">
                    Dibuja tu firma aqui
                  </span>
                )}
              </div>
              <button
                onClick={clearCanvas}
                className="self-start bg-transparent border-none text-[13px] text-stone-500 cursor-pointer py-1 px-0"
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
                className="hidden"
              />

              {!sigPreview ? (
                <button
                  onClick={() => sigInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 w-full h-[120px] bg-white border-[1.5px] border-dashed border-stone-200 rounded-2xl cursor-pointer"
                >
                  <Upload size={24} className="text-stone-500" />
                  <span className="text-[13px] text-stone-500">
                    Arrastra o pulsa para subir
                  </span>
                  <span className="text-[11px] text-stone-500">
                    PNG con fondo transparente (recomendado) o JPG
                  </span>
                </button>
              ) : (
                <div
                  onClick={() => sigInputRef.current?.click()}
                  className="flex items-center justify-center w-full h-[120px] rounded-xl border border-stone-200 cursor-pointer overflow-hidden"
                  style={{ background: CHECKERBOARD_BG }}
                >
                  <img
                    src={sigPreview}
                    alt="Firma"
                    className="max-w-[90%] max-h-[100px] object-contain"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 3: Company Stamp */}
        <div className="flex flex-col gap-3">
          <SectionLabel>Sello empresarial (opcional)</SectionLabel>

          <input
            ref={stampInputRef}
            type="file"
            accept="image/png,image/jpeg"
            onChange={handleStampFile}
            className="hidden"
          />

          <div className="flex items-start gap-4">
            {!stampPreview ? (
              <button
                onClick={() => stampInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-1 w-[100px] h-[100px] shrink-0 bg-white border-[1.5px] border-dashed border-stone-200 rounded-full cursor-pointer"
              >
                <Upload size={20} className="text-stone-500" />
                <span className="text-[11px] text-stone-500">Subir</span>
              </button>
            ) : (
              <div
                onClick={() => stampInputRef.current?.click()}
                className="w-[100px] h-[100px] shrink-0 rounded-full border border-stone-200 overflow-hidden cursor-pointer"
              >
                <img
                  src={stampPreview}
                  alt="Sello"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <p className="text-[11px] text-stone-500 pt-1 leading-relaxed">
              Se superpondrá sobre la firma en los contratos.
            </p>
          </div>
        </div>

        {/* Section 4: Preview */}
        <div className="flex flex-col gap-3">
          <SectionLabel>Vista previa</SectionLabel>

          <div className="bg-white shadow-sm rounded-xl p-4 relative min-h-[100px]">
            <span className="text-[9px] text-stone-500">
              Firma del representante:
            </span>

            <div className="flex items-center justify-center min-h-[60px] my-2 relative">
              {currentSigPreview ? (
                <>
                  <img
                    src={currentSigPreview}
                    alt="Preview"
                    className="max-h-[60px] max-w-[80%] object-contain"
                  />
                  {stampPreview && (
                    <img
                      src={stampPreview}
                      alt="Sello"
                      className="absolute bottom-0 right-0 w-10 h-10 rounded-full object-cover opacity-60"
                    />
                  )}
                </>
              ) : (
                <span className="text-xs text-stone-500">
                  Sin firma
                </span>
              )}
            </div>

            <div className="h-px bg-stone-200" />
          </div>
        </div>

        {/* Section 5: Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center justify-center gap-2 w-full h-11 rounded-full border-none bg-stone-950 text-white text-[15px] font-semibold transition-opacity duration-200 ${
            saving ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:bg-stone-800'
          }`}
        >
          {saving && <Loader2 size={18} className="animate-spin" />}
          {saving ? 'Guardando...' : 'Guardar firma'}
        </button>
      </div>
    </motion.div>
  );
}
