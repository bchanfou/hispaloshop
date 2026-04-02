// @ts-nocheck
import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import apiClient from '../../services/api/client';
import { AlertCircle, CheckCircle2, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';

const ONBOARDING_STEPS = [
  { key: 'account', label: 'Cuenta' },
  { key: 'business', label: 'Negocio' },
  { key: 'bank', label: 'Banco' },
  { key: 'verification', label: 'Verificación' },
];

function deriveStep(status) {
  if (!status) return 0;
  if (status.onboarding_completed) return 4;
  if (status.payouts_enabled) return 3;
  if (status.charges_enabled) return 2;
  if (status.has_account) return 1;
  return 0;
}

export default function ProducerConnectPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null);
  const pollRef = useRef(null);
  const prevStatusRef = useRef(null);

  const loadStatus = useCallback(async () => {
    try {
      const res = await apiClient.get('/producer/stripe/status');
      const newStatus = {
        has_account: Boolean(res?.stripe_account_id),
        account_id: res?.stripe_account_id || null,
        status: res?.status || 'not_connected',
        payouts_enabled: Boolean(res?.payouts_enabled),
        charges_enabled: Boolean(res?.charges_enabled),
        onboarding_completed: Boolean(res?.connected),
        requirements_due: [],
      };

      // Detect transition to active: stop polling and show success
      if (newStatus.onboarding_completed && !prevStatusRef.current?.onboarding_completed) {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        toast.success('Cuenta de Stripe Connect activada correctamente');
      }

      prevStatusRef.current = newStatus;
      setStatus(newStatus);
    } catch {
      // silent: polling errors should not spam toasts
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();

    // Poll every 5s, max 60 attempts (5 minutes) then stop
    let pollCount = 0;
    pollRef.current = setInterval(() => {
      pollCount++;
      if (pollCount > 60) {
        clearInterval(pollRef.current);
        return;
      }
      loadStatus();
    }, 5000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [loadStatus]);

  // Stop polling once onboarding is completed
  useEffect(() => {
    if (status?.onboarding_completed && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, [status?.onboarding_completed]);

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

  const currentStep = useMemo(() => deriveStep(status), [status]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-stone-500" />
      </div>
    );
  }

  const isReady = Boolean(status?.onboarding_completed);

  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold text-stone-950 mb-2">Stripe Connect</h1>
      <p className="text-sm text-stone-500 mb-6">Configura tu cuenta para recibir transferencias automaticas.</p>

      {/* 4-step progress indicator */}
      <div className="mb-8">
        <div className="flex items-center">
          {ONBOARDING_STEPS.map((step, i) => {
            const isCompleted = i < currentStep;
            const isActive = i === currentStep && !isReady;
            const isPending = i > currentStep;
            const isLast = i === ONBOARDING_STEPS.length - 1;

            return (
              <React.Fragment key={step.key}>
                <div className="flex flex-col items-center" style={{ flex: isLast ? '0 0 auto' : 0 }}>
                  <div
                    className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
                      isCompleted || isActive
                        ? 'bg-stone-950'
                        : 'bg-transparent border-2 border-stone-200'
                    }`}
                  >
                    {isCompleted ? (
                      <Check size={16} className="text-white" strokeWidth={2.5} />
                    ) : (
                      <span className={`text-[13px] font-bold ${isActive ? 'text-white' : 'text-stone-400'}`}>
                        {i + 1}
                      </span>
                    )}
                  </div>
                  <span className={`mt-2 text-center whitespace-nowrap text-[11px] font-semibold ${
                    isCompleted || isActive ? 'text-stone-950' : 'text-stone-400'
                  }`}>
                    {step.label}
                  </span>
                </div>
                {!isLast && (
                  <div
                    className={`flex-1 h-0.5 -mt-[18px] transition-colors ${
                      i < currentStep ? 'bg-stone-950' : 'bg-stone-300'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border p-5 bg-stone-50 border-stone-200">
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
            className="px-4 py-2 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white rounded-full transition-colors"
          >
            {submitting ? 'Procesando...' : status?.has_account ? 'Completar onboarding' : 'Crear cuenta y conectar'}
          </button>
        </div>
      )}
    </div>
  );
}
