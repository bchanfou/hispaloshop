import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Copy, Check, ExternalLink, DollarSign, ShoppingBag, TrendingUp, CreditCard, Home, Percent, Users, AlertCircle, Sparkles, Loader2, Mail, BarChart3, Wallet, ArrowUpRight, Clock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { Link } from 'react-router-dom';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import InfluencerAIAssistant from '../../components/InfluencerAIAssistant';
import InternalChat from '../../components/InternalChat';
import InfluencerAnalytics from '../../components/InfluencerAnalytics';
import TierProgress from '../../components/TierProgress';
import { useTranslation } from 'react-i18next';
import { API } from '../../utils/api';

const MINIMUM_WITHDRAWAL = 50; // €50 minimum

// Withdrawal Component
function WithdrawalCard({ availableToWithdraw, stripeConnected, onWithdrawSuccess }) {
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawals, setWithdrawals] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    try {
      const res = await axios.get(`${API}/influencer/withdrawals`, { withCredentials: true });
      setWithdrawals(res.data.withdrawals || []);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
    }
  };

  const handleWithdraw = async () => {
    if (availableToWithdraw < MINIMUM_WITHDRAWAL) {
      toast.error(`El mínimo de retiro es €${MINIMUM_WITHDRAWAL}. Tienes €${availableToWithdraw.toFixed(2)} disponibles.`);
      return;
    }
    
    setWithdrawing(true);
    try {
      const res = await axios.post(`${API}/influencer/request-withdrawal`, {}, { withCredentials: true });
      toast.success(res.data.message);
      fetchWithdrawals();
      if (onWithdrawSuccess) onWithdrawSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al procesar el retiro');
    } finally {
      setWithdrawing(false);
    }
  };

  const canWithdraw = stripeConnected && availableToWithdraw >= MINIMUM_WITHDRAWAL;

  return (
    <Card className="border-2 border-green-300 bg-gradient-to-br from-green-50 to-emerald-50">
      <CardHeader>
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <Wallet className="w-5 h-5 text-green-600" />
          Retirar Comisiones
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Available to withdraw */}
          <div className="text-center p-4 bg-white rounded-lg border border-green-200">
            <p className="text-sm text-[#7A7A7A] mb-1">Disponible para retirar</p>
            <p className="text-3xl font-bold text-green-600">€{availableToWithdraw.toFixed(2)}</p>
            <p className="text-xs text-[#7A7A7A] mt-1">Mínimo: €{MINIMUM_WITHDRAWAL}</p>
          </div>

          {/* Withdraw button */}
          {!stripeConnected ? (
            <div className="text-center p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-800">
                Conecta tu cuenta de Stripe para poder retirar tus comisiones
              </p>
            </div>
          ) : availableToWithdraw < MINIMUM_WITHDRAWAL ? (
            <div className="text-center p-3 bg-stone-50 rounded-lg border border-stone-200">
              <p className="text-sm text-[#7A7A7A]">
                Necesitas €{(MINIMUM_WITHDRAWAL - availableToWithdraw).toFixed(2)} más para alcanzar el mínimo de retiro
              </p>
            </div>
          ) : (
            <Button 
              onClick={handleWithdraw}
              disabled={withdrawing || !canWithdraw}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {withdrawing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <ArrowUpRight className="w-4 h-4 mr-2" />
                  Retirar €{availableToWithdraw.toFixed(2)}
                </>
              )}
            </Button>
          )}

          {/* Toggle history */}
          {withdrawals.length > 0 && (
            <Button
              variant="ghost"
              onClick={() => setShowHistory(!showHistory)}
              className="w-full text-sm text-[#7A7A7A]"
            >
              {showHistory ? 'Ocultar historial' : `Ver historial (${withdrawals.length} retiros)`}
            </Button>
          )}

          {/* Withdrawal history */}
          {showHistory && withdrawals.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {withdrawals.slice(0, 5).map((wd) => (
                <div key={wd.withdrawal_id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium">€{wd.amount.toFixed(2)}</span>
                  </div>
                  <span className="text-xs text-[#7A7A7A]">
                    {new Date(wd.created_at).toLocaleDateString('es-ES')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Email Verification Component
function EmailVerificationBanner({ user, onVerified }) {
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async () => {
    if (!code || code.length !== 6) {
      toast.error('Introduce el código de 6 dígitos');
      return;
    }
    setVerifying(true);
    try {
      await axios.post(`${API}/auth/verify-email?code=${code}`, {}, { withCredentials: true });
      toast.success('¡Email verificado!');
      onVerified();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Código inválido');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await axios.post(`${API}/auth/resend-verification`, {}, { withCredentials: true });
      toast.success('Código enviado a tu email');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al enviar código');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6">
      <div className="flex items-start gap-4">
        <Mail className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
        <div className="flex-1">
          <h3 className="font-semibold text-amber-900 mb-2">Verifica tu email</h3>
          <p className="text-amber-800 text-sm mb-4">
            Hemos enviado un código de 6 dígitos a <strong>{user?.email}</strong>. 
            Introdúcelo aquí para activar tu cuenta.
          </p>
          <div className="flex items-center gap-3">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-32 text-center text-xl tracking-widest font-mono"
              maxLength={6}
            />
            <Button onClick={handleVerify} disabled={verifying || code.length !== 6}>
              {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verificar'}
            </Button>
            <Button variant="ghost" onClick={handleResend} disabled={resending}>
              {resending ? 'Enviando...' : 'Reenviar código'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Create Code Component
function CreateCodeCard({ onCodeCreated }) {
  const [code, setCode] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!code || code.length < 3) {
      toast.error('El código debe tener al menos 3 caracteres');
      return;
    }
    setCreating(true);
    try {
      const res = await axios.post(`${API}/influencer/create-code`, { code }, { withCredentials: true });
      toast.success(res.data.message);
      onCodeCreated(res.data.code);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear código');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          Crea tu código de descuento
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-[#7A7A7A] mb-4">
          Elige un código personalizado que tus seguidores usarán para obtener el 10% de descuento.
        </p>
        <div className="flex items-center gap-3">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20))}
            placeholder="Ej: MARIA10"
            className="flex-1 uppercase text-lg font-mono"
            maxLength={20}
          />
          <Button onClick={handleCreate} disabled={creating || code.length < 3}>
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear código'}
          </Button>
        </div>
        <p className="text-xs text-[#7A7A7A] mt-2">
          Solo letras y números, entre 3-20 caracteres
        </p>
      </CardContent>
    </Card>
  );
}

export default function InfluencerDashboard() {
  const { user, refreshUser } = useAuth();
  const { t } = useTranslation();
  const [dashboard, setDashboard] = useState(null);
  const [stripeStatus, setStripeStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [emailVerified, setEmailVerified] = useState(user?.email_verified);

  useEffect(() => {
    if (user) {
      setEmailVerified(user.email_verified);
      fetchDashboard();
      fetchStripeStatus();
      // Trigger withdrawal notification check when dashboard loads
      checkWithdrawalNotification();
    }
  }, [user]);

  const checkWithdrawalNotification = async () => {
    try {
      await axios.post(`${API}/influencer/check-withdrawal-notification`, {}, { withCredentials: true });
    } catch (err) {
      // Silent fail - not critical
      console.log('Notification check completed');
    }
  };

  const fetchDashboard = async () => {
    try {
      const res = await axios.get(`${API}/influencer/dashboard`, { withCredentials: true });
      setDashboard(res.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setDashboard(null);
      } else {
        toast.error(t('influencer.loadError', 'Error al cargar el dashboard'));
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStripeStatus = async () => {
    try {
      const res = await axios.get(`${API}/influencer/stripe/status`, { withCredentials: true });
      setStripeStatus(res.data);
    } catch (err) {
      console.error('Error fetching Stripe status:', err);
    }
  };

  const handleEmailVerified = () => {
    setEmailVerified(true);
    if (refreshUser) refreshUser();
  };

  const handleCodeCreated = (newCode) => {
    setDashboard(prev => ({ ...prev, discount_code: newCode }));
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
    setConnectingStripe(true);
    try {
      const res = await axios.post(`${API}/influencer/stripe/connect`, {}, { withCredentials: true });
      if (res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      toast.error(t('influencer.stripeError', 'Error al conectar con Stripe'));
      setConnectingStripe(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1C1C1C]"></div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-display font-medium mb-4">{t('influencer.notInfluencer')}</h2>
            <p className="text-[#7A7A7A] font-body">
              {t('influencer.notInfluencerDesc')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tierPercent = Number(dashboard.commission_value || ((dashboard.commission_rate || 0) * 100) || 0);
  const influencerExample = ((18 * tierPercent) / 100).toFixed(2);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-4 md:py-8">
        {/* Header - Mobile: Simple, Desktop: Full */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-xl md:text-3xl font-heading font-medium text-text-primary">
            {t('influencer.dashboard')}
          </h1>
          <p className="text-text-muted text-sm md:text-base mt-1">
            {t('dashboard.welcome')}, {dashboard.full_name}
          </p>
        </div>

        {/* Email Verification Banner */}
        {!emailVerified && (
          <EmailVerificationBanner user={user} onVerified={handleEmailVerified} />
        )}

        {/* Status Banner - Pending Approval */}
        {dashboard.status === 'pending' && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 md:p-6 mb-4 md:mb-6">
            <div className="flex items-start gap-3 md:gap-4">
              <AlertCircle className="w-5 h-5 md:w-6 md:h-6 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-purple-900 text-sm md:text-base mb-1 md:mb-2">{t('influencer.pendingApproval')}</h3>
                <p className="text-purple-800 text-xs md:text-sm">
                  {t('influencer.pendingApprovalDesc')}
                </p>
                <p className="text-purple-700 text-xs md:text-sm mt-2">
                  <strong>{t('influencer.estimatedTime')}</strong>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Status Banner - Other statuses */}
        {dashboard.status !== 'active' && dashboard.status !== 'pending' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 md:p-4 mb-4 md:mb-6">
            <p className="text-amber-800 text-sm">
              {t('influencer.accountStatus')} <strong>{dashboard.status}</strong>. 
              {dashboard.status === 'suspended' && ` ${t('influencer.accountSuspended')}`}
            </p>
          </div>
        )}

        {/* Create Code Card - Only show if active and no code yet */}
        {dashboard.status === 'active' && !dashboard.discount_code && (
          <div className="mb-4 md:mb-6">
            <CreateCodeCard onCodeCreated={handleCodeCreated} />
          </div>
        )}

        {/* Tier Progress */}
        <TierProgress />

        {/* === CODE HERO - The main thing influencers need === */}
        {dashboard.discount_code && (
          <div className="bg-white rounded-2xl border-2 border-amber-200 p-6 text-center mb-6" data-testid="code-hero">
            <p className="text-xs text-amber-600 uppercase tracking-widest mb-2">Tu codigo</p>
            <p className="text-4xl md:text-5xl font-heading font-bold text-[#1C1C1C] tracking-wider mb-4" data-testid="influencer-code">
              {dashboard.discount_code}
            </p>
            <div className="flex justify-center gap-3 mb-4">
              <Button
                onClick={() => { navigator.clipboard.writeText(dashboard.discount_code); toast.success('Codigo copiado'); }}
                className="bg-amber-600 hover:bg-amber-700 text-white rounded-full px-6"
                data-testid="copy-code-btn"
              >
                <Copy className="w-4 h-4 mr-2" /> Copiar
              </Button>
              <Button
                variant="outline"
                onClick={() => { if (navigator.share) navigator.share({ title: 'Mi codigo Hispaloshop', text: `Usa mi codigo ${dashboard.discount_code} para descuento en hispaloshop.com` }); else { navigator.clipboard.writeText(`Usa mi codigo ${dashboard.discount_code} en hispaloshop.com`); toast.success('Link copiado'); }}}
                className="rounded-full px-6"
              >
                Compartir
              </Button>
            </div>
            <p className="text-xs text-text-muted">Tu comunidad ahorra {dashboard.discount_value || 10}% con este codigo</p>
          </div>
        )}

        {/* === 2 Big Earnings Circles === */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-emerald-200 p-6 text-center" data-testid="total-earned">
            <p className="text-3xl md:text-4xl font-bold text-emerald-600">€{dashboard.total_commission_earned?.toFixed(0) || 0}</p>
            <p className="text-xs text-text-muted mt-2">Total ganado</p>
          </div>
          <div className="bg-white rounded-2xl border border-amber-200 p-6 text-center" data-testid="available-withdraw">
            <p className="text-3xl md:text-4xl font-bold text-amber-600">€{dashboard.available_balance?.toFixed(0) || 0}</p>
            <p className="text-xs text-text-muted mt-2">Disponible</p>
            {(dashboard.available_balance || 0) >= 50 && (
              <Button
                size="sm"
                onClick={scrollToWithdrawals}
                className="mt-3 bg-amber-600 hover:bg-amber-700 text-white rounded-full text-xs px-4"
              >
                Retirar
              </Button>
            )}
          </div>
        </div>

        {/* Stats Grid - Mobile: 2x2, Desktop: 4 columns */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
          <Card className="dashboard-card">
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <p className="text-xs md:text-sm text-text-muted">{t('influencer.totalSales')}</p>
                  <p className="text-xl md:text-2xl font-heading font-medium text-text-primary">
                    €{dashboard.total_sales_generated.toFixed(0)}
                  </p>
                </div>
                <div className="h-10 w-10 md:h-12 md:w-12 bg-green-50 rounded-full flex items-center justify-center">
                  <ShoppingBag className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="dashboard-card">
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <p className="text-xs md:text-sm text-text-muted">{t('influencer.totalEarned')}</p>
                  <p className="text-xl md:text-2xl font-heading font-medium text-text-primary">
                    €{dashboard.total_commission_earned.toFixed(0)}
                  </p>
                </div>
                <div className="h-10 w-10 md:h-12 md:w-12 bg-blue-50 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="dashboard-card">
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <p className="text-xs md:text-sm text-text-muted">{t('influencer.availableBalance')}</p>
                  <p className="text-xl md:text-2xl font-heading font-medium text-green-600">
                    €{dashboard.available_balance.toFixed(0)}
                  </p>
                </div>
                <div className="h-10 w-10 md:h-12 md:w-12 bg-orange-50 rounded-full flex items-center justify-center">
                  <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="dashboard-card">
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <p className="text-xs md:text-sm text-text-muted">{t('influencer.commissionRate')}</p>
                  <p className="text-xl md:text-2xl font-heading font-medium text-text-primary">
                    {`${tierPercent}%`}
                  </p>
                </div>
                <div className="h-10 w-10 md:h-12 md:w-12 bg-purple-50 rounded-full flex items-center justify-center">
                  <CreditCard className="h-5 w-5 md:h-6 md:w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Discount Code Card */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="font-display text-lg">{t('influencer.discountCode')}</CardTitle>
            </CardHeader>
            <CardContent>
              {dashboard.discount_code ? (
                <>
                  <div className="bg-[#FAF7F2] border border-dashed border-[#DED7CE] rounded-lg p-4 text-center mb-4">
                    <p className="text-3xl font-display font-bold tracking-wider text-[#1C1C1C]">
                      {dashboard.discount_code}
                    </p>
                  </div>
                  <Button 
                    onClick={copyDiscountCode}
                    className="w-full bg-[#1C1C1C] hover:bg-[#2A2A2A]"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        {t('common.copied')}
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        {t('influencer.copyCode')}
                      </>
                    )}
                  </Button>
                  <p className="text-sm text-[#7A7A7A] text-center mt-3 font-body">
                    {t('influencer.shareCode')}
                  </p>
                </>
              ) : dashboard.status === 'active' ? (
                <div className="text-center py-4">
                  <p className="text-[#7A7A7A] text-sm">
                    {t('influencer.useFormAbove')}
                  </p>
                </div>
              ) : (
                <div className="text-center py-4">
                  <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-[#7A7A7A] text-sm">
                    {t('influencer.canCreateWhenApproved')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stripe Connect Card */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="font-display text-lg">{t('influencer.paymentSetup')}</CardTitle>
            </CardHeader>
            <CardContent>
              {stripeStatus?.connected && stripeStatus?.onboarding_complete ? (
                <div className="text-center">
                  <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="font-body font-medium text-green-700">{t('influencer.stripeConnected')}</p>
                  <p className="text-sm text-[#7A7A7A] mt-2">
                    {t('influencer.shareCode')}
                  </p>
                  <div className="mt-4 text-sm text-[#7A7A7A] flex items-center gap-2">
                    <span>{t('influencer.payoutsEnabled')}:</span>
                    {stripeStatus.payouts_enabled ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-[#7A7A7A] font-body mb-4">
                    {t('influencer.connectStripe')}
                  </p>
                  <Button 
                    onClick={connectStripe}
                    disabled={connectingStripe}
                    className="w-full bg-[#635BFF] hover:bg-[#5851DB]"
                  >
                    {connectingStripe ? (
                      t('common.loading')
                    ) : (
                      <>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {t('influencer.connectStripe')}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Commission Summary */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="font-display text-lg">{t('influencer.commissionSummary')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* How commission works explanation */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
                  <p className="text-xs font-medium text-purple-800 mb-2">Info · {t('influencer.howCommissionWorks')}</p>
                  <p className="text-xs text-purple-700">
                    {t('influencer.commissionExplanation', { percent: dashboard.commission_value })}
                  </p>
                  <div className="mt-2 text-xs text-purple-600 bg-purple-100 rounded p-2">
                    <p className="font-medium">{t('influencer.example')}:</p>
                    <p>- {t('influencer.sale')}: €100</p>
                    <p>- {t('influencer.sellerReceives')}: €82</p>
                    <p>- {t('influencer.platformFee')}: €18</p>
                    <p>- <strong>{t('influencer.yourCommission')}: &euro;{influencerExample}</strong> ({tierPercent}% de &euro;18)</p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-[#E6DFD6]">
                  <span className="text-[#7A7A7A] font-body">{t('influencer.pendingOrders')}</span>
                  <span className="font-medium">{dashboard.pending_commissions} {t('orders.orders', 'pedidos')}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#E6DFD6]">
                  <span className="text-[#7A7A7A] font-body">{t('influencer.paidOrders')}</span>
                  <span className="font-medium">{dashboard.paid_commissions} {t('orders.orders', 'pedidos')}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-[#7A7A7A] font-body">{t('influencer.available')}</span>
                  <span className="font-medium text-green-600">
                    €{dashboard.available_balance.toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Schedule Card */}
        {dashboard.payment_schedule && (
          <Card className="mt-6 border-2 border-green-200 bg-green-50/50">
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-green-600" />
                {t('influencer.paymentSchedule')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Available to withdraw */}
                <div className="text-center p-4 bg-white rounded-lg border border-green-200">
                  <p className="text-sm text-[#7A7A7A] mb-1">{t('influencer.availableToWithdraw')}</p>
                  <p className="text-2xl font-bold text-green-600">€{dashboard.payment_schedule.available_to_withdraw.toFixed(2)}</p>
                  <p className="text-xs text-green-700 mt-1">{t('influencer.alreadyPassed15Days')}</p>
                </div>
                
                {/* Available soon */}
                <div className="text-center p-4 bg-white rounded-lg border border-amber-200">
                  <p className="text-sm text-[#7A7A7A] mb-1">{t('influencer.availableSoon')}</p>
                  <p className="text-2xl font-bold text-amber-600">€{dashboard.payment_schedule.available_soon.toFixed(2)}</p>
                  <p className="text-xs text-amber-700 mt-1">{t('influencer.inNext7Days')}</p>
                </div>
                
                {/* Next payment date */}
                <div className="text-center p-4 bg-white rounded-lg border border-blue-200">
                  <p className="text-sm text-[#7A7A7A] mb-1">{t('influencer.nextPaymentDate')}</p>
                  {dashboard.payment_schedule.next_payment_date ? (
                    <>
                      <p className="text-xl font-bold text-blue-600">
                        {new Date(dashboard.payment_schedule.next_payment_date).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short'
                        })}
                      </p>
                      <p className="text-xs text-blue-700 mt-1">
                        {t('influencer.daysLeft', { days: Math.ceil((new Date(dashboard.payment_schedule.next_payment_date) - new Date()) / (1000 * 60 * 60 * 24)) })}
                      </p>
                    </>
                  ) : (
                    <p className="text-lg text-[#7A7A7A]">{t('influencer.noPendingPayments')}</p>
                  )}
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-white rounded-lg border border-stone-200">
                <p className="text-sm text-[#7A7A7A]">
                  <strong>Info · {t('influencer.paymentPolicy')}:</strong> {t('influencer.paymentPolicyDesc')}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Withdrawal Card - Only show for active influencers with Stripe */}
        {dashboard.status === 'active' && dashboard.payment_schedule && (
          <div id="withdrawal-card-section" className="mt-6">
            <WithdrawalCard 
              availableToWithdraw={dashboard.payment_schedule.available_to_withdraw}
              stripeConnected={stripeStatus?.connected && stripeStatus?.onboarding_complete}
              onWithdrawSuccess={fetchDashboard}
            />
          </div>
        )}

        {/* Recent Commissions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="font-display text-lg">{t('influencer.recentCommissions')}</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard.recent_commissions?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#E6DFD6]">
                      <th className="text-left py-3 px-4 font-body font-medium text-[#7A7A7A]">{t('orders.orderNumber')}</th>
                      <th className="text-left py-3 px-4 font-body font-medium text-[#7A7A7A]">{t('orders.orderTotal')}</th>
                      <th className="text-left py-3 px-4 font-body font-medium text-[#7A7A7A]">{t('influencer.commissionRate')}</th>
                      <th className="text-left py-3 px-4 font-body font-medium text-[#7A7A7A]">{t('common.status')}</th>
                      <th className="text-left py-3 px-4 font-body font-medium text-[#7A7A7A]">{t('influencer.paymentAvailable')}</th>
                      <th className="text-left py-3 px-4 font-body font-medium text-[#7A7A7A]">{t('common.date')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.recent_commissions.map((comm) => {
                      const paymentDate = comm.payment_available_date ? new Date(comm.payment_available_date) : null;
                      const now = new Date();
                      const isAvailable = paymentDate && paymentDate <= now;
                      const daysLeft = paymentDate ? Math.ceil((paymentDate - now) / (1000 * 60 * 60 * 24)) : null;
                      
                      return (
                        <tr key={comm.commission_id} className="border-b border-[#F5F1EB]">
                          <td className="py-3 px-4 font-mono text-sm">{comm.order_id}</td>
                          <td className="py-3 px-4">€{comm.order_total.toFixed(2)}</td>
                          <td className="py-3 px-4 font-medium text-green-600">
                            €{comm.commission_amount.toFixed(2)}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              comm.commission_status === 'paid' 
                                ? 'bg-green-100 text-green-700'
                                : comm.commission_status === 'pending'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {comm.commission_status === 'paid' ? t('orders.status.paid') : 
                               comm.commission_status === 'pending' ? t('orders.status.pending') : 
                               comm.commission_status === 'reversed' ? t('orders.status.reversed', 'Revertido') : comm.commission_status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {comm.commission_status === 'paid' ? (
                              <span className="text-green-600 flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4" />
                                {t('influencer.collected')}
                              </span>
                            ) : isAvailable ? (
                              <span className="text-green-600 font-medium flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4" />
                                {t('influencer.available')}
                              </span>
                            ) : paymentDate ? (
                              <span className="text-amber-600">
                                {daysLeft > 0 ? t('influencer.daysLeft', { days: daysLeft }) : t('influencer.today')}
                              </span>
                            ) : (
                              <span className="text-[#7A7A7A]">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-[#7A7A7A]">
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
                <p className="text-[#7A7A7A] font-body">
                  {t('influencer.noCommissions')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Analytics Section */}
        {dashboard.status === 'active' && dashboard.discount_code && (
          <div className="mt-8">
            <InfluencerAnalytics />
          </div>
        )}

        {/* Back to Home Link */}
        <div className="mt-8 text-center">
          <Link to="/" className="text-[#7A7A7A] hover:text-[#1C1C1C] text-sm inline-flex items-center gap-2">
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


