import React from 'react';
import { useNavigate } from 'react-router-dom';
import ProgressBar from '../../../components/forms/ProgressBar';
import useStepProgress from '../../../hooks/useStepProgress';
import Step1Type from './steps/Step1Type';
import Step2Contact from './steps/Step2Contact';
import Step3Audience from './steps/Step3Audience';
import Step4Payments from './steps/Step4Payments';
import Step5Verification from './steps/Step5Verification';

const STEP_LABELS = [
  'Tipo de contenido',
  'Datos de contacto',
  'Audiencia',
  'Pagos',
  'Verificación'
];

const InfluencerRegister = () => {
  const navigate = useNavigate();
  const {
    currentStep,
    data,
    nextStep,
    prevStep,
    updateData,
    clearProgress
  } = useStepProgress('influencer', 5);

  const handleStepData = (stepData) => {
    updateData({ [`step${currentStep}`]: stepData });
  };

  const handleComplete = () => {
    console.log('Influencer registration complete:', data);
    clearProgress();
  };

  const renderStep = () => {
    const stepData = data[`step${currentStep}`] || {};

    switch (currentStep) {
      case 1:
        return <Step1Type onNext={nextStep} data={stepData} onDataChange={handleStepData} />;
      case 2:
        return <Step2Contact onNext={nextStep} data={stepData} onDataChange={handleStepData} />;
      case 3:
        return <Step3Audience onNext={nextStep} data={stepData} onDataChange={handleStepData} />;
      case 4:
        return <Step4Payments onNext={nextStep} data={stepData} onDataChange={handleStepData} />;
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

export default InfluencerRegister;
