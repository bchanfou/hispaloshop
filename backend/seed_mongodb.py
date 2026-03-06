#!/usr/bin/env python3
"""
Script para crear datos semilla en MongoDB para testing del MVP.
Ejecutar: python seed_mongodb.py
"""
import asyncio
import os
import bcrypt
from datetime import datetime, timezone
from uuid import uuid4

# MongoDB con Motor (async)
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "hispaloshop")

# Datos de prueba
TEST_USERS = [
    {
        "user_id": "user_customer_001",
        "email": "customer@test.com",
        "password": "Test1234",
        "name": "Cliente de Prueba",
        "full_name": "Cliente de Prueba MVP",
        "role": "customer",
        "country": "ES",
        "email_verified": True,
        "approved": True,
        "bio": "Amante de los productos artesanales",
        "avatar_url": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200",
        "location": "Madrid, España",
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
    {
        "user_id": "user_producer_001",
        "email": "producer@test.com",
        "password": "Test1234",
        "name": "Cooperativa La Huerta Viva",
        "full_name": "Cooperativa La Huerta Viva",
        "role": "producer",
        "country": "ES",
        "email_verified": True,
        "approved": True,
        "company_name": "La Huerta Viva S.Coop.",
        "phone": "+34 612 345 678",
        "bio": "Productores locales de aceite, conservas y vegetales certificados desde 1985.",
        "avatar_url": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=200",
        "location": "Reus, Tarragona, España",
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
    {
        "user_id": "user_influencer_001",
        "email": "influencer@test.com",
        "password": "Test1234",
        "name": "Nora Real Food",
        "full_name": "Nora García",
        "role": "influencer",
        "country": "ES",
        "email_verified": True,
        "approved": True,
        "bio": "Recomendaciones de producto real. Foodie & Content Creator.",
        "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200",
        "location": "Barcelona, España",
        "followers_count": 5600,
        "following_count": 320,
        "posts_count": 84,
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
]

TEST_CATEGORIES = [
    {
        "category_id": "cat_aceites",
        "name": "Aceites & Vinagres",
        "slug": "aceites-vinagres",
        "description": "Aceites de oliva, vinagres artesanos y aliños con origen claro.",
        "icon": "Droplets",
        "sort_order": 1,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
    {
        "category_id": "cat_conservas",
        "name": "Conservas & Mermeladas",
        "slug": "conservas-mermeladas",
        "description": "Tarros pequeños, recetas lentas y sabor de despensa bien hecha.",
        "icon": "Package",
        "sort_order": 2,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
    {
        "category_id": "cat_quesos",
        "name": "Quesos & Lácteos",
        "slug": "quesos-lacteos",
        "description": "Quesos curados, yogures y lácteos de pequeños elaboradores.",
        "icon": "Milk",
        "sort_order": 3,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
    {
        "category_id": "cat_embutidos",
        "name": "Embutidos & Curados",
        "slug": "embutidos-curados",
        "description": "Jamones, lomos y curados con elaboración lenta y trazable.",
        "icon": "Beef",
        "sort_order": 4,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
    {
        "category_id": "cat_panaderia",
        "name": "Panadería & Dulces",
        "slug": "panaderia-dulces",
        "description": "Hornadas artesanas, galletas honestas y dulces de obrador.",
        "icon": "Croissant",
        "sort_order": 5,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
    {
        "category_id": "cat_vinos",
        "name": "Vinos & Bebidas",
        "slug": "vinos-bebidas",
        "description": "Botellas con historia, bodegas pequeñas y bebidas de autor.",
        "icon": "Wine",
        "sort_order": 6,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
]

TEST_PRODUCTS = [
    {
        "product_id": "prod_001",
        "producer_id": "user_producer_001",
        "producer_name": "Cooperativa La Huerta Viva",
        "category_id": "cat_aceites",
        "name": "Aceite de Oliva Virgen Extra Reserva",
        "slug": "aceite-oliva-virgen-extra-reserva",
        "description": "AOVE premium de cosecha temprana, prensado en frío. Ideal para ensaladas y platos que requieren un toque de calidad extra.",
        "price": 14.90,
        "price_cents": 1490,
        "currency": "EUR",
        "images": ["https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800"],
        "stock": 120,
        "market_stock": 120,
        "track_stock": True,
        "status": "active",
        "approved": True,
        "is_featured": True,
        "country_origin": "ES",
        "average_rating": 4.9,
        "review_count": 203,
        "total_sold": 850,
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
    {
        "product_id": "prod_002",
        "producer_id": "user_producer_001",
        "producer_name": "Cooperativa La Huerta Viva",
        "category_id": "cat_conservas",
        "name": "Mermelada de Higo Negro",
        "slug": "mermelada-higo-negro",
        "description": "Conserva artesanal elaborada en pequeños lotes. Sin conservantes artificiales.",
        "price": 7.40,
        "price_cents": 740,
        "currency": "EUR",
        "images": ["https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800"],
        "stock": 70,
        "market_stock": 70,
        "track_stock": True,
        "status": "active",
        "approved": True,
        "country_origin": "ES",
        "average_rating": 4.8,
        "review_count": 59,
        "total_sold": 260,
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
    {
        "product_id": "prod_003",
        "producer_id": "user_producer_001",
        "producer_name": "Cooperativa La Huerta Viva",
        "category_id": "cat_quesos",
        "name": "Queso Curado de Cabra",
        "slug": "queso-curado-cabra",
        "description": "Queso curado 9 meses, lote trazable con certificado digital.",
        "price": 9.80,
        "price_cents": 980,
        "currency": "EUR",
        "images": ["https://images.unsplash.com/photo-1486297672812-dbb9ceb0b793?w=800"],
        "stock": 46,
        "market_stock": 46,
        "track_stock": True,
        "status": "active",
        "approved": True,
        "country_origin": "ES",
        "average_rating": 4.7,
        "review_count": 97,
        "total_sold": 430,
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
    {
        "product_id": "prod_004",
        "producer_id": "user_producer_001",
        "producer_name": "Cooperativa La Huerta Viva",
        "category_id": "cat_embutidos",
        "name": "Lomo Curado de Sierra",
        "slug": "lomo-curado-sierra",
        "description": "Curado artesanal con trazabilidad por lote y corte fino.",
        "price": 16.90,
        "price_cents": 1690,
        "currency": "EUR",
        "images": ["https://images.unsplash.com/photo-1542904990-f320524f98d8?w=800"],
        "stock": 38,
        "market_stock": 38,
        "track_stock": True,
        "status": "active",
        "approved": True,
        "country_origin": "ES",
        "average_rating": 4.9,
        "review_count": 73,
        "total_sold": 310,
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
    {
        "product_id": "prod_005",
        "producer_id": "user_producer_001",
        "producer_name": "Cooperativa La Huerta Viva",
        "category_id": "cat_vinos",
        "name": "Vino Tinto Reserva 2019",
        "slug": "vino-tinto-reserva-2019",
        "description": "Edición limitada, crianza en barrica de roble.",
        "price": 22.50,
        "price_cents": 2250,
        "currency": "EUR",
        "images": ["https://images.unsplash.com/photo-1516594915697-87eb3b1c14ea?w=800"],
        "stock": 33,
        "market_stock": 33,
        "track_stock": True,
        "status": "active",
        "approved": True,
        "country_origin": "ES",
        "average_rating": 4.8,
        "review_count": 111,
        "total_sold": 512,
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
    {
        "product_id": "prod_006",
        "producer_id": "user_producer_001",
        "producer_name": "Cooperativa La Huerta Viva",
        "category_id": "cat_panaderia",
        "name": "Caja de Naranjas de Temporada",
        "slug": "caja-naranjas-temporada",
        "description": "Cosecha local de proximidad, seleccionada a mano.",
        "price": 11.50,
        "price_cents": 1150,
        "currency": "EUR",
        "images": ["https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5a?w=800"],
        "stock": 64,
        "market_stock": 64,
        "track_stock": True,
        "status": "active",
        "approved": True,
        "country_origin": "ES",
        "average_rating": 4.6,
        "review_count": 34,
        "total_sold": 198,
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
]


def hash_password(password: str) -> str:
    """Hash password con bcrypt"""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode(), salt).decode()


async def seed_database():
    """Crear datos semilla en MongoDB"""
    print("🌱 Iniciando seed de MongoDB...")
    print(f"   URL: {MONGO_URL}")
    print(f"   DB: {DB_NAME}")
    
    # Conectar a MongoDB
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    try:
        # Verificar conexión
        await client.admin.command('ping')
        print("✅ Conexión a MongoDB exitosa")
        
        # 1. Crear usuarios
        print("\n👤 Creando usuarios de prueba...")
        users_collection = db.users
        
        for user_data in TEST_USERS:
            # Verificar si ya existe
            existing = await users_collection.find_one({"email": user_data["email"]})
            if existing:
                print(f"   ⚠️  Usuario {user_data['email']} ya existe, saltando...")
                continue
            
            # Crear usuario con password hasheado
            user_doc = user_data.copy()
            user_doc["password_hash"] = hash_password(user_data.pop("password"))
            
            await users_collection.insert_one(user_doc)
            print(f"   ✅ Usuario creado: {user_data['email']} ({user_data['role']})")
        
        # 2. Crear categorías
        print("\n📁 Creando categorías...")
        categories_collection = db.categories
        
        for cat_data in TEST_CATEGORIES:
            existing = await categories_collection.find_one({"slug": cat_data["slug"]})
            if existing:
                print(f"   ⚠️  Categoría {cat_data['slug']} ya existe, saltando...")
                continue
            
            await categories_collection.insert_one(cat_data)
            print(f"   ✅ Categoría creada: {cat_data['name']}")
        
        # 3. Crear productos
        print("\n📦 Creando productos de prueba...")
        products_collection = db.products
        
        for prod_data in TEST_PRODUCTS:
            existing = await products_collection.find_one({"slug": prod_data["slug"]})
            if existing:
                print(f"   ⚠️  Producto {prod_data['slug']} ya existe, saltando...")
                continue
            
            await products_collection.insert_one(prod_data)
            print(f"   ✅ Producto creado: {prod_data['name']}")
        
        print("\n" + "=" * 50)
        print("✅ SEED COMPLETADO EXITOSAMENTE")
        print("=" * 50)
        print("\nDatos creados:")
        print(f"   👤 {len(TEST_USERS)} usuarios")
        print(f"   📁 {len(TEST_CATEGORIES)} categorías")
        print(f"   📦 {len(TEST_PRODUCTS)} productos")
        print("\nCredenciales de prueba:")
        print("   customer@test.com / Test1234")
        print("   producer@test.com / Test1234")
        print("   influencer@test.com / Test1234")
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        raise
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(seed_database())
