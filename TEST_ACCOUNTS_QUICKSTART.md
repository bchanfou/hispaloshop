# Cuentas de Prueba - Quick Start

## Credenciales Listas para Usar

| Email | Password | Rol | Estado |
|-------|----------|-----|--------|
| `consumer@test.com` | Test1234 | Customer | ✅ Lista |
| `producer@test.com` | Test1234 | Producer | ✅ Lista |
| `influencer@test.com` | Test1234 | Influencer | ✅ Lista |
| `importer@test.com` | Test1234 | Importer | ✅ Lista |

---

## Opción 1: Crear Cuentas Automáticamente (Recomendado)

### Paso 1: Asegúrate de tener el backend corriendo
```bash
cd backend
python -m app.main
```

### Paso 2: En otra terminal, ejecuta el script
```bash
cd backend
python test_accounts_api.py
```

Esto creará las 4 cuentas automáticamente a través de la API.

---

## Opción 2: Crear Manualmente

### 1. Registrarse en la app
Ve a: `http://localhost:3000/register/new`

### 2. Seleccionar rol y completar datos

**Consumer:**
- Email: `consumer@test.com`
- Password: `Test1234`
- Nombre: `María Consumidora`
- País: España
- ✅ Aceptar términos

**Producer:**
- Email: `producer@test.com`
- Password: `Test1234`
- Nombre: `Cooperativa La Huerta Viva`
- Empresa: `La Huerta Viva S.Coop.`
- CIF: `ESF43002123`
- Tel: `+34 977 123 456`
- Dirección: `Camino Viejo de Reus km 5, 43201 Reus`
- Contacto: `Antonio Martínez`

**Influencer:**
- Email: `influencer@test.com`
- Password: `Test1234`
- Nombre: `Nora Real Food`
- Instagram: `@norarealfood`
- TikTok: `@norarealfood`

**Importer:**
- Email: `importer@test.com`
- Password: `Test1234`
- Nombre: `Gourmet Importaciones SL`
- Empresa: `Gourmet Importaciones y Distribuciones SL`
- CIF: `ESB87654321`
- Tel: `+34 915 678 901`
- Dirección: `Paseo de la Castellana 150, 28046 Madrid`
- Contacto: `Carlos Rodríguez`

### 3. Aprobar cuentas (Producer, Influencer, Importer)

Las cuentas de Customer se aprueban automáticamente.

Para las demás, usa MongoDB Compass o la consola:

```javascript
// Conectar a MongoDB Atlas
// Base de datos: hispaloshop
// Colección: users

// Aprobar todas las cuentas de prueba
db.users.updateMany(
  { email: { $in: [
    "producer@test.com",
    "influencer@test.com", 
    "importer@test.com"
  ]}},
  { $set: { approved: true, email_verified: true }}
)

// Verificar usuarios creados
db.users.find(
  { email: { $regex: "@test.com" }},
  { email: 1, role: 1, approved: 1 }
)
```

---

## Opción 3: Script Directo a MongoDB

Si tienes acceso directo a MongoDB:

```bash
cd backend
python test_accounts.py
```

Nota: Este script requiere que puedas conectar a MongoDB Atlas desde tu máquina.

---

## Verificación Rápida

Después de crear las cuentas, prueba:

1. **Login en frontend**
   - Ir a `/login`
   - Usar cualquiera de las credenciales

2. **Probar funcionalidades por rol:**

   | Funcionalidad | Consumer | Producer | Influencer | Importer |
   |--------------|----------|----------|------------|----------|
   | Feed/Social | ✅ | ✅ | ✅ | ✅ |
   | Comprar | ✅ | - | ✅ | - |
   | Vender productos | - | ✅ | - | - |
   | Crear posts/stories | ✅ | ✅ | ✅ | - |
   | Dashboard analytics | - | ✅ | ✅ | ✅ |
   | Chat HI AI | ✅ | ✅ | ✅ | ✅ |
   | Afiliados/Comisiones | - | - | ✅ | - |
   | B2B Quotes | - | - | - | ✅ |

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
- Producer, Influencer e Importer requieren aprobación manual
- Usa el panel de admin o modifica directamente en MongoDB

---

## Datos de Contacto para Cuentas

Si necesitas crear más cuentas, estos son los datos válidos:

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

## Archivos Creados

- `backend/test_accounts.py` - Script directo a MongoDB
- `backend/test_accounts_api.py` - Script via API
- `TEST_ACCOUNTS_README.md` - Documentación completa
- `TEST_ACCOUNTS_QUICKSTART.md` - Este archivo

---

## Soporte

¿Problemas? Verifica:
1. Backend corriendo: `python -m app.main`
2. Frontend corriendo: `npm start` (en /frontend)
3. MongoDB Atlas accesible
4. Variables de entorno configuradas en `.env`
