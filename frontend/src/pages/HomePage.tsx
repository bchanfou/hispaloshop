// @ts-nocheck
import React, { useMemo } from 'react';
import { FeedContainer } from '../components/feed';
import SEO from '../components/SEO';
import { useTranslation } from 'react-i18next';

export default function HomePage() {
  const structuredData = useMemo(
    () => [
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Hispaloshop',
        url: 'https://www.hispaloshop.com',
        description:
          t('home.socialCommerceAlimentarioParaDescubr', 'Social commerce alimentario para descubrir productores honestos, comprar con claridad y hablar con la comunidad.'),
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: 'https://www.hispaloshop.com/search?q={search_term_string}',
          },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
    []
  );

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-white">
      <SEO
        title="Hispaloshop - Productos reales y productores honestos"
        description={t('home.socialCommerceAlimentarioParaDescubr', 'Social commerce alimentario para descubrir productores honestos, comprar con claridad y hablar con la comunidad.')}
        url="https://www.hispaloshop.com"
        structuredData={structuredData}
      />

      <main id="main-content">
        <FeedContainer />
      </main>
    </div>
  );
}
