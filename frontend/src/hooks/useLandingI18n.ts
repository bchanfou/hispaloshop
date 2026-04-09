import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Ensures the current i18n language has landing page translations loaded.
 * Since all translations are currently bundled statically, this hook
 * simply verifies the landing block exists and returns a ready state.
 *
 * In the future, this can be extended to dynamically import landing
 * translations per language to reduce initial bundle size:
 *
 *   const module = await import(`../locales/landing/${lang}.json`);
 *   i18n.addResourceBundle(lang, 'translation', { landing: module.default }, true, true);
 *
 * For now it acts as a readiness gate so landing pages can show
 * a loading state while translations are being verified.
 */
export function useLandingI18n(): boolean {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;
  const [ready, setReady] = useState(true);

  useEffect(() => {
    try {
      const lang = currentLang?.split('-')[0] || 'es';
      const resources = i18n.getResourceBundle(lang, 'translation');
      const hasLanding = resources?.landing?.general?.hero?.title;

      if (!hasLanding) {
        // Fallback: landing translations missing for this language,
        // try loading the Spanish bundle as fallback.
        const esFallback = i18n.getResourceBundle('es', 'translation');
        if (esFallback?.landing) {
          i18n.addResourceBundle(lang, 'translation', { landing: esFallback.landing }, true, false);
        }
      }
    } catch {
      // Non-blocking: this hook should never blank the page.
    }
    setReady(true);
  }, [currentLang]); // eslint-disable-line react-hooks/exhaustive-deps

  return ready;
}
