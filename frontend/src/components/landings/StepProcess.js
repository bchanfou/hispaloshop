import React from 'react';
import { motion } from 'framer-motion';

const StepProcess = ({ steps, layout = 'horizontal' }) => {
  const isHorizontal = layout === 'horizontal';
  const horizontalColsClass = isHorizontal
    ? (steps.length === 2
      ? 'md:grid-cols-2'
      : steps.length === 4
        ? 'md:grid-cols-4'
        : 'md:grid-cols-3')
    : '';

  return (
    <div className={`${isHorizontal ? `grid gap-6 ${horizontalColsClass}` : 'space-y-8'}`}>
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
            {isHorizontal && index < steps.length - 1 && (
              <div className="absolute left-[60%] top-8 hidden h-0.5 w-[80%] bg-stone-200 md:block" />
            )}

            <div className={`${isHorizontal ? 'mx-auto mb-4' : 'flex-shrink-0'}`}>
              <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-stone-950">
                <Icon className="w-7 h-7 text-white" />
              </div>
            </div>

            <div className={isHorizontal ? '' : 'flex-1'}>
              <div className="mb-1 text-sm font-semibold text-stone-500">
                Paso {index + 1}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-stone-950">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-stone-600">
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
