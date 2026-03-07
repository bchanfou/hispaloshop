#!/usr/bin/env python3
"""
Script de verificacion pre-deploy para Hispaloshop MVP
Ejecutar antes de hacer deploy a produccion
"""

import os
import sys

def check_env_vars():
    """Verificar variables de entorno requeridas"""
    print("=" * 60)
    print("VERIFICACION DE VARIABLES DE ENTORNO")
    print("=" * 60)
    
    required = [
        "JWT_SECRET",
        "MONGO_URL",
        "STRIPE_SECRET_KEY",
    ]
    
    optional = [
        "STRIPE_WEBHOOK_SECRET",
        "CLOUDINARY_CLOUD_NAME",
        "REDIS_URL",
    ]
    
    all_good = True
    
    for var in required:
        value = os.getenv(var)
        if value:
            print(f"[OK] {var}: Configurada")
            if var == "JWT_SECRET" and len(value) < 32:
                print(f"[WARN] ADVERTENCIA: {var} parece demasiado corta")
                all_good = False
        else:
            print(f"[ERROR] {var}: NO CONFIGURADA")
            all_good = False
    
    print()
    for var in optional:
        value = os.getenv(var)
        if value:
            print(f"[OK] {var}: Configurada (opcional)")
        else:
            print(f"[WARN] {var}: No configurada (opcional)")
    
    return all_good


def check_backend_structure():
    """Verificar estructura del backend"""
    print()
    print("=" * 60)
    print("VERIFICACION DEL BACKEND")
    print("=" * 60)
    
    required_files = [
        "backend/main.py",
        "backend/config.py",
        "backend/requirements.txt",
        "backend/core/models.py",
        "backend/core/auth.py",
        "backend/routes/auth.py",
        "backend/routes/products.py",
        "backend/routes/orders.py",
    ]
    
    all_good = True
    for file in required_files:
        if os.path.exists(file):
            print(f"[OK] {file}")
        else:
            print(f"[ERROR] {file} - NO ENCONTRADO")
            all_good = False
    
    return all_good


def check_frontend_structure():
    """Verificar estructura del frontend"""
    print()
    print("=" * 60)
    print("VERIFICACION DEL FRONTEND")
    print("=" * 60)
    
    required_files = [
        "frontend/package.json",
        "frontend/src/App.js",
        "frontend/src/index.js",
        "frontend/src/context/AuthContext.js",
        "frontend/src/pages/LoginPage.js",
        "frontend/src/pages/RegisterPage.js",
    ]
    
    all_good = True
    for file in required_files:
        if os.path.exists(file):
            print(f"[OK] {file}")
        else:
            print(f"[ERROR] {file} - NO ENCONTRADO")
            all_good = False
    
    return all_good


def check_no_demo_mode():
    """Verificar que DEMO_MODE este desactivado"""
    print()
    print("=" * 60)
    print("VERIFICACION DE DEMO MODE")
    print("=" * 60)
    
    feature_flags_file = "frontend/src/config/featureFlags.js"
    if os.path.exists(feature_flags_file):
        with open(feature_flags_file, 'r') as f:
            content = f.read()
            if 'DEMO_MODE = false' in content or 'DEMO_MODE: false' in content:
                print("[OK] DEMO_MODE esta desactivado")
                return True
            elif 'DEMO_MODE = true' in content or 'DEMO_MODE: true' in content:
                print("[ERROR] DEMO_MODE esta activado - debe ser false para produccion")
                return False
            else:
                print("[WARN] No se pudo determinar el estado de DEMO_MODE")
                return True
    else:
        print(f"[WARN] Archivo {feature_flags_file} no encontrado")
        return True


def check_critical_configs():
    """Verificar configuraciones criticas"""
    print()
    print("=" * 60)
    print("VERIFICACION DE CONFIGURACIONES CRITICAS")
    print("=" * 60)
    
    all_good = True
    
    # Verificar CORS
    cors_file = "backend/main.py"
    if os.path.exists(cors_file):
        with open(cors_file, 'r') as f:
            content = f.read()
            if 'allowed_origins' in content:
                print("[OK] CORS configurado")
            else:
                print("[ERROR] CORS no configurado correctamente")
                all_good = False
    
    # Verificar fail-fast validation
    if 'REQUIRED_ENV_VARS' in content:
        print("[OK] Validacion fail-fast de variables configurada")
    else:
        print("[WARN] Validacion fail-fast no encontrada")
    
    return all_good


def main():
    print("\n" + "=" * 60)
    print("HISPALOSHOP MVP - PRE-DEPLOY CHECK")
    print("=" * 60 + "\n")
    
    checks = [
        ("Variables de Entorno", check_env_vars),
        ("Estructura Backend", check_backend_structure),
        ("Estructura Frontend", check_frontend_structure),
        ("Demo Mode", check_no_demo_mode),
        ("Configuraciones Criticas", check_critical_configs),
    ]
    
    results = []
    for name, check_func in checks:
        try:
            result = check_func()
            results.append((name, result))
        except Exception as e:
            print(f"\n[ERROR] Error en verificacion '{name}': {e}")
            results.append((name, False))
    
    # Resumen
    print()
    print("=" * 60)
    print("RESUMEN")
    print("=" * 60)
    
    all_passed = True
    for name, result in results:
        status = "[PASS]" if result else "[FAIL]"
        print(f"{status}: {name}")
        if not result:
            all_passed = False
    
    print()
    if all_passed:
        print("TODO LISTO PARA DEPLOY!")
        print("\nProximos pasos:")
        print("1. git add . && git commit -m 'Deploy MVP v1.0.0'")
        print("2. git push origin main")
        print("3. Railway hara deploy automatico")
        return 0
    else:
        print("HAY PROBLEMAS QUE CORREGIR ANTES DEL DEPLOY")
        print("\nRevisa los errores arriba y corrigelos.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
