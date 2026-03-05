import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BackButton from '../components/BackButton';
import SEO from '../components/SEO';

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <SEO
        title="Centro de Ayuda - Hispaloshop"
        description="Ayuda para compradores, productores, importadores e influencers en Hispaloshop."
        url="https://www.hispaloshop.com/help"
      />
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <BackButton />
        <section className="bg-white border border-stone-200 rounded-2xl p-6 md:p-8 mt-3">
          <h1 className="font-heading text-2xl md:text-3xl font-semibold text-[#1C1C1C] mb-4">
            Centro de Ayuda
          </h1>
          <div className="space-y-4 text-sm text-[#4A4A4A] leading-relaxed">
            <p>
              Si eres comprador, revisa estado de pedidos en tu panel y usa el chat interno para contactar con
              tienda o influencer.
            </p>
            <p>
              Si eres productor o importador, gestiona catalogo, pedidos, pagos y certificados desde tu panel.
            </p>
            <p>
              Si eres influencer, consulta tu dashboard para codigo, atribucion, comisiones y retiros.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

