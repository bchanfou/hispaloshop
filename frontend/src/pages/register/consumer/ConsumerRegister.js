import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  'Método de registro',
  'Datos básicos',
  'Perfil alimentario',
  'Preferencias',
  'Bienvenida'
];

const ConsumerRegister = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    currentStep,
    data,
    nextStep,
    prevStep,
    updateData,
    clearProgress
  } = useStepProgress('consumer', 5);

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
      navigate('/');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Error al crear la cuenta. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    const stepData = data[`step${currentStep}`] || {};

    switch (currentStep) {
      case 1:
        return (
          <Step1Method
            onNext={nextStep}
            onMethodSelect={(method) => handleStepData({ method })}
          />
        );
      case 2:
        return (
          <Step2Basic
            onNext={nextStep}
            data={stepData}
            onDataChange={handleStepData}
          />
        );
      case 3:
        return (
          <Step3Profile
            onNext={nextStep}
            data={stepData}
            onDataChange={handleStepData}
          />
        );
      case 4:
        return (
          <Step4Preferences
            onNext={nextStep}
            data={stepData}
            onDataChange={handleStepData}
          />
        );
      case 5:
        return (
          <Step5Welcome
            data={{
              ...data.step2,
              ...data.step3,
              ...data.step4
            }}
            onComplete={handleComplete}
            isSubmitting={isSubmitting}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background-subtle">
      <div className="max-w-md mx-auto px-4 py-6">
        {/* Progress */}
        {currentStep < 5 && (
          <div className="mb-6">
            <ProgressBar
              currentStep={currentStep}
              totalSteps={4}
              stepLabels={STEP_LABELS}
            />
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          {renderStep()}
        </div>
      </div>
    </div>
  );
};

export default ConsumerRegister;
