import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BackButton from '../components/BackButton';
import SEO from '../components/SEO';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <SEO
        title="Terminos de Servicio - Hispaloshop"
        description="Terminos y condiciones de uso de la plataforma Hispaloshop."
        url="https://www.hispaloshop.com/terms"
      />
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <BackButton />
        <section className="bg-white border border-stone-200 rounded-2xl p-6 md:p-8 mt-3">
          <h1 className="font-heading text-2xl md:text-3xl font-semibold text-[#1C1C1C] mb-4">
            Terminos de Servicio
          </h1>
          <div className="space-y-4 text-sm text-[#4A4A4A] leading-relaxed">
            <p>
              Al usar Hispaloshop aceptas estas condiciones de uso, incluyendo politicas de compra, venta,
              contenido y pagos.
            </p>
            <p>
              Los usuarios deben proporcionar informacion veraz, mantener la seguridad de su cuenta y cumplir
              la normativa aplicable en su pais.
            </p>
            <p>
              Hispaloshop puede actualizar estas condiciones para reflejar mejoras de producto, cambios legales
              o requisitos operativos.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

