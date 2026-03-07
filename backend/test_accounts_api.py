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

# Datos de las 4 cuentas de prueba
TEST_ACCOUNTS = [
    {
        "email": "consumer@test.com",
        "password": "Test1234",
        "name": "Maria Consumidora",
        "role": "customer",
        "country": "ES",
        "analytics_consent": True,
        "consent_version": "1.0"
    },
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
    }
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
            print("✓ Backend conectado\n")
        else:
            print(f"⚠ Backend responde con status {response.status_code}")
    except:
        print("✗ No se puede conectar al backend")
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
    for acc in TEST_ACCOUNTS:
        print(f"| {acc['email']:<30} | {acc['password']:<16} | {acc['role']:<12} |")
    print("+--------------------------------+------------------+--------------+")
    
    if failed > 0:
        print("\nNOTA: Algunas cuentas pueden requerir aprobacion manual:")
        print("  - Producer e Importer: pendientes de aprobacion")
        print("  - Influencer: pendiente de aprobacion")
        print("  Ve al panel de admin para aprobarlas")


if __name__ == "__main__":
    main()
