import React, { useRef } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface Step {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface StepsSectionProps {
  eyebrow?: string;
  title?: string;
  steps: Step[];
  tone?: 'warm' | 'white';
}

function StepCard({ step, index, total }: { step: Step; index: number; total: number; key?: React.Key }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  const Icon = step.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.15, ease: [0.25, 0.1, 0.25, 1] }}
      className="relative flex gap-5"
    >
      {/* Vertical line + step number */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-stone-950 flex items-center justify-center text-white text-sm font-semibold">
          {index + 1}
        </div>
        {index < total - 1 && (
          <div className="w-px flex-1 bg-stone-200 mt-2" />
        )}
      </div>

      {/* Content */}
      <div className={`pb-12 ${index === total - 1 ? 'pb-0' : ''}`}>
        <div className="flex items-center gap-2.5 mb-2">
          <Icon size={18} className="text-stone-500" />
          <h3 className="text-[15px] font-semibold text-stone-950 m-0 tracking-tight">
            {step.title}
          </h3>
        </div>
        <p className="text-[14px] leading-relaxed text-stone-500 m-0 max-w-[360px]">
          {step.description}
        </p>
      </div>
    </motion.div>
  );
}

export default function StepsSection({
  eyebrow,
  title,
  steps,
  tone = 'warm',
}: StepsSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-80px' });

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  const progressHeight = useTransform(scrollYProgress, [0.15, 0.85], ['0%', '100%']);

  return (
    <section
      ref={sectionRef}
      className={`py-24 lg:py-32 ${tone === 'warm' ? 'bg-stone-50' : 'bg-white'}`}
    >
      <div className="max-w-[1100px] mx-auto px-6">
        <div className="flex flex-col lg:flex-row lg:gap-20">
          {/* Left: sticky title */}
          <div className="lg:w-[340px] lg:flex-shrink-0 mb-12 lg:mb-0 lg:sticky lg:top-32 lg:self-start">
            {eyebrow && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5 }}
                className="text-[11px] uppercase tracking-[0.12em] font-semibold text-stone-400 mb-3"
              >
                {eyebrow}
              </motion.p>
            )}
            {title && (
              <motion.h2
                initial={{ opacity: 0, y: 14 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-2xl sm:text-3xl font-semibold tracking-tight text-stone-950 m-0"
              >
                {title}
              </motion.h2>
            )}

            {/* Progress bar (desktop only) */}
            <div className="hidden lg:block mt-8 w-1 h-24 bg-stone-200 rounded-full overflow-hidden">
              <motion.div
                className="w-full bg-stone-950 rounded-full origin-top"
                style={{ height: progressHeight }}
              />
            </div>
          </div>

          {/* Right: steps */}
          <div className="flex-1 max-w-[520px]">
            {steps.map((step, i) => (
              <StepCard key={i} step={step} index={i} total={steps.length} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
