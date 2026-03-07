#!/usr/bin/env python3
"""
Script de diagnostico para problemas de autenticacion
"""
import os
import sys

# Cargar variables de entorno desde backend/.env
from pathlib import Path
from dotenv import load_dotenv
backend_dir = Path(__file__).parent / "backend"
env_file = backend_dir / ".env"
if env_file.exists():
    load_dotenv(env_file)
    print(f"[INFO] Cargado {env_file}")
else:
    print(f"[WARN] No se encontro {env_file}")

import asyncio

# Verificar variables de entorno primero
print("=" * 60)
print("DIAGNOSTICO DE AUTENTICACION")
print("=" * 60)

required_vars = ["JWT_SECRET", "MONGO_URL", "STRIPE_SECRET_KEY"]
missing_vars = []

for var in required_vars:
    value = os.getenv(var)
    if not value:
        missing_vars.append(var)
        print(f"[ERROR] {var}: NO CONFIGURADA")
    else:
        print(f"[OK] {var}: Configurada ({len(value)} caracteres)")

if missing_vars:
    print()
    print("=" * 60)
    print("PROBLEMA CRITICO: Faltan variables de entorno requeridas")
    print("=" * 60)
    print("El backend NO arrancara sin estas variables.")
    print("\nPara arreglar:")
    print("1. Copia backend/.env.example a backend/.env")
    print("2. Rellena las variables:")
    print("   - JWT_SECRET: genera con 'openssl rand -hex 32'")
    print("   - MONGO_URL: string de conexion a MongoDB")
    print("   - STRIPE_SECRET_KEY: clave de Stripe (test mode)")
    sys.exit(1)

# Intentar importar y conectar
print()
print("=" * 60)
print("VERIFICACION DE CONEXION A BASE DE DATOS")
print("=" * 60)

try:
    from motor.motor_asyncio import AsyncIOMotorClient
    
    mongo_url = os.getenv("MONGO_URL")
    client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
    
    # Verificar conexion
    async def check_db():
        try:
            await client.admin.command('ping')
            print("[OK] Conexion a MongoDB exitosa")
            
            # Verificar base de datos
            db_name = os.getenv("DB_NAME", "hispaloshop")
            db = client[db_name]
            
            # Verificar colecciones
            collections = await db.list_collection_names()
            print(f"[OK] Base de datos: {db_name}")
            print(f"[INFO] Colecciones existentes: {', '.join(collections) if collections else 'Ninguna (nueva DB)'}")
            
            # Verificar si hay usuarios de test
            if "users" in collections:
                users_count = await db.users.count_documents({})
                print(f"[INFO] Usuarios en base de datos: {users_count}")
                
                if users_count > 0:
                    test_users = await db.users.find({
                        "email": {"$in": ["customer@test.com", "producer@mvp.com", "importer@mvp.com"]}
                    }, {"email": 1, "role": 1, "approved": 1}).to_list(10)
                    
                    if test_users:
                        print("[OK] Usuarios de test encontrados:")
                        for u in test_users:
                            print(f"       - {u['email']} ({u['role']}) approved={u.get('approved', False)}")
                    else:
                        print("[WARN] No se encontraron usuarios de test")
                        print("[INFO] Ejecuta: cd backend && python seed_multiseller.py")
            
            return True
        except Exception as e:
            print(f"[ERROR] No se puede conectar a MongoDB: {e}")
            return False
        finally:
            client.close()
    
    result = asyncio.run(check_db())
    
    if not result:
        print()
        print("=" * 60)
        print("PROBLEMA: No se puede conectar a MongoDB")
        print("=" * 60)
        print("\nPosibles causas:")
        print("- MongoDB no esta corriendo (local)")
        print("- IP no esta en whitelist de MongoDB Atlas")
        print("- String de conexion incorrecto")
        sys.exit(1)
        
except ImportError as e:
    print(f"[ERROR] No se pueden importar dependencias: {e}")
    print("[INFO] Instala dependencias: cd backend && pip install -r requirements.txt")
    sys.exit(1)

print()
print("=" * 60)
print("VERIFICACION DE BACKEND")
print("=" * 60)

# Verificar que el backend puede iniciar
try:
    # Solo verificamos imports, no iniciamos el servidor
    sys.path.insert(0, 'backend')
    from core.models import RegisterInput, LoginInput
    print("[OK] Modelos Pydantic cargados correctamente")
    
    # Verificar campos requeridos
    print("[INFO] Campos requeridos para registro:")
    print("       - email, name, password, role, country")
    print("       - analytics_consent (obligatorio para customers)")
    
    print("[INFO] Validaciones de login:")
    print("       - Producers/Importers requieren approved=True")
    
except Exception as e:
    print(f"[ERROR] Error al importar backend: {e}")
    sys.exit(1)

print()
print("=" * 60)
print("DIAGNOSTICO COMPLETADO - TODO OK")
print("=" * 60)
print("\nEl backend deberia funcionar correctamente.")
print("Para iniciar el backend:")
print("  cd backend")
print("  uvicorn main:app --reload --port 8000")
print("\nPara verificar que esta corriendo:")
print("  curl http://localhost:8000/health")
