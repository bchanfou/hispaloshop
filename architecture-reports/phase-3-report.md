# Phase 3 Report

## 1. Resumen de cambios realizados

Se refactorizo `frontend/src/pages/CartPage.js` para extraer la logica remota fuera de la pagina sin modificar `CartContext`.

Cambios principales:

- se elimino `axios` y `API` directos de `CartPage.js`
- se crearon hooks de dominio en `frontend/src/features/cart/hooks`
- se ampliaron las queries oficiales de `frontend/src/features/cart/queries/useCartQueries.js`
- el checkout de Stripe ahora envia `origin` en el body y no como header prohibido
- se endurecio la validacion de checkout para requerir direccion guardada antes de continuar
- se elimino el export muerto `useCreateCheckout` que apuntaba a una ruta backend ya retirada
- `CartPage` mantiene solo estado local de UI y formularios
- `CartContext` sigue siendo la fuente operativa para `cartItems`, `removeFromCart`, `applyDiscount` y `removeDiscount`

## 2. Archivos modificados

- `frontend/src/pages/CartPage.js`
- `frontend/src/features/cart/queries/useCartQueries.js`
- `frontend/src/features/cart/hooks/useCartPricing.js`
- `frontend/src/features/cart/hooks/useCartAddresses.js`
- `frontend/src/features/cart/hooks/useCartVerification.js`
- `architecture-reports/phase-3-report.md`

## 3. Archivos creados

- `frontend/src/features/cart/hooks/index.js`
- `frontend/src/features/cart/hooks/useCartPricing.js`
- `frontend/src/features/cart/hooks/useCartAddresses.js`
- `frontend/src/features/cart/hooks/useCartVerification.js`
- `frontend/src/features/cart/hooks/useCartCheckout.js`

## 4. Archivos eliminados

- ninguno

## 5. Problemas detectados

- `CartContext` sigue acoplando datos y mutaciones del carrito; esta fase no lo toca por restriccion explicita
- el checkout sigue usando `window.location.href` para redireccion a Stripe; no se cambio porque pertenece a una fase posterior de limpieza final
- no fue posible validar manualmente en navegador los flujos de carrito, descuentos, direccion y checkout desde este entorno CLI
- `CartPage` todavia conserva un componente monolitico; en esta fase solo se movio la logica remota, no la division de JSX
- `useCartPricing` sigue provocando un segundo GET a `/cart` ademas del fetch que vive en `CartContext`; es deuda aceptada para evitar duplicar ownership del estado

## 6. Decisiones tecnicas tomadas

- no se uso React Query como fuente de verdad de `cartItems` para evitar duplicar estado entre cache y `CartContext`
- la query de pricing proyecta solo resumen y stock issues desde `/cart`; no expone `items` para no competir con `CartContext`
- descuentos y borrado de items siguen pasando por `CartContext`, con `refetch` explicito del resumen despues de cada mutacion
- direcciones, verificacion de email y creacion de checkout se movieron a hooks de dominio basados en las queries oficiales
- las queries autenticadas ahora se habilitan solo cuando existe `user`
- la mutacion de Stripe usa body JSON para `origin`, evitando depender de un header bloqueado por el navegador
- el checkout ya no puede avanzar si el formulario de nueva direccion esta abierto pero aun no existe una direccion persistida

## 7. Posibles regresiones

- si `CartContext` y el backend divergen temporalmente despues de una mutacion, el resumen puede tardar un refetch en reflejar el nuevo estado
- el formulario de direcciones depende de la carga inicial de direcciones; conviene validarlo en navegador con usuarios con y sin direcciones guardadas
- el flujo de checkout requiere verificar en navegador que la URL devuelta por `/payments/create-checkout` sigue llegando con la misma forma esperada
- `emailVerified` puede permanecer en `null` durante la carga inicial y bloquear brevemente el checkout hasta que resuelva la query

## 8. Cambios en arquitectura

- se consolido el patron `features/cart/queries` + `features/cart/hooks` para `CartPage`
- `CartPage` ya no contiene llamadas HTTP directas
- se mantuvo deliberadamente una arquitectura hibrida temporal:
  - datos operativos del carrito en `CartContext`
  - datos auxiliares de checkout en React Query

## 9. Tests manuales sugeridos

- abrir `CartPage` con usuario autenticado y confirmar carga de items existente
- eliminar un item y verificar sincronizacion entre `CartPage` y mini cart
- aplicar y quitar descuento
- abrir usuario sin direcciones guardadas y confirmar que aparece el formulario nuevo
- abrir usuario con direcciones guardadas y confirmar seleccion automatica de la predeterminada
- guardar una direccion nueva y confirmar que queda disponible para checkout
- verificar email con token valido e invalido
- reenviar codigo de verificacion
- iniciar checkout con direccion seleccionada y confirmar redireccion a Stripe
- validar caso con stock insuficiente

## 10. Lista de archivos pendientes para siguiente fase

- `frontend/src/context/CartContext.js`
- `frontend/src/pages/CartPage.js`
- `frontend/src/pages/UserProfilePage.js`
- `frontend/src/pages/influencer/InfluencerDashboard.js`
- `frontend/src/pages/producer/ProducerProducts.js`
- `frontend/src/components/InternalChat.js`

## Verificacion

- `npm --prefix frontend run build` paso correctamente el 2026-03-11
