#!/usr/bin/env python3
"""
Diagnostico de conexion movil para Hispaloshop
Verifica el estado del backend y configuracion CORS para apps moviles
"""

import sys
import urllib.request
import urllib.error
import json
import ssl

# Colores para terminal
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

def check_backend_health():
    """Verifica si el backend responde al health check"""
    try:
        url = "https://api.hispaloshop.com/health"
        ctx = ssl.create_default_context()
        with urllib.request.urlopen(url, timeout=10, context=ctx) as response:
            data = json.loads(response.read().decode())
            return {
                "status": "ok",
                "data": data
            }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }

def check_cors_origin(origin):
    """Verifica si un origen especifico esta permitido por CORS"""
    try:
        url = "https://api.hispaloshop.com/api/config/locale"
        req = urllib.request.Request(
            url,
            method="OPTIONS",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "GET"
            }
        )
        ctx = ssl.create_default_context()
        with urllib.request.urlopen(req, timeout=10, context=ctx) as response:
            cors_header = response.headers.get('Access-Control-Allow-Origin')
            if cors_header == origin or cors_header == "*":
                return {"status": "ok", "allowed": True}
            return {"status": "error", "allowed": False, "header": cors_header}
    except urllib.error.HTTPError as e:
        if e.code == 403 or "CORS" in str(e.reason).upper() or "Disallowed" in str(e):
            return {"status": "error", "allowed": False, "error": "CORS rejected"}
        return {"status": "error", "error": str(e)}
    except Exception as e:
        return {"status": "error", "error": str(e)}

def main():
    print("=" * 60)
    print("DIAGNOSTICO DE CONEXION MOVIL - HISPALOSHOP")
    print("=" * 60)
    print()
    
    # 1. Verificar estado del backend
    print(f"{BLUE}1. Estado del Backend{RESET}")
    health = check_backend_health()
    if health["status"] == "ok":
        data = health["data"]
        print_status(
            f"Backend respondiendo correctamente",
            "ok",
            f"Environment: {data.get('environment', 'unknown')}, DB: {data.get('db', 'unknown')}, Latency: {data.get('db_latency_ms', 'N/A')}ms"
        )
    else:
        print_status(
            "Backend NO responde",
            "error",
            health.get("error", "Unknown error")
        )
        print()
        print(f"{RED}El backend parece estar caido. Verifica Railway Dashboard.{RESET}")
        sys.exit(1)
    
    print()
    
    # 2. Verificar CORS para cada origen
    print(f"{BLUE}2. Configuracion CORS{RESET}")
    
    origins_to_test = [
        ("https://hispaloshop.com", "Web principal"),
        ("https://www.hispaloshop.com", "Web www"),
        ("capacitor://localhost", "App Capacitor"),
        ("ionic://localhost", "App Ionic"),
        ("http://localhost", "Desarrollo local"),
        ("file://", "App Cordova/WebView"),
    ]
    
    all_ok = True
    for origin, description in origins_to_test:
        result = check_cors_origin(origin)
        if result["status"] == "ok" and result.get("allowed"):
            print_status(f"{description} ({origin})", "ok")
        else:
            print_status(
                f"{description} ({origin})",
                "error",
                result.get("error") or f"Access-Control-Allow-Origin: {result.get('header', 'missing')}"
            )
            all_ok = False
    
    print()
    print("=" * 60)
    
    # 3. Resumen y recomendaciones
    if all_ok:
        print(f"{GREEN}[OK] Todos los checks pasaron correctamente{RESET}")
        print()
        print("Si la app movil sigue sin conectar:")
        print("  1. Verifica que la app este usando la URL correcta: https://api.hispaloshop.com")
        print("  2. Comprueba que el dispositivo tenga conexion a internet")
        print("  3. Revisa logs de la app en Android Studio/Xcode")
    else:
        print(f"{RED}[ERROR] Se detectaron problemas de CORS{RESET}")
        print()
        print("Para solucionarlo, actualiza la variable ALLOWED_ORIGINS en Railway:")
        print()
        print(f"{YELLOW}ALLOWED_ORIGINS={RESET}")
        print("  https://hispaloshop.com,")
        print("  https://www.hispaloshop.com,")
        print("  capacitor://localhost,")
        print("  ionic://localhost,")
        print("  http://localhost:3000,")
        print("  http://localhost:5173")
        print()
        print("El codigo del backend ya ha sido actualizado para incluir estos origenes.")
        print("Solo necesitas redeploy en Railway para aplicar los cambios.")
    
    print("=" * 60)

if __name__ == "__main__":
    main()
