import React from 'react';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled application error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.assign('/');
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
            <button
              type="button"
              onClick={this.handleRetry}
              className="w-full rounded-full bg-stone-900 text-white px-4 py-3 text-sm font-medium hover:bg-stone-800 transition-colors"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
