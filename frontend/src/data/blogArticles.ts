/**
 * Static blog articles for HispaloShop editorial content.
 * The founder will refine the body content — structure is ready.
 */

export interface BlogArticle {
  slug: string;
  title: string;
  subtitle: string;
  description: string; // SEO meta
  heroImage?: string;
  category: 'plataforma' | 'guia' | 'features' | 'faq';
  body: string; // Markdown-light (paragraphs separated by \n\n, ## for headings)
  ctaText?: string;
  ctaTo?: string;
  featured?: boolean;
  publishedAt: string; // ISO date
}

const articles: BlogArticle[] = [
  {
    slug: 'que-es-hispaloshop',
    title: '¿Qué es HispaloShop?',
    subtitle: 'La plataforma que conecta productores con consumidores. Sin intermediarios.',
    description: 'Descubre HispaloShop: la plataforma de social commerce que conecta productores artesanales con consumidores que quieren saber quién hace su comida.',
    category: 'plataforma',
    featured: true,
    ctaText: 'Explorar productos',
    ctaTo: '/discover',
    body: `HispaloShop nace de una convicción sencilla: cada producto que comes tiene una historia, y mereces conocerla.

## No somos un marketplace más

No somos Amazon de comida. No somos un intermediario que marca un +30% y desaparece. Somos una plataforma donde el productor tiene nombre, cara y tienda propia. Donde el consumidor sabe exactamente de dónde viene lo que come.

## ¿Qué puedes hacer aquí?

Como consumidor, descubres productores locales e internacionales. Navegas recetas con ingredientes que puedes comprar con un botón. Hablas con David, tu nutricionista personal con IA. Creas listas de deseos y las compartes.

Como productor, abres tu tienda en minutos. Cuentas tu historia. Vendes directo al consumidor sin intermediarios. Desde 0€.

Como influencer, recomiendas productos que te gustan y ganas comisiones recurrentes durante 18 meses. Con 1 seguidor ya puedes empezar.

## ¿En qué países opera?

Actualmente en España, Corea del Sur y Estados Unidos. La plataforma se traduce automáticamente al idioma de cada usuario.

## ¿Quién está detrás?

Un fundador con una historia real. A los 25 perdió 15.000€ en un container de palomitas que se pudrió en Incheon. A los 26, volvió a la habitación de sus padres en Reus. HispaloShop es la respuesta a esa experiencia: que ningún productor honesto se sienta invisible.`,
    publishedAt: '2026-04-01',
  },
  {
    slug: 'como-funciona-consumidores',
    title: 'Cómo funciona para consumidores',
    subtitle: 'Tres pasos para comer mejor: explora, compra, recibe.',
    description: 'Guía paso a paso para consumidores en HispaloShop: cómo explorar productos, comprar directamente al productor y recibir en tu puerta.',
    category: 'guia',
    ctaText: 'Empezar a explorar',
    ctaTo: '/discover',
    body: `## 1. Explora

Navega por categorías, descubre productores locales, busca productos específicos o deja que David AI te recomiende según tus gustos y necesidades nutricionales.

## 2. Compra

Añade al carrito productos de varios productores. Pago seguro con Stripe. Cada productor prepara tu pedido al momento.

## 3. Recibe

El productor envía directamente a tu puerta. Sin almacenes intermedios. Fresco, directo, real.

## Funcionalidades destacadas

Recetas comprables: ve una receta, compra todos los ingredientes con un botón. Nadie más hace esto.

David AI: tu nutricionista personal que te conoce. Dieta, alergias, gustos. Recomendaciones personalizadas.

Wishlists compartibles: crea listas de deseos para cumpleaños, regalos o tu despensa semanal. Compártelas con quien quieras.

Comunidades: únete a grupos de gente que come como tú. Comparte recetas, descubre productores.

Certificado QR: escanea el código de un producto físico en cualquier tienda del mundo y ve toda la info en tu idioma.`,
    publishedAt: '2026-04-01',
  },
  {
    slug: 'como-funciona-productores',
    title: 'Cómo funciona para productores',
    subtitle: 'Tu tienda online en minutos. Tu historia, tus clientes, tu precio.',
    description: 'Guía para productores: abre tu tienda en HispaloShop, sube productos, configura envíos y empieza a vender sin intermediarios.',
    category: 'guia',
    ctaText: 'Registrar mi tienda',
    ctaTo: '/register?role=producer',
    body: `## 1. Regístrate gratis

Crea tu cuenta de productor en menos de 2 minutos. Sin compromiso, sin tarjeta de crédito.

## 2. Configura tu tienda

Sube fotos, describe tus productos, establece precios y zonas de envío. Cuenta tu historia — los consumidores quieren saber quién eres.

## 3. Empieza a vender

Tu tienda está visible desde el primer día. Recibe pedidos, prepáralos y envía directamente al cliente.

## Planes y comisiones

FREE: 0€/mes, 20% comisión. Para empezar sin compromiso.
PRO: 79€/mes, 18% comisión. Analytics avanzados + Rebeca AI + promoción nacional.
ELITE: 249€/mes, 17% comisión. Pedro AI + B2B internacional + promoción global.

## ¿Qué incluye tu plan?

Certificado digital QR para tus productos físicos. Comunidad propia auto-creada al verificarte. Traducción automática de tus productos a todos los idiomas. Panel de control con analytics en tiempo real.`,
    publishedAt: '2026-04-01',
  },
  {
    slug: 'como-funciona-influencers',
    title: 'Cómo funciona para influencers',
    subtitle: 'Con 1 seguidor ya puedes ganar. Código personal + comisiones 18 meses.',
    description: 'Programa de embajadores HispaloShop: cómo ganar comisiones recomendando productos artesanales. De Hercules a Zeus.',
    category: 'guia',
    ctaText: 'Aplicar como embajador',
    ctaTo: '/register?role=influencer',
    body: `## Tu código, tu ingreso

Recibe un código de descuento personalizado que ofrece 10% de descuento en la primera compra. Cada persona que compra con tu código genera comisiones para ti.

## Tiers: de Hercules a Zeus

Hercules (inicio): 3% de comisión por venta.
Atenea (crecimiento): 5% de comisión.
Zeus (top): 7% de comisión.

Sube de tier atrayendo más clientes. Las comisiones son recurrentes durante 18 meses por cada persona que traigas.

## Tu landing personal

hispaloshop.com/@tuhandle — tu página con tu código, tu perfil y tus recomendaciones. Comparte en tu bio de Instagram, YouTube o TikTok.

## No necesitas 100K followers

No hay mínimo de seguidores. Si alguien confía en ti y compra con tu código, ya estás ganando. Micro-influencers son bienvenidos.`,
    publishedAt: '2026-04-01',
  },
  {
    slug: 'comisiones',
    title: 'Nuestras comisiones, explicadas',
    subtitle: 'Transparencia total. Sin letra pequeña. Sin sorpresas.',
    description: 'Tabla completa de comisiones de HispaloShop: planes FREE, PRO y ELITE para productores + tiers de influencers con ejemplos reales.',
    category: 'plataforma',
    ctaText: 'Registrar mi tienda',
    ctaTo: '/register?role=producer',
    body: `## Comisiones por plan

FREE: 0€/mes — Comisión 20% — El seller recibe 80€ por cada 100€ de venta.
PRO: 79€/mes — Comisión 18% — El seller recibe 82€ por cada 100€ de venta.
ELITE: 249€/mes — Comisión 17% — El seller recibe 83€ por cada 100€ de venta.

## Comisiones de influencers

Hercules: 3% por venta.
Atenea: 5% por venta.
Zeus: 7% por venta.

La comisión del influencer se resta de la comisión de la plataforma, NO del seller.

## Ejemplo: ELITE + Zeus + primera compra

Producto: 100€.
Consumer paga: 90€ (10% descuento primera compra con código).
Seller recibe: 83€ (sobre precio original, no sobre precio descontado).
Influencer recibe: 7€.
Plataforma: 0€ (absorbe el descuento en la primera compra).

## Primera compra con código de influencer

El consumidor recibe -10% en su primera compra.
El seller cobra sobre el precio original (sin descuento).
La plataforma absorbe el coste del descuento.
El descuento NO es acumulable con otros descuentos.
La atribución del influencer dura 18 meses.`,
    publishedAt: '2026-04-01',
  },
  {
    slug: 'certificado-digital-qr',
    title: 'El certificado digital: de tu estantería a tu móvil',
    subtitle: 'Escanea un QR, ve la info del producto en tu idioma. El futuro de la trazabilidad.',
    description: 'Cómo funciona el certificado digital QR de HispaloShop: escanea cualquier producto y ve origen, certificaciones, ingredientes y más en tu idioma.',
    category: 'features',
    ctaText: 'Explorar productos',
    ctaTo: '/discover',
    body: `## ¿Qué es?

Cada producto en HispaloShop tiene un código QR descargable. El productor lo imprime y lo pega en su producto físico. Cualquier persona del mundo lo escanea con su móvil y ve toda la información del producto en su idioma.

## ¿Qué información muestra?

Nombre del producto (traducido automáticamente). Origen y productor. Certificaciones (ecológico, DOP, IGP, etc.). Ingredientes y alérgenos. Información nutricional. Historia del productor. Precio y enlace para comprar más.

## ¿Por qué importa?

Imagina que estás en un mercado en Seúl y ves un aceite de oliva español. Escaneas el QR y ves toda la info en coreano: de dónde viene, quién lo hace, qué certificaciones tiene. Y puedes comprar más directamente.

## Para productores

El QR es gratuito para todos los planes. Lo descargas desde tu panel de productor. Lo imprimes en tus etiquetas, cajas o displays. Se actualiza automáticamente cuando cambias la info del producto.`,
    publishedAt: '2026-04-01',
  },
  {
    slug: 'recetas-comprables',
    title: 'Recetas comprables: cocina y compra al mismo tiempo',
    subtitle: 'Cada ingrediente es un producto real que puedes comprar. Nadie más hace esto.',
    description: 'Cómo funcionan las recetas comprables en HispaloShop: cada ingrediente está vinculado a un producto real de un productor local.',
    category: 'features',
    ctaText: 'Explorar recetas',
    ctaTo: '/recipes',
    body: `## La feature que nos diferencia

Cuando ves una receta en HispaloShop, cada ingrediente está vinculado a un producto real de un productor local. Tomates de Andalucía, aceite de oliva de Jaén, queso manchego de La Mancha.

## Cómo funciona

1. Ves una receta que te gusta.
2. Cada ingrediente muestra el producto real: foto, productor, precio.
3. Botón "Añadir todos los ingredientes al carrito" — un solo tap.
4. Los ingredientes genéricos (sal, agua, pimienta) se marcan como tales — sin producto vinculado.
5. Si un producto está agotado, se sugieren alternativas.

## Para productores

Tus productos aparecen en recetas de otros usuarios. Es marketing orgánico: alguien publica una receta con tu aceite, y miles de personas lo ven y lo compran.

## Para creators

Cualquiera puede crear recetas. No necesitas ser chef. Sube tu receta favorita, vincula los ingredientes a productos reales y compártela con la comunidad.`,
    publishedAt: '2026-04-01',
  },
  {
    slug: 'faq',
    title: 'Preguntas frecuentes',
    subtitle: 'Todo lo que necesitas saber sobre HispaloShop.',
    description: 'Preguntas frecuentes sobre HispaloShop: registro, pagos, envíos, comisiones, influencers, productores y más.',
    category: 'faq',
    body: `## General

¿Qué es HispaloShop?
Una plataforma de social commerce donde productores locales venden directamente al consumidor. Sin intermediarios.

¿Es gratis?
Registrarse y comprar es completamente gratis. Los productores pueden elegir un plan de pago para acceder a herramientas avanzadas.

¿En qué países opera?
España, Corea del Sur y Estados Unidos. La plataforma se traduce automáticamente.

## Consumidores

¿Cómo llega mi pedido?
Cada productor gestiona su propio envío. Normalmente entre 2 y 5 días.

¿Puedo devolver un producto?
Sí, según la normativa vigente. Contacta con el productor o con soporte.

¿Es seguro pagar?
Usamos Stripe con encriptación SSL. Tu info bancaria nunca se almacena en nuestros servidores.

## Productores

¿Cuánto cuesta registrarse?
Gratis. El plan FREE permite vender con 20% de comisión. PRO (79€/mes, 18%) y ELITE (249€/mes, 17%) añaden herramientas.

¿Quién gestiona los envíos?
Tú. Puedes usar tu propio transportista o recogida en local.

¿Necesito ser empresa?
Puedes vender como autónomo o empresa. Te pedimos datos fiscales para facturación.

## Influencers

¿Cuánto gano por venta?
Hercules 3%, Atenea 5%, Zeus 7%. Comisiones recurrentes durante 18 meses.

¿Necesito muchos seguidores?
No. Con 1 seguidor ya puedes ganar. Valoramos calidad sobre cantidad.

¿Cómo cobro?
Solicita el retiro cuando quieras. Se transfiere por SEPA a tu cuenta.`,
    publishedAt: '2026-04-01',
  },
];

export default articles;

export function getArticleBySlug(slug: string): BlogArticle | undefined {
  return articles.find(a => a.slug === slug);
}

export function getAllArticles(): BlogArticle[] {
  return articles;
}

export function getFeaturedArticle(): BlogArticle | undefined {
  return articles.find(a => a.featured);
}
