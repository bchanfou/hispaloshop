#!/usr/bin/env python3
"""
Script de prueba del funnel MVP end-to-end
Ejecutar: python test_funnel.py
"""
import requests
import json
import sys

BASE_URL = "http://localhost:8000"
API_URL = f"{BASE_URL}/api"

# Colores para output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
RESET = "\033[0m"

def print_success(msg):
    print(f"{GREEN}✅ {msg}{RESET}")

def print_error(msg):
    print(f"{RED}❌ {msg}{RESET}")

def print_warning(msg):
    print(f"{YELLOW}⚠️ {msg}{RESET}")

def test_health():
    """Test 1: Health check"""
    print("\n=== Test 1: Health Check ===")
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            print_success("Health check OK")
            return True
        else:
            print_error(f"Health check falló: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Error conectando: {e}")
        return False

def test_register_customer():
    """Test 2: Registro de customer"""
    print("\n=== Test 2: Registro Customer ===")
    try:
        data = {
            "email": "test_customer_mvp@example.com",
            "password": "Test1234",
            "full_name": "Test Customer MVP",
            "role": "customer",
            "country": "ES"
        }
        response = requests.post(
            f"{API_URL}/auth/register",
            json=data,
            timeout=10
        )
        
        if response.status_code == 201:
            print_success("Registro customer exitoso")
            return response.json()
        elif response.status_code == 400 and "already" in response.text.lower():
            print_warning("Usuario ya existe (continuando...)")
            return {"email": data["email"], "password": data["password"]}
        else:
            print_error(f"Registro falló: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print_error(f"Error en registro: {e}")
        return None

def test_login(email, password):
    """Test 3: Login"""
    print(f"\n=== Test 3: Login ({email}) ===")
    try:
        # Intentar login con email
        data = {"email": email, "password": password}
        response = requests.post(
            f"{API_URL}/auth/login",
            json=data,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            print_success("Login exitoso")
            return result.get("token") or result.get("access_token")
        else:
            print_error(f"Login falló: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print_error(f"Error en login: {e}")
        return None

def test_get_products():
    """Test 4: Listar productos"""
    print("\n=== Test 4: Listar Productos ===")
    try:
        response = requests.get(
            f"{API_URL}/products?approved_only=true",
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            products = data.get("products", data) if isinstance(data, dict) else data
            print_success(f"Productos obtenidos: {len(products)}")
            return products
        else:
            print_error(f"Error obteniendo productos: {response.status_code}")
            return []
    except Exception as e:
        print_error(f"Error: {e}")
        return []

def test_get_cart(token):
    """Test 5: Ver carrito (requiere auth)"""
    print("\n=== Test 5: Ver Carrito ===")
    if not token:
        print_warning("Sin token, saltando...")
        return None
    
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(
            f"{API_URL}/cart",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            print_success("Carrito obtenido")
            return response.json()
        elif response.status_code == 401:
            print_warning("No autorizado (token inválido)")
            return None
        else:
            print_error(f"Error: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print_error(f"Error: {e}")
        return None

def test_add_to_cart(token, product_id):
    """Test 6: Añadir al carrito"""
    print(f"\n=== Test 6: Añadir al Carrito ({product_id}) ===")
    if not token:
        print_warning("Sin token, saltando...")
        return None
    
    try:
        headers = {"Authorization": f"Bearer {token}"}
        data = {
            "product_id": product_id,
            "quantity": 1
        }
        response = requests.post(
            f"{API_URL}/cart/add",
            headers=headers,
            json=data,
            timeout=10
        )
        
        if response.status_code == 200:
            print_success("Producto añadido al carrito")
            return response.json()
        else:
            print_error(f"Error: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print_error(f"Error: {e}")
        return None

def run_all_tests():
    """Ejecutar todos los tests en secuencia"""
    print("=" * 60)
    print("FUNNEL TEST MVP - Hispaloshop")
    print("=" * 60)
    
    results = {
        "health": False,
        "register": None,
        "login": None,
        "products": [],
        "cart_get": None,
        "cart_add": None,
    }
    
    # Test 1: Health
    results["health"] = test_health()
    if not results["health"]:
        print_error("\n❌ Backend no responde. Abortando tests.")
        sys.exit(1)
    
    # Test 2: Registro
    results["register"] = test_register_customer()
    
    # Test 3: Login
    if results["register"]:
        email = results["register"].get("email", "test_customer_mvp@example.com")
        password = "Test1234"
        results["login"] = test_login(email, password)
    
    # Test 4: Productos
    results["products"] = test_get_products()
    
    # Test 5: Carrito (get)
    token = results["login"] if isinstance(results["login"], str) else None
    results["cart_get"] = test_get_cart(token)
    
    # Test 6: Añadir al carrito (si hay productos)
    if token and results["products"] and len(results["products"]) > 0:
        product = results["products"][0]
        product_id = product.get("product_id") or product.get("id")
        if product_id:
            results["cart_add"] = test_add_to_cart(token, product_id)
    
    # Resumen
    print("\n" + "=" * 60)
    print("RESUMEN DE TESTS")
    print("=" * 60)
    
    passed = sum([
        results["health"],
        results["register"] is not None,
        results["login"] is not None,
        len(results["products"]) > 0,
    ])
    
    total = 5
    
    print(f"\nTests pasados: {passed}/{total}")
    
    if passed == total:
        print_success("\n✅ TODOS LOS TESTS PASARON")
        return 0
    else:
        print_warning(f"\n⚠️ {total - passed} test(s) fallaron o no completaron")
        return 1

if __name__ == "__main__":
    sys.exit(run_all_tests())
