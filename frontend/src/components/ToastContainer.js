import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const styles = {
  success: 'bg-stone-700 text-white border-stone-800',
  error: 'bg-stone-900 text-white border-stone-950',
  warning: 'bg-stone-600 text-white border-stone-700',
  info: 'bg-stone-500 text-white border-stone-600',
};

export function ToastContainer({ toasts, onRemove }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] space-y-2 max-w-sm w-full px-4 md:px-0">
      {toasts.map((toast) => {
        const Icon = icons[toast.type];
        return (
          <div
            key={toast.id}
            className={`${styles[toast.type]} border rounded-xl shadow-lg p-4 flex items-start gap-3 animate-slide-in`}
            role="alert"
          >
            <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">{toast.message}</p>
            </div>
            <button
              onClick={() => onRemove(toast.id)}
              className="opacity-75 hover:opacity-100 transition-opacity"
              aria-label="Cerrar notificación"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default ToastContainer;
