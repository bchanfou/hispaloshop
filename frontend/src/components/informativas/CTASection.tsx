import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';

interface CTASectionProps {
  title: string;
  subtitle?: string;
  ctaText: string;
  ctaTo: string;
  secondaryCtaText?: string;
  secondaryCtaTo?: string;
  tone?: 'warm' | 'inverted';
}

export default function CTASection({
  title,
  subtitle,
  ctaText,
  ctaTo,
  secondaryCtaText,
  secondaryCtaTo,
  tone = 'inverted',
}: CTASectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  const isInverted = tone === 'inverted';

  return (
    <section
      ref={ref}
      className={`py-24 lg:py-32 ${isInverted ? 'bg-stone-950' : 'bg-stone-50'}`}
    >
      <div className="max-w-[640px] mx-auto px-6 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className={`text-3xl sm:text-4xl font-semibold tracking-tight m-0 ${
            isInverted ? 'text-white' : 'text-stone-950'
          }`}
        >
          {title}
        </motion.h2>

        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className={`text-lg leading-relaxed mt-4 mb-0 ${
              isInverted ? 'text-stone-400' : 'text-stone-500'
            }`}
          >
            {subtitle}
          </motion.p>
        )}

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex items-center justify-center gap-3 mt-8"
        >
          <Link
            to={ctaTo}
            className={`inline-flex items-center justify-center h-12 px-8 text-[14px] font-semibold no-underline rounded-full transition-all duration-200 ${
              isInverted
                ? 'bg-white text-stone-950 hover:bg-stone-200'
                : 'bg-stone-950 text-white hover:bg-stone-800'
            }`}
          >
            {ctaText}
          </Link>
          {secondaryCtaText && secondaryCtaTo && (
            <Link
              to={secondaryCtaTo}
              className={`inline-flex items-center justify-center h-12 px-8 text-[14px] font-medium no-underline rounded-full border transition-all duration-200 ${
                isInverted
                  ? 'border-stone-700 text-stone-300 hover:border-stone-500 hover:text-white'
                  : 'border-stone-300 text-stone-600 hover:border-stone-400 hover:text-stone-950'
              }`}
            >
              {secondaryCtaText}
            </Link>
          )}
        </motion.div>
      </div>
    </section>
  );
}
