import React from 'react';
import { useTranslation } from 'react-i18next';
import { trackEvent } from '../../utils/analytics';
import {
  ShoppingBag,
  Eye,
  Truck,
  Leaf,
  Search,
  CreditCard,
  PackageCheck,
} from 'lucide-react';
import {
  HeroSection,
  FeatureSection,
  StepsSection,
  FAQSection,
  CTASection,
  ProductIllustration,
} from '../../components/informativas';
import SEO from '../../components/SEO';

const FEATURE_ICONS = [ShoppingBag, Eye, Leaf, Search];
const STEP_ICONS = [Search, CreditCard, PackageCheck];

export default function LandingConsumidor() {
  const { t } = useTranslation();
  React.useEffect(() => { trackEvent('landing_viewed', { page: 'consumer' }); }, []);

  // Hero
  const heroData = {
    eyebrow: t('landing.consumidor.hero.eyebrow', 'Para ti que comes con criterio'),
    title: t('landing.consumidor.hero.title', 'Descubre quién hace lo que comes'),
    subtitle: t('landing.consumidor.hero.subtitle', 'Productos directos del productor. Precio justo, frescura real, trazabilidad total.'),
    ctaText: t('landing.consumidor.hero.ctaText', 'Explorar productos'),
    ctaTo: t('landing.consumidor.hero.ctaTo', '/discover'),
    secondaryCtaText: t('landing.consumidor.hero.secondaryCtaText', '') || undefined,
    secondaryCtaTo: t('landing.consumidor.hero.secondaryCtaTo', '') || undefined,
  };

  // Features
  const featuresEyebrow = t('landing.consumidor.features.eyebrow', 'Ventajas');
  const featuresTitle = t('landing.consumidor.features.title', 'Comprar así tiene sentido');
  const featuresItems = t('landing.consumidor.features.items', { returnObjects: true, defaultValue: [] }) as { title: string; description: string }[];

  // Steps
  const stepsEyebrow = t('landing.consumidor.steps.eyebrow', 'Cómo funciona');
  const stepsTitle = t('landing.consumidor.steps.title', 'Tres pasos para comer mejor');
  const stepsItems = t('landing.consumidor.steps.items', { returnObjects: true, defaultValue: [] }) as { title: string; description: string }[];

  // FAQ
  const faqEyebrow = t('landing.consumidor.faq.eyebrow', 'Preguntas frecuentes');
  const faqTitle = t('landing.consumidor.faq.title', 'Dudas habituales');
  const faqItems = t('landing.consumidor.faq.items', { returnObjects: true, defaultValue: [] }) as { question: string; answer: string }[];

  // CTA
  const ctaData = {
    title: t('landing.consumidor.cta.title', 'Tu próxima compra, directa del campo'),
    subtitle: t('landing.consumidor.cta.subtitle', 'Sin intermediarios, sin historias. Comida de verdad de gente de verdad.'),
    ctaText: t('landing.consumidor.cta.ctaText', 'Explorar productos'),
    ctaTo: t('landing.consumidor.cta.ctaTo', '/discover'),
  };

  return (
    <>
      <SEO
        title={t('landing.consumidor.seo.title', 'Compra directo al productor — HispaloShop')}
        description={t('landing.consumidor.seo.description', 'Descubre productos directos del productor. Precio justo, frescura real, trazabilidad total. Sin intermediarios.')}
      />

      <HeroSection
        {...heroData}
        illustration={<ProductIllustration className="w-full h-auto" />}
      />

      <FeatureSection
        eyebrow={featuresEyebrow}
        title={featuresTitle}
        features={
          Array.isArray(featuresItems)
            ? featuresItems.map((f, i) => ({ ...f, icon: FEATURE_ICONS[i] || ShoppingBag }))
            : []
        }
        columns={2}
        tone="white"
      />

      <StepsSection
        eyebrow={stepsEyebrow}
        title={stepsTitle}
        steps={
          Array.isArray(stepsItems)
            ? stepsItems.map((s, i) => ({ ...s, icon: STEP_ICONS[i] || Search }))
            : []
        }
        tone="warm"
      />

      <FAQSection
        eyebrow={faqEyebrow}
        title={faqTitle}
        items={Array.isArray(faqItems) ? faqItems : []}
        tone="white"
      />

      <CTASection {...ctaData} />
    </>
  );
}
