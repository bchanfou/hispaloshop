import React, { useState, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSectionProps {
  eyebrow?: string;
  title?: string;
  items: FAQItem[];
  tone?: 'warm' | 'white';
}

function FAQAccordion({ item, index }: { item: FAQItem; index: number; key?: React.Key }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      className="border-b border-stone-200 last:border-b-0"
    >
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between py-5 text-left bg-transparent border-none cursor-pointer group"
      >
        <span className="text-[15px] font-medium text-stone-950 pr-4 tracking-tight group-hover:text-stone-700 transition-colors">
          {item.question}
        </span>
        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center transition-colors group-hover:bg-stone-200">
          {open ? (
            <Minus size={14} className="text-stone-600" />
          ) : (
            <Plus size={14} className="text-stone-600" />
          )}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <p className="text-[14px] leading-relaxed text-stone-500 m-0 pb-5 pr-12">
              {item.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function FAQSection({
  eyebrow,
  title,
  items,
  tone = 'white',
}: FAQSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section ref={ref} className={`py-24 lg:py-32 ${tone === 'warm' ? 'bg-stone-50' : 'bg-white'}`}>
      <div className="max-w-[640px] mx-auto px-6">
        {/* Header */}
        {(eyebrow || title) && (
          <div className="mb-10 text-center">
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
          </div>
        )}

        {/* Accordion */}
        <div>
          {items.map((item, i) => (
            <FAQAccordion key={i} item={item} index={i} />
          ))}
        </div>

        {/* JSON-LD FAQ Schema for Google rich results */}
        {items.length > 0 && (
          <Helmet>
            <script type="application/ld+json">{JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": items.map(item => ({
                "@type": "Question",
                "name": item.question,
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": item.answer,
                },
              })),
            })}</script>
          </Helmet>
        )}
      </div>
    </section>
  );
}
