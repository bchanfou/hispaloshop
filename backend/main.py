"""
Hispaloshop API - Stack MongoDB (Activo)
Fase 0: Seguridad reforzada, PostgreSQL congelado en _future_postgres/
"""
import sys
from pathlib import Path

_BACKEND_DIR = Path(__file__).resolve().parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

# === LOGGING — configurar PRIMERO (antes de cualquier otro import que logee) ===
from core.logging_config import configure_logging
configure_logging()

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import logging

# === SENTRY — inicializar antes que todo lo demas ===
from middleware.sentry_init import init_sentry
init_sentry()

# === IMPORTAR NUEVO SISTEMA DE CONFIGURACION ===
# La validacion de variables criticas ocurre aqui
from core.config import settings
from core.database import connect_db, disconnect_db

# Export critical env vars so libraries using os.environ.get() can find them
import os as _os
for _var in ("CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"):
    _val = getattr(settings, _var, None)
    if _val and _var not in _os.environ:
        _os.environ[_var] = _val

# === MIDDLEWARE DE SEGURIDAD ===
from middleware.security import (
    SecurityHeadersMiddleware,
    RateLimitMiddleware,
    RequestLoggingMiddleware
)
from middleware.request_id import RequestIDMiddleware

# === STACK MONGODB (LEGACY - ACTIVO) ===
from routes.auth import router as legacy_auth_router
from routes.config import router as legacy_config_router
from routes.feed import router as legacy_feed_router
from routes.products import router as legacy_products_router
from routes.social import router as legacy_social_router
from routes.stores import router as legacy_stores_router
from routes.cart import router as legacy_cart_router
from routes.orders import router as legacy_orders_router
from routes.influencer import router as legacy_influencer_router
from routes.influencer_fiscal import router as influencer_fiscal_router
from routes.admin_fiscal import router as admin_fiscal_router
from routes.subscriptions import router as legacy_subscriptions_router
from routes.customer import router as legacy_customer_router
from routes.wishlist import router as legacy_wishlist_router
from routes.wishlists import router as wishlists_router
from routes.notifications import router as legacy_notifications_router
from routes.uploads import router as legacy_uploads_router
from routes.certificates import router as legacy_certificates_router
from routes.cron import router as legacy_cron_router
from routes.recipes_reviews import router as legacy_recipes_reviews_router
from routes.admin import router as legacy_admin_router
from routes.admin_dashboard import router as legacy_admin_dashboard_router
from routes.badges import router as legacy_badges_router
from routes.conversations import router as legacy_conversations_router
from routes.directory import router as legacy_directory_router
from routes.insights import router as legacy_insights_router
from routes.internal_chat import router as legacy_internal_chat_router
from routes.predictions import router as legacy_predictions_router
from routes.producer import router as legacy_producer_router
from routes.push_notifications import router as legacy_push_notifications_router
from routes.producer_registration import router as producer_registration_router
from routes.importer_registration import router as importer_registration_router
from routes.importer import router as legacy_importer_router
from routes.onboarding import router as onboarding_router
from routes.producer_verification import router as producer_verification_router
from routes.admin_verification import router as admin_verification_router
from routes.ai import router as ai_router
from routes.frontend_compat import router as frontend_compat_router
from routes.rfq import router as rfq_router
from routes.support import router as support_router
from routes.moderation import router as moderation_router
from routes.discovery import router as discovery_router
from routes.posts import router as legacy_posts_router
from routes.communities import router as communities_router
from routes.content_moderation import router as content_moderation_router
from routes.collaborations import router as collaborations_router
from routes.documents import router as documents_router

from routes.gamification import router as gamification_router
from routes.loyalty import router as loyalty_router
from routes.invoices import router as invoices_router
from routes.translation import router as translation_router

logger = logging.getLogger(__name__)

try:
    from routes.ai_chat import router as legacy_ai_chat_router
except Exception as exc:
    logger.warning("Legacy AI router disabled: %s", exc)
    legacy_ai_chat_router = None


app = FastAPI(
    title="Hispaloshop API",
    version="1.0.0",
    debug=settings.DEBUG,
    docs_url="/docs" if settings.ENV != "production" else None,
    redoc_url="/redoc" if settings.ENV != "production" else None,
)

# Ensure static uploads path exists in local/dev startup.
Path("uploads").mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ============================================
# MIDDLEWARE DE SEGURIDAD - FASE 0
# ============================================

# 1. CORS Configuration - RESTRICTIVO
origins = []
for origin in settings.ALLOWED_ORIGINS.split(","):
    normalized = origin.strip().rstrip("/")
    if normalized and normalized not in origins:
        origins.append(normalized)

for candidate in [
    settings.FRONTEND_URL,
    "https://hispaloshop.com",
    "https://www.hispaloshop.com",
    "http://localhost:3000",
]:
    normalized = candidate.strip().rstrip("/")
    if normalized and normalized not in origins:
        origins.append(normalized)

# En produccion, rechazar wildcard origins
if settings.ENV == "production":
    if "*" in origins:
        raise ValueError("Wildcard '*' not allowed in ALLOWED_ORIGINS in production")
    logger.info("[SECURITY] CORS origins (production): %d configured", len(origins))
else:
    logger.info("[SECURITY] CORS origins (development): %s", origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "X-Requested-With",
        "Accept",
        "Origin",
        "X-CSRF-Token",
        "X-Client-Version",
        "X-Request-ID",
    ],
    expose_headers=["X-Total-Count"],
    max_age=600,  # 10 minutos cache preflight
)

# 2. Security Headers Middleware
app.add_middleware(SecurityHeadersMiddleware)

# 2b. CSRF Protection (double-submit cookie)
from middleware.csrf import CSRFMiddleware
app.add_middleware(CSRFMiddleware)

# 3. Rate Limiting Middleware (100 req/min, burst 50 — páginas de perfil hacen 6+ requests simultáneas)
app.add_middleware(RateLimitMiddleware, requests_per_minute=100, burst_size=50)

# 4. Request Logging (all envs — logs slow requests >2s in production)
app.add_middleware(RequestLoggingMiddleware)

# 5. Request correlation ID (UUID per request, X-Request-ID header)
app.add_middleware(RequestIDMiddleware)

# ============================================
# API Routes - Stack MongoDB (Funcional)
# ============================================
app.include_router(frontend_compat_router, prefix="/api", tags=["frontend-compat"])
app.include_router(legacy_auth_router, prefix="/api", tags=["auth"])
app.include_router(legacy_config_router, prefix="/api", tags=["config"])
app.include_router(legacy_feed_router, prefix="/api", tags=["feed"])
app.include_router(legacy_posts_router, prefix="/api", tags=["posts"])
app.include_router(legacy_products_router, prefix="/api", tags=["products"])
app.include_router(legacy_social_router, prefix="/api", tags=["social"])
app.include_router(legacy_stores_router, prefix="/api", tags=["stores"])
app.include_router(legacy_cart_router, prefix="/api", tags=["cart"])
app.include_router(legacy_orders_router, prefix="/api", tags=["orders"])
app.include_router(legacy_influencer_router, prefix="/api", tags=["influencer"])
app.include_router(influencer_fiscal_router, prefix="/api", tags=["influencer-fiscal"])
app.include_router(admin_fiscal_router, prefix="/api", tags=["admin-fiscal"])
app.include_router(legacy_subscriptions_router, prefix="/api", tags=["subscriptions"])
app.include_router(legacy_customer_router, prefix="/api", tags=["customer"])
app.include_router(legacy_wishlist_router, prefix="/api", tags=["wishlist"])
app.include_router(wishlists_router, prefix="/api", tags=["wishlists"])
app.include_router(legacy_notifications_router, prefix="/api", tags=["notifications"])
app.include_router(legacy_uploads_router, prefix="/api", tags=["uploads"])
app.include_router(legacy_certificates_router, prefix="/api", tags=["certificates"])
app.include_router(legacy_cron_router, prefix="/api", tags=["cron"])
app.include_router(legacy_recipes_reviews_router, prefix="/api", tags=["recipes-reviews"])
app.include_router(legacy_admin_router, prefix="/api", tags=["admin"])
app.include_router(legacy_admin_dashboard_router, prefix="/api", tags=["admin-dashboard"])
if legacy_ai_chat_router is not None:
    app.include_router(legacy_ai_chat_router, prefix="/api", tags=["ai-chat"])
app.include_router(legacy_badges_router, prefix="/api", tags=["badges"])
app.include_router(legacy_conversations_router, prefix="/api", tags=["conversations"])
app.include_router(legacy_directory_router, prefix="/api", tags=["directory"])
app.include_router(legacy_insights_router, prefix="/api", tags=["insights"])
app.include_router(legacy_internal_chat_router, prefix="/api", tags=["internal-chat"])
app.include_router(legacy_predictions_router, prefix="/api", tags=["predictions"])
app.include_router(legacy_producer_router, prefix="/api", tags=["producer"])
app.include_router(legacy_importer_router, prefix="/api", tags=["importer"])
app.include_router(legacy_push_notifications_router, prefix="/api", tags=["push"])
app.include_router(producer_registration_router, prefix="/api", tags=["producer-registration"])
app.include_router(importer_registration_router, prefix="/api", tags=["importer-registration"])
app.include_router(rfq_router, prefix="/api", tags=["RFQ"])
app.include_router(support_router, prefix="/api", tags=["support"])
app.include_router(moderation_router, prefix="/api", tags=["moderation"])
app.include_router(communities_router, prefix="/api", tags=["communities"])
app.include_router(discovery_router, prefix="/api", tags=["discovery"])

from routes.search import router as search_router
app.include_router(search_router, prefix="/api", tags=["search"])

# Onboarding Routes
app.include_router(onboarding_router, prefix="/api", tags=["onboarding"])

# Producer/Importer Verification Routes (Fase 23)
app.include_router(producer_verification_router, prefix="/api", tags=["verification"])
app.include_router(admin_verification_router, prefix="/api", tags=["admin-verification"])

# Content Moderation Routes (Fase 24)
app.include_router(content_moderation_router, prefix="/api", tags=["content-moderation"])

# Collaborations Routes (Fase 28)
app.include_router(collaborations_router, prefix="/api", tags=["collaborations"])

# Documents & Digital Signature Routes (Fase 29)
app.include_router(documents_router, prefix="/api", tags=["documents"])

# A/B Experiments Routes (Ciclo 4)
# experiments_router removed (A/B testing — using PostHog instead)

# Gamification Routes (Ciclo 8)
app.include_router(gamification_router, prefix="/api", tags=["gamification"])
app.include_router(loyalty_router, prefix="/api", tags=["loyalty"])

# Invoice Routes (Ciclo 10)
app.include_router(invoices_router, prefix="/api", tags=["invoices"])

# Translation Routes (i18n universal)
app.include_router(translation_router, prefix="/api", tags=["translation"])

# AI Routes (Fase 1)
app.include_router(ai_router, prefix="/api/ai", tags=["AI"])

# David AI — Consumer assistant (Claude Haiku)
from routes.hispal_ai import router as hispal_ai_router
app.include_router(hispal_ai_router, prefix="/api", tags=["hispal-ai"])

# Rebeca AI — PRO+ local sales assistant (Claude Haiku)
from routes.rebeca_ai import router as rebeca_ai_router
app.include_router(rebeca_ai_router, prefix="/api", tags=["rebeca-ai"])

# Commercial AI — ELITE producer agent (Claude Sonnet)
from routes.commercial_ai import router as commercial_ai_router
app.include_router(commercial_ai_router, prefix="/api", tags=["commercial-ai"])

# Social Routes (Fase 3) — posts_router ya registrado como legacy_posts_router en /api arriba

# B2B Routes (Fase 4)
from routes.b2b import router as b2b_router
app.include_router(b2b_router, prefix="/api/b2b", tags=["B2B"])

# B2B Operations — formal offers & Incoterms (Fase 20)
from routes.b2b_operations import router as b2b_operations_router
app.include_router(b2b_operations_router, prefix="/api/b2b/operations", tags=["B2B Operations"])

# B2B Payments — Stripe PaymentIntents for B2B (Fase 20)
from routes.b2b_payments import router as b2b_payments_router
app.include_router(b2b_payments_router, prefix="/api/b2b/operations", tags=["B2B Payments"])

# Chat B2B Routes (Fase 4)
from routes.chat_b2b import router as chat_b2b_router
app.include_router(chat_b2b_router, prefix="/api", tags=["Chat B2B"])

# FASE 5: Superadmin Enterprise + Chat Real-Time + Notificaciones
# Superadmin Routes
from routes.superadmin.dashboard import router as superadmin_dashboard_router
from routes.superadmin.audit import router as superadmin_audit_router
from routes.superadmin.moderation import router as superadmin_moderation_router
app.include_router(superadmin_dashboard_router, prefix="/api", tags=["Superadmin Dashboard"])
app.include_router(superadmin_audit_router, prefix="/api", tags=["Superadmin Audit"])
app.include_router(superadmin_moderation_router, prefix="/api", tags=["Superadmin Moderation"])

# Notifications Routes (Fase 5) — notifications ya registradas en /api arriba con su propio prefix /notifications

# Sitemap (SEO)
from routes.sitemap import router as sitemap_router
app.include_router(sitemap_router, tags=["sitemap"])

# WebSocket Routes (Fase 5)
from routes.websocket_chat import router as websocket_router
app.include_router(websocket_router)


@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    # Sanitize path to prevent XSS reflection in JSON responses
    import html
    safe_path = html.escape(str(request.url.path))
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={
            "detail": "Route not found",
            "path": safe_path,
        },
    )


@app.exception_handler(Exception)
async def internal_error_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s", request.url.path, exc_info=exc)
    content = {
        "detail": "Internal server error",
        "path": str(request.url.path),
    }
    # In development, include error type for debugging (never the full traceback)
    if settings.ENV != "production":
        content["error_type"] = type(exc).__name__
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=content,
    )


async def _health_payload() -> dict:
    """
    Build health payload with a real MongoDB ping. Used by both /health
    and /api/health. No auth required — callable by external monitors.
    """
    from datetime import datetime, timezone
    from core.database import client as _mongo_client

    db_status = "connected"
    db_latency_ms: float | None = None
    try:
        import time
        t0 = time.perf_counter()
        await _mongo_client.admin.command("ping")
        db_latency_ms = round((time.perf_counter() - t0) * 1000, 2)
    except Exception as exc:  # noqa: BLE001 — health must never raise
        logger.warning("[HEALTH] MongoDB ping failed: %s", exc)
        db_status = "unreachable"

    return {
        "status": "ok" if db_status == "connected" else "degraded",
        "version": "1.0.0",
        "environment": settings.ENV,
        "db": db_status,
        "db_latency_ms": db_latency_ms,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/health")
async def health():
    """Health check con ping real a MongoDB. Callable sin autenticacion."""
    return await _health_payload()


@app.get("/api/health")
async def legacy_health():
    """Health check legacy (misma implementacion, path /api/health)."""
    return await _health_payload()


# Startup event para validar configuracion
async def _run_daily_cron():
    """Background loop that runs scheduled B2B payments and influencer payouts daily."""
    import asyncio
    from bson import ObjectId as _OID
    while True:
        try:
            from core.database import db as _db
            from datetime import datetime, timezone
            now = datetime.now(timezone.utc)
            # B2B scheduled payments
            pending = await _db.b2b_scheduled_payments.find(
                {"status": "pending", "scheduled_for": {"$lte": now.isoformat()}}
            ).to_list(100)
            for p in pending:
                try:
                    import stripe as _stripe
                    _stripe.api_key = settings.STRIPE_SECRET_KEY
                    op_id = p.get("operation_id")
                    try:
                        op_id = _OID(op_id) if isinstance(op_id, str) else op_id
                    except Exception:
                        pass
                    operation = await _db.b2b_operations.find_one({"_id": op_id})
                    if not operation: continue
                    seller = await _db.users.find_one({"user_id": operation.get("seller_id")})
                    if not seller or not seller.get("stripe_account_id"): continue
                    amount_cents = int(round(p.get("amount", 0) * 100))
                    if amount_cents <= 0: continue
                    _stripe.Transfer.create(
                        amount=amount_cents,
                        currency=p.get("currency", "eur"),
                        destination=seller["stripe_account_id"],
                        metadata={"type": "b2b_scheduled", "operation_id": str(p.get("operation_id"))},
                    )
                    await _db.b2b_scheduled_payments.update_one(
                        {"_id": p["_id"]}, {"$set": {"status": "completed", "processed_at": now.isoformat()}}
                    )
                    logger.info(f"[CRON] B2B scheduled payment processed: {p.get('operation_id')}")
                except Exception as exc:
                    logger.error(f"[CRON] B2B scheduled payment failed: {exc}")
                    await _db.b2b_scheduled_payments.update_one(
                        {"_id": p["_id"]}, {"$set": {"status": "failed", "error": str(exc)[:200]}}
                    )
        except Exception as exc:
            logger.error(f"[CRON] Daily cron error: {exc}")
        await asyncio.sleep(86400)  # Wait 24h before next run


@app.on_event("startup")
async def startup_event():
    """Validaciones, conexion DB, arranque de background tasks."""
    # 1. Validate env vars per environment (raises in staging/prod if critical missing)
    from core.env_validation import validate_environment, log_optional_capabilities
    validate_environment(settings)
    log_optional_capabilities(settings)

    # 2. Connect to MongoDB and create indexes
    await connect_db()

    # 3. Banner log (one structured event, not 10 print lines)
    logger.info(
        "[STARTUP] Hispaloshop API ready",
        extra={
            "version": "1.0.0",
            "environment": settings.ENV,
            "db_name": settings.DB_NAME,
            "cors_origins": len(origins),
        },
    )

    # 4. Warm plans cache from DB
    from services.subscriptions import warm_plans_cache
    await warm_plans_cache()

    # 5. Launch daily cron background task
    import asyncio
    asyncio.create_task(_run_daily_cron())
    logger.info("[STARTUP] Daily cron task launched (B2B scheduled payments)")


@app.on_event("shutdown")
async def shutdown_event():
    """Cerrar conexiones abiertas al detener la app."""
    await disconnect_db()
