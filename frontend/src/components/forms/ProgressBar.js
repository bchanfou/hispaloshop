import React from 'react';

const ProgressBar = ({ currentStep, totalSteps, stepLabels = [] }) => {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="w-full rounded-[24px] border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-stone-950">
          Paso {currentStep} de {totalSteps}
        </span>
        <span className="truncate text-sm text-stone-500">
          {stepLabels[currentStep - 1] || ''}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-stone-200">
        <div
          className="h-full rounded-full bg-stone-950 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-3 flex justify-between">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber <= currentStep;

          return (
            <div
              key={stepNumber}
              className={`h-2 w-2 rounded-full transition-colors ${
                isActive ? 'bg-stone-950' : 'bg-stone-300'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
};

export default ProgressBar;
