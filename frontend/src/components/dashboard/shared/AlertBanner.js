import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, X, AlertCircle, Info } from 'lucide-react';

const VARIANTS = {
  warning: {
    icon: AlertTriangle,
    bg: 'bg-stone-100',
    border: 'border-stone-200',
    text: 'text-stone-800',
    iconColor: 'text-stone-700'
  },
  error: {
    icon: AlertCircle,
    bg: 'bg-stone-950',
    border: 'border-stone-950',
    text: 'text-white',
    iconColor: 'text-stone-300'
  },
  info: {
    icon: Info,
    bg: 'bg-stone-50',
    border: 'border-stone-200',
    text: 'text-stone-600',
    iconColor: 'text-stone-500'
  }
};

function AlertBanner({ type = 'warning', message, actionLabel, onAction, onDismiss }) {
  const variant = VARIANTS[type];
  const Icon = variant.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`${variant.bg} ${variant.border} border rounded-xl p-3 flex items-center gap-3`}
    >
      <Icon className={`w-5 h-5 ${variant.iconColor} flex-shrink-0`} />
      <p className={`text-sm ${variant.text} flex-1`}>{message}</p>
      
      {actionLabel && onAction && (
        <button 
          onClick={onAction}
          className={`text-sm font-medium ${variant.text} hover:underline whitespace-nowrap`}
        >
          {actionLabel}
        </button>
      )}
      
      {onDismiss && (
        <button 
          onClick={onDismiss}
          className="p-1 hover:bg-stone-950/5 rounded-full transition-colors"
        >
          <X className={`w-4 h-4 ${variant.iconColor}`} />
        </button>
      )}
    </motion.div>
  );
}

export default AlertBanner;
