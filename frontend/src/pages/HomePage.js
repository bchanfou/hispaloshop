import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { FeedContainer, HIFloatingButton } from '../components/feed';
import SEO from '../components/SEO';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const structuredData = useMemo(() => ([
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Hispaloshop',
      url: 'https://www.hispaloshop.com',
      description: 'Productos artesanales de tu zona y delicatessen importadas con pago seguro y trazabilidad real.',
    },
  ]), []);

  const handleOpenAI = () => {
    if (user) {
      navigate('/chat');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#FAFAFA]">
      <SEO
        title="Hispaloshop - Descubre productos reales"
        description="Productos artesanales de tu zona y delicatessen importadas con pago seguro y trazabilidad real."
        url="https://www.hispaloshop.com"
        structuredData={structuredData}
      />

      <Header />

      <main className="pt-14">
        <FeedContainer />
      </main>

      {/* Botón flotante HI AI */}
      <HIFloatingButton onClick={handleOpenAI} />

      <Footer />
    </div>
  );
}
