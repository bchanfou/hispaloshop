#!/usr/bin/env python3
"""
Script para crear/actualizar cuentas de prueba para todos los perfiles.
Incluye: Consumer, Producer, Influencer, Importer, Admin, SuperAdmin
Ejecutar: python test_accounts.py
"""
import asyncio
import os
import sys
import bcrypt
from datetime import datetime, timezone

# Fix encoding for Windows
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

try:
    from motor.motor_asyncio import AsyncIOMotorClient
except ImportError:
    print("ERROR: motor no instalado. Ejecuta: pip install motor")
    sys.exit(1)

# Load .env file manually
def load_env_file(filepath='.env'):
    """Load environment variables from .env file"""
    if not os.path.exists(filepath):
        return
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if '=' in line:
                key, value = line.split('=', 1)
                os.environ[key] = value

# Load environment variables
load_env_file()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "hispaloshop")

# ============================================
# CUENTAS DE PRUEBA - 6 PERFILES COMPLETOS
# ============================================

TEST_ACCOUNTS = [
    # ---------- 1. CONSUMER (Cliente) ----------
    {
        "user_id": "test_consumer_001",
        "email": "consumer@test.com",
        "password": "Test1234",
        "name": "Maria Consumidora",
        "full_name": "Maria Garcia Lopez",
        "role": "customer",
        "country": "ES",
        "email_verified": True,
        "approved": True,
        "bio": "Amante de los productos artesanales y la gastronomia local. Siempre buscando nuevos sabores.",
        "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200",
        "location": "Madrid, Espana",
        "phone": "+34 612 345 678",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "preferences": {
            "diet_preferences": ["mediterranea", "organica"],
            "allergens": ["gluten"],
            "goals": "Descubrir productores locales"
        },
        "shipping_addresses": [
            {
                "address_id": "addr_001",
                "name": "Casa",
                "full_name": "Maria Garcia Lopez",
                "street": "Calle Mayor 123, 4B",
                "city": "Madrid",
                "postal_code": "28013",
                "country": "ES",
                "phone": "+34 612 345 678",
                "is_default": True
            }
        ],
        "consent": {
            "analytics_consent": True,
            "consent_version": "1.0",
            "consent_date": datetime.now(timezone.utc).isoformat()
        },
        "orders_count": 12,
        "total_spent": 456.80,
        "following_count": 8,
        "saved_products": ["prod_001", "prod_003"],
    },
    
    # ---------- 2. PRODUCER (Productor) ----------
    {
        "user_id": "test_producer_001",
        "email": "producer@test.com",
        "password": "Test1234",
        "name": "Cooperativa La Huerta Viva",
        "full_name": "Cooperativa La Huerta Viva S.Coop.",
        "role": "producer",
        "country": "ES",
        "email_verified": True,
        "approved": True,
        "company_name": "La Huerta Viva S.Coop.",
        "company_description": "Cooperativa de agricultores dedicada al cultivo ecologico de productos mediterraneos desde 1985.",
        "phone": "+34 977 123 456",
        "whatsapp": "+34 677 123 456",
        "contact_person": "Antonio Martinez",
        "fiscal_address": "Camino Viejo de Reus km 5, 43201 Reus, Tarragona",
        "vat_cif": "ESF43002123",
        "bio": "Productores locales de aceite, conservas y vegetales certificados. Agricultura ecologica y sostenible.",
        "avatar_url": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=200",
        "cover_image": "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1200",
        "location": "Reus, Tarragona, Espana",
        "website": "https://lahuertaviva.es",
        "social_links": {
            "instagram": "@lahuertaviva",
            "facebook": "LaHuertaViva"
        },
        "created_at": datetime.now(timezone.utc).isoformat(),
        "products_count": 24,
        "total_sales": 1250,
        "total_revenue": 28500.50,
        "rating": 4.8,
        "reviews_count": 156,
        "followers_count": 89,
        "shipping_config": {
            "free_shipping_threshold": 50.0,
            "default_shipping_cost": 4.95,
            "shipping_time": "24-48h"
        },
        "payment_methods": {
            "stripe_connected": True,
            "stripe_account_id": "acct_test_123456789",
            "paypal_email": "pagos@lahuertaviva.es"
        },
    },
    
    # ---------- 3. INFLUENCER (Creador) ----------
    {
        "user_id": "test_influencer_001",
        "email": "influencer@test.com",
        "password": "Test1234",
        "name": "Nora Real Food",
        "full_name": "Nora Garcia Martinez",
        "role": "influencer",
        "country": "ES",
        "email_verified": True,
        "approved": True,
        "bio": "Foodie & Content Creator. Recomendaciones honestas de productos artesanales. #RealFood #ProductoLocal",
        "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
        "cover_image": "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=1200",
        "location": "Barcelona, Espana",
        "phone": "+34 622 333 444",
        "website": "https://norarealfood.com",
        "social_links": {
            "instagram": "@norarealfood",
            "tiktok": "@norarealfood",
            "youtube": "NoraRealFood",
            "twitter": "@norarealfood"
        },
        "created_at": datetime.now(timezone.utc).isoformat(),
        "followers_count": 12500,
        "following_count": 450,
        "posts_count": 234,
        "total_likes": 45600,
        "engagement_rate": 4.5,
        "monetization": {
            "commission_rate": 8.5,
            "total_earnings": 2450.00,
            "pending_payout": 320.50,
            "affiliate_code": "NORA15"
        },
        "niche_categories": ["gastronomia", "salud", "sostenibilidad"],
        "payout_info": {
            "method": "bank_transfer",
            "account_holder": "Nora Garcia Martinez",
            "iban": "ES91 2345 6789 0123 4567 8901",
            "bank_name": "BBVA"
        },
    },
    
    # ---------- 4. IMPORTER (Importador + Vendedor) ----------
    {
        "user_id": "test_importer_001",
        "email": "importer@test.com",
        "password": "Test1234",
        "name": "Gourmet Importaciones SL",
        "full_name": "Gourmet Importaciones y Distribuciones SL",
        "role": "importer",
        "country": "ES",
        "email_verified": True,
        "approved": True,
        # Datos de empresa importadora
        "company_name": "Gourmet Importaciones y Distribuciones SL",
        "company_description": "Importador y distribuidor de productos gourmet espanoles para mercados internacionales. Especialistas en retail y HORECA.",
        "phone": "+34 915 678 901",
        "whatsapp": "+34 611 222 333",
        "contact_person": "Carlos Rodriguez",
        "fiscal_address": "Paseo de la Castellana 150, Oficina 302, 28046 Madrid",
        "vat_cif": "ESB87654321",
        # Bio y perfil
        "bio": "Conectamos productores espanoles con mercados internacionales. Exportacion a Europa, Asia y America.",
        "avatar_url": "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200",
        "cover_image": "https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?w=1200",
        "location": "Madrid, Espana",
        "website": "https://gourmetimport.es",
        "social_links": {
            "linkedin": "gourmet-importaciones",
            "instagram": "@gourmetimport"
        },
        "created_at": datetime.now(timezone.utc).isoformat(),
        # Datos B2B
        "b2b_profile": {
            "markets": ["DE", "FR", "UK", "US", "JP", "CN"],
            "channels": ["retail", "horeca", "ecommerce"],
            "import_volume": "medio",
            "certifications": ["BRC", "IFS", "ORGANIC_EU"],
        },
        # Capacidades de vendedor (igual que producer)
        "products_count": 18,
        "total_sales": 850,
        "total_revenue": 18500.00,
        "rating": 4.7,
        "reviews_count": 98,
        "followers_count": 45,
        "connected_producers": 12,
        "active_quotes": 5,
        "total_imported_value": 125000.00,
        # Configuracion de envio
        "shipping_config": {
            "free_shipping_threshold": 100.0,
            "default_shipping_cost": 9.95,
            "shipping_time": "48-72h"
        },
        # Metodos de pago
        "payment_methods": {
            "stripe_connected": True,
            "stripe_account_id": "acct_test_importer_789",
            "paypal_email": "pagos@gourmetimport.es"
        },
        # Configuracion B2B
        "b2b_config": {
            "min_order_value": 5000.0,
            "payment_terms": "30_60_dias",
            "incoterms": ["FOB", "CIF", "EXW"],
            "preferred_shipping": "maritime"
        },
        # Contactos de negocio
        "business_contacts": [
            {
                "name": "Carlos Rodriguez",
                "role": "Director Comercial",
                "email": "carlos@gourmetimport.es",
                "phone": "+34 915 678 902"
            },
            {
                "name": "Ana Lopez",
                "role": "Responsable de Calidad",
                "email": "ana@gourmetimport.es",
                "phone": "+34 915 678 903"
            }
        ],
    },
    
    # ---------- 5. ADMIN ----------
    {
        "user_id": "test_admin_001",
        "email": "admin@test.com",
        "password": "Test1234",
        "name": "Admin Hispaloshop",
        "full_name": "Administrador Plataforma",
        "role": "admin",
        "country": "ES",
        "email_verified": True,
        "approved": True,
        "bio": "Administrador de la plataforma Hispaloshop. Gestion de productores, productos y contenido.",
        "avatar_url": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200",
        "location": "Madrid, Espana",
        "phone": "+34 915 000 001",
        "created_at": datetime.now(timezone.utc).isoformat(),
        # Permisos de admin
        "admin_permissions": {
            "can_manage_producers": True,
            "can_manage_products": True,
            "can_manage_orders": True,
            "can_manage_influencers": True,
            "can_view_analytics": True,
            "can_manage_content": True,
            "can_manage_support": True,
        },
        # Stats
        "managed_producers": 45,
        "approved_products": 1234,
        "resolved_tickets": 89,
    },
    
    # ---------- 6. SUPERADMIN ----------
    {
        "user_id": "test_superadmin_001",
        "email": "superadmin@test.com",
        "password": "Test1234",
        "name": "Super Admin",
        "full_name": "Super Administrador Sistema",
        "role": "super_admin",
        "country": "ES",
        "email_verified": True,
        "approved": True,
        "bio": "Super Administrador del sistema. Acceso total a todas las funcionalidades y configuraciones.",
        "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200",
        "location": "Madrid, Espana",
        "phone": "+34 915 000 000",
        "created_at": datetime.now(timezone.utc).isoformat(),
        # Permisos de superadmin (todos)
        "admin_permissions": {
            "can_manage_producers": True,
            "can_manage_products": True,
            "can_manage_orders": True,
            "can_manage_influencers": True,
            "can_view_analytics": True,
            "can_manage_content": True,
            "can_manage_support": True,
            "can_manage_admins": True,
            "can_manage_finance": True,
            "can_manage_settings": True,
            "can_view_audit_logs": True,
        },
        # Stats
        "platform_stats": {
            "total_users": 12500,
            "total_producers": 145,
            "total_products": 3456,
            "total_orders": 8900,
            "platform_revenue": 456000.00,
        },
    },
]


def hash_password(password: str) -> str:
    """Hash password con bcrypt"""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode(), salt).decode()


async def setup_test_accounts():
    """Crear o actualizar cuentas de prueba en MongoDB"""
    print("=" * 60)
    print("CONFIGURACION DE CUENTAS DE PRUEBA")
    print("=" * 60)
    print(f"\nConectando a: {MONGO_URL}")
    print(f"Base de datos: {DB_NAME}\n")
    
    client = AsyncIOMotorClient(MONGO_URL, tlsAllowInvalidCertificates=True)
    db = client[DB_NAME]
    
    try:
        # Verificar conexion
        await client.admin.command('ping')
        print("Conexion a MongoDB exitosa\n")
        
        users_collection = db.users
        created_count = 0
        updated_count = 0
        
        print("Procesando cuentas de prueba...")
        print("-" * 60)
        
        for account in TEST_ACCOUNTS:
            email = account["email"]
            role = account["role"]
            name = account["name"]
            
            # Preparar documento
            user_doc = account.copy()
            user_doc["password_hash"] = hash_password(account.pop("password"))
            user_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
            
            # Verificar si existe
            existing = await users_collection.find_one({"email": email})
            
            if existing:
                # Actualizar cuenta existente
                await users_collection.update_one(
                    {"email": email},
                    {"$set": user_doc}
                )
                updated_count += 1
                print(f"[ACTUALIZADO] {email} ({role})")
            else:
                # Crear nueva cuenta
                await users_collection.insert_one(user_doc)
                created_count += 1
                print(f"[CREADO] {email} ({role})")
            
            print(f"  Nombre: {name}")
            print(f"  Password: Test1234")
            print()
        
        print("-" * 60)
        print("RESUMEN:")
        print(f"  Creados: {created_count}")
        print(f"  Actualizados: {updated_count}")
        print(f"  Total: {len(TEST_ACCOUNTS)}")
        print()
        print("=" * 60)
        print("CREDENCIALES DE ACCESO")
        print("=" * 60)
        print()
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
        print()
        print("Todos los usuarios tienen:")
        print("  - Email verificado: SI")
        print("  - Cuenta aprobada: SI")
        print("  - Datos de perfil completos")
        print()
        print("ROLES Y CAPACIDADES:")
        print("  - Consumer: Comprar, crear posts/stories")
        print("  - Producer: Vender productos, gestionar pedidos")
        print("  - Influencer: Afiliados, crear contenido, analytics")
        print("  - Importer: B2B + Vender productos + Crear contenido")
        print("  - Admin: Gestionar productores, productos, pedidos")
        print("  - SuperAdmin: Acceso total al sistema")
        print()
        
    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        client.close()
        print("Conexion cerrada")


if __name__ == "__main__":
    asyncio.run(setup_test_accounts())
