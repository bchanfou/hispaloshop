import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Scrolls to the element matching the URL hash (e.g. #planes, #b2b)
 * after a short delay to allow page render.
 */
export function useScrollToHash() {
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;

    const id = hash.replace('#', '');
    // Delay to allow page content to render
    const timer = setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [hash]);
}
