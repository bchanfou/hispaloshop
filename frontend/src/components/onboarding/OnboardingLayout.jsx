import React from 'react';
import { Link } from 'react-router-dom';

export default function OnboardingLayout({
  children,
  currentStep,
  totalSteps = 4,
  onSkip,
  showSkip = true,
}) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="text-lg font-semibold text-stone-950">
              Hispaloshop
            </Link>

            {showSkip && onSkip ? (
              <button
                type="button"
                onClick={onSkip}
                className="text-sm font-medium text-stone-500 transition-colors hover:text-stone-950"
              >
                Omitir
              </button>
            ) : (
              <span className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-500">
                Primeros pasos
              </span>
            )}
          </div>
        </div>

        <div className="h-1 bg-stone-200">
          <div className="h-full bg-stone-950 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <main className="px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 flex items-center justify-center gap-2">
            {Array.from({ length: totalSteps }, (_, i) => (
              <React.Fragment key={i}>
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${i + 1 <= currentStep ? 'bg-stone-950 text-white' : 'bg-stone-200 text-stone-500'}`}>
                  {i + 1}
                </div>
                {i < totalSteps - 1 ? <div className={`h-0.5 w-12 ${i + 1 < currentStep ? 'bg-stone-950' : 'bg-stone-200'}`} /> : null}
              </React.Fragment>
            ))}
          </div>

          <div className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
