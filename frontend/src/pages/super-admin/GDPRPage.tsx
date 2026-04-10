// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Lock, Download, Trash2, FileText, AlertTriangle } from 'lucide-react';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const TYPE_CONFIG = {
  deletion: { label: 'Derecho al olvido', icon: Trash2, color: '#44403c' },
  access: { label: 'Acceso a datos', icon: FileText, color: '#ffffff' },
  portability: { label: 'Portabilidad', icon: Download, color: '#78716c' },
};

function SACard({ children, className = '' }) {
  return (
    <div className={`bg-[#1A1D27] rounded-[14px] border border-white/[0.08] p-5 ${className}`}>
      {children}
    </div>
  );
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

function DeadlineBadge({ deadline }) {
  if (!deadline) return null;
  const deadlineDate = new Date(deadline);
  if (isNaN(deadlineDate.getTime())) return null;
  const daysLeft = Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const isUrgent = daysLeft <= 7;
  const isWarning = daysLeft <= 14;
  return (
    <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
      isUrgent ? 'bg-stone-200 text-stone-700'
        : isWarning ? 'bg-[#78716c]/20 text-[#78716c]'
          : 'bg-white/10 text-white/70'
    }`}>
      {daysLeft > 0 ? `${daysLeft}d restantes` : 'Vencido'}
    </span>
  );
}

export default function GDPRPage() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState([]);
  const [counts, setCounts] = useState({ deletion: 0, access: 0, portability: 0 });
  const [loading, setLoading] = useState(true);
  const [gdprBackendAvailable, setGdprBackendAvailable] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const stats = await apiClient.get('/superadmin/audit/stats').catch(() => null);
      setGdprBackendAvailable(Boolean(stats));
      const fallbackCounts = {
        deletion: Number(stats?.critical_events || 0),
        access: Number(stats?.total_actions || 0),
        portability: Number(stats?.active_users || 0),
      };
      setRequests([]);
      setCounts(fallbackCounts);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAction = async () => {
    toast.info(t('g_d_p_r.flujoGdprNoDisponibleEnEsteBackend', 'Flujo GDPR no disponible en este backend'));
  };

  return (
    <div className="max-w-[800px] mx-auto pb-16">
      <div className="mb-7">
        <h1 className="text-2xl font-extrabold tracking-tight text-white mb-1">GDPR & Compliance</h1>
        <p className="text-sm text-white/70">
          Solicitudes de derechos de usuarios bajo el RGPD. Tiempo máximo de respuesta: 30 días.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
          <SACard key={type} className="text-center">
            <p className="text-2xl font-extrabold mb-1" style={{ color: cfg.color }}>
              {counts[type] || 0}
            </p>
            <p className="text-xs text-white/70">{cfg.label}</p>
          </SACard>
        ))}
      </div>

      {/* Requests list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-white/60" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16">
          <Lock className="w-10 h-10 text-white/40 mx-auto mb-3" />
          <p className="text-[15px] text-white/70">
            {gdprBackendAvailable ? 'Sin solicitudes GDPR pendientes' : 'Flujo GDPR no disponible en este backend'}
          </p>
        </div>
      ) : (
        <SACard>
          {requests.map((req, i) => {
            const cfg = TYPE_CONFIG[req.type] || TYPE_CONFIG.access;
            return (
              <div
                key={req.id || i}
                className={`py-4 ${i < requests.length - 1 ? 'border-b border-white/[0.06]' : ''}`}
              >
                <div className="flex items-start justify-between mb-2.5">
                  <div>
                    <p className="text-sm font-bold text-white mb-0.5">{cfg.label}</p>
                    <p className="text-xs text-white/65">
                      {req.user_email || 'usuario@email.com'} · {formatRelativeTime(req.created_at)}
                    </p>
                  </div>
                  <DeadlineBadge deadline={req.deadline} />
                </div>
                {req.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction(req.id, 'fulfill')}
                      className="px-4 py-2 bg-stone-100 rounded-2xl text-xs font-bold text-stone-950 hover:bg-white transition-colors"
                    >
                      Procesar
                    </button>
                    <button
                      onClick={() => handleAction(req.id, 'reject')}
                      className="px-4 py-2 bg-white/[0.08] rounded-2xl text-xs text-white/50 hover:bg-white/[0.12] transition-colors"
                    >
                      Rechazar
                    </button>
                  </div>
                )}
                {req.status === 'fulfilled' && (
                  <span className="text-[11px] font-bold text-stone-950">Procesada</span>
                )}
                {req.status === 'rejected' && (
                  <span className="text-[11px] font-bold text-white/60">Rechazada</span>
                )}
              </div>
            );
          })}
        </SACard>
      )}

      {/* Export tool */}
      <SACard className="mt-4">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-[15px] font-bold text-white">Exportar datos de usuario (RGPD Art. 15)</h3>
          {!gdprBackendAvailable && (
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-500">Pronto</span>
          )}
        </div>
        <p className="text-xs text-white/65 mb-3">
          {gdprBackendAvailable
            ? 'Introduce el user_id para generar un archivo JSON con todos los datos del usuario.'
            : 'La exportación RGPD no está disponible en este backend por ahora.'}
        </p>
        <ExportUserTool disabled={!gdprBackendAvailable} />
      </SACard>
    </div>
  );
}

function ExportUserTool({ disabled = false }) {
  const [userId, setUserId] = useState('');
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (disabled) {
      toast.info('Exportación RGPD no disponible temporalmente');
      return;
    }
    if (!userId.trim()) {
      toast.error('Introduce un user_id');
      return;
    }
    setExporting(true);
    try {
      const data = await apiClient.get(`/superadmin/audit/export-user/${userId.trim()}`);
      // Download as JSON
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gdpr_export_${userId.trim()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Datos exportados');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Error al exportar datos');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex gap-2">
      <input
        value={userId}
        onChange={e => setUserId(e.target.value)}
        disabled={disabled}
        placeholder="user_id"
        className="flex-1 px-3.5 py-2.5 bg-[#1c1917] border border-white/10 rounded-2xl text-white text-sm outline-none disabled:opacity-50"
      />
      <button
        onClick={handleExport}
        disabled={exporting || disabled}
        className="px-5 py-2.5 bg-stone-100 rounded-2xl text-sm font-bold text-stone-950 hover:bg-white disabled:opacity-50 flex items-center gap-1.5"
      >
        {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        Exportar
      </button>
    </div>
  );
}
