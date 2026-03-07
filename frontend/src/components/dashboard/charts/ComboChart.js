import React from 'react';
import { motion } from 'framer-motion';

function ComboChart({ barData, lineData, labels, height = 160, barColor = '#2D5A3D', lineColor = '#E6A532' }) {
  const maxBarValue = Math.max(...barData);
  const maxLineValue = Math.max(...lineData);
  
  return (
    <div className="w-full" style={{ height }}>
      <div className="relative h-full">
        {/* Bars */}
        <div className="flex items-end justify-between h-full gap-2 absolute inset-0">
          {barData.map((value, index) => {
            const heightPercent = (value / maxBarValue) * 60;
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center justify-end">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPercent}%` }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                  className="w-full rounded-t-lg opacity-80"
                  style={{ backgroundColor: barColor }}
                />
              </div>
            );
          })}
        </div>
        
        {/* Line */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          {lineData.map((value, index) => {
            if (index === lineData.length - 1) return null;
            const x1 = (index / (lineData.length - 1)) * 100;
            const y1 = 100 - ((value / maxLineValue) * 80) - 10;
            const x2 = ((index + 1) / (lineData.length - 1)) * 100;
            const y2 = 100 - ((lineData[index + 1] / maxLineValue) * 80) - 10;
            
            return (
              <motion.line
                key={index}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={lineColor}
                strokeWidth="1"
              />
            );
          })}
          
          {/* Line points */}
          {lineData.map((value, index) => {
            const x = (index / (lineData.length - 1)) * 100;
            const y = 100 - ((value / maxLineValue) * 80) - 10;
            
            return (
              <motion.circle
                key={`point-${index}`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.8 + index * 0.1 }}
                cx={x}
                cy={y}
                r="2"
                fill={lineColor}
              />
            );
          })}
        </svg>
      </div>
      
      {/* Labels */}
      <div className="flex justify-between mt-2">
        {labels.map((label, index) => (
          <span key={index} className="text-xs text-[#6B7280] flex-1 text-center">
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default ComboChart;
