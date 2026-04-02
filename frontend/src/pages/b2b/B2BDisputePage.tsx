// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, AlertTriangle, Upload, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../services/api/client';
import { useTranslation } from 'react-i18next';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const REASONS = [
  'Producto no recibido',
  'Producto diferente',
  'Calidad inferior',
  t('b2_b_dispute.documentacionIncorrecta', 'Documentación incorrecta'),
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
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const last8 = operationId ? operationId.slice(-8) : '';
  const isValid = reason && description.length >= 50;

  // Generate preview URLs from File objects, revoke on cleanup
  useEffect(() => {
    const urls = files.map((f) =>
      f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
    );
    setPreviews(urls);
    return () => urls.forEach((u) => u && URL.revokeObjectURL(u));
  }, [files]);

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    const remaining = 5 - files.length;
    if (remaining <= 0) {
      toast.error(t('b2_b_dispute.maximo5Archivos', 'Máximo 5 archivos'));
      return;
    }

    const validated = [];
    for (const f of selected.slice(0, remaining)) {
      if (!ACCEPTED_TYPES.includes(f.type)) {
        toast.error(`"${f.name}" no es un formato válido (solo JPG, PNG, PDF)`);
        continue;
      }
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`"${f.name}" supera el límite de 10 MB`);
        continue;
      }
      validated.push(f);
    }

    if (validated.length > 0) {
      setFiles((prev) => [...prev, ...validated]);
    }
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
      const formData = new FormData();
      formData.append('reason', reason);
      formData.append('description', description);
      files.forEach((f) => formData.append('evidence', f));
      await apiClient.post(`/b2b/operations/${operationId}/dispute`, formData);
      toast.success('Disputa abierta');
      navigate(-1);
    } catch (err) {
      const msg = err?.response?.data?.detail || t('b2_b_dispute.errorAlAbrirLaDisputa', 'Error al abrir la disputa');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-white">
      {/* TopBar */}
      <div className="flex items-center gap-3 px-4 shrink-0 h-14 border-b border-stone-200 bg-white">
        <button
          onClick={() => navigate(-1)}
          className="text-stone-950 bg-transparent border-none cursor-pointer p-1"
        >
          <ArrowLeft size={22} />
        </button>
        <div className="text-[15px] font-semibold text-stone-950">
          Abrir disputa · #HSP-B2B-{last8}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-5 pb-[100px]">
        {/* Warning card */}
        <div className="bg-stone-50 border border-stone-200/30 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3 mb-2.5">
            <AlertTriangle size={20} className="text-stone-500 flex-shrink-0 mt-px" />
            <span className="text-[13px] text-stone-950 leading-[1.4]">
              Antes de abrir una disputa, te recomendamos hablar con la otra parte en el chat.
            </span>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="bg-white border border-stone-200 rounded-full text-[13px] px-3.5 py-1.5 cursor-pointer text-stone-950 mb-2"
          >
            Ir al chat &rarr;
          </button>
          <div className="text-[11px] text-stone-500 leading-[1.4]">
            Si no llegáis a un acuerdo, el admin de Hispaloshop revisará el caso en 72h.
          </div>
        </div>

        {/* Reason selector */}
        <div className="mb-6">
          <div className="text-[10px] uppercase text-stone-500 font-semibold tracking-wider mb-2">MOTIVO</div>
          <div className="grid grid-cols-2 gap-2">
            {REASONS.map((r) => (
              <button
                key={r}
                onClick={() => setReason(r)}
                className={`flex items-center justify-center h-9 rounded-full text-xs cursor-pointer transition-all duration-150 border ${
                  reason === r
                    ? 'bg-stone-950 text-white border-stone-950'
                    : 'bg-white text-stone-950 border-stone-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="mb-6">
          <div className="text-[10px] uppercase text-stone-500 font-semibold tracking-wider mb-2">DESCRIPCIÓN</div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('b2_b_dispute.describeDetalladamenteElProblemaMin', 'Describe detalladamente el problema (mínimo 50 caracteres)...')}
            className="w-full min-h-[120px] border border-stone-200 rounded-xl p-3 text-sm resize-y outline-none bg-white text-stone-950 box-border"
          />
          <div className={`text-[10px] mt-1 ${description.length < 50 ? 'text-red-600' : 'text-stone-500'}`}>
            {description.length}/50 mínimo
          </div>
        </div>

        {/* Evidence upload */}
        <div className="mb-6">
          <div className="text-[10px] uppercase text-stone-500 font-semibold tracking-wider mb-2">EVIDENCIAS (OPCIONAL)</div>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-stone-200 rounded-xl p-4 text-center cursor-pointer bg-white"
          >
            <Upload size={24} className="text-stone-500 mx-auto mb-1.5" />
            <div className="text-[13px] text-stone-950 mb-0.5">
              Arrastra o pulsa para subir
            </div>
            <div className="text-[11px] text-stone-500">
              Máx. 5 archivos, 10MB cada uno
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Preview grid */}
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2.5">
              {files.map((file, idx) => (
                <div
                  key={idx}
                  className="relative w-[60px] h-[60px] rounded-xl overflow-hidden border border-stone-200 bg-stone-100"
                >
                  {previews[idx] ? (
                    <img
                      src={previews[idx]}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full text-[9px] text-stone-500">
                      PDF
                    </div>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                    className="absolute top-0.5 right-0.5 w-[18px] h-[18px] rounded-full bg-stone-950 text-white border-none cursor-pointer flex items-center justify-center p-0"
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
      <div className="shrink-0 px-4 pb-5 pt-3 bg-white border-t border-stone-200">
        <button
          onClick={handleSubmit}
          disabled={!isValid || loading}
          className={`w-full h-11 rounded-full border-none text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-150 ${
            isValid && !loading
              ? 'bg-red-600 text-white cursor-pointer'
              : 'bg-stone-200 text-stone-500 cursor-not-allowed'
          }`}
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
            className="fixed inset-0 flex items-center justify-center px-6 z-[100]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/50"
              onClick={() => setShowConfirm(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Modal card */}
            <motion.div
              className="bg-white rounded-2xl p-6 max-w-[340px] w-full relative z-[101]"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="flex justify-center mb-3">
                <AlertTriangle size={32} className="text-red-600" />
              </div>
              <div className="text-[15px] font-semibold text-center text-stone-950 mb-2">
                ¿Confirmas que quieres abrir una disputa formal?
              </div>
              <div className="text-[13px] text-stone-500 text-center mb-5 leading-[1.4]">
                Esta acción notificará al admin de Hispaloshop y puede afectar a la reputación de la otra parte.
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 h-11 rounded-full bg-white text-stone-950 border border-stone-200 text-sm font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 h-11 rounded-full bg-red-600 text-white border-none text-sm font-medium cursor-pointer"
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
