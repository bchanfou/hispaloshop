# AUDITORIA UX/UI COMPLETA - HISPALOSHOP

Fecha: 2026-03-10

Base auditada: frontend actual del repositorio, incluyendo rutas, layouts, paginas, componentes globales, dashboards por rol, areas B2B, admin, super-admin y paginas corporativas.

Cobertura real:
- 151 declaraciones de rutas en `frontend/src/App.js`, aunque muchas son alias y redirecciones a un numero menor de vistas canonicas.
- Revision de sistema visual global en `frontend/src/index.css`, `frontend/src/App.css` y `frontend/tailwind.config.js`.
- Revision de navegacion global en `frontend/src/components/Header.js`, `frontend/src/components/BottomNavBar.js`, `frontend/src/lib/navigation.js` y layouts responsivos por rol.
- Revision de paginas publicas, social feed, marketplace, producto, recetas, auth, onboarding, carrito, checkout, dashboards, B2B y backoffice.

Nota metodologica:
- Esta auditoria se basa en el codigo actual del frontend, no en un recorrido visual con browser real ni en analytics de uso.
- Aun asi, hay evidencia suficiente en estructura, estilos, strings, layouts y complejidad de componentes para definir un plan de rediseño fiable.
- Las rutas alias se auditan dentro de su pantalla canonica para evitar duplicidad.

## 1. RESUMEN EJECUTIVO

Hispaloshop tiene una ambicion de producto muy alta: combina marketplace, red social, recetas, creador de contenido, dashboards B2C/B2B, backoffice e IA. El problema principal no es falta de funcionalidad, sino falta de un sistema unificado que convierta toda esa funcionalidad en una experiencia clara, coherente y facil de entender a primera vista.

Hoy la plataforma transmite tres productos distintos al mismo tiempo:
- unas landings editoriales y aspiracionales bastante cuidadas;
- una app principal de marketplace social funcional pero visualmente saturada y fragmentada;
- varios subproductos operativos por rol con shells, estilos y patrones de navegacion diferentes entre si.

El resultado UX/UI actual es:
- potente en capacidades;
- irregular en claridad;
- inconsistente en lenguaje visual;
- exigente para el usuario en movil;
- y con demasiadas decisiones de interfaz compitiendo entre si.

Diagnostico general:
- Fortaleza: amplitud funcional, buenas bases mobile-first en varias pantallas, componentes sociales potentes, landings con mejor intencion de marca.
- Debilidad critica: arquitectura de navegacion fragmentada y sistema visual sin una unica fuente de verdad.
- Riesgo de negocio: la experiencia genera friccion justo en pantallas de conversion y de uso recurrente: registro, producto, carrito, dashboards y discovery.
- Oportunidad: con una reestructuracion de informacion, simplificacion de jerarquia y limpieza del sistema visual, Hispaloshop puede pasar de "muchas funciones" a "producto premium y entendible".

Valoracion sintetica del estado actual:

| Area | Estado actual | Nivel |
| --- | --- | --- |
| Legibilidad | Inconsistente por contraste, densidad y tipografias mezcladas | Medio-bajo |
| Jerarquia visual | Mucha informacion al mismo peso | Bajo |
| Navegacion | Fragmentada entre header, bottom nav, shells por rol y redirects | Bajo |
| Consistencia de marca | Landings y app interior no parecen el mismo sistema | Bajo |
| Mobile UX | Hay intencion mobile-first, pero demasiadas capas y controles | Medio |
| Accesibilidad | Riesgo alto por contraste, targets y ruido visual | Medio-bajo |
| Conversion | Las pantallas clave tienen friccion innecesaria | Medio-bajo |
| Escalabilidad de diseño | Debil por mezcla de tokens, CSS global y patrones ad hoc | Bajo |

Conclusion ejecutiva:
- El rediseño no debe empezar por "embellecer" pantallas sueltas.
- Debe empezar por rehacer la arquitectura de navegacion, el sistema visual y los componentes base.
- Despues, debe simplificar las pantallas mas cargadas: registro, producto, carrito, productor, influencer y perfiles.

## 2. PRINCIPALES PROBLEMAS GLOBALES

### P0. Navegacion fragmentada y arquitectura de informacion dispersa

Diagnostico:
- La plataforma mezcla header superior, bottom navigation, layouts de dashboard por rol con su propia navegacion movil, rutas alias y redirects en exceso.
- `frontend/src/App.js` contiene 151 `Route path`, sintoma de crecimiento por capas y no por arquitectura consolidada.
- `frontend/src/components/BottomNavBar.js:14` y `frontend/src/components/BottomNavBar.js:20` esconden el bottom nav en muchos contextos, y cada dashboard reintroduce su propia navegacion movil.
- `frontend/src/components/dashboard/ProducerLayoutResponsive.js:63`, `CustomerLayoutResponsive.js:49`, `AdminLayoutResponsive.js:61`, `SuperAdminLayoutResponsive.js:38` e `InfluencerLayoutResponsive.js:22` confirman shells paralelos con paradigmas distintos.

Impacto:
- El usuario cambia constantemente de modelo mental.
- La regla de "maximo 3 clics" no esta garantizada.
- El producto se siente como varias apps unidas, no como una sola plataforma.

Gravedad: Critica

### P0. No existe una unica fuente de verdad del sistema visual

Diagnostico:
- `frontend/src/index.css:2` declara "Playfair Display + Inter", pero `frontend/src/index.css:145` aplica `Cinzel` a headings globales.
- `frontend/tailwind.config.js:16` sigue declarando `Playfair Display`.
- `frontend/src/pages/influencer/InfluencerDashboard.js` usa `font-display` repetidamente, pero no hay definicion clara de esa familia en el sistema.
- `frontend/src/index.css:48` y `frontend/src/index.css:101` redefinen `--color-success` con valores distintos.

Impacto:
- Tipografia incoherente.
- Colores y componentes menos predecibles.
- Mayor deuda visual y mayor coste de mantenimiento.

Gravedad: Critica

### P0. Exceso de densidad en pantallas clave

Diagnostico:
- `frontend/src/pages/ProductDetailPage.js` supera las 1000 lineas y concentra demasiados bloques al mismo nivel.
- `frontend/src/pages/CartPage.js` mezcla revision de carrito, problemas de stock, direcciones, descuentos y checkout.
- `frontend/src/pages/producer/ProducerProducts.js` supera 1200 lineas y centraliza una operativa demasiado compleja en una sola vista.
- `frontend/src/pages/influencer/InfluencerDashboard.js`, `frontend/src/pages/UserProfilePage.js` y `frontend/src/components/InternalChat.js` siguen el mismo patron.

Impacto:
- Fatiga visual.
- Mayor abandono en movil.
- Menor conversion.
- Mayor dificultad de aprendizaje para usuarios nuevos.

Gravedad: Critica

### P0. Calidad textual y encoding deterioran la confianza

Diagnostico:
- Hay strings corruptos visibles en varios puntos del frontend.
- Evidencia directa: `frontend/src/components/ProductCard.js:27` muestra simbolos de moneda corruptos y `frontend/src/components/ProductCard.js:241` contiene un separador roto.
- Durante la revision del codigo aparecen textos mojibake en landings, formularios, listados y dashboards.

Impacto:
- Baja credibilidad de marca.
- Sensacion de producto inacabado.
- Peor comprension y peor conversion.

Gravedad: Critica

### P1. La marca no se comporta igual en marketing y producto

Diagnostico:
- Las landings de productor, influencer e importador son mas editoriales, aspiracionales y cuidadas.
- La app interior es mas utilitaria, gris, irregular y menos premium.
- El dashboard influencer ademas introduce otra identidad visual mas marcada, separandose aun mas del resto.

Impacto:
- La promesa de marca no coincide con la experiencia real.
- Se pierde continuidad emocional entre captacion y uso.

Gravedad: Alta

### P1. Mobile-first a medias

Diagnostico:
- Hay muchas pantallas pensadas para movil, pero varias acumulan cabeceras, chips, filtros, tabs y CTAs simultaneos.
- El pulgar navega demasiado entre zonas altas y medias.
- Se abusa de barras horizontales scrolleables y cabeceras pegajosas apiladas.

Impacto:
- Fatiga en scroll.
- Mala ergonomia.
- Sensacion de saturacion aunque el contenido sea relevante.

Gravedad: Alta

### P1. Accesibilidad y contraste no parecen estar gobernados por reglas duras

Diagnostico:
- Colores repetidos y redefinidos.
- Mucho texto secundario sobre fondos tenues.
- Targets pequenos en galerias, overlays, chips y acciones de card.
- No se observa una politica visual uniforme de estados focus, tamaños minimos y contraste.

Impacto:
- Riesgo de incumplimiento WCAG.
- Menor usabilidad en exterior, nocturno o usuarios con baja vision.

Gravedad: Alta

### P1. Mezcla de capas de interfaz con demasiadas funciones por pantalla

Diagnostico:
- Feed social, comercio, reels, recetas, perfiles, IA y dashboards conviven, pero no siempre hay una jerarquia primaria.
- Varias paginas intentan ser hub, panel, resumen y accion operativa a la vez.

Impacto:
- Baja claridad del "siguiente paso".
- Disminuye la conversion porque el usuario no sabe que accion es la mas importante.

Gravedad: Alta

## 3. AUDITORIA PAGINA POR PAGINA

## 3.1 Componentes globales y estructura base

### Header global

Objetivo:
- Proveer acceso rapido a busqueda, cuenta, carrito y menu principal.

Problemas detectados:
- Demasiadas responsabilidades en una misma cabecera.
- En movil la busqueda no domina la arquitectura aunque es una funcion central.
- El menu hamburguesa es poco profundo para el peso que tiene visualmente.
- `frontend/src/components/Header.js:141` muestra que el dropdown del menu contiene esencialmente `LocaleSelector`, no una navegacion principal completa.

Impacto UX:
- El header ocupa espacio premium sin resolver del todo la orientacion.
- El usuario no percibe una puerta de entrada clara al sistema.

Gravedad:
- Alta

Propuesta de solucion:
- Rehacer el header en torno a tres funciones maximas: busqueda, identidad/contexto y cuenta/carrito.
- Convertir el menu en una hoja inferior o drawer real con accesos utiles.
- En movil, usar una busqueda visible y compacta como patron consistente en Home, Descubrir y Marketplace.

Referencias:
- `frontend/src/components/Header.js`

### Bottom navigation

Objetivo:
- Resolver la navegacion recurrente de la app principal en movil.

Problemas detectados:
- Se oculta en demasiados contextos, obligando a cada subarea a inventar su propia navegacion.
- Mezcla navegacion primaria con accion flotante de crear y con acceso dual perfil/dashboard.
- A nivel cognitivo no esta claro que es "core app" y que es "workspace por rol".

Impacto UX:
- El usuario pierde orientacion entre areas publicas y privadas.
- La plataforma no parece tener una sola espina dorsal movil.

Gravedad:
- Critica

Propuesta de solucion:
- Dejar un unico bottom nav de producto para toda la experiencia principal.
- Separar "crear" como CTA contextual, no como eje fijo universal.
- Mover el acceso a espacios por rol dentro de Cuenta o Mi espacio.

Referencias:
- `frontend/src/components/BottomNavBar.js`
- `frontend/src/lib/navigation.js`

### Footer y seleccion de idioma

Objetivo:
- Ofrecer informacion secundaria, legales y control de idioma.

Problemas detectados:
- El footer esta mas cuidado que varias paginas internas, generando una inversion rara de prioridad.
- Hay texto corrupto en contenido corporativo.
- El selector de idioma introduce complejidad modal adicional en una zona que deberia ser muy ligera.

Impacto UX:
- La parte menos usada esta mas elaborada que algunas tareas criticas.
- La sensacion de producto premium se resiente al encontrar errores de texto en el cierre de pagina.

Gravedad:
- Media

Propuesta de solucion:
- Simplificar footer en app autenticada.
- Dejar footer completo solo en landings y paginas corporativas.
- Unificar la capa de idioma dentro de ajustes de cuenta y un acceso secundario en footer publico.

Referencias:
- `frontend/src/components/Footer.js`
- `frontend/src/components/LocaleSelector.js`

## 3.2 Home / Feed social

### Home / Feed

Objetivo:
- Ser la entrada principal al ecosistema: descubrir contenido, productos, perfiles y tendencias.

Problemas detectados:
- La pagina `frontend/src/pages/HomePage.js` delega casi toda la experiencia en `FeedContainer`, por lo que la home no define bien una jerarquia propia.
- `frontend/src/components/feed/FeedContainer.js:15` mantiene `selectedCategory`, pero la logica visible es limitada y no termina de estructurar el feed.
- `frontend/src/components/feed/FeedContainer.js:26` usa un refresh artificial por `setTimeout`, lo que sugiere interaccion simulada en vez de una experiencia robusta.
- Se combinan stories, tabs, nav pills y cards sociales antes de establecer un objetivo principal.
- El comercio esta presente, pero no domina cuando deberia ser un marketplace social.

Impacto UX:
- La home entretiene mas de lo que orienta.
- El usuario nuevo tarda en entender si esta en una red social, en una tienda o en un hub mixto.

Gravedad:
- Alta

Propuesta de solucion:
- Definir Home como feed personalizado con una sola jerarquia clara: contenido principal, modulos de descubrimiento secundarios y CTAs de compra visibles.
- Limitar la parte superior a una sola fila de navegacion contextual.
- Introducir un patron de "contenido + producto vinculado" mas limpio, donde el producto sea facilmente comprable sin saturar la tarjeta.

Referencias:
- `frontend/src/pages/HomePage.js`
- `frontend/src/components/feed/FeedContainer.js`
- `frontend/src/components/feed/FollowingFeed.js`
- `frontend/src/components/feed/ForYouFeed.js`

### PostCard / ReelCard / Stories

Objetivo:
- Dar protagonismo al contenido social como motor de descubrimiento.

Problemas detectados:
- Overlays y acciones demasiado presentes sobre la imagen.
- Varias capas de interaccion compiten: like, comentar, compartir, etiquetado de producto, perfil, CTA de compra.
- Las reels tienen un tratamiento visual fuerte, pero no siempre coherente con el resto del producto.
- Falta una jerarquia visual mas limpia para distinguir contenido, creador y accion comercial.

Impacto UX:
- Sobrecarga visual.
- Menor legibilidad del contenido.
- Menor conversion en producto vinculado porque todo pesa igual.

Gravedad:
- Alta

Propuesta de solucion:
- Reducir acciones visibles por defecto.
- Convertir producto asociado en una ficha compacta y estable.
- Separar claramente contenido social y accion comercial con bloques visuales distintos.

Referencias:
- `frontend/src/components/feed/PostCard.js`
- `frontend/src/components/feed/ReelCard.js`
- `frontend/src/components/feed/StoriesCarousel.js`

## 3.3 Descubrir y busqueda

### Discover

Objetivo:
- Centralizar exploracion por categorias, tendencias, productos, recetas y perfiles.

Problemas detectados:
- Exceso de capas arriba del fold: busqueda, tabs, pills, categorias, tendencias y modulos destacados.
- Mucho color y mucho chip al mismo tiempo.
- La pagina intenta ser a la vez buscador, home secundaria, category hub y promo page.
- La busqueda global del sistema no esta realmente consolidada aqui.

Impacto UX:
- Fatiga visual inmediata.
- Baja claridad de por donde empezar.
- La exploracion se siente mas pesada de lo necesario.

Gravedad:
- Alta

Propuesta de solucion:
- Rehacer Discover como una sola pantalla con tres niveles maximos:
  1. busqueda global;
  2. tabs principales;
  3. secciones curadas.
- Reducir el numero de chips simultaneos y usar filtros progresivos.
- Unificar la logica con la busqueda global del producto.

Referencias:
- `frontend/src/pages/DiscoverPage.js`
- `frontend/src/components/CategoryNav.js`
- `frontend/src/components/GlobalSearch.js`

## 3.4 Marketplace y comercio

### Marketplace / Products list

Objetivo:
- Facilitar busqueda, filtrado y comparacion de productos.

Problemas detectados:
- Demasiados filtros visibles para movil.
- Competencia entre breadcrumbs, buscador, filtro, categorias, ordenacion y grid.
- Densidad de informacion alta en listados.
- Persisten errores de localizacion en paises y etiquetas.

Impacto UX:
- El listado requiere demasiado esfuerzo antes de ver productos.
- Menor sensacion de rapidez y descubrimiento.

Gravedad:
- Critica

Propuesta de solucion:
- En movil, dejar solo buscador, contador de resultados y un boton "Filtros".
- Mover filtros avanzados a bottom sheet.
- Reducir el numero de señales por card.
- Dar mas aire al grid y mejorar consistencia de price, rating, envio y origen.

Referencias:
- `frontend/src/pages/ProductsPage.js`
- `frontend/src/components/ProductCard.js`

### ProductCard

Objetivo:
- Convertir una tarjeta de producto en un resumen claro y vendible.

Problemas detectados:
- Demasiadas senales en poco espacio.
- Dos CTAs fuertes por tarjeta generan competencia interna.
- Errores de encoding visibles.
- La card intenta transmitir demasiada confianza de una vez: precio, rating, origen, envio, badges, CTA, compra inmediata.

Impacto UX:
- La tarjeta no respira.
- Se pierde scanability.
- Baja calidad percibida.

Gravedad:
- Critica

Propuesta de solucion:
- Rediseñar la card con esta estructura fija:
  1. imagen;
  2. nombre + productor;
  3. precio + metrica corta;
  4. una sola CTA primaria o control de cantidad.
- Mover datos secundarios a detalle o tooltip.
- Arreglar encoding antes de cualquier retoque cosmetico.

Referencias:
- `frontend/src/components/ProductCard.js`

### Product detail

Objetivo:
- Convencer, informar y cerrar la compra con la menor friccion posible.

Problemas detectados:
- Demasiados bloques al mismo nivel.
- Exceso de contenido tecnico visible demasiado pronto.
- Variantes, packs, ingredientes, nutricion, alergenos, certificados y reseñas compiten entre si.
- El pliegue inicial no prioriza de forma radical la compra.

Impacto UX:
- El detalle abruma.
- Peor conversion a carrito.
- Mas scroll del necesario para llegar a la accion.

Gravedad:
- Critica

Propuesta de solucion:
- Reestructurar la pagina en tres capas:
  1. compra inmediata arriba del fold;
  2. confianza y decision en acordeones;
  3. contenido extendido y social mas abajo.
- Sticky purchase bar en movil.
- Certificados y nutricion como modulos plegables.
- Reviews y contenido inspiracional despues de la zona de compra.

Referencias:
- `frontend/src/pages/ProductDetailPage.js`
- `frontend/src/components/ProductImageGallery.js`

### Stores list

Objetivo:
- Descubrir tiendas/productores por ubicacion, categoria o reputacion.

Problemas detectados:
- Cabecera, filtros, mapa y grid compiten visualmente.
- Para movil hay demasiadas decisiones antes de ver una tienda.
- El tratamiento visual es correcto, pero no suficientemente priorizado.

Impacto UX:
- Exploracion lenta.
- Menor conversion a visita de tienda.

Gravedad:
- Alta

Propuesta de solucion:
- Modelo de interfaz:
  1. buscador por tienda;
  2. filtro por zona/categoria;
  3. lista;
  4. mapa como modo alternativo, no simultaneo.
- Reducir hero visual y llevar resultados antes al fold.

Referencias:
- `frontend/src/pages/StoresListPage.js`

### Store page

Objetivo:
- Mostrar identidad del productor/tienda y facilitar compra y seguimiento.

Problemas detectados:
- Hero, informacion, tabs, galerias, reviews, certificados y storytelling tienen un peso parecido.
- La identidad de la tienda esta bien planteada, pero no se convierte en una accion clara principal.
- El usuario puede perder el hilo entre comprar, seguir y explorar historia.

Impacto UX:
- Buena riqueza de contenido, pero mala priorizacion.

Gravedad:
- Alta

Propuesta de solucion:
- Estructura recomendada:
  1. identidad + CTA principal;
  2. productos destacados;
  3. reputacion y confianza;
  4. historia y contenido extendido.
- Tabs mas sobrias y menos altura de hero en movil.

Referencias:
- `frontend/src/pages/StorePage.js`

### User profile

Objetivo:
- Reunir identidad social, contenido, guardados y actividad del usuario.

Problemas detectados:
- Mezcla de perfil social, gestion de cuenta y catalogo guardado en una sola experiencia muy larga.
- Exceso de modos y tabs.
- El usuario no distingue bien "mi perfil publico" de "mi configuracion privada".

Impacto UX:
- Complejidad innecesaria.
- Curva de aprendizaje alta.

Gravedad:
- Alta

Propuesta de solucion:
- Separar:
  1. perfil publico;
  2. contenido/publicaciones;
  3. configuracion privada en dashboard de cuenta.
- Reducir la cantidad de acciones editables visibles en pantalla principal.

Referencias:
- `frontend/src/pages/UserProfilePage.js`

## 3.5 Recetas / Hispalo Kitchen

### Recipes list

Objetivo:
- Descubrir recetas y conectar inspiracion con compra de ingredientes.

Problemas detectados:
- Es de las pantallas mas limpias estructuralmente, pero el lenguaje visual queda a medio camino entre landing y app.
- Mezcla de copy en ingles y espanol.
- Podria explotar mejor la vinculacion con marketplace.

Impacto UX:
- Entendible, pero con oportunidad desaprovechada de conversion cruzada.

Gravedad:
- Media

Propuesta de solucion:
- Mantener su limpieza como referencia.
- Unificar idioma.
- Añadir una relacion mas evidente entre receta e ingredientes comprables.

Referencias:
- `frontend/src/pages/RecipesPage.js`

### Recipe detail

Objetivo:
- Facilitar lectura, preparacion y compra de ingredientes.

Problemas detectados:
- La estructura es clara, pero la vinculacion comercial podria ser mas fuerte.
- Hay detalles de moneda/localizacion poco consistentes.
- Falta una CTA mas visible para "comprar ingredientes".

Impacto UX:
- Buena lectura, conversion mejorable.

Gravedad:
- Media

Propuesta de solucion:
- Introducir un bloque sticky o destacado de ingredientes comprables.
- Mejorar fotos, jerarquia de pasos y CTA de guardar/compartir.

Referencias:
- `frontend/src/pages/RecipeDetailPage.js`

### Create recipe

Objetivo:
- Permitir crear recetas con estructura y productos vinculados.

Problemas detectados:
- Formulario largo para movil.
- Vinculacion de productos mejorable en claridad.
- Falta progresion visual mas guiada.

Impacto UX:
- Alta carga cognitiva para creadores.

Gravedad:
- Alta

Propuesta de solucion:
- Convertir el formulario en wizard de 3 a 4 pasos.
- Separar contenido, ingredientes, productos vinculados y publicacion.
- Añadir resumen lateral o inferior antes de publicar.

Referencias:
- `frontend/src/pages/CreateRecipePage.js`

## 3.6 Auth y onboarding

### Login

Objetivo:
- Acceso rapido con el minimo esfuerzo.

Problemas detectados:
- La pagina esta relativamente bien resuelta.
- Persisten detalles de copy corrupto.
- La experiencia podria orientar mejor segun rol.

Impacto UX:
- Buena base, pero necesita limpieza y microcopy mas confiable.

Gravedad:
- Media

Propuesta de solucion:
- Mantener estructura compacta.
- Corregir encoding y textos.
- Añadir clarificacion de acceso por tipo de usuario si aplica.

Referencias:
- `frontend/src/pages/LoginPage.js`

### Register

Objetivo:
- Convertir nuevos usuarios sin friccion.

Problemas detectados:
- Formulario demasiado largo.
- Demasiados campos, decisiones y condiciones en una sola vista.
- Mezcla datos personales, negocio, legal, preferencias y credenciales.

Impacto UX:
- Abandono alto probable.
- Mala adaptacion a movil.

Gravedad:
- Critica

Propuesta de solucion:
- Dividir el registro en un funnel por pasos:
  1. eleccion de rol;
  2. datos basicos;
  3. datos especificos por rol;
  4. confirmacion.
- Mantener avance guardado.
- Mostrar progreso y reducir campos visibles por paso.

Referencias:
- `frontend/src/pages/RegisterPage.js`

### Role selector

Objetivo:
- Ayudar al usuario a autoidentificarse antes del onboarding.

Problemas detectados:
- Buena idea conceptual, ejecucion visual aun basica.
- El copy necesita limpieza.
- Falta explicar claramente beneficios y diferencias entre roles.

Impacto UX:
- Puede ser un gran filtro de claridad, pero aun no cumple todo su potencial.

Gravedad:
- Media

Propuesta de solucion:
- Convertirlo en puerta de entrada oficial a registro.
- Añadir beneficios concretos por rol y CTA especifica.

Referencias:
- `frontend/src/pages/register/RoleSelector.js`

### Onboarding

Objetivo:
- Personalizar la experiencia inicial del usuario.

Problemas detectados:
- La estructura en pasos esta bien encaminada.
- Puede comunicar mejor el valor de cada paso.
- Falta una integracion mas fuerte con navegacion posterior.

Impacto UX:
- Buena base, pero no se percibe todavia como una experiencia premium de bienvenida.

Gravedad:
- Media

Propuesta de solucion:
- Mantener el flujo corto.
- Añadir contexto de beneficio por paso.
- Cerrar el onboarding con una home personalizada muy evidente.

Referencias:
- `frontend/src/pages/OnboardingPage.jsx`
- `frontend/src/components/onboarding/OnboardingLayout.jsx`

### Verify / forgot / reset / pending approval

Objetivo:
- Resolver estados de autenticacion y espera.

Problemas detectados:
- Son paginas funcionales, pero poco memorables.
- El pending approval es claro, aunque generico.
- Falta un sistema consistente de pantallas de estado.

Impacto UX:
- Son momentos sensibles y la interfaz no transmite suficiente confianza o acompanamiento.

Gravedad:
- Media

Propuesta de solucion:
- Crear un patron unico de "state screens" para exito, error, espera, email enviado y verificacion.
- Reforzar siguiente accion recomendada.

Referencias:
- `frontend/src/pages/VerifyEmailPage.js`
- `frontend/src/pages/ForgotPasswordPage.js`
- `frontend/src/pages/ResetPasswordPage.js`
- `frontend/src/pages/PendingApprovalPage.js`

## 3.7 Chat, mensajeria e HI AI

### Chat principal

Objetivo:
- Facilitar conversacion entre usuarios y asistencia IA.

Problemas detectados:
- La experiencia parece potente, pero el sistema de chat es muy grande y complejo.
- `frontend/src/components/InternalChat.js` supera 1300 lineas, señal de mezcla de demasiadas responsabilidades.
- La relacion entre chat humano, chat interno y HI AI no queda totalmente unificada.

Impacto UX:
- Riesgo de inconsistencias de estados y patrones.
- Menor claridad para el usuario sobre con quien esta hablando y para que sirve cada chat.

Gravedad:
- Alta

Propuesta de solucion:
- Unificar todos los chats bajo una sola arquitectura visual.
- Diferenciar claramente:
  1. soporte;
  2. conversacion comercial;
  3. asistente IA.
- Composer y cabecera identicos; cambia solo contexto y tono.

Referencias:
- `frontend/src/components/chat/ChatContainer.js`
- `frontend/src/components/InternalChat.js`
- `frontend/src/components/HiAiButton.js`

## 3.8 Carrito y checkout

### MiniCart

Objetivo:
- Mostrar resumen rapido antes de comprar.

Problemas detectados:
- Demasiada funcionalidad para un drawer.
- Muestra opciones de pago express junto con mucha informacion complementaria.
- Persisten problemas de encoding.

Impacto UX:
- Puede prometer una velocidad de compra que luego no coincide con el flujo real.
- Duplica decisiones con el carrito completo.

Gravedad:
- Alta

Propuesta de solucion:
- Limitar MiniCart a resumen, subtotal y CTA a carrito/checkout.
- No duplicar opciones de pago si no van a ejecutarse de forma directa y consistente.

Referencias:
- `frontend/src/components/cart/MiniCart.js`

### Cart

Objetivo:
- Revisar compra y completar checkout.

Problemas detectados:
- El carrito actua como carrito y checkout a la vez.
- Mezcla errores de stock, descuentos, email, direcciones, resumen, pago y validacion.
- Exceso de pasos invisibles dentro de una sola pantalla.

Impacto UX:
- Es uno de los mayores riesgos de abandono.
- La carga mental es excesiva para movil.

Gravedad:
- Critica

Propuesta de solucion:
- Separar en dos etapas visibles:
  1. carrito;
  2. checkout.
- Mantener resumen sticky.
- Mostrar inventario y problemas de disponibilidad antes del paso de pago.

Referencias:
- `frontend/src/pages/CartPage.js`

### Checkout success

Objetivo:
- Confirmar compra y orientar el siguiente paso.

Problemas detectados:
- Es de las paginas mas limpias, pero se puede aprovechar mejor para retencion.

Impacto UX:
- Correcta, aunque infrautilizada.

Gravedad:
- Baja

Propuesta de solucion:
- Añadir CTA a pedidos, seguimiento, volver a comprar y compartir.
- Conectar con recomendaciones relevantes.

Referencias:
- `frontend/src/pages/CheckoutSuccessPage.js`

## 3.9 Landings de captacion

### Productor landing

Objetivo:
- Captar productores y convertirlos a registro.

Problemas detectados:
- Visualmente mas potente que gran parte del producto.
- Problemas de texto/encoding reducen credibilidad.
- Puede existir desalineacion entre la promesa y el dashboard real posterior.

Impacto UX:
- Buena captacion visual, peor continuidad hacia la experiencia autenticada.

Gravedad:
- Alta

Propuesta de solucion:
- Mantener tono editorial.
- Reutilizar patrones visuales en el dashboard productor para continuidad de marca.

Referencias:
- `frontend/src/pages/producer/Landing.jsx`

### Influencer landing

Objetivo:
- Captar influencers y explicar monetizacion.

Problemas detectados:
- Mejor intencion de marca que la app interior.
- El dashboard posterior cambia demasiado de tono.
- Riesgo de expectativas desalineadas.

Impacto UX:
- Buena promesa, continuidad irregular.

Gravedad:
- Alta

Propuesta de solucion:
- Llevar parte del lenguaje visual y narrativo de la landing al dashboard influencer.

Referencias:
- `frontend/src/pages/influencer/Landing.jsx`

### Importador landing

Objetivo:
- Explicar valor B2B/importador y convertir a onboarding.

Problemas detectados:
- Misma fractura entre marketing y producto operativo.
- El area importador no alcanza el mismo nivel de pulido visual.

Impacto UX:
- La experiencia pierde fuerza tras el registro.

Gravedad:
- Alta

Propuesta de solucion:
- Rehacer el dashboard importador a partir de la promesa y tono de esta landing.

Referencias:
- `frontend/src/pages/importer/Landing.jsx`

## 3.10 Dashboards de cliente y cuenta

### Customer dashboard shell

Objetivo:
- Organizar pedidos, guardados, predicciones, perfil y preferencias.

Problemas detectados:
- Introduce una navegacion movil propia paralela a la global.
- La shell es funcional, pero refuerza la fragmentacion del producto.

Impacto UX:
- La cuenta se siente como otra app.

Gravedad:
- Alta

Propuesta de solucion:
- Mantener la shell solo como contexto visual, no como sistema de navegacion independiente.
- Integrar Cuenta dentro de la IA principal del producto.

Referencias:
- `frontend/src/components/dashboard/CustomerLayoutResponsive.js`

### Customer overview

Objetivo:
- Ofrecer un resumen rapido de actividad, recomendaciones y accesos frecuentes.

Problemas detectados:
- Es una de las mejores bases mobile-first del proyecto.
- Aun asi, acumula widgets y modulos diversos que pueden simplificarse.

Impacto UX:
- Buena pantalla base; util como patron para el resto de dashboards.

Gravedad:
- Media

Propuesta de solucion:
- Conservarla como referencia de tono y ritmo.
- Reducir widgets simultaneos.
- Mejorar consistencia de cards, precios y spacing.

Referencias:
- `frontend/src/pages/customer/CustomerOverview.js`

### Orders / Followed stores / Wishlist / AI preferences / Profile

Objetivo:
- Cubrir operaciones y configuracion de cliente.

Problemas detectados:
- Las vistas operativas son funcionales, pero muy de "panel interno".
- `CustomerProfile` es demasiado densa para movil.
- La separacion entre contenido publico y ajustes privados puede mejorar.

Impacto UX:
- La cuenta es util, pero no elegante ni especialmente rapida de usar.

Gravedad:
- Alta

Propuesta de solucion:
- Reordenar Cuenta en:
  1. pedidos;
  2. guardados;
  3. direcciones y pagos;
  4. ajustes;
  5. IA/preferencias.
- Dividir settings en secciones cortas y progresivas.

Referencias:
- `frontend/src/pages/customer/CustomerOrders.js`
- `frontend/src/pages/customer/CustomerFollowedStores.js`
- `frontend/src/pages/customer/WishlistPage.js`
- `frontend/src/pages/customer/CustomerAIPreferences.js`
- `frontend/src/pages/customer/CustomerProfile.js`

## 3.11 Dashboard productor

### Producer dashboard shell

Objetivo:
- Dar acceso a resumen, productos, pedidos, pagos y configuracion.

Problemas detectados:
- La navegacion horizontal movil concentra demasiados destinos.
- El dashboard usa shell propia, distinta al resto de experiencias.
- El sidebar desktop y la barra movil no se traducen siempre bien entre si.

Impacto UX:
- Alto esfuerzo de orientacion.
- Especialmente duro para usuarios nuevos.

Gravedad:
- Critica

Propuesta de solucion:
- Rehacer el area productor como workspace con:
  1. resumen;
  2. catalogo;
  3. pedidos;
  4. pagos;
  5. tienda;
  6. ajustes.
- En movil, mostrar maximo 4 destinos principales mas "Mas".

Referencias:
- `frontend/src/components/dashboard/ProducerLayoutResponsive.js`

### Producer overview

Objetivo:
- Mostrar estado del negocio y prioridades.

Problemas detectados:
- Mucha metrica y muchas cards con igual peso.
- Tono visual mas corporativo que el resto del marketplace.

Impacto UX:
- El productor ve informacion, pero no siempre sabe que hacer primero.

Gravedad:
- Alta

Propuesta de solucion:
- Priorizar acciones antes que metricas.
- Dejar solo 3 KPIs principales arriba.
- Usar un bloque de "proximas acciones" como motor principal.

Referencias:
- `frontend/src/pages/producer/ProducerOverview.js`

### Producer products

Objetivo:
- Gestionar alta, edicion y mantenimiento del catalogo.

Problemas detectados:
- Pantalla demasiado extensa y compleja.
- Una sola vista concentra creacion, edicion, variantes, nutricion, certificados, packs e imagenes.
- Riesgo alto de error, fatiga y abandono.

Impacto UX:
- Probable cuello de botella operativo.
- Alta friccion en el corazon del negocio productor.

Gravedad:
- Critica

Propuesta de solucion:
- Convertirlo en wizard o editor por secciones persistentes:
  1. basico;
  2. medios;
  3. precio y variantes;
  4. composicion;
  5. logistica;
  6. publicacion.
- Guardado automatico, progreso visible y validacion por bloque.

Referencias:
- `frontend/src/pages/producer/ProducerProducts.js`
- `frontend/src/pages/producer/VariantPackManager.js`
- `frontend/src/pages/producer/ProductCountryManagement.js`

### Producer orders / payments / profile / store / shipping / certificates / connect

Objetivo:
- Resolver la operativa diaria del productor.

Problemas detectados:
- Las vistas existen, pero no parecen formar parte de un mismo sistema priorizado.
- Varias acciones importantes quedan repartidas sin una narrativa de workflow clara.

Impacto UX:
- Se puede hacer todo, pero no se hace todo con facilidad.

Gravedad:
- Alta

Propuesta de solucion:
- Reagrupar por jobs-to-be-done:
  1. vender;
  2. cumplir pedidos;
  3. cobrar;
  4. mostrar tienda;
  5. configurar negocio.
- Usar un lenguaje y estructura comunes en todas las subpaginas.

Referencias:
- `frontend/src/pages/producer/ProducerOrders.js`
- `frontend/src/pages/producer/ProducerPayments.js`
- `frontend/src/pages/producer/ProducerProfile.js`
- `frontend/src/pages/producer/ProducerStoreProfile.js`
- `frontend/src/pages/producer/ProducerShippingPolicy.js`
- `frontend/src/pages/producer/ProducerCertificates.js`
- `frontend/src/pages/producer/ProducerConnectPage.js`

## 3.12 Dashboard importador y area B2B

### Importer dashboard y paginas propias

Objetivo:
- Gestionar catalogo, marcas, certificados y cotizaciones para actividad importadora.

Problemas detectados:
- Menor madurez visual que productor.
- Tono mas utilitario y menos cohesionado.
- La experiencia importador parece una adaptacion, no un area nativa del sistema.

Impacto UX:
- Debilita la percepcion premium del flujo B2B.

Gravedad:
- Alta

Propuesta de solucion:
- Rediseñar importador con una shell unica, clara y mas proxima al lenguaje premium del producto.
- Definir dashboard importador por tareas: descubrir, cotizar, negociar, certificar, cerrar.

Referencias:
- `frontend/src/pages/importer/ImporterDashboardPage.js`
- `frontend/src/pages/importer/ImporterCatalogPage.js`
- `frontend/src/pages/importer/ImporterBrandsPage.js`
- `frontend/src/pages/importer/ImporterCertificatesPage.js`
- `frontend/src/pages/importer/ImporterQuotesPage.js`

### B2B marketplace / quotes / chat

Objetivo:
- Facilitar sourcing, solicitud de cotizacion y conversacion comercial.

Problemas detectados:
- Visualmente mas cercano a herramienta interna que a producto premium.
- `QuoteBuilder` trabaja con estructura de IDs y complejidad tecnica que no deberia filtrarse a la UX.
- Catalogo, quotes y chat no siempre se sienten como un flujo continuo.

Impacto UX:
- La experiencia B2B es funcional, pero no elegante ni especialmente eficiente.

Gravedad:
- Alta

Propuesta de solucion:
- Construir un flujo lineal:
  1. buscar productor/producto;
  2. seleccionar items;
  3. crear RFQ;
  4. negociar en chat;
  5. cerrar.
- Selectores humanos, cards mas claras y detalle de cotizacion mas editorial.

Referencias:
- `frontend/src/pages/b2b/B2BMarketplacePage.js`
- `frontend/src/pages/b2b/B2BQuotesHistoryPage.js`
- `frontend/src/pages/b2b/B2BChatPage.js`
- `frontend/src/components/b2b/QuoteBuilder.js`
- `frontend/src/components/b2b/B2BProductCard.js`

## 3.13 Dashboard influencer

### Influencer dashboard

Objetivo:
- Gestionar rendimiento, comisiones, codigos, pagos y acciones de crecimiento.

Problemas detectados:
- Mucha monetizacion, muchas metricas y demasiados bloques con igual protagonismo.
- Introduce un lenguaje visual y tipografico diferente al resto.
- La IA aparece como una funcion mas, no como una ayuda integrada al flujo.

Impacto UX:
- Dashboard potente, pero disperso.
- Baja continuidad de marca.

Gravedad:
- Critica

Propuesta de solucion:
- Reestructurar en cuatro secciones:
  1. rendimiento;
  2. monetizacion;
  3. activos/campanas;
  4. pagos.
- Mover la IA a un panel de asistencia contextual.
- Homogeneizar tipografia y componentes con el resto del producto.

Referencias:
- `frontend/src/pages/influencer/InfluencerDashboard.js`
- `frontend/src/components/dashboard/InfluencerLayoutResponsive.js`

## 3.14 Admin y super-admin

### Admin dashboard y modulos

Objetivo:
- Moderar productores, productos, certificados, pedidos, reviews, categorias e incidencias.

Problemas detectados:
- Las pantallas son densas y muy de backoffice clasico.
- Hay demasiada informacion del mismo peso.
- En movil, la experiencia puede degradarse rapidamente.

Impacto UX:
- Funcionales para operativa interna, pero mejorables en priorizacion y velocidad de lectura.

Gravedad:
- Media-alta

Propuesta de solucion:
- Mantener enfoque operativo, pero con jerarquia mejor:
  1. alertas;
  2. pendientes;
  3. actividad reciente;
  4. tablas detalladas.
- Versiones responsive pensadas como listas y drawers, no tablas comprimidas.

Referencias:
- `frontend/src/pages/admin/AdminOverview.js`
- `frontend/src/pages/admin/AdminProducts.js`
- `frontend/src/pages/admin/AdminProducers.js`
- `frontend/src/pages/admin/AdminCertificates.js`
- `frontend/src/pages/admin/AdminOrders.js`
- `frontend/src/pages/admin/AdminReviews.js`
- `frontend/src/pages/admin/AdminInfluencers.js`
- `frontend/src/pages/admin/CategoriesPage.js`
- `frontend/src/pages/admin/EscalationChat.js`
- `frontend/src/components/dashboard/AdminLayoutResponsive.js`

### Super-admin dashboard y modulos

Objetivo:
- Supervisar usuarios, contenido, mercados, finanzas e insights.

Problemas detectados:
- Se siente como una segunda capa de admin, no como una evolucion clara del mismo sistema.
- Exceso de KPI y semaforos.
- Muy orientado a acumulacion de datos, menos a decisiones priorizadas.

Impacto UX:
- Mucha informacion, poca narrativa accionable.

Gravedad:
- Media-alta

Propuesta de solucion:
- Reordenar por nivel ejecutivo:
  1. salud de plataforma;
  2. riesgos;
  3. crecimiento;
  4. moderacion;
  5. finanzas.
- Reducir numero de cards visibles y aumentar densidad solo cuando el usuario la solicita.

Referencias:
- `frontend/src/pages/super-admin/SuperAdminOverview.js`
- `frontend/src/pages/super-admin/UserManagement.js`
- `frontend/src/pages/super-admin/ContentManagement.js`
- `frontend/src/pages/super-admin/InsightsDashboard.js`
- `frontend/src/pages/super-admin/FinancialDashboard.js`
- `frontend/src/pages/super-admin/MarketCoverage.js`
- `frontend/src/components/dashboard/SuperAdminLayoutResponsive.js`

## 3.15 Paginas corporativas e informativas

### About / Terms / Privacy / Help / Blog / Press / Careers / Contact

Objetivo:
- Construir confianza institucional y resolver dudas.

Problemas detectados:
- Varias paginas son demasiado simples para el peso reputacional que deberian tener.
- El contenido corporativo no siempre tiene el mismo nivel de pulido que las landings.
- Los errores de texto castigan mucho mas en estas pantallas.

Impacto UX:
- Debilitan confianza legal, editorial y de marca.

Gravedad:
- Alta

Propuesta de solucion:
- Crear un sistema corporativo consistente con layout, tipografia, espaciado y bloques de contenido reutilizables.
- Elevar especialmente Terms, Privacy y Help.

Referencias:
- `frontend/src/pages/AboutPage.js`
- `frontend/src/pages/TermsPage.js`
- `frontend/src/pages/PrivacyPage.js`
- `frontend/src/pages/HelpPage.js`
- `frontend/src/components/company/CompanyInfoPageLayout.js`

## 4. PROPUESTAS DE REDISENO

### Rediseño 1. Unificar arquitectura de navegacion

Que cambiar:
- Sustituir la mezcla de shells por una arquitectura global unica y clara.

Por que:
- La fragmentacion actual es el principal problema sistemico.

Como implementarlo:
- Crear una IA principal con cinco destinos maximos en movil:
  1. Inicio
  2. Explorar
  3. Mercado
  4. Recetas
  5. Cuenta
- Incluir "Mi espacio" dentro de Cuenta para roles avanzados.
- Limitar dashboards a subnavegaciones locales y contextuales.

### Rediseño 2. Crear un sistema visual unico

Que cambiar:
- Tipografia, color, radius, sombras, espaciado, estados y tokens.

Por que:
- Hoy no hay una sola verdad visual.

Como implementarlo:
- Consolidar tokens en una unica capa.
- Eliminar redefiniciones duplicadas.
- Definir una jerarquia tipografica cerrada y un set de superficies y componentes canonicos.

### Rediseño 3. Simplificar pantallas de conversion

Que cambiar:
- Register, Product detail, Cart y Product cards.

Por que:
- Son los mayores puntos de fuga de claridad y conversion.

Como implementarlo:
- Registro por pasos.
- PDP con sticky buy bar.
- Carrito separado de checkout.
- Product cards con una sola CTA visible.

### Rediseño 4. Reconciliar marketing y producto

Que cambiar:
- Llevar parte del lenguaje editorial de landings al interior de app.

Por que:
- La marca hoy promete una experiencia mas premium que la que entrega la app autenticada.

Como implementarlo:
- Mantener serif editorial solo en hero/brand moments.
- Usar una sans limpia y consistente en UI productiva.
- Aplicar una misma paleta y ritmo visual en landings y dashboards.

### Rediseño 5. Rehacer dashboards por jobs-to-be-done

Que cambiar:
- Orden interno de productor, importador, influencer, customer, admin.

Por que:
- Hay demasiados destinos y no suficiente priorizacion por tarea real.

Como implementarlo:
- Agrupar por trabajo:
  - vender;
  - descubrir;
  - cobrar;
  - gestionar;
  - optimizar.
- Cada dashboard debe abrir con una lista corta de acciones prioritarias, no con 12 metricas equivalentes.

## 5. REESTRUCTURACION DE NAVEGACION

## 5.1 Arquitectura propuesta

Navegacion principal movil:
- Inicio
- Explorar
- Mercado
- Recetas
- Cuenta

Definicion de cada destino:
- Inicio: feed personalizado, stories, creators, productos vinculados, CTA rapida a compra.
- Explorar: buscador global, categorias, tendencias, perfiles, reels, recetas.
- Mercado: productos, tiendas, filtros, favoritos, ofertas.
- Recetas: descubrir, guardar, comprar ingredientes, crear receta si el rol lo permite.
- Cuenta: pedidos, guardados, perfil, ajustes y acceso a Mi espacio.

Mi espacio:
- Productor: Resumen, Catalogo, Pedidos, Pagos, Tienda, Ajustes.
- Importador: Resumen, Sourcing, RFQs, Chat, Certificados, Ajustes.
- Influencer: Resumen, Campanas, Comisiones, Pagos, Activos, Ajustes.
- Admin: Pendientes, Revision, Operaciones, Reportes.
- Super-admin: Salud, Riesgos, Mercados, Finanzas, Moderacion.

## 5.2 Regla de 3 clics

Ejemplos de acceso:
- Comprar un producto: Inicio -> Producto vinculado -> Añadir o Comprar.
- Encontrar una tienda: Mercado -> Tiendas -> Ficha.
- Ver un pedido: Cuenta -> Pedidos -> Detalle.
- Crear un producto: Cuenta -> Mi espacio productor -> Nuevo producto.
- Solicitar cotizacion B2B: Cuenta -> Mi espacio importador -> Nueva RFQ.
- Ver comisiones influencer: Cuenta -> Mi espacio influencer -> Comisiones.

## 5.3 Principios de navegacion obligatorios

- No mas de una navegacion principal fija por pantalla.
- No mas de una fila horizontal scrolleable de tabs o chips en el primer viewport.
- El header no debe duplicar opciones que ya viven en bottom nav.
- Los dashboards por rol deben heredar el mismo patron base.
- Los aliases deben seguir existiendo por SEO o compatibilidad, pero nunca definir la IA principal.

## 6. SISTEMA VISUAL PROPUESTO

## 6.1 Tipografia

Propuesta:
- UI principal: una sans unica y legible para todo el producto.
- Editorial/brand moments: una serif unica reservada a hero, titulares de marca y algunas secciones inspiracionales.

Regla:
- Nunca mezclar tres familias en una misma experiencia.
- El interior del producto debe priorizar claridad, no teatralidad.

Recomendacion practica:
- Mantener `Playfair Display` solo para momentos de marca si se desea conservar continuidad.
- Usar una sola sans de producto para headings operativos, botones, formularios y dashboards.
- Eliminar `Cinzel` y cualquier `font-display` no formalizada.

## 6.2 Color

Propuesta de direccion:
- Base neutra calida.
- Primario oscuro sobrio.
- Secundario alimentario/calido.
- Colores de estado muy funcionales.

Reglas:
- Un color primario dominante.
- Un solo acento fuerte por pantalla.
- No usar chips multicolor de forma sistematica.
- Todo texto cuerpo debe cumplir minimo WCAG AA.

## 6.3 Espaciado y layout

Propuesta:
- Grid movil con ritmo de 4/8/12/16/24/32.
- Cards con mas aire y menos bordes decorativos.
- Mayor separacion entre bloques de decision y bloques informativos.

Reglas:
- Ninguna pantalla clave debe abrir con mas de 3 bloques apilados de distinta naturaleza.
- Ninguna card debe intentar resolver mas de una decision principal.

## 6.4 Jerarquia visual

Reglas:
- Un solo CTA primario por viewport.
- El titulo siempre debe ser identificable en 1 segundo.
- Los modulos secundarios deben tener menor contraste y menor ruido.
- Reviews, detalles tecnicos y extras van debajo de la zona de accion principal.

## 7. OPTIMIZACION DE MOBILE UX

### Ergonomia

- Colocar las acciones de alto valor en la zona baja o en sticky bars.
- Evitar CTA decisivas solo en la zona alta.
- Targets tactiles minimos de 44x44 px.

### Scroll

- Reducir headers apilados.
- Evitar dos o mas carruseles horizontales consecutivos arriba del fold.
- Usar acordeones para contenido secundario en PDP, perfiles y dashboards.

### Fatiga visual

- Disminuir el numero de badges simultaneos.
- Menos color en estado base.
- Menos sombras y bordes compitiendo.
- Mayor espacio negativo.

### CTA

- Siempre una CTA primaria y una secundaria maximo por modulo.
- En ecommerce, sticky CTA de compra.
- En formularios largos, CTA fija de continuar/guardar.

### Formularios

- Convertir formularios largos en pasos.
- Validacion inline breve.
- Resumen al final antes de enviar.

## 8. COMPONENTES A REDISEÑAR

### Botones

Problema:
- Jerarquia irregular entre primario, secundario, ghost y accion contextual.

Rediseño:
- Set fijo de variantes con tamanos canonicos y estados focus/disabled definidos.

### Inputs

Problema:
- Falta una experiencia consistente para campos, ayudas, errores y selects complejos.

Rediseño:
- Input base unico, labels externos, mensajes cortos, estados accesibles y mayor claridad en formularios.

### Cards

Problema:
- Demasiadas cards actuan como mini dashboards.

Rediseño:
- Cada card debe comunicar una sola idea principal.

### Navbar / Header / Bottom nav

Problema:
- Son tres sistemas parcialmente superpuestos.

Rediseño:
- Un unico sistema de navegacion principal y subnavegacion local segun contexto.

### Feed cards

Problema:
- Demasiadas acciones visibles y overlays pesados.

Rediseño:
- Contenido primero, producto asociado despues, acciones minimizadas.

### Product cards

Problema:
- Sobrecargadas y con doble CTA.

Rediseño:
- Imagen limpia, nombre, productor, precio, envio/origen breve y una sola CTA.

### Modales y bottom sheets

Problema:
- Se usan con logicas distintas segun area.

Rediseño:
- Establecer un patron unico de drawer, modal y bottom sheet.

### Filtros

Problema:
- Los filtros consumen demasiado espacio de pantalla.

Rediseño:
- Resumen de filtros activo + bottom sheet progresivo.

## 9. PLAN DE ACCION PRIORITARIO

## FASE 1 - ERRORES CRITICOS

Prioridad:
- Maxima

Objetivo UX:
- Recuperar claridad, confianza y conversion en pantallas nucleares.

Tareas concretas:
- Corregir todos los textos corruptos y normalizar UTF-8.
- Unificar tipografia y tokens visuales.
- Rediseñar `ProductCard`.
- Reestructurar `ProductDetailPage`.
- Separar carrito y checkout.
- Convertir registro en flujo por pasos.
- Reducir la complejidad del bottom nav y de los headers apilados.

Impacto UX:
- Alto impacto inmediato en percepcion de calidad, conversion y confianza.

## FASE 2 - MEJORAS ESTRUCTURALES

Prioridad:
- Muy alta

Objetivo UX:
- Convertir Hispaloshop en una sola plataforma coherente.

Tareas concretas:
- Implantar nueva arquitectura de navegacion.
- Rehacer shells de dashboards por rol sobre un mismo patron base.
- Simplificar Discover, Marketplace y perfiles.
- Refactorizar formularios largos de productor, receta y cuenta.
- Reordenar dashboards por tareas prioritarias.

Impacto UX:
- Reduce friccion sistemica y mejora aprendizaje del producto.

## FASE 3 - MEJORAS ESTETICAS Y DE MARCA

Prioridad:
- Alta, una vez resueltos los bloques estructurales.

Objetivo UX:
- Elevar el producto a una sensacion premium y memorable.

Tareas concretas:
- Afinar motion, transiciones y estados vacios.
- Reconciliar visualmente landings y app interior.
- Mejorar fotografia, uso de color y ritmo editorial.
- Elevar paginas corporativas y pantallas de estado.

Impacto UX:
- Mejora percepcion premium, diferenciacion y recuerdo de marca.

## 10. ESPECIFICACIONES PARA IMPLEMENTACION

Estas instrucciones estan pensadas para que otro modelo pueda ejecutar el rediseño directamente sobre el codigo actual.

### 10.1 Orden de implementacion recomendado

1. Sistema visual base
- Consolidar tokens en `frontend/src/index.css` y `frontend/tailwind.config.js`.
- Eliminar tipografias en conflicto.
- Definir variantes canonicas de boton, input, card, badge, tabs, drawer y sticky bars.

2. Navegacion global
- Refactorizar `frontend/src/components/Header.js`.
- Refactorizar `frontend/src/components/BottomNavBar.js`.
- Unificar reglas en `frontend/src/lib/navigation.js`.
- Reducir la necesidad de navegaciones especificas por layout.

3. Pantallas de conversion
- `frontend/src/components/ProductCard.js`
- `frontend/src/pages/ProductDetailPage.js`
- `frontend/src/pages/CartPage.js`
- `frontend/src/pages/RegisterPage.js`
- `frontend/src/pages/LoginPage.js`

4. Home, Discover y Marketplace
- `frontend/src/pages/HomePage.js`
- `frontend/src/components/feed/*`
- `frontend/src/pages/DiscoverPage.js`
- `frontend/src/pages/ProductsPage.js`
- `frontend/src/pages/StoresListPage.js`
- `frontend/src/pages/StorePage.js`

5. Dashboards y workspaces
- `frontend/src/components/dashboard/*`
- `frontend/src/pages/customer/*`
- `frontend/src/pages/producer/*`
- `frontend/src/pages/importer/*`
- `frontend/src/pages/influencer/*`
- `frontend/src/pages/b2b/*`

6. Backoffice y corporativo
- `frontend/src/pages/admin/*`
- `frontend/src/pages/super-admin/*`
- `frontend/src/pages/AboutPage.js`
- `frontend/src/pages/TermsPage.js`
- `frontend/src/pages/PrivacyPage.js`
- `frontend/src/pages/HelpPage.js`

### 10.2 Reglas duras para el rediseño

- No introducir nuevas familias tipograficas sin formalizarlas en el sistema.
- No usar mas de un CTA primario por viewport.
- No dejar mas de una barra horizontal scrolleable en la zona superior de una pantalla.
- No mezclar carrito y checkout en una sola vista extensa.
- No construir formularios largos sin stepper o agrupacion progresiva.
- No duplicar navegacion principal en header, bottom nav y layout local al mismo tiempo.
- No publicar strings sin normalizacion UTF-8.

### 10.3 Criterios de aceptacion UX/UI

- Toda funcion importante debe quedar a maximo 3 clics.
- Todo texto cuerpo en movil debe mantener legibilidad real y contraste AA.
- Todas las acciones tactiles deben tener target minimo de 44 px.
- Toda pantalla debe responder a una pregunta clara:
  - que estoy viendo;
  - que puedo hacer;
  - cual es la accion principal.
- El usuario debe reconocer inmediatamente si esta en:
  - contenido;
  - comercio;
  - cuenta;
  - workspace profesional;
  - backoffice.

### 10.4 Prioridad de archivos mas urgentes

- `frontend/src/index.css`
- `frontend/tailwind.config.js`
- `frontend/src/components/Header.js`
- `frontend/src/components/BottomNavBar.js`
- `frontend/src/components/ProductCard.js`
- `frontend/src/pages/ProductDetailPage.js`
- `frontend/src/pages/CartPage.js`
- `frontend/src/pages/RegisterPage.js`
- `frontend/src/components/feed/FeedContainer.js`
- `frontend/src/pages/DiscoverPage.js`
- `frontend/src/components/dashboard/ProducerLayoutResponsive.js`
- `frontend/src/pages/producer/ProducerProducts.js`
- `frontend/src/pages/influencer/InfluencerDashboard.js`

## 11. CONCLUSION FINAL

Hispaloshop no necesita "una capa de maquillaje". Necesita una simplificacion fuerte de arquitectura, una consolidacion del sistema visual y una redefinicion de jerarquia en las pantallas clave.

La buena noticia es que ya existe materia prima valiosa:
- landings con buena direccion editorial;
- varias pantallas mobile-first con base util;
- una propuesta de producto diferenciada;
- y una plataforma suficientemente rica como para justificar un rediseño serio.

La prioridad correcta es:
- primero claridad;
- despues coherencia;
- despues belleza.

Si se ejecuta este plan en el orden propuesto, Hispaloshop puede pasar de una plataforma funcional pero irregular a un producto claramente premium, entendible y escalable.
