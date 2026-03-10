# AUDITORÍA UX / UI / NARRATIVA — HISPALOSHOP

Fecha: 2026-03-10

## 0. Alcance y método

Esta auditoría se ha realizado sobre el frontend actual del repositorio, con foco en:

- diseño visual
- jerarquía de información
- consistencia UI
- navegación
- legibilidad
- microcopy
- gramática española
- uso de acentos y letra ñ
- coherencia de storytelling

Base revisada:

- `frontend/src/App.js`
- `frontend/src/index.css`
- `frontend/tailwind.config.js`
- `frontend/src/components/Header.js`
- `frontend/src/components/BottomNavBar.js`
- `frontend/src/components/feed/*`
- `frontend/src/components/AIAssistant.js`
- `frontend/src/components/InternalChat.js`
- `frontend/src/components/ProductCard.js`
- `frontend/src/config/categories.js`
- `frontend/src/pages/HomePage.js`
- `frontend/src/pages/DiscoverPage.js`
- `frontend/src/pages/ProductDetailPage.js`
- `frontend/src/pages/CartPage.js`
- `frontend/src/pages/UserProfilePage.js`
- `frontend/src/pages/landings/QueEsPage.js`
- `frontend/src/pages/AboutPage.js`
- `frontend/src/pages/producer/Landing.jsx`
- `frontend/src/pages/importer/Landing.jsx`
- `frontend/src/pages/influencer/Landing.jsx`
- `frontend/src/locales/es.json`
- componentes de onboarding, B2B, categorías, stories, reels y dashboards por rol

Evidencia estructural relevante:

- `frontend/src/App.js` contiene 151 declaraciones `Route path` en 472 líneas.
- Existen vistas monolíticas muy grandes:
  - `frontend/src/pages/ProductDetailPage.js` -> 1044 líneas
  - `frontend/src/pages/CartPage.js` -> 778 líneas
  - `frontend/src/pages/producer/ProducerProducts.js` -> 1218 líneas
  - `frontend/src/pages/influencer/InfluencerDashboard.js` -> 834 líneas
  - `frontend/src/components/InternalChat.js` -> 1302 líneas
  - `frontend/src/pages/UserProfilePage.js` -> 718 líneas
- Hay al menos 21 incidencias claras de mojibake en 5 archivos fuente y decenas de strings degradados en `frontend/src/locales/es.json`.
- Hay 15 referencias activas a alcohol en `frontend/src`, incluyendo categorías, onboarding, demo data, IA y formularios.

Limitación metodológica:

- El análisis es de código y contenido, no de sesión visual real con navegador ni de datos de uso.
- Aun así, la evidencia actual es suficiente para orientar un rediseño senior completo.

## 1. Diagnóstico general

Hispaloshop tiene una tesis de producto muy potente: convertir un marketplace alimentario en una plataforma social donde productores, importadores, creadores y consumidores se encuentren alrededor del origen del alimento.

El problema no es la ambición. El problema es que la experiencia actual no la ordena.

Hoy el producto se siente como la suma de cuatro sistemas distintos:

1. unas landings emocionales y editoriales
2. una app principal tipo feed/discovery
3. varios dashboards operativos por rol
4. una capa de IA y chat que vive en paralelo

Eso rompe la percepción de producto premium. En vez de transmitir “esto está hecho con cuidado”, transmite “aquí han convivido varias direcciones a la vez”.

### Veredicto

Estado actual: prometedor, pero todavía lejos del nivel de claridad, intención y coherencia que tendría un producto comparable a Instagram, Apple o Airbnb.

### Lo mejor que ya existe

- La historia fundacional sí tiene fuerza real.
- La mezcla social + comercio sí tiene una propuesta diferencial.
- Hay una base cromática cálida y artesanal que puede funcionar.
- Existen patrones mobile-first en varias pantallas.
- El producto ya tiene suficiente amplitud funcional como para soportar una experiencia premium.

### Lo que hoy impide la sensación de calidad

- navegación fragmentada
- sistema visual inconsistente
- texto roto o degradado
- taxonomía de categorías incoherente
- storytelling duplicado y a veces excesivamente dramático
- demasiada densidad en pantallas clave
- separación artificial entre producto principal y paneles profesionales

## 2. Resumen ejecutivo para rediseño

Si el objetivo es preservar la arquitectura tipo Instagram, el rediseño no debe cambiar la espina dorsal:

- Home / Feed
- Explorar
- Crear
- Chats
- Perfil

Lo que sí debe cambiar de forma radical es todo lo que cuelga de esa espina dorsal.

### Decisión principal de arquitectura

Los paneles profesionales deben dejar de sentirse como subproductos separados y pasar a vivir dentro de `Perfil`.

Dirección correcta:

- `Perfil` como centro de identidad y operación
- módulos profesionales como subnavegación interna del perfil
- mismo shell, mismos componentes base, mismo lenguaje visual

### Prioridades P0

1. Limpiar contenido roto, acentos, ñ y mezcla de idiomas.
2. Unificar el sistema visual.
3. Reordenar navegación y reducir duplicidad de shells.
4. Eliminar alcohol de categorías, onboarding, demo data y prompts.
5. Rediseñar Home, Explorar, Perfil, Producto y Chat como núcleo.

## 3. Hallazgos críticos

## 3.1 P0 — Navegación fragmentada

La plataforma no tiene una sola columna vertebral.

Evidencia:

- `frontend/src/components/BottomNavBar.js` oculta la navegación principal en numerosos contextos mediante `HIDDEN_ON_PREFIXES`.
- `frontend/src/components/BottomNavBar.js` mezcla perfil y dashboard dentro del mismo slot de navegación.
- `frontend/src/components/Header.js:141` muestra que el menú hamburguesa contiene esencialmente `LocaleSelector`, no una navegación principal real.
- `frontend/src/components/feed/FeedContainer.js:47` y `frontend/src/components/feed/FeedContainer.js:50` apilan `LandingNavPills` y `StoriesCarousel` antes del feed.
- `frontend/src/App.js` contiene 151 rutas, alias y redirecciones, síntoma de crecimiento por agregación y no por consolidación.

Impacto:

- el usuario cambia de modelo mental según la pantalla
- la navegación principal deja de ser fiable
- la app parece compuesta por varias apps

## 3.2 P0 — El sistema visual no tiene una única fuente de verdad

Evidencia:

- `frontend/src/index.css:2` define “Playfair Display + Inter”.
- `frontend/src/index.css:145` aplica `Cinzel` a todos los headings.
- `frontend/tailwind.config.js:16` mantiene `Playfair Display`.
- `frontend/src/pages/influencer/InfluencerDashboard.js` usa `font-display`, pero esa familia no está claramente gobernada.
- `frontend/src/index.css:48` y `frontend/src/index.css:101` redefinen `--color-success` con dos valores distintos.

Impacto:

- la tipografía no construye una marca consistente
- los componentes no tienen un comportamiento predecible
- se pierde autoridad visual

## 3.3 P0 — Calidad textual insuficiente para generar confianza

Evidencia:

- `frontend/src/components/ProductCard.js` contiene moneda y separadores corruptos.
- `frontend/src/components/feed/LandingNavPills.js` muestra `¿Qué es Hispaloshop?` roto.
- `frontend/src/locales/es.json` contiene decenas de entradas sin tildes, sin ñ o con caracteres dañados.
- `frontend/src/components/AIAssistant.js` mezcla español e inglés en chips y CTAs.

Impacto:

- baja credibilidad de marca
- sensación de producto inacabado
- peor comprensión
- peor conversión

## 3.4 P0 — La taxonomía de categorías contradice el posicionamiento

Evidencia:

- `frontend/src/config/categories.js:79-88` mantiene `vinos-bebidas`.
- `frontend/src/components/CategoryNav.js:24` describe la categoría como “Vinos, kombuchas y bebidas de autor”.
- `frontend/src/components/onboarding/InterestsStep.jsx:18-19` incluye `Vinos` y `Cervezas`.
- `frontend/src/components/onboarding/StepInterests.jsx:17` incluye `Vinos`.
- `frontend/src/components/chat/useHIChat.js:167` propone “Queso + vino tinto”.
- `frontend/src/components/b2b/ImporterProfileForm.js:22` sugiere “Especializaciones (vino, aceite)”.
- `frontend/src/data/demoData.js` contiene productos y assets de vino.

Impacto:

- contradicción directa con la estrategia solicitada
- señal de marca ambigua
- ruido en discovery y onboarding

## 3.5 P1 — La promesa emocional no coincide con la experiencia de producto

Las landings son más editoriales y más humanas que la app principal.

Evidencia:

- `frontend/src/pages/producer/Landing.jsx` usa un lenguaje cálido y artesanal.
- `frontend/src/pages/influencer/Landing.jsx` adopta una estética neón y una narrativa más agresiva.
- `frontend/src/pages/importer/Landing.jsx` empuja un tono oscuro, casi de survival story.
- `frontend/src/pages/HomePage.js` reduce todo eso a `Header + Feed + botón flotante + Footer`.

Impacto:

- la captación promete una experiencia emocionalmente rica
- el producto operativo entrega una experiencia funcional pero fragmentada

## 4. Problemas de diseño

## 4.1 Color

Problema:

- Hay demasiadas direcciones cromáticas simultáneas.
- La app principal es piedra/beige/oliva.
- Influencer usa magenta índigo neón.
- Importador usa carbón + ámbar.
- Productor usa marrón/verde artesanal.
- Super-admin introduce morado de sistema.

Conclusión:

No parece una familia de vistas. Parecen marcas paralelas.

Recomendación:

- una sola base de neutros cálidos
- un acento principal de marca
- un acento secundario para acciones
- colores de estado estrictamente funcionales
- reservar estéticas especiales para campañas, no para todo un rol

## 4.2 Tipografía

Problema:

- hay tres discursos tipográficos compitiendo
- serif editorial
- serif distinta en headings globales
- usos ad hoc como `font-display`

Conclusión:

La marca no habla con una sola voz.

Recomendación:

- una serif editorial solo para marca, historia y titulares premium
- una sans de producto para UI, formularios, navegación y datos
- no más de dos familias activas
- escala tipográfica fija para todo el sistema

## 4.3 Espaciado y densidad

Problema:

- demasiados bloques compiten al mismo tiempo
- chips, tabs, stories, botones flotantes, badges, filtros, drawers y modales aparecen en cascada

Ejemplos:

- Home apila header, tab toggle, pills de landings, stories y feed.
- Discover apila buscador sticky, pestañas de sección, chips de categorías y luego bloques de contenido.
- Producto y carrito concentran demasiada información en una sola pantalla.

Conclusión:

El producto cansa antes de enamorar.

## 4.4 Iconografía

Problema:

- hay iconos consistentes de `lucide-react`, pero también emojis rotos en onboarding y señales gráficas sin sistema común

Ejemplos:

- `frontend/src/components/onboarding/InterestsStep.jsx`
- `frontend/src/components/onboarding/StepInterests.jsx`

Recomendación:

- eliminar emojis como UI de producción
- una sola librería, un solo grosor de trazo, un solo tamaño base por contexto

## 4.5 Contraste y accesibilidad

Riesgos observables:

- uso recurrente de texto muy pequeño
- badges de 9-10 px
- combinaciones suaves sobre fondos tenues
- icon-only navigation sin suficiente apoyo visual
- ausencia clara de reglas de foco y tamaños mínimos

Conclusión:

La experiencia no está gobernada por un estándar de accesibilidad duro.

## 5. Problemas de jerarquía de información

La mayoría de pantallas no dejan clara una sola respuesta a la pregunta “¿qué hago ahora?”.

### Home / Feed

Problema:

- antes del contenido hay demasiadas capas de orientación
- el feed no entra con protagonismo inmediato

### Explorar

Problema:

- mezcla búsqueda, secciones, chips, tendencias, productos, tiendas y recetas en la misma jerarquía

### Producto

Problema:

- demasiados módulos al mismo nivel
- la lectura comercial y la lectura editorial no están separadas

### Perfil

Problema:

- hay al menos dos ideas de perfil conviviendo: perfil social y panel operativo
- además existen implementaciones paralelas (`UserProfilePage.js` y `pages/profile/ProfilePage.js`)

### Chat

Problema:

- directorio, perfil comercial, conversación, notificaciones y media se mezclan en un monolito

## 6. Problemas de narrativa

La historia fundacional es valiosa, pero hoy está mal orquestada.

## 6.1 Lo que sí funciona

- Bil Chanfou, Alberto, Rebeca y los productores visitados aportan verdad.
- La historia tiene sacrificio, conflicto y una razón legítima para que exista Hispaloshop.
- La conexión entre creador, productor, importador y consumidor es clara.

## 6.2 Lo que no funciona

### a) Está fragmentada

La narrativa aparece en:

- `frontend/src/pages/landings/QueEsPage.js`
- `frontend/src/pages/AboutPage.js`
- `frontend/src/pages/producer/Landing.jsx`
- `frontend/src/pages/importer/Landing.jsx`
- `frontend/src/pages/influencer/Landing.jsx`

Pero no está gobernada por una misma versión breve, media y extensa.

### b) El tono se vuelve demasiado dramático

Ejemplos:

- `frontend/src/pages/influencer/Landing.jsx:232` -> “carne de cañón”
- `frontend/src/pages/influencer/Landing.jsx:411` -> “CPM de mierda”
- `frontend/src/pages/importer/Landing.jsx:201` -> “ruleta rusa”
- `frontend/src/pages/producer/Landing.jsx:246` -> “sin intermediarios que te roben el alma”

Problema:

- transmite rabia más que cuidado
- puede parecer manipulación emocional
- aleja la marca de una sofisticación premium

### c) La historia eclipsa al producto

En varias landings la narración ocupa más peso que la explicación concreta del sistema.

La historia debe probar la necesidad del producto, no reemplazar la explicación del producto.

## 6.3 Dirección narrativa correcta

La narrativa fundacional debe condensarse en una sola columna vertebral:

> Hispaloshop existe para que los productores honestos no sean invisibles, para que los influencers no tengan que vender algo en lo que no creen, para que los importadores puedan validar productos auténticos y para que los consumidores entiendan qué están comprando.

### Cómo integrarla

#### Qué es Hispaloshop

Objetivo:

- presentar la misión del sistema
- explicar qué une a los cuatro actores
- usar al fundador como prueba de origen

#### Soy influencer

Objetivo:

- abrir con el conflicto del creador
- presentar a Alberto y Rebeca como arquetipos humanos
- mostrar que Hispaloshop es una salida digna, no una promesa agresiva

#### Soy productor

Objetivo:

- convertir la historia del fundador en empatía operativa
- demostrar que la plataforma entiende distribución, margen, stock y visibilidad

#### Soy importador

Objetivo:

- explicar riesgo y validación de mercado con sobriedad
- contar el fracaso del contenedor como aprendizaje, no como espectáculo

## 7. Problemas de microcopy

## 7.1 Tono inconsistente

Hoy conviven:

- tono editorial cálido
- tono marketplace funcional
- tono startup agresivo
- tono traducido literalmente
- tono IA en inglés

Eso rompe la identidad verbal.

## 7.2 Tono recomendado

Hispaloshop debe sonar:

- humano
- claro
- cercano
- sobrio
- artesanal
- preciso

Debe evitar:

- grandilocuencia
- jerga de growth
- dramatización excesiva
- inglés innecesario
- frases vacías tipo “revolucionamos”

## 7.3 Reglas de microcopy

1. Una pantalla, una intención principal.
2. CTA siempre alineado con la acción real.
3. Lenguaje directo, sin adornos aspiracionales donde no aporten.
4. No usar IA como excusa de complejidad.
5. El usuario debe entender siempre qué gana, qué pasa después y qué control tiene.

## 8. Errores gramaticales, acentos y ñ

El problema no es puntual. Es sistémico.

Tipos de error detectados:

- tildes omitidas
- ñ perdida
- caracteres corruptos
- símbolos de moneda rotos
- español mezclado con inglés
- copy funcional sin signos de apertura

### Ejemplos concretos detectados

| Ubicación | Texto actual | Corrección recomendada |
| --- | --- | --- |
| `frontend/src/locales/es.json:126` | `Que es Hispaloshop` | `Qué es Hispaloshop` |
| `frontend/src/locales/es.json:2170` | `Que estas pensando` | `¿Qué estás pensando?` |
| `frontend/src/locales/es.json:63` | `No disponible en tu region` | `No disponible en tu región` |
| `frontend/src/locales/es.json:129` | `Atribucion 18 meses � Retiro minimo 50�` | `Atribución durante 18 meses · Retiro mínimo: 50 €` |
| `frontend/src/locales/es.json:1765` | `Si un cliente compra �100...` | `Si un cliente compra 100 €, Hispaloshop retiene 18 € y tú recibes la comisión de tu nivel activo.` |
| `frontend/src/components/AIAssistant.js:23-28` | `Vegan`, `Gluten-free`, `No nuts` | `Vegano`, `Sin gluten`, `Sin frutos secos` |
| `frontend/src/components/AIAssistant.js:152` | `View Details` | `Ver producto` |
| `frontend/src/components/feed/LandingNavPills.js` | `¿Qué es Hispaloshop?` roto | corregir encoding y mantener `¿Qué es Hispaloshop?` |
| `frontend/src/components/b2b/ImporterProfileForm.js:22` | `Especializaciones (vino, aceite)` | `Especializaciones (aceites, conservas, kombucha, quesos...)` |
| `frontend/src/pages/landings/QueEsPage.js:212-215` | CTA `Explorar productos` lleva a `/register/new` | o cambia el destino a `/products`, o cambia el texto a `Crear cuenta` |
| `frontend/src/components/ProductCard.js` | moneda y envío corruptos | normalizar `€`, separadores y `envío` |
| `frontend/src/components/feed/HIFloatingButton.js` | `HI AI` | unificar nombre del asistente en todo el producto |

### Diagnóstico del locale español

`frontend/src/locales/es.json` necesita una revisión editorial completa. No basta con arreglar cinco claves.

Problemas visibles:

- `contrasea`
- `regin`
- `aprobacin`
- `sesin`
- `cdigo`
- `rea`
- `anlisis`
- `regstrate`
- `envio`
- `ultimos`

Conclusión:

El archivo debe pasar por una corrección de español completa, no por parches aislados.

## 9. Inconsistencias de UI

## 9.1 Home / Feed

Problema:

- `HomePage` incluye `Footer`, lo que debilita la sensación de app.
- `FeedContainer` apila demasiados elementos de navegación antes del contenido.
- `LandingNavPills` funciona como un parche para acceso a landings, no como parte orgánica del feed.

Dirección:

- Home debe priorizar contenido, stories y una capa mínima de contexto
- las landings deben vivir fuera del carril principal del feed

## 9.2 Discover / Search

Problema:

- mezcla taxonomías incompatibles en una sola fila:
  - producto (`Aceites`)
  - audiencia (`Bebés`)
  - estilo de vida (`Sin gluten`)
  - promoción (`Trending`)
  - formato (`Packs`)

Dirección:

- categorías de producto por un lado
- filtros de salud por otro
- estados de descubrimiento por otro

## 9.3 Product cards

Problemas:

- demasiadas señales a la vez
- texto muy pequeño
- shipping, rating, reviews, unidades vendidas y certificaciones compiten entre sí
- errores de encoding en moneda y separadores

Dirección:

- imagen
- nombre
- productor/origen
- precio
- una sola señal secundaria
- CTA clara

## 9.4 Botones y CTAs

Problemas:

- radios, tonos y pesos variables
- varias pantallas usan CTAs que prometen una cosa y hacen otra
- coexistencia de estilos ghost, outline y brand sin jerarquía estable

Dirección:

- primaria
- secundaria
- terciaria
- destructiva

Nada más.

## 9.5 Modales y overlays

Problemas:

- chat, crear, editor avanzado, onboarding y otros flujos aparecen como capas independientes
- no existe una gramática común de sheet, dialog y drawer

Dirección:

- una biblioteca de overlays con reglas de altura, ancho, padding, cierre y foco

## 9.6 Perfil

Problemas:

- duplicidad conceptual de perfil
- mezcla de social graph, tienda, configuración y dashboard
- no está resuelto como centro natural del producto

Dirección:

- perfil público arriba
- operación privada dentro de tabs/subtabs
- un mismo patrón para todos los roles

## 9.7 Chat

Problemas:

- `InternalChat.js` es un componente demasiado grande
- la conversación y el directorio están demasiado acoplados
- el chat se usa tanto como overlay en navegación como página dedicada

Dirección:

- lista
- hilo
- ficha contextual opcional

## 9.8 HI / IA

Problemas:

- `HI AI`, `Hispalo AI` y `Hispalo` conviven como nombres
- el botón flotante compite con la navegación principal
- hay sugerencias en inglés
- el asistente parece una capa añadida, no una función central del producto

Dirección:

- una sola identidad verbal
- integrarlo como conversación fijada en `Chats` o como asistente contextual dentro de `Explorar`
- quitar el protagonismo del botón flotante como patrón global

## 10. Problemas de navegación

La regla de “arquitectura tipo Instagram” se puede respetar sin conservar el caos actual.

## 10.1 Arquitectura recomendada

### Navegación principal fija

- Home
- Explorar
- Crear
- Chats
- Perfil

### Qué debe vivir dentro de Perfil

- resumen
- pedidos
- guardados
- tienda
- catálogo
- colaboraciones
- comisiones
- pagos
- ajustes

Según rol, cambia el contenido, no la arquitectura.

## 10.2 Traducción de la arquitectura actual a la futura

### Consumer

- Perfil
- Pedidos
- Guardados
- Preferencias
- Ajustes

### Productor

- Perfil público
- Tienda
- Catálogo
- Pedidos
- Pagos
- Ajustes

### Importador

- Perfil público
- Catálogo
- Mercados
- Pedidos
- Pagos
- Ajustes

### Influencer

- Perfil público
- Colaboraciones
- Código
- Comisiones
- Pagos
- Ajustes

## 10.3 Qué sobra hoy

- dashboards separados como experiencia paralela
- menús ocultos que solo muestran idioma
- footer completo en vistas que deberían comportarse como app
- landings metidas como pills dentro del feed
- rutas alias innecesarias como forma de compensar falta de consolidación

## 11. Auditoría específica de categorías

## 11.1 Qué debe eliminarse de inmediato

- vino
- cerveza
- licores
- bebidas alcohólicas

También deben desaparecer de:

- categorías
- onboarding
- demo data
- prompts de IA
- formularios B2B
- assets demo

## 11.2 Problema actual de taxonomía

Las categorías mezclan:

- familias de producto
- atributos saludables
- segmentos de usuario
- estados promocionales
- importación y origen

Eso complica la búsqueda y rompe la lógica mental del catálogo.

## 11.3 Taxonomía recomendada

### Categorías de producto

- Aceites
- Miel
- Conservas
- Panadería
- Quesos
- Embutidos
- Salsas
- Cremas untables
- Pasta
- Arroz
- Legumbres
- Especias
- Frutos secos
- Semillas
- Superfoods

### Bebidas sin alcohol

- Kombucha
- Zumos naturales
- Bebidas vegetales
- Tés
- Infusiones
- Café

### Especiales

- Bebé
- Mascotas
- Fitness

### Filtros de salud

- Sin gluten
- Vegano
- Ecológico
- Sin azúcar
- Proteico

### Filtros operativos recomendados

- Disponible en mi país
- Nuevo
- Más vendido
- Refrigerado
- Regalo

Regla clave:

Los filtros de salud no deben competir visualmente como si fueran categorías de producto.

## 12. Propuesta de storytelling por página

## 12.1 Qué es Hispaloshop

Debe responder en este orden:

1. qué problema resuelve
2. para quién existe
3. por qué nació
4. cómo funciona
5. qué hace diferente a la plataforma

No debe abrir con demasiadas capas de producto, mercados y claims al mismo tiempo.

## 12.2 Soy influencer

Debe sonar así:

- honesto
- digno
- ambicioso
- sin cinismo

Debe bajar de intensidad verbal y subir en claridad.

Mensaje recomendado:

> Monetiza con productos que sí te representan. Construye ingresos recurrentes sin traicionar tu criterio ni saturar a tu comunidad.

## 12.3 Soy productor

Mensaje recomendado:

> Tu producto no necesita más ruido. Necesita contexto, visibilidad y una infraestructura que te permita vender con dignidad.

## 12.4 Soy importador

Mensaje recomendado:

> Valida demanda, construye canal y vende producto auténtico sin quedarte solo ante el riesgo.

## 13. Recomendaciones visuales

## 13.1 Dirección estética

La app debe sentirse:

- cálida
- sobria
- precisa
- humana
- artesanal

No debe sentirse:

- corporativa genérica
- startup agresiva
- dashboard fría
- demo tecnológica

## 13.2 Principios visuales

### Color

- neutros cálidos como base
- oliva o terracota como acento principal
- un color de apoyo para acciones
- estados funcionales discretos

### Tipografía

- una serif editorial para historia y marca
- una sans para producto
- nada de tercera familia sin justificación

### Espaciado

- sistema 8 px
- padding consistente por familias de componente
- menos cajas dentro de cajas

### Superficies

- menos bordes
- más jerarquía por espacio, tamaño y contraste
- sombras muy medidas

### Fotografía

- productores reales
- producto real
- origen real

Evitar:

- stock demasiado genérico
- imágenes de lifestyle que no aportan trazabilidad

### Motion

- sutil
- funcional
- con intención

Evitar:

- pulsos constantes
- animaciones que compiten con el contenido

## 14. Propuestas de rediseño por componente

## 14.1 Product cards

Rediseño recomendado:

- foto dominante
- nombre en 2 líneas máximo
- productor y origen
- precio
- un estado secundario
- CTA discreta

Eliminar:

- exceso de badges
- shipping redundante
- texto diminuto
- señales duplicadas de confianza

## 14.2 Category chips

Rediseño recomendado:

- menos chips
- una sola lógica
- menos color por chip
- foco en legibilidad y selección clara

## 14.3 Botones

Sistema recomendado:

- primario sólido
- secundario outline
- terciario texto
- destructivo

Los verbos deben ser claros:

- Explorar
- Guardar
- Seguir
- Escribir
- Ver producto
- Añadir
- Comprar

## 14.4 Feed

Rediseño recomendado:

- stories
- selector `Para ti / Siguiendo`
- feed

No más capas permanentes delante del contenido.

## 14.5 Reels

Diagnóstico:

- existen componentes de reels, pero la experiencia no se presenta como un sistema claro
- `frontend/src/App.js:457` redirige `/reels` a `discover?tab=feeds`

Recomendación:

- o se integra como bloque claro dentro de Home/Explorar
- o se elimina la ficción de que es una superficie autónoma

## 14.6 Stories

Diagnóstico:

- visualmente funcionan como patrón reconocido
- pero hoy compiten con demasiadas capas de navegación

Recomendación:

- dejarlas como acceso social de primer nivel dentro de Home
- no usarlas para suplir falta de arquitectura

## 14.7 Perfil

Rediseño recomendado:

- cabecera pública limpia
- métricas esenciales
- tabs estables
- módulos privados en capas internas

## 14.8 Search / Discover

Rediseño recomendado:

- búsqueda como protagonista
- resultados unificados
- filtros claros
- categorías serias
- módulos editoriales secundarios, no dominantes

## 14.9 Chat

Rediseño recomendado:

- lista de conversaciones
- conversación
- panel contextual opcional

Con HI integrado como conversación oficial.

## 14.10 HI

Rediseño recomendado:

- nombre unificado
- voz humana
- español impecable
- menos “bot”, más “asistente”
- sugerencias alineadas con la taxonomía saludable

## 15. Backlog editorial inmediato

## P0

- corregir encoding roto en frontend
- revisar `frontend/src/locales/es.json` completo
- eliminar alcohol de categorías y contenido
- unificar nombre del asistente
- arreglar CTAs con destino incorrecto
- corregir signos de apertura, tildes y ñ

## P1

- reescribir microcopy de home, explore, producto y chat
- reducir dramatización de landings
- crear glosario verbal de marca
- normalizar nombres de roles y paneles

## P2

- revisar tono de empty states
- revisar textos de ayuda
- revisar feedback de errores y success states

## 16. Roadmap de rediseño recomendado

### Fase 1 — Contenido y sistema base

- corregir español, encoding y nombre de componentes
- cerrar taxonomía de categorías
- definir sistema visual definitivo

### Fase 2 — Shell principal

- Home
- Explorar
- Crear
- Chats
- Perfil

### Fase 3 — Núcleo comercial

- producto
- carrito
- checkout
- perfil tienda

### Fase 4 — Módulos profesionales dentro de perfil

- productor
- importador
- influencer

### Fase 5 — IA, chat y QA editorial

- HI integrado
- chat simplificado
- QA lingüístico final
- QA de accesibilidad

## 17. Conclusión

Hispaloshop ya tiene algo que no se puede fabricar fácilmente: una razón legítima para existir.

Lo que le falta no es más funcionalidad. Le falta edición.

Le falta:

- una sola arquitectura
- una sola voz
- una sola jerarquía
- una sola taxonomía
- una sola marca visual

Si el rediseño se apoya en estas decisiones, la plataforma puede pasar de “ambiciosa pero irregular” a “producto cuidado, creíble y deseable”.

La meta correcta no es que todo se vea más bonito.

La meta correcta es que cada pantalla haga sentir:

> Esto está hecho con cuidado.
