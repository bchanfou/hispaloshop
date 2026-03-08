"""
Test script para verificar el flujo de autenticación
"""
import asyncio
import httpx

BASE_URL = "http://localhost:8000/api"

async def test_health():
    """Test 1: Verificar que el backend está respondiendo"""
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(f"{BASE_URL}/health", timeout=5)
            print(f"✅ Health check: {resp.status_code}")
            return True
        except Exception as e:
            print(f"❌ Health check failed: {e}")
            return False

async def test_login():
    """Test 2: Login con credenciales de prueba"""
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                f"{BASE_URL}/auth/login",
                json={"email": "consumer@test.com", "password": "Test1234"},
                timeout=5
            )
            print(f"Login response: {resp.status_code}")
            print(f"Response body: {resp.text[:500]}")
            print(f"Cookies: {resp.cookies}")
            
            if resp.status_code == 200:
                print("✅ Login successful")
                return resp.cookies
            else:
                print(f"❌ Login failed: {resp.text}")
                return None
        except Exception as e:
            print(f"❌ Login error: {e}")
            return None

async def test_me(cookies):
    """Test 3: Obtener usuario actual con cookies"""
    async with httpx.AsyncClient(cookies=cookies) as client:
        try:
            resp = await client.get(
                f"{BASE_URL}/auth/me",
                timeout=5
            )
            print(f"Me response: {resp.status_code}")
            print(f"Me body: {resp.text[:500]}")
            if resp.status_code == 200:
                print("✅ Get current user successful")
                return True
            else:
                print(f"❌ Get current user failed")
                return False
        except Exception as e:
            print(f"❌ Get current user error: {e}")
            return False

async def test_google_url():
    """Test 4: Obtener URL de Google OAuth"""
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                f"{BASE_URL}/auth/google/url",
                timeout=5
            )
            print(f"Google URL response: {resp.status_code}")
            print(f"Google URL body: {resp.text[:500]}")
            if resp.status_code == 200:
                print("✅ Google URL obtained")
                return True
            else:
                print(f"❌ Google URL failed")
                return False
        except Exception as e:
            print(f"❌ Google URL error: {e}")
            return False

async def main():
    print("=" * 60)
    print("AUTHENTICATION FLOW TEST")
    print("=" * 60)
    
    # Test 1: Health
    print("\n1. Testing /health...")
    if not await test_health():
        print("Backend no está respondiendo. Verifica que esté corriendo en localhost:8000")
        return
    
    # Test 2: Login
    print("\n2. Testing /auth/login...")
    cookies = await test_login()
    
    # Test 3: Get current user
    if cookies:
        print("\n3. Testing /auth/me with cookies...")
        await test_me(cookies)
    else:
        print("\n3. Skipping /auth/me (no cookies)")
    
    # Test 4: Google URL
    print("\n4. Testing /auth/google/url...")
    await test_google_url()
    
    print("\n" + "=" * 60)
    print("TEST COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
