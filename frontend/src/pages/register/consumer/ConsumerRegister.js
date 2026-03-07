import React from 'react';
import { useNavigate } from 'react-router-dom';
import ProgressBar from '../../../components/forms/ProgressBar';
import useStepProgress from '../../../hooks/useStepProgress';
import Step1Method from './steps/Step1Method';
import Step2Basic from './steps/Step2Basic';
import Step3Profile from './steps/Step3Profile';
import Step4Preferences from './steps/Step4Preferences';
import Step5Welcome from './steps/Step5Welcome';

const STEP_LABELS = [
  'Método de registro',
  'Datos básicos',
  'Perfil alimentario',
  'Preferencias',
  'Bienvenida'
];

const ConsumerRegister = () => {
  const navigate = useNavigate();
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

  const handleComplete = () => {
    // Here you would submit all data to the API
    console.log('Registration complete:', data);
    clearProgress();
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
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
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
