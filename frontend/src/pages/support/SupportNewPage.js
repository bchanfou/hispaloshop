import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../services/api/client';
import { toast } from 'sonner';
import { Loader2, FileText, AlertCircle, ChevronRight } from 'lucide-react';

const CATEGORIES = [
  { value: 'order_issue', labelKey: 'support.cat.order_issue', label: 'Problema con pedido' },
  { value: 'payment_issue', labelKey: 'support.cat.payment_issue', label: 'Problema con pago' },
  { value: 'account_issue', labelKey: 'support.cat.account_issue', label: 'Cuenta o login' },
  { value: 'fiscal_issue', labelKey: 'support.cat.fiscal_issue', label: 'Fiscal / facturas' },
  { value: 'product_complaint', labelKey: 'support.cat.product_complaint', label: 'Queja sobre un producto' },
  { value: 'seller_dispute', labelKey: 'support.cat.seller_dispute', label: 'Disputa con vendedor' },
  { value: 'b2b_operation', labelKey: 'support.cat.b2b_operation', label: 'Operación B2B' },
  { value: 'feature_request', labelKey: 'support.cat.feature_request', label: 'Sugerencia' },
  { value: 'bug_report', labelKey: 'support.cat.bug_report', label: 'Bug del producto' },
  { value: 'other', labelKey: 'support.cat.other', label: 'Otro' },
];

export default function SupportNewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [category, setCategory] = useState(searchParams.get('category') || 'other');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [triage, setTriage] = useState(null);
  const [triageLoading, setTriageLoading] = useState(false);
  const triageDebounce = useRef(null);

  const orderId = searchParams.get('order_id') || null;
  const productId = searchParams.get('product_id') || null;

  // Debounced AI triage call after user has written ≥200 chars
  useEffect(() => {
    if (body.length < 200) { setTriage(null); return; }
    if (triageDebounce.current) clearTimeout(triageDebounce.current);
    triageDebounce.current = setTimeout(async () => {
      setTriageLoading(true);
      try {
        const result = await apiClient.post('/support/tickets/ai-triage', { subject, body, category });
        setTriage(result);
      } catch {
        setTriage(null);
      } finally {
        setTriageLoading(false);
      }
    }, 700);
    return () => { if (triageDebounce.current) clearTimeout(triageDebounce.current); };
  }, [subject, body, category]);

  const submit = async (e) => {
    e?.preventDefault();
    if (!subject.trim() || subject.length < 3) {
      toast.error(t('support.subjectShort', 'El asunto es muy corto'));
      return;
    }
    if (body.trim().length < 5) {
      toast.error(t('support.bodyShort', 'Describe el problema con más detalle'));
      return;
    }
    setSubmitting(true);
    try {
      const data = await apiClient.post('/support/tickets', {
        subject: subject.trim(),
        category,
        body: body.trim(),
        related_order_id: orderId,
        related_product_id: productId,
        ai_triage: triage,
      });
      toast.success(t('support.created', 'Ticket creado'));
      navigate(`/support/tickets/${data.ticket_id}`);
    } catch (err) {
      toast.error(err?.message || t('support.error', 'No se pudo crear el ticket'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-stone-950">{t('support.new.title', 'Nuevo ticket de soporte')}</h1>
          <p className="text-sm text-stone-500 mt-1">{t('support.new.subtitle', 'Describe el problema y nuestro equipo te responderá lo antes posible.')}</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={submit} className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
            <div>
              <label className="text-xs text-stone-500 block mb-1">{t('support.category', 'Categoría')}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{t(c.labelKey, c.label)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-stone-500 block mb-1">{t('support.subject', 'Asunto')}</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={200}
                placeholder={t('support.subjectPh', 'Resumen breve del problema')}
                className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-stone-500 block mb-1">{t('support.description', 'Descripción')}</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
                maxLength={5000}
                placeholder={t('support.descriptionPh', 'Explica qué pasó, cuándo, qué esperabas...')}
                className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm"
              />
              <p className="text-xs text-stone-400 mt-1">{body.length} / 5000</p>
            </div>
            {orderId && (
              <p className="text-xs text-stone-500 bg-stone-100 rounded-xl px-3 py-2">
                {t('support.linkedOrder', 'Pedido relacionado')}: <span className="font-mono">{orderId}</span>
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-stone-950 text-white text-sm font-medium hover:bg-stone-800 disabled:opacity-40"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('support.submit', 'Enviar ticket')}
            </button>
          </form>

          <aside className="space-y-4">
            <div className="bg-white rounded-2xl border border-stone-200 p-5">
              <h3 className="text-sm font-semibold text-stone-950 mb-3">{t('support.relatedArticles', 'Artículos relacionados')}</h3>
              {triageLoading ? (
                <p className="text-xs text-stone-400 inline-flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> {t('support.aiThinking', 'Analizando...')}</p>
              ) : triage?.suggested_articles?.length > 0 ? (
                <div className="space-y-2">
                  {triage.suggested_articles.map((slug) => (
                    <Link
                      key={slug}
                      to={`/help/${slug}`}
                      target="_blank"
                      className="flex items-center gap-2 text-sm text-stone-700 hover:text-stone-950 group"
                    >
                      <FileText className="w-4 h-4 text-stone-400 group-hover:text-stone-700" strokeWidth={1.5} />
                      <span className="flex-1 truncate">{slug.replace(/-/g, ' ')}</span>
                      <ChevronRight className="w-3 h-3 text-stone-400" />
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-stone-400">{t('support.aiHint', 'Escribe al menos 200 caracteres y te sugerimos artículos.')}</p>
              )}
            </div>

            {triage?.can_self_resolve && triage?.confidence > 0.7 && (
              <div className="bg-stone-100 border border-stone-200 rounded-2xl p-5">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-stone-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-stone-950 mb-1">{t('support.selfResolveTitle', '¿Esto te ayuda?')}</p>
                    <p className="text-xs text-stone-600">
                      {t('support.selfResolveBody', 'Antes de abrir un ticket, échale un ojo al primer artículo recomendado. Suele resolver casos similares.')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
