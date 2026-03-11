import React from 'react';
import { motion } from 'framer-motion';

function KPICard({ icon: Icon, value, label, subtext, trend, trendUp, onClick }) {
  return (
    <motion.button
      type="button"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      className="w-full rounded-2xl border border-stone-100 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:shadow-md"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-100 text-stone-700">
          <Icon className="h-5 w-5" />
        </div>
        {trend ? (
          <span className={`text-xs font-medium ${trendUp ? 'text-stone-700' : 'text-stone-500'}`}>
            {trendUp ? '↑' : '↓'} {trend}
          </span>
        ) : null}
      </div>

      <div className="mt-4">
        <p className="text-2xl font-semibold tracking-tight text-stone-950">{value}</p>
        <p className="mt-1 text-sm text-stone-500">{label}</p>
        {subtext ? <p className="mt-1 text-xs text-stone-500">{subtext}</p> : null}
      </div>
    </motion.button>
  );
}

export default KPICard;
