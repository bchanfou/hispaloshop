# Hispaloshop MVP - Deploy Final

**Fecha:** 16 de marzo de 2026
**Versión:** 1.0.0 MVP

---

## URLs de Producción

- **Frontend:** https://hispaloshop-production.up.railway.app
- **Backend:** https://hispaloshop-api.up.railway.app
- **Health Check:** https://hispaloshop-api.up.railway.app/health
- **API Docs:** https://hispaloshop-api.up.railway.app/docs

---

## Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| **Backend** | FastAPI (Python 3.11) |
| **Base de Datos** | MongoDB Atlas |
| **Frontend** | React 19 + CRA |
| **Estilos** | Tailwind CSS |
| **Pagos** | Stripe (test mode) |
| **Deploy** | Railway |
| **Imágenes** | Cloudinary (opcional) |

---

## Credenciales de Test

### Customer (Comprador)
```
Email: customer@test.com
Password: Test1234
```

### Producer (Productor Local)
```
Email: producer@mvp.com
Password: Test1234
Store: /store/aceites-andaluces
```

### Importer (Importador)
```
Email: importer@mvp.com
Password: Test1234
Store: /store/importadora-mediterraneo
```

### Admin (Administrador)
```
Email: admin@mvp.com
Password: Test1234
```

---

## Funcionalidades MVP Verificadas

### Autenticación & Roles ✅
- [x] Registro con email/password
- [x] Login con JWT
- [x] Roles: customer, producer, importer, admin, influencer
- [x] Protección de rutas por rol

### Producer (Productor Local) ✅
- [x] Dashboard con stats de ventas
- [x] CRUD de productos
- [x] Tienda virtual pública
- [x] Gestión de órdenes
- [x] Stripe Connect para payouts

### Importer (Importador) ✅
- [x] Dashboard específico
- [x] Productos con datos de importación (país de origen, batch)
- [x] Tienda virtual diferenciada (badge "Importador")
- [x] Gestión de órdenes

### Customer (Comprador) ✅
- [x] Catálogo mixto (producers + importers)
- [x] Filtros por tipo de seller
- [x] Carrito persistente
- [x] Checkout con Stripe
- [x] Historial de órdenes

### Admin (Administrador) ✅
- [x] Dashboard con stats de plataforma
- [x] Moderación de productos (aprobar/rechazar)
- [x] Gestión de usuarios
- [x] Gestión de influencers y códigos de descuento

---

## Variables de Entorno Requeridas

### Backend (.env)

```bash
# === REQUIRED ===
JWT_SECRET=<generado con: openssl rand -hex 32>
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/hispaloshop
STRIPE_SECRET_KEY=sk_test_...

# === CORS / SECURITY ===
ALLOWED_ORIGINS=https://hispaloshop-production.up.railway.app,https://www.hispaloshop.com

# === OPTIONAL ===
STRIPE_WEBHOOK_SECRET=whsec_...
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
ENV=production
PORT=8000
```

### Frontend (.env)

```bash
REACT_APP_API_URL=https://hispaloshop-api.up.railway.app/api
REACT_APP_STRIPE_PUBLIC_KEY=pk_test_...
REACT_APP_DEMO_MODE=false
```

---

## Checklist Pre-Deploy

### Backend
- [x] Variables de entorno configuradas
- [x] Health check endpoint funciona
- [x] JWT_SECRET generado y seguro
- [x] MongoDB Atlas accesible
- [x] Stripe keys configuradas

### Frontend
- [x] API_URL apunta a producción
- [x] No hay console.log críticos
- [x] Build exitoso
- [x] Error boundaries configurados

### Seguridad
- [x] CORS restringido a dominios válidos
- [x] No hay wildcard en producción
- [x] Variables sensibles en .env (no en código)

---

## Guía de Deploy a Railway

### Paso 1: Crear Proyecto

1. Ir a https://railway.app
2. Crear nuevo proyecto
3. Seleccionar "Deploy from GitHub repo"
4. Conectar repositorio `hispaloshop`

### Paso 2: Configurar Backend

1. Añadir servicio "New"
2. Seleccionar "GitHub Repo"
3. Configurar:
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`

4. Añadir variables de entorno en Railway Dashboard

### Paso 3: Configurar Frontend

1. Añadir servicio "New"
2. Seleccionar "GitHub Repo"
3. Configurar:
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npx serve -s build -l $PORT`

4. Añadir variables de entorno:
   - `REACT_APP_API_URL` (URL del backend)

### Paso 4: Configurar Dominios

1. En cada servicio, ir a "Settings" → "Domains"
2. Generar dominio de Railway o configurar dominio personalizado

### Paso 5: Deploy

1. Hacer commit y push a main:
```bash
git add .
git commit -m "Deploy MVP v1.0.0"
git push origin main
```

2. Railway hará deploy automático

---

## Test Post-Deploy

### 1. Health Check
```bash
curl https://hispaloshop-api.up.railway.app/health
```
Debe retornar: `{"status": "ok", "version": "1.0.0"}`

### 2. Registro de Usuario
```bash
curl -X POST https://hispaloshop-api.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "deploy-test@test.com",
    "password": "Test1234",
    "name": "Deploy Test",
    "role": "customer",
    "country": "ES"
  }'
```

### 3. Login
```bash
curl -X POST https://hispaloshop-api.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@test.com",
    "password": "Test1234"
  }'
```

### 4. Crear Producto (Producer)
```bash
curl -X POST https://hispaloshop-api.up.railway.app/api/products \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Producto Test",
    "price": 29.99,
    "category_id": "alimentacion",
    "country_origin": "ES"
  }'
```

---

## Flujos de Test Manual

### Flujo 1: Customer Compra a Producer
1. Login como `customer@test.com`
2. Navegar a `/products`
3. Buscar producto de "Aceites Andaluces"
4. Añadir al carrito
5. Checkout con Stripe test card: `4242 4242 4242 4242`
6. Verificar orden en `/dashboard/orders`

### Flujo 2: Producer Gestiona Órdenes
1. Login como `producer@mvp.com`
2. Ir a `/producer/orders`
3. Ver orden nueva del customer
4. Actualizar estado a "shipped"

### Flujo 3: Importer Añade Producto Importado
1. Login como `importer@mvp.com`
2. Ir a `/producer/products` (comparten ruta)
3. Crear producto con:
   - País de origen: "Italia"
   - Batch: "BATCH-IT-2024-001"
4. Verificar producto aparece en catálogo con badge "Importado"

---

## Troubleshooting

### Error: "Module not found"
- Verificar que `requirements.txt` y `package.json` estén actualizados
- Reinstalar dependencias

### Error: "CORS policy"
- Verificar `ALLOWED_ORIGINS` incluye el dominio del frontend
- No usar `*` en producción

### Error: "MongoDB connection failed"
- Verificar IP whitelist en MongoDB Atlas (0.0.0.0/0 para Railway)
- Verificar string de conexión

### Error: "Stripe webhook failed"
- Verificar `STRIPE_WEBHOOK_SECRET` configurado
- Verificar webhook endpoint registrado en Stripe Dashboard

---

## Post-MVP (Roadmap)

### Fase 2: Mejoras de UX (Q2 2026)
- [ ] Sistema de búsqueda avanzada (Elasticsearch)
- [ ] Filtros dinámicos
- [ ] Wishlist persistente
- [ ] Reviews con fotos

### Fase 3: Social & Content (Q3 2026)
- [ ] Feed social tipo Instagram
- [ ] Reels de productos
- [ ] Chat en tiempo real
- [ ] Notificaciones push

### Fase 4: IA & Analytics (Q4 2026)
- [ ] Recomendaciones personalizadas
- [ ] Chatbot Hispalo AI
- [ ] Analytics avanzados para sellers
- [ ] Predicción de demanda

### Fase 5: Scale (2027)
- [ ] Migración a PostgreSQL (ya preparado en `_future_postgres/`)
- [ ] Multi-país y multi-moneda
- [ ] API pública para partners
- [ ] Mobile apps (React Native)

---

## Contacto & Soporte

- **Equipo:** Hispaloshop Team
- **Email:** admin@hispaloshop.com
- **Slack:** #hispaloshop-dev

---

## Licencia

Copyright © 2026 Hispaloshop. Todos los derechos reservados.
