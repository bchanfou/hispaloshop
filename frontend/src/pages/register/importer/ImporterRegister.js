import React from 'react';
import { useNavigate } from 'react-router-dom';
import ProgressBar from '../../../components/forms/ProgressBar';
import useStepProgress from '../../../hooks/useStepProgress';
import Step1Profile from './steps/Step1Profile';
import Step2Company from './steps/Step2Company';
import Step3Interests from './steps/Step3Interests';
import Step4Requirements from './steps/Step4Requirements';
import Step5Verification from './steps/Step5Verification';

const STEP_LABELS = [
  'Perfil de empresa',
  'Datos empresariales',
  'Intereses',
  'Requisitos',
  'Verificación'
];

const ImporterRegister = () => {
  const navigate = useNavigate();
  const {
    currentStep,
    data,
    nextStep,
    updateData,
    clearProgress
  } = useStepProgress('importer', 5);

  const handleStepData = (stepData) => {
    updateData({ [`step${currentStep}`]: stepData });
  };

  const handleComplete = () => {
    console.log('Importer registration complete:', data);
    clearProgress();
  };

  const renderStep = () => {
    const stepData = data[`step${currentStep}`] || {};

    switch (currentStep) {
      case 1:
        return <Step1Profile onNext={nextStep} data={stepData} onDataChange={handleStepData} />;
      case 2:
        return <Step2Company onNext={nextStep} data={stepData} onDataChange={handleStepData} />;
      case 3:
        return <Step3Interests onNext={nextStep} data={stepData} onDataChange={handleStepData} />;
      case 4:
        return <Step4Requirements onNext={nextStep} data={stepData} onDataChange={handleStepData} />;
      case 5:
        return <Step5Verification onComplete={handleComplete} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      <div className="max-w-md mx-auto px-4 py-6">
        {currentStep < 5 && (
          <div className="mb-6">
            <ProgressBar
              currentStep={currentStep}
              totalSteps={4}
              stepLabels={STEP_LABELS}
            />
          </div>
        )}

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          {renderStep()}
        </div>
      </div>
    </div>
  );
};

export default ImporterRegister;
