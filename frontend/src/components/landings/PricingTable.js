import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const PricingTable = ({ plans, highlighted = 1 }) => {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {plans.map((plan, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.1 }}
          className={`relative rounded-2xl p-6 ${
            index === highlighted
              ? 'scale-105 border border-stone-950 bg-stone-950 text-white shadow-xl'
              : 'border-2 border-stone-200 bg-white'
          }`}
        >
          {index === highlighted ? (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-stone-950">
                Destacado
              </span>
            </div>
          ) : null}

          <div className="mb-6 text-center">
            <h3 className={`mb-2 text-lg font-semibold ${index === highlighted ? 'text-white' : 'text-stone-950'}`}>
              {plan.name}
            </h3>
            <div className="flex items-baseline justify-center gap-1">
              <span className={`text-4xl font-bold ${index === highlighted ? 'text-white' : 'text-stone-950'}`}>
                {plan.price}
              </span>
              {plan.period ? (
                <span className={index === highlighted ? 'text-white/70' : 'text-stone-500'}>
                  {plan.period}
                </span>
              ) : null}
            </div>
            <p className={`mt-2 text-sm ${index === highlighted ? 'text-white/70' : 'text-stone-600'}`}>
              {plan.commission}
            </p>
          </div>

          <ul className="mb-6 space-y-3">
            {plan.features.map((feature, featureIndex) => (
              <li key={featureIndex} className="flex items-start gap-3">
                <Check className={`h-5 w-5 shrink-0 ${index === highlighted ? 'text-white' : 'text-stone-900'}`} />
                <span className={`text-sm ${index === highlighted ? 'text-white/90' : 'text-stone-600'}`}>
                  {feature}
                </span>
              </li>
            ))}
          </ul>

          <button
            onClick={plan.onCta}
            className={`w-full rounded-xl py-3 font-medium transition-colors ${
              index === highlighted
                ? 'bg-white text-stone-950 hover:bg-stone-100'
                : 'bg-stone-950 text-white hover:bg-black'
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
