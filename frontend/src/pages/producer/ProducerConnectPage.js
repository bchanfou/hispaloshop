import React, { useEffect, useState } from 'react';
import apiClient from '../../services/api/client';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ProducerConnectPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null);

  const loadStatus = async () => {
    try {
      const res = await apiClient.get('/producer/stripe/status');
      setStatus({
        has_account: Boolean(res?.stripe_account_id),
        account_id: res?.stripe_account_id || null,
        status: res?.status || 'not_connected',
        payouts_enabled: Boolean(res?.payouts_enabled),
        charges_enabled: Boolean(res?.charges_enabled),
        onboarding_completed: Boolean(res?.connected),
        requirements_due: [],
      });
    } catch (error) {
      toast.error('No se pudo obtener el estado de Stripe Connect');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleStart = async () => {
    setSubmitting(true);
    try {
      let onboardingUrl = null;
      const res = await apiClient.post('/producer/stripe/create-account', {});
      onboardingUrl = res?.url || null;
      if (onboardingUrl) {
        window.location.href = onboardingUrl;
      } else {
        await loadStatus();
      }
    } catch (error) {
      toast.error(error.message || 'No se pudo iniciar el onboarding');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-stone-500" />
      </div>
    );
  }

  const isReady = Boolean(status?.onboarding_completed);

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold text-stone-950 mb-2">Stripe Connect</h1>
      <p className="text-sm text-stone-500 mb-6">Configura tu cuenta para recibir transferencias automaticas.</p>

      <div className={`rounded-xl border p-5 bg-stone-50 border-stone-200`}>
        <div className="flex items-start gap-3">
          {isReady ? (
            <CheckCircle2 className="w-5 h-5 text-stone-700 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-stone-500 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="font-medium text-stone-950">
              {isReady ? 'Cuenta activa' : 'Onboarding pendiente'}
            </p>
            <p className="text-sm text-stone-500 mt-1">
              {isReady
                ? 'Tu cuenta esta lista para recibir pagos.'
                : 'Completa los datos en Stripe para activar cobros y payouts.'}
            </p>
            {!isReady && status?.requirements_due?.length > 0 && (
              <p className="text-xs text-stone-600 mt-2">
                Requisitos pendientes: {status.requirements_due.length}
              </p>
            )}
          </div>
        </div>
      </div>

      {!isReady && (
        <div className="mt-4">
          <button
            type="button"
            onClick={handleStart}
            disabled={submitting}
            className="px-4 py-2 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white rounded-xl transition-colors"
          >
            {submitting ? 'Procesando...' : status?.has_account ? 'Completar onboarding' : 'Crear cuenta y conectar'}
          </button>
        </div>
      )}
    </div>
  );
}
