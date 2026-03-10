import React from 'react';
import { motion } from 'framer-motion';

function QuickActions({ actions }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {actions.map((action, index) => (
        <motion.button
          key={action.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          onClick={action.onClick}
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-stone-100 shadow-sm hover:shadow-md transition-all text-left"
        >
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${action.color}15` }}
          >
            <action.icon className="w-5 h-5" style={{ color: action.color }} />
          </div>
          <span className="text-sm font-medium text-gray-900">{action.label}</span>
        </motion.button>
      ))}
    </div>
  );
}

export default QuickActions;
