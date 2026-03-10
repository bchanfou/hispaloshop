import React from 'react';
import { motion } from 'framer-motion';

const FeatureGrid = ({ features, columns = 3 }) => {
  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
  };

  return (
    <div className={`grid grid-cols-1 ${gridCols[columns]} gap-6`}>
      {features.map((feature, index) => {
        const Icon = feature.icon;
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            {Icon && (
              <div
                className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${feature.color || '#111111'}15` }}
              >
                <Icon className="w-6 h-6" style={{ color: feature.color || '#111111' }} />
              </div>
            )}
            <h3 className="mb-2 text-lg font-semibold text-stone-950">
              {feature.title}
            </h3>
            <p className="text-sm leading-relaxed text-stone-600">
              {feature.description}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
};

export default FeatureGrid;
