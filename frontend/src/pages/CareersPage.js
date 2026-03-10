import React from 'react';
import CompanyInfoPageLayout from '../components/company/CompanyInfoPageLayout';

export default function CareersPage() {
  return (
    <CompanyInfoPageLayout
      title="Trabaja con nosotros"
      description="Información sobre el tipo de perfiles y lineas de trabajo que Hispaloshop esta construyendo."
      url="https://www.hispaloshop.com/careers"
      eyebrow="Carreras"
      intro="Estamos construyendo una plataforma que mezcla ecommerce, social, IA y operativa internacional. Esta página deja visible el tipo de talento que buscamos y evita que la navegacion acabe en vacio."
      primaryCta={{ label: 'Escribir al equipo', to: '/contact' }}
      secondaryCta={{ label: 'Ver plataforma', to: '/about' }}
      sections={[
        {
          title: 'Perfiles clave',
          body: 'Producto, frontend, backend, growth, operaciones de marketplace, partnerships con productores y expansion B2B.',
        },
        {
          title: 'Como trabajamos',
          body: 'Nos importa la ejecucion, la claridad y que cada flujo visible de usuario llegue realmente a algun sitio util y medible.',
        },
        {
          title: 'Que buscamos',
          body: 'Personas capaces de mejorar conversion, fiabilidad del producto y calidad operativa sin esconder deuda tecnica debajo de mas interfaces.',
        },
        {
          title: 'Aplicaciones',
          body: 'Por ahora centralizamos cualquier interes desde contacto. Cuando el pipeline de hiring esté listo, esta página mostrara posiciones abiertas.',
        },
      ]}
    />
  );
}
