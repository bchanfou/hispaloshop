// @ts-nocheck
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import ProgressBar from '../../../components/forms/ProgressBar';
import useStepProgress from '../../../hooks/useStepProgress';
import Step1Method from './steps/Step1Method';
import Step2Basic from './steps/Step2Basic';
import Step3Profile from './steps/Step3Profile';
import Step4Preferences from './steps/Step4Preferences';
import Step5Welcome from './steps/Step5Welcome';
import { useAuth } from '../../../context/AuthContext';

const STEP_LABELS = [
  'Acceso',
  'Datos básicos',
  'Perfil alimentario',
  'Preferencias',
  'Cuenta lista',
];

const ConsumerRegister = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { currentStep, data, nextStep, updateData, clearProgress } = useStepProgress('consumer', 5);

  const handleStepData = (stepData) => {
    updateData({ [`step${currentStep}`]: stepData });
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        email: data.step2?.email,
        password: data.step2?.password,
        name: `${data.step2?.firstName || ''} ${data.step2?.lastName || ''}`.trim(),
        role: 'customer',
        birth_date: data.step2?.birthDate || '',
        country: data.step3?.country || '',
        analytics_consent: data.step2?.acceptTerms || false,
        marketing_consent: data.step2?.acceptMarketing || false,
        dietary_restrictions: data.step3?.dietaryRestrictions || [],
        preferred_categories: data.step3?.categories || [],
        postal_code: data.step3?.postalCode || '',
        discovery_method: data.step4?.discoveryMethod || 'personalized',
        purchase_frequency: data.step4?.frequency || 'weekly',
      };
      await register(payload);
      clearProgress();
      navigate('/onboarding', { replace: true });
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Error al crear la cuenta. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepData = data[`step${currentStep}`] || {};

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1Method onNext={nextStep} onMethodSelect={(method) => handleStepData({ method })} />;
      case 2:
        return <Step2Basic onNext={nextStep} data={stepData} onDataChange={handleStepData} />;
      case 3:
        return <Step3Profile onNext={nextStep} data={stepData} onDataChange={handleStepData} />;
      case 4:
        return <Step4Preferences onNext={nextStep} data={stepData} onDataChange={handleStepData} />;
      case 5:
        return (
          <Step5Welcome
            data={{ ...data.step2, ...data.step3, ...data.step4 }}
            onComplete={handleComplete}
            isSubmitting={isSubmitting}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-[400px] px-4 py-6 md:py-10">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/register/new')}
            className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:border-stone-200 hover:text-stone-950"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </button>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-stone-500">
            Registro personal
          </p>
        </div>

        <div className="mb-6 text-center md:mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-stone-950 md:text-4xl">
            Crea tu acceso paso a paso
          </h1>
          <p className="mt-3 text-sm leading-6 text-stone-600 md:text-base">
            Completa tu registro en pocos pasos y deja lista la personalización inicial para cuando termines.
          </p>
        </div>

        {currentStep < 5 && <div className="mb-6"><ProgressBar currentStep={currentStep} totalSteps={4} stepLabels={STEP_LABELS} /></div>}

        <div className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm md:p-8">
          {renderStep()}
        </div>
      </div>
    </div>
  );
};

export default ConsumerRegister;
