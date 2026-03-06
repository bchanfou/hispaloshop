"""
Seed script for Hispaloshop MVP with multi-seller support.
Creates: Producers, Importers, Admins, Customers with stores and products.
"""
import os
import sys
import asyncio
import bcrypt
from datetime import datetime, timezone
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Validate required env vars
required_vars = ["MONGO_URL", "JWT_SECRET"]
missing = [var for var in required_vars if not os.getenv(var)]
if missing:
    print(f"[ERROR] Missing environment variables: {', '.join(missing)}")
    sys.exit(1)

from motor.motor_asyncio import AsyncIOMotorClient

# MongoDB connection
MONGO_URL = os.getenv("MONGO_URL")
client = AsyncIOMotorClient(MONGO_URL)
db = client.get_default_database()

# Password hashing
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

# Test credentials
TEST_PASSWORD = "Test1234"
TEST_PASSWORD_HASH = hash_password(TEST_PASSWORD)

# Seed data
SEED_USERS = [
    # Customers
    {
        "user_id": "cust_test_001",
        "email": "customer@test.com",
        "name": "Customer Test",
        "role": "customer",
        "password_hash": TEST_PASSWORD_HASH,
        "approved": True,
        "country": "ES",
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
    # Producers
    {
        "user_id": "prod_test_001",
        "email": "producer@mvp.com",
        "name": "Producer Test",
        "role": "producer",
        "company_name": "Aceites Andaluces SL",
        "password_hash": TEST_PASSWORD_HASH,
        "approved": True,
        "country": "ES",
        "fiscal_address": "Calle Principal 123, Sevilla",
        "vat_cif": "B12345678",
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
    # Importers
    {
        "user_id": "imp_test_001",
        "email": "importer@mvp.com",
        "name": "Importer Test",
        "role": "importer",
        "company_name": "Importadora del Mediterraneo",
        "password_hash": TEST_PASSWORD_HASH,
        "approved": True,
        "country": "ES",
        "fiscal_address": "Avenida del Comercio 45, Barcelona",
        "vat_cif": "B87654321",
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
    # Admins
    {
        "user_id": "admin_test_001",
        "email": "admin@mvp.com",
        "name": "Admin Test",
        "role": "admin",
        "password_hash": TEST_PASSWORD_HASH,
        "approved": True,
        "country": "ES",
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
]

SEED_STORES = [
    # Producer Store
    {
        "store_id": "store_prod_001",
        "producer_id": "prod_test_001",
        "slug": "aceites-andaluces",
        "name": "Aceites Andaluces",
        "tagline": "Aceite de oliva virgen extra de primera calidad",
        "story": "Desde 1985 produciendo los mejores aceites de oliva del sur de España...",
        "founder_name": "Juan Garcia",
        "founder_quote": "La calidad es nuestra mejor receta",
        "hero_image": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=1200",
        "logo": "https://images.unsplash.com/photo-1544965838-54ef840fa415?w=200",
        "gallery": [
            "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400",
            "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=400",
        ],
        "country": "ES",
        "region": "Andalucia",
        "location": "Sevilla, Espana",
        "full_address": "Ctra. de Carmona km 12, 41008 Sevilla",
        "store_type": "producer",
        "owner_type": "producer",
        "verified": True,
        "contact_email": "producer@mvp.com",
        "contact_phone": "+34 954 123 456",
        "badges": ["verified", "family_business"],
        "rating": 4.8,
        "review_count": 24,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    },
    # Importer Store
    {
        "store_id": "store_imp_001",
        "producer_id": "imp_test_001",
        "slug": "importadora-mediterraneo",
        "name": "Importadora del Mediterraneo",
        "tagline": "Los mejores productos italianos y griegos en Espana",
        "story": "Especialistas en importar productos gourmet del Mediterraneo oriental...",
        "founder_name": "Maria Rodriguez",
        "founder_quote": "Traemos el sabor del Mediterraneo a tu mesa",
        "hero_image": "https://images.unsplash.com/photo-1550989460-0adf9ea622e2?w=1200",
        "logo": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=200",
        "gallery": [
            "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=400",
            "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400",
        ],
        "country": "ES",
        "region": "Catalunya",
        "location": "Barcelona, Espana",
        "full_address": "Puerto de Barcelona, Moll de la Fusta",
        "store_type": "importer",
        "owner_type": "importer",
        "verified": True,
        "contact_email": "importer@mvp.com",
        "contact_phone": "+34 932 654 321",
        "specialization": "Productos Italianos y Griegos",
        "badges": ["verified"],
        "rating": 4.6,
        "review_count": 18,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    },
]

SEED_PRODUCTS = [
    # Producer Products
    {
        "product_id": "prod_001",
        "producer_id": "prod_test_001",
        "producer_name": "Aceites Andaluces SL",
        "name": "Aceite de Oliva Virgen Extra Premium",
        "slug": "aceite-oliva-virgen-extra-premium",
        "description": "Aceite de oliva virgen extra de primera presion en frio. Variedad Picual. Perfecto para ensaladas y cocinar.",
        "price": 24.99,
        "images": ["https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600"],
        "country_origin": "ES",
        "category_id": "alimentacion",
        "ingredients": ["Aceite de oliva virgen extra"],
        "allergens": [],
        "certifications": ["DOP", "Ecologico"],
        "approved": True,
        "status": "active",
        "featured": True,
        "stock": 150,
        "seller_type": "producer",
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
    {
        "product_id": "prod_002",
        "producer_id": "prod_test_001",
        "producer_name": "Aceites Andaluces SL",
        "name": "Aceite de Oliva Arbequina",
        "slug": "aceite-oliva-arbequina",
        "description": "Suave y afrutado, ideal para pescados y postres.",
        "price": 19.99,
        "images": ["https://images.unsplash.com/photo-1544965838-54ef840fa415?w=600"],
        "country_origin": "ES",
        "category_id": "alimentacion",
        "ingredients": ["Aceite de oliva virgen extra variedad Arbequina"],
        "allergens": [],
        "certifications": ["DOP"],
        "approved": True,
        "status": "active",
        "featured": False,
        "stock": 80,
        "seller_type": "producer",
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
    # Importer Products
    {
        "product_id": "prod_003",
        "producer_id": "imp_test_001",
        "producer_name": "Importadora del Mediterraneo",
        "name": "Parmigiano Reggiano DOP 24 meses",
        "slug": "parmigiano-reggiano-dop",
        "description": "Autentico Parmigiano Reggiano DOP madurado 24 meses. Importado directamente de Parma, Italia.",
        "price": 32.50,
        "images": ["https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600"],
        "country_origin": "IT",
        "category_id": "lacteos",
        "ingredients": ["Leche de vaca", "Sal", "Cuajo"],
        "allergens": ["lactosa"],
        "certifications": ["DOP", "ISO22000"],
        "approved": True,
        "status": "active",
        "featured": True,
        "stock": 45,
        "seller_type": "importer",
        "origin_country": "Italia",
        "import_batch": "BATCH-IT-2024-001",
        "import_date": "2024-02-15",
        "customs_info": {
            "tariff_code": "0406.90.99",
            "vat_rate": 10,
            "customs_cleared": True,
        },
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
    {
        "product_id": "prod_004",
        "producer_id": "imp_test_001",
        "producer_name": "Importadora del Mediterraneo",
        "name": "Pasta Artesanal de Gragnano IGP",
        "slug": "pasta-artesanal-gragnano",
        "description": "Pasta tradicional de Gragnano, secada al sol. Textura rugosa perfecta para agarrar la salsa.",
        "price": 8.90,
        "images": ["https://images.unsplash.com/photo-1551462147-37885acc36f1?w=600"],
        "country_origin": "IT",
        "category_id": "alimentacion",
        "ingredients": ["Semola de trigo duro", "Agua"],
        "allergens": ["gluten"],
        "certifications": ["IGP", "OrganicEU"],
        "approved": True,
        "status": "active",
        "featured": False,
        "stock": 200,
        "seller_type": "importer",
        "origin_country": "Italia",
        "import_batch": "BATCH-IT-2024-002",
        "import_date": "2024-02-20",
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
    {
        "product_id": "prod_005",
        "producer_id": "imp_test_001",
        "producer_name": "Importadora del Mediterraneo",
        "name": "Aceitunas Kalamata Griegas",
        "slug": "aceitunas-kalamata-griegas",
        "description": "Aceitunas Kalamata seleccionadas de Grecia. En salmuera natural.",
        "price": 12.50,
        "images": ["https://images.unsplash.com/photo-1542838132-92c53300491e?w=600"],
        "country_origin": "GR",
        "category_id": "alimentacion",
        "ingredients": ["Aceitunas Kalamata", "Agua", "Sal", "Vinagre de vino"],
        "allergens": [],
        "certifications": ["PDO", "OrganicEU"],
        "approved": True,
        "status": "active",
        "featured": False,
        "stock": 120,
        "seller_type": "importer",
        "origin_country": "Grecia",
        "import_batch": "BATCH-GR-2024-001",
        "import_date": "2024-01-25",
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
]

SEED_CATEGORIES = [
    {
        "category_id": "alimentacion",
        "name": "Alimentacion",
        "slug": "alimentacion",
        "description": "Productos alimenticios de alta calidad",
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
    {
        "category_id": "lacteos",
        "name": "Lacteos",
        "slug": "lacteos",
        "description": "Quesos, yogures y productos lacteos",
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
    {
        "category_id": "bebidas",
        "name": "Bebidas",
        "slug": "bebidas",
        "description": "Vinos, cervezas y bebidas",
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
]

async def seed_users():
    """Seed users into the database"""
    print("[INFO] Seeding users...")
    for user in SEED_USERS:
        existing = await db.users.find_one({"user_id": user["user_id"]})
        if existing:
            print(f"  [SKIP] User {user['email']} already exists")
            continue
        await db.users.insert_one(user)
        print(f"  [OK] Created user: {user['email']} ({user['role']})")
    print()

async def seed_stores():
    """Seed stores into the database"""
    print("[INFO] Seeding stores...")
    for store in SEED_STORES:
        existing = await db.store_profiles.find_one({"store_id": store["store_id"]})
        if existing:
            print(f"  [SKIP] Store {store['slug']} already exists")
            continue
        await db.store_profiles.insert_one(store)
        print(f"  [OK] Created store: {store['name']} ({store['owner_type']})")
    print()

async def seed_products():
    """Seed products into the database"""
    print("[INFO] Seeding products...")
    for product in SEED_PRODUCTS:
        existing = await db.products.find_one({"product_id": product["product_id"]})
        if existing:
            print(f"  [SKIP] Product {product['slug']} already exists")
            continue
        await db.products.insert_one(product)
        seller_type = product.get('seller_type', 'producer')
        origin = product.get('origin_country', 'N/A')
        print(f"  [OK] Created product: {product['name']} ({seller_type}, origin: {origin})")
    print()

async def seed_categories():
    """Seed categories into the database"""
    print("[INFO] Seeding categories...")
    for category in SEED_CATEGORIES:
        existing = await db.categories.find_one({"category_id": category["category_id"]})
        if existing:
            print(f"  [SKIP] Category {category['slug']} already exists")
            continue
        await db.categories.insert_one(category)
        print(f"  [OK] Created category: {category['name']}")
    print()

async def verify_data():
    """Verify seeded data"""
    print("[INFO] Verification:")
    
    user_counts = await db.users.aggregate([
        {"$group": {"_id": "$role", "count": {"$sum": 1}}}
    ]).to_list(10)
    print(f"  Users by role:")
    for item in user_counts:
        print(f"    - {item['_id']}: {item['count']}")
    
    store_counts = await db.store_profiles.aggregate([
        {"$group": {"_id": "$owner_type", "count": {"$sum": 1}}}
    ]).to_list(10)
    print(f"  Stores by owner_type:")
    for item in store_counts:
        print(f"    - {item['_id']}: {item['count']}")
    
    product_counts = await db.products.aggregate([
        {"$group": {"_id": "$seller_type", "count": {"$sum": 1}}}
    ]).to_list(10)
    print(f"  Products by seller_type:")
    for item in product_counts:
        print(f"    - {item['_id']}: {item['count']}")
    
    importer_products = await db.products.find({"seller_type": "importer"}).to_list(10)
    if importer_products:
        print(f"  Importer products origin countries:")
        for p in importer_products:
            print(f"    - {p['name']}: {p.get('origin_country', 'N/A')}")
    print()

async def main():
    print("=" * 60)
    print("HISPALOSHOP MULTI-SELLER SEED SCRIPT")
    print("=" * 60)
    print()
    
    try:
        await seed_categories()
        await seed_users()
        await seed_stores()
        await seed_products()
        await verify_data()
        
        print("=" * 60)
        print("SEED COMPLETED SUCCESSFULLY")
        print("=" * 60)
        print()
        print("Test Credentials:")
        print(f"  Customer:  customer@test.com / {TEST_PASSWORD}")
        print(f"  Producer:  producer@mvp.com / {TEST_PASSWORD}")
        print(f"  Importer:  importer@mvp.com / {TEST_PASSWORD}")
        print(f"  Admin:     admin@mvp.com / {TEST_PASSWORD}")
        print()
        print("Store URLs:")
        print(f"  Producer:  /store/aceites-andaluces")
        print(f"  Importer:  /store/importadora-mediterraneo")
        print()
        
    except Exception as e:
        print(f"[ERROR] Seed failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(main())
