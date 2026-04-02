// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Loader2, Search, Check, X, Download, FileText,
  AlertTriangle, ChevronDown, Eye, Shield,
} from 'lucide-react';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const isSafeUrl = (url) => {
  if (!url) return false;
  try { const u = new URL(url); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; }
};

function StatusBadge({ verified, needsReview, blocked, hasUrl }) {
  if (verified) return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-950">Verificado</span>
  );
  if (needsReview) return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">Revisión manual</span>
  );
  if (hasUrl && !verified) return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-stone-200 bg-white text-stone-400">Rechazado</span>
  );
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">Pendiente</span>
  );
}

export default function AdminFiscalPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [influencers, setInfluencers] = useState([]);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [genYear, setGenYear] = useState(new Date().getFullYear());
  const [genQuarter, setGenQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3));
  const [generating, setGenerating] = useState(false);
  const [reviewModal, setReviewModal] = useState(null); // { influencer, action }
  const [rejectReason, setRejectReason] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const fetchAll = async () => {
    try {
      const [s, inf, pr, rp] = await Promise.all([
        apiClient.get('/admin/tax/fiscal-stats').catch(() => null),
        apiClient.get(`/admin/tax/influencers?status=${filter}&search=${search}`).catch(() => ({ influencers: [] })),
        apiClient.get('/admin/tax/pending-reviews').catch(() => ({ pending: [] })),
        apiClient.get('/admin/tax/reports').catch(() => ({ reports: [] })),
      ]);
      setStats(s);
      setInfluencers(Array.isArray(inf?.influencers) ? inf.influencers : []);
      setPendingReviews(Array.isArray(pr?.pending) ? pr.pending : []);
      setReports(Array.isArray(rp?.reports) ? rp.reports : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [filter, search]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await apiClient.post('/admin/tax/generate-190', { year: genYear, quarter: genQuarter });
      toast.success(`Informe Q${genQuarter} ${genYear} generado. ${res.perceptors_count} perceptores.`);
      await fetchAll();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Error generando informe');
    } finally {
      setGenerating(false);
    }
  };

  const handleReview = async (action) => {
    if (!reviewModal) return;
    setReviewing(true);
    try {
      await apiClient.post('/admin/tax/review-certificate', {
        influencer_id: reviewModal.influencer_id,
        action,
        reason: action === 'reject' ? rejectReason : '',
      });
      toast.success(action === 'approve' ? 'Certificado verificado' : 'Certificado rechazado');
      setReviewModal(null);
      setRejectReason('');
      await fetchAll();
    } catch (error) {
      toast.error(error?.response?.data?.detail || t('admin_fiscal.errorAlProcesarLaRevision', 'Error al procesar la revisión'));
    } finally {
      setReviewing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-stone-500" />
      </div>
    );
  }

  return (
    <div className="bg-stone-50">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <button type="button" onClick={() => navigate('/admin')} aria-label="Volver" className="bg-transparent border-none cursor-pointer">
          <ArrowLeft className="w-5 h-5 text-stone-950" />
        </button>
        <h1 className="text-xl font-bold text-stone-950">{t('admin_fiscal.gestionFiscal', 'Gestión fiscal')}</h1>
      </div>
      <p className="text-sm mb-5 ml-8 text-stone-500">Retenciones, certificados y Modelo 190</p>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="p-4 bg-white rounded-2xl border border-stone-200">
            <p className="text-2xl font-extrabold text-stone-600">{(stats.total_withheld_ytd || 0).toFixed(0)}€</p>
            <p className="text-xs mt-0.5 text-stone-500">Total retenido YTD</p>
          </div>
          <div className="p-4 bg-white rounded-2xl border border-stone-200">
            <p className="text-2xl font-extrabold text-stone-950">{stats.es_active_count || 0}</p>
            <p className="text-xs mt-0.5 text-stone-500">Influencers ES activos</p>
          </div>
          <div className="p-4 bg-white rounded-2xl border border-stone-200">
            <p className={`text-2xl font-extrabold ${stats.pending_review > 0 ? 'text-stone-700' : 'text-stone-950'}`}>{stats.pending_review || 0}</p>
            <p className="text-xs mt-0.5 text-stone-500">{t('admin_fiscal.pendientesRevision', 'Pendientes revisión')}</p>
          </div>
          <div className="p-4 bg-white rounded-2xl border border-stone-200">
            <p className="text-sm font-bold text-stone-950">{stats.next_190_quarter}</p>
            <p className="text-xs mt-0.5 text-stone-500">Próximo 190: {stats.next_190_deadline}</p>
          </div>
        </div>
      )}

      {/* Pending manual reviews */}
      {pendingReviews.length > 0 && (
        <div className="mb-5">
          <h2 className="text-sm font-bold mb-3 text-stone-950">{t('admin_fiscal.revisionManualPendiente', 'Revisión manual pendiente')}</h2>
          <div className="space-y-2">
            {pendingReviews.map(inf => (
              <div key={inf.influencer_id} className="flex items-center gap-3 p-3.5 bg-white rounded-2xl border border-stone-200">
                <div className="w-9 h-9 flex items-center justify-center shrink-0 rounded-full bg-stone-100">
                  <AlertTriangle className="w-4 h-4 text-stone-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate text-stone-950">{inf.full_name || inf.email}</p>
                  <p className="text-xs text-stone-500">
                    País: {inf.tax_country || '—'} · Confianza: Baja
                  </p>
                </div>
                <button
                  onClick={() => setReviewModal(inf)}
                  className="shrink-0 px-3 py-1.5 text-xs font-semibold transition-colors bg-stone-950 text-white rounded-2xl border-none cursor-pointer"
                >
                  Revisar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generate report */}
      <div className="p-4 mb-5 bg-white rounded-2xl border border-stone-200">
        <h2 className="text-sm font-bold mb-3 text-stone-950">Generar informe Modelo 190</h2>
        <div className="flex gap-2 mb-3">
          <select
            value={genQuarter}
            onChange={e => setGenQuarter(Number(e.target.value))}
            className="flex-1 px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white text-stone-950"
          >
            <option value={1}>Q1 (Ene-Mar)</option>
            <option value={2}>Q2 (Abr-Jun)</option>
            <option value={3}>Q3 (Jul-Sep)</option>
            <option value={4}>Q4 (Oct-Dic)</option>
          </select>
          <select
            value={genYear}
            onChange={e => setGenYear(Number(e.target.value))}
            className="px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white text-stone-950"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full py-2.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2 bg-stone-950 text-white rounded-2xl border-none cursor-pointer"
          style={{ cursor: generating ? 'wait' : 'pointer' }}
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          Generar informe Modelo 190
        </button>

        {/* Generated reports */}
        {reports.length > 0 && (
          <div className="mt-4 space-y-2">
            {reports.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-t border-stone-200">
                <div>
                  <p className="text-sm font-semibold text-stone-950">Q{r.quarter} {r.year}</p>
                  <p className="text-xs text-stone-500">
                    {r.perceptors_count} perceptores · {(r.total_withheld || 0).toFixed(2)}€ retenido
                  </p>
                </div>
                {isSafeUrl(r.pdf_url) && (
                  <a
                    href={r.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold transition-colors bg-stone-100 text-stone-950 rounded-2xl"
                  >
                    <Download className="w-3.5 h-3.5" /> PDF
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Influencer list with filters */}
      <div className="mb-5">
        <h2 className="text-sm font-bold mb-3 text-stone-950">Influencers</h2>

        {/* Filters */}
        <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
          {[
            { key: 'all', label: 'Todos' },
            { key: 'verified', label: 'Verificados' },
            { key: 'pending', label: 'Pendientes' },
            { key: 'rejected', label: 'Rechazados' },
            { key: 'manual', label: 'Manual' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-xs font-semibold shrink-0 transition-colors rounded-full border-none cursor-pointer ${
                filter === f.key
                  ? 'bg-stone-950 text-white'
                  : 'bg-stone-100 text-stone-500'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o NIF..."
            className="w-full pl-10 pr-4 py-2.5 text-sm focus:outline-none bg-white rounded-2xl border border-stone-200 text-stone-950"
          />
        </div>

        {/* List */}
        <div className="space-y-2">
          {influencers.map(inf => (
            <div key={inf.influencer_id} className="flex items-center gap-3 p-3.5 bg-white rounded-2xl border border-stone-200">
              <div className="w-9 h-9 flex items-center justify-center shrink-0 rounded-full bg-stone-100">
                <Shield className="w-4 h-4 text-stone-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-stone-950">{inf.full_name || inf.email}</p>
                <p className="text-xs text-stone-500">
                  {inf.tax_country || '—'} · {inf.withholding_pct > 0 ? `${inf.withholding_pct}% IRPF` : t('fiscal_setup.sinRetencion', 'Sin retención')}
                  {inf.payout_method ? ` · ${inf.payout_method === 'sepa' ? 'SEPA' : 'Stripe'}` : ''}
                </p>
              </div>
              <StatusBadge
                verified={inf.certificate_verified}
                needsReview={inf.needs_manual_review}
                blocked={inf.affiliate_blocked}
                hasUrl={!!inf.certificate_url}
              />
            </div>
          ))}
          {influencers.length === 0 && (
            <p className="text-sm text-center py-6 text-stone-500">
              No se encontraron influencers
            </p>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 max-w-md w-full p-6 bg-white rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-stone-950">Revisar certificado</h3>
              <button type="button" onClick={() => { setReviewModal(null); setRejectReason(''); }} aria-label="Cerrar" className="bg-transparent border-none cursor-pointer">
                <X className="w-5 h-5 text-stone-500" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm font-semibold text-stone-950">{reviewModal.full_name || reviewModal.email}</p>
              <p className="text-xs text-stone-500">
                País declarado: {reviewModal.tax_country || '—'} · Nombre detectado: {reviewModal.entity_name || '—'}
              </p>
            </div>

            {isSafeUrl(reviewModal.certificate_url) && (
              <a
                href={reviewModal.certificate_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 mb-4 text-sm font-semibold transition-colors bg-stone-100 rounded-2xl text-stone-950"
              >
                <Eye className="w-4 h-4" />
                Ver certificado
              </a>
            )}

            <div className="mb-4">
              <label className="block text-xs font-medium mb-1 text-stone-500">Motivo de rechazo (opcional)</label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Motivo del rechazo..."
                rows={2}
                className="w-full px-3 py-2 text-sm resize-none focus:outline-none bg-stone-100 rounded-xl border border-stone-200 text-stone-950"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleReview('approve')}
                disabled={reviewing}
                className="flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-1 transition-colors bg-stone-950 text-white rounded-2xl border-none cursor-pointer"
              >
                {reviewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Verificar
              </button>
              <button
                onClick={() => handleReview('reject')}
                disabled={reviewing}
                className="flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-1 transition-colors border border-stone-200 text-stone-700 bg-white hover:bg-stone-50 rounded-2xl cursor-pointer"
              >
                {reviewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                Rechazar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
