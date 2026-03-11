import React from 'react';
import { motion } from 'framer-motion';

function QuickActions({ actions }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {actions.map((action, index) => (
        <motion.button
          key={action.id}
          type="button"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.04 }}
          onClick={action.onClick}
          className="flex items-center gap-3 rounded-2xl border border-stone-100 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-stone-100 text-stone-700">
            <action.icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-stone-950">{action.label}</p>
            {action.description ? <p className="mt-1 text-xs text-stone-500">{action.description}</p> : null}
          </div>
        </motion.button>
      ))}
    </div>
  );
}

export default QuickActions;
