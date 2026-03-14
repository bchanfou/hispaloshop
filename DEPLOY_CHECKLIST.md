# Hispaloshop — Checklist de Deploy a Produccion

## 1. RAILWAY (Backend)

### Variables de entorno requeridas
Anadir en Railway -> proyecto -> Variables:
- [ ] MONGODB_URL
- [ ] DATABASE_NAME=hispaloshop
- [ ] JWT_SECRET (32+ caracteres aleatorios)
- [ ] STRIPE_SECRET_KEY (sk_live_...)
- [ ] STRIPE_WEBHOOK_SECRET (whsec_... — se obtiene al configurar el webhook)
- [ ] STRIPE_PUBLISHABLE_KEY (pk_live_...)
- [ ] CLOUDINARY_CLOUD_NAME
- [ ] CLOUDINARY_API_KEY
- [ ] CLOUDINARY_API_SECRET
- [ ] CLOUDINARY_UPLOAD_PRESET
- [ ] ANTHROPIC_API_KEY
- [ ] SENDGRID_API_KEY (o proveedor de email elegido)
- [ ] EMAIL_FROM=noreply@hispaloshop.com
- [ ] FRONTEND_URL=https://hispaloshop.com
- [ ] ALLOWED_ORIGINS=https://hispaloshop.com
- [ ] ENVIRONMENT=production
- [ ] DEBUG=false

### Configuracion Railway
- [ ] Dominio personalizado: api.hispaloshop.com
- [ ] Health check: GET /health -> 200
- [ ] Cron jobs (Settings -> Cron Jobs):
  - `0 8 * * *` -> POST /admin/cron/influencer-auto-payouts
  - `0 7 * * 1` -> POST /admin/cron/influencer-tier-sweep
- [ ] Workers: 2 (ajustar segun trafico)

---

## 2. VERCEL (Frontend)

### Variables de entorno requeridas
Anadir en Vercel -> proyecto -> Environment Variables:
- [ ] REACT_APP_API_URL=https://api.hispaloshop.com
- [ ] REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_...
- [ ] REACT_APP_CLOUDINARY_CLOUD=...
- [ ] REACT_APP_CLOUDINARY_PRESET=hispaloshop_unsigned
- [ ] REACT_APP_GIPHY_API_KEY=<key de produccion>

### Configuracion Vercel
- [ ] Dominio: hispaloshop.com
- [ ] Framework preset: Create React App
- [ ] Build command: npx craco build
- [ ] Output directory: build
- [ ] vercel.json presente con rewrites SPA

---

## 3. MONGODB ATLAS

- [ ] Cluster en produccion (M10 minimo para produccion real)
- [ ] IP whitelist: anadir IPs de Railway (o 0.0.0.0/0 con auth fuerte)
- [ ] Usuario de BD con permisos de lectura/escritura
- [ ] Backup automatico activado
- [ ] Indices se crean automaticamente en startup (core/database.py _create_indexes)

---

## 4. STRIPE

### Webhooks
- [ ] Crear webhook en Stripe Dashboard -> Developers -> Webhooks
- [ ] Endpoint URL: https://api.hispaloshop.com/webhooks/stripe
- [ ] Eventos a escuchar:
  - payment_intent.succeeded
  - payment_intent.payment_failed
  - checkout.session.completed
  - customer.subscription.created
  - customer.subscription.updated
  - customer.subscription.deleted
  - invoice.payment_succeeded
  - invoice.payment_failed
- [ ] Copiar el Webhook Secret (whsec_...) a Railway

### Stripe Connect
- [ ] Activar Stripe Connect en el dashboard
- [ ] Configurar redirect URL para onboarding:
  https://hispaloshop.com/producer/connect/return
- [ ] Activar pagos en EUR

### Productos en Stripe
- [ ] Crear productos para suscripciones:
  - hispaloshop_producer_pro -> 79 EUR/mes
  - hispaloshop_producer_elite -> 249 EUR/mes
  - hispaloshop_importer_pro -> 79 EUR/mes
  - hispaloshop_importer_elite -> 249 EUR/mes
- [ ] Anotar los Price IDs en las variables de entorno

---

## 5. CLOUDINARY

- [ ] Crear cuenta/proyecto en Cloudinary
- [ ] Crear upload preset "hispaloshop_unsigned" (unsigned para uploads directos)
- [ ] Configurar carpetas: products/, banners/, logos/, gallery/, community_posts/
- [ ] Activar transformaciones automaticas (resize, webp)

---

## 6. ANTHROPIC

- [ ] API key activa con creditos suficientes
- [ ] Verificar que claude-haiku-4-5-20251001 y claude-sonnet-4-6 son accesibles
- [ ] Configurar limites de uso en la consola de Anthropic si es necesario

---

## 7. EMAIL (SendGrid recomendado)

- [ ] Cuenta en SendGrid
- [ ] Dominio verificado (hispaloshop.com)
- [ ] Templates creados:
  - order_confirmation
  - order_shipped
  - welcome
  - password_reset
  - admin_rejection (para productores rechazados)
- [ ] API key con permisos de envio

---

## 8. DOMINIO Y DNS

- [ ] hispaloshop.com -> Vercel
- [ ] api.hispaloshop.com -> Railway
- [ ] www.hispaloshop.com -> redirect a hispaloshop.com
- [ ] SSL automatico en ambos (Vercel y Railway lo gestionan)

---

## 9. VERIFICACION FINAL POST-DEPLOY

- [ ] GET https://api.hispaloshop.com/health -> {"status": "ok"}
- [ ] Login funciona en produccion
- [ ] Subir imagen funciona (Cloudinary)
- [ ] Pago de prueba con tarjeta Stripe test 4242...
- [ ] Webhook recibido correctamente (Stripe Dashboard -> Events)
- [ ] Email de confirmacion llega
- [ ] Hispal AI responde (Anthropic key activa)

---

## 10. SUPERADMIN INICIAL

El superadmin NUNCA se crea desde la UI.
Crear directamente en MongoDB:

```python
# Ejecutar en Python conectado a la BD de produccion:
from datetime import datetime
import bcrypt

password_hash = bcrypt.hashpw(
    b"TuPasswordSuperSeguro123!",
    bcrypt.gensalt()
).decode()

db.users.insert_one({
    "user_id":        "superadmin-001",
    "email":          "superadmin@hispaloshop.com",
    "username":       "superadmin",
    "name":           "Super Admin",
    "password_hash":  password_hash,
    "role":           "super_admin",
    "email_verified": True,
    "approved":       True,
    "created_at":     datetime.utcnow(),
})
```

Cambiar la contrasena inmediatamente despues del primer login.
