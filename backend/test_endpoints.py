#!/usr/bin/env python3
"""
Test rápido de endpoints críticos del backend
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.database import connect_db, db

async def test_endpoints():
    """Verifica que las colecciones necesarias existen"""
    print("=" * 60)
    print("TEST ENDPOINTS - Verificando colecciones MongoDB")
    print("=" * 60)
    
    try:
        await connect_db()
        print("\n[OK] Conectado a MongoDB")
    except Exception as e:
        print(f"\n[ERROR] {e}")
        return False
    
    # Verificar colecciones críticas
    collections = [
        'users',
        'products',
        'posts',
        'orders',
        'stores',
        'user_sessions',
    ]
    
    all_ok = True
    for coll_name in collections:
        try:
            count = await db[coll_name].estimated_document_count()
            print(f"[OK] {coll_name}: {count} documentos")
        except Exception as e:
            print(f"[ERROR] {coll_name}: {e}")
            all_ok = False
    
    # Verificar usuarios de test
    print("\n--- Usuarios de Test ---")
    test_emails = [
        'consumer@test.com',
        'producer@test.com',
        'influencer@test.com',
        'importer@test.com',
        'admin@test.com',
        'superadmin@test.com'
    ]
    
    for email in test_emails:
        user = await db.users.find_one({'email': email})
        if user:
            print(f"[OK] {email} ({user.get('role', 'unknown')})")
        else:
            print(f"[MISSING] {email}")
    
    print("\n" + "=" * 60)
    if all_ok:
        print("RESULTADO: Todas las colecciones OK")
    else:
        print("RESULTADO: Algunas colecciones faltan")
    print("=" * 60)
    
    return all_ok

if __name__ == "__main__":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    
    result = asyncio.run(test_endpoints())
    sys.exit(0 if result else 1)
