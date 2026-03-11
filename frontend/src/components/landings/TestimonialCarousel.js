import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';

const TestimonialCarousel = ({ testimonials = [] }) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (testimonials.length <= 1) {
      return undefined;
    }

    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [testimonials.length]);

  if (!testimonials.length) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
        <p className="text-lg font-medium text-stone-950">Próximamente</p>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Cuando tengamos voces reales de la comunidad, aparecerán aquí.
        </p>
      </div>
    );
  }

  const goTo = (index) => setCurrent(index);
  const prev = () => setCurrent((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  const next = () => setCurrent((prev) => (prev + 1) % testimonials.length);

  return (
    <div className="relative">
      <div className="overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm"
          >
            <Quote className="mb-4 h-10 w-10 text-stone-900" />
            <p className="mb-6 text-xl leading-relaxed text-stone-950">
              "{testimonials[current].quote}"
            </p>
            <div className="flex items-center gap-4">
              {testimonials[current].image ? (
                <img
                  src={testimonials[current].image}
                  alt={testimonials[current].name}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-sm font-semibold text-stone-900">
                  {testimonials[current].name?.slice(0, 1) || '?'}
                </div>
              )}
              <div>
                <p className="font-semibold text-stone-950">{testimonials[current].name}</p>
                <p className="text-sm text-stone-600">{testimonials[current].role}</p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {testimonials.length > 1 ? (
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={prev}
            aria-label="Testimonio anterior"
            className="rounded-full border border-stone-200 bg-white p-2 transition-shadow hover:shadow-md"
          >
            <ChevronLeft className="h-5 w-5 text-stone-950" />
          </button>

          <div className="flex gap-2" role="tablist" aria-label="Testimonios">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => goTo(index)}
                role="tab"
                aria-selected={index === current}
                aria-label={`Testimonio ${index + 1}`}
                className={`h-2 w-2 rounded-full transition-colors ${
                  index === current ? 'bg-stone-900' : 'bg-stone-300'
                }`}
              />
            ))}
          </div>

          <button
            onClick={next}
            aria-label="Siguiente testimonio"
            className="rounded-full border border-stone-200 bg-white p-2 transition-shadow hover:shadow-md"
          >
            <ChevronRight className="h-5 w-5 text-stone-950" />
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default TestimonialCarousel;
