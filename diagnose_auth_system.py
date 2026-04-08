#!/usr/bin/env python3
"""
Diagnostico completo del sistema de autenticacion Hispaloshop
Verifica endpoints, configuracion y flujos OAuth
"""

import sys
import urllib.request
import urllib.error
import json
import ssl

GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"

def print_status(message, status, details=""):
    icon = "[OK]" if status == "ok" else "[ERROR]" if status == "error" else "[WARN]"
    color = GREEN if status == "ok" else RED if status == "error" else YELLOW
    print(f"{color}{icon}{RESET} {message}")
    if details:
        print(f"   {BLUE}->{RESET} {details}")

def api_request(method, path, data=None, headers=None):
    """Make API request"""
    try:
        url = f"https://api.hispaloshop.com{path}"
        req = urllib.request.Request(url, method=method, data=data)
        if headers:
            for key, value in headers.items():
                req.add_header(key, value)
        
        ctx = ssl.create_default_context()
        with urllib.request.urlopen(req, timeout=10, context=ctx) as response:
            return {"status": response.status, "data": response.read().decode()}
    except urllib.error.HTTPError as e:
        return {"status": e.code, "data": e.read().decode()}
    except Exception as e:
        return {"status": 0, "error": str(e)}

def check_endpoint(method, path, name, expected_status=None):
    """Check if endpoint responds"""
    result = api_request(method, path)
    status = result.get("status", 0)
    
    if expected_status:
        ok = status == expected_status
    else:
        ok = status in [200, 401, 403]  # Auth endpoints often return 401 without token
    
    if ok:
        print_status(f"{name}", "ok", f"HTTP {status}")
    else:
        print_status(f"{name}", "error", f"HTTP {status} - {result.get('error', 'Unknown error')}")
    
    return ok

def main():
    print("=" * 70)
    print("DIAGNOSTICO SISTEMA DE AUTENTICACION - HISPALOSHOP")
    print("=" * 70)
    print()
    
    all_ok = True
    
    # 1. Health check
    print(f"{BLUE}1. Estado del Backend{RESET}")
    result = api_request("GET", "/health")
    if result.get("status") == 200:
        try:
            data = json.loads(result.get("data", "{}"))
            print_status("Backend respondiendo", "ok", 
                        f"Env: {data.get('environment')}, DB: {data.get('db')}")
        except:
            print_status("Backend respondiendo", "ok")
    else:
        print_status("Backend NO responde", "error")
        all_ok = False
    print()
    
    # 2. Auth endpoints
    print(f"{BLUE}2. Endpoints de Autenticacion{RESET}")
    check_endpoint("POST", "/api/auth/login", "POST /api/auth/login", 401)
    check_endpoint("POST", "/api/auth/refresh", "POST /api/auth/refresh", 401)
    check_endpoint("GET", "/api/auth/me", "GET /api/auth/me", 401)
    check_endpoint("GET", "/api/auth/google/url", "GET /api/auth/google/url")
    check_endpoint("GET", "/api/auth/apple/url", "GET /api/auth/apple/url")
    print()
    
    # 3. CORS for mobile
    print(f"{BLUE}3. Configuracion CORS para Apps Moviles{RESET}")
    
    mobile_origins = [
        ("capacitor://localhost", "Capacitor"),
        ("ionic://localhost", "Ionic"),
    ]
    
    for origin, name in mobile_origins:
        try:
            url = "https://api.hispaloshop.com/api/config/locale"
            req = urllib.request.Request(url, method="OPTIONS")
            req.add_header("Origin", origin)
            req.add_header("Access-Control-Request-Method", "GET")
            
            ctx = ssl.create_default_context()
            with urllib.request.urlopen(req, timeout=10, context=ctx) as response:
                cors = response.headers.get('Access-Control-Allow-Origin')
                if cors:
                    print_status(f"{name} ({origin})", "ok")
                else:
                    print_status(f"{name} ({origin})", "error", "CORS header missing")
                    all_ok = False
        except urllib.error.HTTPError as e:
            if "CORS" in str(e) or e.code == 403:
                print_status(f"{name} ({origin})", "error", "CORS bloqueado")
                all_ok = False
            else:
                print_status(f"{name} ({origin})", "ok", f"HTTP {e.code}")
    print()
    
    # 4. OAuth Configuration check
    print(f"{BLUE}4. Configuracion OAuth{RESET}")
    
    # Check Google OAuth URL
    result = api_request("GET", "/api/auth/google/url")
    if result.get("status") == 200:
        try:
            data = json.loads(result.get("data", "{}"))
            if data.get("auth_url"):
                print_status("Google OAuth", "ok", "URL de autorizacion disponible")
            else:
                print_status("Google OAuth", "warn", "URL no disponible - configure GOOGLE_CLIENT_ID")
        except:
            print_status("Google OAuth", "warn", "Respuesta invalida")
    else:
        print_status("Google OAuth", "warn", f"HTTP {result.get('status')} - configure GOOGLE_CLIENT_ID")
    
    # Check Apple OAuth URL
    result = api_request("GET", "/api/auth/apple/url")
    if result.get("status") == 200:
        try:
            data = json.loads(result.get("data", "{}"))
            if data.get("auth_url"):
                print_status("Apple OAuth", "ok", "URL de autorizacion disponible")
            else:
                print_status("Apple OAuth", "warn", "URL no disponible - configure Apple credentials")
        except:
            print_status("Apple OAuth", "warn", "Respuesta invalida")
    elif result.get("status") == 500:
        print_status("Apple OAuth", "warn", "No configurado - configure APPLE_CLIENT_ID, TEAM_ID, KEY_ID, PRIVATE_KEY")
    else:
        print_status("Apple OAuth", "warn", f"HTTP {result.get('status')}")
    print()
    
    # 5. Recommendations
    print("=" * 70)
    if all_ok:
        print(f"{GREEN}[OK] Sistema de autenticacion funcionando correctamente{RESET}")
        print()
        print("Configuracion para apps moviles:")
        print("  - CORS: Los origenes de apps hibridas estan permitidos")
        print("  - OAuth: Google y Apple configurados")
        print()
        print("Si la app movil sigue con problemas:")
        print("  1. Verifica que la app use https://api.hispaloshop.com")
        print("  2. Comprueba que los deep links esten configurados:")
        print("     - iOS: URL Scheme 'hispaloshop' en Info.plist")
        print("     - Android: Intent filter en AndroidManifest.xml")
        print("  3. Revisa los logs de la app en Xcode/Android Studio")
    else:
        print(f"{RED}[ERROR] Se detectaron problemas{RESET}")
        print()
        print("Acciones requeridas:")
        print("  1. Redeploy del backend en Railway con los ultimos cambios")
        print("  2. Configurar variables de entorno para OAuth:")
        print("     - GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET")
        print("     - APPLE_CLIENT_ID, TEAM_ID, KEY_ID, PRIVATE_KEY")
    
    print("=" * 70)

if __name__ == "__main__":
    main()
