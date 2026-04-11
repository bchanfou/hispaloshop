import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../services/api/client';

/**
 * Section 3.5b — global modal that listens for the `moderation:blocked`
 * event dispatched by the API client when an endpoint returns 403 with
 * { error: 'content_blocked_by_moderation' }.
 *
 * Mounted ONCE in AppLayout. Shows the user why their content was
 * blocked and offers a "request human review" path that creates a
 * self_appeal report on the user's behalf.
 */
export default function ModerationBlockedModal() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    function handler(event) {
      const detail = event?.detail || {};
      setPayload(detail);
      setOpen(true);
    }
    window.addEventListener('moderation:blocked', handler);
    return () => window.removeEventListener('moderation:blocked', handler);
  }, []);

  const close = () => {
    setOpen(false);
    setPayload(null);
  };

  const requestHumanReview = async () => {
    setSubmitting(true);
    try {
      const conf = payload?.confidence ?? '?';
      const cat = payload?.category || 'unknown';
      await apiClient.post('/moderation/reports', {
        content_type: 'self_appeal',
        content_id: 'pending',
        reason: 'other',
        description: `Usuario solicita revisión de contenido bloqueado: ${cat} confidence ${conf}`,
      });
      toast.success(t('moderation.blocked.appealConfirm', 'Hemos recibido tu solicitud. Un moderador revisará tu caso.'));
      close();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      toast.error(detail || err?.message || t('moderation.blocked.appealError', 'No se pudo enviar la solicitud'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const category = payload?.category || 'unknown';
  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={close}>
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-stone-200 flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-stone-100 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-5 h-5 text-stone-700" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-stone-950">
              {t('moderation.blocked.title', 'Tu publicación no se puede compartir')}
            </h3>
            <p className="text-sm text-stone-600 mt-1">
              {t('moderation.blocked.body', 'Nuestro sistema detectó que el contenido podría infringir nuestras normas de comunidad ({{category}}).', { category })}
            </p>
          </div>
          <button onClick={close} className="p-1 text-stone-500 hover:text-stone-950 flex-shrink-0">
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>
        <div className="p-6 flex flex-col gap-2">
          <button
            onClick={close}
            className="w-full inline-flex items-center justify-center px-4 py-3 rounded-xl bg-stone-950 text-white text-sm font-medium hover:bg-stone-800"
          >
            {t('moderation.blocked.editButton', 'Editar y volver a intentar')}
          </button>
          <button
            onClick={requestHumanReview}
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-stone-200 text-sm text-stone-700 hover:bg-stone-100 disabled:opacity-40"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {t('moderation.blocked.appealButton', 'Solicitar revisión humana')}
          </button>
        </div>
      </div>
    </div>
  );
}
