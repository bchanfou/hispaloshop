// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Building2, Check, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api/client';
import { useTranslation } from 'react-i18next';

export default function PayoutSettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [payoutData, setPayoutData] = useState(null);
  const [method, setMethod] = useState(null); // 'stripe' | 'sepa'
  const [iban, setIban] = useState('');
  const [accountName, setAccountName] = useState('');

  const isProducer = user?.role === 'producer' || user?.role === 'importer';
  const isInfluencer = user?.role === 'influencer';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await apiClient.get('/influencer/fiscal/status');
        setPayoutData(data);
        setMethod(data.payout_method || null);
      } catch {
        // No fiscal data yet
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleStripeConnect = async () => {
    setSaving(true);
    try {
      const data = await apiClient.post('/influencer/fiscal/payout-method', {
        method: 'stripe',
        origin: window.location.origin,
      });
      if (data.onboarding_url) {
        window.location.href = data.onboarding_url;
      } else if (data.connected) {
        setMethod('stripe');
        setPayoutData(prev => ({ ...prev, payout_method: 'stripe', stripe_onboarding_complete: true }));
        toast.success('Stripe Connect activado');
      }
    } catch {
      toast.error(t('influencer.stripeError', 'Error al conectar con Stripe'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSEPA = async () => {
    if (!iban.trim() || !accountName.trim()) {
      toast.error('IBAN y nombre del titular son obligatorios');
      return;
    }
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{4,}$/i.test(iban.replace(/\s/g, ''))) {
      toast.error(t('payout_settings.elFormatoDelIbanNoEsValido', 'El formato del IBAN no es valido'));
      return;
    }
    setSaving(true);
    try {
      const data = await apiClient.post('/influencer/fiscal/payout-method', {
        method: 'sepa',
        iban: iban.trim(),
        account_name: accountName.trim(),
      });
      setMethod('sepa');
      setPayoutData(prev => ({
        ...prev,
        payout_method: 'sepa',
        sepa_iban_last4: data.iban_masked?.slice(-4),
        sepa_account_name: accountName.trim(),
      }));
      toast.success('Datos bancarios guardados');
    } catch (err) {
      toast.error(err?.response?.data?.detail || err?.detail || 'Error al guardar datos bancarios');
    } finally {
      setSaving(false);
    }
  };

  const stripeConnected = payoutData?.stripe_onboarding_complete;
  const sepaConfigured = payoutData?.sepa_iban_last4;

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Topbar */}
      <div className="sticky top-0 z-40 bg-white border-b border-stone-200 flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => navigate('/settings')}
          className="bg-transparent border-none cursor-pointer p-1 flex"
        >
          <ArrowLeft size={22} className="text-stone-950" />
        </button>
        <span className="text-[17px] font-bold text-stone-950">{t('producer_payments.metodoDeCobro', 'Método de cobro')}</span>
      </div>

      <div className="max-w-[600px] mx-auto px-4 pt-6 pb-[100px]">
        {loading ? (
          <div className="flex justify-center py-[60px]">
            <Loader2 size={28} className="text-stone-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* Info banner */}
            <div className="flex gap-3 p-4 bg-stone-100 rounded-2xl mb-6 items-start">
              <AlertCircle size={18} className="text-stone-500 shrink-0 mt-0.5" />
              <p className="text-[13px] text-stone-500 leading-relaxed">
                Configura como quieres recibir tus pagos. Puedes elegir entre Stripe Connect (instantaneo) o transferencia SEPA.
              </p>
            </div>

            {/* Method Selection */}
            <p className="text-[11px] font-bold text-stone-500 tracking-wider uppercase mb-3">
              Elige tu metodo
            </p>

            <div className="flex flex-col gap-3 mb-7">
              {/* Stripe Connect */}
              <button
                onClick={() => setMethod('stripe')}
                className={`flex items-center gap-3.5 p-4 bg-white rounded-2xl cursor-pointer text-left ${
                  method === 'stripe' ? 'border-2 border-stone-950' : 'border border-stone-200'
                }`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  method === 'stripe' ? 'bg-stone-950' : 'bg-stone-100'
                }`}>
                  <CreditCard size={20} className={method === 'stripe' ? 'text-white' : 'text-stone-500'} />
                </div>
                <div className="flex-1">
                  <p className="text-[15px] font-semibold text-stone-950">Stripe Connect</p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Cobros instantáneos - Comisión 0,25€/pago
                  </p>
                </div>
                {stripeConnected && method === 'stripe' && (
                  <div className="w-6 h-6 rounded-full bg-stone-950 flex items-center justify-center shrink-0">
                    <Check size={14} className="text-white" />
                  </div>
                )}
              </button>

              {/* SEPA */}
              <button
                onClick={() => setMethod('sepa')}
                className={`flex items-center gap-3.5 p-4 bg-white rounded-2xl cursor-pointer text-left ${
                  method === 'sepa' ? 'border-2 border-stone-950' : 'border border-stone-200'
                }`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  method === 'sepa' ? 'bg-stone-950' : 'bg-stone-100'
                }`}>
                  <Building2 size={20} className={method === 'sepa' ? 'text-white' : 'text-stone-500'} />
                </div>
                <div className="flex-1">
                  <p className="text-[15px] font-semibold text-stone-950">Transferencia SEPA</p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Sin comisión - 2-3 días laborables
                  </p>
                </div>
                {sepaConfigured && method === 'sepa' && (
                  <div className="w-6 h-6 rounded-full bg-stone-950 flex items-center justify-center shrink-0">
                    <Check size={14} className="text-white" />
                  </div>
                )}
              </button>
            </div>

            {/* Stripe Connect Section */}
            {method === 'stripe' && (
              <div className="bg-white shadow-sm rounded-2xl p-5 mb-5">
                <p className="text-[15px] font-semibold text-stone-950 mb-2">
                  Stripe Connect
                </p>

                {stripeConnected ? (
                  <>
                    <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-stone-100 mb-3 w-fit">
                      <div className="w-2 h-2 rounded-full bg-stone-950" />
                      <span className="text-[13px] font-semibold text-stone-950">Conectado</span>
                    </div>
                    <p className="text-[13px] text-stone-500 leading-relaxed">
                      Tu cuenta de Stripe Connect esta activa. Los pagos se procesan automaticamente.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-[13px] text-stone-500 mb-4 leading-relaxed">
                      Conecta tu cuenta de Stripe para recibir pagos directamente. Serás redirigido al proceso de verificación de Stripe.
                    </p>
                    <button
                      onClick={handleStripeConnect}
                      disabled={saving}
                      className="w-full py-3.5 bg-stone-950 text-white rounded-full text-sm font-semibold cursor-pointer flex items-center justify-center gap-2 hover:bg-stone-800 transition-colors disabled:opacity-60"
                    >
                      {saving ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <>
                          <ExternalLink size={16} />
                          Conectar con Stripe
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* SEPA Section */}
            {method === 'sepa' && (
              <div className="bg-white shadow-sm rounded-2xl p-5 mb-5">
                <p className="text-[15px] font-semibold text-stone-950 mb-4">
                  Datos bancarios SEPA
                </p>

                {sepaConfigured && !iban.trim() && (
                  <div className="flex items-center gap-2 p-2.5 px-3.5 rounded-xl bg-stone-100 mb-4">
                    <Building2 size={16} className="text-stone-500" />
                    <div>
                      <p className="text-[13px] font-semibold text-stone-950">
                        {payoutData?.sepa_account_name || 'Titular'}
                      </p>
                      <p className="text-xs text-stone-500 mt-0.5">
                        .... .... .... {payoutData?.sepa_iban_last4}
                      </p>
                    </div>
                  </div>
                )}

                {/* IBAN */}
                <div className="mb-3.5">
                  <label className="block text-[13px] font-semibold text-stone-950 mb-1.5">
                    IBAN
                  </label>
                  <input
                    type="text"
                    value={iban}
                    onChange={(e) => setIban(e.target.value.toUpperCase())}
                    placeholder={sepaConfigured ? `.... .... .... ${payoutData?.sepa_iban_last4}` : 'ES00 0000 0000 0000 0000 0000'}
                    className="w-full h-12 px-3.5 border border-stone-200 rounded-xl text-sm text-stone-950 bg-white outline-none focus:border-stone-400 transition-colors box-border tracking-wider font-mono"
                  />
                </div>

                {/* Account holder name */}
                <div className="mb-5">
                  <label className="block text-[13px] font-semibold text-stone-950 mb-1.5">
                    Nombre del titular
                  </label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder={payoutData?.sepa_account_name || 'Nombre completo o razon social'}
                    className="w-full h-12 px-3.5 border border-stone-200 rounded-xl text-sm text-stone-950 bg-white outline-none focus:border-stone-400 transition-colors box-border"
                  />
                </div>

                <button
                  onClick={handleSaveSEPA}
                  disabled={saving || (!iban.trim() && !accountName.trim())}
                  className={`w-full py-3.5 rounded-full text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                    iban.trim() && accountName.trim()
                      ? 'bg-stone-950 text-white cursor-pointer hover:bg-stone-800'
                      : 'bg-stone-100 text-stone-500 cursor-default'
                  }`}
                >
                  {saving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    'Guardar datos bancarios'
                  )}
                </button>
              </div>
            )}

            {/* Producer note */}
            {isProducer && (
              <div className="p-4 bg-stone-100 rounded-2xl mt-3">
                <p className="text-[13px] font-semibold text-stone-950 mb-1">
                  Vendedores y productores
                </p>
                <p className="text-xs text-stone-500 leading-relaxed">
                  Los pagos por ventas de productos se procesan automaticamente via Stripe Connect.
                  Configura tu cuenta de Stripe para empezar a recibir pagos.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
