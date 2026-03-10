/**
 * ImporterCertificatesPage
 *
 * El backend (/producer/certificates y /certificates) ya acepta el rol "importer".
 * Este componente reutiliza ProducerCertificates directamente.
 */
import React from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import ProducerCertificates from '../producer/ProducerCertificates';

export default function ImporterCertificatesPage() {
  return (
    <div className="min-h-screen bg-stone-50">
      <Header />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="font-heading text-2xl font-semibold text-primary">
            Certificados de Producto
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Genera el certificado digital con QR descargable para cada producto importado. El QR puede
            imprimirse en el embalaje físico para transparencia hacia el consumidor final.
          </p>
        </div>
        <ProducerCertificates />
      </div>
      <Footer />
    </div>
  );
}
