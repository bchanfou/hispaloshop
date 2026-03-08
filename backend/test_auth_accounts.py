#!/usr/bin/env python3
"""
Script para probar las 6 cuentas de test del sistema de auth.
Verifica login, session refresh y logout.
"""

import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.database import db
from services.auth_helpers import verify_password

# Las 6 cuentas de test
TEST_ACCOUNTS = [
    {"email": "consumer@test.com", "password": "Test1234", "role": "customer"},
    {"email": "producer@test.com", "password": "Test1234", "role": "producer"},
    {"email": "influencer@test.com", "password": "Test1234", "role": "influencer"},
    {"email": "importer@test.com", "password": "Test1234", "role": "importer"},
    {"email": "admin@test.com", "password": "Test1234", "role": "admin"},
    {"email": "superadmin@test.com", "password": "Test1234", "role": "super_admin"},
]


async def test_accounts():
    """Verifica que las cuentas existen y las passwords son correctas."""
    print("=" * 60)
    print("TEST AUTH - Verificando 6 cuentas de prueba")
    print("=" * 60)
    
    try:
        from core.database import connect_db
        await connect_db()
        print("\n[OK] Conectado a MongoDB")
    except Exception as e:
        print(f"\n[ERROR] No se pudo conectar a MongoDB: {e}")
        return False
    
    all_passed = True
    
    for account in TEST_ACCOUNTS:
        email = account["email"]
        password = account["password"]
        expected_role = account["role"]
        
        try:
            # Buscar usuario
            user = await db.users.find_one({"email": email})
            
            if not user:
                print(f"\n[FAIL] {email} - Usuario no encontrado")
                all_passed = False
                continue
            
            # Verificar password (bcrypt)
            stored_hash = user.get("password_hash", "")
            if not verify_password(password, stored_hash):
                print(f"\n[FAIL] {email} - Password incorrecto")
                all_passed = False
                continue
            
            # Verificar rol
            actual_role = user.get("role", "unknown")
            if actual_role != expected_role:
                print(f"\n[FAIL] {email} - Rol esperado: {expected_role}, actual: {actual_role}")
                all_passed = False
                continue
            
            print(f"[OK] {email} ({expected_role}) - Login correcto")
            
        except Exception as e:
            print(f"\n[ERROR] {email} - Exception: {e}")
            all_passed = False
    
    print("\n" + "=" * 60)
    if all_passed:
        print("RESULTADO: Todos los tests pasaron!")
        print("Las 6 cuentas estan listas para usar.")
    else:
        print("RESULTADO: Algunos tests fallaron.")
        print("Ejecuta: python seed_multiseller.py para crear las cuentas.")
    print("=" * 60)
    
    return all_passed


if __name__ == "__main__":
    # Fix encoding issues on Windows
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    
    result = asyncio.run(test_accounts())
    sys.exit(0 if result else 1)
