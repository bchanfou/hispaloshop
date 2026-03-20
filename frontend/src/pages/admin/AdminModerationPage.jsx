import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../services/api/client';
import {
  ArrowLeft, Loader2, Shield, Eye, EyeOff, ShoppingBag,
  CheckCircle, RotateCcw, AlertTriangle, ChevronUp, X
} from 'lucide-react';

const FILTERS = [
  { key: 'all', label: 'Todo' },
  { key: 'hide', label: 'Ocultados' },
  { key: 'blocked', label: 'Bloq. productos' },
  { key: 'review', label: 'Para revisar' },
];

const VIOLATION_LABELS = {
  nudity: 'Desnudos',
  violence: 'Violencia',
  spam: 'Spam',
  health_misinformation: 'Desinformación salud',
  minor_safety: 'Seguridad menores',
  off_topic: 'Fuera de tema',
  alcohol: 'Alcohol',
  non_food_product: 'No alimentario',
  medical_claims: 'Claims médicos',
};

const CONTENT_TYPE_LABELS = {
  post: 'Post',
  reel: 'Reel',
  story: 'Story',
  product: 'Producto',
  community_post: 'Post comunidad',
};

function ConfidenceBadge({ confidence }) {
  if (!confidence && confidence !== 0) return null;
  const pct = Math.round(confidence * 100);
  const isHigh = pct >= 80;
  return (
    <span
      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
      style={{
        background: isHigh ? '#f5f5f4' : '#fffbeb',
        color: isHigh ? '#78716c' : '#d97706',
      }}
    >
      {pct}%
    </span>
  );
}

function StatCard({ icon: Icon, value, label, color }) {
  return (
    <div
      className="p-3.5 flex flex-col gap-1"
      style={{ borderRadius: '16px', border: '1px solid #e7e5e4', background: '#ffffff' }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 flex items-center justify-center shrink-0"
          style={{ borderRadius: '12px', background: color === 'red' ? '#fef2f2' : color === 'amber' ? '#fffbeb' : '#f5f5f4' }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color: color === 'red' ? '#dc2626' : color === 'amber' ? '#d97706' : '#78716c' }} />
        </div>
        <span className="text-xl font-extrabold" style={{ color: '#0c0a09' }}>{value}</span>
      </div>
      <span className="text-[11px]" style={{ color: '#78716c' }}>{label}</span>
    </div>
  );
}

function ModerationCard({ item, onConfirm, onRestore, onEscalate, busy }) {
  const [expanded, setExpanded] = useState(false);

  const typeIcon = item.content_type === 'product' ? ShoppingBag : item.action === 'hide' ? EyeOff : Eye;
  const TypeIcon = typeIcon;

  return (
    <div
      className="overflow-hidden"
      style={{ borderRadius: '16px', border: '1px solid #e7e5e4', background: '#ffffff' }}
    >
      <div className="p-3.5">
        {/* Top row: type + action + confidence */}
        <div className="flex items-center gap-2 mb-2.5 flex-wrap">
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1"
            style={{
              background: item.action === 'hide' ? '#fef2f2' : item.action === 'blocked' ? '#fef2f2' : '#fffbeb',
              color: item.action === 'hide' ? '#dc2626' : item.action === 'blocked' ? '#dc2626' : '#d97706',
            }}
          >
            <TypeIcon className="w-3 h-3" />
            {item.action === 'hide' ? 'OCULTO' : item.action === 'blocked' ? 'BLOQUEADO' : 'REVISAR'}
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#f5f5f4', color: '#78716c' }}>
            {CONTENT_TYPE_LABELS[item.content_type] || item.content_type}
          </span>
          {item.violation_type && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#f5f5f4', color: '#0c0a09' }}>
              {VIOLATION_LABELS[item.violation_type] || item.violation_type}
            </span>
          )}
          <ConfidenceBadge confidence={item.ai_confidence} />
        </div>

        {/* Content preview */}
        <div className="flex gap-3">
          {item.preview?.image && (
            <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0" style={{ border: '1px solid #e7e5e4' }}>
              <img src={item.preview.image} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm leading-snug line-clamp-2" style={{ color: '#0c0a09' }}>
              {item.preview?.text || '(Sin texto)'}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5">
              {item.creator_avatar && (
                <img src={item.creator_avatar} alt="" className="w-4 h-4 rounded-full" />
              )}
              <span className="text-[11px]" style={{ color: '#78716c' }}>
                {item.creator_name}
              </span>
              {item.created_at && (
                <span className="text-[10px]" style={{ color: '#78716c', opacity: 0.6 }}>
                  {new Date(item.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* AI reason (expandable) */}
        {item.ai_reason && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 mt-2 text-[11px] font-medium"
            style={{ color: '#78716c' }}
          >
            <ChevronUp className={`w-3 h-3 transition-transform ${expanded ? '' : 'rotate-180'}`} />
            Razón IA
          </button>
        )}
        {expanded && item.ai_reason && (
          <p className="text-[11px] mt-1 p-2 rounded-xl leading-relaxed" style={{ background: '#f5f5f4', color: '#78716c' }}>
            {item.ai_reason}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex border-t" style={{ borderColor: '#e7e5e4' }}>
        <button
          onClick={() => onConfirm(item.id)}
          disabled={busy}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors"
          style={{ color: '#0c0a09' }}
        >
          <CheckCircle className="w-3.5 h-3.5" /> Confirmar
        </button>
        <div className="w-px" style={{ background: '#e7e5e4' }} />
        <button
          onClick={() => onRestore(item.id)}
          disabled={busy}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors"
          style={{ color: '#78716c' }}
        >
          <RotateCcw className="w-3.5 h-3.5" /> Restaurar
        </button>
        <div className="w-px" style={{ background: '#e7e5e4' }} />
        <button
          onClick={() => onEscalate(item.id)}
          disabled={busy}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors"
          style={{ color: '#d97706' }}
        >
          <AlertTriangle className="w-3.5 h-3.5" /> Escalar
        </button>
      </div>
    </div>
  );
}

export default function AdminModerationPage() {
  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const params = {};
      if (filter !== 'all') params.action = filter;

      const [queueData, statsData] = await Promise.all([
        apiClient.get('/admin/moderation/queue', { params }),
        apiClient.get('/admin/moderation/stats'),
      ]);
      setQueue(queueData?.queue || []);
      setStats(statsData || {});
    } catch {
      setQueue([]);
      setStats({});
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const handleConfirm = async (id) => {
    setBusy(true);
    try {
      await apiClient.post(`/admin/moderation/${id}/confirm`);
      setQueue(q => q.filter(i => i.id !== id));
    } catch { /* ignore */ }
    setBusy(false);
  };

  const handleRestore = async (id) => {
    setBusy(true);
    try {
      await apiClient.post(`/admin/moderation/${id}/restore`);
      setQueue(q => q.filter(i => i.id !== id));
    } catch { /* ignore */ }
    setBusy(false);
  };

  const handleEscalate = async (id) => {
    setBusy(true);
    try {
      await apiClient.post(`/admin/moderation/${id}/escalate`);
      setQueue(q => q.filter(i => i.id !== id));
    } catch { /* ignore */ }
    setBusy(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#78716c' }} />
      </div>
    );
  }

  const totalPending = (stats?.total_hidden || 0) + (stats?.total_review || 0) + (stats?.total_blocked_products || 0);

  return (
    <div style={{ fontFamily: 'inherit', background: '#fafaf9' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <Link to="/admin" className="shrink-0">
          <ArrowLeft className="w-5 h-5" style={{ color: '#0c0a09' }} />
        </Link>
        <h1 className="text-xl font-bold" style={{ color: '#0c0a09' }}>
          Moderacion de contenido
        </h1>
        {totalPending > 0 && (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: '#dc2626', color: '#ffffff' }}
          >
            {totalPending}
          </span>
        )}
      </div>
      <p className="text-sm mb-5" style={{ color: '#78716c' }}>
        Revisa el contenido moderado por IA
      </p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2.5 mb-5">
        <StatCard icon={EyeOff} value={stats?.total_hidden || 0} label="Ocultados" color="red" />
        <StatCard icon={ShoppingBag} value={stats?.total_blocked_products || 0} label="Productos bloq." color="red" />
        <StatCard icon={Eye} value={stats?.total_review || 0} label="Para revisar" color="amber" />
      </div>

      {/* False positive rate */}
      {stats?.false_positive_rate > 0 && (
        <div
          className="flex items-center gap-2 p-3 mb-4 text-xs"
          style={{ borderRadius: '16px', background: '#f5f5f4', color: '#78716c' }}
        >
          <Shield className="w-4 h-4 shrink-0" />
          Tasa de falsos positivos: <strong style={{ color: '#0c0a09' }}>{stats.false_positive_rate}%</strong>
          <span className="ml-1">({stats?.total_restored || 0} restaurados / {(stats?.total_confirmed || 0) + (stats?.total_restored || 0)} revisados)</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap transition-colors"
            style={{
              background: filter === f.key ? '#0c0a09' : '#ffffff',
              color: filter === f.key ? '#ffffff' : '#78716c',
              border: `1px solid ${filter === f.key ? '#0c0a09' : '#e7e5e4'}`,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Queue */}
      {queue.length === 0 ? (
        <div className="text-center py-16">
          <Shield className="w-10 h-10 mx-auto mb-3" style={{ color: '#e7e5e4' }} />
          <p className="text-sm font-medium" style={{ color: '#78716c' }}>
            No hay contenido pendiente
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map(item => (
            <ModerationCard
              key={item.id}
              item={item}
              onConfirm={handleConfirm}
              onRestore={handleRestore}
              onEscalate={handleEscalate}
              busy={busy}
            />
          ))}
        </div>
      )}

      {/* Top violations */}
      {stats?.top_violation_types?.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-bold mb-3" style={{ color: '#0c0a09' }}>Violaciones frecuentes</h2>
          <div className="space-y-1.5">
            {stats.top_violation_types.map(v => (
              <div
                key={v.type}
                className="flex items-center justify-between p-2.5 text-xs"
                style={{ borderRadius: '14px', background: '#ffffff', border: '1px solid #e7e5e4' }}
              >
                <span className="font-medium" style={{ color: '#0c0a09' }}>
                  {VIOLATION_LABELS[v.type] || v.type}
                </span>
                <span className="font-bold" style={{ color: '#78716c' }}>{v.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
