import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BackButton from '../components/BackButton';
import SEO from '../components/SEO';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-stone-50">
      <SEO
        title="Politica de Privacidad - Hispaloshop"
        description="Como recopilamos, usamos y protegemos tus datos en Hispaloshop."
        url="https://www.hispaloshop.com/privacy"
      />
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <BackButton />
        <section className="bg-white border border-stone-200 rounded-2xl p-6 md:p-8 mt-3">
          <h1 className="text-2xl md:text-3xl font-semibold text-stone-950 mb-4">
            Politica de Privacidad
          </h1>
          <div className="space-y-4 text-sm text-stone-600 leading-relaxed">
            <p>
              Tratamos datos de cuenta, actividad y transacciones para operar el marketplace, procesar pedidos
              y mejorar la experiencia.
            </p>
            <p>
              Puedes solicitar acceso, correccion o eliminacion de datos segun la normativa de proteccion de
              datos aplicable.
            </p>
            <p>
              Aplicamos medidas tecnicas y organizativas para proteger tu información y limitar accesos no
              autorizados.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

