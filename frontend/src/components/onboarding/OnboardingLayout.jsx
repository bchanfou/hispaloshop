import React from 'react';
import { Link } from 'react-router-dom';

export default function OnboardingLayout({ 
  children, 
  currentStep, 
  totalSteps = 4,
  onSkip,
  showSkip = true 
}) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center space-x-2">
              <span className="text-xl font-bold text-stone-900">Hispaloshop</span>
            </Link>
            
            {showSkip && onSkip && (
              <button
                onClick={onSkip}
                className="text-sm text-stone-500 hover:text-stone-700 transition-colors"
              >
                Omitir
              </button>
            )}
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="h-1 bg-stone-100">
          <div 
            className="h-full bg-stone-900 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      {/* Main content */}
      <main className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Step indicator */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-2">
              {Array.from({ length: totalSteps }, (_, i) => (
                <React.Fragment key={i}>
                  <div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      i + 1 <= currentStep
                        ? 'bg-stone-900 text-white'
                        : 'bg-stone-200 text-stone-500'
                    }`}
                  >
                    {i + 1 < currentStep ? (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>
                  {i < totalSteps - 1 && (
                    <div 
                      className={`w-12 h-0.5 transition-colors ${
                        i + 1 < currentStep ? 'bg-stone-900' : 'bg-stone-200'
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 sm:p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
