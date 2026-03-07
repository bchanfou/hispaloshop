#!/usr/bin/env python3
"""
Script para crear cuentas de prueba via API REST.
Requiere que el backend este corriendo.
Ejecutar: python test_accounts_api.py
"""
import requests
import sys
import json

# Configuracion
API_BASE = "http://localhost:8000"  # Cambiar si el backend esta en otra URL

# Datos de las 6 cuentas de prueba
TEST_ACCOUNTS = [
    # 1. Consumer
    {
        "email": "consumer@test.com",
        "password": "Test1234",
        "name": "Maria Consumidora",
        "role": "customer",
        "country": "ES",
        "analytics_consent": True,
        "consent_version": "1.0"
    },
    # 2. Producer
    {
        "email": "producer@test.com",
        "password": "Test1234",
        "name": "Cooperativa La Huerta Viva",
        "role": "producer",
        "country": "ES",
        "analytics_consent": True,
        "consent_version": "1.0",
        "company_name": "La Huerta Viva S.Coop.",
        "phone": "+34 977 123 456",
        "contact_person": "Antonio Martinez",
        "fiscal_address": "Camino Viejo de Reus km 5, 43201 Reus, Tarragona",
        "vat_cif": "ESF43002123"
    },
    # 3. Influencer
    {
        "email": "influencer@test.com",
        "password": "Test1234",
        "name": "Nora Real Food",
        "role": "influencer",
        "country": "ES",
        "analytics_consent": True,
        "consent_version": "1.0",
        "instagram": "@norarealfood",
        "tiktok": "@norarealfood"
    },
    # 4. Importer (tambien puede vender y crear contenido)
    {
        "email": "importer@test.com",
        "password": "Test1234",
        "name": "Gourmet Importaciones SL",
        "role": "importer",
        "country": "ES",
        "analytics_consent": True,
        "consent_version": "1.0",
        "company_name": "Gourmet Importaciones y Distribuciones SL",
        "phone": "+34 915 678 901",
        "contact_person": "Carlos Rodriguez",
        "fiscal_address": "Paseo de la Castellana 150, Oficina 302, 28046 Madrid",
        "vat_cif": "ESB87654321"
    },
    # 5. Admin
    {
        "email": "admin@test.com",
        "password": "Test1234",
        "name": "Admin Hispaloshop",
        "role": "admin",
        "country": "ES",
        "analytics_consent": True,
        "consent_version": "1.0"
    },
    # 6. SuperAdmin
    {
        "email": "superadmin@test.com",
        "password": "Test1234",
        "name": "Super Admin",
        "role": "super_admin",
        "country": "ES",
        "analytics_consent": True,
        "consent_version": "1.0"
    },
]


def register_user(user_data):
    """Registrar un usuario via API"""
    try:
        response = requests.post(
            f"{API_BASE}/auth/register",
            json=user_data,
            timeout=10
        )
        if response.status_code == 200:
            return True, response.json()
        elif response.status_code == 400 and "already registered" in response.text:
            return None, "Usuario ya existe"
        else:
            return False, f"Error {response.status_code}: {response.text}"
    except requests.exceptions.ConnectionError:
        return False, "No se puede conectar al backend. Verifica que este corriendo en localhost:8000"
    except Exception as e:
        return False, str(e)


def approve_user(email):
    """Aprobar un usuario via API (requiere admin)"""
    # Nota: Esto requeriria login como admin primero
    # Por ahora solo imprime un mensaje
    pass


def main():
    print("=" * 60)
    print("CREACION DE CUENTAS DE PRUEBA VIA API")
    print("=" * 60)
    print(f"\nAPI URL: {API_BASE}")
    print("\nVerificando conexion con el backend...")
    
    # Verificar conexion
    try:
        response = requests.get(f"{API_BASE}/health", timeout=5)
        if response.status_code == 200:
            print("[OK] Backend conectado\n")
        else:
            print(f"[!] Backend responde con status {response.status_code}")
    except:
        print("[X] No se puede conectar al backend")
        print("  Asegurate de que el backend este corriendo:")
        print("  cd backend && python -m app.main")
        return
    
    print("-" * 60)
    print("Registrando cuentas...")
    print("-" * 60)
    
    created = 0
    existing = 0
    failed = 0
    
    for account in TEST_ACCOUNTS:
        email = account["email"]
        role = account["role"]
        
        success, result = register_user(account)
        
        if success:
            created += 1
            print(f"[CREADO] {email} ({role})")
        elif success is None:  # Ya existe
            existing += 1
            print(f"[EXISTE] {email} ({role})")
        else:
            failed += 1
            print(f"[ERROR] {email} ({role}): {result}")
    
    print("-" * 60)
    print(f"Resultado: {created} creados, {existing} existentes, {failed} errores")
    print("=" * 60)
    print("\nCREDENCIALES DE PRUEBA:")
    print("+--------------------------------+------------------+--------------+")
    print("| Email                          | Password         | Rol          |")
    print("+--------------------------------+------------------+--------------+")
    print("| consumer@test.com              | Test1234         | Customer     |")
    print("| producer@test.com              | Test1234         | Producer     |")
    print("| influencer@test.com            | Test1234         | Influencer   |")
    print("| importer@test.com              | Test1234         | Importer     |")
    print("| admin@test.com                 | Test1234         | Admin        |")
    print("| superadmin@test.com            | Test1234         | SuperAdmin   |")
    print("+--------------------------------+------------------+--------------+")
    
    print("\nCAPACIDADES POR ROL:")
    print("  Consumer:    Comprar, crear posts/stories, reviews")
    print("  Producer:    Vender productos, gestionar pedidos, stock")
    print("  Influencer:  Afiliados, crear contenido, analytics, comisiones")
    print("  Importer:    B2B + Vender + Crear contenido (todo en uno)")
    print("  Admin:       Gestionar usuarios, productos, pedidos, contenido")
    print("  SuperAdmin:  Acceso total al sistema, configuracion, finanzas")
    
    print("\nNOTAS:")
    print("  - Todas las cuentas pueden crear posts y stories")
    print("  - Importer tiene capacidades de Producer + B2B")
    print("  - Admin y SuperAdmin requieren aprobacion manual si se registran via API")
    print("  - Para aprobar, usar el script test_accounts.py o MongoDB directamente")


if __name__ == "__main__":
    main()
