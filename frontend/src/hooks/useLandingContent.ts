import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Market-aware content for landing pages.
 * Returns content adapted to the current i18n language.
 * Each landing page passes a `page` key and gets back typed content.
 */

export type LandingPage =
  | 'general'
  | 'consumidor'
  | 'productor'
  | 'influencer'
  | 'distribuidor'
  | 'contacto'
  | 'legal';

interface HeroContent {
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaTo: string;
  secondaryCtaText?: string;
  secondaryCtaTo?: string;
}

interface FeatureContent {
  title: string;
  description: string;
}

interface StepContent {
  title: string;
  description: string;
}

interface FAQContent {
  question: string;
  answer: string;
}

interface CTAContent {
  title: string;
  subtitle?: string;
  ctaText: string;
  ctaTo: string;
}

export interface LandingContent {
  hero: HeroContent;
  featuresEyebrow?: string;
  featuresTitle?: string;
  features: FeatureContent[];
  stepsEyebrow?: string;
  stepsTitle?: string;
  steps: StepContent[];
  faqEyebrow?: string;
  faqTitle?: string;
  faq: FAQContent[];
  cta: CTAContent;
}

export function useLandingContent(page: LandingPage): LandingContent {
  const { t } = useTranslation();
  const prefix = `landing.${page}`;

  return useMemo(() => ({
    hero: {
      eyebrow: t(`${prefix}.hero.eyebrow`, ''),
      title: t(`${prefix}.hero.title`, ''),
      subtitle: t(`${prefix}.hero.subtitle`, ''),
      ctaText: t(`${prefix}.hero.ctaText`, ''),
      ctaTo: t(`${prefix}.hero.ctaTo`, '/register'),
      secondaryCtaText: t(`${prefix}.hero.secondaryCtaText`, '') || undefined,
      secondaryCtaTo: t(`${prefix}.hero.secondaryCtaTo`, '') || undefined,
    },
    featuresEyebrow: t(`${prefix}.features.eyebrow`, '') || undefined,
    featuresTitle: t(`${prefix}.features.title`, '') || undefined,
    features: (t(`${prefix}.features.items`, { returnObjects: true, defaultValue: [] }) as FeatureContent[]),
    stepsEyebrow: t(`${prefix}.steps.eyebrow`, '') || undefined,
    stepsTitle: t(`${prefix}.steps.title`, '') || undefined,
    steps: (t(`${prefix}.steps.items`, { returnObjects: true, defaultValue: [] }) as StepContent[]),
    faqEyebrow: t(`${prefix}.faq.eyebrow`, '') || undefined,
    faqTitle: t(`${prefix}.faq.title`, '') || undefined,
    faq: (t(`${prefix}.faq.items`, { returnObjects: true, defaultValue: [] }) as FAQContent[]),
    cta: {
      title: t(`${prefix}.cta.title`, ''),
      subtitle: t(`${prefix}.cta.subtitle`, '') || undefined,
      ctaText: t(`${prefix}.cta.ctaText`, ''),
      ctaTo: t(`${prefix}.cta.ctaTo`, '/register'),
    },
  }), [t, prefix]);
}
