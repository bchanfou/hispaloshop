import React from 'react';

const ProgressBar = ({ currentStep, totalSteps, stepLabels = [] }) => {
  const progress = ((currentStep) / totalSteps) * 100;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-900">
          Paso {currentStep} de {totalSteps}
        </span>
        <span className="text-sm text-text-muted">
          {stepLabels[currentStep - 1] || ''}
        </span>
      </div>
      
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* Step dots */}
      <div className="flex justify-between mt-2">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          
          return (
            <div 
              key={stepNumber}
              className={`w-2 h-2 rounded-full transition-colors ${
                isCompleted || isCurrent ? 'bg-accent' : 'bg-gray-300'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
};

export default ProgressBar;
