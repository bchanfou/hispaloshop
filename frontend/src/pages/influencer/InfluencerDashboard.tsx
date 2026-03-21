// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api/client';
import { Copy, Check, ExternalLink, DollarSign, ShoppingBag, TrendingUp, CreditCard, Home, Percent, Users, AlertCircle, Sparkles, Loader2, Mail, BarChart3, Wallet, ArrowUpRight, Clock, CheckCircle2, HelpCircle, Building2, X, Handshake, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import LanguageSwitcher from '../../components/LanguageSwitcher';

import InternalChat from '../../components/InternalChat';
import InfluencerAnalytics from '../../components/InfluencerAnalytics';
import TierProgress from '../../components/TierProgress';
import { useTranslation } from 'react-i18next';
import {
  useInfluencerDiscountCodes,
  useInfluencerEmailVerification,
  useInfluencerProfile,
  useInfluencerStripeStatus,
  useInfluencerWithdrawal,
} from '../../features/influencer/hooks';
import { asNumber } from '../../utils/safe';
import { useLocale } from '../../context/LocaleContext';

const MINIMUM_WITHDRAWAL = 20; // €20 minimum (synced with WithdrawalPage)

// Withdrawal Component
function WithdrawalCard({ availableToWithdraw, stripeConnected, onWithdrawSuccess }) {
  const [showHistory, setShowHistory] = useState(false);
  const { withdrawals, withdrawing, requestWithdrawal, refetchWithdrawals } = useInfluencerWithdrawal();
  const { convertAndFormatPrice } = useLocale();

  const handleWithdraw = useCallback(async () => {
    if (availableToWithdraw < MINIMUM_WITHDRAWAL) {
      toast.error(`El mínimo de retiro es ${convertAndFormatPrice(MINIMUM_WITHDRAWAL)}. Tienes ${convertAndFormatPrice(availableToWithdraw)} disponibles.`);
      return;
    }

    try {
      const res = await requestWithdrawal();
      toast.success(res?.message || 'Retiro solicitado');
      await refetchWithdrawals();
      if (onWithdrawSuccess) onWithdrawSuccess();
    } catch (error) {
      toast.error(error?.message || 'Error al procesar el retiro');
    }
  }, [availableToWithdraw, convertAndFormatPrice, requestWithdrawal, refetchWithdrawals, onWithdrawSuccess]);

  const canWithdraw = stripeConnected && availableToWithdraw >= MINIMUM_WITHDRAWAL;

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e7e5e4', borderRadius: '16px' }}>
      <div className="px-6 pt-6 pb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: '#0c0a09' }}>
          <Wallet className="w-5 h-5" style={{ color: '#78716c' }} />
          Retirar Comisiones
        </h3>
      </div>
      <div className="px-6 pb-6">
        <div className="space-y-4">
          {/* Available to withdraw */}
          <div className="text-center p-4" style={{ background: '#ffffff', border: '1px solid #e7e5e4', borderRadius: '12px' }}>
            <p className="text-sm mb-1" style={{ color: '#78716c' }}>Disponible para retirar</p>
            <p className="text-3xl font-bold" style={{ color: '#0c0a09' }}>{convertAndFormatPrice(Number(availableToWithdraw || 0))}</p>
            <p className="text-xs mt-1" style={{ color: '#78716c' }}>Mínimo: {convertAndFormatPrice(MINIMUM_WITHDRAWAL)}</p>
          </div>

          {/* Withdraw button */}
          {!stripeConnected ? (
            <div className="text-center p-3" style={{ background: '#f5f5f4', borderRadius: '12px', border: '1px solid #e7e5e4' }}>
              <p className="text-sm" style={{ color: '#78716c' }}>
                Conecta tu cuenta de Stripe para poder retirar tus comisiones
              </p>
            </div>
          ) : availableToWithdraw < MINIMUM_WITHDRAWAL ? (
            <div className="text-center p-3" style={{ background: '#f5f5f4', borderRadius: '12px', border: '1px solid #e7e5e4' }}>
              <p className="text-sm" style={{ color: '#78716c' }}>
                Necesitas {convertAndFormatPrice(Math.max(0, MINIMUM_WITHDRAWAL - Number(availableToWithdraw || 0)))} más para alcanzar el mínimo de retiro
              </p>
            </div>
          ) : (
            <button
              onClick={handleWithdraw}
              disabled={withdrawing || !canWithdraw}
              className="w-full px-4 py-2 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: '#0c0a09', color: '#fff', borderRadius: '12px' }}
            >
              {withdrawing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <ArrowUpRight className="w-4 h-4" />
                  Retirar {convertAndFormatPrice(Number(availableToWithdraw || 0))}
                </>
              )}
            </button>
          )}

          {/* Toggle history */}
          {withdrawals.length > 0 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full text-sm py-2 transition-colors"
              style={{ color: '#78716c' }}
            >
              {showHistory ? 'Ocultar historial' : `Ver historial (${withdrawals.length} retiros)`}
            </button>
          )}

          {/* Withdrawal history */}
          {showHistory && withdrawals.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {withdrawals.slice(0, 5).map((wd) => (
                <div key={wd.withdrawal_id} className="flex items-center justify-between p-2 rounded" style={{ background: '#ffffff', border: '1px solid #e7e5e4' }}>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" style={{ color: '#0c0a09' }} />
                    <span className="text-sm font-medium" style={{ color: '#0c0a09' }}>{convertAndFormatPrice(Number(wd.amount || 0))}</span>
                  </div>
                  <span className="text-xs" style={{ color: '#78716c' }}>
                    {new Date(wd.created_at).toLocaleDateString('es-ES')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Email Verification Component
function EmailVerificationBanner({ user, onVerified }) {
  const [code, setCode] = useState('');
  const { verifying, resending, verifyEmailCode, resendVerificationCode } = useInfluencerEmailVerification();

  const handleVerify = async () => {
    if (!code || code.length !== 6) {
      toast.error('Introduce el código de 6 dígitos');
      return;
    }
    try {
      await verifyEmailCode(code);
      toast.success('¡Email verificado!');
      onVerified();
    } catch (error) {
      toast.error(error?.message || 'Código inválido');
    }
  };

  const handleResend = async () => {
    try {
      await resendVerificationCode();
      toast.success('Código enviado a tu email');
    } catch (error) {
      toast.error(error?.message || 'Error al enviar código');
    }
  };

  return (
    <div className="p-6 mb-6" style={{ background: '#f5f5f4', border: '1px solid #e7e5e4', borderRadius: '12px' }}>
      <div className="flex items-start gap-4">
        <Mail className="w-6 h-6 flex-shrink-0 mt-1" style={{ color: '#78716c' }} />
        <div className="flex-1">
          <h3 className="font-semibold mb-2" style={{ color: '#0c0a09' }}>Verifica tu email</h3>
          <p className="text-sm mb-4" style={{ color: '#78716c' }}>
            Hemos enviado un código de 6 dígitos a <strong>{user?.email}</strong>.
            Introdúcelo aquí para activar tu cuenta.
          </p>
          <div className="flex items-center gap-3">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-32 px-3 py-2 text-center text-xl tracking-widest font-mono"
              style={{ border: '1px solid #e7e5e4', borderRadius: '12px', color: '#0c0a09', background: '#ffffff', outline: 'none' }}
              maxLength={6}
            />
            <button onClick={handleVerify} disabled={verifying || code.length !== 6} className="px-4 py-2 transition-colors disabled:opacity-50" style={{ background: '#0c0a09', color: '#fff', borderRadius: '12px' }}>
              {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verificar'}
            </button>
            <button onClick={handleResend} disabled={resending} className="px-4 py-2 transition-colors" style={{ border: '1px solid #e7e5e4', color: '#78716c', borderRadius: '12px', background: '#ffffff' }}>
              {resending ? 'Enviando...' : 'Reenviar código'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Create Code Component
function CreateCodeCard({ onCodeCreated }) {
  const [code, setCode] = useState('');
  const { creatingCode, createDiscountCode } = useInfluencerDiscountCodes();

  const handleCreate = async () => {
    if (!code || code.length < 3) {
      toast.error('El código debe tener al menos 3 caracteres');
      return;
    }
    try {
      const res = await createDiscountCode(code);
      toast.success(res?.message || 'Código creado');
      onCodeCreated(res?.code || code);
    } catch (error) {
      toast.error(error?.message || 'Error al crear código');
    }
  };

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e7e5e4', borderRadius: '16px' }}>
      <div className="px-6 pt-6 pb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: '#0c0a09' }}>
          <Sparkles className="w-5 h-5" style={{ color: '#78716c' }} />
          Crea tu código de descuento
        </h3>
      </div>
      <div className="px-6 pb-6">
        <p className="text-sm mb-4" style={{ color: '#78716c' }}>
          Elige un código personalizado que tus seguidores usarán para obtener el 10% de descuento.
        </p>
        <div className="flex items-center gap-3">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20))}
            placeholder="Ej: MARIA10"
            className="flex-1 px-3 py-2 uppercase text-lg font-mono"
            style={{ border: '1px solid #e7e5e4', borderRadius: '12px', color: '#0c0a09', background: '#ffffff', outline: 'none' }}
            maxLength={20}
          />
          <button onClick={handleCreate} disabled={creatingCode || code.length < 3} className="px-4 py-2 transition-colors disabled:opacity-50" style={{ background: '#0c0a09', color: '#fff', borderRadius: '12px' }}>
            {creatingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear código'}
          </button>
        </div>
        <p className="text-xs mt-2" style={{ color: '#78716c' }}>
          Solo letras y números, entre 3-20 caracteres
        </p>
      </div>
    </div>
  );
}

export default function InfluencerDashboard() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { t } = useTranslation();
  const { convertAndFormatPrice } = useLocale();
  const { dashboard, loading, refetchDashboard } = useInfluencerProfile();
  const { stripeStatus, connectingStripe, connectStripe: connectStripeAccount } = useInfluencerStripeStatus();
  const [copied, setCopied] = useState(false);
  const [emailVerified, setEmailVerified] = useState(user?.email_verified);
  const [productPerformance, setProductPerformance] = useState([]);
  const [fiscalStatus, setFiscalStatus] = useState(null);
  const [withholdingSummary, setWithholdingSummary] = useState(null);
  const [payoutHistory, setPayoutHistory] = useState([]);
  const [showIrpfModal, setShowIrpfModal] = useState(false);
  const [collabs, setCollabs] = useState([]);

  useEffect(() => {
    if (user) {
      setEmailVerified(user.email_verified);
    }
  }, [user]);

  useEffect(() => {
    let active = true;
    const logFetchErr = () => () => {
      // Sentry captures fetch errors automatically
    };
    apiClient.get('/collaborations').then(d => {
      if (active) setCollabs(d?.collaborations || []);
    }).catch(logFetchErr('collaborations'));
    apiClient
      .get('/intelligence/influencer-performance')
      .then((data) => {
        if (active) setProductPerformance(data?.items || []);
      })
      .catch((err) => {
        if (active) setProductPerformance([]);
        logFetchErr('performance')(err);
      });

    // Fetch fiscal data
    apiClient.get('/influencer/fiscal/status').then(d => {
      if (active) setFiscalStatus(d);
    }).catch(logFetchErr('fiscal-status'));
    apiClient.get('/influencer/fiscal/withholding-summary').then(d => {
      if (active) setWithholdingSummary(d);
    }).catch(logFetchErr('withholding'));
    apiClient.get('/influencer/payouts').then(d => {
      if (active) setPayoutHistory(d?.payouts || d || []);
    }).catch(logFetchErr('payouts'));

    return () => {
      active = false;
    };
  }, []);

  const handleEmailVerified = useCallback(() => {
    setEmailVerified(true);
    if (refreshUser) refreshUser();
  }, [refreshUser]);

  const handleCodeCreated = useCallback((_newCode) => {
    refetchDashboard();
  }, [refetchDashboard]);

  const scrollToWithdrawals = useCallback(() => {
    const withdrawalSection = document.getElementById('withdrawal-card-section');
    withdrawalSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const copyDiscountCode = useCallback(() => {
    if (dashboard?.discount_code) {
      navigator.clipboard.writeText(dashboard.discount_code);
      setCopied(true);
      toast.success(t('influencer.codeCopied', '¡Código copiado!'));
      setTimeout(() => setCopied(false), 2000);
    }
  }, [dashboard?.discount_code, t]);

  const connectStripe = useCallback(async () => {
    try {
      const res = await connectStripeAccount();
      if (res?.url) {
        window.location.href = res.url;
      }
    } catch (err) {
      toast.error(t('influencer.stripeError', 'Error al conectar con Stripe'));
    }
  }, [connectStripeAccount, t]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#fafaf9' }}>
        <div className="animate-spin rounded-full h-8 w-8" style={{ borderBottom: '2px solid #0c0a09' }}></div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#fafaf9' }}>
        <div className="max-w-md" style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e7e5e4' }}>
          <div className="p-8 text-center">
            <h2 className="text-xl font-medium mb-4" style={{ color: '#0c0a09' }}>{t('influencer.notInfluencer')}</h2>
            <p style={{ color: '#78716c' }}>
              {t('influencer.notInfluencerDesc')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const tierPercent = Number(dashboard.commission_value || ((dashboard.commission_rate || 0) * 100) || 0);
  const influencerExampleAmount = Math.round((18 * tierPercent) / 100 * 100) / 100;

  return (
    <div className="min-h-screen" style={{ background: '#fafaf9', fontFamily: 'inherit' }}>
      <div className="max-w-6xl mx-auto px-4 py-4 md:py-8">
        {/* Header — H1 with influencer name at top */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-3xl font-semibold tracking-tight" style={{ color: '#0c0a09' }}>
            {dashboard.full_name || t('influencer.dashboard')}
          </h1>
          <p className="mt-1 text-sm md:text-base" style={{ color: '#78716c' }}>
            {dashboard.current_tier && <span className="font-semibold" style={{ color: '#0c0a09' }}>{dashboard.current_tier} · {tierPercent}%</span>}
            {dashboard.current_tier && ' · '}{t('influencer.dashboard')}
          </p>
        </div>

        {/* Hero Balance Card */}
        <div className="mb-6 bg-stone-950 text-white rounded-2xl p-5">
          <p className="text-xs text-white/60 mb-1">Balance disponible</p>
          <p className="text-3xl font-bold">{convertAndFormatPrice(asNumber(dashboard.available_balance))}</p>
          {dashboard.payment_schedule?.available_soon > 0 && (
            <p className="text-xs text-white/40 mt-1">
              +{convertAndFormatPrice(asNumber(dashboard.payment_schedule.available_soon))} próximamente
            </p>
          )}
          {dashboard.payment_schedule?.pending_amount > 0 && (
            <p className="text-[10px] text-white/30 mt-0.5" title="Las comisiones están disponibles 15 días después de la venta">
              {convertAndFormatPrice(asNumber(dashboard.payment_schedule.pending_amount))} en retención (15 días)
            </p>
          )}
          {(dashboard.available_balance || 0) >= MINIMUM_WITHDRAWAL && (
            <button
              onClick={() => navigate('/influencer/withdrawal')}
              className="mt-3 text-xs bg-white text-stone-950 px-4 py-1.5 rounded-full font-medium"
            >
              Retirar fondos
            </button>
          )}
        </div>

        {/* Compact Tier Progress */}
        {dashboard.current_tier && (
          <div className="mb-6 p-4 rounded-2xl" style={{ background: '#ffffff', border: '1px solid #e7e5e4' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#78716c' }}>
                Nivel actual: <span style={{ color: '#0c0a09' }}>{dashboard.current_tier}</span>
              </p>
              {tierPercent > 0 && (
                <p className="text-xs font-bold" style={{ color: '#0c0a09' }}>{tierPercent}% comisión</p>
              )}
            </div>
            {dashboard.tier_progress !== undefined && (
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#f5f5f4' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, dashboard.tier_progress || 0)}%`, background: '#0c0a09' }}
                />
              </div>
            )}
          </div>
        )}

        {/* Email Verification Banner */}
        {!emailVerified && (
          <EmailVerificationBanner user={user} onVerified={handleEmailVerified} />
        )}

        {/* Status Banner - Pending Approval */}
        {dashboard.status === 'pending' && (
          <div className="mb-4 p-4 md:mb-6 md:p-6" style={{ borderRadius: '16px', border: '1px solid #e7e5e4', background: '#f5f5f4' }}>
            <div className="flex items-start gap-3 md:gap-4">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 md:h-6 md:w-6" style={{ color: '#78716c' }} />
              <div>
                <h3 className="mb-1 text-sm font-semibold md:mb-2 md:text-base" style={{ color: '#0c0a09' }}>{t('influencer.pendingApproval')}</h3>
                <p className="text-xs md:text-sm" style={{ color: '#78716c' }}>
                  {t('influencer.pendingApprovalDesc')}
                </p>
                <p className="mt-2 text-xs md:text-sm" style={{ color: '#78716c' }}>
                  <strong>{t('influencer.estimatedTime')}</strong>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Status Banner - Other statuses */}
        {dashboard.status !== 'active' && dashboard.status !== 'pending' && (
          <div className="mb-4 p-3 md:mb-6 md:p-4" style={{ borderRadius: '16px', border: '1px solid #e7e5e4', background: '#f5f5f4' }}>
            <p className="text-sm" style={{ color: '#78716c' }}>
              {t('influencer.accountStatus')} <strong>{dashboard.status}</strong>.
              {dashboard.status === 'suspended' && ` ${t('influencer.accountSuspended')}`}
            </p>
          </div>
        )}

        {/* === KPI CARDS ROW === */}
        {dashboard.stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              <p className="text-xs text-stone-500 mb-1">Clics 30d</p>
              <p className="text-xl font-bold text-stone-950">{dashboard.stats.clicks_30d || 0}</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              <p className="text-xs text-stone-500 mb-1">Ventas 30d</p>
              <p className="text-xl font-bold text-stone-950">{dashboard.stats.sales_30d || 0}</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              <p className="text-xs text-stone-500 mb-1">Conversión</p>
              <p className="text-xl font-bold text-stone-950">
                {(dashboard.stats.clicks_30d || 0) > 0
                  ? `${((dashboard.stats.sales_30d || 0) / dashboard.stats.clicks_30d * 100).toFixed(1)}%`
                  : '—'}
              </p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              <p className="text-xs text-stone-500 mb-1">Comisiones 30d</p>
              <p className="text-xl font-bold text-stone-950">{convertAndFormatPrice(Number(dashboard.stats.earned_30d || 0))}</p>
            </div>
          </div>
        )}

        {/* Product Performance */}
        <div className="mb-6" style={{ background: '#ffffff', border: '1px solid #e7e5e4', borderRadius: '16px' }}>
          <div className="px-6 pt-6 pb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: '#0c0a09' }}>
              <BarChart3 className="h-5 w-5" style={{ color: '#78716c' }} />
              Productos que mejor funcionan en tu contenido
            </h3>
          </div>
          <div className="px-6 pb-6 space-y-3">
            {productPerformance.length > 0 ? productPerformance.map((item) => (
              <div key={`${item.content_type}-${item.content_id}`} className="flex items-center justify-between px-4 py-3" style={{ borderRadius: '16px', border: '1px solid #e7e5e4', background: '#f5f5f4' }}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium" style={{ color: '#0c0a09' }}>{item.title || item.content_id}</p>
                  <p className="mt-1 text-xs capitalize" style={{ color: '#78716c' }}>{item.content_type}</p>
                </div>
                <div className="grid grid-cols-3 gap-4 text-right text-xs" style={{ color: '#78716c' }}>
                  <div><p className="font-semibold" style={{ color: '#0c0a09' }}>{item.views}</p><p>Views</p></div>
                  <div><p className="font-semibold" style={{ color: '#0c0a09' }}>{item.clicks}</p><p>Clicks</p></div>
                  <div><p className="font-semibold" style={{ color: '#0c0a09' }}>{item.sales}</p><p>Sales</p></div>
                </div>
              </div>
            )) : <p className="text-sm" style={{ color: '#78716c' }}>Publica contenido con productos vinculados para empezar a ver rendimiento.</p>}
          </div>
        </div>

        {/* Create Code Card - Only show if active and no code yet */}
        {dashboard.status === 'active' && !dashboard.discount_code && (
          <div className="mb-4 md:mb-6">
            <CreateCodeCard onCodeCreated={handleCodeCreated} />
          </div>
        )}

        {/* Tier Progress */}
        <TierProgress />

        {/* === CODE HERO - pending === */}
        {dashboard.discount_code && dashboard.discount_code_approval_status === 'pending' && (
          <div className="mb-6 p-6 text-center" style={{ borderRadius: '16px', border: '1px solid #e7e5e4', background: '#f5f5f4' }} data-testid="code-pending">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest" style={{ background: '#ffffff', color: '#78716c' }}>
                <span className="h-2 w-2 rounded-full animate-pulse" style={{ background: '#0c0a09' }} />
                Pendiente de aprobación
              </span>
            </div>
            <p className="mb-3 text-3xl font-semibold tracking-tight md:text-4xl" style={{ color: '#0c0a09' }} data-testid="influencer-code-pending">
              {dashboard.discount_code}
            </p>
            <p className="text-sm" style={{ color: '#78716c' }}>
              Tu código está siendo revisado por el equipo de Hispaloshop. Lo aprobaremos en menos de 24h.
            </p>
          </div>
        )}

        {/* === CODE HERO - active === */}
        {dashboard.discount_code && dashboard.discount_code_active && (
          <div className="mb-6 p-6 text-center" style={{ borderRadius: '16px', border: '1px solid #e7e5e4', background: '#ffffff' }} data-testid="code-hero">
            <p className="mb-2 text-xs uppercase tracking-widest" style={{ color: '#78716c' }}>Tu código</p>
            <p className="mb-4 text-4xl font-semibold tracking-tight md:text-5xl" style={{ color: '#0c0a09', fontFamily: 'monospace', fontSize: '14px' }} data-testid="influencer-code">
              <span style={{ fontSize: '2.25rem' }}>{dashboard.discount_code}</span>
            </p>
            <div className="flex justify-center gap-3 mb-4">
              <button
                onClick={() => { navigator.clipboard.writeText(dashboard.discount_code); toast.success('Código copiado'); }}
                className="rounded-full px-6 py-2 flex items-center gap-2 transition-colors"
                style={{ background: '#0c0a09', color: '#fff' }}
                data-testid="copy-code-btn"
              >
                <Copy className="w-4 h-4" /> Copiar
              </button>
              <button
                onClick={() => { if (navigator.share) navigator.share({ title: 'Mi código Hispaloshop', text: `Usa mi código ${dashboard.discount_code} para descuento en hispaloshop.com` }); else { navigator.clipboard.writeText(`Usa mi código ${dashboard.discount_code} en hispaloshop.com`); toast.success('Link copiado'); }}}
                className="rounded-full px-6 py-2 transition-colors"
                style={{ border: '1px solid #e7e5e4', color: '#78716c', background: '#ffffff' }}
              >
                Compartir
              </button>
            </div>
            <p className="text-xs" style={{ color: '#78716c' }}>Tu comunidad ahorra {dashboard.discount_value || 10}% con este código</p>
          </div>
        )}

        {/* === Stats grid 3 cols === */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="p-4 text-center" style={{ background: '#ffffff', border: '1px solid #e7e5e4', borderRadius: '16px' }}>
            <p className="text-2xl font-bold" style={{ color: '#0c0a09' }}>{convertAndFormatPrice(asNumber(dashboard.total_sales_generated))}</p>
            <p className="text-xs mt-1" style={{ color: '#78716c' }}>{t('influencer.totalSales')}</p>
          </div>
          <div className="p-4 text-center" style={{ background: '#ffffff', border: '1px solid #e7e5e4', borderRadius: '16px' }}>
            <p className="text-2xl font-bold" style={{ color: '#0c0a09' }}>{convertAndFormatPrice(asNumber(dashboard.total_commission_earned))}</p>
            <p className="text-xs mt-1" style={{ color: '#78716c' }}>Comisión mes</p>
          </div>
          <div className="p-4 text-center" style={{ background: '#ffffff', border: '1px solid #e7e5e4', borderRadius: '16px' }}>
            <p className="text-2xl font-bold" style={{ color: '#0c0a09' }}>{`${tierPercent}%`}</p>
            <p className="text-xs mt-1" style={{ color: '#78716c' }}>Conversión</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Discount Code Card */}
          <div className="lg:col-span-1" style={{ background: '#ffffff', border: '1px solid #e7e5e4', borderRadius: '16px' }}>
            <div className="px-6 pt-6 pb-4">
              <h3 className="text-lg font-semibold" style={{ color: '#0c0a09' }}>{t('influencer.discountCode')}</h3>
            </div>
            <div className="px-6 pb-6">
              {dashboard.discount_code ? (
                <>
                  <div className="p-4 text-center mb-4" style={{ background: '#f5f5f4', border: '1px dashed #e7e5e4', borderRadius: '12px' }}>
                    <p className="text-3xl font-bold tracking-wider" style={{ color: '#0c0a09', fontFamily: 'monospace', fontSize: '14px' }}>
                      <span style={{ fontSize: '1.875rem' }}>{dashboard.discount_code}</span>
                    </p>
                  </div>
                  <button
                    onClick={copyDiscountCode}
                    className="w-full px-4 py-2 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ background: '#0c0a09', color: '#fff', borderRadius: '12px' }}
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" />
                        {t('common.copied')}
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        {t('influencer.copyCode')}
                      </>
                    )}
                  </button>
                  <p className="text-sm text-center mt-3" style={{ color: '#78716c' }}>
                    {t('influencer.shareCode')}
                  </p>
                </>
              ) : dashboard.status === 'active' ? (
                <div className="text-center py-4">
                  <p className="text-sm" style={{ color: '#78716c' }}>
                    {t('influencer.useFormAbove')}
                  </p>
                </div>
              ) : (
                <div className="text-center py-4">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2" style={{ color: '#78716c' }} />
                  <p className="text-sm" style={{ color: '#78716c' }}>
                    {t('influencer.canCreateWhenApproved')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Stripe Connect Card */}
          <div className="lg:col-span-1" style={{ background: '#ffffff', border: '1px solid #e7e5e4', borderRadius: '16px' }}>
            <div className="px-6 pt-6 pb-4">
              <h3 className="text-lg font-semibold" style={{ color: '#0c0a09' }}>{t('influencer.paymentSetup')}</h3>
            </div>
            <div className="px-6 pb-6">
              {stripeStatus?.connected && stripeStatus?.onboarding_complete ? (
                <div className="text-center">
                  <div className="h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#f5f5f4' }}>
                    <Check className="h-8 w-8" style={{ color: '#0c0a09' }} />
                  </div>
                  <p className="font-medium" style={{ color: '#0c0a09' }}>{t('influencer.stripeConnected')}</p>
                  <p className="text-sm mt-2" style={{ color: '#78716c' }}>
                    {t('influencer.shareCode')}
                  </p>
                  <div className="mt-4 text-sm flex items-center gap-2" style={{ color: '#78716c' }}>
                    <span>{t('influencer.payoutsEnabled')}:</span>
                    {stripeStatus.payouts_enabled ? (
                      <CheckCircle2 className="w-4 h-4" style={{ color: '#0c0a09' }} />
                    ) : (
                      <AlertCircle className="w-4 h-4" style={{ color: '#78716c' }} />
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <p className="mb-4" style={{ color: '#78716c' }}>
                    {t('influencer.connectStripe')}
                  </p>
                  <button
                    onClick={connectStripe}
                    disabled={connectingStripe}
                    className="w-full px-4 py-2 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ background: '#0c0a09', color: '#fff', borderRadius: '12px' }}
                  >
                    {connectingStripe ? (
                      t('common.loading')
                    ) : (
                      <>
                        <ExternalLink className="h-4 w-4" />
                        {t('influencer.connectStripe')}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Commission Summary */}
          <div className="lg:col-span-1" style={{ background: '#ffffff', border: '1px solid #e7e5e4', borderRadius: '16px' }}>
            <div className="px-6 pt-6 pb-4">
              <h3 className="text-lg font-semibold" style={{ color: '#0c0a09' }}>{t('influencer.commissionSummary')}</h3>
            </div>
            <div className="px-6 pb-6">
              <div className="space-y-4">
                {/* How commission works */}
                <div className="p-3 mb-4" style={{ background: '#f5f5f4', border: '1px solid #e7e5e4', borderRadius: '12px' }}>
                  <p className="text-xs font-medium mb-2" style={{ color: '#78716c' }}>Info · {t('influencer.howCommissionWorks')}</p>
                  <p className="text-xs" style={{ color: '#78716c' }}>
                    {t('influencer.commissionExplanation', { percent: dashboard.commission_value })}
                  </p>
                  <div className="mt-2 text-xs p-2" style={{ color: '#78716c', background: '#ffffff', borderRadius: '12px' }}>
                    <p className="font-medium">{t('influencer.example')}:</p>
                    <p>- {t('influencer.sale')}: {convertAndFormatPrice(100)}</p>
                    <p>- {t('influencer.sellerReceives')}: {convertAndFormatPrice(82)}</p>
                    <p>- {t('influencer.platformFee')}: {convertAndFormatPrice(18)}</p>
                    <p>- <strong>{t('influencer.yourCommission')}: {convertAndFormatPrice(influencerExampleAmount)}</strong> ({tierPercent}% de {convertAndFormatPrice(18)})</p>
                  </div>
                </div>

                <div className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid #e7e5e4' }}>
                  <span style={{ color: '#78716c' }}>{t('influencer.pendingOrders')}</span>
                  <span className="font-medium" style={{ color: '#0c0a09' }}>{dashboard.pending_commissions} {t('orders.orders', 'pedidos')}</span>
                </div>
                <div className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid #e7e5e4' }}>
                  <span style={{ color: '#78716c' }}>{t('influencer.paidOrders')}</span>
                  <span className="font-medium" style={{ color: '#0c0a09' }}>{dashboard.paid_commissions} {t('orders.orders', 'pedidos')}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span style={{ color: '#78716c' }}>{t('influencer.available')}</span>
                  <span className="font-medium" style={{ color: '#0c0a09' }}>
                    {convertAndFormatPrice(Number(dashboard.available_balance || 0))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Schedule Card */}
        {dashboard.payment_schedule && (
          <div className="mt-6" style={{ background: '#ffffff', border: '1px solid #e7e5e4', borderRadius: '16px' }}>
            <div className="px-6 pt-6 pb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: '#0c0a09' }}>
                <CreditCard className="w-5 h-5" style={{ color: '#78716c' }} />
                {t('influencer.paymentSchedule')}
              </h3>
            </div>
            <div className="px-6 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Available to withdraw */}
                <div className="text-center p-4" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e7e5e4' }}>
                  <p className="text-sm mb-1" style={{ color: '#78716c' }}>{t('influencer.availableToWithdraw')}</p>
                  <p className="text-2xl font-bold" style={{ color: '#0c0a09' }}>{convertAndFormatPrice(Number(dashboard.payment_schedule.available_to_withdraw || 0))}</p>
                  <p className="text-xs mt-1" style={{ color: '#78716c' }}>{t('influencer.alreadyPassed15Days')}</p>
                </div>

                {/* Available soon */}
                <div className="text-center p-4" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e7e5e4' }}>
                  <p className="text-sm mb-1" style={{ color: '#78716c' }}>{t('influencer.availableSoon')}</p>
                  <p className="text-2xl font-bold" style={{ color: '#78716c' }}>{convertAndFormatPrice(Number(dashboard.payment_schedule.available_soon || 0))}</p>
                  <p className="text-xs mt-1" style={{ color: '#78716c' }}>{t('influencer.inNext7Days')}</p>
                </div>

                {/* Next payment date */}
                <div className="text-center p-4" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e7e5e4' }}>
                  <p className="text-sm mb-1" style={{ color: '#78716c' }}>{t('influencer.nextPaymentDate')}</p>
                  {dashboard.payment_schedule.next_payment_date ? (
                    <>
                      <p className="text-xl font-bold" style={{ color: '#78716c' }}>
                        {new Date(dashboard.payment_schedule.next_payment_date).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short'
                        })}
                      </p>
                      <p className="text-xs mt-1" style={{ color: '#78716c' }}>
                        {t('influencer.daysLeft', { days: Math.ceil((new Date(dashboard.payment_schedule.next_payment_date) - new Date()) / (1000 * 60 * 60 * 24)) })}
                      </p>
                    </>
                  ) : (
                    <p className="text-lg" style={{ color: '#78716c' }}>{t('influencer.noPendingPayments')}</p>
                  )}
                </div>
              </div>

              <div className="mt-4 p-3" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e7e5e4' }}>
                <p className="text-sm" style={{ color: '#78716c' }}>
                  <strong>Info · {t('influencer.paymentPolicy')}:</strong> {t('influencer.paymentPolicyDesc')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Withdrawal Card */}
        {dashboard.status === 'active' && dashboard.payment_schedule && (
          <div id="withdrawal-card-section" className="mt-6">
            <WithdrawalCard
              availableToWithdraw={dashboard.payment_schedule.available_to_withdraw}
              stripeConnected={stripeStatus?.connected && stripeStatus?.onboarding_complete}
              onWithdrawSuccess={refetchDashboard}
            />
          </div>
        )}

        {/* Fiscal Section — only if certificate verified */}
        {fiscalStatus?.certificate_verified && (
          <div className="mt-6 space-y-4">
            {/* Fiscal Summary Card */}
            <div className="p-5" style={{ background: '#f5f5f4', borderRadius: '16px', border: '1px solid #e7e5e4' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold" style={{ color: '#0c0a09' }}>
                  Resumen fiscal {withholdingSummary?.year || new Date().getFullYear()}
                </h3>
                <button
                  onClick={() => setShowIrpfModal(true)}
                  className="flex items-center gap-1 text-xs font-medium"
                  style={{ color: '#78716c', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  ¿Qué es la retención?
                </button>
              </div>

              {/* YTD Stats */}
              <div className={`grid ${fiscalStatus?.tax_country === 'ES' ? 'grid-cols-3' : 'grid-cols-2'} gap-3 mb-4`}>
                <div className="text-center p-3" style={{ background: '#ffffff', borderRadius: '12px' }}>
                  <p className="text-lg font-bold" style={{ color: '#0c0a09' }}>
                    {convertAndFormatPrice(Number(withholdingSummary?.gross_ytd || 0))}
                  </p>
                  <p className="text-[9px] uppercase tracking-wider" style={{ color: '#78716c' }}>Comisiones brutas</p>
                </div>
                {fiscalStatus?.tax_country === 'ES' && (
                  <div className="text-center p-3" style={{ background: '#ffffff', borderRadius: '12px' }}>
                    <p className="text-lg font-bold" style={{ color: '#78716c' }}>
                      {convertAndFormatPrice(Number(withholdingSummary?.withheld_ytd || 0))}
                    </p>
                    <p className="text-[9px] uppercase tracking-wider" style={{ color: '#78716c' }}>IRPF retenido (15%)</p>
                  </div>
                )}
                <div className="text-center p-3" style={{ background: '#ffffff', borderRadius: '12px' }}>
                  <p className="text-lg font-bold" style={{ color: '#0c0a09' }}>
                    {convertAndFormatPrice(Number(withholdingSummary?.net_ytd || 0))}
                  </p>
                  <p className="text-[9px] uppercase tracking-wider" style={{ color: '#78716c' }}>Cobrado neto</p>
                </div>
              </div>

              {/* Quarterly breakdown */}
              {withholdingSummary?.by_quarter && Object.keys(withholdingSummary.by_quarter).length > 0 && (
                <>
                  <div className="mb-2" style={{ borderTop: '1px solid #e7e5e4' }} />
                  <div className="grid grid-cols-4 gap-2">
                    {['Q1', 'Q2', 'Q3', 'Q4'].map(q => {
                      const qData = withholdingSummary.by_quarter[q];
                      const currentQ = `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;
                      const isCurrent = q === currentQ;
                      return (
                        <div key={q} className="text-center p-2" style={{ background: '#ffffff', borderRadius: '12px', border: isCurrent ? '2px solid #0c0a09' : '1px solid #e7e5e4' }}>
                          <p className="text-[10px] font-bold mb-1" style={{ color: isCurrent ? '#0c0a09' : '#78716c' }}>{q}</p>
                          {qData ? (
                            <>
                              <p className="text-xs font-semibold" style={{ color: '#0c0a09' }}>{convertAndFormatPrice(Number(qData.gross || 0))}</p>
                              {fiscalStatus?.tax_country === 'ES' && (
                                <p className="text-[9px]" style={{ color: '#78716c' }}>−{convertAndFormatPrice(Number(qData.withheld || 0))}</p>
                              )}
                            </>
                          ) : (
                            <p className="text-xs" style={{ color: '#78716c' }}>—</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Payout method card */}
            <div className="p-4 flex items-center justify-between" style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e7e5e4' }}>
              <div className="flex items-center gap-3">
                {fiscalStatus?.payout_method === 'sepa' ? (
                  <Building2 className="w-5 h-5" style={{ color: '#78716c' }} />
                ) : (
                  <CreditCard className="w-5 h-5" style={{ color: '#78716c' }} />
                )}
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#0c0a09' }}>
                    {fiscalStatus?.payout_method === 'sepa' ? 'Transferencia SEPA' : 'Stripe'}
                  </p>
                  <p className="text-xs" style={{ color: '#78716c' }}>
                    {fiscalStatus?.payout_method === 'sepa'
                      ? `···· ${fiscalStatus?.sepa_iban_last4 || '****'}`
                      : (fiscalStatus?.stripe_onboarding_complete ? 'Activo' : 'Pendiente')}
                  </p>
                </div>
              </div>
              <Link to="/influencer/fiscal-setup" className="text-xs font-semibold" style={{ color: '#78716c' }}>
                Cambiar
              </Link>
            </div>

            {/* Payout history */}
            {Array.isArray(payoutHistory) && payoutHistory.length > 0 && (
              <div className="p-4" style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e7e5e4' }}>
                <p className="text-[10px] uppercase tracking-wider font-bold mb-3" style={{ color: '#78716c' }}>Cobros realizados</p>
                <div className="space-y-2">
                  {payoutHistory.slice(0, 5).map((p, i) => (
                    <div key={p.withdrawal_id || i} className="flex items-center justify-between py-2" style={{ borderBottom: i < Math.min(payoutHistory.length, 5) - 1 ? '1px solid #e7e5e4' : 'none' }}>
                      <div>
                        <p className="text-xs font-medium" style={{ color: '#0c0a09' }}>
                          {p.created_at ? new Date(p.created_at).toLocaleDateString('es-ES') : '—'}
                        </p>
                        <p className="text-[10px]" style={{ color: '#78716c' }}>
                          Bruto: {convertAndFormatPrice(Number(p.gross_amount || p.amount || 0))}
                          {(p.withholding_amount || 0) > 0 && ` · Ret: ${convertAndFormatPrice(Number(p.withholding_amount || 0))}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold" style={{ color: '#0c0a09' }}>
                          {convertAndFormatPrice(Number(p.net_amount || p.amount || 0))}
                        </p>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{
                          background: p.status === 'completed' ? '#f5f5f4' : '#f5f5f4',
                          color: p.status === 'completed' ? '#0c0a09' : '#78716c',
                        }}>
                          {p.status === 'completed' ? 'Pagado' : 'Procesando'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {Array.isArray(payoutHistory) && payoutHistory.length === 0 && (
              <div className="p-4 text-center" style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e7e5e4' }}>
                <p className="text-[10px] uppercase tracking-wider font-bold mb-2" style={{ color: '#78716c' }}>Cobros realizados</p>
                <p className="text-sm" style={{ color: '#78716c' }}>Aún no has realizado ningún cobro</p>
              </div>
            )}
          </div>
        )}

        {/* IRPF Modal */}
        {showIrpfModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
            <div className="mx-4 max-w-sm w-full p-6" style={{ background: '#ffffff', borderRadius: '16px' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold" style={{ color: '#0c0a09' }}>¿Qué es la retención IRPF?</h3>
                <button onClick={() => setShowIrpfModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X className="w-5 h-5" style={{ color: '#78716c' }} />
                </button>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: '#78716c' }}>
                Hispaloshop SL retiene el 15% de tus comisiones y lo ingresa a Hacienda en tu nombre trimestralmente (Modelo 111).
              </p>
              <p className="text-sm leading-relaxed mt-3" style={{ color: '#78716c' }}>
                Cuando hagas tu declaración de la renta (IRPF), esas retenciones ya estarán pagadas y podrás deducirlas.
              </p>
              <p className="text-sm leading-relaxed mt-3" style={{ color: '#78716c' }}>
                Recibirás el certificado de retenciones en enero de cada año.
              </p>
              <button
                onClick={() => setShowIrpfModal(false)}
                className="w-full mt-5 py-2.5 text-sm font-semibold transition-colors"
                style={{ background: '#0c0a09', color: '#fff', borderRadius: '16px', border: 'none', cursor: 'pointer' }}
              >
                Entendido
              </button>
            </div>
          </div>
        )}

        {/* Recent Commissions */}
        <div className="mt-6" style={{ background: '#ffffff', border: '1px solid #e7e5e4', borderRadius: '16px' }}>
          <div className="px-6 pt-6 pb-4">
            <h3 className="text-lg font-semibold" style={{ color: '#0c0a09' }}>{t('influencer.recentCommissions')}</h3>
          </div>
          <div className="px-6 pb-6">
            {dashboard.recent_commissions?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e7e5e4' }}>
                      <th className="text-left py-3 px-4 font-medium" style={{ color: '#78716c' }}>{t('orders.orderNumber')}</th>
                      <th className="text-left py-3 px-4 font-medium" style={{ color: '#78716c' }}>{t('orders.orderTotal')}</th>
                      <th className="text-left py-3 px-4 font-medium" style={{ color: '#78716c' }}>{t('influencer.commissionRate')}</th>
                      <th className="text-left py-3 px-4 font-medium" style={{ color: '#78716c' }}>{t('common.status')}</th>
                      <th className="text-left py-3 px-4 font-medium" style={{ color: '#78716c' }}>{t('influencer.paymentAvailable')}</th>
                      <th className="text-left py-3 px-4 font-medium" style={{ color: '#78716c' }}>{t('common.date')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.recent_commissions.map((comm) => {
                      const paymentDate = comm.payment_available_date ? new Date(comm.payment_available_date) : null;
                      const now = new Date();
                      const isAvailable = paymentDate && paymentDate <= now;
                      const daysLeft = paymentDate ? Math.ceil((paymentDate - now) / (1000 * 60 * 60 * 24)) : null;

                      return (
                        <tr key={comm.commission_id} style={{ borderBottom: '1px solid #e7e5e4' }}>
                          <td className="py-3 px-4 font-mono text-sm" style={{ color: '#0c0a09' }}>{comm.order_id}</td>
                          <td className="py-3 px-4" style={{ color: '#0c0a09' }}>{convertAndFormatPrice(Number(comm.order_total || 0))}</td>
                          <td className="py-3 px-4 font-medium" style={{ color: '#78716c' }}>
                            {convertAndFormatPrice(Number(comm.commission_amount || 0))}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ background: '#f5f5f4', color: '#78716c' }}>
                              {comm.commission_status === 'paid' ? t('orders.status.paid') :
                               comm.commission_status === 'pending' ? t('orders.status.pending') :
                               comm.commission_status === 'reversed' ? t('orders.status.reversed', 'Revertido') : comm.commission_status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {comm.commission_status === 'paid' ? (
                              <span className="flex items-center gap-1" style={{ color: '#0c0a09' }}>
                                <CheckCircle2 className="w-4 h-4" />
                                {t('influencer.collected')}
                              </span>
                            ) : isAvailable ? (
                              <span className="font-medium flex items-center gap-1" style={{ color: '#0c0a09' }}>
                                <CheckCircle2 className="w-4 h-4" />
                                {t('influencer.available')}
                              </span>
                            ) : paymentDate ? (
                              <span style={{ color: '#78716c' }}>
                                {daysLeft > 0 ? t('influencer.daysLeft', { days: daysLeft }) : t('influencer.today')}
                              </span>
                            ) : (
                              <span style={{ color: '#78716c' }}>-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm" style={{ color: '#78716c' }}>
                            {new Date(comm.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p style={{ color: '#78716c' }}>
                  {t('influencer.noCommissions')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Analytics Section */}
        {dashboard.status === 'active' && dashboard.discount_code && dashboard.discount_code_active && (
          <div className="mt-8">
            <InfluencerAnalytics />
          </div>
        )}

        {/* Collaborations Section */}
        {collabs.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: '#0c0a09' }}>
                <Handshake className="w-5 h-5" style={{ color: '#78716c' }} />
                Colaboraciones
              </h2>
              <Link to="/messages" className="text-xs font-medium flex items-center gap-1" style={{ color: '#78716c' }}>
                Ver todas <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="space-y-3">
              {collabs.slice(0, 5).map(c => {
                const proposal = c.proposal || {};
                const statusMap = {
                  proposed: { label: 'Pendiente', bg: '#f5f5f4', color: '#78716c' },
                  active: { label: 'Activa', bg: '#f5f5f4', color: '#0c0a09' },
                  declined: { label: 'Rechazada', bg: '#f5f5f4', color: '#78716c' },
                  sample_sent: { label: 'Muestra enviada', bg: '#f5f5f4', color: '#78716c' },
                  sample_received: { label: 'Muestra recibida', bg: '#f5f5f4', color: '#0c0a09' },
                };
                const badge = statusMap[c.status] || statusMap.proposed;
                return (
                  <Link
                    key={c.collab_id}
                    to={`/messages/${c.conversation_id}`}
                    className="flex items-center gap-3 p-3 transition-colors"
                    style={{ background: '#ffffff', border: '1px solid #e7e5e4', borderRadius: '16px' }}
                  >
                    {proposal.product_image_url && (
                      <img loading="lazy" src={proposal.product_image_url} alt="" className="w-10 h-10 rounded-2xl object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: '#0c0a09' }}>{proposal.product_name}</p>
                      <p className="text-xs" style={{ color: '#78716c' }}>{proposal.commission_pct}% · {proposal.duration_days} días</p>
                    </div>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0" style={{ background: badge.bg, color: badge.color }}>
                      {badge.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Back to Home Link */}
        <div className="mt-8 text-center">
          <Link to="/" className="text-sm inline-flex items-center gap-2 transition-colors" style={{ color: '#78716c' }}>
            <Home className="w-4 h-4" />
            Volver a la tienda
          </Link>
        </div>
      </div>


      {/* Internal Chat */}
      <InternalChat userType="influencer" />
    </div>
  );
}
