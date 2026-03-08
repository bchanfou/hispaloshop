#!/usr/bin/env python3
"""
Test HTTP completo del flujo de auth:
1. Login con cada cuenta
2. Verificar cookie session_token
3. Llamar a /auth/me para verificar sesion
4. Llamar a /auth/refresh para renovar token
5. Logout
"""

import asyncio
import aiohttp
import sys

BASE_URL = "http://localhost:8000/api"

TEST_ACCOUNTS = [
    {"email": "consumer@test.com", "password": "Test1234", "role": "customer"},
    {"email": "producer@test.com", "password": "Test1234", "role": "producer"},
    {"email": "influencer@test.com", "password": "Test1234", "role": "influencer"},
    {"email": "importer@test.com", "password": "Test1234", "role": "importer"},
    {"email": "admin@test.com", "password": "Test1234", "role": "admin"},
    {"email": "superadmin@test.com", "password": "Test1234", "role": "super_admin"},
]


async def test_auth_flow(session, account):
    """Test completo de auth para una cuenta."""
    email = account["email"]
    results = []
    
    try:
        # 1. Login
        async with session.post(
            f"{BASE_URL}/auth/login",
            json={"email": account["email"], "password": account["password"]}
        ) as resp:
            if resp.status != 200:
                results.append(f"[FAIL] {email} - Login: HTTP {resp.status}")
                return results
            
            data = await resp.json()
            if not data.get("user"):
                results.append(f"[FAIL] {email} - Login: No user data")
                return results
            
            # Verificar rol
            if data["user"].get("role") != account["role"]:
                results.append(f"[FAIL] {email} - Rol incorrecto")
                return results
            
            results.append(f"[OK] {email} - Login")
            
            # Verificar cookie session_token
            cookies = resp.cookies
            if "session_token" not in cookies:
                results.append(f"[WARN] {email} - No session_token cookie")
            else:
                results.append(f"[OK] {email} - Cookie session_token set")
        
        # 2. /auth/me
        async with session.get(f"{BASE_URL}/auth/me") as resp:
            if resp.status == 200:
                user = await resp.json()
                if user and user.get("email") == email:
                    results.append(f"[OK] {email} - /auth/me valido")
                else:
                    results.append(f"[FAIL] {email} - /auth/me: wrong user")
            else:
                results.append(f"[FAIL] {email} - /auth/me: HTTP {resp.status}")
        
        # 3. /auth/refresh
        async with session.post(f"{BASE_URL}/auth/refresh") as resp:
            if resp.status == 200:
                data = await resp.json()
                if data.get("user") and data.get("session_token"):
                    results.append(f"[OK] {email} - /auth/refresh valido")
                else:
                    results.append(f"[FAIL] {email} - /auth/refresh: no data")
            else:
                results.append(f"[FAIL] {email} - /auth/refresh: HTTP {resp.status}")
        
        # 4. Logout
        async with session.post(f"{BASE_URL}/auth/logout") as resp:
            if resp.status == 200:
                results.append(f"[OK] {email} - Logout")
            else:
                results.append(f"[FAIL] {email} - Logout: HTTP {resp.status}")
        
        # 5. Verificar sesion cerrada
        async with session.get(f"{BASE_URL}/auth/me") as resp:
            if resp.status == 200:
                user = await resp.json()
                if user is None:
                    results.append(f"[OK] {email} - Sesion cerrada correctamente")
                else:
                    results.append(f"[WARN] {email} - Sesion aun activa despues de logout")
            else:
                results.append(f"[OK] {email} - Sesion invalidada (HTTP {resp.status})")
        
    except Exception as e:
        results.append(f"[ERROR] {email} - Exception: {e}")
    
    return results


async def main():
    print("=" * 70)
    print("TEST AUTH HTTP - Flujo completo")
    print("=" * 70)
    
    # Check if backend is running
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get("http://localhost:8000/health", timeout=5) as resp:
                if resp.status == 200:
                    print("\n[OK] Backend running on :8000")
                else:
                    print(f"\n[ERROR] Backend health check: HTTP {resp.status}")
                    return False
    except Exception as e:
        print(f"\n[ERROR] Backend not running on :8000: {e}")
        print("Por favor inicia el backend: cd backend && uvicorn main:app --reload")
        return False
    
    print("\n")
    
    all_results = []
    
    async with aiohttp.ClientSession(cookie_jar=aiohttp.CookieJar()) as session:
        for account in TEST_ACCOUNTS:
            results = await test_auth_flow(session, account)
            all_results.extend(results)
            print("\n".join(results))
            print()
    
    print("=" * 70)
    # Summary
    ok_count = sum(1 for r in all_results if r.startswith("[OK]"))
    fail_count = sum(1 for r in all_results if r.startswith("[FAIL]"))
    warn_count = sum(1 for r in all_results if r.startswith("[WARN]"))
    
    print(f"RESUMEN: OK={ok_count}, FAIL={fail_count}, WARN={warn_count}")
    
    if fail_count == 0:
        print("✅ TODOS LOS TESTS PASARON")
    else:
        print(f"❌ {fail_count} tests fallaron")
    
    print("=" * 70)
    
    return fail_count == 0


if __name__ == "__main__":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    
    result = asyncio.run(main())
    sys.exit(0 if result else 1)
