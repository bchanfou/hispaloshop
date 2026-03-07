import React from 'react';
import { useNavigate } from 'react-router-dom';
import ProgressBar from '../../../components/forms/ProgressBar';
import useStepProgress from '../../../hooks/useStepProgress';
import Step1Business from './steps/Step1Business';
import Step2Legal from './steps/Step2Legal';
import Step3Product from './steps/Step3Product';
import Step4Logistics from './steps/Step4Logistics';
import Step5Store from './steps/Step5Store';

const STEP_LABELS = [
  'Tipo de negocio',
  'Datos legales',
  'Producto',
  'Logística',
  'Verificación'
];

const ProducerRegister = () => {
  const navigate = useNavigate();
  const {
    currentStep,
    data,
    nextStep,
    updateData,
    clearProgress
  } = useStepProgress('producer', 5);

  const handleStepData = (stepData) => {
    updateData({ [`step${currentStep}`]: stepData });
  };

  const handleComplete = () => {
    console.log('Producer registration complete:', data);
    clearProgress();
  };

  const renderStep = () => {
    const stepData = data[`step${currentStep}`] || {};

    switch (currentStep) {
      case 1:
        return <Step1Business onNext={nextStep} data={stepData} onDataChange={handleStepData} />;
      case 2:
        return <Step2Legal onNext={nextStep} data={stepData} onDataChange={handleStepData} />;
      case 3:
        return <Step3Product onNext={nextStep} data={stepData} onDataChange={handleStepData} />;
      case 4:
        return <Step4Logistics onNext={nextStep} data={stepData} onDataChange={handleStepData} />;
      case 5:
        return <Step5Store onComplete={handleComplete} />;
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

export default ProducerRegister;
