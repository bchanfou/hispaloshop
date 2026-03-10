import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const PricingTable = ({ plans, highlighted = 1 }) => {
  return (
    <div className="grid md:grid-cols-3 gap-6">
      {plans.map((plan, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.1 }}
          className={`relative rounded-2xl p-6 ${
            index === highlighted
              ? 'bg-accent text-white shadow-xl scale-105'
              : 'bg-white border-2 border-gray-100'
          }`}
        >
          {index === highlighted && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-state-amber text-white text-xs font-bold px-3 py-1 rounded-full">
                POPULAR
              </span>
            </div>
          )}
          
          <div className="text-center mb-6">
            <h3 className={`text-lg font-semibold mb-2 ${index === highlighted ? 'text-white' : 'text-gray-900'}`}>
              {plan.name}
            </h3>
            <div className="flex items-baseline justify-center gap-1">
              <span className={`text-4xl font-bold ${index === highlighted ? 'text-white' : 'text-gray-900'}`}>
                {plan.price}
              </span>
              {plan.period && (
                <span className={index === highlighted ? 'text-white/70' : 'text-text-muted'}>
                  {plan.period}
                </span>
              )}
            </div>
            <p className={`text-sm mt-2 ${index === highlighted ? 'text-white/70' : 'text-text-muted'}`}>
              {plan.commission}
            </p>
          </div>

          <ul className="space-y-3 mb-6">
            {plan.features.map((feature, fIndex) => (
              <li key={fIndex} className="flex items-start gap-3">
                <Check className={`w-5 h-5 flex-shrink-0 ${index === highlighted ? 'text-state-amber' : 'text-state-success'}`} />
                <span className={`text-sm ${index === highlighted ? 'text-white/90' : 'text-text-muted'}`}>
                  {feature}
                </span>
              </li>
            ))}
          </ul>

          <button
            onClick={plan.onCta}
            className={`w-full py-3 rounded-xl font-medium transition-colors ${
              index === highlighted
                ? 'bg-white text-accent hover:bg-gray-100'
                : 'bg-accent text-white hover:bg-accent/90'
            }`}
          >
            {plan.cta}
          </button>
        </motion.div>
      ))}
    </div>
  );
};

export default PricingTable;
