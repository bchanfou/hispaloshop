# Cuentas de Prueba - Hispaloshop

## Resumen

6 cuentas de prueba listas para usar con todos los perfiles de la plataforma.

## Credenciales de Acceso

| Email | Contraseña | Rol | Estado |
|-------|------------|-----|--------|
| `consumer@test.com` | Test1234 | **Customer** | ✅ Lista |
| `producer@test.com` | Test1234 | **Producer** | ✅ Lista |
| `influencer@test.com` | Test1234 | **Influencer** | ✅ Lista |
| `importer@test.com` | Test1234 | **Importer** | ✅ Lista |
| `admin@test.com` | Test1234 | **Admin** | ✅ Lista |
| `superadmin@test.com` | Test1234 | **SuperAdmin** | ✅ Lista |

---

## 1. Consumer (Cliente) 👤

**Perfil:** María García López - Amante de productos artesanales

### Datos de la cuenta:
- **Email:** consumer@test.com
- **Password:** Test1234
- **Nombre:** María Consumidora
- **País:** España (ES)
- **Ubicación:** Madrid, España
- **Teléfono:** +34 612 345 678

### Datos de perfil:
```json
{
  "bio": "Amante de los productos artesanales y la gastronomía local",
  "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200",
  "preferences": {
    "diet": ["mediterránea", "orgánica"],
    "allergens": ["gluten"]
  }
}
```

### Dirección guardada:
- Calle Mayor 123, 4ºB
- Madrid, 28013
- Tel: +34 612 345 678

### Funcionalidades a probar:
- [ ] Login/Logout
- [ ] Buscar productos
- [ ] Añadir al carrito
- [ ] Checkout con Stripe
- [ ] Guardar direcciones
- [ ] Seguir tiendas
- [ ] Dejar reseñas
- [ ] Lista de deseos (wishlist)
- [ ] Chat con HI AI
- [ ] Historial de pedidos
- [ ] Recetas favoritas
- [ ] **Crear posts y stories**

---

## 2. Producer (Productor) 🏪

**Perfil:** Cooperativa La Huerta Viva - Agricultura ecológica desde 1985

### Datos de la cuenta:
- **Email:** producer@test.com
- **Password:** Test1234
- **Nombre:** Cooperativa La Huerta Viva
- **Empresa:** La Huerta Viva S.Coop.
- **País:** España (ES)
- **Ubicación:** Reus, Tarragona, España
- **CIF:** ESF43002123

### Datos de empresa:
```json
{
  "description": "Cooperativa de agricultores dedicada al cultivo ecológico",
  "contact": "Antonio Martínez",
  "phone": "+34 977 123 456",
  "fiscal_address": "Camino Viejo de Reus km 5, 43201 Reus",
  "website": "https://lahuertaviva.es",
  "social": {
    "instagram": "@lahuertaviva"
  }
}
```

### Configuración de envío:
- Envío gratis desde: €50
- Coste envío: €4.95
- Tiempo: 24-48h

### Funcionalidades a probar:
- [ ] Dashboard de productor
- [ ] Añadir/editar productos
- [ ] Gestionar stock
- [ ] Ver pedidos entrantes
- [ ] Actualizar estado de envío
- [ ] Responder a reseñas
- [ ] Configurar envíos
- [ ] Conectar Stripe
- [ ] Retirar fondos
- [ ] Estadísticas de ventas
- [ ] Certificados digitales
- [ ] **Crear posts y stories**

---

## 3. Influencer (Creador) 🎥

**Perfil:** Nora Real Food - Foodie & Content Creator

### Datos de la cuenta:
- **Email:** influencer@test.com
- **Password:** Test1234
- **Nombre:** Nora Real Food
- **Nombre completo:** Nora García Martínez
- **País:** España (ES)
- **Ubicación:** Barcelona, España
- **Website:** https://norarealfood.com

### Redes sociales:
```json
{
  "instagram": "@norarealfood",
  "tiktok": "@norarealfood",
  "youtube": "NoraRealFood",
  "twitter": "@norarealfood"
}
```

### Estadísticas:
- Followers: 12,500
- Following: 450
- Posts: 234
- Engagement: 4.5%

### Monetización:
- Comisión: 8.5%
- Ganancias totales: €2,450
- Código afiliado: NORA15

### Funcionalidades a probar:
- [ ] Dashboard de influencer
- [ ] Crear posts con product tags
- [ ] Crear stories
- [ ] Crear reels
- [ ] Ver estadísticas de engagement
- [ ] Tracking de comisiones
- [ ] Generar links de afiliado
- [ ] Ver productos recomendados
- [ ] Chat con marcas
- [ ] Retirar comisiones
- [ ] Analytics de clics y conversiones

---

## 4. Importer (Importador + Vendedor) 🌐

**Perfil:** Gourmet Importaciones SL - Distribución internacional + Venta local

> **Nota:** El importador tiene capacidades duales: puede importar/exportar (B2B) **Y** vender productos directamente al consumidor (B2C).

### Datos de la cuenta:
- **Email:** importer@test.com
- **Password:** Test1234
- **Nombre:** Gourmet Importaciones SL
- **Empresa:** Gourmet Importaciones y Distribuciones SL
- **País:** España (ES)
- **Ubicación:** Madrid, España
- **CIF:** ESB87654321

### Perfil B2B:
```json
{
  "description": "Importador de productos gourmet españoles",
  "markets": ["DE", "FR", "UK", "US", "JP", "CN"],
  "channels": ["retail", "horeca", "ecommerce"],
  "certifications": ["BRC", "IFS", "ORGANIC_EU"],
  "min_order": 5000,
  "payment_terms": "30-60 días"
}
```

### Capacidades de Vendedor (B2C):
- Productos publicados: 18
- Ventas totales: 850
- Revenue: €18,500
- Rating: 4.7/5

### Contactos:
- **Comercial:** Carlos Rodríguez - carlos@gourmetimport.es
- **Calidad:** Ana López - ana@gourmetimport.es

### Funcionalidades a probar:

**B2B (Importador):**
- [ ] Dashboard B2B
- [ ] Búsqueda de productores
- [ ] Solicitar cotizaciones
- [ ] Comparar productos
- [ ] Historial de cotizaciones
- [ ] Conectar con productores
- [ ] Ver catálogo exportable
- [ ] Gestión de pedidos B2B
- [ ] Documentación de exportación
- [ ] Tracking de envíos
- [ ] Market coverage

**B2C (Vendedor):**
- [ ] Publicar productos
- [ ] Gestionar inventario
- [ ] Procesar pedidos
- [ ] Configurar envíos
- [ ] Retirar fondos
- [ ] **Crear posts y stories**

---

## 5. Admin 🛡️

**Perfil:** Administrador de Plataforma - Gestión operativa

### Datos de la cuenta:
- **Email:** admin@test.com
- **Password:** Test1234
- **Nombre:** Admin Hispaloshop
- **País:** España (ES)
- **Ubicación:** Madrid, España
- **Teléfono:** +34 915 000 001

### Permisos:
```json
{
  "can_manage_producers": true,
  "can_manage_products": true,
  "can_manage_orders": true,
  "can_manage_influencers": true,
  "can_view_analytics": true,
  "can_manage_content": true,
  "can_manage_support": true
}
```

### Funcionalidades a probar:
- [ ] Panel de administración
- [ ] Aprobar/rechazar productores
- [ ] Aprobar/rechazar influencers
- [ ] Moderar productos
- [ ] Ver todos los pedidos
- [ ] Gestión de certificados
- [ ] Soporte al cliente
- [ ] Reportes y analytics
- [ ] Gestión de contenido

---

## 6. SuperAdmin 👑

**Perfil:** Super Administrador - Control total del sistema

### Datos de la cuenta:
- **Email:** superadmin@test.com
- **Password:** Test1234
- **Nombre:** Super Admin
- **País:** España (ES)
- **Ubicación:** Madrid, España
- **Teléfono:** +34 915 000 000

### Permisos:
```json
{
  "can_manage_producers": true,
  "can_manage_products": true,
  "can_manage_orders": true,
  "can_manage_influencers": true,
  "can_view_analytics": true,
  "can_manage_content": true,
  "can_manage_support": true,
  "can_manage_admins": true,
  "can_manage_finance": true,
  "can_manage_settings": true,
  "can_view_audit_logs": true
}
```

### Funcionalidades a probar:
- [ ] Todo lo que puede hacer Admin
- [ ] Crear/eliminar admins
- [ ] Configuración de plataforma
- [ ] Gestión financiera global
- [ ] Auditoría de logs
- [ ] Configuración de comisiones
- [ ] Gestión de roles y permisos
- [ ] Supervisión de transacciones
- [ ] Configuración de pagos
- [ ] Gestión de la plataforma

---

## Scripts Disponibles

### Opción 1: Crear vía script Python (requiere MongoDB accesible)
```bash
cd backend
python test_accounts.py
```

### Opción 2: Crear vía API (requiere backend corriendo)
```bash
cd backend
python test_accounts_api.py
```

### Opción 3: Crear manualmente
1. Ir a `/register/new`
2. Seleccionar rol
3. Completar formulario con datos de arriba
4. Para Producer/Influencer/Importer/Admin/SuperAdmin: aprobar desde superadmin

---

## Matriz de Capacidades

| Funcionalidad | Consumer | Producer | Influencer | Importer | Admin | SuperAdmin |
|--------------|----------|----------|------------|----------|-------|------------|
| **Feed/Social** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Comprar** | ✅ | - | ✅ | ✅ | - | - |
| **Vender (B2C)** | - | ✅ | ✅ | ✅ | - | - |
| **Importar (B2B)** | - | - | - | ✅ | - | - |
| **Crear posts** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Crear stories** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Afiliados** | - | - | ✅ | - | - | - |
| **Dashboard** | Básico | Producer | Influencer | B2B+B2C | Admin | SuperAdmin |
| **Gestión usuarios** | - | - | - | - | ✅ | ✅ |
| **Config sistema** | - | - | - | - | - | ✅ |
| **Finanzas** | - | Propias | Comisiones | Propias | - | Global |

### Notas especiales:
- **Importer:** Es el único rol con capacidades B2B (importación) + B2C (venta directa)
- **Influencer:** Puede vender productos a través de links de afiliado
- **Admin:** No puede crear/eliminar otros admins (solo SuperAdmin)
- **SuperAdmin:** Acceso total, incluyendo configuración del sistema

---

## Aprobaciones Necesarias

| Rol | Auto-aprobado | Requiere aprobación |
|-----|---------------|---------------------|
| Customer | ✅ | - |
| Producer | - | ✅ Admin/SuperAdmin |
| Influencer | - | ✅ Admin/SuperAdmin |
| Importer | - | ✅ Admin/SuperAdmin |
| Admin | - | ✅ SuperAdmin |
| SuperAdmin | - | ✅ (crear manual en DB) |

### Para aprobar usuarios via MongoDB:

```javascript
// Aprobar todos los usuarios de prueba
db.users.updateMany(
  { email: { $in: [
    "producer@test.com",
    "influencer@test.com", 
    "importer@test.com",
    "admin@test.com",
    "superadmin@test.com"
  ]}},
  { $set: { approved: true, email_verified: true } }
)

// Verificar usuarios creados
db.users.find(
  { email: { $regex: "@test.com" }},
  { email: 1, role: 1, approved: 1 }
)
```

---

## Datos de Contacto para Cuentas

### Direcciones de prueba (España)
- Calle Mayor 123, 28013 Madrid
- Calle Serrano 45, 28006 Madrid
- Avenida Diagonal 200, 08018 Barcelona

### CIFs de prueba válidos
- ESF43002123 (Productor)
- ESB87654321 (Importador)
- ESX12345678 (Otro)

### Teléfonos válidos
- +34 612 345 678 (Móvil)
- +34 915 678 901 (Fijo Madrid)
- +34 977 123 456 (Fijo Tarragona)

---

## Solución de Problemas

### "Backend no conectado"
- Verifica que el backend esté corriendo en `localhost:8000`
- Revisa que no haya errores en la consola del backend

### "MongoDB connection error"
- Verifica tu archivo `.env` tiene las credenciales correctas de MongoDB Atlas
- Asegúrate de que tu IP esté en la lista blanca de MongoDB Atlas

### "Usuario ya existe"
- Las cuentas ya fueron creadas previamente
- Puedes usarlas directamente o borrarlas y recrearlas:
```javascript
db.users.deleteMany({ email: { $regex: "@test.com" }})
```

### "Cuenta pendiente de aprobación"
- Producer, Influencer, Importer, Admin y SuperAdmin requieren aprobación
- Usa el panel de superadmin o modifica directamente en MongoDB

---

## Archivos Creados

- `backend/test_accounts.py` - Script directo a MongoDB (6 cuentas)
- `backend/test_accounts_api.py` - Script via API (6 cuentas)
- `TEST_ACCOUNTS_README.md` - Documentación completa (este archivo)
- `TEST_ACCOUNTS_QUICKSTART.md` - Guía rápida

---

## Seguridad

⚠️ **IMPORTANTE:** Estas cuentas son solo para desarrollo/testing:
- Emails: `@test.com` (dominio de prueba)
- Passwords: `Test1234` (simple, predecible)
- Datos: Ficticios, no reales

**Nunca usar en producción.**
