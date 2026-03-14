import React from 'react';
import { motion } from 'framer-motion';

function BarChart({ data, labels, height = 160, color = '#0A0A0A' }) {
  const maxValue = Math.max(...data);
  
  return (
    <div className="w-full" style={{ height }}>
      <div className="flex items-end justify-between h-full gap-2">
        {data.map((value, index) => {
          const heightPercent = (value / maxValue) * 80;
          
          return (
            <div key={index} className="flex-1 flex flex-col items-center">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${heightPercent}%` }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className="w-full rounded-t-xl"
                style={{ backgroundColor: color }}
              />
            </div>
          );
        })}
      </div>
      
      {/* Labels */}
      <div className="flex justify-between mt-2">
        {labels.map((label, index) => (
          <span key={index} className="text-xs text-stone-500 flex-1 text-center">
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default BarChart;
