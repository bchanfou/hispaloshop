"""
MongoDB database connection con pooling, timeouts e índices optimizados.
Fase 0: Configuración robusta para producción.
"""
import asyncio
import certifi
import logging
from pymongo.errors import OperationFailure
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
    try:
        await client.admin.command('ping')
    except Exception as exc:
        logger.critical("FATAL: Cannot connect to MongoDB (%s): %s", settings.MONGO_URL.split("@")[-1], exc)
        raise RuntimeError(f"MongoDB connection failed: {exc}") from exc
    logger.info("OK: Connected to MongoDB: %s", settings.DB_NAME)

    # Crear índices críticos
    try:
        await _create_indexes()
    except Exception as exc:
        logger.error("Index creation failed (non-fatal): %s", exc)


async def disconnect_db():
    """Cierra conexión a MongoDB gracefulmente."""
    client.close()
    logger.info("OK: Disconnected from MongoDB")


def get_db():
    """Retorna la instancia de base de datos."""
    return db


async def _safe_create_index(collection, keys, **kwargs):
    """Create index, dropping and recreating if options conflict."""
    try:
        await collection.create_index(keys, **kwargs)
    except OperationFailure as e:
        if e.code == 86:  # IndexKeySpecsConflict
            # Drop the existing index and recreate with new options
            name = keys if isinstance(keys, str) else "_".join(
                f"{k}_{v}" for k, v in keys
            )
            await collection.drop_index(f"{name}_1" if isinstance(keys, str) else name)
            await collection.create_index(keys, **kwargs)
        else:
            raise


async def _ensure_recipes_slug_index():
    """Ensure recipes.slug is unique only when slug is a non-empty string."""
    # Some Mongo-compatible engines reject $ne in partialFilterExpression.
    # Prefer a strict non-empty string filter, then fall back to string-only.
    preferred_partials = [
        {
            "slug": {
                "$exists": True,
                "$type": "string",
                "$gt": "",
            }
        },
        {
            "slug": {
                "$exists": True,
                "$type": "string",
            }
        },
    ]

    indexes = await db.recipes.index_information()
    legacy_slug_index = indexes.get("slug_1")

    # Legacy unique index on slug treats multiple nulls as duplicates.
    # Drop it so we can replace with a partial unique index.
    if legacy_slug_index and legacy_slug_index.get("unique"):
        legacy_partial = legacy_slug_index.get("partialFilterExpression")
        if legacy_partial not in preferred_partials:
            try:
                await db.recipes.drop_index("slug_1")
                logger.info("  MIGRATE: dropped legacy recipes.slug unique index")
            except Exception as exc:
                logger.warning("  SKIP: unable to drop legacy recipes.slug index (%s)", exc)

    for partial in preferred_partials:
        try:
            await db.recipes.create_index(
                "slug",
                name="slug_1",
                unique=True,
                partialFilterExpression=partial,
            )
            return
        except OperationFailure as exc:
            # 67 = CannotCreateIndex (unsupported partial expression on this engine)
            if exc.code == 67:
                logger.warning("  SKIP: recipes.slug partial filter not supported (%s)", partial)
                continue
            raise

    raise RuntimeError("Unable to create compatible recipes.slug unique index")


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
    await db.users.create_index(
        [("name", "text"), ("username", "text")],
        weights={"name": 10, "username": 5},
        name="users_text_search",
        default_language="none",
    )
    logger.info("  OK: users text index")
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
    # Text search index is created later with full weights (name, description, tags, category)
    logger.info("  OK: products indexes")

    # Product signals - social proof (daily reset via cron, not TTL)
    await _safe_create_index(db.product_signals, "product_id", unique=True)
    logger.info("  OK: product_signals indexes")

    # Orders - índices para consultas por usuario y estado
    await db.orders.create_index("order_id", unique=True, sparse=True)
    await db.orders.create_index("user_id")
    await db.orders.create_index("status")
    await db.orders.create_index("payment_status")
    await db.orders.create_index("influencer_id", sparse=True)
    await db.orders.create_index("influencer_discount_code", sparse=True)
    await db.orders.create_index([("user_id", 1), ("created_at", -1)])
    await db.orders.create_index([("producer_id", 1), ("created_at", -1)])
    await db.orders.create_index("payment_session_id", sparse=True)
    await db.orders.create_index("stripe_payment_intent_id", sparse=True)
    await db.orders.create_index("line_items.producer_id")
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
    await _safe_create_index(db.notifications, "producer_id", sparse=True)
    await db.notifications.create_index([("user_id", 1), ("read_at", 1)])
    await db.notifications.create_index([("user_id", 1), ("created_at", -1)])
    await _safe_create_index(db.notifications, [("producer_id", 1), ("created_at", -1)], sparse=True)
    logger.info("  OK: notifications indexes")
    
    # Discount codes / Influencers
    await db.discount_codes.create_index("code", unique=True)
    await db.discount_codes.create_index("influencer_id", sparse=True)
    await db.influencers.create_index("influencer_id", unique=True, sparse=True)
    await db.influencers.create_index("email")
    await db.influencers.create_index("stripe_account_id", sparse=True)
    logger.info("  OK: discount_codes/influencers indexes")
    
    # Reviews — unique constraint prevents duplicate reviews per user per product
    await db.reviews.create_index("review_id", unique=True, sparse=True)
    await db.reviews.create_index("product_id")
    await db.reviews.create_index("user_id")
    await db.reviews.create_index([("product_id", 1), ("created_at", -1)])
    await _safe_create_index(db.reviews, [("product_id", 1), ("user_id", 1)], unique=True)
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
    await db.community_post_comments.create_index("post_id")
    await db.community_reports.create_index(
        [("community_id", 1), ("status", 1), ("created_at", -1)]
    )
    await db.community_reports.create_index(
        [("reporter_id", 1), ("content_type", 1), ("content_id", 1)], unique=True
    )
    await db.community_flash_offers.create_index(
        [("community_id", 1), ("is_active", 1), ("expires_at", -1)]
    )
    await db.community_members.create_index("user_id")
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

    # Internal chat: prevent duplicate conversations between same pair of users
    await _safe_create_index(db.internal_conversations, "_pair_key", unique=True, sparse=True)
    logger.info("  OK: internal_conversations unique pair index")

    # Social: follows and likes — unique constraints prevent duplicates
    await db.user_follows.create_index(
        [("follower_id", 1), ("following_id", 1)], unique=True
    )
    await db.post_likes.create_index(
        [("post_id", 1), ("user_id", 1)], unique=True
    )
    await db.reel_likes.create_index(
        [("reel_id", 1), ("user_id", 1)], unique=True
    )
    logger.info("  OK: social unique indexes (follows, likes)")

    # Stories — performance indexes (were missing, causing full-collection scans)
    await _safe_create_index(db.hispalostories, "story_id", unique=True, sparse=True)
    await _safe_create_index(db.hispalostories, [("user_id", 1), ("expires_at", -1)])
    await _safe_create_index(db.hispalostories, [("expires_at", 1), ("is_hidden", 1)])
    await _safe_create_index(db.story_likes, [("story_id", 1), ("user_id", 1)], unique=True)
    await _safe_create_index(db.story_replies, "story_id")
    await _safe_create_index(db.story_highlights, "user_id")
    await _safe_create_index(db.story_highlights, [("highlight_id", 1), ("user_id", 1)], unique=True, sparse=True)
    logger.info("  OK: stories indexes")

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

    # User sessions — TTL for automatic expiration (7 days)
    try:
        await db.user_sessions.create_index("session_token", unique=True)
        await db.user_sessions.create_index(
            "created_at", expireAfterSeconds=7 * 24 * 3600  # 7 days
        )
        logger.info("  OK: user_sessions indexes (with TTL)")
    except Exception:
        pass  # May already exist with different options

    # Processed webhook events — idempotency (TTL 30 days)
    try:
        await db.processed_webhook_events.create_index("event_id", unique=True)
        await db.processed_webhook_events.create_index(
            "processed_at", expireAfterSeconds=30 * 24 * 3600  # 30 days
        )
        logger.info("  OK: processed_webhook_events indexes (with TTL)")
    except Exception:
        pass

    # Country admin audit log — for transparency dashboard
    try:
        await db.country_admin_audit.create_index([("country_code", 1), ("timestamp", -1)])
        await db.country_admin_audit.create_index([("admin_user_id", 1), ("timestamp", -1)])
        await db.country_admin_audit.create_index("action")
        logger.info("  OK: country_admin_audit indexes")
    except Exception:
        pass

    # Super admin audit log + platform config + cron run history (section 3.3)
    try:
        await db.super_admin_audit.create_index([("timestamp", -1)])
        await db.super_admin_audit.create_index([("admin_user_id", 1), ("timestamp", -1)])
        await db.super_admin_audit.create_index([("severity", 1), ("timestamp", -1)])
        await db.super_admin_audit.create_index("action")
        logger.info("  OK: super_admin_audit indexes")
    except Exception:
        pass

    try:
        await db.cron_runs.create_index([("name", 1), ("ran_at", -1)])
        logger.info("  OK: cron_runs indexes")
    except Exception:
        pass

    # Support tickets / messages / articles / csat (section 3.4)
    try:
        await db.support_tickets.create_index([("user_id", 1), ("created_at", -1)])
        await db.support_tickets.create_index([("country_code", 1), ("status", 1), ("priority", 1)])
        await db.support_tickets.create_index([("assigned_admin_id", 1), ("status", 1)])
        await db.support_tickets.create_index([("status", 1), ("sla_first_response_due", 1)])
        await db.support_tickets.create_index("ticket_number", unique=True)
        logger.info("  OK: support_tickets indexes")
    except Exception:
        pass
    try:
        await db.support_messages.create_index([("ticket_id", 1), ("created_at", 1)])
        await db.support_messages.create_index("sender_id")
        logger.info("  OK: support_messages indexes")
    except Exception:
        pass
    try:
        await db.support_articles.create_index("slug", unique=True)
        await db.support_articles.create_index([("category", 1), ("role_target", 1), ("country_target", 1)])
        try:
            await db.support_articles.create_index([("title", "text"), ("body", "text")])
        except Exception:
            pass
        logger.info("  OK: support_articles indexes")
    except Exception:
        pass
    try:
        await db.support_csat.create_index("ticket_id", unique=True)
        await db.support_csat.create_index([("country_code", 1), ("created_at", -1)])
        logger.info("  OK: support_csat indexes")
    except Exception:
        pass

    # Seed the knowledge base with starter articles if empty.
    try:
        from services.support_seed import seed_kb_articles
        await seed_kb_articles()
    except Exception as exc:
        logger.warning("[SUPPORT] KB seed skipped: %s", exc)

    # Moderation v2 (section 3.5)
    try:
        await db.content_reports.create_index([("content_country_code", 1), ("status", 1), ("created_at", -1)])
        await db.content_reports.create_index([("reporter_user_id", 1), ("created_at", -1)])
        await db.content_reports.create_index([("content_author_id", 1), ("created_at", -1)])
        await db.content_reports.create_index([("content_type", 1), ("content_id", 1)])
        await db.content_reports.create_index([("status", 1), ("priority", -1), ("created_at", -1)])
        logger.info("  OK: content_reports indexes")
    except Exception:
        pass
    try:
        await db.moderation_actions.create_index([("target_user_id", 1), ("applied_at", -1)])
        await db.moderation_actions.create_index([("target_content_id", 1), ("applied_at", -1)])
        await db.moderation_actions.create_index([("actor_id", 1), ("applied_at", -1)])
        await db.moderation_actions.create_index([("action_type", 1), ("applied_at", -1)])
        await db.moderation_actions.create_index("action_id", unique=True)
        logger.info("  OK: moderation_actions indexes")
    except Exception:
        pass
    try:
        await db.moderation_appeals.create_index("action_id", unique=True)
        await db.moderation_appeals.create_index([("appellant_user_id", 1), ("created_at", -1)])
        await db.moderation_appeals.create_index([("status", 1), ("created_at", -1)])
        logger.info("  OK: moderation_appeals indexes")
    except Exception:
        pass
    try:
        await db.user_moderation_state.create_index("user_id", unique=True)
        logger.info("  OK: user_moderation_state index")
    except Exception:
        pass
    try:
        # TTL index — Mongo will purge expired counters automatically.
        await db.rate_limit_counters_v2.create_index("expires_at", expireAfterSeconds=0)
        await db.rate_limit_counters_v2.create_index([("user_id", 1), ("action", 1)])
        logger.info("  OK: rate_limit_counters_v2 indexes (TTL)")
    except Exception:
        pass

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

    # Products text search index (for /search relevance scoring)
    try:
        await db.products.create_index(
            [("name", "text"), ("description", "text"), ("tags", "text"), ("category", "text")],
            weights={"name": 10, "tags": 5, "category": 3, "description": 1},
            name="products_text_search",
            default_language="spanish",
        )
        logger.info("  OK: products text search index")
    except Exception as e:
        logger.warning(f"  SKIP: products text search index ({e})")

    # ═══════════════════════════════════════════════════════════════════════════
    # HISPALOTRANSLATE - Cache de traducciones
    # ═══════════════════════════════════════════════════════════════════════════
    await db.translation_cache.create_index("fragment_hash", unique=True)
    await db.translation_cache.create_index([("source_lang", 1), ("target_lang", 1)])
    await db.translation_cache.create_index("category")
    await db.translation_cache.create_index("usage_count")
    logger.info("  OK: translation_cache indexes")

    # ═══════════════════════════════════════════════════════════════════════════
    # CERTIFICATE SCANS - Analytics de escaneos
    # ═══════════════════════════════════════════════════════════════════════════
    await db.certificate_scans.create_index("product_id")
    await db.certificate_scans.create_index([("product_id", 1), ("scanned_at", -1)])
    await db.certificate_scans.create_index("language")
    await db.certificate_scans.create_index("country")
    await db.certificate_scans.create_index("date")
    # TTL: mantener scans por 90 días (analytics rolling)
    try:
        await db.certificate_scans.create_index(
            "scanned_at", expireAfterSeconds=90 * 24 * 3600
        )
    except Exception:
        pass
    logger.info("  OK: certificate_scans indexes")

    # ═══════════════════════════════════════════════════════════════════════════
    # PRODUCT TRANSLATIONS - Cache de traducciones de productos
    # ═══════════════════════════════════════════════════════════════════════════
    await db.product_translations.create_index(
        [("product_id", 1), ("target_lang", 1)], unique=True
    )
    await db.product_translations.create_index("updated_at")
    logger.info("  OK: product_translations indexes")

    # ═══════════════════════════════════════════════════════════════════════════
    # RECIPES - Recetas con ingredientes comprables
    # ═══════════════════════════════════════════════════════════════════════════
    await _ensure_recipes_slug_index()
    await db.recipes.create_index("author_id")
    await db.recipes.create_index("category")
    await db.recipes.create_index("difficulty")
    await db.recipes.create_index("tags")
    await db.recipes.create_index("language")
    await db.recipes.create_index("status")
    await db.recipes.create_index([("status", 1), ("published_at", -1)])
    await db.recipes.create_index([("category", 1), ("ratings.avg", -1)])
    await db.recipes.create_index([("tags", 1), ("published_at", -1)])
    await db.recipes.create_index("ingredients.name")  # Para búsqueda por ingrediente
    logger.info("  OK: recipes indexes")

    # Saved recipes (favoritos)
    await db.saved_recipes.create_index(
        [("user_id", 1), ("recipe_id", 1)], unique=True
    )
    await db.saved_recipes.create_index("saved_at")
    logger.info("  OK: saved_recipes indexes")

    # Recipe ratings
    await db.recipe_ratings.create_index(
        [("user_id", 1), ("recipe_id", 1)], unique=True
    )
    await db.recipe_ratings.create_index("recipe_id")
    logger.info("  OK: recipe_ratings indexes")

    # ═══════════════════════════════════════════════════════════════════════════
    # SEARCH - Historial y trending
    # ═══════════════════════════════════════════════════════════════════════════
    await db.search_history.create_index(
        [("user_id", 1), ("searched_at", -1)]
    )
    await db.search_history.create_index(
        [("user_id", 1), ("query", 1)], unique=True, sparse=True
    )
    # TTL: mantener historial por 90 días
    try:
        await db.search_history.create_index(
            "searched_at", expireAfterSeconds=90 * 24 * 3600
        )
    except Exception:
        pass
    logger.info("  OK: search_history indexes")

    await db.search_trending.create_index(
        [("query", 1), ("country", 1), ("date", 1)], unique=True
    )
    await db.search_trending.create_index(
        [("country", 1), ("date", 1), ("count", -1)]
    )
    logger.info("  OK: search_trending indexes")

    # ═══════════════════════════════════════════════════════════════════════════
    # FEEDBACK - User feedback and feature requests (legacy collection)
    # ═══════════════════════════════════════════════════════════════════════════
    await db.feedback.create_index("user_id")
    await db.feedback.create_index("status")
    await db.feedback.create_index("type")
    await db.feedback.create_index([("is_public", 1), ("votes", -1)])
    await db.feedback.create_index([("is_public", 1), ("created_at", -1)])
    await db.feedback.create_index([("user_id", 1), ("created_at", -1)])
    logger.info("  OK: feedback indexes")

    # ═══════════════════════════════════════════════════════════════════════════
    # FEEDBACK IDEAS — Section 3.7 public idea board
    # ═══════════════════════════════════════════════════════════════════════════
    await db.feedback_ideas.create_index("slug", unique=True)
    await db.feedback_ideas.create_index([("status", 1), ("vote_count", -1), ("created_at", -1)])
    await db.feedback_ideas.create_index([("category", 1), ("status", 1)])
    await db.feedback_ideas.create_index([("author_id", 1), ("created_at", -1)])
    await db.feedback_ideas.create_index([("country_code", 1), ("status", 1), ("vote_count", -1)])
    logger.info("  OK: feedback_ideas indexes")

    # FEEDBACK VOTES
    await db.feedback_votes.create_index([("idea_id", 1), ("user_id", 1)], unique=True)
    await db.feedback_votes.create_index([("user_id", 1), ("created_at", -1)])
    logger.info("  OK: feedback_votes indexes")

    # FEEDBACK COMMENTS
    await db.feedback_comments.create_index([("idea_id", 1), ("created_at", 1)])
    await db.feedback_comments.create_index("author_id")
    logger.info("  OK: feedback_comments indexes")

    # ═══════════════════════════════════════���════════════════════════════��══════
    # GDPR 4.1 — Consent logging + data retention TTLs
    # ════════════════��══════════════════════════════════════════════════════════
    await db.user_consents.create_index([("cookie_id", 1), ("consent_type", 1)], unique=True)
    await db.user_consents.create_index("user_id", sparse=True)
    logger.info("  OK: user_consents indexes")

    await db.data_export_log.create_index([("user_id", 1), ("requested_at", -1)])
    logger.info("  OK: data_export_log indexes")

    await db.deletion_log.create_index("processed_at")
    logger.info("  OK: deletion_log indexes")

    # TTL: notifications auto-expire after 90 days
    try:
        await _safe_create_index(db.notifications, "created_at", expireAfterSeconds=90 * 24 * 3600)
    except Exception:
        pass
    logger.info("  OK: notifications TTL (90 days)")

    # TTL: page_visits / analytics_visits auto-expire after 365 days
    try:
        await db.page_visits.create_index("visited_at", expireAfterSeconds=365 * 24 * 3600)
    except Exception:
        pass
    try:
        await db.analytics_visits.create_index("visited_at", expireAfterSeconds=365 * 24 * 3600)
    except Exception:
        pass
    logger.info("  OK: analytics TTL (365 days)")

    # Pending deletion status index for cron efficiency
    await db.users.create_index([("status", 1), ("deleted_at", 1)], sparse=True)
    logger.info("  OK: users pending_deletion index")

    # Tax forms (section 4.2)
    await db.tax_forms.create_index("user_id", unique=True)
    logger.info("  OK: tax_forms indexes")

    logger.info("All indexes created successfully")


# Backward compatibility - funciones síncronas para código legacy
def get_database():
    """Retorna db para código que espera función síncrona."""
    return db


