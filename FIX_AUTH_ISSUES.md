# Solución de Problemas de Login/Registro

## Problema Encontrado

El backend no puede conectar a MongoDB, por lo que no puede procesar registros ni logins.

## Solución Paso a Paso

### Opción 1: Instalar y ejecutar MongoDB local (Más fácil)

1. **Descarga MongoDB Community Server:**
   - Ve a: https://www.mongodb.com/try/download/community
   - Descarga el MSI para Windows
   - Instala con la opción "Complete"

2. **Inicia MongoDB:**
   ```bash
   # Abre PowerShell como Administrador
   net start MongoDB
   ```

   O si no está instalado como servicio:
   ```bash
   # Crea directorio para datos
   mkdir C:\data\db
   
   # Inicia MongoDB
   "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe"
   ```

3. **Verifica que funcione:**
   ```bash
   cd backend
   python diagnose_auth.py
   ```

### Opción 2: Usar MongoDB Atlas (Cloud - Gratis)

1. **Crea cuenta gratuita:**
   - Ve a: https://www.mongodb.com/cloud/atlas/register
   - Crea una cuenta gratuita

2. **Crea un cluster:**
   - Elige "Shared" (gratis)
   - Selecciona región más cercana a ti
   - Espera a que se cree (2-3 minutos)

3. **Configura acceso:**
   - Ve a "Database Access" → "Add New Database User"
   - Crea usuario con contraseña
   - Ve a "Network Access" → "Add IP Address"
   - Agrega tu IP actual (o `0.0.0.0/0` para permitir todas)

4. **Obtén el connection string:**
   - Ve a "Database" → "Connect" → "Drivers"
   - Copia el string que se ve así:
     ```
     mongodb+srv://usuario:password@cluster.mongodb.net/hispaloshop?retryWrites=true&w=majority
     ```

5. **Actualiza el archivo .env:**
   ```bash
   # Edita backend/.env
   MONGO_URL=mongodb+srv://tu_usuario:tu_password@cluster.mongodb.net/hispaloshop?retryWrites=true&w=majority
   ```

### Opción 3: Usar Docker (Si tienes Docker instalado)

```bash
# Ejecuta MongoDB en Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Verifica que esté corriendo
docker ps
```

---

## Verificar que todo funcione

1. **Ejecuta el diagnóstico:**
   ```bash
   python diagnose_auth.py
   ```
   Debería decir: "DIAGNOSTICO COMPLETADO - TODO OK"

2. **Inicia el backend:**
   ```bash
   cd backend
   uvicorn main:app --reload --port 8000
   ```

3. **Verifica health check:**
   Abre navegador en: http://localhost:8000/health
   Debe mostrar: `{"status": "ok", "version": "1.0.0"}`

4. **Prueba el registro:**
   - Abre frontend: http://localhost:3000/register
   - Intenta registrarte con un email nuevo

---

## Errores comunes y soluciones

### Error: "Email already registered"
- El email ya existe en la base de datos
- Usa otro email o verifica en MongoDB

### Error: "Analytics consent is required"
- El checkbox de consentimiento no está marcado
- Marca el checkbox de "Acepto el tratamiento de datos"

### Error: "Your account is pending admin approval"
- Los usuarios producer/importer necesitan aprobación
- Para test, usa los usuarios de seed que ya están aprobados:
  - producer@mvp.com / Test1234
  - importer@mvp.com / Test1234

### Error CORS en navegador
- Verifica que `ALLOWED_ORIGINS` en backend/.env incluya `http://localhost:3000`
- Reinicia el backend después de cambiar .env

---

## Usuarios de Test (Pre-cargados)

Después de configurar MongoDB, ejecuta:
```bash
cd backend
python seed_multiseller.py
```

Esto crea:
- `customer@test.com` / `Test1234`
- `producer@mvp.com` / `Test1234` (aprobado)
- `importer@mvp.com` / `Test1234` (aprobado)
- `admin@mvp.com` / `Test1234`

---

## Resumen de comandos para iniciar todo

**Terminal 1 - Backend:**
```bash
cd backend
uvicorn main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

**Acceder a la app:**
- Frontend: http://localhost:3000
- API Docs: http://localhost:8000/docs
- Health: http://localhost:8000/health
