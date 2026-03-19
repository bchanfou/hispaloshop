import React, { useMemo } from 'react';
import { FeedContainer } from '../components/feed';
import { useFeedTab } from '../context/FeedTabContext';
import SEO from '../components/SEO';

export default function HomePage() {
  const { activeTab } = useFeedTab();

  const structuredData = useMemo(
    () => [
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Hispaloshop',
        url: 'https://www.hispaloshop.com',
        description:
          'Social commerce alimentario para descubrir productores honestos, comprar con claridad y hablar con la comunidad.',
      },
    ],
    []
  );

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-white">
      <SEO
        title="Hispaloshop - Productos reales y productores honestos"
        description="Social commerce alimentario para descubrir productores honestos, comprar con claridad y hablar con la comunidad."
        url="https://www.hispaloshop.com"
        structuredData={structuredData}
      />

      <main id="main-content">
        <FeedContainer activeTab={activeTab} />
      </main>
    </div>
  );
}
