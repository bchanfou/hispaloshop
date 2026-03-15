import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FeedContainer, HIFloatingButton } from '../components/feed';
import HomeHeader from '../components/feed/HomeHeader';
import SEO from '../components/SEO';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(
    () => localStorage.getItem('feedTab') || 'foryou'
  );

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    localStorage.setItem('feedTab', tab);
  };

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
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: 'var(--color-cream)' }}>
      <SEO
        title="Hispaloshop - Productos reales y productores honestos"
        description="Social commerce alimentario para descubrir productores honestos, comprar con claridad y hablar con la comunidad."
        url="https://www.hispaloshop.com"
        structuredData={structuredData}
      />

      <HomeHeader activeTab={activeTab} onTabChange={handleTabChange} />

      <main id="main-content">
        <FeedContainer activeTab={activeTab} onTabChange={handleTabChange} />
      </main>

      <HIFloatingButton onClick={() => navigate(user ? '/chat' : '/login')} />
    </div>
  );
}
