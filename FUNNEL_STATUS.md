# Estado del Funnel MVP - Multi-Seller

**Fecha:** 2026-03-07  
**Versión:** 1.0.0

## Resumen de Implementación

Se ha implementado soporte completo para múltiples tipos de vendedores (multi-seller) en Hispaloshop:

- **Producer** (Productor Local)
- **Importer** (Importador/Distribuidor)  
- **Admin** (Administrador)

## Roles de Vendedor Soportados

### Producer (Productor Local) ✅
- [x] Registro con rol producer
- [x] Crear tienda virtual (store_type: "producer")
- [x] Crear producto (seller_type: "producer")
- [x] Dashboard específico de producer
- [x] Ver productos en catálogo
- [x] Recibir órdenes
- [x] Stripe Connect para payouts

### Importer (Importador/Distribuidor) ✅
- [x] Registro con rol importer
- [x] Crear tienda virtual diferenciada (owner_type: "importer")
- [x] Crear producto con campos de importación:
  - [x] `origin_country`: País de origen
  - [x] `import_batch`: Batch de importación
  - [x] `import_date`: Fecha de importación
  - [x] `customs_info`: Información de aduanas
- [x] Ver productos en catálogo con badge "Importador"
- [x] Dashboard específico de importer con:
  - [x] Stats de productos importados
  - [x] Lista de países de origen
  - [x] Órdenes filtradas
- [x] Recibir órdenes

### Admin (Administrador) ✅
- [x] Registro con rol admin
- [x] Capacidades administrativas

## Flujo Customer ✅

- [x] Ver catálogo mixto (productos de producers e importers)
- [x] Filtrar por tipo de seller (`/api/products?seller_type=importer`)
- [x] Ver tienda de producer (/store/:slug)
- [x] Ver tienda de importer (/store/:slug) con info de importación
- [x] Badges diferenciados en tiendas (Productor vs Importador)
- [x] Añadir al carrito productos de cualquier seller
- [x] Checkout único con productos mixtos
- [x] Orden creada con referencia a ambos sellers

## Modelos de Datos

### Product (actualizado)
```python
class Product(BaseModel):
    # ... campos existentes ...
    producer_id: str  # ID del seller
    seller_type: str = "producer"  # "producer" | "importer" | "admin"
    origin_country: Optional[str] = None  # Para productos importados
    import_batch: Optional[str] = None
    import_date: Optional[str] = None
    customs_info: Optional[Dict] = None
```

### StoreProfile (actualizado)
```python
class StoreProfile(BaseModel):
    # ... campos existentes ...
    producer_id: str  # ID del owner
    store_type: str = "producer"
    owner_type: str = "producer"  # "producer" | "importer" | "admin"
    specialization: Optional[str] = None  # Para importers
```

## Endpoints de API

### Products
- `GET /api/products` - Lista productos (filtro: `?seller_type=importer`)
- `POST /api/products` - Crea producto (auto-detecta seller_type)
- `GET /api/products/{id}` - Detalle de producto

### Stores
- `GET /api/store/{slug}` - Perfil público de tienda (incluye owner_type)
- `GET /api/store/{slug}/products` - Productos de la tienda
- `GET /api/producer/store-profile` - Perfil de tienda (soporta producer/importer)

### Importer (nuevos)
- `GET /api/importer/stats` - Estadísticas del importador
- `GET /api/importer/products` - Productos del importador
- `GET /api/importer/orders` - Órdenes con productos del importador
- `GET /api/importer/products/by-country` - Filtrar por país de origen
- `GET /api/importer/products/by-batch` - Filtrar por batch

### Producer (existentes, ahora soportan importer)
- `GET /api/producer/stats`
- `GET /api/producer/products`
- `GET /api/producer/orders`
- `POST /api/producer/stripe/create-account`

## Páginas Frontend

### Importer
- `/importer/dashboard` - ImporterDashboardPage.js (actualizado)
- `/importer/catalog` - ImporterCatalogPage.js (existente)
- `/importer/orders` - ImporterOrdersPage.js (nuevo)

### Store
- `/store/:slug` - StorePage.js (actualizado con badges de owner_type)

## Datos de Test

### Credenciales
| Email | Password | Rol |
|-------|----------|-----|
| customer@test.com | Test1234 | customer |
| producer@mvp.com | Test1234 | producer |
| importer@mvp.com | Test1234 | importer |
| admin@mvp.com | Test1234 | admin |

### URLs de Tiendas
- Producer: `/store/aceites-andaluces`
- Importer: `/store/importadora-mediterraneo`

### Productos de Ejemplo
| Nombre | Seller | Origen |
|--------|--------|--------|
| Aceite de Oliva Premium | Producer | España |
| Parmigiano Reggiano | Importer | Italia |
| Pasta Artesanal | Importer | Italia |
| Aceitunas Kalamata | Importer | Grecia |

## Verificación en MongoDB

```bash
# Conectar a MongoDB
mongosh "$MONGO_URL"

# Verificar usuarios
use hispaloshop
db.users.find({role: {$in: ["producer", "importer", "admin"]}}, {email: 1, role: 1})

# Verificar tiendas por tipo
db.store_profiles.find({}, {name: 1, owner_type: 1, slug: 1})

# Verificar productos por seller_type
db.products.aggregate([{$group: {_id: "$seller_type", count: {$sum: 1}}}])

# Verificar productos importados
db.products.find({seller_type: "importer"}, {name: 1, origin_country: 1, import_batch: 1})
```

## Bugs Conocidos

| Rol | Paso | Error | Estado |
|-----|------|-------|--------|
| - | - | Ninguno reportado | - |

## Instrucciones para Testing

### 1. Preparar entorno
```bash
cd backend
python seed_multiseller.py
uvicorn main:app --reload
```

### 2. Test Producer Flow
1. Login como `producer@mvp.com`
2. Crear producto en `/producer/products`
3. Verificar tienda `/store/aceites-andaluces`
4. Verificar producto aparece en catálogo

### 3. Test Importer Flow
1. Login como `importer@mvp.com`
2. Ver dashboard `/importer/dashboard`
3. Ver países de origen listados
4. Crear producto importado
5. Verificar tienda `/store/importadora-mediterraneo`
6. Verificar badge "Importador"

### 4. Test Customer Flow
1. Login como `customer@test.com`
2. Ver catálogo `/products`
3. Ver productos de producers e importers mezclados
4. Añadir productos de ambos sellers al carrito
5. Checkout
6. Verificar orden creada

## Criterios de Aceptación Completados

1. [x] Producer se registra, crea tienda y producto
2. [x] Importer se registra, crea tienda diferenciada y producto con campos de importación
3. [x] Ambos productos aparecen en catálogo general
4. [x] Customer puede ver tienda de producer (/store/:slug)
5. [x] Customer puede ver tienda de importer (/store/:slug) con info de importación
6. [x] Customer añade productos de ambos sellers al carrito
7. [x] Checkout procesa pago único
8. [x] Orden creada con referencia a ambos sellers
9. [x] Producer ve orden en su dashboard
10. [x] Importer ve orden en su dashboard
11. [x] FUNNEL_STATUS.md documenta estado completo

## Notas de Implementación

- El campo `producer_id` en Product y Store se mantiene por compatibilidad
- Se añadió `seller_type` y `owner_type` para distinguir tipos
- Los importers usan los mismos endpoints que producers pero con rol "importer"
- El dashboard de importer es específico y muestra estadísticas de importación
- Los productos importados muestran país de origen en el catálogo
