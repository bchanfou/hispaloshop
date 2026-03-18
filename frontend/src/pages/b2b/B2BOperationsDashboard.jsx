import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import apiClient from '@/services/api/client';
import { useAuth } from '@/context/AuthContext';

/* ── V2 Design Tokens ── */
const T = {
  black: '#0A0A0A',
  cream: '#F7F6F2',
  stone: '#8A8881',
  white: '#FFFFFF',
  border: '#E5E2DA',
  surface: '#F0EDE8',
  green: '#0c0a09',
  greenLight: '#f5f5f4',
  blue: '#57534e',
  blueLight: '#f5f5f4',
  amber: '#78716c',
  amberLight: '#fafaf9',
  red: 'var(--color-red)',
  redLight: 'var(--color-red-light)',
  fontSans: 'Inter, sans-serif',
  radiusMd: 12,
  radiusFull: 9999,
};

/* ── Status config ── */
const STATUS_MAP = {
  offer_sent:         { bg: T.blueLight,  color: T.blue,  label: 'Oferta enviada' },
  offer_accepted:     { bg: T.greenLight, color: T.green, label: 'Aceptada' },
  offer_rejected:     { bg: T.redLight,   color: T.red,   label: 'Rechazada' },
  contract_generated: { bg: T.amberLight, color: T.amber, label: 'Por firmar' },
  contract_pending:   { bg: T.amberLight, color: T.amber, label: 'Firmando' },
  contract_signed:    { bg: T.greenLight, color: T.green, label: 'Firmado' },
  payment_pending:    { bg: T.amberLight, color: T.amber, label: 'Pago pendiente' },
  payment_confirmed:  { bg: T.greenLight, color: T.green, label: 'Pagado' },
  in_transit:         { bg: T.blueLight,  color: T.blue,  label: 'En tránsito' },
  delivered:          { bg: T.greenLight, color: T.green, label: 'Entregado' },
  completed:          { bg: T.greenLight, color: T.green, label: 'Completado' },
  disputed:           { bg: T.redLight,   color: T.red,   label: 'En disputa' },
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
  const cfg = STATUS_MAP[status] || { bg: T.surface, color: T.stone, label: status };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: T.radiusFull,
        backgroundColor: cfg.bg,
        color: cfg.color,
        fontSize: 11,
        fontWeight: 600,
        fontFamily: T.fontSans,
        lineHeight: '16px',
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.label}
    </span>
  );
};

/* ── OperationCard (named export) ── */
export const OperationCard = ({ operation, userId, onNavigate, showAction = true, extra }) => {
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
    <div>
      <button
        onClick={() => onNavigate && action?.path && onNavigate(action.path)}
        style={{
          width: '100%',
          padding: '14px 16px',
          background: 'transparent',
          border: 'none',
          textAlign: 'left',
          cursor: 'pointer',
          fontFamily: T.fontSans,
        }}
      >
        <div className="flex items-start gap-3">
          {/* Thumbnail */}
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: T.radiusMd,
              backgroundColor: T.surface,
              overflow: 'hidden',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {img ? (
              <img
                src={img}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{ fontSize: 18, fontWeight: 700, color: T.stone }}>
                {(operation.product_name || 'P')[0].toUpperCase()}
              </span>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Top row */}
            <div className="flex items-center justify-between gap-2">
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: T.black,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                className="truncate"
              >
                {operation.product_name || 'Producto'}
              </span>
              <span
                style={{
                  flexShrink: 0,
                  fontSize: 12,
                  fontWeight: 500,
                  color: T.black,
                }}
              >
                {formatPrice(operation.total_price)}
              </span>
            </div>

            {/* Quantity */}
            <div style={{ fontSize: 12, color: T.stone }}>
              {operation.quantity} {operation.unit || 'uds'}
            </div>

            {/* Counterpart */}
            <div className="flex items-center gap-2 mt-1">
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: T.radiusFull,
                  backgroundColor: T.black,
                  color: T.white,
                  fontSize: 10,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {cp.initial}
              </div>
              <span
                style={{ fontSize: 12, color: T.stone }}
                className="truncate"
              >
                {cp.name}
              </span>
            </div>

            {/* Bottom row */}
            <div className="flex items-center justify-between gap-2 mt-1">
              <StatusBadge status={operation.status} />
              <span style={{ fontSize: 10, color: T.stone }}>
                {formatRelativeDate(operation.updated_at)}
              </span>
            </div>
          </div>
        </div>
      </button>

      {/* Action button */}
      {action && showAction && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 16px 10px' }}>
          <button
            onClick={() => onNavigate(action.path)}
            style={{
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: T.fontSans,
              backgroundColor: T.black,
              color: T.white,
              border: 'none',
              borderRadius: T.radiusFull,
              cursor: 'pointer',
            }}
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
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '64px 24px',
      gap: 12,
    }}
  >
    <Icon size={40} color={T.stone} strokeWidth={1.5} />
    <span style={{ fontSize: 14, color: T.stone, fontFamily: T.fontSans }}>
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

/* ── Main component ── */
const B2BOperationsDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?._id || user?.id;

  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState('active');

  const loadOperations = useCallback(async () => {
    let cancelled = false;
    setError(false);
    setLoading(true);
    try {
      const res = await apiClient.get('/b2b/operations');
      if (!cancelled) setOperations(res.data?.operations || res.data || []);
    } catch (err) {
      if (!cancelled) setError(true);
    } finally {
      if (!cancelled) setLoading(false);
    }
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    loadOperations();
  }, [loadOperations]);

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
      { label: 'En negociación', count: negotiating, bg: T.amberLight, color: T.amber },
      { label: 'En curso', count: inProgress, bg: T.greenLight, color: T.green },
      { label: 'Pendientes', count: pending, bg: T.redLight, color: T.red },
    ];
  }, [activeOps]);

  const handleNavigate = useCallback((path) => navigate(path), [navigate]);

  /* ── Render ── */
  return (
    <div
      className="fixed inset-0"
      style={{
        backgroundColor: T.cream,
        fontFamily: T.fontSans,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* TopBar */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          backgroundColor: 'rgba(247,246,242,0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 700, color: T.black }}>
          Operaciones B2B
        </span>
        {activeCount > 0 && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 20,
              height: 20,
              padding: '0 6px',
              borderRadius: T.radiusFull,
              backgroundColor: T.green,
              color: T.white,
              fontSize: 11,
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            {activeCount}
          </span>
        )}
      </div>

      {/* Tabs bar */}
      <div
        style={{
          position: 'sticky',
          top: 50,
          zIndex: 19,
          backgroundColor: T.cream,
          display: 'flex',
          borderBottom: `1px solid ${T.border}`,
          padding: '0 16px',
        }}
      >
        {TABS.map((t) => {
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1,
                padding: '10px 0',
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? T.black : T.stone,
                background: 'none',
                border: 'none',
                borderBottom: isActive ? `2px solid ${T.black}` : '2px solid transparent',
                cursor: 'pointer',
                fontFamily: T.fontSans,
                transition: 'color .15s, border-color .15s',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div className="p-4 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="animate-pulse bg-stone-100 rounded-xl h-24" />
            ))}
          </div>
        ) : error ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '64px 24px',
              gap: 12,
            }}
          >
            <span style={{ fontSize: 14, color: T.stone, fontFamily: T.fontSans }}>
              Error al cargar las operaciones
            </span>
            <button
              onClick={loadOperations}
              style={{
                padding: '8px 20px',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: T.fontSans,
                backgroundColor: T.black,
                color: T.white,
                border: 'none',
                borderRadius: T.radiusFull,
                cursor: 'pointer',
              }}
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
                <div
                  className="flex gap-3"
                  style={{
                    overflowX: 'auto',
                    padding: '14px 16px',
                    WebkitOverflowScrolling: 'touch',
                  }}
                >
                  {kpis.map((k) => (
                    <div
                      key={k.label}
                      style={{
                        minWidth: 120,
                        backgroundColor: T.white,
                        border: `1px solid ${T.border}`,
                        borderRadius: T.radiusMd,
                        padding: 12,
                        flexShrink: 0,
                      }}
                    >
                      <div style={{ fontSize: 11, color: T.stone, marginBottom: 6 }}>
                        {k.label}
                      </div>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: 22,
                          height: 22,
                          padding: '0 7px',
                          borderRadius: T.radiusFull,
                          backgroundColor: k.bg,
                          color: k.color,
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
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
                      />
                      {i < activeOps.length - 1 && (
                        <div
                          style={{
                            height: 1,
                            backgroundColor: T.border,
                            marginLeft: 72,
                          }}
                        />
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
                        extra={
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'flex-end',
                              padding: '0 16px 10px',
                            }}
                          >
                            <button
                              onClick={() => navigate(`/b2b/contract/${op._id}`)}
                              style={{
                                background: 'none',
                                border: 'none',
                                fontSize: 12,
                                color: T.stone,
                                fontFamily: T.fontSans,
                                cursor: 'pointer',
                                textDecoration: 'underline',
                                textUnderlineOffset: 2,
                              }}
                            >
                              Ver contrato
                            </button>
                          </div>
                        }
                      />
                      {i < completedOps.length - 1 && (
                        <div
                          style={{
                            height: 1,
                            backgroundColor: T.border,
                            marginLeft: 72,
                          }}
                        />
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
                        extra={
                          <div style={{ padding: '0 16px 10px' }}>
                            {op.dispute?.reason && (
                              <p
                                style={{
                                  fontSize: 12,
                                  color: T.stone,
                                  marginBottom: 8,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  paddingLeft: 56,
                                }}
                              >
                                {op.dispute.reason}
                              </p>
                            )}
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                              }}
                            >
                              <button
                                onClick={() => navigate(`/b2b/dispute/${op._id}`)}
                                style={{
                                  padding: '6px 14px',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  fontFamily: T.fontSans,
                                  backgroundColor: T.black,
                                  color: T.white,
                                  border: 'none',
                                  borderRadius: T.radiusFull,
                                  cursor: 'pointer',
                                }}
                              >
                                Ver disputa
                              </button>
                            </div>
                          </div>
                        }
                      />
                      {i < disputedOps.length - 1 && (
                        <div
                          style={{
                            height: 1,
                            backgroundColor: T.border,
                            marginLeft: 72,
                          }}
                        />
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
