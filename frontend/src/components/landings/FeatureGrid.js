import React from 'react';
import { motion } from 'framer-motion';

const FeatureGrid = ({ features, columns = 3 }) => {
  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
  };

  return (
    <div className={`grid grid-cols-1 gap-6 ${gridCols[columns]}`}>
      {features.map((feature, index) => {
        const Icon = feature.icon;
        return (
          <motion.article
            key={feature.title || index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.08 }}
            className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-[0_14px_34px_-26px_rgba(15,23,42,0.16)] transition-shadow hover:shadow-[0_20px_40px_-28px_rgba(15,23,42,0.22)]"
          >
            {Icon ? (
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-950">
                <Icon className="h-6 w-6" />
              </div>
            ) : null}
            <h3 className="mb-2 text-lg font-semibold text-stone-950">{feature.title}</h3>
            <p className="text-sm leading-7 text-stone-700">{feature.description}</p>
          </motion.article>
        );
      })}
    </div>
  );
};

export default FeatureGrid;
