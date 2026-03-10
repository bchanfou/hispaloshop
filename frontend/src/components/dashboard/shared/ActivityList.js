import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Package, CheckCircle, Clock, Truck } from 'lucide-react';

const STATUS_ICONS = {
  pending: { icon: Clock, color: 'var(--color-warning)' },
  processing: { icon: Package, color: 'var(--color-info)' },
  shipped: { icon: Truck, color: 'var(--color-accent)' },
  delivered: { icon: CheckCircle, color: 'var(--color-success)' }
};

function ActivityList({ items, emptyMessage = "No hay actividad reciente" }) {
  if (!items || items.length === 0) {
    return (
      <div className="text-center py-8 text-text-muted">
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const status = STATUS_ICONS[item.status] || STATUS_ICONS.pending;
        const StatusIcon = status.icon;
        
        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white rounded-xl p-4 border border-stone-100 flex items-center gap-3"
          >
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${status.color}15` }}
            >
              <StatusIcon className="w-5 h-5" style={{ color: status.color }} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                <span className="text-sm font-semibold text-gray-900">{item.amount}</span>
              </div>
              <p className="text-xs text-text-muted">{item.subtitle}</p>
              <p className="text-xs text-text-muted mt-0.5">{item.description}</p>
            </div>
            
            {item.actionLabel && (
              <button 
                onClick={item.onAction}
                className="flex items-center gap-1 text-xs font-medium text-accent hover:text-accent/90 whitespace-nowrap"
              >
                {item.actionLabel}
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

export default ActivityList;
