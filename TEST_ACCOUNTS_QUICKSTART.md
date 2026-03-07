# Cuentas de Prueba - Quick Start

## Credenciales Listas para Usar (6 cuentas)

| Email | Password | Rol | Capacidades |
|-------|----------|-----|-------------|
| `consumer@test.com` | Test1234 | **Customer** | Comprar, posts, stories |
| `producer@test.com` | Test1234 | **Producer** | Vender, gestionar pedidos |
| `influencer@test.com` | Test1234 | **Influencer** | Afiliados, contenido |
| `importer@test.com` | Test1234 | **Importer** | **B2B + Vender + Contenido** |
| `admin@test.com` | Test1234 | **Admin** | Gestionar plataforma |
| `superadmin@test.com` | Test1234 | **SuperAdmin** | Control total |

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

---

## Opción 2: Aprobación Rápida en MongoDB

```javascript
// En MongoDB Compass o shell
// Conectar a: mongodb+srv://hispaloshop:...@cluster0...mongodb.net/hispaloshop

db.users.updateMany(
  { email: { $in: [
    "producer@test.com",
    "influencer@test.com", 
    "importer@test.com",
    "admin@test.com",
    "superadmin@test.com"
  ]}},
  { $set: { approved: true, email_verified: true }}
)
```

---

## Opción 3: Crear Manualmente

Ve a: `http://localhost:3000/register/new`

### Datos por rol:

**Consumer:**
- Email: `consumer@test.com`, Password: `Test1234`
- Nombre: `María Consumidora`, País: España

**Producer:**
- Email: `producer@test.com`, Password: `Test1234`
- Nombre: `Cooperativa La Huerta Viva`
- Empresa: `La Huerta Viva S.Coop.`, CIF: `ESF43002123`
- Tel: `+34 977 123 456`, Contacto: `Antonio Martínez`

**Influencer:**
- Email: `influencer@test.com`, Password: `Test1234`
- Nombre: `Nora Real Food`
- Instagram: `@norarealfood`, TikTok: `@norarealfood`

**Importer** (Importador + Vendedor):
- Email: `importer@test.com`, Password: `Test1234`
- Nombre: `Gourmet Importaciones SL`
- Empresa: `Gourmet Importaciones y Distribuciones SL`
- CIF: `ESB87654321`, Tel: `+34 915 678 901`
- Contacto: `Carlos Rodríguez`

**Admin:**
- Email: `admin@test.com`, Password: `Test1234`
- Nombre: `Admin Hispaloshop`

**SuperAdmin:**
- Email: `superadmin@test.com`, Password: `Test1234`
- Nombre: `Super Admin`

---

## Matriz de Capacidades

| Funcionalidad | Consumer | Producer | Influencer | Importer | Admin | SuperAdmin |
|--------------|----------|----------|------------|----------|-------|------------|
| **Feed/Social** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Comprar** | ✅ | - | ✅ | ✅ | - | - |
| **Vender (B2C)** | - | ✅ | ✅ | ✅ | - | - |
| **Importar (B2B)** | - | - | - | ✅ | - | - |
| **Crear posts/stories** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Afiliados** | - | - | ✅ | - | - | - |
| **Gestión usuarios** | - | - | - | - | ✅ | ✅ |
| **Config sistema** | - | - | - | - | - | ✅ |

### Nota especial - Importer:
El rol **Importer** es el más completo para empresas que:
1. **Importan** productos de otros países (B2B)
2. **Venden** productos directamente a consumidores (B2C)
3. **Crean contenido** (posts, stories) para marketing

---

## Verificación Rápida

Después de crear las cuentas, prueba:

```bash
# Login con cada cuenta
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"consumer@test.com","password":"Test1234"}'
```

O simplemente ve a `/login` en el frontend y prueba cada cuenta.

---

## Solución de Problemas

### "Backend no conectado"
```bash
cd backend
python -m app.main  # Iniciar backend
```

### "Usuario ya existe"
```javascript
// Borrar todas las cuentas de prueba
db.users.deleteMany({ email: { $regex: "@test.com" }})
```

### "Cuenta pendiente de aprobación"
Las cuentas de Producer, Influencer, Importer, Admin y SuperAdmin requieren aprobación.

Solución rápida:
```javascript
db.users.updateMany(
  { email: { $regex: "@test.com" }},
  { $set: { approved: true, email_verified: true }}
)
```

---

## Datos de Contacto para Cuentas

### Direcciones (España)
- `Calle Mayor 123, 28013 Madrid`
- `Camino Viejo de Reus km 5, 43201 Reus`
- `Paseo de la Castellana 150, 28046 Madrid`

### CIFs válidos
- `ESF43002123` (Productor)
- `ESB87654321` (Importador)

### Teléfonos
- `+34 612 345 678` (Consumer)
- `+34 977 123 456` (Producer)
- `+34 915 678 901` (Importer)

---

## Archivos

- `backend/test_accounts.py` - Script MongoDB (6 cuentas)
- `backend/test_accounts_api.py` - Script API (6 cuentas)
- `TEST_ACCOUNTS_README.md` - Documentación completa
- `TEST_ACCOUNTS_QUICKSTART.md` - Esta guía

---

## Seguridad

⚠️ **Solo para desarrollo.** Nunca usar en producción.

---

## Soporte

¿Problemas? Verifica:
1. Backend corriendo: `python -m app.main`
2. Frontend corriendo: `npm start` (en /frontend)
3. MongoDB Atlas accesible
4. Variables de entorno en `.env` correctas
