import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { FeedContainer, HIFloatingButton } from '../components/feed';
import SEO from '../components/SEO';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

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

  const handleOpenAI = () => {
    navigate(user ? '/chat' : '/login');
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-stone-50">
      <SEO
        title="Hispaloshop - Productos reales y productores honestos"
        description="Social commerce alimentario para descubrir productores honestos, comprar con claridad y hablar con la comunidad."
        url="https://www.hispaloshop.com"
        structuredData={structuredData}
      />

      <Header />

      <main id="main-content" className="pb-24">
        <FeedContainer />
      </main>

      <HIFloatingButton onClick={handleOpenAI} />

      <Footer />
    </div>
  );
}
