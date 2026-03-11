import React from 'react';
import CompanyInfoPageLayout from '../components/company/CompanyInfoPageLayout';

export default function BlogPage() {
  return (
    <CompanyInfoPageLayout
      title="Blog de Hispaloshop"
      description="Novedades de producto, comercio local, productores y crecimiento digital en Hispaloshop."
      url="https://www.hispaloshop.com/blog"
      eyebrow="Contenido"
      intro="Este espacio recoge las líneas editoriales que vamos publicando sobre producto real, crecimiento de productores, discovery social y expansión comercial. Mientras cerramos el archivo completo, aquí queda centralizado lo que ya existe y lo que vamos a abrir."
      primaryCta={{ label: 'Explorar productos', to: '/products' }}
      secondaryCta={{ label: 'Ver cómo funciona', to: '/que-es' }}
      sections={[
        {
          title: 'Qué vas a encontrar',
          body: 'Guías para productores, novedades de marketplace, uso del feed social para conversión, recetas conectadas a producto y aprendizajes operativos del ecosistema Hispaloshop.',
        },
        {
          title: 'Estado actual',
          body: 'La página ya no está muerta. Queda publicada como hub editorial básico mientras completamos el listado de artículos y la navegación por categorías.',
        },
        {
          title: 'Si vienes a aprender a vender mejor',
          body: 'Empieza por las rutas de productor, influencer e importador. Son las superficies donde ya estamos concentrando la información funcional y los CTA de alta.',
        },
        {
          title: 'Siguiente paso',
          body: 'Usa el descubrimiento de productos o la página de ayuda si necesitas información concreta sobre pedidos, catálogo o paneles de usuario.',
        },
      ]}
    />
  );
}
