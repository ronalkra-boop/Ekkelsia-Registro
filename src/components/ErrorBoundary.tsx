import React from 'react';

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'Ocurrió un error inesperado en la aplicación.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('ErrorBoundary caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <h1 className="text-lg font-semibold text-slate-900">
              No se pudo completar la operación
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Ocurrió un error al sincronizar o procesar los datos. Puedes recargar la vista para continuar trabajando.
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-md p-3 text-xs font-mono text-slate-700 overflow-x-auto">
              {this.state.errorMessage.slice(0, 280)}
            </div>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, errorMessage: '' })}
              className="px-4 py-2 text-sm font-medium bg-blue-900 text-white rounded-md hover:bg-blue-800 transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
