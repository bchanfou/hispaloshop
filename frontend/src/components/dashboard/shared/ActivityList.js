import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, CheckCircle, Clock, Package, Truck } from 'lucide-react';

const STATUS_ICONS = {
  pending: Clock,
  processing: Package,
  shipped: Truck,
  delivered: CheckCircle,
};

function ActivityList({ items, emptyMessage = 'No hay actividad reciente' }) {
  if (!items || items.length === 0) {
    return <div className="rounded-2xl border border-dashed border-stone-200 bg-white py-10 text-center text-sm text-stone-500">{emptyMessage}</div>;
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const StatusIcon = STATUS_ICONS[item.status] || Clock;

        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.04 }}
            className="flex items-center gap-3 rounded-2xl border border-stone-100 bg-white p-4"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-700">
              <StatusIcon className="h-4 w-4" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-medium text-stone-950">{item.title}</p>
                {item.amount ? <span className="text-sm font-medium text-stone-950">{item.amount}</span> : null}
              </div>
              <p className="mt-1 text-xs text-stone-500">{item.subtitle}</p>
              <p className="mt-0.5 text-xs text-stone-500">{item.description}</p>
            </div>

            {item.actionLabel ? (
              <button type="button" onClick={item.onAction} className="inline-flex items-center gap-1 text-xs font-medium text-stone-700">
                {item.actionLabel}
                <ChevronRight className="h-3 w-3" />
              </button>
            ) : null}
          </motion.div>
        );
      })}
    </div>
  );
}

export default ActivityList;
