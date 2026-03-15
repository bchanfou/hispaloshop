import { useEffect } from 'react';

export const useScrollReveal = (selector = '.reveal, .reveal-left, .reveal-right, .reveal-scale', options = {}) => {
  useEffect(() => {
    const defaultOptions = {
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px',
      ...options,
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      defaultOptions,
    );

    const timer = setTimeout(() => {
      document.querySelectorAll(selector).forEach((el) => observer.observe(el));
    }, 100);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [selector]);
};
