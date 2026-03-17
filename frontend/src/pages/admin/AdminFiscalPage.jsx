import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Loader2, Search, Check, X, Download, FileText,
  AlertTriangle, ChevronDown, Eye, Shield,
} from 'lucide-react';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';

function StatusBadge({ verified, needsReview, blocked, hasUrl }) {
  if (verified) return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--color-surface-alt, #f5f5f4)', color: 'var(--color-black)' }}>Verificado</span>
  );
  if (needsReview) return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--color-amber-light)', color: 'var(--color-amber)' }}>Revisión manual</span>
  );
  if (hasUrl && !verified) return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--color-red-light)', color: 'var(--color-red)' }}>Rechazado</span>
  );
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--color-surface)', color: 'var(--color-stone)' }}>Pendiente</span>
  );
}

export default function AdminFiscalPage() {
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
      setInfluencers(inf?.influencers || []);
      setPendingReviews(pr?.pending || []);
      setReports(rp?.reports || []);
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
      toast.error('Error generando informe');
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
    } catch {
      toast.error('Error al procesar la revisión');
    } finally {
      setReviewing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-stone)' }} />
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'var(--font-sans)', background: 'var(--color-cream)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <button onClick={() => navigate('/admin')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <ArrowLeft className="w-5 h-5" style={{ color: 'var(--color-black)' }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-black)' }}>Gestión fiscal</h1>
      </div>
      <p className="text-sm mb-5 ml-8" style={{ color: 'var(--color-stone)' }}>Retenciones, certificados y Modelo 190</p>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="p-4" style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
            <p className="text-2xl font-extrabold" style={{ color: 'var(--color-amber)' }}>{(stats.total_withheld_ytd || 0).toFixed(0)}€</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-stone)' }}>Total retenido YTD</p>
          </div>
          <div className="p-4" style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
            <p className="text-2xl font-extrabold" style={{ color: 'var(--color-black)' }}>{stats.es_active_count || 0}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-stone)' }}>Influencers ES activos</p>
          </div>
          <div className="p-4" style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
            <p className="text-2xl font-extrabold" style={{ color: stats.pending_review > 0 ? 'var(--color-red)' : 'var(--color-black)' }}>{stats.pending_review || 0}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-stone)' }}>Pendientes revisión</p>
          </div>
          <div className="p-4" style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
            <p className="text-sm font-bold" style={{ color: 'var(--color-black)' }}>{stats.next_190_quarter}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-stone)' }}>Próximo 190: {stats.next_190_deadline}</p>
          </div>
        </div>
      )}

      {/* Pending manual reviews */}
      {pendingReviews.length > 0 && (
        <div className="mb-5">
          <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--color-black)' }}>Revisión manual pendiente</h2>
          <div className="space-y-2">
            {pendingReviews.map(inf => (
              <div key={inf.influencer_id} className="flex items-center gap-3 p-3.5" style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
                <div className="w-9 h-9 flex items-center justify-center shrink-0" style={{ borderRadius: '50%', background: 'var(--color-amber-light)' }}>
                  <AlertTriangle className="w-4 h-4" style={{ color: 'var(--color-amber)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-black)' }}>{inf.full_name || inf.email}</p>
                  <p className="text-xs" style={{ color: 'var(--color-stone)' }}>
                    País: {inf.tax_country || '—'} · Confianza: Baja
                  </p>
                </div>
                <button
                  onClick={() => setReviewModal(inf)}
                  className="shrink-0 px-3 py-1.5 text-xs font-semibold transition-colors"
                  style={{ background: 'var(--color-black)', color: '#fff', borderRadius: 'var(--radius-xl)', border: 'none', cursor: 'pointer' }}
                >
                  Revisar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generate report */}
      <div className="p-4 mb-5" style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
        <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--color-black)' }}>Generar informe Modelo 190</h2>
        <div className="flex gap-2 mb-3">
          <select
            value={genQuarter}
            onChange={e => setGenQuarter(Number(e.target.value))}
            className="flex-1 px-3 py-2 text-sm"
            style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-white)', color: 'var(--color-black)' }}
          >
            <option value={1}>Q1 (Ene-Mar)</option>
            <option value={2}>Q2 (Abr-Jun)</option>
            <option value={3}>Q3 (Jul-Sep)</option>
            <option value={4}>Q4 (Oct-Dic)</option>
          </select>
          <select
            value={genYear}
            onChange={e => setGenYear(Number(e.target.value))}
            className="px-3 py-2 text-sm"
            style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-white)', color: 'var(--color-black)' }}
          >
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full py-2.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          style={{ background: 'var(--color-black)', color: '#fff', borderRadius: 'var(--radius-xl)', border: 'none', cursor: generating ? 'wait' : 'pointer' }}
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          Generar informe Modelo 190
        </button>

        {/* Generated reports */}
        {reports.length > 0 && (
          <div className="mt-4 space-y-2">
            {reports.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-2" style={{ borderTop: '1px solid var(--color-border)' }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-black)' }}>Q{r.quarter} {r.year}</p>
                  <p className="text-xs" style={{ color: 'var(--color-stone)' }}>
                    {r.perceptors_count} perceptores · {(r.total_withheld || 0).toFixed(2)}€ retenido
                  </p>
                </div>
                <a
                  href={r.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold transition-colors"
                  style={{ background: 'var(--color-surface)', color: 'var(--color-black)', borderRadius: 'var(--radius-xl)' }}
                >
                  <Download className="w-3.5 h-3.5" /> PDF
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Influencer list with filters */}
      <div className="mb-5">
        <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--color-black)' }}>Influencers</h2>

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
              className="px-3 py-1.5 text-xs font-semibold shrink-0 transition-colors"
              style={{
                borderRadius: 'var(--radius-full)',
                background: filter === f.key ? 'var(--color-black)' : 'var(--color-surface)',
                color: filter === f.key ? '#fff' : 'var(--color-stone)',
                border: 'none', cursor: 'pointer',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-stone)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o NIF..."
            className="w-full pl-10 pr-4 py-2.5 text-sm focus:outline-none"
            style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', color: 'var(--color-black)' }}
          />
        </div>

        {/* List */}
        <div className="space-y-2">
          {influencers.map(inf => (
            <div key={inf.influencer_id} className="flex items-center gap-3 p-3.5" style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
              <div className="w-9 h-9 flex items-center justify-center shrink-0" style={{ borderRadius: '50%', background: 'var(--color-surface)' }}>
                <Shield className="w-4 h-4" style={{ color: 'var(--color-stone)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-black)' }}>{inf.full_name || inf.email}</p>
                <p className="text-xs" style={{ color: 'var(--color-stone)' }}>
                  {inf.tax_country || '—'} · {inf.withholding_pct > 0 ? `${inf.withholding_pct}% IRPF` : 'Sin retención'}
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
            <p className="text-sm text-center py-6" style={{ color: 'var(--color-stone)' }}>
              No se encontraron influencers
            </p>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="mx-4 max-w-md w-full p-6" style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold" style={{ color: 'var(--color-black)' }}>Revisar certificado</h3>
              <button onClick={() => { setReviewModal(null); setRejectReason(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X className="w-5 h-5" style={{ color: 'var(--color-stone)' }} />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm font-semibold" style={{ color: 'var(--color-black)' }}>{reviewModal.full_name || reviewModal.email}</p>
              <p className="text-xs" style={{ color: 'var(--color-stone)' }}>
                País declarado: {reviewModal.tax_country || '—'} · Nombre detectado: {reviewModal.entity_name || '—'}
              </p>
            </div>

            {reviewModal.certificate_url && (
              <a
                href={reviewModal.certificate_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 mb-4 text-sm font-semibold transition-colors"
                style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', color: 'var(--color-black)' }}
              >
                <Eye className="w-4 h-4" />
                Ver certificado
              </a>
            )}

            <div className="mb-4">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-stone)' }}>Motivo de rechazo (opcional)</label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Motivo del rechazo..."
                rows={2}
                className="w-full px-3 py-2 text-sm resize-none focus:outline-none"
                style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', color: 'var(--color-black)' }}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleReview('approve')}
                disabled={reviewing}
                className="flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-1 transition-colors"
                style={{ background: 'var(--color-black)', color: '#fff', borderRadius: 'var(--radius-xl)', border: 'none', cursor: 'pointer' }}
              >
                {reviewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Verificar
              </button>
              <button
                onClick={() => handleReview('reject')}
                disabled={reviewing}
                className="flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-1 transition-colors"
                style={{ background: 'var(--color-red)', color: '#fff', borderRadius: 'var(--radius-xl)', border: 'none', cursor: 'pointer' }}
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
