import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

interface HeroSectionProps {
  /** Eyebrow text above title */
  eyebrow?: string;
  /** Main title — each word animates in */
  title: string;
  /** Subtitle paragraph */
  subtitle: string;
  /** CTA button text */
  ctaText: string;
  /** CTA route */
  ctaTo: string;
  /** Optional secondary CTA */
  secondaryCtaText?: string;
  secondaryCtaTo?: string;
  /** Optional SVG illustration component */
  illustration?: React.ReactNode;
  /** Tone: 'warm' = stone-50 bg, 'inverted' = stone-950 bg */
  tone?: 'warm' | 'inverted';
}

export default function HeroSection({
  eyebrow,
  title,
  subtitle,
  ctaText,
  ctaTo,
  secondaryCtaText,
  secondaryCtaTo,
  illustration,
  tone = 'warm',
}: HeroSectionProps) {
  const words = title.split(' ');
  const isInverted = tone === 'inverted';

  return (
    <section
      className={`relative min-h-[85vh] flex items-center justify-center overflow-hidden ${
        isInverted ? 'bg-stone-950' : 'bg-stone-50'
      }`}
    >
      <div className="max-w-[1100px] mx-auto px-6 py-32 lg:py-40 w-full">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-12 lg:gap-16">
          {/* Text column */}
          <div className="flex-1 max-w-[560px]">
            {/* Eyebrow */}
            {eyebrow && (
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className={`text-[11px] uppercase tracking-[0.12em] font-semibold mb-6 ${
                  isInverted ? 'text-stone-500' : 'text-stone-400'
                }`}
              >
                {eyebrow}
              </motion.p>
            )}

            {/* Title — word-by-word reveal */}
            <h1
              className={`text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.08] tracking-tight m-0 ${
                isInverted ? 'text-white' : 'text-stone-950'
              }`}
            >
              {words.map((word, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.5,
                    delay: 0.2 + i * 0.08,
                    ease: [0.25, 0.1, 0.25, 1],
                  }}
                  className="inline-block mr-[0.28em]"
                >
                  {word}
                </motion.span>
              ))}
            </h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className={`text-lg sm:text-xl leading-relaxed mt-6 mb-0 max-w-[440px] ${
                isInverted ? 'text-stone-400' : 'text-stone-500'
              }`}
            >
              {subtitle}
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.65 }}
              className="flex items-center gap-3 mt-10"
            >
              <Link
                to={ctaTo}
                className={`inline-flex items-center justify-center h-12 px-7 text-[14px] font-semibold no-underline rounded-full transition-all duration-200 ${
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
                  className={`inline-flex items-center justify-center h-12 px-7 text-[14px] font-medium no-underline rounded-full border transition-all duration-200 ${
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

          {/* Illustration column */}
          {illustration && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex-shrink-0 w-full max-w-[400px] lg:max-w-[440px]"
            >
              {illustration}
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
