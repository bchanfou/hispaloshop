# Cuentas de Prueba - Hispaloshop

## Resumen

Este documento describe las 4 cuentas de prueba creadas para probar todas las funcionalidades de la plataforma.

## Credenciales de Acceso

| Email | Contraseña | Rol | Estado |
|-------|------------|-----|--------|
| `consumer@test.com` | Test1234 | Customer | Aprobado |
| `producer@test.com` | Test1234 | Producer | Aprobado |
| `influencer@test.com` | Test1234 | Influencer | Aprobado |
| `importer@test.com` | Test1234 | Importer | Aprobado |

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

## 4. Importer (Importador) 🌐

**Perfil:** Gourmet Importaciones SL - Distribución internacional

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

### Contactos:
- **Comercial:** Carlos Rodríguez - carlos@gourmetimport.es
- **Calidad:** Ana López - ana@gourmetimport.es

### Funcionalidades a probar:
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
4. Para Producer/Influencer/Importer: aprobar desde admin

---

## Notas Importantes

### Aprobaciones necesarias:
- **Customer:** Auto-aprobado
- **Producer:** Requiere aprobación admin
- **Influencer:** Requiere aprobación admin  
- **Importer:** Requiere aprobación admin

Para aprobar, usar cuenta admin o modificar directamente en MongoDB:
```javascript
db.users.updateOne(
  { email: "producer@test.com" },
  { $set: { approved: true, email_verified: true } }
)
```

### Datos adicionales:
Todas las cuentas tienen:
- Email verificado: ✅
- Avatar de perfil
- Datos de contacto completos
- Configuración de consentimiento GDPR

### Seguridad:
⚠️ **IMPORTANTE:** Estas cuentas son solo para desarrollo/testing. Nunca usar en producción.

---

## Funcionalidades por Rol - Checklist

| Funcionalidad | Consumer | Producer | Influencer | Importer |
|---------------|----------|----------|------------|----------|
| Feed/Social | ✅ | ✅ | ✅ | ✅ |
| Comprar | ✅ | ❌ | ✅ | ❌ |
| Vender | ❌ | ✅ | ✅ | ❌ |
| Importar | ❌ | ❌ | ❌ | ✅ |
| Crear posts | ✅ | ✅ | ✅ | ❌ |
| Crear stories | ✅ | ✅ | ✅ | ❌ |
| Dashboard analytics | ❌ | ✅ | ✅ | ✅ |
| Chat HI AI | ✅ | ✅ | ✅ | ✅ |
| Wishlist | ✅ | ❌ | ❌ | ❌ |
| Pedidos | ✅ | ✅ | ❌ | ✅ |
| Reviews | ✅ | ❌ | ✅ | ❌ |
| Afiliados | ❌ | ❌ | ✅ | ❌ |
| B2B Quotes | ❌ | ❌ | ❌ | ✅ |

---

## Soporte

Si tienes problemas con las cuentas de prueba:
1. Verificar que el backend esté corriendo
2. Comprobar conexión a MongoDB
3. Revisar logs del backend
4. Verificar que las variables de entorno estén configuradas
