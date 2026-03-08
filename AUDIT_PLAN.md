# Plan de Auditoría Integral de Hispaloshop

## 1. Objetivo

El objetivo de esta auditoría es realizar una verificación completa y exhaustiva de la aplicación Hispaloshop para identificar y documentar todos los errores funcionales, vulnerabilidades de seguridad, problemas de rendimiento y defectos de UI/UX. La meta es asegurar que la plataforma funcione perfectamente desde la perspectiva de todos los roles de usuario.

## 2. Metodología

La auditoría se llevará a cabo de manera sistemática, cubriendo el frontend, el backend y la infraestructura subyacente. Se seguirá un enfoque de "caja negra" y "caja gris", probando la aplicación como lo haría un usuario final, pero con conocimiento de la arquitectura interna para guiar las pruebas.

---

## Fase 1: Preparación y Configuración del Entorno

**Objetivo:** Establecer un entorno de pruebas local y estable, poblado con datos de prueba relevantes.

1.  **Instalación del Backend:**
    *   [ ] Clonar el repositorio.
    *   [ ] Navegar al directorio `backend/`.
    *   [ ] Crear y activar un entorno virtual de Python.
    *   [ ] Instalar las dependencias de producción: `pip install -r requirements.txt`.
    *   [ ] Instalar las dependencias de desarrollo: `pip install -r dev-requirements.txt`.
    *   [ ] Configurar las variables de entorno creando un archivo `.env` a partir de `.env.example`.
    *   [ ] Asegurarse de que la base de datos MongoDB esté en funcionamiento y accesible.
    *   [ ] Ejecutar el servidor del backend y verificar que el endpoint `/health` devuelva un estado `ok`.

2.  **Instalación del Frontend:**
    *   [ ] Navegar al directorio `frontend/`.
    *   [ ] Instalar las dependencias de Node.js: `npm install`.
    *   [ ] Configurar las variables de entorno necesarias, si las hubiera (p. ej., `VITE_API_URL`).
    *   [ ] Ejecutar el servidor de desarrollo del frontend: `npm start` o `npm run dev`.
    *   [ ] Abrir la aplicación en un navegador y verificar que la página de inicio se cargue sin errores en la consola.

3.  **Población de la Base de Datos (Seeding):**
    *   [ ] Ejecutar los scripts de seeding disponibles en `backend/` para poblar la base de datos con datos de prueba. Priorizar:
        *   `seed_mongodb.py`: Para datos base.
        *   `seed_demo_data.py`: Para productos, usuarios y tiendas de demostración.
        *   `seed_multiseller.py`: Para asegurar un entorno con múltiples vendedores.
    *   [ ] Verificar que se hayan creado usuarios con diferentes roles (customer, producer, importer, admin, super_admin).
    *   [ ] Verificar que se hayan creado productos, categorías y tiendas.

---

## Fase 2: Auditoría del Frontend (UI/UX y Funcionalidad)

**Objetivo:** Probar cada componente visual y funcional de la aplicación desde el navegador.

### 2.1. Páginas Públicas (Sin Iniciar Sesión)

**1. Página de Inicio:**
*   [ ] **Imágenes:** Verificar que todas las imágenes (banners, logos, productos destacados) se carguen correctamente y no aparezcan rotas.
*   [ ] **Enlaces:** Hacer clic en cada enlace de la barra de navegación, footer y cuerpo de la página para asegurar que dirigen a la URL correcta.
*   [ ] **Búsqueda:** Probar la barra de búsqueda con términos relevantes y verificar que redirige a la página de resultados.
*   [ ] **Responsividad:** Comprobar el diseño en diferentes tamaños de pantalla (móvil, tablet, escritorio).

**2. Página de Listado de Productos (PLP) / Búsqueda:**
*   [ ] **Filtros:**
    *   [ ] Probar cada filtro individualmente (categoría, precio, país, certificaciones).
    *   [ ] Probar combinaciones de filtros.
    *   [ ] Probar filtros que no deberían devolver resultados.
*   [ ] **Ordenación:** Probar todas las opciones de ordenación (precio ascendente/descendente, popularidad, más nuevos).
*   [ ] **Paginación:** Navegar entre las páginas de resultados para asegurar que funciona correctamente.
*   [ ] **Imágenes de Producto:** Verificar que todas las imágenes en la cuadrícula de productos se carguen.
*   [ ] **Enlaces de Producto:** Hacer clic en varios productos para asegurar que llevan a la página de detalle correcta.

**3. Página de Detalle de Producto (PDP):**
*   [ ] **Galería de Imágenes:** Probar la galería de imágenes, incluyendo miniaturas y funcionalidad de zoom.
*   [ ] **Información del Producto:** Verificar que el nombre, descripción, precio, SKU, etc., se muestren correctamente.
*   [ ] **Variantes:** Si un producto tiene variantes (ej. sabor, tamaño), probar la selección de cada una y verificar si el precio o la imagen cambian como se espera.
*   [ ] **Botón "Añadir al Carrito":** Probar su funcionalidad. Verificar que el ícono del carrito se actualice.
*   [ ] **Secciones Relacionadas:** Comprobar que las secciones como "Productos relacionados" o "También te puede interesar" carguen productos relevantes.

**4. Flujo de Autenticación:**
*   [ ] **Página de Registro:**
    *   [ ] Intentar registrar un nuevo usuario con datos válidos.
    *   [ ] **Verificación de Correo:** Completar el flujo de verificación de correo electrónico.
    *   [ ] Probar validaciones de formulario (contraseña débil, email inválido, campos vacíos).
    *   [ ] Intentar registrar un correo que ya existe.
    *   [ ] **Registro con Google:** Probar el botón de registro con Google y completar el flujo.
*   [ ] **Página de Inicio de Sesión:**
    *   [ ] Iniciar sesión con credenciales válidas (email/contraseña).
    *   [ ] Iniciar sesión con credenciales inválidas.
    *   [ ] **Inicio de Sesión con Google:** Probar el botón de inicio de sesión con Google para un usuario ya registrado.
*   [ ] **Flujo de Recuperación de Contraseña:**
    *   [ ] Probar el enlace "¿Olvidaste tu contraseña?".
    *   [ ] Solicitar el correo de recuperación y seguir el enlace.
    *   [ ] Restablecer la contraseña e intentar iniciar sesión con la nueva.

### 2.2. Páginas Autenticadas (Por Rol)

**1. Rol: Cliente (Customer):**
*   [ ] **Mi Cuenta:**
    *   [ ] Verificar que se pueda ver y editar la información del perfil.
    *   [ ] Cambiar la contraseña.
*   [ ] **Carrito de Compras:**
    *   [ ] Añadir productos al carrito desde la PDP y la PLP.
    *   [ ] Cambiar la cantidad de un producto.
    *   [ ] Eliminar un producto del carrito.
    *   [ ] Verificar que el subtotal y el total se calculen correctamente.
*   [ ] **Checkout:**
    *   [ ] Completar el flujo de checkout desde el carrito hasta la página de confirmación.
    *   [ ] Probar el formulario de dirección de envío.
    *   [ ] Probar la selección de método de pago (simular si es posible).
*   [ ] **Historial de Pedidos:** Verificar que los pedidos realizados aparezcan en el historial con el estado correcto.
*   [ ] **Wishlist:** Probar añadir y eliminar productos de la lista de deseos.

**2. Rol: Vendedor (Producer / Importer):**
*   [ ] **Panel de Control (Dashboard):** Verificar que las estadísticas (ventas, pedidos) se muestren correctamente.
*   [ ] **Gestión de Productos:**
    *   [ ] Crear un nuevo producto, subiendo imágenes y rellenando todos los campos.
    *   [ ] Editar un producto existente.
    *   [ ] Eliminar un producto.
*   [ ] **Gestión de Pedidos:** Verificar que el vendedor pueda ver y gestionar los pedidos de sus productos.

**3. Rol: Administrador (Admin / Superadmin):**
*   [ ] **Panel de Administración:**
    *   [ ] **Gestión de Usuarios:** Probar la aprobación, baneo y eliminación de usuarios.
    *   [ ] **Gestión de Productos:** Probar la aprobación y rechazo de productos subidos por vendedores.
    *   [ ] **Auditoría y Moderación:** Revisar las secciones de auditoría para asegurar que los registros se creen correctamente.

---

## Fase 3: Auditoría del Backend y API

**Objetivo:** Asegurar que la API sea robusta, segura y funcione como se espera.

1.  **Seguridad de Endpoints:**
    *   [ ] Para cada endpoint que requiera autenticación, intentar acceder sin un token de sesión y verificar que se reciba un error `401 Unauthorized`.
    *   [ ] Intentar acceder a endpoints de administrador con un token de sesión de un cliente y verificar que se reciba un error `403 Forbidden`.

2.  **Validación de Entradas:**
    *   [ ] Para endpoints `POST` y `PUT` (ej. crear producto, registrar usuario), enviar datos con formato incorrecto (ej. un string en lugar de un número para el precio) y verificar que se reciban errores `422 Unprocessable Entity`.
    *   [ ] Enviar campos requeridos como nulos o vacíos.
    *   [ ] Intentar ataques básicos de inyección NoSQL en parámetros de consulta (ej. `?search[$gt]=` ) y verificar que la aplicación no falle.

3.  **Lógica de Negocio:**
    *   [ ] Después de cada operación de escritura (crear, actualizar, eliminar), consultar la base de datos directamente para verificar que los datos se hayan escrito correctamente.
    *   [ ] Probar la lógica de negocio compleja, como el cálculo de comisiones para influencers o la división de pagos en el checkout.

---

## Fase 4: Pruebas No Funcionales

**Objetivo:** Identificar problemas de rendimiento y verificar correcciones de seguridad.

1.  **Rendimiento:**
    *   [ ] Utilizar las herramientas de desarrollador del navegador (pestaña Network) para identificar páginas y recursos (imágenes, JS, CSS) que tarden mucho en cargar.
    *   [ ] Prestar especial atención a la página de listado de productos con múltiples filtros activados.
    *   [ ] Medir el tiempo de respuesta de los endpoints de la API más complejos.

2.  **Seguridad:**
    *   [ ] Confirmar que la cookie `session_token` ahora se establece con el flag `HttpOnly`.
    *   [ ] Confirmar que el flujo de Google OAuth ahora utiliza y valida el parámetro `state` para prevenir ataques CSRF.
    *   [ ] Revisar las respuestas de los endpoints `/health` para asegurar que ya no exponen información sensible.

---

## Fase 5: Informe de Errores

**Objetivo:** Documentar cada error encontrado de manera clara y concisa.

Para cada error, se creará un informe con la siguiente estructura:

*   **Título:** Un resumen claro del problema (ej. "El filtro de precio no funciona para valores decimales").
*   **ID del Error:** Un identificador único (ej. `FE-001` para frontend, `BE-001` para backend).
*   **Severidad:** Crítica, Alta, Media, Baja.
*   **Ubicación:** La URL de la página, el nombre del componente o el endpoint de la API.
*   **Pasos para Reproducir:**
    1.  ...
    2.  ...
    3.  ...
*   **Resultado Esperado:** Lo que debería haber sucedido.
*   **Resultado Actual:** Lo que sucedió en realidad.
*   **Capturas de Pantalla/Logs:** (Adjuntar si es posible) Imágenes, videos o logs de la consola que demuestren el error.