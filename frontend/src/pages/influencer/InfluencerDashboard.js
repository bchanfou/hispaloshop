import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api/client';
import { Copy, Check, ExternalLink, DollarSign, ShoppingBag, TrendingUp, CreditCard, Home, Percent, Users, AlertCircle, Sparkles, Loader2, Mail, BarChart3, Wallet, ArrowUpRight, Clock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import InfluencerAIAssistant from '../../components/InfluencerAIAssistant';
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

const MINIMUM_WITHDRAWAL = 50; // €50 minimum

// Withdrawal Component
function WithdrawalCard({ availableToWithdraw, stripeConnected, onWithdrawSuccess }) {
  const [showHistory, setShowHistory] = useState(false);
  const { withdrawals, withdrawing, requestWithdrawal, refetchWithdrawals } = useInfluencerWithdrawal();

  const handleWithdraw = async () => {
    if (availableToWithdraw < MINIMUM_WITHDRAWAL) {
      toast.error(`El mínimo de retiro es €${MINIMUM_WITHDRAWAL}. Tienes €${availableToWithdraw.toFixed(2)} disponibles.`);
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
  };

  const canWithdraw = stripeConnected && availableToWithdraw >= MINIMUM_WITHDRAWAL;

  return (
    <div className="bg-white rounded-xl border border-stone-200">
      <div className="px-6 pt-6 pb-4">
        <h3 className="text-lg font-semibold text-stone-950 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-stone-700" />
          Retirar Comisiones
        </h3>
      </div>
      <div className="px-6 pb-6">
        <div className="space-y-4">
          {/* Available to withdraw */}
          <div className="text-center p-4 bg-white rounded-lg border border-stone-200">
            <p className="text-sm text-stone-500 mb-1">Disponible para retirar</p>
            <p className="text-3xl font-bold text-stone-950">€{availableToWithdraw.toFixed(2)}</p>
            <p className="text-xs text-stone-500 mt-1">Mínimo: €{MINIMUM_WITHDRAWAL}</p>
          </div>

          {/* Withdraw button */}
          {!stripeConnected ? (
            <div className="text-center p-3 bg-stone-50 rounded-lg border border-stone-200">
              <p className="text-sm text-stone-700">
                Conecta tu cuenta de Stripe para poder retirar tus comisiones
              </p>
            </div>
          ) : availableToWithdraw < MINIMUM_WITHDRAWAL ? (
            <div className="text-center p-3 bg-stone-50 rounded-lg border border-stone-200">
              <p className="text-sm text-stone-500">
                Necesitas €{(MINIMUM_WITHDRAWAL - availableToWithdraw).toFixed(2)} más para alcanzar el mínimo de retiro
              </p>
            </div>
          ) : (
            <button
              onClick={handleWithdraw}
              disabled={withdrawing || !canWithdraw}
              className="w-full px-4 py-2 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {withdrawing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <ArrowUpRight className="w-4 h-4" />
                  Retirar €{availableToWithdraw.toFixed(2)}
                </>
              )}
            </button>
          )}

          {/* Toggle history */}
          {withdrawals.length > 0 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full text-sm text-stone-500 py-2 hover:text-stone-950 transition-colors"
            >
              {showHistory ? 'Ocultar historial' : `Ver historial (${withdrawals.length} retiros)`}
            </button>
          )}

          {/* Withdrawal history */}
          {showHistory && withdrawals.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {withdrawals.slice(0, 5).map((wd) => (
                <div key={wd.withdrawal_id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-stone-700" />
                    <span className="text-sm font-medium">€{wd.amount.toFixed(2)}</span>
                  </div>
                  <span className="text-xs text-stone-500">
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
    <div className="bg-stone-50 border border-stone-200 rounded-lg p-6 mb-6">
      <div className="flex items-start gap-4">
        <Mail className="w-6 h-6 text-stone-700 flex-shrink-0 mt-1" />
        <div className="flex-1">
          <h3 className="font-semibold text-stone-950 mb-2">Verifica tu email</h3>
          <p className="text-stone-700 text-sm mb-4">
            Hemos enviado un código de 6 dígitos a <strong>{user?.email}</strong>.
            Introdúcelo aquí para activar tu cuenta.
          </p>
          <div className="flex items-center gap-3">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-32 px-3 py-2 border border-stone-200 rounded-lg text-stone-950 focus:outline-none focus:border-stone-950 text-center text-xl tracking-widest font-mono"
              maxLength={6}
            />
            <button onClick={handleVerify} disabled={verifying || code.length !== 6} className="px-4 py-2 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white rounded-lg transition-colors">
              {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verificar'}
            </button>
            <button onClick={handleResend} disabled={resending} className="px-4 py-2 border border-stone-200 text-stone-600 rounded-lg hover:bg-stone-50 transition-colors">
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
    <div className="bg-white rounded-xl border border-stone-200">
      <div className="px-6 pt-6 pb-4">
        <h3 className="text-lg font-semibold text-stone-950 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-stone-700" />
          Crea tu código de descuento
        </h3>
      </div>
      <div className="px-6 pb-6">
        <p className="text-sm text-stone-500 mb-4">
          Elige un código personalizado que tus seguidores usarán para obtener el 10% de descuento.
        </p>
        <div className="flex items-center gap-3">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20))}
            placeholder="Ej: MARIA10"
            className="flex-1 px-3 py-2 border border-stone-200 rounded-lg text-stone-950 focus:outline-none focus:border-stone-950 uppercase text-lg font-mono"
            maxLength={20}
          />
          <button onClick={handleCreate} disabled={creatingCode || code.length < 3} className="px-4 py-2 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white rounded-lg transition-colors">
            {creatingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear código'}
          </button>
        </div>
        <p className="text-xs text-stone-500 mt-2">
          Solo letras y números, entre 3-20 caracteres
        </p>
      </div>
    </div>
  );
}

export default function InfluencerDashboard() {
  const { user, refreshUser } = useAuth();
  const { t } = useTranslation();
  const { dashboard, loading, refetchDashboard } = useInfluencerProfile();
  const { stripeStatus, connectingStripe, connectStripe: connectStripeAccount } = useInfluencerStripeStatus();
  const [copied, setCopied] = useState(false);
  const [emailVerified, setEmailVerified] = useState(user?.email_verified);
  const [productPerformance, setProductPerformance] = useState([]);

  useEffect(() => {
    if (user) {
      setEmailVerified(user.email_verified);
    }
  }, [user]);

  useEffect(() => {
    let active = true;
    apiClient
      .get('/intelligence/influencer-performance')
      .then((data) => {
        if (active) {
          setProductPerformance(data?.items || []);
        }
      })
      .catch(() => {
        if (active) {
          setProductPerformance([]);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const handleEmailVerified = () => {
    setEmailVerified(true);
    if (refreshUser) refreshUser();
  };

  const handleCodeCreated = (_newCode) => {
    refetchDashboard();
  };

  const scrollToWithdrawals = () => {
    const withdrawalSection = document.getElementById('withdrawal-card-section');
    withdrawalSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const copyDiscountCode = () => {
    if (dashboard?.discount_code) {
      navigator.clipboard.writeText(dashboard.discount_code);
      setCopied(true);
      toast.success(t('influencer.codeCopied', '¡Código copiado!'));
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const connectStripe = async () => {
    try {
      const res = await connectStripeAccount();
      if (res?.url) {
        window.location.href = res.url;
      }
    } catch (err) {
      toast.error(t('influencer.stripeError', 'Error al conectar con Stripe'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-950"></div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="bg-white rounded-xl border border-stone-200 max-w-md">
          <div className="p-8 text-center">
            <h2 className="text-xl font-medium text-stone-950 mb-4">{t('influencer.notInfluencer')}</h2>
            <p className="text-stone-500">
              {t('influencer.notInfluencerDesc')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const tierPercent = Number(dashboard.commission_value || ((dashboard.commission_rate || 0) * 100) || 0);
  const influencerExample = ((18 * tierPercent) / 100).toFixed(2);

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-6xl mx-auto px-4 py-4 md:py-8">
        {/* Header - Mobile: Simple, Desktop: Full */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-stone-950">
            {t('influencer.dashboard')}
          </h1>
          <p className="mt-2 text-sm text-stone-500 md:text-base">
            {t('dashboard.welcome')}, {dashboard.full_name}
          </p>
        </div>

        {/* Email Verification Banner */}
        {!emailVerified && (
          <EmailVerificationBanner user={user} onVerified={handleEmailVerified} />
        )}

        {/* Status Banner - Pending Approval */}
        {dashboard.status === 'pending' && (
          <div className="mb-4 rounded-2xl border border-stone-200 bg-stone-50 p-4 md:mb-6 md:p-6">
            <div className="flex items-start gap-3 md:gap-4">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-stone-700 md:h-6 md:w-6" />
              <div>
                <h3 className="mb-1 text-sm font-semibold text-stone-950 md:mb-2 md:text-base">{t('influencer.pendingApproval')}</h3>
                <p className="text-xs text-stone-700 md:text-sm">
                  {t('influencer.pendingApprovalDesc')}
                </p>
                <p className="mt-2 text-xs text-stone-500 md:text-sm">
                  <strong>{t('influencer.estimatedTime')}</strong>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Status Banner - Other statuses */}
        {dashboard.status !== 'active' && dashboard.status !== 'pending' && (
          <div className="mb-4 rounded-2xl border border-stone-200 bg-stone-50 p-3 md:mb-6 md:p-4">
            <p className="text-sm text-stone-700">
              {t('influencer.accountStatus')} <strong>{dashboard.status}</strong>.
              {dashboard.status === 'suspended' && ` ${t('influencer.accountSuspended')}`}
            </p>
          </div>
        )}

        <div className="bg-white rounded-xl border border-stone-200 mb-6">
          <div className="px-6 pt-6 pb-4">
            <h3 className="text-lg font-semibold text-stone-950 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-stone-700" />
              Productos que mejor funcionan en tu contenido
            </h3>
          </div>
          <div className="px-6 pb-6 space-y-3">
            {productPerformance.length > 0 ? productPerformance.map((item) => (
              <div key={`${item.content_type}-${item.content_id}`} className="flex items-center justify-between rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-stone-950">{item.title || item.content_id}</p>
                  <p className="mt-1 text-xs text-stone-500 capitalize">{item.content_type}</p>
                </div>
                <div className="grid grid-cols-3 gap-4 text-right text-xs text-stone-500">
                  <div><p className="font-semibold text-stone-950">{item.views}</p><p>Views</p></div>
                  <div><p className="font-semibold text-stone-950">{item.clicks}</p><p>Clicks</p></div>
                  <div><p className="font-semibold text-stone-950">{item.sales}</p><p>Sales</p></div>
                </div>
              </div>
            )) : <p className="text-sm text-stone-500">Publica contenido con productos vinculados para empezar a ver rendimiento.</p>}
          </div>
        </div>

        {/* Create Code Card - Only show if active and no code yet (neither pending nor approved) */}
        {dashboard.status === 'active' && !dashboard.discount_code && (
          <div className="mb-4 md:mb-6">
            <CreateCodeCard onCodeCreated={handleCodeCreated} />
          </div>
        )}

        {/* Tier Progress */}
        <TierProgress />

        {/* === CODE HERO - The main thing influencers need === */}
        {dashboard.discount_code && dashboard.discount_code_approval_status === 'pending' && (
          <div className="mb-6 rounded-2xl border border-stone-200 bg-stone-50 p-6 text-center" data-testid="code-pending">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-widest text-stone-700">
                <span className="h-2 w-2 rounded-full bg-stone-950 animate-pulse" />
                Pendiente de aprobación
              </span>
            </div>
            <p className="mb-3 text-3xl font-semibold tracking-tight text-stone-950 md:text-4xl" data-testid="influencer-code-pending">
              {dashboard.discount_code}
            </p>
            <p className="text-sm text-stone-500">
              Tu código está siendo revisado por el equipo de Hispaloshop. Lo aprobaremos en menos de 24h.
            </p>
          </div>
        )}

        {dashboard.discount_code && dashboard.discount_code_active && (
          <div className="mb-6 rounded-2xl border border-stone-100 bg-white p-6 text-center shadow-sm" data-testid="code-hero">
            <p className="mb-2 text-xs uppercase tracking-widest text-stone-500">Tu código</p>
            <p className="mb-4 text-4xl font-semibold tracking-tight text-stone-950 md:text-5xl" data-testid="influencer-code">
              {dashboard.discount_code}
            </p>
            <div className="flex justify-center gap-3 mb-4">
              <button
                onClick={() => { navigator.clipboard.writeText(dashboard.discount_code); toast.success('Código copiado'); }}
                className="rounded-full bg-stone-950 px-6 py-2 text-white hover:bg-stone-800 flex items-center gap-2 transition-colors"
                data-testid="copy-code-btn"
              >
                <Copy className="w-4 h-4" /> Copiar
              </button>
              <button
                onClick={() => { if (navigator.share) navigator.share({ title: 'Mi código Hispaloshop', text: `Usa mi código ${dashboard.discount_code} para descuento en hispaloshop.com` }); else { navigator.clipboard.writeText(`Usa mi código ${dashboard.discount_code} en hispaloshop.com`); toast.success('Link copiado'); }}}
                className="rounded-full px-6 py-2 border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
              >
                Compartir
              </button>
            </div>
            <p className="text-xs text-stone-500">Tu comunidad ahorra {dashboard.discount_value || 10}% con este código</p>
          </div>
        )}

        {/* === 2 Big Earnings Circles === */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="rounded-2xl border border-stone-100 bg-white p-6 text-center shadow-sm" data-testid="total-earned">
            <p className="text-3xl font-semibold tracking-tight text-stone-950 md:text-4xl">€{asNumber(dashboard.total_commission_earned).toFixed(0)}</p>
            <p className="mt-2 text-xs text-stone-500">Total ganado</p>
          </div>
          <div className="rounded-2xl border border-stone-100 bg-white p-6 text-center shadow-sm" data-testid="available-withdraw">
            <p className="text-3xl font-semibold tracking-tight text-stone-950 md:text-4xl">€{asNumber(dashboard.available_balance).toFixed(0)}</p>
            <p className="mt-2 text-xs text-stone-500">Disponible</p>
            {(dashboard.available_balance || 0) >= 50 && (
              <button
                onClick={scrollToWithdrawals}
                className="mt-3 rounded-full bg-stone-950 px-4 py-1 text-xs text-white hover:bg-stone-800 transition-colors"
              >
                Retirar
              </button>
            )}
          </div>
        </div>

        {/* Stats Grid - Mobile: 2x2, Desktop: 4 columns */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
          <div className="bg-white rounded-xl border border-stone-200 dashboard-card">
            <div className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <p className="text-xs text-stone-500 md:text-sm">{t('influencer.totalSales')}</p>
                  <p className="text-xl md:text-2xl font-medium text-stone-950">
                    €{dashboard.total_sales_generated.toFixed(0)}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 md:h-12 md:w-12">
                  <ShoppingBag className="h-5 w-5 text-stone-700 md:h-6 md:w-6" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-stone-200 dashboard-card">
            <div className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <p className="text-xs text-stone-500 md:text-sm">{t('influencer.totalEarned')}</p>
                  <p className="text-xl md:text-2xl font-medium text-stone-950">
                    €{dashboard.total_commission_earned.toFixed(0)}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 md:h-12 md:w-12">
                  <TrendingUp className="h-5 w-5 text-stone-700 md:h-6 md:w-6" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-stone-200 dashboard-card">
            <div className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <p className="text-xs text-stone-500 md:text-sm">{t('influencer.availableBalance')}</p>
                  <p className="text-xl font-medium text-stone-950 md:text-2xl">
                    €{dashboard.available_balance.toFixed(0)}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 md:h-12 md:w-12">
                  <DollarSign className="h-5 w-5 text-stone-700 md:h-6 md:w-6" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-stone-200 dashboard-card">
            <div className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <p className="text-xs text-stone-500 md:text-sm">{t('influencer.commissionRate')}</p>
                  <p className="text-xl md:text-2xl font-medium text-stone-950">
                    {`${tierPercent}%`}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 md:h-12 md:w-12">
                  <CreditCard className="h-5 w-5 text-stone-700 md:h-6 md:w-6" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Discount Code Card */}
          <div className="bg-white rounded-xl border border-stone-200 lg:col-span-1">
            <div className="px-6 pt-6 pb-4">
              <h3 className="text-lg font-semibold text-stone-950">{t('influencer.discountCode')}</h3>
            </div>
            <div className="px-6 pb-6">
              {dashboard.discount_code ? (
                <>
                  <div className="bg-stone-50 border border-dashed border-stone-300 rounded-lg p-4 text-center mb-4">
                    <p className="text-3xl font-bold tracking-wider text-stone-950">
                      {dashboard.discount_code}
                    </p>
                  </div>
                  <button
                    onClick={copyDiscountCode}
                    className="w-full px-4 py-2 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
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
                  <p className="text-sm text-stone-500 text-center mt-3">
                    {t('influencer.shareCode')}
                  </p>
                </>
              ) : dashboard.status === 'active' ? (
                <div className="text-center py-4">
                  <p className="text-stone-500 text-sm">
                    {t('influencer.useFormAbove')}
                  </p>
                </div>
              ) : (
                <div className="text-center py-4">
                  <AlertCircle className="w-8 h-8 text-stone-500 mx-auto mb-2" />
                  <p className="text-stone-500 text-sm">
                    {t('influencer.canCreateWhenApproved')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Stripe Connect Card */}
          <div className="bg-white rounded-xl border border-stone-200 lg:col-span-1">
            <div className="px-6 pt-6 pb-4">
              <h3 className="text-lg font-semibold text-stone-950">{t('influencer.paymentSetup')}</h3>
            </div>
            <div className="px-6 pb-6">
              {stripeStatus?.connected && stripeStatus?.onboarding_complete ? (
                <div className="text-center">
                  <div className="h-16 w-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="h-8 w-8 text-stone-700" />
                  </div>
                  <p className="font-medium text-stone-700">{t('influencer.stripeConnected')}</p>
                  <p className="text-sm text-stone-500 mt-2">
                    {t('influencer.shareCode')}
                  </p>
                  <div className="mt-4 text-sm text-stone-500 flex items-center gap-2">
                    <span>{t('influencer.payoutsEnabled')}:</span>
                    {stripeStatus.payouts_enabled ? (
                      <CheckCircle2 className="w-4 h-4 text-stone-700" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-stone-500" />
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-stone-500 mb-4">
                    {t('influencer.connectStripe')}
                  </p>
                  <button
                    onClick={connectStripe}
                    disabled={connectingStripe}
                    className="w-full px-4 py-2 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
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
          <div className="bg-white rounded-xl border border-stone-200 lg:col-span-1">
            <div className="px-6 pt-6 pb-4">
              <h3 className="text-lg font-semibold text-stone-950">{t('influencer.commissionSummary')}</h3>
            </div>
            <div className="px-6 pb-6">
              <div className="space-y-4">
                {/* How commission works explanation */}
                <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 mb-4">
                  <p className="text-xs font-medium text-stone-700 mb-2">Info · {t('influencer.howCommissionWorks')}</p>
                  <p className="text-xs text-stone-600">
                    {t('influencer.commissionExplanation', { percent: dashboard.commission_value })}
                  </p>
                  <div className="mt-2 text-xs text-stone-600 bg-stone-100 rounded p-2">
                    <p className="font-medium">{t('influencer.example')}:</p>
                    <p>- {t('influencer.sale')}: €100</p>
                    <p>- {t('influencer.sellerReceives')}: €82</p>
                    <p>- {t('influencer.platformFee')}: €18</p>
                    <p>- <strong>{t('influencer.yourCommission')}: &euro;{influencerExample}</strong> ({tierPercent}% de &euro;18)</p>
                  </div>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-stone-200">
                  <span className="text-stone-500">{t('influencer.pendingOrders')}</span>
                  <span className="font-medium">{dashboard.pending_commissions} {t('orders.orders', 'pedidos')}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-stone-200">
                  <span className="text-stone-500">{t('influencer.paidOrders')}</span>
                  <span className="font-medium">{dashboard.paid_commissions} {t('orders.orders', 'pedidos')}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-stone-500">{t('influencer.available')}</span>
                  <span className="font-medium text-stone-950">
                    €{dashboard.available_balance.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Schedule Card */}
        {dashboard.payment_schedule && (
          <div className="bg-white rounded-xl border border-stone-200 mt-6">
            <div className="px-6 pt-6 pb-4">
              <h3 className="text-lg font-semibold text-stone-950 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-stone-700" />
                {t('influencer.paymentSchedule')}
              </h3>
            </div>
            <div className="px-6 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Available to withdraw */}
                <div className="text-center p-4 bg-white rounded-lg border border-stone-200">
                  <p className="text-sm text-stone-500 mb-1">{t('influencer.availableToWithdraw')}</p>
                  <p className="text-2xl font-bold text-stone-950">€{dashboard.payment_schedule.available_to_withdraw.toFixed(2)}</p>
                  <p className="text-xs text-stone-600 mt-1">{t('influencer.alreadyPassed15Days')}</p>
                </div>

                {/* Available soon */}
                <div className="text-center p-4 bg-white rounded-lg border border-stone-200">
                  <p className="text-sm text-stone-500 mb-1">{t('influencer.availableSoon')}</p>
                  <p className="text-2xl font-bold text-stone-700">€{dashboard.payment_schedule.available_soon.toFixed(2)}</p>
                  <p className="text-xs text-stone-600 mt-1">{t('influencer.inNext7Days')}</p>
                </div>

                {/* Next payment date */}
                <div className="text-center p-4 bg-white rounded-lg border border-stone-200">
                  <p className="text-sm text-stone-500 mb-1">{t('influencer.nextPaymentDate')}</p>
                  {dashboard.payment_schedule.next_payment_date ? (
                    <>
                      <p className="text-xl font-bold text-stone-700">
                        {new Date(dashboard.payment_schedule.next_payment_date).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short'
                        })}
                      </p>
                      <p className="text-xs text-stone-600 mt-1">
                        {t('influencer.daysLeft', { days: Math.ceil((new Date(dashboard.payment_schedule.next_payment_date) - new Date()) / (1000 * 60 * 60 * 24)) })}
                      </p>
                    </>
                  ) : (
                    <p className="text-lg text-stone-500">{t('influencer.noPendingPayments')}</p>
                  )}
                </div>
              </div>

              <div className="mt-4 p-3 bg-white rounded-lg border border-stone-200">
                <p className="text-sm text-stone-500">
                  <strong>Info · {t('influencer.paymentPolicy')}:</strong> {t('influencer.paymentPolicyDesc')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Withdrawal Card - Only show for active influencers with Stripe */}
        {dashboard.status === 'active' && dashboard.payment_schedule && (
          <div id="withdrawal-card-section" className="mt-6">
            <WithdrawalCard
              availableToWithdraw={dashboard.payment_schedule.available_to_withdraw}
              stripeConnected={stripeStatus?.connected && stripeStatus?.onboarding_complete}
              onWithdrawSuccess={refetchDashboard}
            />
          </div>
        )}

        {/* Recent Commissions */}
        <div className="bg-white rounded-xl border border-stone-200 mt-6">
          <div className="px-6 pt-6 pb-4">
            <h3 className="text-lg font-semibold text-stone-950">{t('influencer.recentCommissions')}</h3>
          </div>
          <div className="px-6 pb-6">
            {dashboard.recent_commissions?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-stone-200">
                      <th className="text-left py-3 px-4 font-medium text-stone-500">{t('orders.orderNumber')}</th>
                      <th className="text-left py-3 px-4 font-medium text-stone-500">{t('orders.orderTotal')}</th>
                      <th className="text-left py-3 px-4 font-medium text-stone-500">{t('influencer.commissionRate')}</th>
                      <th className="text-left py-3 px-4 font-medium text-stone-500">{t('common.status')}</th>
                      <th className="text-left py-3 px-4 font-medium text-stone-500">{t('influencer.paymentAvailable')}</th>
                      <th className="text-left py-3 px-4 font-medium text-stone-500">{t('common.date')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.recent_commissions.map((comm) => {
                      const paymentDate = comm.payment_available_date ? new Date(comm.payment_available_date) : null;
                      const now = new Date();
                      const isAvailable = paymentDate && paymentDate <= now;
                      const daysLeft = paymentDate ? Math.ceil((paymentDate - now) / (1000 * 60 * 60 * 24)) : null;

                      return (
                        <tr key={comm.commission_id} className="border-b border-stone-100">
                          <td className="py-3 px-4 font-mono text-sm">{comm.order_id}</td>
                          <td className="py-3 px-4">€{comm.order_total.toFixed(2)}</td>
                          <td className="py-3 px-4 font-medium text-stone-700">
                            €{comm.commission_amount.toFixed(2)}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-700">
                              {comm.commission_status === 'paid' ? t('orders.status.paid') :
                               comm.commission_status === 'pending' ? t('orders.status.pending') :
                               comm.commission_status === 'reversed' ? t('orders.status.reversed', 'Revertido') : comm.commission_status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {comm.commission_status === 'paid' ? (
                              <span className="text-stone-700 flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4" />
                                {t('influencer.collected')}
                              </span>
                            ) : isAvailable ? (
                              <span className="text-stone-700 font-medium flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4" />
                                {t('influencer.available')}
                              </span>
                            ) : paymentDate ? (
                              <span className="text-stone-600">
                                {daysLeft > 0 ? t('influencer.daysLeft', { days: daysLeft }) : t('influencer.today')}
                              </span>
                            ) : (
                              <span className="text-stone-500">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-stone-500">
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
                <p className="text-stone-500">
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

        {/* Back to Home Link */}
        <div className="mt-8 text-center">
          <Link to="/" className="text-stone-500 hover:text-stone-950 text-sm inline-flex items-center gap-2">
            <Home className="w-4 h-4" />
            Volver a la tienda
          </Link>
        </div>
      </div>

      {/* AI Assistant */}
      <InfluencerAIAssistant influencerData={dashboard} />

      {/* Internal Chat */}
      <InternalChat userType="influencer" />
    </div>
  );
}


