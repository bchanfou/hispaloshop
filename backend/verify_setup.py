#!/usr/bin/env python3
"""
Script de verificacion de configuracion antes de ejecutar el funnel.
Verifica que todas las dependencias y configuraciones esten correctas.
"""
import os
import sys
import importlib

def check_import(module_name, package_name=None):
    """Verificar si un modulo esta instalado"""
    try:
        importlib.import_module(module_name)
        return True, f"[OK] {package_name or module_name}"
    except ImportError:
        return False, f"[FAIL] {package_name or module_name} - instalar con: pip install {package_name or module_name}"

def check_env_vars():
    """Verificar variables de entorno"""
    print("\n[CONFIG] Variables de Entorno:")
    print("-" * 40)
    
    required = ["JWT_SECRET", "MONGO_URL", "STRIPE_SECRET_KEY"]
    optional = ["STRIPE_WEBHOOK_SECRET", "CLOUDINARY_CLOUD_NAME", "REDIS_URL"]
    
    all_ok = True
    
    for var in required:
        value = os.getenv(var)
        if value:
            display = value[:10] + "..." if len(value) > 10 else value
            print(f"   [OK] {var}: {display}")
        else:
            print(f"   [FAIL] {var}: NO ESTA CONFIGURADA")
            all_ok = False
    
    for var in optional:
        value = os.getenv(var)
        if value:
            print(f"   [OK] {var}: configurada")
        else:
            print(f"   [WARN] {var}: no configurada (opcional)")
    
    return all_ok

def check_dependencies():
    """Verificar dependencias de Python"""
    print("\n[DEPS] Dependencias Python:")
    print("-" * 40)
    
    dependencies = [
        ("fastapi", "fastapi"),
        ("uvicorn", "uvicorn"),
        ("motor", "motor"),
        ("bcrypt", "bcrypt"),
        ("pydantic", "pydantic"),
        ("pydantic_settings", "pydantic-settings"),
        ("stripe", "stripe"),
        ("requests", "requests"),
    ]
    
    all_ok = True
    for module, package in dependencies:
        ok, msg = check_import(module, package)
        print(f"   {msg}")
        if not ok:
            all_ok = False
    
    return all_ok

def check_mongodb_connection():
    """Verificar conexion a MongoDB"""
    print("\n[DB] Conexion MongoDB:")
    print("-" * 40)
    
    mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.getenv("DB_NAME", "hispaloshop")
    
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        import asyncio
        
        async def test_connection():
            client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
            await client.admin.command('ping')
            db = client[db_name]
            collections = await db.list_collection_names()
            client.close()
            return collections
        
        collections = asyncio.run(test_connection())
        print(f"   [OK] Conexion exitosa a: {mongo_url}")
        print(f"   [INFO] Base de datos: {db_name}")
        print(f"   [INFO] Colecciones existentes: {len(collections)}")
        if collections:
            for coll in collections[:5]:
                print(f"      - {coll}")
            if len(collections) > 5:
                print(f"      ... y {len(collections) - 5} mas")
        return True
        
    except Exception as e:
        print(f"   [FAIL] Error conectando a MongoDB: {e}")
        print(f"   [HINT] Verifica que MongoDB este corriendo:")
        print(f"      - Local: mongod --dbpath /ruta/a/db")
        print(f"      - Docker: docker run -p 27017:27017 mongo")
        return False

def check_backend_structure():
    """Verificar estructura del backend"""
    print("\n[FILES] Estructura Backend:")
    print("-" * 40)
    
    required_files = [
        "main.py",
        "config.py",
        "routes/auth.py",
        "routes/products.py",
        "routes/cart.py",
        "routes/orders.py",
    ]
    
    all_ok = True
    for file in required_files:
        if os.path.exists(file):
            print(f"   [OK] {file}")
        else:
            print(f"   [FAIL] {file} - NO ENCONTRADO")
            all_ok = False
    
    return all_ok

def main():
    print("=" * 60)
    print("VERIFICACION DE CONFIGURACION - Hispaloshop MVP")
    print("=" * 60)
    
    checks = [
        ("Dependencias", check_dependencies()),
        ("Variables de Entorno", check_env_vars()),
        ("Estructura", check_backend_structure()),
        ("MongoDB", check_mongodb_connection()),
    ]
    
    print("\n" + "=" * 60)
    print("RESUMEN")
    print("=" * 60)
    
    all_ok = all(result for _, result in checks)
    
    for name, result in checks:
        status = "[PASS]" if result else "[FAIL]"
        print(f"{status}: {name}")
    
    if all_ok:
        print("\n[OK] TODO ESTA CONFIGURADO CORRECTAMENTE")
        print("\nProximos pasos:")
        print("   1. Ejecutar seed: python seed_mongodb.py")
        print("   2. Iniciar backend: uvicorn main:app --reload")
        print("   3. Verificar: curl http://localhost:8000/health")
        return 0
    else:
        print("\n[ERROR] HAY PROBLEMAS QUE CORREGIR")
        print("\nCorrecciones comunes:")
        print("   - Instalar dependencias: pip install -r requirements.txt")
        print("   - Configurar .env: copiar .env.example a .env y editar")
        print("   - Iniciar MongoDB: mongod --dbpath /ruta/a/db")
        return 1

if __name__ == "__main__":
    sys.exit(main())
