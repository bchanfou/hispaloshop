"""
Rebeca AI — Service module with all helpers, tools, and intelligence logic.

Rebeca is the PRO+ producer consulting agent for HispaloShop.
Unlike David (consumer), Rebeca is a professional business advisor:
- Deep memory of business profile, goals, fears
- Proactive alerts and weekly briefings
- Direct platform actions (create discounts, update products, etc.)
- Benchmarking against peer producers
- Content generation (descriptions, captions, emails, B2B copy)
- Goal tracking with SMART targets
- Calendar intelligence per country
- Fear detection and fear-adapted coaching
- Progressive tone (no humor — always professional)
"""
from __future__ import annotations

from datetime import datetime, timezone, timedelta, date
from typing import Optional, Any
import uuid
import logging

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════
# PRODUCER PROFILE — Business context, fears, memory
# ═══════════════════════════════════════════════════════

async def get_or_create_producer_profile(db, user_id: str) -> dict:
    """Fetch or create a producer's Rebeca profile."""
    profile = await db.rebeca_profiles.find_one({"user_id": user_id}, {"_id": 0})
    if not profile:
        profile = {
            "user_id": user_id,
            "business_profile": {
                "category_focus": None,    # main category
                "stage": None,              # "new" | "growing" | "consolidated"
                "main_goal": None,          # "more_sales" | "higher_margin" | "scale" | "brand"
                "main_pain": None,          # "low_sales" | "pricing" | "marketing" | "scaling" | "tech"
            },
            "fear_profile": [],            # list of producer fears
            "emotional_signals": [],       # "fear:X", "motivation:Y"
            "conversation_summary": "",    # AI-generated summary of past interactions
            "interaction_count": 0,
            "tone_level": 1,              # 1=formal, 2=friendly, 3=close (no 4 for Rebeca)
            "onboarding_completed": False,
            "initial_diagnosis": None,    # 3 opportunities detected at onboarding
            "last_briefing_date": None,
            "last_updated": datetime.now(timezone.utc).isoformat(),
        }
        await db.rebeca_profiles.insert_one({**profile})
        profile.pop("_id", None)
    return profile


# ═══════════════════════════════════════════════════════
# PRODUCER FEAR & MOTIVATION DETECTION
# ═══════════════════════════════════════════════════════

PRODUCER_FEAR_PATTERNS = {
    "price_fear": [
        "no puedo subir", "perderé clientes", "muy caro para la gente",
        "can't raise", "lose customers", "too expensive",
        "miedo a subir", "se me van los clientes",
    ],
    "invest_fear": [
        "no tengo presupuesto", "es mucha inversión", "arriesgar dinero",
        "no budget", "risky investment", "no puedo invertir",
    ],
    "new_product_fear": [
        "no sé si funcionará", "nadie lo ha probado", "es arriesgado lanzar",
        "won't work", "unknown product", "miedo a lanzar",
    ],
    "low_sales_anxiety": [
        "no vendo nada", "ventas bajas", "sin ventas",
        "no sales", "sales down", "no se vende", "llevo sin vender",
    ],
    "scale_fear": [
        "no puedo con más", "ya voy saturado", "no me da la vida",
        "can't handle more", "overwhelmed", "sin tiempo",
    ],
    "tech_overwhelm": [
        "no entiendo los números", "demasiados datos", "muy complicado",
        "don't understand", "too much data", "no entiendo",
    ],
}

PRODUCER_MOTIVATION_PATTERNS = {
    "legacy": ["tradición", "familia", "heredé", "mi abuelo", "generaciones", "family business"],
    "quality": ["calidad", "mejor producto", "artesanal", "premium", "handmade"],
    "independence": ["ser mi jefe", "independencia", "no depender", "independence"],
    "growth": ["crecer", "expandir", "más mercados", "exportar", "scale", "grow"],
    "impact": ["salud", "ecología", "sostenibilidad", "comunidad", "sustainable", "impact"],
}


def detect_producer_signals(message: str, current_profile: dict) -> dict:
    """Detect producer-specific fears and motivations from chat."""
    msg = message.lower().strip()
    updates = {}

    current_fears = set(current_profile.get("fear_profile", []))
    for fear, patterns in PRODUCER_FEAR_PATTERNS.items():
        if any(p in msg for p in patterns):
            current_fears.add(fear)
    if current_fears != set(current_profile.get("fear_profile", [])):
        updates["fear_profile"] = list(current_fears)

    current_signals = set(current_profile.get("emotional_signals", []))
    for motivation, patterns in PRODUCER_MOTIVATION_PATTERNS.items():
        if any(p in msg for p in patterns):
            current_signals.add(f"motivation:{motivation}")
    for fear, patterns in PRODUCER_FEAR_PATTERNS.items():
        if any(p in msg for p in patterns):
            current_signals.add(f"fear:{fear}")
    if current_signals != set(current_profile.get("emotional_signals", [])):
        updates["emotional_signals"] = list(current_signals)

    return updates


def compute_tone_level(interaction_count: int) -> int:
    """Rebeca tone: 1=formal, 2=friendly, 3=close. No humor level."""
    if interaction_count < 5:
        return 1
    if interaction_count < 20:
        return 2
    return 3


# ═══════════════════════════════════════════════════════
# ANALYTICAL TOOLS (existing + new)
# ═══════════════════════════════════════════════════════

async def search_local_trends(db, country: str, category: Optional[str], period_days: int):
    """Tendencias de categorías populares en el país del productor."""
    since = datetime.now(timezone.utc) - timedelta(days=period_days)
    match_q: dict[str, Any] = {"created_at": {"$gte": since}}
    if country:
        match_q["country"] = country

    orders = await db.orders.find(match_q, {"line_items": 1}).to_list(500)

    category_counts: dict[str, int] = {}
    product_counts: dict[str, int] = {}
    for order in orders:
        for item in order.get("line_items", []):
            cat = item.get("category_id") or item.get("category", "other")
            category_counts[cat] = category_counts.get(cat, 0) + item.get("quantity", 1)
            pname = item.get("product_name", "")
            if pname:
                product_counts[pname] = product_counts.get(pname, 0) + item.get("quantity", 1)

    return {
        "country": country,
        "period_days": period_days,
        "top_categories": [
            {"category": c, "units_sold": n}
            for c, n in sorted(category_counts.items(), key=lambda x: -x[1])[:8]
        ],
        "top_products": [
            {"name": p, "units_sold": n}
            for p, n in sorted(product_counts.items(), key=lambda x: -x[1])[:10]
        ],
        "total_orders": len(orders),
    }


async def analyze_my_sales(db, producer_id: str, period_days: int):
    """Análisis de ventas del productor."""
    since = datetime.now(timezone.utc) - timedelta(days=period_days)
    orders = await db.orders.find(
        {"created_at": {"$gte": since}, "line_items.producer_id": producer_id},
        {"line_items": 1, "total_amount": 1, "created_at": 1, "country": 1, "_id": 1},
    ).to_list(500)

    items_sold = []
    total_revenue = 0.0
    countries: set[str] = set()
    product_sales: dict[str, dict] = {}
    order_ids: set[str] = set()

    for order in orders:
        counted = False
        for item in order.get("line_items", []):
            if item.get("producer_id") == producer_id:
                if not counted:
                    order_ids.add(str(order.get("_id", "")))
                    counted = True
                qty = item.get("quantity", 1)
                price = item.get("price", 0)
                revenue = qty * price
                total_revenue += revenue
                countries.add(order.get("country", "unknown"))
                pname = item.get("product_name", "unknown")
                if pname not in product_sales:
                    product_sales[pname] = {"units": 0, "revenue": 0}
                product_sales[pname]["units"] += qty
                product_sales[pname]["revenue"] += revenue

    top_products = sorted(product_sales.items(), key=lambda x: -x[1]["revenue"])[:10]
    return {
        "period_days": period_days,
        "total_orders": len(order_ids),
        "total_items_sold": sum(data["units"] for data in product_sales.values()),
        "total_revenue": round(total_revenue, 2),
        "unique_countries": list(countries),
        "top_products": [
            {"name": name, "units": data["units"], "revenue": round(data["revenue"], 2)}
            for name, data in top_products
        ],
        "daily_average": round(total_revenue / max(period_days, 1), 2),
    }


async def suggest_pricing(db, producer_id: str, country: str, product_id: Optional[str]):
    """Sugerencias de precio basadas en competencia local."""
    my_products = await db.products.find(
        {"producer_id": producer_id, "approved": True}, {"_id": 0},
    ).to_list(50)

    if product_id:
        my_products = [p for p in my_products if p.get("product_id") == product_id]

    suggestions = []
    for product in my_products[:10]:
        category = product.get("category_id")
        if not category:
            continue
        my_price = product.get("price", 0)
        competitors = await db.products.find({
            "category_id": category, "approved": True,
            "producer_id": {"$ne": producer_id},
            "$or": [
                {"available_countries": country},
                {"available_countries": None},
                {"available_countries": {"$exists": False}},
            ],
        }, {"_id": 0, "price": 1, "name": 1}).to_list(20)

        if not competitors:
            continue
        prices = [c.get("price", 0) for c in competitors if c.get("price")]
        if not prices:
            continue

        avg_price = sum(prices) / len(prices)
        status = "competitivo"
        if my_price > avg_price * 1.2:
            status = "por encima del mercado"
        elif my_price < avg_price * 0.8:
            status = "por debajo del mercado"

        suggestions.append({
            "product": product.get("name", ""),
            "product_id": product.get("product_id"),
            "my_price": round(my_price, 2),
            "market_avg": round(avg_price, 2),
            "market_min": round(min(prices), 2),
            "market_max": round(max(prices), 2),
            "competitors": len(competitors),
            "status": status,
        })

    return {"suggestions": suggestions, "analyzed": len(suggestions)}


async def get_my_reviews(db, producer_id: str):
    """Resumen de reseñas del productor."""
    my_products = await db.products.find(
        {"producer_id": producer_id}, {"_id": 0, "product_id": 1, "name": 1},
    ).to_list(100)
    product_ids = [p["product_id"] for p in my_products if p.get("product_id")]
    if not product_ids:
        return {"total_reviews": 0, "average_rating": 0, "products": []}

    reviews = await db.reviews.find(
        {"product_id": {"$in": product_ids}}, {"_id": 0},
    ).to_list(500)
    if not reviews:
        return {"total_reviews": 0, "average_rating": 0, "products": []}

    total_rating = sum(r.get("rating", 0) for r in reviews)
    avg_rating = total_rating / len(reviews)

    product_reviews: dict[str, dict] = {}
    for r in reviews:
        pid = r.get("product_id")
        if pid not in product_reviews:
            product_reviews[pid] = {"ratings": [], "comments": [], "negative": []}
        rating = r.get("rating", 0)
        product_reviews[pid]["ratings"].append(rating)
        comment = r.get("comment", "")
        if comment:
            product_reviews[pid]["comments"].append(comment[:150])
            if rating <= 2:
                product_reviews[pid]["negative"].append(comment[:150])

    product_map = {p["product_id"]: p.get("name", "") for p in my_products}
    summaries = []
    for pid, data in product_reviews.items():
        ratings = data["ratings"]
        summaries.append({
            "product": product_map.get(pid, pid),
            "product_id": pid,
            "review_count": len(ratings),
            "avg_rating": round(sum(ratings) / len(ratings), 1) if ratings else 0,
            "negative_reviews": data["negative"][:3],
            "recent_comments": data["comments"][:3],
        })
    summaries.sort(key=lambda x: -x["review_count"])

    return {
        "total_reviews": len(reviews),
        "average_rating": round(avg_rating, 1),
        "products": summaries[:10],
    }


async def benchmark_vs_peers(db, producer_id: str, country: str):
    """Comparación anonimizada con productores de la misma categoría."""
    my_products = await db.products.find(
        {"producer_id": producer_id, "approved": True}, {"_id": 0, "category_id": 1},
    ).to_list(50)
    if not my_products:
        return {"error": "No tienes productos aprobados para comparar"}

    # Determine main category
    cat_count: dict[str, int] = {}
    for p in my_products:
        cat = p.get("category_id", "other")
        cat_count[cat] = cat_count.get(cat, 0) + 1
    main_cat = max(cat_count.items(), key=lambda x: x[1])[0]

    # Get peer producers in same category
    peer_products = await db.products.find(
        {"category_id": main_cat, "approved": True, "producer_id": {"$ne": producer_id}},
        {"_id": 0, "producer_id": 1, "price": 1, "rating": 1},
    ).to_list(500)

    peer_ids = {p["producer_id"] for p in peer_products if p.get("producer_id")}

    # Aggregate peer stats (anonymized)
    peer_avg_price = sum(p.get("price", 0) for p in peer_products) / max(len(peer_products), 1)
    peer_avg_rating = sum(p.get("rating", 0) for p in peer_products if p.get("rating")) / max(
        len([p for p in peer_products if p.get("rating")]), 1)

    # My stats
    since_30d = datetime.now(timezone.utc) - timedelta(days=30)
    my_orders = await db.orders.count_documents({
        "created_at": {"$gte": since_30d},
        "line_items.producer_id": producer_id,
    })
    my_product_count = len(my_products)

    # Top performers in category (by orders count)
    top_performers_patterns = []
    if peer_ids:
        # Sample best practices: avg products per top producer, packs usage, etc.
        top_producer_ids = list(peer_ids)[:20]
        top_products_data = await db.products.find(
            {"producer_id": {"$in": top_producer_ids}},
            {"_id": 0, "producer_id": 1, "variants": 1, "certifications": 1},
        ).to_list(200)

        packs_users = sum(1 for p in top_products_data if p.get("variants"))
        cert_users = sum(1 for p in top_products_data if p.get("certifications"))
        top_performers_patterns = [
            f"{round(100 * packs_users / max(len(top_products_data), 1))}% usan variants/packs",
            f"{round(100 * cert_users / max(len(top_products_data), 1))}% muestran certificaciones",
        ]

    return {
        "category": main_cat,
        "peers_count": len(peer_ids),
        "my_stats": {
            "product_count": my_product_count,
            "orders_30d": my_orders,
        },
        "peer_benchmarks": {
            "avg_price": round(peer_avg_price, 2),
            "avg_rating": round(peer_avg_rating, 1),
        },
        "best_practices": top_performers_patterns,
    }


async def analyze_customers(db, producer_id: str, period_days: int = 90):
    """Análisis de clientes del productor: segmentos, recurrencia."""
    since = datetime.now(timezone.utc) - timedelta(days=period_days)
    orders = await db.orders.find(
        {"created_at": {"$gte": since}, "line_items.producer_id": producer_id},
        {"user_id": 1, "total_amount": 1, "created_at": 1, "country": 1, "line_items": 1},
    ).to_list(1000)

    customer_data: dict[str, dict] = {}
    for order in orders:
        uid = order.get("user_id")
        if not uid:
            continue
        if uid not in customer_data:
            customer_data[uid] = {"orders": 0, "revenue": 0, "country": order.get("country")}
        customer_data[uid]["orders"] += 1
        for item in order.get("line_items", []):
            if item.get("producer_id") == producer_id:
                customer_data[uid]["revenue"] += item.get("quantity", 1) * item.get("price", 0)

    total_customers = len(customer_data)
    recurring = sum(1 for c in customer_data.values() if c["orders"] > 1)
    total_revenue = sum(c["revenue"] for c in customer_data.values())

    # Country breakdown
    country_counts: dict[str, int] = {}
    for c in customer_data.values():
        country = c.get("country", "unknown")
        country_counts[country] = country_counts.get(country, 0) + 1

    # Segment by spend
    sorted_by_spend = sorted(customer_data.values(), key=lambda x: -x["revenue"])
    top_20_pct = max(1, total_customers // 5)
    top_spenders_revenue = sum(c["revenue"] for c in sorted_by_spend[:top_20_pct])

    return {
        "period_days": period_days,
        "total_customers": total_customers,
        "recurring_customers": recurring,
        "recurring_rate": round(100 * recurring / max(total_customers, 1), 1),
        "avg_ticket": round(total_revenue / max(len(orders), 1), 2),
        "top_20_pct_revenue_share": round(100 * top_spenders_revenue / max(total_revenue, 1), 1),
        "by_country": [{"country": c, "customers": n} for c, n in sorted(country_counts.items(), key=lambda x: -x[1])],
    }


async def detect_opportunities(db, producer_id: str, country: str):
    """Detect top 3 opportunities for this producer. Used in onboarding diagnosis."""
    opportunities = []

    # 1. Pricing opportunity
    pricing = await suggest_pricing(db, producer_id, country, None)
    below_market = [s for s in pricing["suggestions"] if s["status"] == "por debajo del mercado"]
    if below_market:
        top = below_market[0]
        potential_gain = (top["market_avg"] - top["my_price"]) * 0.7  # conservative 70% of gap
        opportunities.append({
            "type": "pricing",
            "priority": 1,
            "title": f"{top['product']} está 15%+ por debajo del mercado",
            "action": f"Subir precio de {top['my_price']}€ a {round(top['market_avg'] * 0.95, 2)}€",
            "impact": f"+{round(potential_gain, 2)}€ por unidad vendida",
        })

    # 2. Review visibility
    reviews = await get_my_reviews(db, producer_id)
    if reviews["total_reviews"] < 5 and reviews["average_rating"] >= 4:
        opportunities.append({
            "type": "visibility",
            "priority": 2,
            "title": f"Rating excelente ({reviews['average_rating']}★) pero solo {reviews['total_reviews']} reseñas",
            "action": "Pedir reseñas a clientes recientes con email personalizado",
            "impact": "Productos con 10+ reseñas convierten 3x más",
        })

    # 3. Pack/bundle opportunity
    my_products = await db.products.find(
        {"producer_id": producer_id, "approved": True},
        {"_id": 0, "variants": 1, "name": 1},
    ).to_list(50)
    has_packs = any(p.get("variants") for p in my_products)
    if not has_packs and len(my_products) >= 3:
        opportunities.append({
            "type": "bundling",
            "priority": 3,
            "title": "No tienes packs/bundles configurados",
            "action": "Crear 1-2 packs con tus top productos",
            "impact": "Los packs generan 40% más ticket medio de media",
        })

    # 4. New product launch
    if len(my_products) < 5:
        opportunities.append({
            "type": "catalog",
            "priority": 4,
            "title": f"Solo tienes {len(my_products)} productos",
            "action": "Ampliar catálogo con productos complementarios",
            "impact": "Productores con 8+ productos facturan 2.5x más",
        })

    return {"opportunities": opportunities[:3], "generated_at": datetime.now(timezone.utc).isoformat()}


# ═══════════════════════════════════════════════════════
# CONTENT GENERATION (descriptions, captions, emails, B2B)
# ═══════════════════════════════════════════════════════

async def generate_content(db, producer_id: str, content_type: str,
                           product_id: Optional[str] = None,
                           extra_context: Optional[str] = None) -> dict:
    """
    Generate marketing content. Returns a PROMPT TEMPLATE that the LLM will fill.

    This function returns structured product data + template — the LLM does the writing.
    """
    product = None
    if product_id:
        product = await db.products.find_one({"product_id": product_id, "producer_id": producer_id}, {"_id": 0})

    producer_name = None
    store = await db.store_profiles.find_one({"producer_id": producer_id}, {"_id": 0, "name": 1})
    if store:
        producer_name = store.get("name")

    if content_type == "description":
        return {
            "content_type": "description",
            "product": product,
            "instructions": (
                "Genera una descripción SEO-optimizada y vendedora (100-150 palabras) para este producto. "
                "Incluye: origen, proceso, beneficios, uso sugerido, certificaciones si las hay. "
                "Tono: profesional pero cálido, evitando jerga. Sin emojis."
            ),
        }
    if content_type == "social_caption":
        return {
            "content_type": "social_caption",
            "product": product,
            "producer_name": producer_name,
            "instructions": (
                "Genera 3 variantes de caption para Instagram (max 150 caracteres cada una). "
                "Variante 1: storytelling corto. Variante 2: pregunta para engagement. "
                "Variante 3: urgencia/novedad. Incluye 5 hashtags relevantes al final de cada una."
            ),
        }
    if content_type == "email_reactivation":
        return {
            "content_type": "email_reactivation",
            "producer_name": producer_name,
            "instructions": (
                "Genera un email de reactivación para clientes que llevan >60 días sin comprar. "
                "Tono cercano pero profesional. Estructura: asunto + saludo + recuerdo emocional "
                "+ oferta (10-15% dto) + CTA claro. Max 120 palabras. Sin bold ni formato."
            ),
            "extra_context": extra_context,
        }
    if content_type == "b2b_copy":
        return {
            "content_type": "b2b_copy",
            "product": product,
            "producer_name": producer_name,
            "instructions": (
                "Genera una ficha B2B profesional para importadores. Incluye: propuesta de valor, "
                "datos técnicos (peso, formato, shelf life si se conoce), volúmenes recomendados, "
                "MOQ sugerido, incoterms recomendados, diferenciación competitiva. "
                "Tono corporativo, sin marketing fluff. 200-250 palabras."
            ),
        }

    return {"error": f"Unknown content type: {content_type}"}


# ═══════════════════════════════════════════════════════
# ACTION TOOLS (with confirmation requirement in LLM prompt)
# ═══════════════════════════════════════════════════════

async def action_create_discount(db, producer_id: str, code: str, percentage: int,
                                  product_ids: Optional[list] = None,
                                  valid_days: int = 30) -> dict:
    """Create a discount code for the producer. Requires user confirmation."""
    if percentage < 1 or percentage > 50:
        return {"success": False, "error": "Descuento debe estar entre 1% y 50%"}

    code = code.upper().strip()
    # Check if code already exists
    existing = await db.discount_codes.find_one({"code": code})
    if existing:
        return {"success": False, "error": f"El código {code} ya existe"}

    discount = {
        "discount_id": f"disc_{uuid.uuid4().hex[:12]}",
        "code": code,
        "producer_id": producer_id,
        "percentage": percentage,
        "product_ids": product_ids or [],  # empty = all products of this producer
        "valid_from": datetime.now(timezone.utc),
        "valid_until": datetime.now(timezone.utc) + timedelta(days=valid_days),
        "uses": 0,
        "max_uses": None,
        "active": True,
        "created_at": datetime.now(timezone.utc),
        "created_by": "rebeca_ai",
    }
    await db.discount_codes.insert_one(discount)
    return {
        "success": True,
        "code": code,
        "percentage": percentage,
        "valid_until": discount["valid_until"].isoformat(),
        "message": f"Código {code} creado: {percentage}% dto durante {valid_days} días",
    }


async def action_update_product(db, producer_id: str, product_id: str,
                                  updates: dict) -> dict:
    """Update product fields (price, description, stock). Requires confirmation."""
    product = await db.products.find_one({"product_id": product_id, "producer_id": producer_id})
    if not product:
        return {"success": False, "error": "Producto no encontrado o no te pertenece"}

    allowed_fields = {"price", "description", "stock", "name"}
    filtered = {k: v for k, v in updates.items() if k in allowed_fields}
    if not filtered:
        return {"success": False, "error": "No hay campos válidos para actualizar"}

    # Validate
    if "price" in filtered and (filtered["price"] < 0 or filtered["price"] > 10000):
        return {"success": False, "error": "Precio fuera de rango (0-10000)"}
    if "stock" in filtered and filtered["stock"] < 0:
        return {"success": False, "error": "Stock no puede ser negativo"}

    filtered["updated_at"] = datetime.now(timezone.utc)
    await db.products.update_one({"product_id": product_id}, {"$set": filtered})

    return {
        "success": True,
        "product_id": product_id,
        "updated_fields": list(filtered.keys()),
        "message": f"Producto actualizado: {', '.join(filtered.keys())}",
    }


async def action_create_pack(db, producer_id: str, pack_name: str,
                              product_ids: list, discount_percentage: int = 10) -> dict:
    """Create a bundle/pack from existing products. Requires confirmation."""
    if not product_ids or len(product_ids) < 2:
        return {"success": False, "error": "Un pack necesita al menos 2 productos"}

    products = await db.products.find(
        {"product_id": {"$in": product_ids}, "producer_id": producer_id},
        {"_id": 0},
    ).to_list(20)

    if len(products) != len(product_ids):
        return {"success": False, "error": "Algunos productos no te pertenecen o no existen"}

    total_price = sum(p.get("price", 0) for p in products)
    pack_price = round(total_price * (1 - discount_percentage / 100), 2)

    pack = {
        "pack_id": f"pack_{uuid.uuid4().hex[:12]}",
        "producer_id": producer_id,
        "name": pack_name,
        "product_ids": product_ids,
        "original_price": round(total_price, 2),
        "pack_price": pack_price,
        "discount_percentage": discount_percentage,
        "active": True,
        "created_at": datetime.now(timezone.utc),
        "created_by": "rebeca_ai",
    }
    await db.product_packs.insert_one(pack)
    return {
        "success": True,
        "pack_id": pack["pack_id"],
        "name": pack_name,
        "original_price": pack["original_price"],
        "pack_price": pack_price,
        "savings": round(total_price - pack_price, 2),
        "message": f"Pack '{pack_name}' creado: {pack_price}€ (ahorro {round(total_price - pack_price, 2)}€)",
    }


async def action_respond_review(db, producer_id: str, review_id: str, response: str) -> dict:
    """Post a producer response to a review."""
    review = await db.reviews.find_one({"review_id": review_id})
    if not review:
        # Try by _id
        return {"success": False, "error": "Reseña no encontrada"}

    # Verify the review is for a product of this producer
    product = await db.products.find_one(
        {"product_id": review.get("product_id"), "producer_id": producer_id},
    )
    if not product:
        return {"success": False, "error": "Esa reseña no es de tus productos"}

    if len(response) > 500:
        return {"success": False, "error": "Respuesta muy larga (max 500 caracteres)"}

    await db.reviews.update_one(
        {"review_id": review_id},
        {"$set": {
            "producer_response": response,
            "producer_response_at": datetime.now(timezone.utc),
        }},
    )
    return {
        "success": True,
        "review_id": review_id,
        "message": "Respuesta publicada",
    }


# ═══════════════════════════════════════════════════════
# GOAL TRACKING — SMART goals with progress
# ═══════════════════════════════════════════════════════

async def manage_goals(db, producer_id: str, operation: str,
                       goal_type: Optional[str] = None,
                       target: Optional[float] = None,
                       period: str = "monthly") -> dict:
    """
    Operations: 'list', 'set', 'progress', 'celebrate_check'
    """
    if operation == "list":
        goals = await db.producer_goals.find(
            {"user_id": producer_id, "status": "active"}, {"_id": 0},
        ).to_list(20)
        # Compute current progress for each
        for g in goals:
            g["current_progress"] = await _compute_goal_progress(db, producer_id, g)
            g["progress_pct"] = round(100 * g["current_progress"] / max(g["target"], 1), 1)
        return {"goals": goals, "count": len(goals)}

    if operation == "set":
        if not goal_type or target is None:
            return {"error": "goal_type y target son requeridos"}
        valid_types = {"revenue", "units", "new_customers", "rating", "reviews"}
        if goal_type not in valid_types:
            return {"error": f"goal_type debe ser uno de: {', '.join(valid_types)}"}

        now = datetime.now(timezone.utc)
        if period == "monthly":
            period_end = (now.replace(day=1) + timedelta(days=32)).replace(day=1)
        elif period == "quarterly":
            period_end = now + timedelta(days=90)
        else:
            period_end = now + timedelta(days=30)

        goal = {
            "goal_id": f"goal_{uuid.uuid4().hex[:12]}",
            "user_id": producer_id,
            "type": goal_type,
            "target": target,
            "period": period,
            "period_start": now,
            "period_end": period_end,
            "status": "active",
            "created_at": now,
        }
        await db.producer_goals.insert_one(goal)
        return {
            "success": True,
            "goal_id": goal["goal_id"],
            "type": goal_type,
            "target": target,
            "period": period,
            "message": f"Objetivo creado: {target} {goal_type} en {period}",
        }

    if operation == "celebrate_check":
        # Check all active goals for completion or milestones
        goals = await db.producer_goals.find(
            {"user_id": producer_id, "status": "active"}, {"_id": 0},
        ).to_list(20)
        celebrations = []
        for g in goals:
            progress = await _compute_goal_progress(db, producer_id, g)
            pct = 100 * progress / max(g["target"], 1)
            if pct >= 100:
                await db.producer_goals.update_one(
                    {"goal_id": g["goal_id"]},
                    {"$set": {"status": "achieved", "achieved_at": datetime.now(timezone.utc)}},
                )
                celebrations.append({
                    "type": "achieved",
                    "goal": g["type"],
                    "target": g["target"],
                    "message": f"¡Objetivo de {g['type']} cumplido! ({progress}/{g['target']})",
                })
            elif pct >= 75 and pct < 100:
                celebrations.append({
                    "type": "milestone_75",
                    "goal": g["type"],
                    "progress_pct": round(pct, 1),
                    "message": f"Vas al {round(pct, 1)}% del objetivo de {g['type']}",
                })
        return {"celebrations": celebrations}

    return {"error": f"Operación desconocida: {operation}"}


async def _compute_goal_progress(db, producer_id: str, goal: dict) -> float:
    """Compute current progress for a goal."""
    goal_type = goal.get("type")
    period_start = goal.get("period_start")
    if not period_start:
        return 0.0

    if goal_type == "revenue":
        orders = await db.orders.find(
            {"created_at": {"$gte": period_start}, "line_items.producer_id": producer_id},
            {"line_items": 1},
        ).to_list(1000)
        total = 0.0
        for order in orders:
            for item in order.get("line_items", []):
                if item.get("producer_id") == producer_id:
                    total += item.get("quantity", 1) * item.get("price", 0)
        return round(total, 2)

    if goal_type == "units":
        orders = await db.orders.find(
            {"created_at": {"$gte": period_start}, "line_items.producer_id": producer_id},
            {"line_items": 1},
        ).to_list(1000)
        total = 0
        for order in orders:
            for item in order.get("line_items", []):
                if item.get("producer_id") == producer_id:
                    total += item.get("quantity", 1)
        return total

    if goal_type == "new_customers":
        orders = await db.orders.find(
            {"created_at": {"$gte": period_start}, "line_items.producer_id": producer_id},
            {"user_id": 1},
        ).to_list(1000)
        return len({o.get("user_id") for o in orders if o.get("user_id")})

    if goal_type == "reviews":
        products = await db.products.find(
            {"producer_id": producer_id}, {"product_id": 1},
        ).to_list(200)
        pids = [p["product_id"] for p in products]
        return await db.reviews.count_documents({
            "product_id": {"$in": pids},
            "created_at": {"$gte": period_start},
        })

    if goal_type == "rating":
        products = await db.products.find(
            {"producer_id": producer_id}, {"product_id": 1},
        ).to_list(200)
        pids = [p["product_id"] for p in products]
        reviews = await db.reviews.find(
            {"product_id": {"$in": pids}},
            {"rating": 1},
        ).to_list(1000)
        if not reviews:
            return 0
        return round(sum(r.get("rating", 0) for r in reviews) / len(reviews), 2)

    return 0.0


# ═══════════════════════════════════════════════════════
# CALENDAR INTELLIGENCE — Events per country
# ═══════════════════════════════════════════════════════

# Simplified calendar events. Dates are MM-DD or special tokens resolved per year.
# For 2026, some dynamic dates are pre-computed.
CALENDAR_EVENTS_2026 = {
    "ES": [
        {"name": "San Valentín", "date": "2026-02-14", "type": "romance", "prep_days": 14},
        {"name": "Día del Padre", "date": "2026-03-19", "type": "family", "prep_days": 14},
        {"name": "Día de la Madre", "date": "2026-05-03", "type": "family", "prep_days": 14},
        {"name": "Día del AOVE", "date": "2026-11-15", "type": "category_aove", "prep_days": 10},
        {"name": "Black Friday", "date": "2026-11-27", "type": "promo", "prep_days": 14},
        {"name": "Navidad", "date": "2026-12-25", "type": "gifts", "prep_days": 21},
        {"name": "Reyes", "date": "2026-01-06", "type": "gifts", "prep_days": 14},
    ],
    "FR": [
        {"name": "Saint-Valentin", "date": "2026-02-14", "type": "romance", "prep_days": 14},
        {"name": "Fête des Mères", "date": "2026-05-31", "type": "family", "prep_days": 14},
        {"name": "Fête des Pères", "date": "2026-06-21", "type": "family", "prep_days": 14},
        {"name": "Black Friday", "date": "2026-11-27", "type": "promo", "prep_days": 14},
        {"name": "Noël", "date": "2026-12-25", "type": "gifts", "prep_days": 21},
    ],
    "DE": [
        {"name": "Valentinstag", "date": "2026-02-14", "type": "romance", "prep_days": 14},
        {"name": "Muttertag", "date": "2026-05-10", "type": "family", "prep_days": 14},
        {"name": "Oktoberfest", "date": "2026-09-19", "type": "festival", "prep_days": 21},
        {"name": "Weihnachten", "date": "2026-12-25", "type": "gifts", "prep_days": 21},
    ],
    "US": [
        {"name": "Valentine's Day", "date": "2026-02-14", "type": "romance", "prep_days": 14},
        {"name": "Mother's Day", "date": "2026-05-10", "type": "family", "prep_days": 14},
        {"name": "Father's Day", "date": "2026-06-21", "type": "family", "prep_days": 14},
        {"name": "Independence Day", "date": "2026-07-04", "type": "national", "prep_days": 7},
        {"name": "Thanksgiving", "date": "2026-11-26", "type": "family", "prep_days": 21},
        {"name": "Black Friday", "date": "2026-11-27", "type": "promo", "prep_days": 14},
        {"name": "Christmas", "date": "2026-12-25", "type": "gifts", "prep_days": 21},
    ],
    "UK": [
        {"name": "Valentine's Day", "date": "2026-02-14", "type": "romance", "prep_days": 14},
        {"name": "Mother's Day", "date": "2026-03-15", "type": "family", "prep_days": 14},
        {"name": "Father's Day", "date": "2026-06-21", "type": "family", "prep_days": 14},
        {"name": "Christmas", "date": "2026-12-25", "type": "gifts", "prep_days": 21},
    ],
    "IT": [
        {"name": "San Valentino", "date": "2026-02-14", "type": "romance", "prep_days": 14},
        {"name": "Festa della Mamma", "date": "2026-05-10", "type": "family", "prep_days": 14},
        {"name": "Natale", "date": "2026-12-25", "type": "gifts", "prep_days": 21},
    ],
    "KR": [
        {"name": "Seollal (Año Nuevo Lunar)", "date": "2026-02-17", "type": "family", "prep_days": 21},
        {"name": "Chuseok (Festival del Otoño)", "date": "2026-09-25", "type": "family", "prep_days": 21},
        {"name": "Pepero Day", "date": "2026-11-11", "type": "gifts", "prep_days": 7},
        {"name": "Navidad (comercial)", "date": "2026-12-25", "type": "gifts", "prep_days": 14},
    ],
    "JP": [
        {"name": "San Valentín", "date": "2026-02-14", "type": "romance", "prep_days": 14},
        {"name": "White Day", "date": "2026-03-14", "type": "romance", "prep_days": 14},
        {"name": "Golden Week", "date": "2026-04-29", "type": "festival", "prep_days": 14},
        {"name": "Obon", "date": "2026-08-13", "type": "family", "prep_days": 14},
        {"name": "Navidad (comercial)", "date": "2026-12-25", "type": "gifts", "prep_days": 14},
    ],
    "AE": [  # Arab markets
        {"name": "Ramadán (inicio)", "date": "2026-02-17", "type": "religious", "prep_days": 21},
        {"name": "Eid al-Fitr", "date": "2026-03-20", "type": "celebration", "prep_days": 14},
        {"name": "Eid al-Adha", "date": "2026-05-27", "type": "celebration", "prep_days": 14},
    ],
    "MX": [
        {"name": "Día de la Madre", "date": "2026-05-10", "type": "family", "prep_days": 14},
        {"name": "Día del Padre", "date": "2026-06-21", "type": "family", "prep_days": 14},
        {"name": "Día de Muertos", "date": "2026-11-02", "type": "tradition", "prep_days": 14},
        {"name": "Navidad", "date": "2026-12-25", "type": "gifts", "prep_days": 21},
    ],
}


async def get_calendar_events(producer_countries: list, horizon_days: int = 45) -> dict:
    """Return upcoming calendar events for the producer's target countries."""
    today = datetime.now(timezone.utc).date()
    horizon = today + timedelta(days=horizon_days)

    upcoming = []
    for country in producer_countries:
        events = CALENDAR_EVENTS_2026.get(country, [])
        for event in events:
            try:
                event_date = datetime.strptime(event["date"], "%Y-%m-%d").date()
            except ValueError:
                continue
            days_until = (event_date - today).days
            if 0 <= days_until <= horizon_days:
                upcoming.append({
                    "country": country,
                    "name": event["name"],
                    "date": event["date"],
                    "days_until": days_until,
                    "type": event["type"],
                    "prep_days": event.get("prep_days", 14),
                    "should_prepare_now": days_until <= event.get("prep_days", 14),
                })

    upcoming.sort(key=lambda x: x["days_until"])
    return {
        "today": today.isoformat(),
        "horizon_days": horizon_days,
        "events": upcoming,
    }


# ═══════════════════════════════════════════════════════
# PROACTIVE ALERTS + WEEKLY BRIEFING
# ═══════════════════════════════════════════════════════

async def generate_alerts(db, producer_id: str, country: str) -> list[dict]:
    """Generate urgent alerts that should show as pulse on the Rebeca button."""
    alerts = []

    # Alert 1: Recent negative review
    my_products = await db.products.find(
        {"producer_id": producer_id}, {"product_id": 1, "name": 1},
    ).to_list(200)
    pids = [p["product_id"] for p in my_products]
    if pids:
        since = datetime.now(timezone.utc) - timedelta(days=7)
        negative_review = await db.reviews.find_one({
            "product_id": {"$in": pids},
            "rating": {"$lte": 2},
            "created_at": {"$gte": since},
            "producer_response": {"$exists": False},
        }, {"_id": 0})
        if negative_review:
            alerts.append({
                "severity": "high",
                "type": "negative_review",
                "message": f"Reseña negativa sin responder en los últimos 7 días",
                "action": "Responder reseña",
            })

    # Alert 2: Top seller with low stock
    since_30 = datetime.now(timezone.utc) - timedelta(days=30)
    orders = await db.orders.find(
        {"created_at": {"$gte": since_30}, "line_items.producer_id": producer_id},
        {"line_items": 1},
    ).to_list(500)
    sales_count: dict[str, int] = {}
    for order in orders:
        for item in order.get("line_items", []):
            if item.get("producer_id") == producer_id:
                pid = item.get("product_id")
                if pid:
                    sales_count[pid] = sales_count.get(pid, 0) + item.get("quantity", 1)
    if sales_count:
        top_sold = sorted(sales_count.items(), key=lambda x: -x[1])[:3]
        for pid, qty in top_sold:
            product = await db.products.find_one({"product_id": pid}, {"_id": 0, "stock": 1, "name": 1})
            if product and product.get("stock", 0) < 10:
                alerts.append({
                    "severity": "high",
                    "type": "low_stock",
                    "message": f"Top seller '{product.get('name')}' con stock bajo ({product.get('stock', 0)} uds)",
                    "action": "Reponer stock",
                })
                break

    # Alert 3: Sales drop
    since_14 = datetime.now(timezone.utc) - timedelta(days=14)
    since_28 = datetime.now(timezone.utc) - timedelta(days=28)
    recent_orders = await db.orders.count_documents({
        "created_at": {"$gte": since_14},
        "line_items.producer_id": producer_id,
    })
    prev_orders = await db.orders.count_documents({
        "created_at": {"$gte": since_28, "$lt": since_14},
        "line_items.producer_id": producer_id,
    })
    if prev_orders >= 5 and recent_orders < prev_orders * 0.6:
        alerts.append({
            "severity": "medium",
            "type": "sales_drop",
            "message": f"Ventas bajaron {round(100 * (1 - recent_orders / prev_orders))}% vs 2 semanas previas",
            "action": "Revisar causas",
        })

    # Alert 4: Upcoming calendar event
    user_doc = await db.users.find_one({"user_id": producer_id}, {"_id": 0, "country": 1})
    user_country = (user_doc or {}).get("country", country)
    calendar = await get_calendar_events([user_country], horizon_days=21)
    if calendar["events"]:
        next_event = calendar["events"][0]
        if next_event["should_prepare_now"]:
            alerts.append({
                "severity": "low",
                "type": "calendar_event",
                "message": f"{next_event['name']} en {next_event['days_until']} días",
                "action": "Preparar campaña",
            })

    return alerts


async def generate_weekly_briefing(db, producer_id: str, country: str) -> dict:
    """Generate a weekly briefing: summary + 3 actions."""
    # Sales last 7d vs prev 7d
    since_7 = datetime.now(timezone.utc) - timedelta(days=7)
    since_14 = datetime.now(timezone.utc) - timedelta(days=14)

    sales_7d = await analyze_my_sales(db, producer_id, 7)
    sales_prev = await db.orders.find(
        {"created_at": {"$gte": since_14, "$lt": since_7}, "line_items.producer_id": producer_id},
        {"line_items": 1},
    ).to_list(500)
    prev_revenue = 0.0
    for order in sales_prev:
        for item in order.get("line_items", []):
            if item.get("producer_id") == producer_id:
                prev_revenue += item.get("quantity", 1) * item.get("price", 0)

    revenue_change_pct = 0
    if prev_revenue > 0:
        revenue_change_pct = round(100 * (sales_7d["total_revenue"] - prev_revenue) / prev_revenue, 1)

    # Alerts + opportunities
    alerts = await generate_alerts(db, producer_id, country)
    opportunities = await detect_opportunities(db, producer_id, country)
    calendar = await get_calendar_events([country], horizon_days=30)
    reviews = await get_my_reviews(db, producer_id)

    # Build 3 recommended actions
    actions = []
    if alerts:
        actions.append({
            "priority": 1,
            "title": alerts[0]["message"],
            "action": alerts[0]["action"],
            "why": "Urgente — afecta tu reputación o ingresos",
        })
    if opportunities["opportunities"]:
        top_opp = opportunities["opportunities"][0]
        actions.append({
            "priority": 2,
            "title": top_opp["title"],
            "action": top_opp["action"],
            "why": top_opp["impact"],
        })
    if calendar["events"]:
        next_event = calendar["events"][0]
        if next_event["should_prepare_now"]:
            actions.append({
                "priority": 3,
                "title": f"Preparar {next_event['name']}",
                "action": f"Crear campaña o pack temático para {next_event['name']}",
                "why": f"Faltan solo {next_event['days_until']} días",
            })

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "period": "last_7_days",
        "summary": {
            "revenue": sales_7d["total_revenue"],
            "orders": sales_7d["total_orders"],
            "items_sold": sales_7d["total_items_sold"],
            "revenue_change_pct": revenue_change_pct,
            "avg_rating": reviews["average_rating"],
            "new_reviews": reviews["total_reviews"],
        },
        "alerts": alerts,
        "opportunities": opportunities["opportunities"],
        "upcoming_events": calendar["events"][:3],
        "recommended_actions": actions[:3],
    }
