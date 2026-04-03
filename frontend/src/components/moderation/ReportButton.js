import React, { useState } from 'react';
import FocusTrap from 'focus-trap-react';
import { Flag, X } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../../services/api/client';
import { useTranslation } from 'react-i18next';
import i18n from "../../locales/i18n";
const REASONS = [{
  key: 'spam',
  label: 'Spam o contenido repetitivo'
}, {
  key: 'misleading',
  label: "Información engañosa"
}, {
  key: 'offensive',
  label: 'Contenido ofensivo'
}, {
  key: 'fraud',
  label: 'Fraude o estafa'
}, {
  key: 'copyright',
  label: "Violación de derechos de autor"
}, {
  key: 'other',
  label: 'Otro motivo'
}];

/**
 * ReportButton — reusable report trigger.
 * Props:
 *   contentType: 'post' | 'reel' | 'product' | 'review' | 'recipe' | 'profile' | …
 *   contentId: string
 *   contentOwnerId?: string
 */
export default function ReportButton({
  contentType,
  contentId,
  contentOwnerId
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);
  const handleSubmit = async e => {
    e.preventDefault();
    if (!reason) return;
    setSending(true);
    try {
      await apiClient.post(`/moderation/report`, {
        content_type: contentType,
        content_id: contentId,
        content_owner_id: contentOwnerId,
        reason,
        description
      });
      toast.success('Reporte enviado. Lo revisaremos en breve.');
      setOpen(false);
      setReason('');
      setDescription('');
    } catch (err) {
      toast.error(err.message || i18n.t('report_button.noSePudoEnviarElReporte', 'No se pudo enviar el reporte'));
    } finally {
      setSending(false);
    }
  };
  return <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Reportar contenido" className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600">
        <Flag className="h-3.5 w-3.5" />
        Reportar
      </button>

      <AnimatePresence>
        {open && <>
            <motion.div key="backdrop" initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }} exit={{
          opacity: 0
        }} onClick={() => setOpen(false)} className="fixed inset-0 z-50 bg-black/40" />
            <FocusTrap focusTrapOptions={{
          escapeDeactivates: false,
          allowOutsideClick: true,
          returnFocusOnDeactivate: true
        }}>
            <motion.div key="sheet" initial={{
            y: '100%'
          }} animate={{
            y: 0
          }} exit={{
            y: '100%'
          }} transition={{
            type: 'spring',
            damping: 28,
            stiffness: 320
          }} className="fixed inset-x-0 bottom-0 z-50 rounded-t-[28px] bg-white px-5 pb-10 pt-4">
              <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-stone-200" />

              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-stone-400">
                    Comunidad
                  </p>
                  <h2 className="text-xl font-semibold text-stone-950">Reportar contenido</h2>
                </div>
                <button type="button" onClick={() => setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-stone-500 transition-colors hover:bg-stone-200">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  {REASONS.map(({
                  key,
                  label
                }) => <button key={key} type="button" onClick={() => setReason(key)} className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition-all duration-150 ${reason === key ? 'border-stone-950 bg-stone-50 font-medium text-stone-950' : 'border-stone-100 text-stone-700 hover:border-stone-200 hover:bg-stone-50'}`}>
                      {label}
                      {reason === key && <span className="h-2 w-2 rounded-full bg-stone-950" />}
                    </button>)}
                </div>

                {reason && <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder={i18n.t('report_button.anadeUnDetalleOpcional', 'Añade un detalle (opcional)...')} rows={2} className="w-full resize-none rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none focus:border-stone-400" />}

                <button type="submit" disabled={!reason || sending} className="h-12 w-full rounded-full bg-stone-950 text-sm font-medium text-white transition-colors hover:bg-stone-800 disabled:opacity-40">
                  {sending ? 'Enviando…' : 'Enviar reporte'}
                </button>
              </form>
            </motion.div>
            </FocusTrap>
          </>}
      </AnimatePresence>
    </>;
}