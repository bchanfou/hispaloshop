"""
MongoDB database connection con pooling, timeouts e índices optimizados.
Fase 0: Configuración robusta para producción.
"""
import asyncio
import certifi
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from .config import settings

logger = logging.getLogger(__name__)

# MongoDB client con connection pooling para producción.
# Se inicializa eagerly para que `from core.database import db` funcione
# en todos los entornos (los routes capturan la referencia al importar).
client: AsyncIOMotorClient = AsyncIOMotorClient(
    settings.MONGO_URL,
    maxPoolSize=50,
    minPoolSize=10,
    maxIdleTimeMS=45000,
    connectTimeoutMS=5000,
    serverSelectionTimeoutMS=5000,
    socketTimeoutMS=20000,
    retryWrites=True,
    retryReads=True,
    tlsCAFile=certifi.where(),
)
db = client[settings.DB_NAME]


async def connect_db():
    """Verifica conexión a MongoDB y crea índices en startup."""
    # No reasignar client/db — los routes ya capturaron la referencia al importar.
    await client.admin.command('ping')
    logger.info("OK: Connected to MongoDB: %s", settings.DB_NAME)

    # Crear índices críticos
    await _create_indexes()


async def disconnect_db():
    """Cierra conexión a MongoDB gracefulmente."""
    client.close()
    logger.info("OK: Disconnected from MongoDB")


def get_db():
    """Retorna la instancia de base de datos."""
    return db


async def _create_indexes():
    """
    Crea índices críticos para performance.
    Se ejecuta en startup.
    """
    if db is None:
        raise RuntimeError("Database not connected. Call connect_db() first.")
    
    logger.info("Creating indexes...")
    
    # Users - índices críticos
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True, sparse=True)
    await db.users.create_index("role")
    await db.users.create_index("country")
    await db.users.create_index("influencer_data.affiliate_code", unique=True, sparse=True)
    await db.users.create_index("stripe_account_id", sparse=True)
    await db.users.create_index("created_at")
    logger.info("  OK: users indexes")
    
    # Products - índices para búsquedas y filtros
    await db.products.create_index("product_id", unique=True, sparse=True)
    await db.products.create_index("slug")
    await db.products.create_index("producer_id")
    await db.products.create_index("category_id")
    await db.products.create_index("country_origin")
    await db.products.create_index("approved")
    await db.products.create_index("status")
    await db.products.create_index("seller_type")
    # Índice compuesto para feed/trending
    await db.products.create_index([("approved", 1), ("created_at", -1)])
    await db.products.create_index([("producer_id", 1), ("approved", 1)])
    await db.products.create_index([("category_id", 1), ("approved", 1), ("price", 1)])
    # Text search
    await db.products.create_index([("name", "text"), ("description", "text")])
    logger.info("  OK: products indexes")
    
    # Orders - índices para consultas por usuario y estado
    await db.orders.create_index("order_id", unique=True, sparse=True)
    await db.orders.create_index("user_id")
    await db.orders.create_index("status")
    await db.orders.create_index("payment_status")
    await db.orders.create_index("influencer_id", sparse=True)
    await db.orders.create_index("influencer_discount_code", sparse=True)
    await db.orders.create_index([("user_id", 1), ("created_at", -1)])
    await db.orders.create_index([("producer_id", 1), ("created_at", -1)])
    logger.info("  OK: orders indexes")
    
    # Cart - índices para operaciones rápidas
    await db.cart.create_index("user_id", unique=True)
    await db.cart.create_index([("user_id", 1), ("items.product_id", 1)])
    logger.info("  OK: cart indexes")
    
    # Posts/Social - índices para feed
    await db.posts.create_index("author_id")
    await db.posts.create_index("tenant_id")
    await db.posts.create_index("type")
    await db.posts.create_index("status")
    await db.posts.create_index([("tenant_id", 1), ("created_at", -1)])
    await db.posts.create_index([("author_id", 1), ("created_at", -1)])
    logger.info("  OK: posts indexes")
    
    # Conversations/Messages
    await db.conversations.create_index("conversation_id", unique=True, sparse=True)
    await db.conversations.create_index("participants.user_id")
    await db.conversations.create_index([("participants.user_id", 1), ("updated_at", -1)])
    await db.messages.create_index("conversation_id")
    await db.messages.create_index([("conversation_id", 1), ("created_at", -1)])
    logger.info("  OK: conversations/messages indexes")
    
    # Stores
    await db.stores.create_index("store_id", unique=True, sparse=True)
    await db.stores.create_index("slug", unique=True)
    await db.stores.create_index("producer_id")
    await db.stores.create_index("store_type")
    logger.info("  OK: stores indexes")
    
    # Categories
    await db.categories.create_index("category_id", unique=True, sparse=True)
    await db.categories.create_index("slug", unique=True)
    logger.info("  OK: categories indexes")
    
    # Certificates
    await db.certificates.create_index("certificate_id", unique=True, sparse=True)
    await db.certificates.create_index("product_id")
    await db.certificates.create_index("approved")
    logger.info("  OK: certificates indexes")
    
    # Notifications
    await db.notifications.create_index("user_id")
    await db.notifications.create_index("producer_id", sparse=True)
    await db.notifications.create_index([("user_id", 1), ("read_at", 1)])
    await db.notifications.create_index([("user_id", 1), ("created_at", -1)])
    await db.notifications.create_index([("producer_id", 1), ("created_at", -1)], sparse=True)
    logger.info("  OK: notifications indexes")
    
    # Discount codes / Influencers
    await db.discount_codes.create_index("code", unique=True)
    await db.discount_codes.create_index("influencer_id", sparse=True)
    await db.influencers.create_index("influencer_id", unique=True, sparse=True)
    await db.influencers.create_index("email")
    await db.influencers.create_index("stripe_account_id", sparse=True)
    logger.info("  OK: discount_codes/influencers indexes")
    
    # Reviews
    await db.reviews.create_index("review_id", unique=True, sparse=True)
    await db.reviews.create_index("product_id")
    await db.reviews.create_index("user_id")
    await db.reviews.create_index([("product_id", 1), ("created_at", -1)])
    logger.info("  OK: reviews indexes")

    # Communities
    await db.communities.create_index("slug", unique=True)
    await db.communities.create_index("category")
    await db.communities.create_index([("member_count", -1)])
    await db.community_members.create_index(
        [("community_id", 1), ("user_id", 1)], unique=True
    )
    await db.community_posts.create_index(
        [("community_id", 1), ("created_at", -1)]
    )
    await db.community_post_likes.create_index(
        [("post_id", 1), ("user_id", 1)], unique=True
    )
    logger.info("  OK: communities indexes")

    # Collaborations
    await db.collaborations.create_index("collab_id", unique=True)
    await db.collaborations.create_index("producer_id")
    await db.collaborations.create_index("influencer_id")
    await db.collaborations.create_index([("producer_id", 1), ("status", 1)])
    await db.collaborations.create_index([("influencer_id", 1), ("status", 1)])
    await db.collaborations.create_index("conversation_id")
    logger.info("  OK: collaborations indexes")

    # B2B
    await db.b2b_requests.create_index([("producer_id", 1), ("status", 1)])
    await db.b2b_requests.create_index("importer_id")
    logger.info("  OK: b2b indexes")

    # Affiliate commissions
    await db.influencer_commissions.create_index(
        [("influencer_id", 1), ("status", 1)]
    )
    await db.customer_influencer_attribution.create_index(
        "consumer_id", unique=True, sparse=True
    )
    logger.info("  OK: affiliate indexes")

    # Stock holds with TTL
    try:
        await db.stock_holds.create_index(
            "expires_at", expireAfterSeconds=0
        )
        logger.info("  OK: stock_holds TTL index")
    except Exception:
        pass  # May already exist with different options

    # Country configs — seed if empty
    await db.country_configs.create_index("country_code", unique=True)
    existing = await db.country_configs.count_documents({})
    if existing == 0:
        seed_countries = [
            {"country_code": "ES", "name_local": "España", "flag": "🇪🇸", "language": "es", "currency": "EUR", "is_active": True, "admin_user_id": None},
            {"country_code": "FR", "name_local": "France", "flag": "🇫🇷", "language": "fr", "currency": "EUR", "is_active": True, "admin_user_id": None},
            {"country_code": "KR", "name_local": "대한민국", "flag": "🇰🇷", "language": "ko", "currency": "KRW", "is_active": False, "admin_user_id": None},
            {"country_code": "IT", "name_local": "Italia", "flag": "🇮🇹", "language": "it", "currency": "EUR", "is_active": False, "admin_user_id": None},
            {"country_code": "PT", "name_local": "Portugal", "flag": "🇵🇹", "language": "pt", "currency": "EUR", "is_active": False, "admin_user_id": None},
            {"country_code": "DE", "name_local": "Deutschland", "flag": "🇩🇪", "language": "de", "currency": "EUR", "is_active": False, "admin_user_id": None},
        ]
        await db.country_configs.insert_many(seed_countries)
        logger.info("  OK: country_configs seeded")
    logger.info("  OK: country_configs index")

    logger.info("All indexes created successfully")


# Backward compatibility - funciones síncronas para código legacy
def get_database():
    """Retorna db para código que espera función síncrona."""
    return db


