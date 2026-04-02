// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Loader2, RefreshCw, Settings } from 'lucide-react';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';

const SERVICES = [
  { key: 'api', name: 'API (Railway)', description: 'Backend principal FastAPI' },
  { key: 'frontend', name: 'Frontend (Vercel)', description: 'React SPA' },
  { key: 'database', name: 'MongoDB Atlas', description: 'Base de datos principal' },
  { key: 'stripe', name: 'Stripe', description: 'Pasarela de pagos' },
  { key: 'cloudinary', name: 'Cloudinary', description: 'Almacenamiento de imágenes' },
  { key: 'sentry', name: 'Sentry', description: 'Rastreo de errores' },
];

const ENV_VARS = [
  { key: 'MONGODB_URI', masked: true, label: 'MongoDB URI' },
  { key: 'STRIPE_SECRET_KEY', masked: true, label: 'Stripe Secret Key' },
  { key: 'STRIPE_WEBHOOK_SECRET', masked: true, label: 'Stripe Webhook Secret' },
  { key: 'CLOUDINARY_URL', masked: true, label: 'Cloudinary URL' },
  { key: 'JWT_SECRET', masked: true, label: 'JWT Secret' },
  { key: 'SENTRY_DSN', masked: true, label: 'Sentry DSN' },
  { key: 'OPENAI_API_KEY', masked: true, label: 'OpenAI API Key' },
];

function SACard({ children, className = '' }) {
  return (
    <div className={`bg-[#ffffff] rounded-[14px] border border-white/[0.08] p-5 ${className}`}>
      {children}
    </div>
  );
}

function StatusDot({ status }) {
  const color =
    status === 'ok' ? '#0c0a09' :
    status === 'degraded' ? '#78716c' :
    status === 'unknown' ? '#8E8E93' :
    '#44403c';
  return (
    <div
      className="w-2 h-2 rounded-full shrink-0"
      style={{ background: color, boxShadow: `0 0 6px ${color}88` }}
    />
  );
}

export default function InfrastructurePage() {
  const [health, setHealth] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHealth = async (showToast = false) => {
    try {
      // Try dedicated health endpoints first, fall back to a simple config endpoint
      let data = null;
      const t0 = Date.now();
      data = await apiClient.get('/admin/health').catch(() => null);
      if (!data) data = await apiClient.get('/config/health').catch(() => null);
      if (!data) data = await apiClient.get('/config/countries').catch(() => null);
      const latency = Date.now() - t0;

      const apiOk = data !== null;
      const serviceHealth = {};

      serviceHealth.api = { status: apiOk ? 'ok' : 'down', latency_ms: latency };
      serviceHealth.frontend = { status: 'ok' }; // We're running, so frontend is ok

      // Use health-endpoint reported statuses when available, otherwise unknown
      serviceHealth.database = {
        status: data?.database ? (data.database === 'ok' ? 'ok' : 'down') : (apiOk ? 'unknown' : 'down'),
      };
      serviceHealth.stripe = {
        status: data?.stripe ? (data.stripe === 'ok' ? 'ok' : 'degraded') : 'unknown',
      };
      serviceHealth.cloudinary = {
        status: data?.cloudinary ? (data.cloudinary === 'ok' ? 'ok' : 'degraded') : 'unknown',
      };
      serviceHealth.sentry = {
        status: data?.sentry ? (data.sentry === 'ok' ? 'ok' : 'degraded') : 'unknown',
      };

      setHealth(serviceHealth);
      if (showToast) toast.success('Estado actualizado');
    } catch (err) {
      const unknown = {};
      SERVICES.forEach(s => { unknown[s.key] = { status: 'unknown' }; });
      setHealth(unknown);
      if (showToast) toast.error(err?.response?.data?.detail || 'Error comprobando estado');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchHealth(); }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchHealth(true);
  };

  const anyDown = Object.values(health).some(h => h?.status === 'down');
  const allOk = !anyDown && Object.values(health).some(h => h?.status === 'ok') &&
    Object.values(health).every(h => h?.status === 'ok' || h?.status === 'unknown');

  return (
    <div className="max-w-[800px] mx-auto pb-16">
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white mb-1">Infraestructura</h1>
          <p className="text-sm text-white/40">Estado de servicios y configuración del entorno</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 bg-white/[0.08] rounded-2xl text-sm text-white/60 hover:bg-white/[0.12] transition-colors flex items-center gap-1.5 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Overall status */}
      <SACard className="mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full"
            style={{
              background: allOk ? '#0c0a09' : '#78716c',
              boxShadow: `0 0 8px ${allOk ? 'rgba(12,10,9,0.5)' : '#78716c88'}`,
            }}
          />
          <span className="text-sm font-bold text-white">
            {loading ? 'Comprobando...' : anyDown ? 'Algunos servicios con incidencias' : allOk ? 'Todos los servicios operativos' : 'Estado parcialmente verificado'}
          </span>
        </div>
      </SACard>

      {/* Services grid */}
      <SACard className="mb-4">
        <h3 className="text-[15px] font-bold text-white mb-4">Estado de servicios</h3>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-white/30" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {SERVICES.map(svc => {
              const h = health[svc.key];
              return (
                <div
                  key={svc.key}
                  className="flex items-center gap-2.5 px-3 py-2.5 bg-white/[0.04] rounded-2xl"
                >
                  <StatusDot status={h?.status || 'unknown'} />
                  <div>
                    <p className="text-xs font-semibold text-white">{svc.name}</p>
                    <p className="text-[10px] text-white/30">{svc.description}</p>
                  </div>
                  {h?.latency_ms && (
                    <span className="text-[10px] text-white/30 ml-auto">{h.latency_ms}ms</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SACard>

      {/* Environment variables (masked) */}
      <SACard className="mb-4">
        <h3 className="text-[15px] font-bold text-white mb-4">Variables de entorno</h3>
        <div className="space-y-2">
          {ENV_VARS.map(v => (
            <div key={v.key} className="flex items-center justify-between py-2 border-b border-white/[0.06] last:border-0">
              <div>
                <p className="text-xs font-semibold text-white/60 font-mono">{v.key}</p>
                <p className="text-[10px] text-white/25">{v.label}</p>
              </div>
              <span className="text-xs text-white/20 font-mono">
                {v.masked ? '••••••••••••' : 'No configurada'}
              </span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-white/20 mt-3">
          Las variables de entorno se gestionan directamente en Railway/Vercel. Esta vista es solo informativa.
        </p>
      </SACard>

      {/* System info */}
      <SACard>
        <h3 className="text-[15px] font-bold text-white mb-4">Información del sistema</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Backend', value: 'FastAPI + Python 3.11' },
            { label: 'Frontend', value: 'React 19 + Tailwind' },
            { label: 'Base de datos', value: 'MongoDB Atlas' },
            { label: 'Hosting API', value: 'Railway' },
            { label: 'Hosting Web', value: 'Vercel' },
            { label: 'Pagos', value: 'Stripe Connect' },
          ].map(item => (
            <div key={item.label} className="bg-white/[0.04] rounded-2xl px-3 py-2.5">
              <p className="text-[10px] text-white/30 mb-0.5">{item.label}</p>
              <p className="text-xs font-semibold text-white">{item.value}</p>
            </div>
          ))}
        </div>
      </SACard>
    </div>
  );
}
