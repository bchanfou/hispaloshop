import React from 'react';
import CompanyInfoPageLayout from '../components/company/CompanyInfoPageLayout';

export default function CareersPage() {
  return (
    <CompanyInfoPageLayout
      title="Trabaja con nosotros"
      description="Información sobre el tipo de perfiles y líneas de trabajo que Hispaloshop está construyendo."
      url="https://www.hispaloshop.com/careers"
      eyebrow="Carreras"
      intro="Estamos construyendo una plataforma que mezcla ecommerce, social, IA y operativa internacional. Esta página deja visible el tipo de talento que buscamos y evita que la navegación acabe en vacío."
      primaryCta={{ label: 'Escribir al equipo', to: '/contact' }}
      secondaryCta={{ label: 'Ver plataforma', to: '/about' }}
      sections={[
        {
          title: 'Perfiles clave',
          body: 'Producto, frontend, backend, growth, operaciones de marketplace, partnerships con productores y expansión B2B.',
        },
        {
          title: 'Cómo trabajamos',
          body: 'Nos importa la ejecución, la claridad y que cada flujo visible de usuario llegue realmente a algún sitio útil y medible.',
        },
        {
          title: 'Qué buscamos',
          body: 'Personas capaces de mejorar conversión, fiabilidad del producto y calidad operativa sin esconder deuda técnica debajo de más interfaces.',
        },
        {
          title: 'Aplicaciones',
          body: 'Por ahora centralizamos cualquier interés desde contacto. Cuando el pipeline de hiring esté listo, esta página mostrará posiciones abiertas.',
        },
      ]}
    />
  );
}
