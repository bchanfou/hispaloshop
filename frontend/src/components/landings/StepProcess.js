import React from 'react';
import { motion } from 'framer-motion';

const StepProcess = ({ steps, layout = 'horizontal' }) => {
  const isHorizontal = layout === 'horizontal';

  return (
    <div className={`${isHorizontal ? 'grid md:grid-cols-4 gap-6' : 'space-y-8'}`}>
      {steps.map((step, index) => {
        const Icon = step.icon;
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.15 }}
            className={`relative ${isHorizontal ? 'text-center' : 'flex gap-6'}`}
          >
            {/* Connector line */}
            {isHorizontal && index < steps.length - 1 && (
              <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-accent/20" />
            )}

            {/* Icon */}
            <div className={`${isHorizontal ? 'mx-auto mb-4' : 'flex-shrink-0'}`}>
              <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center relative z-10">
                <Icon className="w-7 h-7 text-white" />
              </div>
            </div>

            {/* Content */}
            <div className={isHorizontal ? '' : 'flex-1'}>
              <div className="text-sm font-semibold text-accent mb-1">
                Paso {index + 1}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {step.title}
              </h3>
              <p className="text-text-muted text-sm leading-relaxed">
                {step.description}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default StepProcess;
