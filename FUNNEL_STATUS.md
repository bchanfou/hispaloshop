# Estado del Funnel MVP - 2026-03-07

## Checklist End-to-End

### Autenticación
- [x] Registro de customer - ENDPOINT EXISTE
- [x] Login de customer - ENDPOINT EXISTE  
- [x] Registro de producer - ENDPOINT EXISTE
- [x] Login de producer - ENDPOINT EXISTE

### Productos
- [x] Producer puede crear producto - ENDPOINT EXISTE
- [x] Producto aparece en listing - ENDPOINT EXISTE
- [x] Customer puede ver detalle de producto - ENDPOINT EXISTE

### Carrito
- [x] Customer puede añadir a carrito - ENDPOINT EXISTE
- [x] Customer puede ver carrito - ENDPOINT EXISTE
- [ ] Carrito persiste tras recargar - PENDIENTE TEST

### Checkout
- [x] Checkout crea PaymentIntent - ENDPOINT EXISTE
- [ ] Stripe payment funciona (test card) - PENDIENTE CONFIGURAR STRIPE
- [ ] Webhook recibe payment_intent.succeeded - PENDIENTE CONFIGURAR WEBHOOK

### Órdenes
- [x] Orden se crea en MongoDB - LÓGICA IMPLEMENTADA
- [x] Customer ve orden en /orders - ENDPOINT EXISTE
- [x] Producer ve orden en dashboard - ENDPOINT EXISTE

## Verificación de Endpoints

### Rutas Registradas en Backend
```
✅ /api/auth/register
✅ /api/auth/login
✅ /api/auth/me
✅ /api/products
✅ /api/cart
✅ /api/cart/add
✅ /api/orders
✅ /api/checkout
✅ /api/webhooks/stripe
✅ /health
```

### Archivos de Rutas Presentes
- ✅ auth.py - Autenticación
- ✅ products.py - Productos
- ✅ cart.py - Carrito
- ✅ orders.py - Órdenes
- ✅ stores.py - Tiendas
- ✅ producer.py - Dashboard productor
- ✅ customer.py - Dashboard customer
- ✅ webhooks.py - Stripe webhooks

## Estado del Backend

### Configuración
- ✅ Variables de entorno configuradas (.env)
- ✅ JWT_SECRET validado
- ✅ CORS restringido
- ✅ Stack MongoDB activo (PostgreSQL preservado)
- ⚠️ MongoDB debe estar corriendo localmente o en cloud

### Para Ejecutar el Backend

```bash
cd backend

# Instalar dependencias (si no están instaladas)
pip install -r requirements.txt

# Verificar MongoDB esté corriendo
# Local: mongod --dbpath /ruta/a/db
# O usar MongoDB Atlas

# Ejecutar backend
uvicorn main:app --reload --port 8000
```

### Variables de Entorno Requeridas
```bash
export JWT_SECRET="tu_secreto_jwt_aqui"
export MONGO_URL="mongodb://localhost:27017/hispaloshop"
export STRIPE_SECRET_KEY="sk_test_..."
export STRIPE_WEBHOOK_SECRET="whsec_..."
```

## Frontend - Hooks Creados

### Hooks de API (SWR)
- ✅ useProducts.ts - Listar/obtener productos
- ✅ useProduct.ts - Detalle de producto
- ✅ useAuth.ts - Login/register/user
- ✅ useCart.ts - Carrito (get/add/remove/update)
- ✅ useOrders.ts - Órdenes (list/get/create)
- ✅ useStores.ts - Tiendas (list/get)
- ✅ useUser.ts - Perfiles de usuario
- ✅ useFeed.ts - Feed social

### Componentes de Estado
- ✅ LoadingState.tsx - Skeletons para carga
- ✅ ErrorState.tsx - Manejo de errores
- ✅ EmptyState.tsx - Estados vacíos

## Datos Mock Eliminados

### Archivos Modificados
- ✅ featureFlags.js - DEMO_MODE=false por defecto
- ✅ ProductsPage.js - Sin demoProducts
- ✅ HomePage.js - Sin demoProducts/demoPosts
- ✅ StorePage.js - Sin demoStores/demoProducts
- ✅ SocialFeed.js - Sin demoPosts
- ✅ DiscoverPage.js - Sin demoPosts/demoReels
- ✅ ProductorLandingPage.js - Sin demoStores/demoUsers
- ✅ StoresListPage.js - Sin demoStores
- ✅ UserProfilePage.js - Sin demoUsers/demoPosts

## Próximos Pasos para Validar Funnel

### 0. Verificar Configuración
```bash
cd backend
python verify_setup.py
# Debe mostrar [PASS] en todas las categorías
```

### 1. Crear Datos Semilla
```bash
cd backend
python seed_mongodb.py
# Crea usuarios de prueba y productos
```

### 2. Iniciar Backend
```bash
cd backend
python -m uvicorn main:app --reload
```

### 2. Ejecutar Tests
```bash
python test_funnel.py
```

### 3. Tests Manuales con curl
```bash
# Health
curl http://localhost:8000/health

# Registro
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@mvp.com","password":"Test1234","full_name":"Test","role":"customer"}'

# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@mvp.com","password":"Test1234"}'
```

### 4. Test Frontend
```bash
cd frontend
npm start
# Navegar a http://localhost:3000
```

## Configuración Stripe (para checkout)

### Claves de Test
- Publicable: `pk_test_...`
- Secreta: `sk_test_...`
- Webhook: `whsec_...`

### Tarjeta de Test
- Número: `4242 4242 4242 4242`
- Fecha: Cualquiera futura
- CVC: Cualquiera 3 dígitos

### Webhook Local (con Stripe CLI)
```bash
stripe listen --forward-to localhost:8000/api/webhooks/stripe
```

## Resumen

✅ **BACKEND LISTO** - Todos los endpoints críticos existen y están registrados
✅ **FRONTEND LISTO** - Hooks creados, datos mock eliminados
⚠️ **PENDIENTE** - Ejecutar backend y probar funnel completo
⚠️ **PENDIENTE** - Configurar claves Stripe para checkout
⚠️ **PENDIENTE** - Verificar MongoDB tiene datos de prueba

## Notas

- Fecha de preparación: 2026-03-07
- Stack activo: MongoDB (PostgreSQL preservado en _future_postgres/)
- Seguridad: JWT_SECRET validado, CORS restringido
- Eliminados: 16 directorios __pycache__, todos los .pyc
- Preservado: Stack PostgreSQL completo para post-MVP
