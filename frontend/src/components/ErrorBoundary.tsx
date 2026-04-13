// @ts-nocheck
import React, { ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import * as Sentry from '@sentry/react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary]:', error, errorInfo);
    try {
      Sentry.withScope((scope) => {
        scope.setExtra('componentStack', errorInfo?.componentStack);
        scope.setTag('errorBoundary', 'route');
        if (typeof window !== 'undefined') {
          scope.setExtra('route', window.location.pathname);
        }
        Sentry.captureException(error);
      });
    } catch {
      /* Sentry not initialized — never let reporting crash the app */
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = (): void => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') window.location.assign('/');
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-stone-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-lg">
            <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-stone-600" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-bold text-stone-950 mb-2">
              Algo salio mal
            </h2>
            <p className="text-stone-500 mb-6">
              Ha ocurrido un error inesperado. Puedes reintentar o volver al inicio.
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-stone-950 text-white rounded-full font-medium hover:bg-stone-800 transition-colors"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                Reintentar
              </button>
              <button
                onClick={this.handleGoHome}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-transparent text-stone-950 border border-stone-200 rounded-full font-medium hover:bg-stone-50 transition-colors"
              >
                <Home className="w-4 h-4" aria-hidden="true" />
                Volver al inicio
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
