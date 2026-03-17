"""
Product routes: CRUD, search, variants, filtering.
"""
import uuid
import logging
import re
import asyncio
import io
import base64
from typing import Optional, List
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Request, Query
from fastapi.responses import JSONResponse
import qrcode

from core.database import db
from core.auth import get_current_user, get_optional_user, require_role
from core.models import User, ProductInput
from core.constants import SUPPORTED_LANGUAGES
from services.markets import get_product_target_markets, is_product_available_in_country, normalize_market_code, normalize_markets
from services.translation import TranslationService

# Translation languages - must match server.py
TRANSLATION_LANGUAGES = ['en', 'es', 'fr', 'de', 'pt', 'ar', 'hi', 'zh', 'ja', 'ko', 'ru']

logger = logging.getLogger(__name__)

router = APIRouter()


def _public_product_filter() -> dict:
    """Products visible in the marketplace across legacy and current records."""
    return {
        "$or": [
            {"status": "active"},
            {"approved": True},
            {"status": "approved"},
        ]
    }

@router.get("/products")
async def get_products(
    category: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    country: Optional[str] = None,
    certifications: Optional[str] = None,
    approved_only: bool = True,
    seller_id: Optional[str] = None,
    seller_type: Optional[str] = None,  # Filter by seller type: producer, importer, admin
    featured_only: bool = False,
    lang: Optional[str] = None,
    search: Optional[str] = None,
    sort: Optional[str] = None,
    origin_country: Optional[str] = None,
    free_shipping: Optional[str] = None
):
    """Get products. Default: all active/approved products. featured_only for Best Products."""
    country = normalize_market_code(country)
    query = {}
    and_conditions = []
    
    if approved_only:
        # Show products that are active/approved (supports both field formats)
        and_conditions.append({
            "$or": [
                {"status": "active"},
                {"approved": True},
                {"status": "approved"}
            ]
        })
    
    if seller_id:
        query["producer_id"] = seller_id
    
    if seller_type:
        query["seller_type"] = seller_type
    
    if featured_only:
        query["featured"] = True
    
    if category:
        # Find category by ID or slug and include subcategories
        cat_doc = await db.categories.find_one(
            {"$or": [{"category_id": category}, {"slug": category}]},
            {"_id": 0, "category_id": 1, "level": 1}
        )
        if cat_doc:
            cat_id = cat_doc["category_id"]
            if cat_doc.get("level") == 1:
                # Main category: include all subcategories
                sub_ids = await db.categories.distinct(
                    "category_id", {"parent_id": cat_id}
                )
                and_conditions.append({"category_id": {"$in": [cat_id] + sub_ids}})
            else:
                query["category_id"] = cat_id
        else:
            query["category_id"] = category
    if min_price is not None or max_price is not None:
        query["price"] = {}
        if min_price is not None:
            query["price"]["$gte"] = min_price
        if max_price is not None:
            query["price"]["$lte"] = max_price
    if country:
        # Filter by country availability (products available in this country)
        and_conditions.append({
            "$or": [
                {"target_markets": country},
                {"available_countries": country},
                {"$and": [
                    {"$or": [{"target_markets": None}, {"target_markets": {"$exists": False}}, {"target_markets": []}]},
                    {"$or": [{"available_countries": None}, {"available_countries": {"$exists": False}}, {"available_countries": []}]},
                ]},
            ]
        })
    if certifications:
        cert_list = certifications.split(',')
        query["certifications"] = {"$in": cert_list}
    if origin_country:
        query["country_origin"] = origin_country
    
    # Filter for free shipping products
    if free_shipping == "true":
        and_conditions.append({
            "$or": [
                {"shipping_cost": None},
                {"shipping_cost": 0},
                {"shipping_cost": {"$exists": False}}
            ]
        })
    
    # Text search on name and description
    if search:
        and_conditions.append({
            "$or": [
                {"name": {"$regex": re.escape(search), "$options": "i"}},
                {"description": {"$regex": re.escape(search), "$options": "i"}},
                {"tagline": {"$regex": re.escape(search), "$options": "i"}}
            ]
        })
    
    # Combine all conditions
    if and_conditions:
        query["$and"] = and_conditions
    
    # Determine sort order
    sort_query = []
    if sort == "price_asc":
        sort_query = [("price", 1)]
    elif sort == "price_desc":
        sort_query = [("price", -1)]
    elif sort == "rating":
        sort_query = [("average_rating", -1)]
    elif sort == "newest":
        sort_query = [("created_at", -1)]
    else:
        # Default: Mix popular with new products
        # First get all products sorted by date
        sort_query = [("created_at", -1)]
    
    products = await db.products.find(query, {"_id": 0}).sort(sort_query).to_list(1000)
    
    # For default sorting: Mix new products with popular ones
    # New products (last 7 days) get featured at the start
    if sort is None:
        from datetime import timedelta
        seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
        
        new_products = []
        established_products = []
        
        for p in products:
            created_at = p.get("created_at")
            if isinstance(created_at, str):
                try:
                    created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                except (ValueError, TypeError, AttributeError):
                    created_at = None
            
            if created_at and created_at > seven_days_ago:
                new_products.append(p)
            else:
                established_products.append(p)
        
        # Sort established by units_sold (popularity)
        established_products.sort(key=lambda x: x.get("units_sold", 0), reverse=True)
        
        # Interleave: 1 new product every 4 established products (up to first 5 new products)
        result = []
        new_idx = 0
        est_idx = 0
        
        while est_idx < len(established_products):
            # Add up to 4 established products
            for _ in range(4):
                if est_idx < len(established_products):
                    result.append(established_products[est_idx])
                    est_idx += 1
            # Add 1 new product (but only for first 5 new products to feature)
            if new_idx < len(new_products) and new_idx < 5:
                result.append(new_products[new_idx])
                new_idx += 1
        
        # Add remaining new products at the end if any
        while new_idx < len(new_products):
            result.append(new_products[new_idx])
            new_idx += 1
        
        products = result
    
    # Get store slugs for all producers
    producer_ids = list(set(p.get("producer_id") for p in products if p.get("producer_id")))
    store_profiles = await db.store_profiles.find(
        {"producer_id": {"$in": producer_ids}},
        {"producer_id": 1, "slug": 1}
    ).to_list(len(producer_ids))
    producer_slug_map = {s["producer_id"]: s["slug"] for s in store_profiles}
    
    # Enrich products with producer_slug
    for product in products:
        product["producer_slug"] = producer_slug_map.get(product.get("producer_id"))
    
    # Enrich products with country-specific pricing and multi-market availability
    for product in products:
        product["target_markets"] = get_product_target_markets(product)
        inv = product.get("inventory_by_country", [])
        if country:
            # Find market for this country
            market = next((m for m in inv if m["country_code"] == country and m.get("active")), None)
            if market:
                product["display_price"] = market.get("price", product["price"])
                product["display_currency"] = market.get("currency", "EUR")
                product["available_in_country"] = True
                product["market_stock"] = market.get("stock", 0)
                product["delivery_sla"] = market.get("delivery_sla_hours", 48)
            else:
                # Fallback to old country_prices
                country_prices = product.get("country_prices", {})
                if country in country_prices:
                    product["display_price"] = country_prices[country]
                    product["display_currency"] = product.get("country_currency", {}).get(country, "EUR")
                    product["available_in_country"] = True
                else:
                    product["display_price"] = product["price"]
                    product["display_currency"] = "EUR"
                    product["available_in_country"] = len(inv) == 0 and is_product_available_in_country(product, country)
        else:
            product["available_in_country"] = True  # no country filter = show all
    
    # Apply translations if language is specified
    if lang and lang in SUPPORTED_LANGUAGES:
        for product in products:
            source_lang = product.get('source_language', 'es')
            if source_lang != lang:
                # Check cached translations
                translated_fields = product.get('translated_fields', {})
                if lang in translated_fields:
                    for field, value in translated_fields[lang].items():
                        product[field] = value
                # Note: For list views, we use cache only to avoid slow responses
                # Full translation happens on detail page view
    
    # Fresh Save — dynamic pricing by expiry date
    for product in products:
        expiry = product.get("expiry_date")
        if expiry:
            try:
                days_to_expiry = (datetime.fromisoformat(expiry.replace("Z", "+00:00")) - datetime.now(timezone.utc)).days
                if days_to_expiry <= 1:
                    product["fresh_save"] = {"discount": 50, "tag": "LAST DAY -50%", "days_left": max(0, days_to_expiry)}
                elif days_to_expiry <= 3:
                    product["fresh_save"] = {"discount": 30, "tag": "FRESH -30%", "days_left": days_to_expiry}
                elif days_to_expiry <= 5:
                    product["fresh_save"] = {"discount": 15, "tag": "FRESH -15%", "days_left": days_to_expiry}
            except (ValueError, TypeError, KeyError):
                pass
    
    return products

@router.get("/products/{product_id}")
async def get_product(product_id: str, country: Optional[str] = None, lang: Optional[str] = None):
    """Get a single product, optionally translated to the specified language"""
    country = normalize_market_code(country)
    
    # If language is requested, use the translation service
    if lang and lang in SUPPORTED_LANGUAGES:
        product = await TranslationService.get_product_in_language(product_id, lang)
        if not product or not (
            product.get("approved") is True
            or product.get("status") in {"active", "approved"}
        ):
            raise HTTPException(status_code=404, detail="Product not found")
    else:
        product = await db.products.find_one(
            {
                "product_id": product_id,
                **_public_product_filter(),
            },
            {"_id": 0},
        )
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
    
    # Add country-specific pricing info
    product["target_markets"] = get_product_target_markets(product)
    if country:
        country_prices = product.get("country_prices", {})
        
        # Check if available in country (or has no restrictions)
        is_available = is_product_available_in_country(product, country)
        product["is_available_in_country"] = is_available
        
        if country in country_prices:
            product["display_price"] = country_prices[country]
            product["display_currency"] = product.get("country_currency", {}).get(country, "EUR")
        else:
            product["display_price"] = product["price"]
            product["display_currency"] = "EUR"
    
    return product

@router.post("/products")
async def create_product(input: ProductInput, user: User = Depends(get_current_user)):
    """Create a new product listing."""
    await require_role(user, ["producer", "importer", "admin"])
    if user.role in ("producer", "importer") and not user.approved:
        raise HTTPException(status_code=403, detail="Seller account not approved")

    # Verification gate — producers/importers must be verified before publishing
    if user.role in ("producer", "importer"):
        db_user = await db.users.find_one({"user_id": user.user_id})
        vs = (db_user or {}).get("verification_status", {})
        if not vs.get("is_verified", False):
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "verification_required",
                    "message": "Debes completar la verificación de tu cuenta antes de publicar productos",
                    "action": "complete_verification",
                },
            )
    # Content moderation — synchronous (products wait for result)
    from services.content_moderation import moderate_product
    mod_result = await moderate_product({
        "name": input.name,
        "description": input.description,
        "category": input.category_id,
        "images": input.images or [],
        "tags": input.certifications or [],
        "price": input.price,
    })
    mod_decision = mod_result.get("decision") or mod_result.get("action")
    if mod_decision == "blocked":
        return JSONResponse(
            status_code=422,
            content={
                "moderated": True,
                "action": "blocked",
                "reason": mod_result.get("reason"),
                "violation_type": mod_result.get("violation_type"),
            },
        )
    # If moderation returned "review" (e.g., API failure), mark product for manual review
    needs_manual_review = mod_decision == "review"

    product_id = f"prod_{uuid.uuid4().hex[:12]}"
    slug = input.name.lower().replace(' ', '-')
    
    # Process packs if provided
    packs_data = None
    if input.packs:
        packs_data = []
        for pack in input.packs:
            pack_dict = {
                "pack_id": pack.pack_id or f"pack_{uuid.uuid4().hex[:8]}",
                "quantity": pack.quantity,
                "price": pack.price,
                "price_cents": int(round(pack.price * 100)),
                "label": pack.label or f"Pack of {pack.quantity}"
            }
            # Calculate discount percentage based on unit price
            unit_price = input.price
            expected_price = unit_price * pack.quantity
            if expected_price > pack.price:
                discount_pct = round(((expected_price - pack.price) / expected_price) * 100)
                pack_dict["discount_percentage"] = discount_pct
            packs_data.append(pack_dict)

    # Determine seller type from user role
    seller_type = user.role if user.role in ["producer", "importer", "admin"] else "producer"
    target_markets = normalize_markets(input.target_markets or ([input.country_origin] if input.country_origin else []))
    
    product = {
        "product_id": product_id,
        "producer_id": user.user_id,
        "producer_name": user.company_name or user.name,
        "category_id": input.category_id,
        "name": input.name,
        "slug": slug,
        "description": input.description,
        "price": input.price,
        "price_cents": int(round(input.price * 100)),
        "images": input.images,
        "country_origin": input.country_origin,
        "ingredients": input.ingredients,
        "allergens": input.allergens,
        "certifications": input.certifications,
        "approved": not needs_manual_review,  # Hold for review if moderation uncertain
        "status": "pending_review" if needs_manual_review else "active",
        "featured": False,  # Only affects "Best Products" section
        "created_at": datetime.now(timezone.utc).isoformat(),
        # Stock management fields
        "stock": 100,
        "low_stock_threshold": 5,
        "track_stock": True,
        # Country availability - default to country of origin
        "available_countries": target_markets,
        "target_markets": target_markets,
        "country_prices": {input.country_origin: input.price} if input.country_origin else {},
        "country_prices_cents": {input.country_origin: int(round(input.price * 100))} if input.country_origin else {},
        "country_currency": {input.country_origin: "EUR"} if input.country_origin else {},
        # Translation fields
        "source_language": input.source_language or "es",
        "translated_fields": {},
        # New fields
        "sku": input.sku,
        "nutritional_info": input.nutritional_info.dict() if input.nutritional_info else None,
        "flavor": input.flavor,
        "parent_product_id": input.parent_product_id,
        "packs": packs_data,
        "vat_rate": input.vat_rate,
        "vat_included": input.vat_included,
        # Multi-seller fields
        "seller_type": seller_type,
        "origin_country": input.country_origin if seller_type == "importer" else None,
    }
    await db.products.insert_one(product)
    product.pop("_id", None)

    # If moderation flagged for review, add to moderation queue
    if mod_result.get("decision") == "review":
        await db.content_moderation_queue.insert_one({
            "content_type": "product", "content_id": product_id,
            "creator_id": user.user_id, "action": "review",
            "violation_type": mod_result.get("violation_type"),
            "ai_reason": mod_result.get("reason"),
            "ai_confidence": mod_result.get("confidence"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "admin_reviewed": False, "admin_action": None,
        })
    
    # Auto-create certificate + functional QR for physical packaging use
    try:
        cert_id = f"cert_{uuid.uuid4().hex[:12]}"
        cert_number = f"HSP-{datetime.now(timezone.utc).strftime('%Y')}-{uuid.uuid4().hex[:6].upper()}"
        markets = get_product_target_markets(product)
        requirements = ["origin_verification", "quality_check"]
        cat_slug = product.get("category_id", "")
        if any(k in cat_slug for k in ["carne", "meat", "lact", "dairy", "queso", "cheese", "congel", "frozen"]):
            requirements.extend(["food_safety", "allergen_labeling", "cold_chain"])
        if any(k in cat_slug for k in ["fruta", "fruit", "verdura"]):
            requirements.extend(["food_safety", "origin_traceability"])
        
        qr_url = f"https://www.hispaloshop.com/certificate/{product_id}"
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(qr_url)
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color="black", back_color="white")
        qr_buffer = io.BytesIO()
        qr_img.save(qr_buffer, format="PNG")
        qr_base64 = base64.b64encode(qr_buffer.getvalue()).decode()

        cert = {
            "certificate_id": cert_id, "certificate_number": cert_number,
            "product_id": product_id, "product_name": product["name"],
            "seller_id": user.user_id,
            "certificate_type": "food_safety" if "food_safety" in requirements else "origin",
            "data": {"origin_country": product.get("country_origin", ""), "compliance_requirements": requirements, "target_markets": markets},
            "qr_url": qr_url,
            "qr_code": qr_base64,
            "approved": False, "status": "pending_review",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.certificates.insert_one(cert)
        await db.products.update_one({"product_id": product_id}, {"$set": {"certificate_id": cert_id}})
        logger.info(f"[CERT] Auto-created {cert_number} for product {product_id}")
    except Exception as e:
        logger.warning(f"[CERT] Auto-create failed: {e}")
    
    # Trigger background translation + notify followers (non-blocking)
    if product.get("approved"):
        asyncio.create_task(translate_product_to_all_bg(product_id, input.source_language or "es"))
        try:
            store = await db.store_profiles.find_one({"producer_id": user.user_id})
            if store:
                from routes.stores import notify_store_followers
                asyncio.create_task(notify_store_followers(store["store_id"], input.name, product_id))
        except Exception as e:
            logger.warning(f"Could not notify store followers: {e}")
    
    return product

async def translate_product_to_all_bg(product_id: str, source_lang: str):
    """Background task to translate product to all languages"""
    try:
        for target_lang in TRANSLATION_LANGUAGES:
            if target_lang == source_lang:
                continue
            try:
                await TranslationService.get_product_in_language(product_id, target_lang)
            except Exception as e:
                logger.error(f"Error translating product {product_id} to {target_lang}: {e}")
    except Exception as e:
        logger.error(f"Background product translation failed for product {product_id}: {e}")

@router.put("/products/{product_id}")
async def update_product(product_id: str, input: ProductInput, user: User = Depends(get_current_user)):
    """Update an existing product by ID."""
    await require_role(user, ["producer", "importer", "admin"])
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if user.role in ("producer", "importer") and product["producer_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Run alcohol moderation check on name/description changes
    if input.name != product.get("name") or input.description != product.get("description"):
        from services.content_moderation import _is_alcohol_product
        alcohol_block = _is_alcohol_product(input.name, input.description)
        if alcohol_block:
            raise HTTPException(status_code=400, detail=alcohol_block["reason"])

    # Clear translations if content changed (will be re-translated on demand)
    content_changed = (
        product.get("name") != input.name or
        product.get("description") != input.description or
        product.get("ingredients") != input.ingredients or
        product.get("allergens") != input.allergens or
        product.get("certifications") != input.certifications
    )
    
    # Process packs if provided
    packs_data = None
    if input.packs:
        packs_data = []
        for pack in input.packs:
            pack_dict = {
                "pack_id": pack.pack_id or f"pack_{uuid.uuid4().hex[:8]}",
                "quantity": pack.quantity,
                "price": pack.price,
                "price_cents": int(round(pack.price * 100)),
                "label": pack.label or f"Pack of {pack.quantity}"
            }
            # Calculate discount percentage based on unit price
            unit_price = input.price
            expected_price = unit_price * pack.quantity
            if expected_price > pack.price:
                discount_pct = round(((expected_price - pack.price) / expected_price) * 100)
                pack_dict["discount_percentage"] = discount_pct
            packs_data.append(pack_dict)

    update_data = {
        "name": input.name,
        "description": input.description,
        "price": input.price,
        "price_cents": int(round(input.price * 100)),
        "images": input.images,
        "country_origin": input.country_origin,
        "ingredients": input.ingredients,
        "allergens": input.allergens,
        "certifications": input.certifications,
        "slug": input.name.lower().replace(' ', '-'),
        # New fields
        "sku": input.sku,
        "nutritional_info": input.nutritional_info.dict() if input.nutritional_info else None,
        "flavor": input.flavor,
        "parent_product_id": input.parent_product_id,
        "packs": packs_data
    }
    
    if content_changed:
        update_data["translated_fields"] = {}  # Clear cached translations
        update_data["source_language"] = input.source_language or product.get("source_language", "es")
    
    # Atomic ownership check at write time to prevent IDOR race condition
    update_filter = {"product_id": product_id}
    if user.role in ("producer", "importer"):
        update_filter["producer_id"] = user.user_id
    result = await db.products.update_one(update_filter, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=403, detail="Product not found or not authorized")
    
    # Notify wishlist users if price dropped
    if input.price < product.get("price", 0):
        from routes.notifications import create_notification
        wishlist_entries = await db.wishlists.find(
            {"product_id": product_id}, {"_id": 0, "user_id": 1}
        ).to_list(500)
        for entry in wishlist_entries:
            await create_notification(
                user_id=entry["user_id"],
                title="Bajada de precio",
                body=f"'{product.get('name', '')}' bajo de {product.get('price', 0):.2f}EUR a {input.price:.2f}EUR.",
                notification_type="system",
                action_url=f"/product/{product_id}",
            )
    
    # Trigger re-translation if content changed and product is approved
    if content_changed and product.get("approved"):
        asyncio.create_task(translate_product_to_all_bg(product_id, input.source_language or "es"))
    
    return {"message": "Product updated"}

@router.get("/products/{product_id}/variants")
async def get_product_variants(product_id: str):
    """Get all flavor variants of a product (products sharing the same flavor_group_id or parent)"""
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check for flavor_group_id first (new system), then fall back to parent_product_id (legacy)
    flavor_group = product.get("flavor_group_id")
    parent_id = product.get("parent_product_id") or product_id
    
    if flavor_group:
        # New system: find all products with the same flavor_group_id
        variants = await db.products.find(
            {
                "flavor_group_id": flavor_group,
                "status": "approved"
            },
            {"_id": 0, "product_id": 1, "name": 1, "flavor": 1, "price": 1, "images": 1, "packs": 1}
        ).to_list(50)
    else:
        # Legacy system: use parent_product_id
        variants = await db.products.find(
            {
                "$or": [
                    {"product_id": parent_id},
                    {"parent_product_id": parent_id}
                ],
                "$or": [
                    {"approved": True},
                    {"status": "approved"}
                ]
            },
            {"_id": 0, "product_id": 1, "name": 1, "flavor": 1, "price": 1, "images": 1, "packs": 1}
        ).to_list(50)
    
    return variants

@router.delete("/products/{product_id}")
async def delete_product(product_id: str, user: User = Depends(get_current_user)):
    """Delete a product by ID."""
    await require_role(user, ["admin", "super_admin", "producer", "importer"])
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0, "producer_id": 1})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if user.role in ("producer", "importer") and product.get("producer_id") != user.user_id:
        raise HTTPException(status_code=403, detail="Not your product")
    
    # Delete product and ALL related data (zero residue)
    await db.products.delete_one({"product_id": product_id})
    await db.reviews.delete_many({"product_id": product_id})
    await db.certificates.delete_many({"product_id": product_id})
    await db.cart_items.delete_many({"product_id": product_id})
    await db.post_bookmarks.delete_many({"product_id": product_id})
    await db.wishlists.delete_many({"product_id": product_id})
    await db.affiliate_links.update_many(
        {"product_id": product_id},
        {"$set": {"status": "product_deleted", "deleted_at": datetime.now(timezone.utc).isoformat()}}
    )
    # Remove from embedded cart items (new cart system stores items inside carts doc)
    await db.carts.update_many(
        {"items.product_id": product_id},
        {"$pull": {"items": {"product_id": product_id}}}
    )

    # Remove from any posts that tagged this product
    await db.user_posts.update_many(
        {"tagged_product.product_id": product_id},
        {"$set": {"tagged_product": None}}
    )
    
    # Audit log
    await db.audit_log.insert_one({
        "action": "PRODUCT_DELETE",
        "actor": {"user_id": user.user_id, "role": user.role},
        "target": {"type": "product", "id": product_id},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    
    logger.info(f"[DELETE] Product {product_id} + all residues deleted by {user.user_id}")
    return {"message": "Product and all related data deleted"}


# ---------------------------------------------------------------------------
# B2B Product Management
# ---------------------------------------------------------------------------

from pydantic import BaseModel


class B2BProductSettings(BaseModel):
    wholesale_price: float
    moq: int
    wholesale_stock: Optional[int] = None
    use_product_stock: bool = True
    incoterm: str
    payment_terms: str
    description: Optional[str] = None
    offers_samples: bool = False
    max_samples: Optional[int] = None


@router.get("/products/my-b2b-catalog")
async def get_my_b2b_catalog(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
):
    """Return the authenticated producer/importer's own B2B-enabled products."""
    await require_role(user, ["producer", "importer"])

    query = {"producer_id": user.user_id, "b2b_enabled": True}
    total = await db.products.count_documents(query)
    skip = (page - 1) * limit

    products = (
        await db.products.find(query, {"_id": 0})
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
        .to_list(limit)
    )

    return {"products": products, "total": total, "page": page, "limit": limit}


@router.put("/products/{product_id}/b2b")
async def update_b2b_settings(
    product_id: str,
    settings: B2BProductSettings,
    user: User = Depends(get_current_user),
):
    """Enable B2B for a product and set wholesale settings. Owner only."""
    await require_role(user, ["producer", "importer"])

    product = await db.products.find_one(
        {"product_id": product_id}, {"_id": 0, "producer_id": 1}
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product["producer_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not your product")

    await db.products.update_one(
        {"product_id": product_id},
        {
            "$set": {
                "b2b_enabled": True,
                "b2b_settings": settings.dict(),
                "b2b_updated_at": datetime.now(timezone.utc).isoformat(),
            }
        },
    )
    return {"message": "B2B settings updated", "product_id": product_id}


@router.delete("/products/{product_id}/b2b")
async def disable_b2b(
    product_id: str,
    user: User = Depends(get_current_user),
):
    """Disable B2B for a product but keep its settings. Owner only."""
    await require_role(user, ["producer", "importer"])

    product = await db.products.find_one(
        {"product_id": product_id}, {"_id": 0, "producer_id": 1}
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product["producer_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not your product")

    await db.products.update_one(
        {"product_id": product_id},
        {
            "$set": {
                "b2b_enabled": False,
                "b2b_updated_at": datetime.now(timezone.utc).isoformat(),
            }
        },
    )
    return {"message": "B2B disabled", "product_id": product_id}
