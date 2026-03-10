import React from 'react';
import { motion } from 'framer-motion';

function KPICard({ icon: Icon, value, label, subtext, trend, trendUp, onClick, accentColor = '#2D5A3D' }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${accentColor}15` }}
        >
          <Icon className="w-5 h-5" style={{ color: accentColor }} />
        </div>
        {trend && (
          <span className={`text-xs font-medium ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
            {trendUp ? '↑' : '↓'} {trend}
          </span>
        )}
      </div>
      
      <div className="mt-3">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-text-muted">{label}</p>
        {subtext && (
          <p className="text-xs text-accent mt-1">{subtext}</p>
        )}
      </div>
    </motion.div>
  );
}

export default KPICard;
