import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BackButton from '../components/BackButton';
import SEO from '../components/SEO';

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-stone-50">
      <SEO
        title="Centro de Ayuda - Hispaloshop"
        description="Ayuda para compradores, productores, importadores e influencers en Hispaloshop."
        url="https://www.hispaloshop.com/help"
      />
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <BackButton />
        <section className="bg-white border border-stone-200 rounded-2xl p-6 md:p-8 mt-3">
          <h1 className="text-2xl md:text-3xl font-semibold text-stone-950 mb-4">
            Centro de Ayuda
          </h1>
          <div className="space-y-4 text-sm text-stone-600 leading-relaxed">
            <p>
              Si eres comprador, revisa el estado de tus pedidos en tu panel y usa el chat interno para contactar con
              la tienda o el influencer.
            </p>
            <p>
              Si eres productor o importador, gestiona catálogo, pedidos, pagos y certificados desde tu panel.
            </p>
            <p>
              Si eres influencer, consulta tu dashboard para código, atribución, comisiones y retiros.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
