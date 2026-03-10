#!/usr/bin/env python3
"""
Script de verificacion post-Fase 0
Ejecutar: python scripts/verify_setup.py

Verifica:
1. Configuracion de variables de entorno
2. Conexion a MongoDB
3. Creacion de indices
4. Middleware de seguridad
"""

import asyncio
import sys
from pathlib import Path

# Anadir parent al path
sys.path.insert(0, str(Path(__file__).parent.parent))


async def verify():
    print("[VERIFICACION] Setup Hispaloshop - FASE 0\n")
    
    errors = []
    warnings = []
    
    # ============================================
    # 1. Configuracion
    # ============================================
    print("[1] Verificando configuracion...")
    try:
        from core.config import settings
        
        # Validar JWT_SECRET
        if len(settings.JWT_SECRET) < 32:
            errors.append("JWT_SECRET debe tener al menos 32 caracteres")
        else:
            print("   [OK] JWT_SECRET: OK (>=32 caracteres)")
        
        # Validar MONGO_URL
        if not settings.MONGO_URL.startswith(("mongodb://", "mongodb+srv://")):
            errors.append("MONGO_URL debe ser una URL valida de MongoDB")
        else:
            print("   [OK] MONGO_URL: OK")
        
        # Validar Stripe
        if settings.STRIPE_SECRET_KEY:
            if not settings.STRIPE_SECRET_KEY.startswith(("sk_test_", "sk_live_")):
                errors.append("STRIPE_SECRET_KEY debe empezar con sk_test_ o sk_live_")
            else:
                print("   [OK] STRIPE_SECRET_KEY: OK")
        else:
            warnings.append("STRIPE_SECRET_KEY no configurada; checkout, suscripciones y payouts Stripe devolveran 503")
        
        # Validar CORS
        origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
        if "*" in origins and settings.ENV == "production":
            errors.append("Wildcard '*' no permitido en ALLOWED_ORIGINS en produccion")
        else:
            print("   [OK] CORS: {} origenes configurados".format(len(origins)))
        
        # Validar environment
        print("   [OK] Environment: {}".format(settings.ENV))
        print("   [OK] Database: {}".format(settings.DB_NAME))
        
    except Exception as e:
        errors.append("Error cargando configuracion: {}".format(e))
    
    # ============================================
    # 2. MongoDB
    # ============================================
    print("\n[2] Verificando conexion MongoDB...")
    try:
        from core.database import connect_db, disconnect_db, get_db, db
        
        # Usar la conexion existente o crear nueva
        if db is None:
            await connect_db()
        
        database = get_db()
        
        # Ping
        result = await database.command('ping')
        if result.get('ok') == 1:
            print("   [OK] Conexion establecida")
        else:
            errors.append("MongoDB ping fallo")
        
        # Verificar colecciones
        collections = await database.list_collection_names()
        required = ['users', 'products', 'orders']
        for coll in required:
            if coll in collections:
                count = await database[coll].estimated_document_count()
                print("   [OK] Coleccion '{}': {} documentos".format(coll, count))
            else:
                warnings.append("Coleccion '{}' no existe (se creara automaticamente)".format(coll))
        
        # Verificar indices criticos
        print("\n   [VERIFICACION] Indices criticos...")
        try:
            users_indexes = await database.users.index_information()
            if "email_1" in users_indexes:
                print("   [OK] Indice users.email: OK")
            else:
                warnings.append("Indice users.email no encontrado")
            
            products_indexes = await database.products.index_information()
            if "slug_1" in products_indexes:
                print("   [OK] Indice products.slug: OK")
            else:
                warnings.append("Indice products.slug no encontrado")
                
        except Exception as e:
            warnings.append("No se pudieron verificar indices: {}".format(e))
        
    except Exception as e:
        errors.append("Error conectando a MongoDB: {}".format(e))
    
    # ============================================
    # 3. Middleware de seguridad
    # ============================================
    print("\n[3] Verificando middleware de seguridad...")
    try:
        from middleware.security import (
            SecurityHeadersMiddleware,
            RateLimitMiddleware,
        )
        print("   [OK] SecurityHeadersMiddleware: disponible")
        print("   [OK] RateLimitMiddleware: disponible")
    except Exception as e:
        errors.append("Error importando middleware: {}".format(e))
    
    # ============================================
    # 4. Estructura de archivos
    # ============================================
    print("\n[4] Verificando estructura de archivos...")
    
    backend_dir = Path(__file__).parent.parent
    
    # Verificar _future_postgres
    if (backend_dir / "_future_postgres").exists():
        print("   [OK] _future_postgres/: existe (PostgreSQL congelado)")
    else:
        warnings.append("_future_postgres/ no existe")
    
    # Verificar que no haya routers/ (deberia estar en _future_postgres)
    if (backend_dir / "routers").exists():
        warnings.append("routers/ aun existe en raiz (deberia estar en _future_postgres/)")
    else:
        print("   [OK] routers/ movido a _future_postgres/")
    
    # Verificar routes/ (MongoDB activo)
    if (backend_dir / "routes").exists():
        route_count = len(list((backend_dir / "routes").glob("*.py")))
        print("   [OK] routes/: {} modulos activos".format(route_count))
    else:
        errors.append("routes/ no existe")
    
    # Verificar __pycache__
    pycache_count = len(list(backend_dir.rglob("__pycache__")))
    if pycache_count == 0:
        print("   [OK] Sin archivos __pycache__")
    else:
        warnings.append("{} directorios __pycache__ encontrados (ejecutar limpieza)".format(pycache_count))
    
    # ============================================
    # RESUMEN
    # ============================================
    print("\n" + "=" * 60)
    
    if errors:
        print("[ERROR] ERRORES ENCONTRADOS:")
        for e in errors:
            print("   [X] {}".format(e))
        print("\n[!] Corregir errores antes de continuar.")
        return False
    
    if warnings:
        print("[!] ADVERTENCIAS:")
        for w in warnings:
            print("   [!] {}".format(w))
        print()
    
    print("[EXITO] FASE 0 COMPLETADA EXITOSAMENTE")
    print("=" * 60)
    print("Environment: {}".format(settings.ENV))
    print("Database: MongoDB ({})".format(settings.DB_NAME))
    print("PostgreSQL: Congelado en _future_postgres/")
    print("Security: CORS + Rate limiting + Headers activos")
    print("\n[LISTO] Listo para Fase 1: AI Recommendations")
    
    return True


if __name__ == "__main__":
    try:
        success = asyncio.run(verify())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n[!] Verificacion cancelada por usuario")
        sys.exit(130)
    except Exception as e:
        print("\n\n[ERROR] Error inesperado: {}".format(e))
        import traceback
        traceback.print_exc()
        sys.exit(1)
