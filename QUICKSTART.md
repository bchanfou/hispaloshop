# Quickstart - Hispaloshop MVP

Guía rápida para ejecutar y probar el funnel completo.

## Requisitos

- Python 3.11+
- Node.js 18+
- MongoDB (local o Atlas)
- (Opcional) Stripe CLI para webhooks

## 1. Backend

### 1.1 Instalar dependencias
```bash
cd backend
pip install -r requirements.txt
```

### 1.2 Configurar variables de entorno
```bash
# Editar .env
JWT_SECRET=openssl rand -hex 32
MONGO_URL=mongodb://localhost:27017/hispaloshop
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 1.3 Iniciar MongoDB (si es local)
```bash
mongod --dbpath /ruta/a/tu/db
```

### 1.4 Verificar configuración
```bash
python verify_setup.py
# Debe mostrar: [OK] TODO ESTA CONFIGURADO CORRECTAMENTE
```

### 1.5 Crear datos semilla
```bash
python seed_mongodb.py
# Crea: 3 usuarios (customer, producer, influencer)
#       6 categorías
#       6 productos de prueba
```

### 1.6 Ejecutar backend
```bash
uvicorn main:app --reload --port 8000
```

Verificar: http://localhost:8000/health

## 2. Frontend

### 2.1 Instalar dependencias
```bash
cd frontend
npm install
```

### 2.2 Configurar variables de entorno
```bash
# Crear .env.local
REACT_APP_BACKEND_URL=http://localhost:8000
REACT_APP_API_PREFIX=/api
```

### 2.3 Ejecutar frontend
```bash
npm start
```

Abrir: http://localhost:3000

## 3. Test del Funnel

### 3.1 Registro
1. Ir a http://localhost:3000/register
2. Crear cuenta como Customer
3. Verificar login automático o hacer login manual

### 3.2 Crear Producto (como Producer)
1. Logout
2. Ir a /register y crear cuenta como Producer
3. Login como Producer
4. Ir a /producer/products
5. Crear producto:
   - Nombre: "Aceite Test MVP"
   - Precio: 15.99
   - Stock: 50
   - Categoría: Aceites

### 3.3 Ver Producto (como Customer)
1. Logout
2. Login como Customer (del paso 3.1)
3. Ir a /products
4. Ver producto creado en el listing
5. Click en producto para ver detalle

### 3.4 Añadir al Carrito
1. En página de producto, click "Añadir al carrito"
2. Verificar toast de éxito
3. Verificar badge del carrito actualizado

### 3.5 Ver Carrito
1. Click en icono de carrito
2. Ver producto añadido con cantidad y precio
3. Probar modificar cantidad

### 3.6 Checkout
1. Click "Proceder al pago"
2. Introducir dirección de envío
3. En Stripe Elements, usar tarjeta de test:
   - Número: 4242 4242 4242 4242
   - Fecha: 12/25
   - CVC: 123
4. Click "Pagar"

### 3.7 Confirmar Orden
1. Redirección a página de éxito
2. Ir a /orders
3. Ver orden creada con status "paid"

### 3.8 Dashboard Producer
1. Logout
2. Login como Producer
3. Ir a /producer/orders
4. Ver orden recién creada

## 4. Tests Automáticos

### 4.1 Ejecutar script de prueba
```bash
cd backend
python test_funnel.py
```

### 4.2 Tests manuales con curl
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

## 5. Troubleshooting

### Error: "Cannot connect to MongoDB"
- Verificar que MongoDB esté corriendo: `mongod --version`
- Verificar MONGO_URL en .env
- Probar conexión: `mongosh "mongodb://localhost:27017"`

### Error: "JWT_SECRET not set"
- Generar secreto: `openssl rand -hex 32`
- Añadir a .env: `JWT_SECRET=valor_generado`

### Error: "Cannot POST /api/cart"
- Verificar backend esté corriendo
- Verificar token JWT en headers
- Verificar ruta en main.py: `app.include_router(legacy_cart_router, prefix="/api")`

### Error: "Stripe payment failed"
- Verificar STRIPE_SECRET_KEY es de test (sk_test_...)
- Verificar frontend usa Stripe Elements correctamente
- Ver webhook secret configurado

## 6. Estructura de Datos en MongoDB

Después de completar el funnel, verificar en MongoDB:

```javascript
// Usuarios
db.users.find().pretty()

// Productos
db.products.find().pretty()

// Carritos
db.carts.find().pretty()

// Órdenes
db.orders.find().pretty()
```

## 7. Notas Importantes

- **Demo desactivado**: DEMO_MODE=false por defecto
- **Datos reales**: Todo persiste en MongoDB
- **Seguridad**: JWT_SECRET validado, no usar valor por defecto en prod
- **Stripe**: Usar solo claves de test (sk_test_, pk_test_)
- **PostgreSQL**: Preservado en _future_postgres/ para post-MVP

## 8. Comandos Útiles

```bash
# Limpiar caché Python
find . -type d -name __pycache__ -exec rm -rf {} +

# Reiniciar backend
pkill -f uvicorn
uvicorn main:app --reload

# Ver logs MongoDB
tail -f /var/log/mongodb/mongod.log

# Stripe CLI webhook
stripe listen --forward-to localhost:8000/api/webhooks/stripe
```

---

**Para soporte**: Revisar FUNNEL_STATUS.md y MOCK_AUDIT.md
