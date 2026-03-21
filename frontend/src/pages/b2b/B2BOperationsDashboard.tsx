// @ts-nocheck
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import apiClient from '../../services/api/client';
import { useAuth } from '../../context/AuthContext';

const POLL_INTERVAL = 20000; // 20 seconds

/* ── Status config ── */
const STATUS_MAP = {
  offer_sent:         { bg: 'bg-stone-100',  text: 'text-stone-600',     label: 'Oferta enviada' },
  offer_accepted:     { bg: 'bg-stone-100',  text: 'text-stone-950',     label: 'Aceptada' },
  offer_rejected:     { bg: 'bg-red-50',     text: 'text-red-600',       label: 'Rechazada' },
  contract_generated: { bg: 'bg-stone-50',   text: 'text-stone-500',     label: 'Por firmar' },
  contract_pending:   { bg: 'bg-stone-50',   text: 'text-stone-500',     label: 'Firmando' },
  contract_signed:    { bg: 'bg-stone-100',  text: 'text-stone-950',     label: 'Firmado' },
  payment_pending:    { bg: 'bg-stone-50',   text: 'text-stone-500',     label: 'Pago pendiente' },
  payment_confirmed:  { bg: 'bg-stone-100',  text: 'text-stone-950',     label: 'Pagado' },
  in_transit:         { bg: 'bg-stone-100',  text: 'text-stone-600',     label: 'En tránsito' },
  delivered:          { bg: 'bg-stone-100',  text: 'text-stone-950',     label: 'Entregado' },
  completed:          { bg: 'bg-stone-100',  text: 'text-stone-950',     label: 'Completado' },
  disputed:           { bg: 'bg-red-50',     text: 'text-red-600',       label: 'En disputa' },
};

/* ── Helpers ── */
const formatPrice = (v) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v ?? 0);

const formatRelativeDate = (dateStr) => {
  if (!dateStr) return '';
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  if (days <= 7) return `Hace ${days} d`;
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};

const getCounterpart = (op, userId) => {
  const isBuyer = op.buyer_id === userId || op.buyer_id?._id === userId;
  if (isBuyer) {
    const s = op.seller || op.seller_id;
    return {
      name: s?.name || s?.company_name || `Op-${String(op._id).slice(-6)}`,
      initial: (s?.name || s?.company_name || 'S')[0].toUpperCase(),
    };
  }
  const b = op.buyer || op.buyer_id;
  return {
    name: b?.name || b?.company_name || `Op-${String(op._id).slice(-6)}`,
    initial: (b?.name || b?.company_name || 'B')[0].toUpperCase(),
  };
};

/* ── StatusBadge ── */
const StatusBadge = ({ status }) => {
  const cfg = STATUS_MAP[status] || { bg: 'bg-stone-100', text: 'text-stone-500', label: status };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold leading-4 whitespace-nowrap ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
};

/* ── OperationCard (named export) ── */
export const OperationCard = ({ operation, userId, onNavigate, showAction = true, extra, highlight = false }) => {
  const cp = getCounterpart(operation, userId);
  const img = operation.product_image || operation.product?.image;

  const isBuyer = operation.buyer_id === userId || operation.buyer_id?._id === userId;

  const getAction = () => {
    const s = operation.status;
    if (s === 'offer_sent')
      return { label: 'Ver oferta', path: `/b2b/chat/${operation.chat_id || operation._id}` };
    if (s === 'offer_accepted' || s === 'contract_generated')
      return { label: 'Ver contrato', path: `/b2b/contract/${operation._id}` };
    if (s === 'contract_signed' || s === 'payment_pending')
      return isBuyer
        ? { label: 'Ir al pago', path: `/b2b/payment/${operation._id}` }
        : { label: 'Ver seguimiento', path: `/b2b/tracking/${operation._id}` };
    if (s === 'payment_confirmed' || s === 'in_transit' || s === 'delivered')
      return { label: 'Ver seguimiento', path: `/b2b/tracking/${operation._id}` };
    return null;
  };

  const action = showAction ? getAction() : null;

  return (
    <div className={`transition-colors duration-700 ${highlight ? 'bg-stone-100' : 'bg-transparent'}`}>
      <button
        onClick={() => onNavigate && action?.path && onNavigate(action.path)}
        className="w-full px-4 py-3.5 bg-transparent border-none text-left cursor-pointer"
      >
        <div className="flex items-start gap-3">
          {/* Thumbnail */}
          <div className="w-11 h-11 rounded-xl bg-stone-100 overflow-hidden shrink-0 flex items-center justify-center">
            {img ? (
              <img src={img} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg font-bold text-stone-500">
                {(operation.product_name || operation.product?.name || 'P')[0].toUpperCase()}
              </span>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Top row */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-stone-950 truncate">
                {operation.product_name || operation.product?.name || 'Producto'}
              </span>
              <span className="shrink-0 text-xs font-medium text-stone-950">
                {formatPrice(operation.total_price)}
              </span>
            </div>

            {/* Quantity */}
            <div className="text-xs text-stone-500">
              {operation.quantity} {operation.unit || 'uds'}
            </div>

            {/* Counterpart */}
            <div className="flex items-center gap-2 mt-1">
              <div className="w-[22px] h-[22px] rounded-full bg-stone-950 text-white text-[10px] font-semibold flex items-center justify-center shrink-0">
                {cp.initial}
              </div>
              <span className="text-xs text-stone-500 truncate">
                {cp.name}
              </span>
            </div>

            {/* Bottom row */}
            <div className="flex items-center justify-between gap-2 mt-1">
              <StatusBadge status={operation.status} />
              <span className="text-[10px] text-stone-500">
                {formatRelativeDate(operation.updated_at)}
              </span>
            </div>
          </div>
        </div>
      </button>

      {/* Action button */}
      {action && showAction && (
        <div className="flex justify-end px-4 pb-2.5">
          <button
            onClick={() => onNavigate(action.path)}
            className="px-3.5 py-1.5 text-xs font-semibold bg-stone-950 text-white border-none rounded-full cursor-pointer"
          >
            {action.label}
          </button>
        </div>
      )}

      {/* Extra slot (dispute reason, completed link, etc.) */}
      {extra}
    </div>
  );
};

/* ── Empty state ── */
const EmptyState = ({ icon: Icon, message }) => (
  <div className="flex flex-col items-center justify-center py-16 px-6 gap-3">
    <Icon size={40} className="text-stone-500" strokeWidth={1.5} />
    <span className="text-sm text-stone-500">
      {message}
    </span>
  </div>
);

/* ── Tabs ── */
const TABS = [
  { key: 'active', label: 'Activas' },
  { key: 'completed', label: 'Completadas' },
  { key: 'disputes', label: 'Disputas' },
];

/* ── KPI config ── */
const KPI_STYLES = {
  negotiating: { bg: 'bg-stone-50',  text: 'text-stone-500' },
  inProgress:  { bg: 'bg-stone-100', text: 'text-stone-950' },
  pending:     { bg: 'bg-red-50',    text: 'text-red-600' },
};

/* ── Main component ── */
const B2BOperationsDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?._id || user?.id;

  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState('active');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [changedIds, setChangedIds] = useState(new Set());
  const [secondsAgo, setSecondsAgo] = useState(0);
  const prevOpsRef = useRef(null);

  const loadOperations = useCallback(async (silent = false) => {
    let cancelled = false;
    if (!silent) {
      setError(false);
      setLoading(true);
    }
    try {
      const res = await apiClient.get('/b2b/operations');
      const raw = res?.data?.operations || res?.data || res || [];
      const incoming = Array.isArray(raw) ? raw : [];
      if (!cancelled) {
        // Detect changed/new operations
        if (prevOpsRef.current) {
          const prevMap = new Map(prevOpsRef.current.map((o) => [String(o._id), o.status]));
          const changed = new Set();
          for (const op of incoming) {
            const id = String(op._id);
            const prevStatus = prevMap.get(id);
            if (prevStatus === undefined || prevStatus !== op.status) {
              changed.add(id);
            }
          }
          if (changed.size > 0) {
            setChangedIds(changed);
            setTimeout(() => setChangedIds(new Set()), 2500);
          }
        }
        prevOpsRef.current = incoming;
        setOperations(incoming);
        setLastUpdated(Date.now());
      }
    } catch (err) {
      if (!cancelled && !silent) setError(true);
    } finally {
      if (!cancelled && !silent) setLoading(false);
    }
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    loadOperations();
  }, [loadOperations]);

  // Polling every 20s (silent — no loading spinner)
  useEffect(() => {
    const id = setInterval(() => loadOperations(true), POLL_INTERVAL);
    return () => clearInterval(id);
  }, [loadOperations]);

  // Tick "seconds ago" counter
  useEffect(() => {
    if (!lastUpdated) return;
    setSecondsAgo(0);
    const id = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [lastUpdated]);

  const activeOps = useMemo(
    () => operations.filter((o) => o.status !== 'completed' && o.status !== 'disputed'),
    [operations],
  );
  const completedOps = useMemo(
    () => operations.filter((o) => o.status === 'completed'),
    [operations],
  );
  const disputedOps = useMemo(
    () => operations.filter((o) => o.status === 'disputed'),
    [operations],
  );

  const activeCount = activeOps.length;

  /* KPI counts */
  const kpis = useMemo(() => {
    const negotiating = activeOps.filter((o) =>
      ['offer_sent', 'offer_accepted', 'offer_rejected'].includes(o.status),
    ).length;
    const inProgress = activeOps.filter((o) =>
      ['contract_generated', 'contract_pending', 'contract_signed', 'payment_confirmed', 'in_transit', 'delivered'].includes(o.status),
    ).length;
    const pending = activeOps.filter((o) =>
      ['payment_pending'].includes(o.status),
    ).length;
    return [
      { label: 'En negociación', count: negotiating, ...KPI_STYLES.negotiating },
      { label: 'En curso', count: inProgress, ...KPI_STYLES.inProgress },
      { label: 'Pendientes', count: pending, ...KPI_STYLES.pending },
    ];
  }, [activeOps]);

  const handleNavigate = useCallback((path) => navigate(path), [navigate]);

  /* ── Render ── */
  return (
    <div className="fixed inset-0 bg-white flex flex-col">
      {/* TopBar */}
      <div className="sticky top-0 z-20 bg-stone-50/85 backdrop-blur-md px-4 py-3.5 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-stone-950">
            Operaciones B2B
          </span>
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-stone-950 text-white text-[11px] font-bold leading-none">
              {activeCount}
            </span>
          )}
        </div>
        {lastUpdated && (
          <span className="text-[10px] text-stone-500">
            Actualizado hace {secondsAgo < 5 ? 'un momento' : `${secondsAgo}s`}
          </span>
        )}
      </div>

      {/* Tabs bar */}
      <div className="sticky top-[50px] z-[19] bg-white flex border-b border-stone-200 px-4">
        {TABS.map((t) => {
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 text-[13px] bg-transparent border-none border-b-2 cursor-pointer transition-colors duration-150 ${
                isActive
                  ? 'font-semibold text-stone-950 border-stone-950'
                  : 'font-normal text-stone-500 border-transparent'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto max-w-[975px] mx-auto w-full">
        {loading ? (
          <div className="p-4 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="animate-pulse bg-stone-100 rounded-2xl h-24" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 gap-3">
            <span className="text-sm text-stone-500">
              Error al cargar las operaciones
            </span>
            <button
              onClick={loadOperations}
              className="px-5 py-2 text-[13px] font-semibold bg-stone-950 text-white border-none rounded-full cursor-pointer"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <>
            {/* ─── ACTIVAS ─── */}
            {tab === 'active' && (
              <>
                {/* KPI row */}
                <div className="flex gap-3 overflow-x-auto px-4 py-3.5 webkit-overflow-scrolling-touch">
                  {kpis.map((k) => (
                    <div
                      key={k.label}
                      className="min-w-[120px] bg-white border border-stone-200 rounded-xl p-3 shrink-0"
                    >
                      <div className="text-[11px] text-stone-500 mb-1.5">
                        {k.label}
                      </div>
                      <span className={`inline-flex items-center justify-center min-w-[22px] h-[22px] px-[7px] rounded-full text-xs font-bold ${k.bg} ${k.text}`}>
                        {k.count}
                      </span>
                    </div>
                  ))}
                </div>

                {activeOps.length === 0 ? (
                  <EmptyState
                    icon={Briefcase}
                    message="No tienes operaciones activas"
                  />
                ) : (
                  activeOps.map((op, i) => (
                    <React.Fragment key={op._id || i}>
                      <OperationCard
                        operation={op}
                        userId={userId}
                        onNavigate={handleNavigate}
                        highlight={changedIds.has(String(op._id))}
                      />
                      {i < activeOps.length - 1 && (
                        <div className="h-px bg-stone-200 ml-[72px]" />
                      )}
                    </React.Fragment>
                  ))
                )}
              </>
            )}

            {/* ─── COMPLETADAS ─── */}
            {tab === 'completed' && (
              <>
                {completedOps.length === 0 ? (
                  <EmptyState
                    icon={CheckCircle}
                    message="No hay operaciones completadas"
                  />
                ) : (
                  completedOps.map((op, i) => (
                    <React.Fragment key={op._id || i}>
                      <OperationCard
                        operation={op}
                        userId={userId}
                        onNavigate={handleNavigate}
                        showAction={false}
                        highlight={changedIds.has(String(op._id))}
                        extra={
                          <div className="flex justify-end px-4 pb-2.5">
                            <button
                              onClick={() => navigate(`/b2b/contract/${op._id}`)}
                              className="bg-transparent border-none text-xs text-stone-500 cursor-pointer underline underline-offset-2"
                            >
                              Ver contrato
                            </button>
                          </div>
                        }
                      />
                      {i < completedOps.length - 1 && (
                        <div className="h-px bg-stone-200 ml-[72px]" />
                      )}
                    </React.Fragment>
                  ))
                )}
              </>
            )}

            {/* ─── DISPUTAS ─── */}
            {tab === 'disputes' && (
              <>
                {disputedOps.length === 0 ? (
                  <EmptyState
                    icon={AlertTriangle}
                    message="No hay disputas abiertas"
                  />
                ) : (
                  disputedOps.map((op, i) => (
                    <React.Fragment key={op._id || i}>
                      <OperationCard
                        operation={op}
                        userId={userId}
                        onNavigate={handleNavigate}
                        showAction={false}
                        highlight={changedIds.has(String(op._id))}
                        extra={
                          <div className="px-4 pb-2.5">
                            {op.dispute?.reason && (
                              <p className="text-xs text-stone-500 mb-2 truncate pl-14">
                                {op.dispute.reason}
                              </p>
                            )}
                            <div className="flex justify-end">
                              <button
                                onClick={() => navigate(`/b2b/dispute/${op._id}`)}
                                className="px-3.5 py-1.5 text-xs font-semibold bg-stone-950 text-white border-none rounded-full cursor-pointer"
                              >
                                Ver disputa
                              </button>
                            </div>
                          </div>
                        }
                      />
                      {i < disputedOps.length - 1 && (
                        <div className="h-px bg-stone-200 ml-[72px]" />
                      )}
                    </React.Fragment>
                  ))
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default B2BOperationsDashboard;
