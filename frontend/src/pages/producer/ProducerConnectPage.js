import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API } from '../../utils/api';
import { Button } from '../../components/ui/button';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ProducerConnectPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null);

  const loadStatus = async () => {
    try {
      const res = await axios.get(`${API}/producer/stripe/status`, { withCredentials: true });
      setStatus({
        has_account: Boolean(res.data?.stripe_account_id),
        account_id: res.data?.stripe_account_id || null,
        status: res.data?.status || 'not_connected',
        payouts_enabled: Boolean(res.data?.payouts_enabled),
        charges_enabled: Boolean(res.data?.charges_enabled),
        onboarding_completed: Boolean(res.data?.connected),
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
      const res = await axios.post(`${API}/producer/stripe/create-account`, {}, { withCredentials: true });
      onboardingUrl = res.data?.url || null;
      if (onboardingUrl) {
        window.location.href = onboardingUrl;
      } else {
        await loadStatus();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'No se pudo iniciar el onboarding');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
      </div>
    );
  }

  const isReady = Boolean(status?.onboarding_completed);

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold text-text-primary mb-2">Stripe Connect</h1>
      <p className="text-sm text-text-muted mb-6">Configura tu cuenta para recibir transferencias automaticas.</p>

      <div className={`rounded-xl border p-5 ${isReady ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className="flex items-start gap-3">
          {isReady ? (
            <CheckCircle2 className="w-5 h-5 text-green-700 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-700 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="font-medium text-text-primary">
              {isReady ? 'Cuenta activa' : 'Onboarding pendiente'}
            </p>
            <p className="text-sm text-text-muted mt-1">
              {isReady
                ? 'Tu cuenta esta lista para recibir pagos.'
                : 'Completa los datos en Stripe para activar cobros y payouts.'}
            </p>
            {!isReady && status?.requirements_due?.length > 0 && (
              <p className="text-xs text-amber-800 mt-2">
                Requisitos pendientes: {status.requirements_due.length}
              </p>
            )}
          </div>
        </div>
      </div>

      {!isReady && (
        <div className="mt-4">
          <Button onClick={handleStart} disabled={submitting}>
            {submitting ? 'Procesando...' : status?.has_account ? 'Completar onboarding' : 'Crear cuenta y conectar'}
          </Button>
        </div>
      )}
    </div>
  );
}
