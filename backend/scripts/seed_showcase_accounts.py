"""
Seed showcase accounts and content for Hispaloshop demos.
"""
from __future__ import annotations

import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List

import bcrypt
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.getenv("MONGO_URL")
if not MONGO_URL:
    print("[ERROR] Missing MONGO_URL in backend/.env")
    sys.exit(1)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def days_from_now(days: int) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()


def build_media(url: str, media_type: str = "image", ratio: str = "4:5") -> List[Dict[str, object]]:
    return [{"url": url, "type": media_type, "order": 0, "ratio": ratio}]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


ACCOUNTS = {
    "customer": {
        "user_id": "showcase_customer_2026",
        "email": "sofia.rios.qa@hispaloshop.demo",
        "password": "SofiaDemo!2026",
        "name": "Sofia Rios",
        "role": "customer",
        "username": "sofia.rios",
        "bio": "Compra gourmet con foco en origen, trazabilidad y cocina sencilla para cada dia.",
        "location": "Madrid, Espana",
        "country": "ES",
        "profile_image": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&auto=format&fit=crop",
        "cover_image": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1400&auto=format&fit=crop",
    },
    "influencer": {
        "user_id": "showcase_influencer_2026",
        "email": "nora.vela.qa@hispaloshop.demo",
        "password": "NoraDemo!2026",
        "name": "Nora Vela",
        "role": "influencer",
        "username": "nora.vela",
        "bio": "Creadora foodie centrada en recetas mediterraneas, reels cortos y recomendaciones limpias.",
        "location": "Barcelona, Espana",
        "country": "ES",
        "profile_image": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=600&auto=format&fit=crop",
        "cover_image": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1400&auto=format&fit=crop",
        "influencer_data": {
            "tier": "gold",
            "niche": "food",
            "followers": 48200,
            "engagement_rate": 5.9,
            "instagram_handle": "@nora.vela",
            "content_languages": ["es", "en"],
        },
    },
    "producer": {
        "user_id": "showcase_producer_2026",
        "email": "casa.brava.qa@hispaloshop.demo",
        "password": "CasaBrava!2026",
        "name": "Casa Brava Conservas",
        "role": "producer",
        "username": "casa.brava",
        "bio": "Productor familiar especializado en aceite de oliva virgen extra y conservas del Cantabrico.",
        "location": "Santona, Espana",
        "country": "ES",
        "company_name": "Casa Brava Conservas SL",
        "vat_cif": "B45821973",
        "phone": "+34 942 100 240",
        "fiscal_address": "Poligono Trincheras 8, Santona, Cantabria",
        "profile_image": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&auto=format&fit=crop",
        "cover_image": "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=1400&auto=format&fit=crop",
    },
    "importer": {
        "user_id": "showcase_importer_2026",
        "email": "atlas.mediterraneo.qa@hispaloshop.demo",
        "password": "AtlasMed!2026",
        "name": "Atlas Mediterraneo Imports",
        "role": "importer",
        "username": "atlas.med",
        "bio": "Importador gourmet con foco en Italia y Grecia, trazabilidad documental y seleccion premium.",
        "location": "Valencia, Espana",
        "country": "ES",
        "company_name": "Atlas Mediterraneo Imports SL",
        "vat_cif": "B52904481",
        "phone": "+34 961 440 128",
        "fiscal_address": "Avenida del Puerto 91, Valencia",
        "profile_image": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&auto=format&fit=crop",
        "cover_image": "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=1400&auto=format&fit=crop",
    },
}


CATEGORIES = [
    {"category_id": "showcase_cat_aceites", "name": "Aceites", "slug": "aceites", "icon": "bottle", "active": True},
    {"category_id": "showcase_cat_conservas", "name": "Conservas", "slug": "conservas", "icon": "jar", "active": True},
    {"category_id": "showcase_cat_quesos", "name": "Quesos", "slug": "quesos", "icon": "cheese", "active": True},
    {"category_id": "showcase_cat_aceitunas", "name": "Aceitunas", "slug": "aceitunas", "icon": "olive", "active": True},
]


STORE_PROFILES = [
    {
        "store_id": "showcase_store_producer",
        "producer_id": ACCOUNTS["producer"]["user_id"],
        "slug": "casa-brava-conservas",
        "name": "Casa Brava Conservas",
        "tagline": "Conservas del mar y AOVE de origen controlado",
        "story": "Obrador familiar con lotes cortos, trazabilidad visible y seleccion de materia prima de proximidad.",
        "hero_image": "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=1400&auto=format&fit=crop",
        "logo": ACCOUNTS["producer"]["profile_image"],
        "gallery": [
            "https://images.unsplash.com/photo-1544025162-d76694265947?w=900&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?w=900&auto=format&fit=crop",
        ],
        "country": "ES",
        "region": "Cantabria",
        "location": "Santona, Cantabria",
        "full_address": ACCOUNTS["producer"]["fiscal_address"],
        "store_type": "producer",
        "owner_type": "producer",
        "verified": True,
        "contact_email": ACCOUNTS["producer"]["email"],
        "contact_phone": ACCOUNTS["producer"]["phone"],
        "badges": ["verified", "traceable_origin", "small_batch"],
        "rating": 4.9,
        "review_count": 37,
    },
    {
        "store_id": "showcase_store_importer",
        "producer_id": ACCOUNTS["importer"]["user_id"],
        "slug": "atlas-mediterraneo-imports",
        "name": "Atlas Mediterraneo Imports",
        "tagline": "Importacion premium con documentacion y origen verificado",
        "story": "Seleccionamos referencias europeas con trazabilidad documental para retail gourmet y restauracion.",
        "hero_image": "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=1400&auto=format&fit=crop",
        "logo": ACCOUNTS["importer"]["profile_image"],
        "gallery": [
            "https://images.unsplash.com/photo-1519864600265-abb23847ef2c?w=900&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1542838132-92c53300491e?w=900&auto=format&fit=crop",
        ],
        "country": "ES",
        "region": "Valencia",
        "location": "Valencia, Espana",
        "full_address": ACCOUNTS["importer"]["fiscal_address"],
        "store_type": "importer",
        "owner_type": "importer",
        "verified": True,
        "contact_email": ACCOUNTS["importer"]["email"],
        "contact_phone": ACCOUNTS["importer"]["phone"],
        "badges": ["verified", "eu_documents", "premium_selection"],
        "rating": 4.8,
        "review_count": 29,
    },
]


PRODUCTS = [
    {
        "product_id": "showcase_prod_aove",
        "producer_id": ACCOUNTS["producer"]["user_id"],
        "producer_name": ACCOUNTS["producer"]["company_name"],
        "store_id": "showcase_store_producer",
        "seller_type": "producer",
        "name": "AOVE Picual Primera Cosecha",
        "slug": "aove-picual-primera-cosecha",
        "description": "Aceite de oliva virgen extra de cosecha temprana con perfil herbaceo, amargor elegante y final persistente.",
        "price": 21.9,
        "price_cents": 2190,
        "currency": "EUR",
        "images": ["https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=1200&auto=format&fit=crop"],
        "country_origin": "ES",
        "origin_country": "Espana",
        "category_id": "showcase_cat_aceites",
        "category": "Aceites",
        "ingredients": ["Aceite de oliva virgen extra 100% picual"],
        "allergens": [],
        "certifications": ["Origen verificado", "Analitica sensorial"],
        "approved": True,
        "status": "active",
        "featured": True,
        "stock": 148,
        "units_sold": 72,
    },
    {
        "product_id": "showcase_prod_ventresca",
        "producer_id": ACCOUNTS["producer"]["user_id"],
        "producer_name": ACCOUNTS["producer"]["company_name"],
        "store_id": "showcase_store_producer",
        "seller_type": "producer",
        "name": "Ventresca de Bonito del Norte en AOVE",
        "slug": "ventresca-bonito-norte-aove",
        "description": "Conserva premium elaborada a mano en lotes cortos con pescado del Cantabrico y aceite de oliva virgen extra.",
        "price": 14.5,
        "price_cents": 1450,
        "currency": "EUR",
        "images": ["https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?w=1200&auto=format&fit=crop"],
        "country_origin": "ES",
        "origin_country": "Espana",
        "category_id": "showcase_cat_conservas",
        "category": "Conservas",
        "ingredients": ["Ventresca de bonito del norte", "aceite de oliva virgen extra", "sal"],
        "allergens": ["pescado"],
        "certifications": ["Origen verificado", "Lote artesanal"],
        "approved": True,
        "status": "active",
        "featured": True,
        "stock": 96,
        "units_sold": 51,
    },
    {
        "product_id": "showcase_imp_parmigiano",
        "producer_id": ACCOUNTS["importer"]["user_id"],
        "producer_name": ACCOUNTS["importer"]["company_name"],
        "store_id": "showcase_store_importer",
        "seller_type": "importer",
        "name": "Parmigiano Reggiano 24 mesi",
        "slug": "parmigiano-reggiano-24-mesi",
        "description": "Queso DOP madurado 24 meses, textura granulosa y perfil umami intenso, importado desde Emilia-Romagna.",
        "price": 18.9,
        "price_cents": 1890,
        "currency": "EUR",
        "images": ["https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=1200&auto=format&fit=crop"],
        "country_origin": "IT",
        "origin_country": "Italia",
        "category_id": "showcase_cat_quesos",
        "category": "Quesos",
        "ingredients": ["Leche de vaca", "sal", "cuajo"],
        "allergens": ["leche"],
        "certifications": ["DOP", "Importacion documentada"],
        "approved": True,
        "status": "active",
        "featured": True,
        "stock": 64,
        "units_sold": 44,
    },
    {
        "product_id": "showcase_imp_kalamata",
        "producer_id": ACCOUNTS["importer"]["user_id"],
        "producer_name": ACCOUNTS["importer"]["company_name"],
        "store_id": "showcase_store_importer",
        "seller_type": "importer",
        "name": "Aceitunas Kalamata seleccion",
        "slug": "aceitunas-kalamata-seleccion",
        "description": "Aceituna griega carnosa, fermentacion natural y calibre premium para aperitivo y cocina mediterranea.",
        "price": 8.4,
        "price_cents": 840,
        "currency": "EUR",
        "images": ["https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=1200&auto=format&fit=crop"],
        "country_origin": "GR",
        "origin_country": "Grecia",
        "category_id": "showcase_cat_aceitunas",
        "category": "Aceitunas",
        "ingredients": ["Aceitunas kalamata", "agua", "sal marina", "vinagre de vino"],
        "allergens": [],
        "certifications": ["Origen verificado", "Importacion documentada"],
        "approved": True,
        "status": "active",
        "featured": False,
        "stock": 132,
        "units_sold": 33,
    },
]


CERTIFICATES = [
    {
        "certificate_id": "showcase_cert_aove",
        "certificate_number": "HSP-2026-AOVE01",
        "certificate_type": "food_safety",
        "product_id": "showcase_prod_aove",
        "product_name": "AOVE Picual Primera Cosecha",
        "seller_id": ACCOUNTS["producer"]["user_id"],
        "data": {
            "origin_country": "Espana",
            "lot_code": "CB-OL-2026-01",
            "harvest": "2025/2026",
            "compliance_requirements": ["origin_verification", "food_safety", "nutritional_info"],
            "lab_summary": "Acidez 0.18%, peroxidos dentro de rango, perfil sensorial frutado verde.",
        },
    },
    {
        "certificate_id": "showcase_cert_ventresca",
        "certificate_number": "HSP-2026-VNT02",
        "certificate_type": "origin",
        "product_id": "showcase_prod_ventresca",
        "product_name": "Ventresca de Bonito del Norte en AOVE",
        "seller_id": ACCOUNTS["producer"]["user_id"],
        "data": {
            "origin_country": "Espana",
            "lot_code": "CB-CN-2026-09",
            "catch_area": "Cantabrico FAO 27",
            "compliance_requirements": ["origin_verification", "labeling", "small_batch_traceability"],
            "process_summary": "Coccion suave, limpieza manual y envasado en obrador propio.",
        },
    },
    {
        "certificate_id": "showcase_cert_parmigiano",
        "certificate_number": "HSP-2026-PRM03",
        "certificate_type": "food_safety",
        "product_id": "showcase_imp_parmigiano",
        "product_name": "Parmigiano Reggiano 24 mesi",
        "seller_id": ACCOUNTS["importer"]["user_id"],
        "data": {
            "origin_country": "Italia",
            "lot_code": "AT-IT-2026-14",
            "dop_reference": "Consorzio Parmigiano Reggiano",
            "compliance_requirements": ["origin_verification", "import_documents", "cold_chain_review"],
            "document_summary": "Factura de origen, lote trazado y control de entrada en almacen refrigerado.",
        },
    },
    {
        "certificate_id": "showcase_cert_kalamata",
        "certificate_number": "HSP-2026-KAL04",
        "certificate_type": "origin",
        "product_id": "showcase_imp_kalamata",
        "product_name": "Aceitunas Kalamata seleccion",
        "seller_id": ACCOUNTS["importer"]["user_id"],
        "data": {
            "origin_country": "Grecia",
            "lot_code": "AT-GR-2026-05",
            "farm_zone": "Peloponeso",
            "compliance_requirements": ["origin_verification", "import_documents", "ingredient_labeling"],
            "document_summary": "Declaracion de origen, analitica de salmuera y trazabilidad de pallet.",
        },
    },
]


RECIPES = [
    {
        "recipe_id": "showcase_recipe_customer",
        "title": "Tosta tibia de ventresca con tomate rallado",
        "description": "Cena rapida con producto premium y muy pocos elementos.",
        "author_key": "customer",
        "difficulty": "easy",
        "time_minutes": 10,
        "servings": 2,
        "ingredients": [
            {"name": "Pan rustico", "quantity": "4 rebanadas"},
            {"name": "Ventresca de Bonito del Norte en AOVE", "product_id": "showcase_prod_ventresca", "quantity": "1 lata"},
            {"name": "Tomate maduro", "quantity": "2 unidades"},
        ],
        "steps": [
            "Tostar ligeramente el pan para mantener el centro tierno.",
            "Rallar el tomate y repartirlo sobre cada rebanada.",
            "Coronar con la ventresca escurrida y unas gotas del propio aceite.",
        ],
        "image_url": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&auto=format&fit=crop",
        "tags": ["rapido", "cena", "conservas"],
        "likes_count": 18,
    },
    {
        "recipe_id": "showcase_recipe_influencer",
        "title": "Pasta corta con crema de parmigiano y pimienta",
        "description": "Receta visual, corta y perfecta para contenido vertical.",
        "author_key": "influencer",
        "difficulty": "easy",
        "time_minutes": 18,
        "servings": 2,
        "ingredients": [
            {"name": "Pasta corta", "quantity": "180 g"},
            {"name": "Parmigiano Reggiano 24 mesi", "product_id": "showcase_imp_parmigiano", "quantity": "90 g"},
            {"name": "Pimienta negra", "quantity": "al gusto"},
        ],
        "steps": [
            "Cocer la pasta en agua con sal hasta dejarla al dente.",
            "Mezclar parmigiano rallado con un poco de agua de coccion hasta formar una crema.",
            "Ligar con la pasta fuera del fuego y terminar con pimienta recien molida.",
        ],
        "image_url": "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=1200&auto=format&fit=crop",
        "tags": ["pasta", "italia", "reel-friendly"],
        "likes_count": 73,
    },
    {
        "recipe_id": "showcase_recipe_producer",
        "title": "Ensalada de tomate, bonito y AOVE temprano",
        "description": "Plato directo para lucir producto y frescura.",
        "author_key": "producer",
        "difficulty": "easy",
        "time_minutes": 12,
        "servings": 3,
        "ingredients": [
            {"name": "Tomate de temporada", "quantity": "3 unidades"},
            {"name": "Ventresca de Bonito del Norte en AOVE", "product_id": "showcase_prod_ventresca", "quantity": "1 lata"},
            {"name": "AOVE Picual Primera Cosecha", "product_id": "showcase_prod_aove", "quantity": "3 cucharadas"},
        ],
        "steps": [
            "Cortar el tomate en gajos grandes y sazonar muy ligeramente.",
            "Anadir la ventresca en lascas anchas para no romper su textura.",
            "Terminar con AOVE temprano y servir sin pasar por frio.",
        ],
        "image_url": "https://images.unsplash.com/photo-1547592180-85f173990554?w=1200&auto=format&fit=crop",
        "tags": ["temporada", "aceite", "conserva"],
        "likes_count": 31,
    },
    {
        "recipe_id": "showcase_recipe_importer",
        "title": "Tabla mediterranea con kalamata y parmigiano",
        "description": "Aperitivo de montaje rapido con contraste salino y umami.",
        "author_key": "importer",
        "difficulty": "easy",
        "time_minutes": 8,
        "servings": 4,
        "ingredients": [
            {"name": "Aceitunas Kalamata seleccion", "product_id": "showcase_imp_kalamata", "quantity": "150 g"},
            {"name": "Parmigiano Reggiano 24 mesi", "product_id": "showcase_imp_parmigiano", "quantity": "120 g"},
            {"name": "Pan crujiente", "quantity": "1 bolsa"},
        ],
        "steps": [
            "Disponer el parmigiano en lascas amplias sobre una tabla.",
            "Anadir las aceitunas escurridas y secadas con papel.",
            "Completar con pan crujiente y servir con vino blanco fresco.",
        ],
        "image_url": "https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&auto=format&fit=crop",
        "tags": ["aperitivo", "importacion", "tabla"],
        "likes_count": 27,
    },
]


POSTS = [
    {
        "post_id": "showcase_post_customer",
        "author_key": "customer",
        "caption": "Descubrir producto con trazabilidad clara cambia por completo la confianza al comprar.",
        "location": "Madrid",
        "image_url": "https://images.unsplash.com/photo-1518131678677-aadfc8b5a1b3?w=1200&auto=format&fit=crop",
        "likes_count": 14,
        "comments_count": 2,
        "tagged_products": [],
    },
    {
        "post_id": "showcase_post_influencer",
        "author_key": "influencer",
        "caption": "Una receta funciona mejor cuando el producto ya tiene historia, origen y textura clara antes del primer plano.",
        "location": "Barcelona",
        "image_url": "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1200&auto=format&fit=crop",
        "likes_count": 126,
        "comments_count": 11,
        "tagged_products": [{"product_id": "showcase_imp_parmigiano", "x": 42, "y": 48}],
    },
    {
        "post_id": "showcase_post_producer",
        "author_key": "producer",
        "caption": "Lote corto de hoy, revision final de etiquetas y salida de pedidos con certificado enlazado.",
        "location": "Santona",
        "image_url": "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?w=1200&auto=format&fit=crop",
        "likes_count": 58,
        "comments_count": 6,
        "tagged_products": [{"product_id": "showcase_prod_ventresca", "x": 55, "y": 36}],
    },
    {
        "post_id": "showcase_post_importer",
        "author_key": "importer",
        "caption": "Nueva llegada validada: documentos completos, lote verificado y producto listo para escaparate gourmet.",
        "location": "Valencia",
        "image_url": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&auto=format&fit=crop",
        "likes_count": 41,
        "comments_count": 5,
        "tagged_products": [{"product_id": "showcase_imp_kalamata", "x": 61, "y": 41}],
    },
]


REELS = [
    {
        "post_id": "showcase_reel_customer",
        "author_key": "customer",
        "caption": "Compra rapida, cena rapida, cero friccion.",
        "location": "Madrid",
        "video_url": "https://samplelib.com/lib/preview/mp4/sample-5s.mp4",
        "thumbnail_url": "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=1200&auto=format&fit=crop",
        "likes_count": 22,
        "comments_count": 3,
        "views_count": 340,
        "tagged_products": [{"product_id": "showcase_prod_ventresca", "x": 52, "y": 58}],
    },
    {
        "post_id": "showcase_reel_influencer",
        "author_key": "influencer",
        "caption": "Pasta, queso y un reel de 10 segundos que ya hace hambre.",
        "location": "Barcelona",
        "video_url": "https://samplelib.com/lib/preview/mp4/sample-10s.mp4",
        "thumbnail_url": "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=1200&auto=format&fit=crop",
        "likes_count": 214,
        "comments_count": 19,
        "views_count": 4820,
        "tagged_products": [{"product_id": "showcase_imp_parmigiano", "x": 47, "y": 52}],
    },
    {
        "post_id": "showcase_reel_producer",
        "author_key": "producer",
        "caption": "Del lote al empaque en 15 segundos.",
        "location": "Santona",
        "video_url": "https://samplelib.com/lib/preview/mp4/sample-15s.mp4",
        "thumbnail_url": "https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&auto=format&fit=crop",
        "likes_count": 84,
        "comments_count": 7,
        "views_count": 1900,
        "tagged_products": [{"product_id": "showcase_prod_aove", "x": 51, "y": 37}],
    },
    {
        "post_id": "showcase_reel_importer",
        "author_key": "importer",
        "caption": "Unboxing limpio, lote trazado y producto listo para venta.",
        "location": "Valencia",
        "video_url": "https://samplelib.com/lib/preview/mp4/sample-20s.mp4",
        "thumbnail_url": "https://images.unsplash.com/photo-1519864600265-abb23847ef2c?w=1200&auto=format&fit=crop",
        "likes_count": 67,
        "comments_count": 8,
        "views_count": 2210,
        "tagged_products": [{"product_id": "showcase_imp_kalamata", "x": 58, "y": 39}],
    },
]


STORIES = [
    {"story_id": "showcase_story_customer", "author_key": "customer", "caption": "Cena resuelta en minutos.", "location": "Madrid", "image_url": "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=1200&auto=format&fit=crop"},
    {"story_id": "showcase_story_influencer", "author_key": "influencer", "caption": "Texturas que funcionan en camara.", "location": "Barcelona", "image_url": "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1200&auto=format&fit=crop"},
    {"story_id": "showcase_story_producer", "author_key": "producer", "caption": "Salida de lote con certificado activo.", "location": "Santona", "image_url": "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?w=1200&auto=format&fit=crop"},
    {"story_id": "showcase_story_importer", "author_key": "importer", "caption": "Recepcion de producto verificada.", "location": "Valencia", "image_url": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&auto=format&fit=crop"},
]


FOLLOWS = [
    ("showcase_customer_2026", "showcase_influencer_2026"),
    ("showcase_customer_2026", "showcase_producer_2026"),
    ("showcase_customer_2026", "showcase_importer_2026"),
    ("showcase_influencer_2026", "showcase_producer_2026"),
    ("showcase_importer_2026", "showcase_producer_2026"),
]


async def upsert_user(db, payload: Dict[str, object]) -> None:
    created_at = payload.get("created_at") or now_iso()
    base_doc = {
        **payload,
        "password_hash": hash_password(payload["password"]),
        "avatar_url": payload["profile_image"],
        "email_verified": True,
        "approved": True,
        "onboarding_completed": True,
        "is_active": True,
        "followers_count": 0,
        "following_count": 0,
        "posts_count": 2,
        "created_at": created_at,
        "updated_at": now_iso(),
    }
    base_doc.pop("password", None)
    await db.users.update_one({"user_id": payload["user_id"]}, {"$set": base_doc}, upsert=True)


async def upsert_category(db, payload: Dict[str, object]) -> None:
    await db.categories.update_one(
        {"category_id": payload["category_id"]},
        {"$set": {**payload, "updated_at": now_iso(), "created_at": payload.get("created_at") or now_iso()}},
        upsert=True,
    )


async def upsert_store_profile(db, payload: Dict[str, object]) -> None:
    doc = {**payload, "created_at": payload.get("created_at") or now_iso(), "updated_at": now_iso()}
    await db.store_profiles.update_one({"store_id": payload["store_id"]}, {"$set": doc}, upsert=True)


async def upsert_product(db, payload: Dict[str, object]) -> None:
    doc = {**payload, "created_at": payload.get("created_at") or now_iso(), "updated_at": now_iso(), "image_urls": payload.get("images", [])}
    await db.products.update_one({"product_id": payload["product_id"]}, {"$set": doc}, upsert=True)


async def upsert_certificate(db, payload: Dict[str, object]) -> None:
    doc = {
        **payload,
        "qr_url": f"https://www.hispaloshop.com/certificate/{payload['product_id']}",
        "qr_code": "",
        "approved": True,
        "status": "approved",
        "source_language": "es",
        "translated_fields": {},
        "issue_date": payload.get("issue_date") or now_iso(),
        "expiry_date": payload.get("expiry_date") or days_from_now(365),
        "created_at": payload.get("created_at") or now_iso(),
    }
    await db.certificates.update_one({"certificate_id": payload["certificate_id"]}, {"$set": doc}, upsert=True)
    await db.products.update_one(
        {"product_id": payload["product_id"]},
        {"$set": {"certificate_id": payload["certificate_id"], "updated_at": now_iso()}},
    )


async def upsert_recipe(db, payload: Dict[str, object]) -> None:
    author = ACCOUNTS[payload["author_key"]]
    doc = {
        "recipe_id": payload["recipe_id"],
        "title": payload["title"],
        "description": payload["description"],
        "author_id": author["user_id"],
        "author_name": author["name"],
        "difficulty": payload["difficulty"],
        "time_minutes": payload["time_minutes"],
        "servings": payload["servings"],
        "ingredients": payload["ingredients"],
        "steps": payload["steps"],
        "image_url": payload["image_url"],
        "tags": payload["tags"],
        "likes_count": payload["likes_count"],
        "status": "active",
        "created_at": payload.get("created_at") or now_iso(),
    }
    await db.recipes.update_one({"recipe_id": payload["recipe_id"]}, {"$set": doc}, upsert=True)


async def upsert_post(db, payload: Dict[str, object], is_reel: bool = False) -> None:
    author = ACCOUNTS[payload["author_key"]]
    media_type = "video" if is_reel else "image"
    primary_url = payload["video_url"] if is_reel else payload["image_url"]
    doc = {
        "post_id": payload["post_id"],
        "user_id": author["user_id"],
        "user_name": author["name"],
        "user_profile_image": author["profile_image"],
        "caption": payload["caption"],
        "location": payload["location"],
        "type": "reel" if is_reel else "post",
        "post_type": "reel" if is_reel else "post",
        "media_type": media_type,
        "media": build_media(primary_url, media_type=media_type, ratio="9:16" if is_reel else "4:5"),
        "image_url": payload.get("thumbnail_url") if is_reel else payload["image_url"],
        "video_url": payload.get("video_url"),
        "thumbnail_url": payload.get("thumbnail_url"),
        "tagged_product": (payload.get("tagged_products") or [{}])[0].get("product_id"),
        "tagged_products": payload.get("tagged_products", []),
        "likes_count": payload.get("likes_count", 0),
        "comments_count": payload.get("comments_count", 0),
        "views_count": payload.get("views_count", 0),
        "shares_count": payload.get("shares_count", 0),
        "is_reel": is_reel,
        "status": "published",
        "created_at": payload.get("created_at") or now_iso(),
    }
    await db.user_posts.update_one({"post_id": payload["post_id"]}, {"$set": doc}, upsert=True)


async def upsert_story(db, payload: Dict[str, object]) -> None:
    author = ACCOUNTS[payload["author_key"]]
    doc = {
        "story_id": payload["story_id"],
        "user_id": author["user_id"],
        "user_name": author["name"],
        "user_profile_image": author["profile_image"],
        "image_url": payload["image_url"],
        "caption": payload["caption"],
        "location": payload["location"],
        "views": [],
        "created_at": now_iso(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=23)).isoformat(),
    }
    await db.hispalostories.update_one({"story_id": payload["story_id"]}, {"$set": doc}, upsert=True)


async def upsert_follow(db, follower_id: str, following_id: str) -> None:
    await db.user_follows.update_one(
        {"follower_id": follower_id, "following_id": following_id},
        {"$set": {"created_at": now_iso()}},
        upsert=True,
    )


async def refresh_counters(db) -> None:
    for account in ACCOUNTS.values():
        followers = await db.user_follows.count_documents({"following_id": account["user_id"]})
        following = await db.user_follows.count_documents({"follower_id": account["user_id"]})
        posts = await db.user_posts.count_documents({"user_id": account["user_id"]})
        await db.users.update_one(
            {"user_id": account["user_id"]},
            {"$set": {"followers_count": followers, "following_count": following, "posts_count": posts, "updated_at": now_iso()}},
        )


async def seed() -> None:
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.get_default_database()
    try:
        for account in ACCOUNTS.values():
            await upsert_user(db, account)
        for category in CATEGORIES:
            await upsert_category(db, category)
        for store in STORE_PROFILES:
            await upsert_store_profile(db, store)
        for product in PRODUCTS:
            await upsert_product(db, product)
        for certificate in CERTIFICATES:
            await upsert_certificate(db, certificate)
        for recipe in RECIPES:
            await upsert_recipe(db, recipe)
        for post in POSTS:
            await upsert_post(db, post, is_reel=False)
        for reel in REELS:
            await upsert_post(db, reel, is_reel=True)
        for story in STORIES:
            await upsert_story(db, story)
        for follower_id, following_id in FOLLOWS:
            await upsert_follow(db, follower_id, following_id)
        await refresh_counters(db)

        print("Seed showcase completado.")
        print("")
        print("Credenciales demo:")
        for key in ("customer", "influencer", "producer", "importer"):
            account = ACCOUNTS[key]
            print(f"- {key}: {account['email']} / {account['password']}")
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(seed())
