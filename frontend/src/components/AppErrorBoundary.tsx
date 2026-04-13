// @ts-nocheck
import React, { ErrorInfo, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Unhandled application error:', error, errorInfo);
    try {
      // Dynamic import avoids hard dependency if Sentry is not initialized
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Sentry = require('@sentry/react');
      Sentry.withScope((scope: any) => {
        scope.setExtra('componentStack', errorInfo?.componentStack);
        scope.setTag('errorBoundary', 'app');
        if (typeof window !== 'undefined') {
          scope.setExtra('route', window.location.pathname);
        }
        Sentry.captureException(error);
      });
    } catch {
      /* Sentry not initialized — never let reporting crash the app */
    }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
    window.location.assign('/');
  };

  handleReload = (): void => {
    if (typeof window !== 'undefined') window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white border border-stone-200 rounded-2xl shadow-sm p-6 text-center">
            <h1 className="text-xl font-semibold text-stone-950 mb-2">Algo ha fallado</h1>
            <p className="text-sm text-stone-600 mb-6">
              Hemos evitado una pantalla en blanco. Puedes volver al inicio o recargar la aplicacion.
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={this.handleRetry}
                className="w-full rounded-full bg-stone-950 text-white px-4 py-3 text-sm font-medium hover:bg-stone-900 transition-colors"
              >
                Volver al inicio
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full rounded-full bg-transparent text-stone-950 border border-stone-200 px-4 py-3 text-sm font-medium hover:bg-stone-50 transition-colors"
              >
                Recargar aplicacion
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
