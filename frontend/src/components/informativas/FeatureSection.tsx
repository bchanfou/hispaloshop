import React from 'react';
import { motion, useInView } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface FeatureSectionProps {
  /** Optional eyebrow text */
  eyebrow?: string;
  /** Section title */
  title?: string;
  /** List of features to display */
  features: Feature[];
  /** Number of columns on desktop */
  columns?: 2 | 3 | 4;
  /** Background tone */
  tone?: 'warm' | 'white' | 'inverted';
}

function FeatureCard({ feature, index }: { feature: Feature; index: number; key?: React.Key }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  const Icon = feature.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.5,
        delay: index * 0.1,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className="flex flex-col"
    >
      <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center mb-4">
        <Icon size={20} className="text-stone-700" />
      </div>
      <h3 className="text-[15px] font-semibold text-stone-950 m-0 mb-2 tracking-tight">
        {feature.title}
      </h3>
      <p className="text-[14px] leading-relaxed text-stone-500 m-0">
        {feature.description}
      </p>
    </motion.div>
  );
}

export default function FeatureSection({
  eyebrow,
  title,
  features,
  columns = 3,
  tone = 'white',
}: FeatureSectionProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  const bgClass = {
    warm: 'bg-stone-50',
    white: 'bg-white',
    inverted: 'bg-stone-950',
  }[tone];

  const colClass = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
  }[columns];

  return (
    <section ref={ref} className={`${bgClass} py-24 lg:py-32`}>
      <div className="max-w-[1100px] mx-auto px-6">
        {/* Header */}
        {(eyebrow || title) && (
          <div className="mb-14 max-w-[480px]">
            {eyebrow && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5 }}
                className={`text-[11px] uppercase tracking-[0.12em] font-semibold mb-3 ${
                  tone === 'inverted' ? 'text-stone-500' : 'text-stone-400'
                }`}
              >
                {eyebrow}
              </motion.p>
            )}
            {title && (
              <motion.h2
                initial={{ opacity: 0, y: 14 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.1 }}
                className={`text-2xl sm:text-3xl font-semibold tracking-tight m-0 ${
                  tone === 'inverted' ? 'text-white' : 'text-stone-950'
                }`}
              >
                {title}
              </motion.h2>
            )}
          </div>
        )}

        {/* Grid */}
        <div className={`grid grid-cols-1 ${colClass} gap-10 lg:gap-12`}>
          {features.map((feature, i) => (
            <FeatureCard key={i} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
