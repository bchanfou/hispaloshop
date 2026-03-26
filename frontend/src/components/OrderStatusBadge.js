import React from 'react';
import { Clock, Check, Package, Truck, XCircle, CreditCard, AlertTriangle, RotateCcw } from 'lucide-react';

const STATUS_CONFIG = {
  pending:              { icon: Clock,          label: 'Pendiente',           color: 'bg-stone-100 text-stone-700' },
  paid:                 { icon: CreditCard,     label: 'Pagado',              color: 'bg-stone-100 text-stone-700' },
  processing:           { icon: Clock,          label: 'Procesando',          color: 'bg-stone-100 text-stone-700' },
  confirmed:            { icon: Check,          label: 'Confirmado',          color: 'bg-stone-100 text-stone-700' },
  preparing:            { icon: Package,        label: 'Preparando',          color: 'bg-stone-100 text-stone-700' },
  shipped:              { icon: Truck,          label: 'Enviado',             color: 'bg-stone-100 text-stone-700' },
  delivered:            { icon: Check,          label: 'Entregado',           color: 'bg-stone-950 text-white' },
  completed:            { icon: Check,          label: 'Completado',          color: 'bg-stone-950 text-white' },
  cancelled:            { icon: XCircle,        label: 'Cancelado',           color: 'border border-stone-200 text-stone-400 bg-white' },
  refunded:             { icon: RotateCcw,      label: 'Reembolsado',         color: 'border border-stone-200 text-stone-400 bg-white' },
  partially_refunded:   { icon: RotateCcw,      label: 'Reembolso parcial',   color: 'border border-stone-200 text-stone-500 bg-white' },
  payment_failed:       { icon: AlertTriangle,  label: 'Pago fallido',        color: 'border border-stone-200 text-stone-500 bg-white' },
};

export function getStatusLabel(status) {
  return STATUS_CONFIG[status]?.label || status;
}

export function getStatusColor(status) {
  return STATUS_CONFIG[status]?.color || 'bg-stone-100 text-stone-700';
}

export function getStatusIcon(status) {
  return STATUS_CONFIG[status]?.icon || Clock;
}

export default function OrderStatusBadge({ status, showIcon = false, className = '' }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color} ${className}`}>
      {showIcon && <Icon className="w-3 h-3" />}
      {config.label}
    </span>
  );
}
