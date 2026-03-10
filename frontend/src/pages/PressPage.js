import React from 'react';
import CompanyInfoPageLayout from '../components/company/CompanyInfoPageLayout';

export default function PressPage() {
  return (
    <CompanyInfoPageLayout
      title="Prensa y marca"
      description="Información institucional y contexto de marca de Hispaloshop para prensa y colaboraciones."
      url="https://www.hispaloshop.com/press"
      eyebrow="Prensa"
      intro="Hispaloshop une marketplace, trazabilidad, social commerce y operativa multirole en una sola plataforma. Esta página sirve como punto de entrada para medios, colaboraciones editoriales y solicitudes de contexto de marca."
      primaryCta={{ label: 'Contactar', to: '/contact' }}
      secondaryCta={{ label: 'Sobre Hispaloshop', to: '/about' }}
      sections={[
        {
          title: 'Que hace Hispaloshop',
          body: 'Conectamos productores, compradores, importadores e influencers en una experiencia que mezcla discovery, compra y operativa diaria.',
        },
        {
          title: 'Material disponible',
          body: 'Resumen de producto, foco de negocio, rutas principales y narrativa de marca. La descarga de press kit completo queda para la siguiente iteracion.',
        },
        {
          title: 'Solicitudes de prensa',
          body: 'Para entrevistas, contexto de producto o peticiones editoriales, usa la página de contacto. Asi queda una unica via visible y operativa.',
        },
        {
          title: 'Estado actual',
          body: 'La ruta ya es funcional y deja de romper la navegacion del footer de landings. El siguiente paso sera añadir dossier y activos descargables.',
        },
      ]}
    />
  );
}
