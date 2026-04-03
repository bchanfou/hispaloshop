// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api/client';
import { Copy, Check, ExternalLink, DollarSign, ShoppingBag, TrendingUp, CreditCard, Home, Percent, Users, AlertCircle, Sparkles, Loader2, Mail, BarChart3, Wallet, ArrowUpRight, Clock, CheckCircle2, HelpCircle, Building2, X, Handshake, ChevronRight, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import InternalChat from '../../components/InternalChat';
import InfluencerAnalytics from '../../components/InfluencerAnalytics';
import TierProgress from '../../components/TierProgress';
import { useTranslation } from 'react-i18next';
import { useInfluencerDiscountCodes, useInfluencerEmailVerification, useInfluencerProfile, useInfluencerStripeStatus, useInfluencerWithdrawal } from '../../features/influencer/hooks';
import { asNumber } from '../../utils/safe';
import { useLocale } from '../../context/LocaleContext';
import i18n from "../../locales/i18n";
const MINIMUM_WITHDRAWAL = 20; // €20 minimum (synced with WithdrawalPage)

// Withdrawal Component
function WithdrawalCard({
  availableToWithdraw,
  stripeConnected,
  hasSEPA,
  onWithdrawSuccess
}) {
  const [showHistory, setShowHistory] = useState(false);
  const {
    withdrawals,
    withdrawing,
    requestWithdrawal,
    refetchWithdrawals
  } = useInfluencerWithdrawal();
  const {
    convertAndFormatPrice
  } = useLocale();
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
      toast.error(error?.message || i18n.t('influencer_dashboard.errorAlProcesarElRetiro', 'Error al procesar el retiro'));
    }
  }, [availableToWithdraw, convertAndFormatPrice, requestWithdrawal, refetchWithdrawals, onWithdrawSuccess]);
  const canWithdraw = stripeConnected && availableToWithdraw >= MINIMUM_WITHDRAWAL;
  return <div className="bg-white shadow-sm rounded-2xl">
      <div className="px-6 pt-6 pb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-stone-950">
          <Wallet className="w-5 h-5 text-stone-500" />
          Retirar Comisiones
        </h3>
      </div>
      <div className="px-6 pb-6">
        <div className="space-y-4">
          {/* Available to withdraw */}
          <div className="text-center p-4 bg-white shadow-sm rounded-xl">
            <p className="text-sm mb-1 text-stone-500">{i18n.t('influencer.availableToWithdraw', 'Disponible para retirar')}</p>
            <p className="text-3xl font-bold text-stone-950">{convertAndFormatPrice(Number(availableToWithdraw || 0))}</p>
            <p className="text-xs mt-1 text-stone-500">{i18n.t('influencer.minimum', 'Mínimo')}: {convertAndFormatPrice(MINIMUM_WITHDRAWAL)}</p>
          </div>

          {/* Withdraw button */}
          {!stripeConnected && !hasSEPA ? <div className="text-center p-3 bg-stone-100 rounded-xl shadow-sm">
              <p className="text-sm text-stone-500">
                Configura un método de cobro en <Link to="/influencer/fiscal-setup" className="font-semibold underline text-stone-950">{i18n.t('influencer_dashboard.configuracionFiscal', 'configuración fiscal')}</Link> para retirar tus comisiones
              </p>
            </div> : !stripeConnected && hasSEPA ? <div className="text-center p-3 bg-stone-100 rounded-xl shadow-sm">
              <p className="text-sm text-stone-500 mb-2">Tienes transferencia SEPA configurada</p>
              <Link to="/influencer/withdraw" className="inline-block px-4 py-2 bg-stone-950 text-white text-sm font-semibold rounded-xl">
                Solicitar cobro →
              </Link>
            </div> : availableToWithdraw < MINIMUM_WITHDRAWAL ? <div className="text-center p-3 bg-stone-100 rounded-xl shadow-sm">
              <p className="text-sm text-stone-500">
                Necesitas {convertAndFormatPrice(Math.max(0, MINIMUM_WITHDRAWAL - Number(availableToWithdraw || 0)))} más para alcanzar el mínimo de retiro
              </p>
            </div> : <button onClick={handleWithdraw} disabled={withdrawing || !canWithdraw} className="w-full px-4 py-2 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 bg-stone-950 text-white rounded-xl">
              {withdrawing ? <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Procesando...
                </> : <>
                  <ArrowUpRight className="w-4 h-4" />
                  Retirar {convertAndFormatPrice(Number(availableToWithdraw || 0))}
                </>}
            </button>}

          {/* Toggle history */}
          {withdrawals.length > 0 && <button onClick={() => setShowHistory(!showHistory)} className="w-full text-sm py-2 transition-colors text-stone-500">
              {showHistory ? 'Ocultar historial' : `Ver historial (${withdrawals.length} retiros)`}
            </button>}

          {/* Withdrawal history */}
          {showHistory && withdrawals.length > 0 && <div className="space-y-2 max-h-48 overflow-y-auto">
              {withdrawals.slice(0, 5).map(wd => <div key={wd.withdrawal_id} className="flex items-center justify-between p-2 rounded bg-white shadow-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-stone-950" />
                    <span className="text-sm font-medium text-stone-950">{convertAndFormatPrice(Number(wd.amount || 0))}</span>
                  </div>
                  <span className="text-xs text-stone-500">
                    {new Date(wd.created_at).toLocaleDateString(undefined)}
                  </span>
                </div>)}
            </div>}
        </div>
      </div>
    </div>;
}

// Email Verification Component
function EmailVerificationBanner({
  user,
  onVerified
}) {
  const [code, setCode] = useState('');
  const {
    verifying,
    resending,
    verifyEmailCode,
    resendVerificationCode
  } = useInfluencerEmailVerification();
  const handleVerify = async () => {
    if (!code || code.length !== 6) {
      toast.error(i18n.t('influencer_dashboard.introduceElCodigoDe6Digitos', 'Introduce el código de 6 dígitos'));
      return;
    }
    try {
      await verifyEmailCode(code);
      toast.success(i18n.t('influencer_dashboard.emailVerificado', '¡Email verificado!'));
      onVerified();
    } catch (error) {
      toast.error(error?.message || i18n.t('influencer_dashboard.codigoInvalido', 'Código inválido'));
    }
  };
  const handleResend = async () => {
    try {
      await resendVerificationCode();
      toast.success(i18n.t('influencer_dashboard.codigoEnviadoATuEmail', 'Código enviado a tu email'));
    } catch (error) {
      toast.error(error?.message || i18n.t('influencer_dashboard.errorAlEnviarCodigo', 'Error al enviar código'));
    }
  };
  return <div className="p-6 mb-6 bg-stone-100 shadow-sm rounded-xl">
      <div className="flex items-start gap-4">
        <Mail className="w-6 h-6 flex-shrink-0 mt-1 text-stone-500" />
        <div className="flex-1">
          <h3 className="font-semibold mb-2 text-stone-950">{i18n.t('auth.verifyEmail', 'Verifica tu email')}</h3>
          <p className="text-sm mb-4 text-stone-500">
            {i18n.t('influencer.verifyEmailDesc', 'Hemos enviado un código de 6 dígitos a')} <strong>{user?.email}</strong>.
            {i18n.t('influencer.enterCodeToActivate', 'Introdúcelo aquí para activar tu cuenta.')}
          </p>
          <div className="flex items-center gap-3">
            <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" className="w-32 px-3 py-2 text-center text-xl tracking-widest font-mono border border-stone-200 rounded-xl text-stone-950 bg-white outline-none" maxLength={6} />
            <button onClick={handleVerify} disabled={verifying || code.length !== 6} className="px-4 py-2 transition-colors disabled:opacity-50 bg-stone-950 text-white rounded-xl">
              {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verificar'}
            </button>
            <button onClick={handleResend} disabled={resending} className="px-4 py-2 transition-colors border border-stone-200 text-stone-500 rounded-xl bg-white">
              {resending ? i18n.t('common.sending', 'Enviando...') : i18n.t('influencer.resendCode', 'Reenviar código')}
            </button>
          </div>
        </div>
      </div>
    </div>;
}

// Create Code Component
const DISCOUNT_OPTIONS = [5, 10, 15, 20];
function CreateCodeCard({
  onCodeCreated
}) {
  const [code, setCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(10);
  const [showForm, setShowForm] = useState(false);
  const {
    creatingCode,
    createDiscountCode
  } = useInfluencerDiscountCodes();
  const handleCreate = async () => {
    if (!code || code.length < 3) {
      toast.error(i18n.t('influencer_dashboard.elCodigoDebeTenerAlMenos3Caracter', 'El código debe tener al menos 3 caracteres'));
      return;
    }
    try {
      const res = await createDiscountCode(code, discountPercent);
      toast.success(res?.message || i18n.t('influencer_dashboard.codigoCreado', 'Código creado'));
      onCodeCreated(res?.code || code);
      setCode('');
      setShowForm(false);
    } catch (error) {
      toast.error(error?.message || i18n.t('influencer_dashboard.errorAlCrearCodigo', 'Error al crear código'));
    }
  };
  return <div className="bg-white shadow-sm rounded-2xl">
      <div className="px-6 pt-6 pb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-stone-950">
          <Sparkles className="w-5 h-5 text-stone-500" />
          {i18n.t('influencer.discountCodes', 'Códigos de descuento')}
        </h3>
        {!showForm && <button onClick={() => setShowForm(true)} className="text-sm px-4 py-1.5 rounded-full bg-stone-950 text-white transition-colors">
            {i18n.t('influencer.createCode', 'Crear código')}
          </button>}
      </div>
      {showForm && <div className="px-6 pb-6">
          <p className="text-sm mb-4 text-stone-500">
            {i18n.t('influencer.chooseCodeDesc', 'Elige un código personalizado y el porcentaje de descuento para tu comunidad.')}
          </p>
          {/* Discount % selector pills */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-stone-500">Descuento:</span>
            {DISCOUNT_OPTIONS.map(pct => <button key={pct} onClick={() => setDiscountPercent(pct)} className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${discountPercent === pct ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
                {pct}%
              </button>)}
          </div>
          {/* Code input + submit */}
          <div className="flex items-center gap-3">
            <input value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20))} placeholder="Ej: MARIA10" className="flex-1 px-3 py-2 uppercase text-lg font-mono border border-stone-200 rounded-xl text-stone-950 bg-white outline-none" maxLength={20} />
            <button onClick={handleCreate} disabled={creatingCode || code.length < 3} className="px-4 py-2 transition-colors disabled:opacity-50 bg-stone-950 text-white rounded-xl">
              {creatingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear'}
            </button>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-stone-500">
              {i18n.t('influencer.codeHint', 'Solo letras y números, entre 3-20 caracteres')}
            </p>
            <button onClick={() => setShowForm(false)} className="text-xs text-stone-400 hover:text-stone-600 transition-colors">
              {i18n.t('common.cancel', 'Cancelar')}
            </button>
          </div>
        </div>}
    </div>;
}

// Discount Codes List Component
function DiscountCodesList({
  codes,
  convertAndFormatPrice
}) {
  const [copiedCode, setCopiedCode] = useState(null);
  const copyTimerRef = React.useRef(null);
  const handleCopy = useCallback(code => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(i18n.t('influencer_dashboard.codigoCopiado', 'Código copiado'));
    clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopiedCode(null), 2000);
  }, []);
  if (!codes || codes.length === 0) {
    return <div className="bg-white shadow-sm rounded-2xl">
        <div className="px-6 pt-6 pb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-stone-950">
            <Tag className="w-5 h-5 text-stone-500" />
            Mis códigos de descuento
          </h3>
        </div>
        <div className="px-6 pb-6 text-center py-4">
          <p className="text-sm text-stone-500">{i18n.t('influencer_dashboard.creaTuPrimerCodigoDeDescuento', 'Crea tu primer código de descuento')}</p>
        </div>
      </div>;
  }
  return <div className="bg-white shadow-sm rounded-2xl">
      <div className="px-6 pt-6 pb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-stone-950">
          <Tag className="w-5 h-5 text-stone-500" />
          Mis códigos de descuento
        </h3>
      </div>
      <div className="px-6 pb-6 space-y-2">
        {codes.map((dc, i) => <div key={dc.code_id || dc.code || i} className="rounded-2xl shadow-sm p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* Code pill */}
              <span className="bg-stone-100 rounded-full px-3 py-1 font-mono text-sm font-semibold text-stone-950 truncate">
                {dc.code}
              </span>
              {/* Discount % badge */}
              <span className="text-xs font-medium text-stone-500">
                {dc.value || 10}%
              </span>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right">
                <p className="text-xs text-stone-500">Usos</p>
                <p className="text-sm font-semibold text-stone-950">{dc.usage_count ?? dc.uses ?? 0}</p>
              </div>
              {/* Copy button */}
              <button onClick={() => handleCopy(dc.code)} className="p-2 rounded-full transition-colors bg-stone-100 hover:bg-stone-200 text-stone-600" title={i18n.t('influencer.copyCode', 'Copiar código')}>
                {copiedCode === dc.code ? <Check className="w-4 h-4 text-stone-950" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>)}
      </div>
    </div>;
}
export default function InfluencerDashboard() {
  const navigate = useNavigate();
  const {
    user,
    refreshUser
  } = useAuth();
  const {
    t
  } = useTranslation();
  const {
    convertAndFormatPrice
  } = useLocale();
  const {
    dashboard,
    loading,
    refetchDashboard
  } = useInfluencerProfile();
  const {
    stripeStatus,
    connectingStripe,
    connectStripe: connectStripeAccount
  } = useInfluencerStripeStatus();
  const [copied, setCopied] = useState(false);
  const [emailVerified, setEmailVerified] = useState(user?.email_verified);
  const [productPerformance, setProductPerformance] = useState([]);
  const [fiscalStatus, setFiscalStatus] = useState(null);
  const [withholdingSummary, setWithholdingSummary] = useState(null);
  const [payoutHistory, setPayoutHistory] = useState([]);
  const [showIrpfModal, setShowIrpfModal] = useState(false);
  const [collabs, setCollabs] = useState([]);
  const [discountCodes, setDiscountCodes] = useState([]);
  const [kpiStats, setKpiStats] = useState(null);
  useEffect(() => {
    if (user) {
      setEmailVerified(user.email_verified);
    }
  }, [user]);
  useEffect(() => {
    let active = true;
    let errCount = 0;
    const logFetchErr = label => err => {
      errCount++;
      if (process.env.NODE_ENV === 'development') console.error(`[Dashboard] ${label}:`, err);
      if (errCount >= 3 && active) toast.error('Algunos datos no se pudieron cargar');
    };
    apiClient.get('/collaborations').then(d => {
      if (active) setCollabs(d?.collaborations || []);
    }).catch(logFetchErr('collaborations'));
    apiClient.get('/influencer/discount-codes').then(d => {
      if (active) setDiscountCodes(d?.codes || d || []);
    }).catch(logFetchErr('discount-codes'));
    apiClient.get('/intelligence/influencer-performance').then(data => {
      if (active) setProductPerformance(data?.items || []);
    }).catch(err => {
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
    apiClient.get('/influencer/stats').then(d => {
      if (active) setKpiStats(d);
    }).catch(logFetchErr('kpi-stats'));
    return () => {
      active = false;
      clearTimeout(copyTimerRef.current);
      clearTimeout(discountCopyTimerRef.current);
    };
  }, []);
  const handleEmailVerified = useCallback(() => {
    setEmailVerified(true);
    if (refreshUser) refreshUser();
  }, [refreshUser]);
  const handleCodeCreated = useCallback(_newCode => {
    refetchDashboard();
    apiClient.get('/influencer/discount-codes').then(d => {
      setDiscountCodes(d?.codes || d || []);
    }).catch(() => {});
  }, [refetchDashboard]);
  const scrollToWithdrawals = useCallback(() => {
    const withdrawalSection = document.getElementById('withdrawal-card-section');
    withdrawalSection?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }, []);
  const discountCopyTimerRef = React.useRef(null);
  const copyDiscountCode = useCallback(() => {
    if (dashboard?.discount_code) {
      navigator.clipboard.writeText(dashboard.discount_code);
      setCopied(true);
      toast.success(t('influencer.codeCopied', '¡Código copiado!'));
      clearTimeout(discountCopyTimerRef.current);
      discountCopyTimerRef.current = setTimeout(() => setCopied(false), 2000);
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
    return <div className="min-h-screen bg-stone-50">
        <div className="max-w-[975px] mx-auto px-4 py-4 md:py-8 space-y-6">
          <div className="h-8 w-48 bg-stone-100 rounded-2xl animate-pulse" />
          <div className="h-4 w-32 bg-stone-100 rounded animate-pulse" />
          <div className="h-28 bg-stone-950 rounded-2xl animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="bg-white rounded-2xl shadow-sm p-4 space-y-2 animate-pulse">
                <div className="h-3 w-16 bg-stone-100 rounded" />
                <div className="h-6 w-20 bg-stone-100 rounded" />
              </div>)}
          </div>
          <div className="h-48 bg-white rounded-2xl shadow-sm animate-pulse" />
        </div>
      </div>;
  }
  if (!dashboard) {
    return <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="max-w-md bg-white rounded-2xl shadow-sm">
          <div className="p-8 text-center">
            <h2 className="text-xl font-medium mb-4 text-stone-950">{t('influencer.notInfluencer')}</h2>
            <p className="text-stone-500">
              {t('influencer.notInfluencerDesc')}
            </p>
          </div>
        </div>
      </div>;
  }
  const tierPercent = Number(dashboard.commission_value || (dashboard.commission_rate || 0) * 100 || 0);
  const influencerExampleAmount = Math.round(18 * tierPercent / 100 * 100) / 100;
  return <div className="min-h-screen bg-stone-50">
      <div className="max-w-[975px] mx-auto px-4 py-4 md:py-8">
        {/* Header — H1 with influencer name at top */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-stone-950">
            {dashboard.full_name || t('influencer.dashboard')}
          </h1>
          <p className="mt-1 text-sm md:text-base text-stone-500">
            {dashboard.current_tier && <span className="font-semibold text-stone-950">{dashboard.current_tier} · {tierPercent}%</span>}
            {dashboard.current_tier && ' · '}{t('influencer.dashboard')}
          </p>
        </div>

        {/* Hero Balance Card */}
        <div className="mb-6 bg-stone-950 text-white rounded-2xl p-5">
          <p className="text-xs text-white/60 mb-1">Balance total</p>
          <p className="text-xl font-bold">{convertAndFormatPrice(asNumber(dashboard.available_balance) + asNumber(dashboard.payment_schedule?.available_soon) + asNumber(dashboard.payment_schedule?.in_transit))}</p>

          {/* Balance breakdown rows */}
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50">Disponible</span>
              <span className="text-sm font-semibold">{convertAndFormatPrice(asNumber(dashboard.available_balance))}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50">{t('influencer_dashboard.pendiente15Dias', 'Pendiente 15 días')}</span>
              <span className="text-sm font-semibold">{convertAndFormatPrice(asNumber(dashboard.payment_schedule?.available_soon))}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50">{t('influencer_dashboard.enTransito', 'En tránsito')}</span>
              <span className="text-sm font-semibold">{convertAndFormatPrice(asNumber(dashboard.payment_schedule?.in_transit))}</span>
            </div>
          </div>

          {(dashboard.available_balance || 0) >= MINIMUM_WITHDRAWAL && <button onClick={() => navigate('/influencer/withdraw')} className="mt-3 text-xs bg-white text-stone-950 px-4 py-1.5 rounded-full font-medium">
              Retirar fondos
            </button>}
        </div>

        {/* Compact Tier Progress */}
        {dashboard.current_tier && <div className="mb-6 p-4 rounded-2xl bg-white shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Nivel actual: <span className="text-stone-950">{dashboard.current_tier}</span>
              </p>
              {tierPercent > 0 && <p className="text-xs font-bold text-stone-950">{tierPercent}% comisión</p>}
            </div>
            {dashboard.tier_progress !== undefined && <div className="h-1.5 rounded-full overflow-hidden bg-stone-100">
                <div className="h-full rounded-full transition-all duration-500 bg-stone-950" style={{
            width: `${Math.min(100, dashboard.tier_progress || 0)}%`
          }} />
              </div>}
          </div>}

        {/* Email Verification Banner */}
        {!emailVerified && <EmailVerificationBanner user={user} onVerified={handleEmailVerified} />}

        {/* Status Banner - Pending Approval */}
        {dashboard.status === 'pending' && <div className="mb-4 p-4 md:mb-6 md:p-6 rounded-2xl shadow-sm bg-stone-100">
            <div className="flex items-start gap-3 md:gap-4">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 md:h-6 md:w-6 text-stone-500" />
              <div>
                <h3 className="mb-1 text-sm font-semibold md:mb-2 md:text-base text-stone-950">{t('influencer.pendingApproval')}</h3>
                <p className="text-xs md:text-sm text-stone-500">
                  {t('influencer.pendingApprovalDesc')}
                </p>
                <p className="mt-2 text-xs md:text-sm text-stone-500">
                  <strong>{t('influencer.estimatedTime')}</strong>
                </p>
              </div>
            </div>
          </div>}

        {/* Status Banner - Other statuses */}
        {dashboard.status !== 'active' && dashboard.status !== 'pending' && <div className="mb-4 p-3 md:mb-6 md:p-4 rounded-2xl shadow-sm bg-stone-100">
            <p className="text-sm text-stone-500">
              {t('influencer.accountStatus')} <strong>{dashboard.status}</strong>.
              {dashboard.status === 'suspended' && ` ${t('influencer.accountSuspended')}`}
            </p>
          </div>}

        {/* === KPI CARDS ROW === */}
        {kpiStats && <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="rounded-2xl shadow-sm bg-white p-4">
              <p className="text-xs text-stone-500 mb-1">GMV 30d</p>
              <p className="text-xl font-bold text-stone-950">{convertAndFormatPrice(Number(kpiStats.gmv_30d || 0))}</p>
            </div>
            <div className="rounded-2xl shadow-sm bg-white p-4">
              <p className="text-xs text-stone-500 mb-1">Atribuciones activas</p>
              <p className="text-xl font-bold text-stone-950">{kpiStats.active_attributions || 0}</p>
            </div>
            <div className="rounded-2xl shadow-sm bg-white p-4">
              <p className="text-xs text-stone-500 mb-1">Comisiones pendientes</p>
              <p className="text-xl font-bold text-stone-950">{convertAndFormatPrice(Number(kpiStats.pending_eur || 0))}</p>
            </div>
            <div className="rounded-2xl shadow-sm bg-white p-4">
              <p className="text-xs text-stone-500 mb-1">Total cobrado</p>
              <p className="text-xl font-bold text-stone-950">{convertAndFormatPrice(Number(kpiStats.paid_total_eur || 0))}</p>
            </div>
          </div>}

        {/* Product Performance */}
        <div id="analytics-section" className="mb-6 bg-white shadow-sm rounded-2xl">
          <div className="px-6 pt-6 pb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-stone-950">
              <BarChart3 className="h-5 w-5 text-stone-500" />
              Productos que mejor funcionan en tu contenido
            </h3>
          </div>
          <div className="px-6 pb-6 space-y-3">
            {productPerformance.length > 0 ? productPerformance.map(item => <div key={`${item.content_type}-${item.content_id}`} className="flex items-center justify-between px-4 py-3 rounded-2xl shadow-sm bg-stone-100">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-stone-950">{item.title || item.content_id}</p>
                  <p className="mt-1 text-xs capitalize text-stone-500">{item.content_type}</p>
                </div>
                <div className="grid grid-cols-3 gap-4 text-right text-xs text-stone-500">
                  <div><p className="font-semibold text-stone-950">{item.views}</p><p>Vistas</p></div>
                  <div><p className="font-semibold text-stone-950">{item.clicks}</p><p>Clics</p></div>
                  <div><p className="font-semibold text-stone-950">{item.sales}</p><p>Ventas</p></div>
                </div>
              </div>) : <p className="text-sm text-stone-500">{t('influencer_dashboard.publicaContenidoConProductosVinculad', 'Publica contenido con productos vinculados para empezar a ver rendimiento.')}</p>}
          </div>
        </div>

        {/* Create Code Card - Only show if active and no code yet */}
        {dashboard.status === 'active' && !dashboard.discount_code && <div className="mb-4 md:mb-6">
            <CreateCodeCard onCodeCreated={handleCodeCreated} />
          </div>}

        {/* Discount Codes List */}
        <div className="mb-4 md:mb-6">
          <DiscountCodesList codes={discountCodes} convertAndFormatPrice={convertAndFormatPrice} />
        </div>

        {/* Tier Progress */}
        <TierProgress />

        {/* === CODE HERO - pending === */}
        {dashboard.discount_code && dashboard.discount_code_approval_status === 'pending' && <div className="mb-6 p-6 text-center rounded-2xl shadow-sm bg-stone-100" data-testid="code-pending">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest bg-white text-stone-500">
                <span className="h-2 w-2 rounded-full animate-pulse bg-stone-950" />
                Pendiente de aprobación
              </span>
            </div>
            <p className="mb-3 text-3xl font-semibold tracking-tight md:text-4xl text-stone-950" data-testid="influencer-code-pending">
              {dashboard.discount_code}
            </p>
            <p className="text-sm text-stone-500">
              Tu código está siendo revisado por el equipo de Hispaloshop. Lo aprobaremos en menos de 24h.
            </p>
          </div>}

        {/* === CODE HERO - active === */}
        {dashboard.discount_code && dashboard.discount_code_active && <div className="mb-6 p-6 text-center rounded-2xl shadow-sm bg-white" data-testid="code-hero">
            <p className="mb-2 text-xs uppercase tracking-widest text-stone-500">{t('influencerDashboard.yourCode', 'Tu código')}</p>
            <p className="mb-4 text-4xl font-semibold tracking-tight md:text-5xl font-mono text-stone-950" data-testid="influencer-code">
              {dashboard.discount_code}
            </p>
            <div className="flex justify-center gap-3 mb-4">
              <button onClick={() => {
            navigator.clipboard.writeText(dashboard.discount_code);
            toast.success(t('influencer_dashboard.codigoCopiado', 'Código copiado'));
          }} className="rounded-full px-6 py-2 flex items-center gap-2 transition-colors bg-stone-950 text-white" data-testid="copy-code-btn">
                <Copy className="w-4 h-4" /> Copiar
              </button>
              <button onClick={() => {
            if (navigator.share) navigator.share({
              title: t('influencer_dashboard.miCodigoHispaloshop', 'Mi código Hispaloshop'),
              text: `Usa mi código ${dashboard.discount_code} para descuento en hispaloshop.com`
            });else {
              navigator.clipboard.writeText(`Usa mi código ${dashboard.discount_code} en hispaloshop.com`);
              toast.success('Link copiado');
            }
          }} className="rounded-full px-6 py-2 transition-colors border border-stone-200 text-stone-500 bg-white">
                Compartir
              </button>
            </div>
            <p className="text-xs text-stone-500">Tu comunidad ahorra {dashboard.discount_value || 10}% con este código</p>
          </div>}

        {/* === Stats grid 3 cols === */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="p-4 text-center bg-white shadow-sm rounded-2xl">
            <p className="text-2xl font-bold text-stone-950">{convertAndFormatPrice(asNumber(dashboard.total_sales_generated))}</p>
            <p className="text-xs mt-1 text-stone-500">{t('influencer.totalSales')}</p>
          </div>
          <div className="p-4 text-center bg-white shadow-sm rounded-2xl">
            <p className="text-2xl font-bold text-stone-950">{convertAndFormatPrice(asNumber(dashboard.total_commission_earned))}</p>
            <p className="text-xs mt-1 text-stone-500">{t('influencer_dashboard.comisionTotal', 'Comisión total')}</p>
          </div>
          <div className="p-4 text-center bg-white shadow-sm rounded-2xl">
            <p className="text-2xl font-bold text-stone-950">{`${tierPercent}%`}</p>
            <p className="text-xs mt-1 text-stone-500">{t('influencer_dashboard.tasaDeComision', 'Tasa de comisión')}</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Discount Code Card */}
          <div className="lg:col-span-1 bg-white shadow-sm rounded-2xl">
            <div className="px-6 pt-6 pb-4">
              <h3 className="text-lg font-semibold text-stone-950">{t('influencer.discountCode')}</h3>
            </div>
            <div className="px-6 pb-6">
              {dashboard.discount_code ? <>
                  <div className="p-4 text-center mb-4 bg-stone-100 border border-dashed border-stone-200 rounded-xl">
                    <p className="text-3xl font-bold tracking-wider font-mono text-stone-950">
                      {dashboard.discount_code}
                    </p>
                  </div>
                  <button onClick={copyDiscountCode} className="w-full px-4 py-2 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 bg-stone-950 text-white rounded-xl">
                    {copied ? <>
                        <Check className="h-4 w-4" />
                        {t('common.copied')}
                      </> : <>
                        <Copy className="h-4 w-4" />
                        {t('influencer.copyCode')}
                      </>}
                  </button>
                  <p className="text-sm text-center mt-3 text-stone-500">
                    {t('influencer.shareCode')}
                  </p>
                </> : dashboard.status === 'active' ? <div className="text-center py-4">
                  <p className="text-sm text-stone-500">
                    {t('influencer.useFormAbove')}
                  </p>
                </div> : <div className="text-center py-4">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-stone-500" />
                  <p className="text-sm text-stone-500">
                    {t('influencer.canCreateWhenApproved')}
                  </p>
                </div>}
            </div>
          </div>

          {/* Stripe Connect Card */}
          <div className="lg:col-span-1 bg-white shadow-sm rounded-2xl">
            <div className="px-6 pt-6 pb-4">
              <h3 className="text-lg font-semibold text-stone-950">{t('influencer.paymentSetup')}</h3>
            </div>
            <div className="px-6 pb-6">
              {stripeStatus?.connected && stripeStatus?.onboarding_complete ? <div className="text-center">
                  <div className="h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-stone-100">
                    <Check className="h-8 w-8 text-stone-950" />
                  </div>
                  <p className="font-medium text-stone-950">{t('influencer.stripeConnected')}</p>
                  <p className="text-sm mt-2 text-stone-500">
                    {t('influencer.shareCode')}
                  </p>
                  <div className="mt-4 text-sm flex items-center gap-2 text-stone-500">
                    <span>{t('influencer.payoutsEnabled')}:</span>
                    {stripeStatus.payouts_enabled ? <CheckCircle2 className="w-4 h-4 text-stone-950" /> : <AlertCircle className="w-4 h-4 text-stone-500" />}
                  </div>
                </div> : <div className="text-center">
                  <p className="mb-4 text-stone-500">
                    {t('influencer.connectStripe')}
                  </p>
                  <button onClick={connectStripe} disabled={connectingStripe} className="w-full px-4 py-2 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 bg-stone-950 text-white rounded-xl">
                    {connectingStripe ? t('common.loading') : <>
                        <ExternalLink className="h-4 w-4" />
                        {t('influencer.connectStripe')}
                      </>}
                  </button>
                </div>}
            </div>
          </div>

          {/* Commission Summary */}
          <div className="lg:col-span-1 bg-white shadow-sm rounded-2xl">
            <div className="px-6 pt-6 pb-4">
              <h3 className="text-lg font-semibold text-stone-950">{t('influencer.commissionSummary')}</h3>
            </div>
            <div className="px-6 pb-6">
              <div className="space-y-4">
                {/* How commission works */}
                <div className="p-3 mb-4 bg-stone-100 shadow-sm rounded-xl">
                  <p className="text-xs font-medium mb-2 text-stone-500">Info · {t('influencer.howCommissionWorks')}</p>
                  <p className="text-xs text-stone-500">
                    {t('influencer.commissionExplanation', {
                    percent: dashboard.commission_value
                  })}
                  </p>
                  <div className="mt-2 text-xs p-2 text-stone-500 bg-white rounded-xl">
                    <p className="font-medium">{t('influencer.example')}:</p>
                    <p>- {t('influencer.sale')}: {convertAndFormatPrice(100)}</p>
                    <p>- {t('influencer.sellerReceives')}: {convertAndFormatPrice(82)}</p>
                    <p>- {t('influencer.platformFee')}: {convertAndFormatPrice(18)}</p>
                    <p>- <strong>{t('influencer.yourCommission')}: {convertAndFormatPrice(influencerExampleAmount)}</strong> ({tierPercent}% de {convertAndFormatPrice(18)})</p>
                  </div>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-stone-200">
                  <span className="text-stone-500">{t('influencer.pendingOrders')}</span>
                  <span className="font-medium text-stone-950">{dashboard.pending_commissions} {t('orders.orders', 'pedidos')}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-stone-200">
                  <span className="text-stone-500">{t('influencer.paidOrders')}</span>
                  <span className="font-medium text-stone-950">{dashboard.paid_commissions} {t('orders.orders', 'pedidos')}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-stone-500">{t('influencer.available')}</span>
                  <span className="font-medium text-stone-950">
                    {convertAndFormatPrice(Number(dashboard.available_balance || 0))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Schedule Card */}
        {dashboard.payment_schedule && <div id="payments-section" className="mt-6 bg-white shadow-sm rounded-2xl">
            <div className="px-6 pt-6 pb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-stone-950">
                <CreditCard className="w-5 h-5 text-stone-500" />
                {t('influencer.paymentSchedule')}
              </h3>
            </div>
            <div className="px-6 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Available to withdraw */}
                <div className="text-center p-4 bg-white rounded-xl shadow-sm">
                  <p className="text-sm mb-1 text-stone-500">{t('influencer.availableToWithdraw')}</p>
                  <p className="text-2xl font-bold text-stone-950">{convertAndFormatPrice(Number(dashboard.payment_schedule.available_to_withdraw || 0))}</p>
                  <p className="text-xs mt-1 text-stone-500">{t('influencer.alreadyPassed15Days')}</p>
                </div>

                {/* Available soon */}
                <div className="text-center p-4 bg-white rounded-xl shadow-sm">
                  <p className="text-sm mb-1 text-stone-500">{t('influencer.availableSoon')}</p>
                  <p className="text-2xl font-bold text-stone-500">{convertAndFormatPrice(Number(dashboard.payment_schedule.available_soon || 0))}</p>
                  <p className="text-xs mt-1 text-stone-500">{t('influencer.inNext7Days')}</p>
                </div>

                {/* Next payment date */}
                <div className="text-center p-4 bg-white rounded-xl shadow-sm">
                  <p className="text-sm mb-1 text-stone-500">{t('influencer.nextPaymentDate')}</p>
                  {(() => {
                const npd = dashboard.payment_schedule.next_payment_date ? new Date(dashboard.payment_schedule.next_payment_date) : null;
                const npdValid = npd && !isNaN(npd.getTime());
                return npdValid ? <>
                      <p className="text-xl font-bold text-stone-500">
                        {npd.toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'short'
                    })}
                      </p>
                      <p className="text-xs mt-1 text-stone-500">
                        {t('influencer.daysLeft', {
                      days: Math.max(0, Math.ceil((npd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                    })}
                      </p>
                    </> : <p className="text-lg text-stone-500">{t('influencer.noPendingPayments')}</p>;
              })()}
                </div>
              </div>

              <div className="mt-4 p-3 bg-white rounded-xl shadow-sm">
                <p className="text-sm text-stone-500">
                  <strong>Info · {t('influencer.paymentPolicy')}:</strong> {t('influencer.paymentPolicyDesc')}
                </p>
              </div>
            </div>
          </div>}

        {/* Withdrawal Card */}
        {dashboard.status === 'active' && dashboard.payment_schedule && <div id="withdrawal-card-section" className="mt-6">
            <WithdrawalCard availableToWithdraw={dashboard.payment_schedule.available_to_withdraw} stripeConnected={stripeStatus?.connected && stripeStatus?.onboarding_complete} hasSEPA={['sepa', 'bank_transfer'].includes(fiscalStatus?.payout_method)} onWithdrawSuccess={refetchDashboard} />
          </div>}

        {/* Fiscal Section — only if certificate verified */}
        {fiscalStatus?.certificate_verified && <div className="mt-6 space-y-4">
            {/* Fiscal Summary Card */}
            <div className="p-5 bg-stone-100 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-stone-950">
                  Resumen fiscal {withholdingSummary?.year || new Date().getFullYear()}
                </h3>
                <button onClick={() => setShowIrpfModal(true)} className="flex items-center gap-1 text-xs font-medium text-stone-500 bg-transparent border-none cursor-pointer">
                  <HelpCircle className="w-3.5 h-3.5" />
                  ¿Qué es la retención?
                </button>
              </div>

              {/* YTD Stats */}
              <div className={`grid ${fiscalStatus?.tax_country === 'ES' ? 'grid-cols-3' : 'grid-cols-2'} gap-3 mb-4`}>
                <div className="text-center p-3 bg-white rounded-xl">
                  <p className="text-lg font-bold text-stone-950">
                    {convertAndFormatPrice(Number(withholdingSummary?.gross_ytd || 0))}
                  </p>
                  <p className="text-[9px] uppercase tracking-wider text-stone-500">Comisiones brutas</p>
                </div>
                {fiscalStatus?.tax_country === 'ES' && <div className="text-center p-3 bg-white rounded-xl">
                    <p className="text-lg font-bold text-stone-500">
                      {convertAndFormatPrice(Number(withholdingSummary?.withheld_ytd || 0))}
                    </p>
                    <p className="text-[9px] uppercase tracking-wider text-stone-500">IRPF retenido (15%)</p>
                  </div>}
                <div className="text-center p-3 bg-white rounded-xl">
                  <p className="text-lg font-bold text-stone-950">
                    {convertAndFormatPrice(Number(withholdingSummary?.net_ytd || 0))}
                  </p>
                  <p className="text-[9px] uppercase tracking-wider text-stone-500">Cobrado neto</p>
                </div>
              </div>

              {/* Quarterly breakdown */}
              {withholdingSummary?.by_quarter && Object.keys(withholdingSummary.by_quarter).length > 0 && <>
                  <div className="mb-2 border-t border-stone-200" />
                  <div className="grid grid-cols-4 gap-2">
                    {['Q1', 'Q2', 'Q3', 'Q4'].map(q => {
                const qData = withholdingSummary.by_quarter[q];
                const currentQ = `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;
                const isCurrent = q === currentQ;
                return <div key={q} className={`text-center p-2 bg-white rounded-xl ${isCurrent ? 'border-2 border-stone-950' : 'border border-stone-200'}`}>
                          <p className={`text-[10px] font-bold mb-1 ${isCurrent ? 'text-stone-950' : 'text-stone-500'}`}>{q}</p>
                          {qData ? <>
                              <p className="text-xs font-semibold text-stone-950">{convertAndFormatPrice(Number(qData.gross || 0))}</p>
                              {fiscalStatus?.tax_country === 'ES' && <p className="text-[9px] text-stone-500">−{convertAndFormatPrice(Number(qData.withheld || 0))}</p>}
                            </> : <p className="text-xs text-stone-500">—</p>}
                        </div>;
              })}
                  </div>
                </>}
            </div>

            {/* Payout method card */}
            <div className="p-4 flex items-center justify-between bg-white rounded-2xl shadow-sm">
              <div className="flex items-center gap-3">
                {['sepa', 'bank_transfer'].includes(fiscalStatus?.payout_method) ? <Building2 className="w-5 h-5 text-stone-500" /> : <CreditCard className="w-5 h-5 text-stone-500" />}
                <div>
                  <p className="text-sm font-semibold text-stone-950">
                    {['sepa', 'bank_transfer'].includes(fiscalStatus?.payout_method) ? 'Transferencia SEPA' : 'Stripe'}
                  </p>
                  <p className="text-xs text-stone-500">
                    {['sepa', 'bank_transfer'].includes(fiscalStatus?.payout_method) ? `···· ${fiscalStatus?.sepa_iban_last4 || '****'}` : fiscalStatus?.stripe_onboarding_complete ? 'Activo' : 'Pendiente'}
                  </p>
                </div>
              </div>
              <Link to="/influencer/fiscal-setup" className="text-xs font-semibold text-stone-500">
                Cambiar
              </Link>
            </div>

            {/* Payout history */}
            {Array.isArray(payoutHistory) && payoutHistory.length > 0 && <div className="p-4 bg-white rounded-2xl shadow-sm">
                <p className="text-[10px] uppercase tracking-wider font-bold mb-3 text-stone-500">Cobros realizados</p>
                <div className="space-y-2">
                  {payoutHistory.slice(0, 5).map((p, i) => <div key={p.id || i} className={`flex items-center justify-between py-2 ${i < Math.min(payoutHistory.length, 5) - 1 ? 'border-b border-stone-200' : ''}`}>
                      <div>
                        <p className="text-xs font-medium text-stone-950">
                          {p.paid_at || p.created_at ? new Date(p.paid_at || p.created_at).toLocaleDateString(undefined) : '—'}
                        </p>
                        <p className="text-[10px] text-stone-500">
                          {p.commission_count > 0 && `${p.commission_count} ventas`}
                          {(p.withholding_amount_eur || 0) > 0 && ` · Ret: ${convertAndFormatPrice(Number(p.withholding_amount_eur || 0))}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-stone-950">
                          {convertAndFormatPrice(Number(p.net_amount_eur || 0))}
                        </p>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 ${p.status === 'completed' ? 'text-stone-950' : p.status === 'failed' ? 'text-stone-400' : 'text-stone-500'}`}>
                          {p.status === 'completed' ? 'Pagado' : p.status === 'failed' ? 'Fallido' : 'Procesando'}
                        </span>
                      </div>
                    </div>)}
                </div>
              </div>}
            {Array.isArray(payoutHistory) && payoutHistory.length === 0 && <div className="p-4 text-center bg-white rounded-2xl shadow-sm">
                <p className="text-[10px] uppercase tracking-wider font-bold mb-2 text-stone-500">Cobros realizados</p>
                <p className="text-sm text-stone-500">{t('influencer_dashboard.aunNoHasRealizadoNingunCobro', 'Aún no has realizado ningún cobro')}</p>
              </div>}
          </div>}

        {/* IRPF Modal */}
        {showIrpfModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="mx-4 max-w-sm w-full p-6 bg-white rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-stone-950">¿Qué es la retención IRPF?</h3>
                <button onClick={() => setShowIrpfModal(false)} className="bg-transparent border-none cursor-pointer">
                  <X className="w-5 h-5 text-stone-500" />
                </button>
              </div>
              <p className="text-sm leading-relaxed text-stone-500">
                Hispaloshop SL retiene el 15% de tus comisiones y lo ingresa a Hacienda en tu nombre trimestralmente (Modelo 111).
              </p>
              <p className="text-sm leading-relaxed mt-3 text-stone-500">
                Cuando hagas tu declaración de la renta (IRPF), esas retenciones ya estarán pagadas y podrás deducirlas.
              </p>
              <p className="text-sm leading-relaxed mt-3 text-stone-500">
                Recibirás el certificado de retenciones en enero de cada año.
              </p>
              <button onClick={() => setShowIrpfModal(false)} className="w-full mt-5 py-2.5 text-sm font-semibold transition-colors bg-stone-950 text-white rounded-2xl border-none cursor-pointer">
                Entendido
              </button>
            </div>
          </div>}

        {/* Recent Commissions */}
        <div className="mt-6 bg-white shadow-sm rounded-2xl">
          <div className="px-6 pt-6 pb-4">
            <h3 className="text-lg font-semibold text-stone-950">{t('influencer.recentCommissions')}</h3>
          </div>
          <div className="px-6 pb-6">
            {dashboard.recent_commissions?.length > 0 ? <div className="overflow-x-auto">
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
                    {dashboard.recent_commissions.map(comm => {
                  const rawDate = comm.payment_available_date ? new Date(comm.payment_available_date) : null;
                  const paymentDate = rawDate && !isNaN(rawDate.getTime()) ? rawDate : null;
                  const now = new Date();
                  const isAvailable = paymentDate && paymentDate <= now;
                  const daysLeft = paymentDate ? Math.ceil((paymentDate - now) / (1000 * 60 * 60 * 24)) : null;
                  return <tr key={comm.commission_id} className="border-b border-stone-200">
                          <td className="py-3 px-4 font-mono text-sm text-stone-950">{comm.order_id}</td>
                          <td className="py-3 px-4 text-stone-950">{convertAndFormatPrice(Number(comm.order_total || 0))}</td>
                          <td className="py-3 px-4 font-medium text-stone-500">
                            {convertAndFormatPrice(Number(comm.commission_amount || 0))}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-500">
                              {comm.commission_status === 'paid' ? t('orders.status.paid') : comm.commission_status === 'pending' ? t('orders.status.pending') : comm.commission_status === 'reversed' ? t('orders.status.reversed', 'Revertido') : comm.commission_status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {comm.commission_status === 'paid' ? <span className="flex items-center gap-1 text-stone-950">
                                <CheckCircle2 className="w-4 h-4" />
                                {t('influencer.collected')}
                              </span> : isAvailable ? <span className="font-medium flex items-center gap-1 text-stone-950">
                                <CheckCircle2 className="w-4 h-4" />
                                {t('influencer.available')}
                              </span> : paymentDate ? <span className="text-stone-500">
                                {daysLeft > 0 ? t('influencer.daysLeft', {
                          days: daysLeft
                        }) : t('influencer.today')}
                              </span> : <span className="text-stone-500">-</span>}
                          </td>
                          <td className="py-3 px-4 text-sm text-stone-500">
                            {comm.created_at ? new Date(comm.created_at).toLocaleDateString(undefined) : '—'}
                          </td>
                        </tr>;
                })}
                  </tbody>
                </table>
              </div> : <div className="text-center py-8">
                <p className="text-stone-500">
                  {t('influencer.noCommissions')}
                </p>
              </div>}
          </div>
        </div>

        {/* Analytics Section */}
        {dashboard.status === 'active' && dashboard.discount_code && dashboard.discount_code_active && <div className="mt-8">
            <InfluencerAnalytics />
          </div>}

        {/* Collaborations Section */}
        {collabs.length > 0 && <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-stone-950">
                <Handshake className="w-5 h-5 text-stone-500" />
                Colaboraciones
              </h2>
              <Link to="/messages" className="text-xs font-medium flex items-center gap-1 text-stone-500">
                Ver todas <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="space-y-3">
              {collabs.slice(0, 5).map(c => {
            const proposal = c.proposal || {};
            const statusMap = {
              proposed: {
                label: 'Pendiente',
                tw: 'bg-stone-100 text-stone-500'
              },
              active: {
                label: 'Activa',
                tw: 'bg-stone-100 text-stone-950'
              },
              declined: {
                label: 'Rechazada',
                tw: 'bg-stone-100 text-stone-500'
              },
              sample_sent: {
                label: 'Muestra enviada',
                tw: 'bg-stone-100 text-stone-500'
              },
              sample_received: {
                label: 'Muestra recibida',
                tw: 'bg-stone-100 text-stone-950'
              }
            };
            const badge = statusMap[c.status] || statusMap.proposed;
            const conversationId = c.conversation_id || c.id;
            return <Link key={c.collab_id} to={conversationId ? `/messages/${conversationId}` : '/messages'} className="flex items-center gap-3 p-3 transition-colors bg-white shadow-sm rounded-2xl">
                    {proposal.product_image_url && <img loading="lazy" src={proposal.product_image_url} alt="" className="w-10 h-10 rounded-2xl object-cover shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-stone-950">{proposal.product_name}</p>
                      <p className="text-xs text-stone-500">{proposal.commission_pct}% · {proposal.duration_days} días</p>
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${badge.tw}`}>
                      {badge.label}
                    </span>
                  </Link>;
          })}
            </div>
          </div>}

        {/* Back to Home Link */}
        <div className="mt-8 text-center">
          <Link to="/" className="text-sm inline-flex items-center gap-2 transition-colors text-stone-500">
            <Home className="w-4 h-4" />
            Volver a la tienda
          </Link>
        </div>
      </div>


      {/* Internal Chat */}
      <InternalChat userType="influencer" />
    </div>;
}