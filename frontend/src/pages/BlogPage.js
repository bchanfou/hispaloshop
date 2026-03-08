import React from 'react';
import CompanyInfoPageLayout from '../components/company/CompanyInfoPageLayout';

export default function BlogPage() {
  return (
    <CompanyInfoPageLayout
      title="Blog de Hispaloshop"
      description="Novedades de producto, comercio local, productores y crecimiento digital en Hispaloshop."
      url="https://www.hispaloshop.com/blog"
      eyebrow="Contenido"
      intro="Este espacio recoge las lineas editoriales que vamos publicando sobre producto real, crecimiento de productores, discovery social y expansion comercial. Mientras cerramos el archivo completo, aqui queda centralizado lo que ya existe y lo que vamos a abrir."
      primaryCta={{ label: 'Explorar productos', to: '/products' }}
      secondaryCta={{ label: 'Ver como funciona', to: '/que-es' }}
      sections={[
        {
          title: 'Que vas a encontrar',
          body: 'Guias para productores, novedades de marketplace, uso del feed social para conversion, recetas conectadas a producto y aprendizajes operativos del ecosistema Hispaloshop.',
        },
        {
          title: 'Estado actual',
          body: 'La pagina ya no esta muerta. Queda publicada como hub editorial basico mientras completamos el listado de articulos y la navegacion por categorias.',
        },
        {
          title: 'Si vienes a aprender a vender mejor',
          body: 'Empieza por las rutas de productor, influencer e importador. Son las superficies donde ya estamos concentrando la informacion funcional y los CTA de alta.',
        },
        {
          title: 'Siguiente paso',
          body: 'Usa el descubrimiento de productos o la pagina de ayuda si necesitas informacion concreta sobre pedidos, catalogo o paneles de usuario.',
        },
      ]}
    />
  );
}
