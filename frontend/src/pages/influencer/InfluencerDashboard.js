import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api/client';
import { Copy, Check, ExternalLink, DollarSign, ShoppingBag, TrendingUp, CreditCard, Home, Percent, Users, AlertCircle, Sparkles, Loader2, Mail, BarChart3, Wallet, ArrowUpRight, Clock, CheckCircle2, HelpCircle, Building2, X, Handshake, ChevronRight } from 'lucide-react';
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
    <div style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }}>
      <div className="px-6 pt-6 pb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--color-black)' }}>
          <Wallet className="w-5 h-5" style={{ color: 'var(--color-stone)' }} />
          Retirar Comisiones
        </h3>
      </div>
      <div className="px-6 pb-6">
        <div className="space-y-4">
          {/* Available to withdraw */}
          <div className="text-center p-4" style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
            <p className="text-sm mb-1" style={{ color: 'var(--color-stone)' }}>Disponible para retirar</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--color-black)' }}>€{availableToWithdraw.toFixed(2)}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-stone)' }}>Mínimo: €{MINIMUM_WITHDRAWAL}</p>
          </div>

          {/* Withdraw button */}
          {!stripeConnected ? (
            <div className="text-center p-3" style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <p className="text-sm" style={{ color: 'var(--color-stone)' }}>
                Conecta tu cuenta de Stripe para poder retirar tus comisiones
              </p>
            </div>
          ) : availableToWithdraw < MINIMUM_WITHDRAWAL ? (
            <div className="text-center p-3" style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <p className="text-sm" style={{ color: 'var(--color-stone)' }}>
                Necesitas €{(MINIMUM_WITHDRAWAL - availableToWithdraw).toFixed(2)} más para alcanzar el mínimo de retiro
              </p>
            </div>
          ) : (
            <button
              onClick={handleWithdraw}
              disabled={withdrawing || !canWithdraw}
              className="w-full px-4 py-2 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: 'var(--color-black)', color: '#fff', borderRadius: 'var(--radius-md)' }}
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
              className="w-full text-sm py-2 transition-colors"
              style={{ color: 'var(--color-stone)' }}
            >
              {showHistory ? 'Ocultar historial' : `Ver historial (${withdrawals.length} retiros)`}
            </button>
          )}

          {/* Withdrawal history */}
          {showHistory && withdrawals.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {withdrawals.slice(0, 5).map((wd) => (
                <div key={wd.withdrawal_id} className="flex items-center justify-between p-2 rounded" style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)' }}>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--color-green)' }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--color-black)' }}>€{wd.amount.toFixed(2)}</span>
                  </div>
                  <span className="text-xs" style={{ color: 'var(--color-stone)' }}>
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
    <div className="p-6 mb-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
      <div className="flex items-start gap-4">
        <Mail className="w-6 h-6 flex-shrink-0 mt-1" style={{ color: 'var(--color-stone)' }} />
        <div className="flex-1">
          <h3 className="font-semibold mb-2" style={{ color: 'var(--color-black)' }}>Verifica tu email</h3>
          <p className="text-sm mb-4" style={{ color: 'var(--color-stone)' }}>
            Hemos enviado un código de 6 dígitos a <strong>{user?.email}</strong>.
            Introdúcelo aquí para activar tu cuenta.
          </p>
          <div className="flex items-center gap-3">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-32 px-3 py-2 text-center text-xl tracking-widest font-mono"
              style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-black)', background: 'var(--color-white)', outline: 'none' }}
              maxLength={6}
            />
            <button onClick={handleVerify} disabled={verifying || code.length !== 6} className="px-4 py-2 transition-colors disabled:opacity-50" style={{ background: 'var(--color-black)', color: '#fff', borderRadius: 'var(--radius-md)' }}>
              {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verificar'}
            </button>
            <button onClick={handleResend} disabled={resending} className="px-4 py-2 transition-colors" style={{ border: '1px solid var(--color-border)', color: 'var(--color-stone)', borderRadius: 'var(--radius-md)', background: 'var(--color-white)' }}>
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
    <div style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }}>
      <div className="px-6 pt-6 pb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--color-black)' }}>
          <Sparkles className="w-5 h-5" style={{ color: 'var(--color-stone)' }} />
          Crea tu código de descuento
        </h3>
      </div>
      <div className="px-6 pb-6">
        <p className="text-sm mb-4" style={{ color: 'var(--color-stone)' }}>
          Elige un código personalizado que tus seguidores usarán para obtener el 10% de descuento.
        </p>
        <div className="flex items-center gap-3">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20))}
            placeholder="Ej: MARIA10"
            className="flex-1 px-3 py-2 uppercase text-lg font-mono"
            style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-black)', background: 'var(--color-white)', outline: 'none' }}
            maxLength={20}
          />
          <button onClick={handleCreate} disabled={creatingCode || code.length < 3} className="px-4 py-2 transition-colors disabled:opacity-50" style={{ background: 'var(--color-black)', color: '#fff', borderRadius: 'var(--radius-md)' }}>
            {creatingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear código'}
          </button>
        </div>
        <p className="text-xs mt-2" style={{ color: 'var(--color-stone)' }}>
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
    apiClient.get('/collaborations').then(d => {
      if (active) setCollabs(d?.collaborations || []);
    }).catch(() => {});
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

    // Fetch fiscal data
    apiClient.get('/influencer/fiscal/status').then(d => {
      if (active) setFiscalStatus(d);
    }).catch(() => {});
    apiClient.get('/influencer/fiscal/withholding-summary').then(d => {
      if (active) setWithholdingSummary(d);
    }).catch(() => {});
    apiClient.get('/influencer/payouts').then(d => {
      if (active) setPayoutHistory(d?.payouts || d || []);
    }).catch(() => {});

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
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-cream)' }}>
        <div className="animate-spin rounded-full h-8 w-8" style={{ borderBottom: '2px solid var(--color-black)' }}></div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-cream)' }}>
        <div className="max-w-md" style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
          <div className="p-8 text-center">
            <h2 className="text-xl font-medium mb-4" style={{ color: 'var(--color-black)' }}>{t('influencer.notInfluencer')}</h2>
            <p style={{ color: 'var(--color-stone)' }}>
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
    <div className="min-h-screen" style={{ background: 'var(--color-cream)', fontFamily: 'var(--font-sans)' }}>
      <div className="max-w-6xl mx-auto px-4 py-4 md:py-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-3xl font-semibold tracking-tight" style={{ color: 'var(--color-black)' }}>
            {t('influencer.dashboard')}
          </h1>
          <p className="mt-2 text-sm md:text-base" style={{ color: 'var(--color-stone)' }}>
            {t('dashboard.welcome')}, {dashboard.full_name}
          </p>
        </div>

        {/* Email Verification Banner */}
        {!emailVerified && (
          <EmailVerificationBanner user={user} onVerified={handleEmailVerified} />
        )}

        {/* Status Banner - Pending Approval */}
        {dashboard.status === 'pending' && (
          <div className="mb-4 p-4 md:mb-6 md:p-6" style={{ borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
            <div className="flex items-start gap-3 md:gap-4">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 md:h-6 md:w-6" style={{ color: 'var(--color-stone)' }} />
              <div>
                <h3 className="mb-1 text-sm font-semibold md:mb-2 md:text-base" style={{ color: 'var(--color-black)' }}>{t('influencer.pendingApproval')}</h3>
                <p className="text-xs md:text-sm" style={{ color: 'var(--color-stone)' }}>
                  {t('influencer.pendingApprovalDesc')}
                </p>
                <p className="mt-2 text-xs md:text-sm" style={{ color: 'var(--color-stone)' }}>
                  <strong>{t('influencer.estimatedTime')}</strong>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Status Banner - Other statuses */}
        {dashboard.status !== 'active' && dashboard.status !== 'pending' && (
          <div className="mb-4 p-3 md:mb-6 md:p-4" style={{ borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
            <p className="text-sm" style={{ color: 'var(--color-stone)' }}>
              {t('influencer.accountStatus')} <strong>{dashboard.status}</strong>.
              {dashboard.status === 'suspended' && ` ${t('influencer.accountSuspended')}`}
            </p>
          </div>
        )}

        {/* === BLACK BALANCE CARD === */}
        <div className="mb-6 p-6" style={{ background: 'var(--color-black)', borderRadius: 'var(--radius-xl)' }}>
          <p className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Balance disponible</p>
          <p className="font-bold mb-2" style={{ color: '#fff', fontSize: '26px' }}>€{asNumber(dashboard.available_balance).toFixed(2)}</p>
          {dashboard.payment_schedule?.next_payment_date && (
            <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Próximo pago: {new Date(dashboard.payment_schedule.next_payment_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
            </p>
          )}
          {/* "Solicitar cobro" — GREEN BUTTON INSIDE BLACK CARD */}
          {(dashboard.available_balance || 0) >= MINIMUM_WITHDRAWAL && (
            <button
              onClick={scrollToWithdrawals}
              className="px-5 py-2 text-sm font-medium transition-colors"
              style={{ background: 'var(--color-green)', color: '#fff', borderRadius: 'var(--radius-full)' }}
            >
              Solicitar cobro
            </button>
          )}
        </div>

        {/* Product Performance */}
        <div className="mb-6" style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }}>
          <div className="px-6 pt-6 pb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--color-black)' }}>
              <BarChart3 className="h-5 w-5" style={{ color: 'var(--color-stone)' }} />
              Productos que mejor funcionan en tu contenido
            </h3>
          </div>
          <div className="px-6 pb-6 space-y-3">
            {productPerformance.length > 0 ? productPerformance.map((item) => (
              <div key={`${item.content_type}-${item.content_id}`} className="flex items-center justify-between px-4 py-3" style={{ borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium" style={{ color: 'var(--color-black)' }}>{item.title || item.content_id}</p>
                  <p className="mt-1 text-xs capitalize" style={{ color: 'var(--color-stone)' }}>{item.content_type}</p>
                </div>
                <div className="grid grid-cols-3 gap-4 text-right text-xs" style={{ color: 'var(--color-stone)' }}>
                  <div><p className="font-semibold" style={{ color: 'var(--color-black)' }}>{item.views}</p><p>Views</p></div>
                  <div><p className="font-semibold" style={{ color: 'var(--color-black)' }}>{item.clicks}</p><p>Clicks</p></div>
                  <div><p className="font-semibold" style={{ color: 'var(--color-black)' }}>{item.sales}</p><p>Sales</p></div>
                </div>
              </div>
            )) : <p className="text-sm" style={{ color: 'var(--color-stone)' }}>Publica contenido con productos vinculados para empezar a ver rendimiento.</p>}
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
          <div className="mb-6 p-6 text-center" style={{ borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', background: 'var(--color-surface)' }} data-testid="code-pending">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest" style={{ background: 'var(--color-white)', color: 'var(--color-stone)' }}>
                <span className="h-2 w-2 rounded-full animate-pulse" style={{ background: 'var(--color-black)' }} />
                Pendiente de aprobación
              </span>
            </div>
            <p className="mb-3 text-3xl font-semibold tracking-tight md:text-4xl" style={{ color: 'var(--color-black)' }} data-testid="influencer-code-pending">
              {dashboard.discount_code}
            </p>
            <p className="text-sm" style={{ color: 'var(--color-stone)' }}>
              Tu código está siendo revisado por el equipo de Hispaloshop. Lo aprobaremos en menos de 24h.
            </p>
          </div>
        )}

        {/* === CODE HERO - active === */}
        {dashboard.discount_code && dashboard.discount_code_active && (
          <div className="mb-6 p-6 text-center" style={{ borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', background: 'var(--color-white)' }} data-testid="code-hero">
            <p className="mb-2 text-xs uppercase tracking-widest" style={{ color: 'var(--color-stone)' }}>Tu código</p>
            <p className="mb-4 text-4xl font-semibold tracking-tight md:text-5xl" style={{ color: 'var(--color-black)', fontFamily: 'monospace', fontSize: '14px' }} data-testid="influencer-code">
              <span style={{ fontSize: '2.25rem' }}>{dashboard.discount_code}</span>
            </p>
            <div className="flex justify-center gap-3 mb-4">
              <button
                onClick={() => { navigator.clipboard.writeText(dashboard.discount_code); toast.success('Código copiado'); }}
                className="rounded-full px-6 py-2 flex items-center gap-2 transition-colors"
                style={{ background: 'var(--color-black)', color: '#fff' }}
                data-testid="copy-code-btn"
              >
                <Copy className="w-4 h-4" /> Copiar
              </button>
              <button
                onClick={() => { if (navigator.share) navigator.share({ title: 'Mi código Hispaloshop', text: `Usa mi código ${dashboard.discount_code} para descuento en hispaloshop.com` }); else { navigator.clipboard.writeText(`Usa mi código ${dashboard.discount_code} en hispaloshop.com`); toast.success('Link copiado'); }}}
                className="rounded-full px-6 py-2 transition-colors"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-stone)', background: 'var(--color-white)' }}
              >
                Compartir
              </button>
            </div>
            <p className="text-xs" style={{ color: 'var(--color-stone)' }}>Tu comunidad ahorra {dashboard.discount_value || 10}% con este código</p>
          </div>
        )}

        {/* === Stats grid 3 cols === */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="p-4 text-center" style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }}>
            <p className="text-2xl font-bold" style={{ color: 'var(--color-black)' }}>€{asNumber(dashboard.total_sales_generated).toFixed(0)}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-stone)' }}>{t('influencer.totalSales')}</p>
          </div>
          <div className="p-4 text-center" style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }}>
            <p className="text-2xl font-bold" style={{ color: 'var(--color-black)' }}>€{asNumber(dashboard.total_commission_earned).toFixed(0)}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-stone)' }}>Comisión mes</p>
          </div>
          <div className="p-4 text-center" style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }}>
            <p className="text-2xl font-bold" style={{ color: 'var(--color-black)' }}>{`${tierPercent}%`}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-stone)' }}>Conversión</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Discount Code Card */}
          <div className="lg:col-span-1" style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }}>
            <div className="px-6 pt-6 pb-4">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--color-black)' }}>{t('influencer.discountCode')}</h3>
            </div>
            <div className="px-6 pb-6">
              {dashboard.discount_code ? (
                <>
                  <div className="p-4 text-center mb-4" style={{ background: 'var(--color-surface)', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                    <p className="text-3xl font-bold tracking-wider" style={{ color: 'var(--color-black)', fontFamily: 'monospace', fontSize: '14px' }}>
                      <span style={{ fontSize: '1.875rem' }}>{dashboard.discount_code}</span>
                    </p>
                  </div>
                  <button
                    onClick={copyDiscountCode}
                    className="w-full px-4 py-2 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ background: 'var(--color-black)', color: '#fff', borderRadius: 'var(--radius-md)' }}
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
                  <p className="text-sm text-center mt-3" style={{ color: 'var(--color-stone)' }}>
                    {t('influencer.shareCode')}
                  </p>
                </>
              ) : dashboard.status === 'active' ? (
                <div className="text-center py-4">
                  <p className="text-sm" style={{ color: 'var(--color-stone)' }}>
                    {t('influencer.useFormAbove')}
                  </p>
                </div>
              ) : (
                <div className="text-center py-4">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--color-stone)' }} />
                  <p className="text-sm" style={{ color: 'var(--color-stone)' }}>
                    {t('influencer.canCreateWhenApproved')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Stripe Connect Card */}
          <div className="lg:col-span-1" style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }}>
            <div className="px-6 pt-6 pb-4">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--color-black)' }}>{t('influencer.paymentSetup')}</h3>
            </div>
            <div className="px-6 pb-6">
              {stripeStatus?.connected && stripeStatus?.onboarding_complete ? (
                <div className="text-center">
                  <div className="h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--color-green-light)' }}>
                    <Check className="h-8 w-8" style={{ color: 'var(--color-green)' }} />
                  </div>
                  <p className="font-medium" style={{ color: 'var(--color-green)' }}>{t('influencer.stripeConnected')}</p>
                  <p className="text-sm mt-2" style={{ color: 'var(--color-stone)' }}>
                    {t('influencer.shareCode')}
                  </p>
                  <div className="mt-4 text-sm flex items-center gap-2" style={{ color: 'var(--color-stone)' }}>
                    <span>{t('influencer.payoutsEnabled')}:</span>
                    {stripeStatus.payouts_enabled ? (
                      <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--color-green)' }} />
                    ) : (
                      <AlertCircle className="w-4 h-4" style={{ color: 'var(--color-stone)' }} />
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <p className="mb-4" style={{ color: 'var(--color-stone)' }}>
                    {t('influencer.connectStripe')}
                  </p>
                  <button
                    onClick={connectStripe}
                    disabled={connectingStripe}
                    className="w-full px-4 py-2 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ background: 'var(--color-black)', color: '#fff', borderRadius: 'var(--radius-md)' }}
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
          <div className="lg:col-span-1" style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }}>
            <div className="px-6 pt-6 pb-4">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--color-black)' }}>{t('influencer.commissionSummary')}</h3>
            </div>
            <div className="px-6 pb-6">
              <div className="space-y-4">
                {/* How commission works */}
                <div className="p-3 mb-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                  <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-stone)' }}>Info · {t('influencer.howCommissionWorks')}</p>
                  <p className="text-xs" style={{ color: 'var(--color-stone)' }}>
                    {t('influencer.commissionExplanation', { percent: dashboard.commission_value })}
                  </p>
                  <div className="mt-2 text-xs p-2" style={{ color: 'var(--color-stone)', background: 'var(--color-white)', borderRadius: 'var(--radius-md)' }}>
                    <p className="font-medium">{t('influencer.example')}:</p>
                    <p>- {t('influencer.sale')}: €100</p>
                    <p>- {t('influencer.sellerReceives')}: €82</p>
                    <p>- {t('influencer.platformFee')}: €18</p>
                    <p>- <strong>{t('influencer.yourCommission')}: &euro;{influencerExample}</strong> ({tierPercent}% de &euro;18)</p>
                  </div>
                </div>

                <div className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ color: 'var(--color-stone)' }}>{t('influencer.pendingOrders')}</span>
                  <span className="font-medium" style={{ color: 'var(--color-black)' }}>{dashboard.pending_commissions} {t('orders.orders', 'pedidos')}</span>
                </div>
                <div className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ color: 'var(--color-stone)' }}>{t('influencer.paidOrders')}</span>
                  <span className="font-medium" style={{ color: 'var(--color-black)' }}>{dashboard.paid_commissions} {t('orders.orders', 'pedidos')}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span style={{ color: 'var(--color-stone)' }}>{t('influencer.available')}</span>
                  <span className="font-medium" style={{ color: 'var(--color-black)' }}>
                    €{dashboard.available_balance.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Schedule Card */}
        {dashboard.payment_schedule && (
          <div className="mt-6" style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }}>
            <div className="px-6 pt-6 pb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--color-black)' }}>
                <CreditCard className="w-5 h-5" style={{ color: 'var(--color-stone)' }} />
                {t('influencer.paymentSchedule')}
              </h3>
            </div>
            <div className="px-6 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Available to withdraw */}
                <div className="text-center p-4" style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <p className="text-sm mb-1" style={{ color: 'var(--color-stone)' }}>{t('influencer.availableToWithdraw')}</p>
                  <p className="text-2xl font-bold" style={{ color: 'var(--color-black)' }}>€{dashboard.payment_schedule.available_to_withdraw.toFixed(2)}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-stone)' }}>{t('influencer.alreadyPassed15Days')}</p>
                </div>

                {/* Available soon */}
                <div className="text-center p-4" style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <p className="text-sm mb-1" style={{ color: 'var(--color-stone)' }}>{t('influencer.availableSoon')}</p>
                  <p className="text-2xl font-bold" style={{ color: 'var(--color-stone)' }}>€{dashboard.payment_schedule.available_soon.toFixed(2)}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-stone)' }}>{t('influencer.inNext7Days')}</p>
                </div>

                {/* Next payment date */}
                <div className="text-center p-4" style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <p className="text-sm mb-1" style={{ color: 'var(--color-stone)' }}>{t('influencer.nextPaymentDate')}</p>
                  {dashboard.payment_schedule.next_payment_date ? (
                    <>
                      <p className="text-xl font-bold" style={{ color: 'var(--color-stone)' }}>
                        {new Date(dashboard.payment_schedule.next_payment_date).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short'
                        })}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--color-stone)' }}>
                        {t('influencer.daysLeft', { days: Math.ceil((new Date(dashboard.payment_schedule.next_payment_date) - new Date()) / (1000 * 60 * 60 * 24)) })}
                      </p>
                    </>
                  ) : (
                    <p className="text-lg" style={{ color: 'var(--color-stone)' }}>{t('influencer.noPendingPayments')}</p>
                  )}
                </div>
              </div>

              <div className="mt-4 p-3" style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <p className="text-sm" style={{ color: 'var(--color-stone)' }}>
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
            <div className="p-5" style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold" style={{ color: 'var(--color-black)' }}>
                  Resumen fiscal {withholdingSummary?.year || new Date().getFullYear()}
                </h3>
                <button
                  onClick={() => setShowIrpfModal(true)}
                  className="flex items-center gap-1 text-xs font-medium"
                  style={{ color: 'var(--color-stone)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  ¿Qué es la retención?
                </button>
              </div>

              {/* YTD Stats */}
              <div className={`grid ${fiscalStatus?.tax_country === 'ES' ? 'grid-cols-3' : 'grid-cols-2'} gap-3 mb-4`}>
                <div className="text-center p-3" style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-md)' }}>
                  <p className="text-lg font-bold" style={{ color: 'var(--color-black)' }}>
                    {(withholdingSummary?.gross_ytd || 0).toFixed(2)}€
                  </p>
                  <p className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--color-stone)' }}>Comisiones brutas</p>
                </div>
                {fiscalStatus?.tax_country === 'ES' && (
                  <div className="text-center p-3" style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-md)' }}>
                    <p className="text-lg font-bold" style={{ color: 'var(--color-amber)' }}>
                      {(withholdingSummary?.withheld_ytd || 0).toFixed(2)}€
                    </p>
                    <p className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--color-stone)' }}>IRPF retenido (15%)</p>
                  </div>
                )}
                <div className="text-center p-3" style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-md)' }}>
                  <p className="text-lg font-bold" style={{ color: 'var(--color-green)' }}>
                    {(withholdingSummary?.net_ytd || 0).toFixed(2)}€
                  </p>
                  <p className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--color-stone)' }}>Cobrado neto</p>
                </div>
              </div>

              {/* Quarterly breakdown */}
              {withholdingSummary?.by_quarter && Object.keys(withholdingSummary.by_quarter).length > 0 && (
                <>
                  <div className="mb-2" style={{ borderTop: '1px solid var(--color-border)' }} />
                  <div className="grid grid-cols-4 gap-2">
                    {['Q1', 'Q2', 'Q3', 'Q4'].map(q => {
                      const qData = withholdingSummary.by_quarter[q];
                      const currentQ = `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;
                      const isCurrent = q === currentQ;
                      return (
                        <div key={q} className="text-center p-2" style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-md)', border: isCurrent ? '2px solid var(--color-black)' : '1px solid var(--color-border)' }}>
                          <p className="text-[10px] font-bold mb-1" style={{ color: isCurrent ? 'var(--color-black)' : 'var(--color-stone)' }}>{q}</p>
                          {qData ? (
                            <>
                              <p className="text-xs font-semibold" style={{ color: 'var(--color-black)' }}>{qData.gross.toFixed(0)}€</p>
                              {fiscalStatus?.tax_country === 'ES' && (
                                <p className="text-[9px]" style={{ color: 'var(--color-stone)' }}>−{qData.withheld.toFixed(0)}€</p>
                              )}
                            </>
                          ) : (
                            <p className="text-xs" style={{ color: 'var(--color-stone)' }}>—</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Payout method card */}
            <div className="p-4 flex items-center justify-between" style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
              <div className="flex items-center gap-3">
                {fiscalStatus?.payout_method === 'sepa' ? (
                  <Building2 className="w-5 h-5" style={{ color: 'var(--color-stone)' }} />
                ) : (
                  <CreditCard className="w-5 h-5" style={{ color: 'var(--color-stone)' }} />
                )}
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-black)' }}>
                    {fiscalStatus?.payout_method === 'sepa' ? 'Transferencia SEPA' : 'Stripe'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-stone)' }}>
                    {fiscalStatus?.payout_method === 'sepa'
                      ? `···· ${fiscalStatus?.sepa_iban_last4 || '****'}`
                      : (fiscalStatus?.stripe_onboarding_complete ? 'Activo' : 'Pendiente')}
                  </p>
                </div>
              </div>
              <Link to="/influencer/fiscal-setup" className="text-xs font-semibold" style={{ color: 'var(--color-stone)' }}>
                Cambiar
              </Link>
            </div>

            {/* Payout history */}
            {Array.isArray(payoutHistory) && payoutHistory.length > 0 && (
              <div className="p-4" style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
                <p className="text-[10px] uppercase tracking-wider font-bold mb-3" style={{ color: 'var(--color-stone)' }}>Cobros realizados</p>
                <div className="space-y-2">
                  {payoutHistory.slice(0, 5).map((p, i) => (
                    <div key={p.withdrawal_id || i} className="flex items-center justify-between py-2" style={{ borderBottom: i < Math.min(payoutHistory.length, 5) - 1 ? '1px solid var(--color-border)' : 'none' }}>
                      <div>
                        <p className="text-xs font-medium" style={{ color: 'var(--color-black)' }}>
                          {p.created_at ? new Date(p.created_at).toLocaleDateString('es-ES') : '—'}
                        </p>
                        <p className="text-[10px]" style={{ color: 'var(--color-stone)' }}>
                          Bruto: {(p.gross_amount || p.amount || 0).toFixed(2)}€
                          {(p.withholding_amount || 0) > 0 && ` · Ret: ${p.withholding_amount.toFixed(2)}€`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold" style={{ color: 'var(--color-black)' }}>
                          {(p.net_amount || p.amount || 0).toFixed(2)}€
                        </p>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{
                          background: p.status === 'completed' ? 'var(--color-green-light)' : 'var(--color-amber-light)',
                          color: p.status === 'completed' ? 'var(--color-green)' : 'var(--color-amber)',
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
              <div className="p-4 text-center" style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
                <p className="text-[10px] uppercase tracking-wider font-bold mb-2" style={{ color: 'var(--color-stone)' }}>Cobros realizados</p>
                <p className="text-sm" style={{ color: 'var(--color-stone)' }}>Aún no has realizado ningún cobro</p>
              </div>
            )}
          </div>
        )}

        {/* IRPF Modal */}
        {showIrpfModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
            <div className="mx-4 max-w-sm w-full p-6" style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold" style={{ color: 'var(--color-black)' }}>¿Qué es la retención IRPF?</h3>
                <button onClick={() => setShowIrpfModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X className="w-5 h-5" style={{ color: 'var(--color-stone)' }} />
                </button>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-stone)' }}>
                Hispaloshop SL retiene el 15% de tus comisiones y lo ingresa a Hacienda en tu nombre trimestralmente (Modelo 111).
              </p>
              <p className="text-sm leading-relaxed mt-3" style={{ color: 'var(--color-stone)' }}>
                Cuando hagas tu declaración de la renta (IRPF), esas retenciones ya estarán pagadas y podrás deducirlas.
              </p>
              <p className="text-sm leading-relaxed mt-3" style={{ color: 'var(--color-stone)' }}>
                Recibirás el certificado de retenciones en enero de cada año.
              </p>
              <button
                onClick={() => setShowIrpfModal(false)}
                className="w-full mt-5 py-2.5 text-sm font-semibold transition-colors"
                style={{ background: 'var(--color-black)', color: '#fff', borderRadius: 'var(--radius-xl)', border: 'none', cursor: 'pointer' }}
              >
                Entendido
              </button>
            </div>
          </div>
        )}

        {/* Recent Commissions */}
        <div className="mt-6" style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }}>
          <div className="px-6 pt-6 pb-4">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--color-black)' }}>{t('influencer.recentCommissions')}</h3>
          </div>
          <div className="px-6 pb-6">
            {dashboard.recent_commissions?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--color-stone)' }}>{t('orders.orderNumber')}</th>
                      <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--color-stone)' }}>{t('orders.orderTotal')}</th>
                      <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--color-stone)' }}>{t('influencer.commissionRate')}</th>
                      <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--color-stone)' }}>{t('common.status')}</th>
                      <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--color-stone)' }}>{t('influencer.paymentAvailable')}</th>
                      <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--color-stone)' }}>{t('common.date')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.recent_commissions.map((comm) => {
                      const paymentDate = comm.payment_available_date ? new Date(comm.payment_available_date) : null;
                      const now = new Date();
                      const isAvailable = paymentDate && paymentDate <= now;
                      const daysLeft = paymentDate ? Math.ceil((paymentDate - now) / (1000 * 60 * 60 * 24)) : null;

                      return (
                        <tr key={comm.commission_id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td className="py-3 px-4 font-mono text-sm" style={{ color: 'var(--color-black)' }}>{comm.order_id}</td>
                          <td className="py-3 px-4" style={{ color: 'var(--color-black)' }}>€{comm.order_total.toFixed(2)}</td>
                          <td className="py-3 px-4 font-medium" style={{ color: 'var(--color-stone)' }}>
                            €{comm.commission_amount.toFixed(2)}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ background: 'var(--color-surface)', color: 'var(--color-stone)' }}>
                              {comm.commission_status === 'paid' ? t('orders.status.paid') :
                               comm.commission_status === 'pending' ? t('orders.status.pending') :
                               comm.commission_status === 'reversed' ? t('orders.status.reversed', 'Revertido') : comm.commission_status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {comm.commission_status === 'paid' ? (
                              <span className="flex items-center gap-1" style={{ color: 'var(--color-green)' }}>
                                <CheckCircle2 className="w-4 h-4" />
                                {t('influencer.collected')}
                              </span>
                            ) : isAvailable ? (
                              <span className="font-medium flex items-center gap-1" style={{ color: 'var(--color-green)' }}>
                                <CheckCircle2 className="w-4 h-4" />
                                {t('influencer.available')}
                              </span>
                            ) : paymentDate ? (
                              <span style={{ color: 'var(--color-stone)' }}>
                                {daysLeft > 0 ? t('influencer.daysLeft', { days: daysLeft }) : t('influencer.today')}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--color-stone)' }}>-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm" style={{ color: 'var(--color-stone)' }}>
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
                <p style={{ color: 'var(--color-stone)' }}>
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
              <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--color-black)' }}>
                <Handshake className="w-5 h-5" style={{ color: 'var(--color-stone)' }} />
                Colaboraciones
              </h2>
              <Link to="/messages" className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--color-stone)' }}>
                Ver todas <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="space-y-3">
              {collabs.slice(0, 5).map(c => {
                const proposal = c.proposal || {};
                const statusMap = {
                  proposed: { label: 'Pendiente', bg: 'var(--color-surface)', color: 'var(--color-stone)' },
                  active: { label: 'Activa', bg: 'var(--color-green-light)', color: 'var(--color-green)' },
                  declined: { label: 'Rechazada', bg: 'var(--color-red-light)', color: 'var(--color-red)' },
                  sample_sent: { label: 'Muestra enviada', bg: 'var(--color-surface)', color: 'var(--color-stone)' },
                  sample_received: { label: 'Muestra recibida', bg: 'var(--color-green-light)', color: 'var(--color-green)' },
                };
                const badge = statusMap[c.status] || statusMap.proposed;
                return (
                  <Link
                    key={c.collab_id}
                    to={`/messages/${c.conversation_id}`}
                    className="flex items-center gap-3 p-3 transition-colors"
                    style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }}
                  >
                    {proposal.product_image_url && (
                      <img src={proposal.product_image_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--color-black)' }}>{proposal.product_name}</p>
                      <p className="text-xs" style={{ color: 'var(--color-stone)' }}>{proposal.commission_pct}% · {proposal.duration_days} días</p>
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
          <Link to="/" className="text-sm inline-flex items-center gap-2 transition-colors" style={{ color: 'var(--color-stone)' }}>
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
