import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, X, AlertCircle, Info } from 'lucide-react';

const VARIANTS = {
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
    iconColor: 'text-amber-600'
  },
  error: {
    icon: AlertCircle,
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    iconColor: 'text-red-600'
  },
  info: {
    icon: Info,
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    iconColor: 'text-blue-600'
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
          className="p-1 hover:bg-black/5 rounded-full transition-colors"
        >
          <X className={`w-4 h-4 ${variant.iconColor}`} />
        </button>
      )}
    </motion.div>
  );
}

export default AlertBanner;
