import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, AlertTriangle, Upload, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/services/api/client';

// V2 Design Tokens
const V2 = {
  black: '#0A0A0A',
  cream: '#F7F6F2',
  stone: '#8A8881',
  white: '#FFFFFF',
  border: '#E5E2DA',
  surface: '#F0EDE8',
  green: '#0c0a09',
  greenLight: '#f5f5f4',
  amber: '#78716c',
  amberLight: '#fafaf9',
  red: '#dc2626',
  redLight: '#fef2f2',
  fontSans: 'Inter, sans-serif',
  radiusMd: 12,
  radiusFull: 9999,
};

const LABEL_STYLE = {
  fontSize: 10,
  textTransform: 'uppercase',
  color: V2.stone,
  fontWeight: 600,
  letterSpacing: 1,
  fontFamily: V2.fontSans,
  marginBottom: 8,
};

const REASONS = [
  'Producto no recibido',
  'Producto diferente',
  'Calidad inferior',
  'Documentación incorrecta',
  'Precio incorrecto',
  'Otro',
];

export default function B2BDisputePage() {
  const { operationId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const last8 = operationId ? operationId.slice(-8) : '';
  const isValid = reason && description.length >= 50;

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    const remaining = 5 - files.length;
    if (remaining <= 0) {
      toast.error('Máximo 5 archivos');
      return;
    }
    const toAdd = selected.slice(0, remaining).filter((f) => f.size <= 10 * 1024 * 1024);
    if (toAdd.length < selected.length) {
      toast.error('Algunos archivos superan 10MB o el límite de 5');
    }
    setFiles((prev) => [...prev, ...toAdd]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!isValid) return;
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setShowConfirm(false);
    setLoading(true);
    try {
      // In a real app, files would be uploaded first to get URLs
      const evidenceUrls = files.map((f) => URL.createObjectURL(f));
      // Revoke blob URLs after request (they're only needed for the POST body)
      setTimeout(() => evidenceUrls.forEach((u) => URL.revokeObjectURL(u)), 5000);
      await apiClient.post(`/b2b/operations/${operationId}/dispute`, {
        reason,
        description,
        evidence_urls: evidenceUrls,
      });
      toast.success('Disputa abierta');
      navigate(-1);
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Error al abrir la disputa';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ background: V2.cream, fontFamily: V2.fontSans }}
    >
      {/* TopBar */}
      <div
        className="flex items-center gap-3 px-4 shrink-0"
        style={{
          height: 56,
          borderBottom: `1px solid ${V2.border}`,
          background: V2.white,
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{ color: V2.black, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
        >
          <ArrowLeft size={22} />
        </button>
        <div style={{ fontSize: 15, fontWeight: 600, color: V2.black }}>
          Abrir disputa · #HSP-B2B-{last8}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-5" style={{ paddingBottom: 100 }}>
        {/* Warning card */}
        <div
          style={{
            background: V2.amberLight,
            border: `1px solid rgba(120,113,108, 0.3)`,
            borderRadius: V2.radiusMd,
            padding: 16,
            marginBottom: 24,
          }}
        >
          <div className="flex items-start gap-3" style={{ marginBottom: 10 }}>
            <AlertTriangle size={20} style={{ color: V2.amber, flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 13, color: V2.black, lineHeight: 1.4 }}>
              Antes de abrir una disputa, te recomendamos hablar con la otra parte en el chat.
            </span>
          </div>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: V2.white,
              border: `1px solid ${V2.border}`,
              borderRadius: V2.radiusFull,
              fontSize: 13,
              padding: '6px 14px',
              cursor: 'pointer',
              color: V2.black,
              marginBottom: 8,
              fontFamily: V2.fontSans,
            }}
          >
            Ir al chat &rarr;
          </button>
          <div style={{ fontSize: 11, color: V2.stone, lineHeight: 1.4 }}>
            Si no llegáis a un acuerdo, el admin de Hispaloshop revisará el caso en 72h.
          </div>
        </div>

        {/* Reason selector */}
        <div style={{ marginBottom: 24 }}>
          <div style={LABEL_STYLE}>MOTIVO</div>
          <div className="grid grid-cols-2 gap-2">
            {REASONS.map((r) => (
              <button
                key={r}
                onClick={() => setReason(r)}
                className="flex items-center justify-center"
                style={{
                  height: 36,
                  background: reason === r ? V2.black : V2.white,
                  color: reason === r ? V2.white : V2.black,
                  border: `1px solid ${reason === r ? V2.black : V2.border}`,
                  borderRadius: V2.radiusFull,
                  fontSize: 12,
                  cursor: 'pointer',
                  fontFamily: V2.fontSans,
                  transition: 'all 0.15s',
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: 24 }}>
          <div style={LABEL_STYLE}>DESCRIPCIÓN</div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe detalladamente el problema (mínimo 50 caracteres)..."
            style={{
              width: '100%',
              minHeight: 120,
              border: `1px solid ${V2.border}`,
              borderRadius: V2.radiusMd,
              padding: 12,
              fontSize: 14,
              fontFamily: V2.fontSans,
              resize: 'vertical',
              outline: 'none',
              background: V2.white,
              color: V2.black,
              boxSizing: 'border-box',
            }}
          />
          <div
            style={{
              fontSize: 10,
              color: description.length < 50 ? V2.red : V2.stone,
              marginTop: 4,
              fontFamily: V2.fontSans,
            }}
          >
            {description.length}/50 mínimo
          </div>
        </div>

        {/* Evidence upload */}
        <div style={{ marginBottom: 24 }}>
          <div style={LABEL_STYLE}>EVIDENCIAS (OPCIONAL)</div>
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${V2.border}`,
              borderRadius: V2.radiusMd,
              padding: 16,
              textAlign: 'center',
              cursor: 'pointer',
              background: V2.white,
            }}
          >
            <Upload size={24} style={{ color: V2.stone, margin: '0 auto 6px' }} />
            <div style={{ fontSize: 13, color: V2.black, marginBottom: 2 }}>
              Arrastra o pulsa para subir
            </div>
            <div style={{ fontSize: 11, color: V2.stone }}>
              Máx. 5 archivos, 10MB cada uno
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          {/* Preview grid */}
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2" style={{ marginTop: 10 }}>
              {files.map((file, idx) => (
                <div
                  key={idx}
                  style={{
                    position: 'relative',
                    width: 60,
                    height: 60,
                    borderRadius: 8,
                    overflow: 'hidden',
                    border: `1px solid ${V2.border}`,
                    background: V2.surface,
                  }}
                >
                  {file.type.startsWith('image/') ? (
                    <img
                      src={URL.createObjectURL(file)}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div
                      className="flex items-center justify-center"
                      style={{ width: '100%', height: '100%', fontSize: 9, color: V2.stone }}
                    >
                      PDF
                    </div>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                    style={{
                      position: 'absolute',
                      top: 2,
                      right: 2,
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: V2.black,
                      color: V2.white,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                    }}
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Submit button */}
      <div
        className="shrink-0 px-4 pb-5 pt-3"
        style={{ background: V2.cream, borderTop: `1px solid ${V2.border}` }}
      >
        <button
          onClick={handleSubmit}
          disabled={!isValid || loading}
          style={{
            width: '100%',
            height: 44,
            borderRadius: V2.radiusFull,
            background: isValid && !loading ? V2.red : V2.border,
            color: isValid && !loading ? V2.white : V2.stone,
            border: 'none',
            fontSize: 14,
            fontWeight: 600,
            cursor: isValid && !loading ? 'pointer' : 'not-allowed',
            fontFamily: V2.fontSans,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'all 0.15s',
          }}
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Abriendo...
            </>
          ) : (
            'Abrir disputa formal'
          )}
        </button>
      </div>

      {/* Confirmation modal */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center px-6"
            style={{ zIndex: 100 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0"
              style={{ background: 'rgba(0,0,0,0.5)' }}
              onClick={() => setShowConfirm(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Modal card */}
            <motion.div
              style={{
                background: V2.white,
                borderRadius: 16,
                padding: 24,
                maxWidth: 340,
                width: '100%',
                position: 'relative',
                zIndex: 101,
              }}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="flex justify-center" style={{ marginBottom: 12 }}>
                <AlertTriangle size={32} style={{ color: V2.red }} />
              </div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  textAlign: 'center',
                  color: V2.black,
                  marginBottom: 8,
                  fontFamily: V2.fontSans,
                }}
              >
                ¿Confirmas que quieres abrir una disputa formal?
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: V2.stone,
                  textAlign: 'center',
                  marginBottom: 20,
                  lineHeight: 1.4,
                  fontFamily: V2.fontSans,
                }}
              >
                Esta acción notificará al admin de Hispaloshop y puede afectar a la reputación de la otra parte.
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: V2.radiusFull,
                    background: V2.white,
                    color: V2.black,
                    border: `1px solid ${V2.border}`,
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: V2.fontSans,
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirm}
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: V2.radiusFull,
                    background: V2.red,
                    color: V2.white,
                    border: 'none',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: V2.fontSans,
                  }}
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
