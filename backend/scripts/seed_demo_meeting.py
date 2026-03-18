#!/usr/bin/env python3
"""
Seed completo para demo/reunion con productores, importadores e inversores.
Crea un ecosistema realista: usuarios, tiendas, productos, posts, reels, stories,
recetas, comunidades, chats, certificados, follows, reviews.

Ejecutar:  python scripts/seed_demo_meeting.py
Login:     cualquier cuenta usa password "Demo2026!"
"""
from __future__ import annotations

import asyncio
import os
import sys
import uuid
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

PASSWORD = "Demo2026!"
PREFIX = "demo_"


def uid() -> str:
    return f"{PREFIX}{uuid.uuid4().hex[:10]}"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def ago(days: int = 0, hours: int = 0) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days, hours=hours)).isoformat()


def future(hours: int = 23) -> str:
    return (datetime.now(timezone.utc) + timedelta(hours=hours)).isoformat()


def future_days(days: int) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()


def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def media(url: str, mtype: str = "image", ratio: str = "4:5") -> List[Dict]:
    return [{"url": url, "type": mtype, "order": 0, "ratio": ratio}]


HASHED = hash_pw(PASSWORD)

# ═══════════════════════════════════════════════════════════════
# USERS
# ═══════════════════════════════════════════════════════════════

USERS = [
    # ── Productores ──
    {
        "user_id": f"{PREFIX}prod_oliva", "email": "fincaolivares@demo.hispaloshop.com",
        "name": "Finca Los Olivares", "username": "finca.olivares", "role": "producer",
        "company_name": "Finca Los Olivares SL", "vat_cif": "B41234567",
        "bio": "Aceite de oliva virgen extra de Jaén. 4ª generación. Producción limitada, calidad sin compromiso.",
        "location": "Jaén, España", "country": "ES", "phone": "+34 953 100 200",
        "fiscal_address": "Ctra. Nacional 322 km 42, Jaén",
        "profile_image": "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop",
        "cover_image": "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=1400&auto=format&fit=crop",
    },
    {
        "user_id": f"{PREFIX}prod_jamon", "email": "dehesaiberica@demo.hispaloshop.com",
        "name": "Dehesa Ibérica", "username": "dehesa.iberica", "role": "producer",
        "company_name": "Dehesa Ibérica Premium SL", "vat_cif": "B06123456",
        "bio": "Jamones y embutidos ibéricos de bellota. Crianza en dehesa extremeña. DOP Los Pedroches.",
        "location": "Azuaga, Extremadura", "country": "ES", "phone": "+34 924 200 300",
        "fiscal_address": "Finca La Dehesa s/n, Azuaga, Badajoz",
        "profile_image": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop",
        "cover_image": "https://images.unsplash.com/photo-1603048719539-9ecb4aa395e3?w=1400&auto=format&fit=crop",
    },
    {
        "user_id": f"{PREFIX}prod_queso", "email": "quesosartesanos@demo.hispaloshop.com",
        "name": "Quesos La Mancha", "username": "quesos.lamancha", "role": "producer",
        "company_name": "Quesos Artesanos La Mancha SL", "vat_cif": "B13987654",
        "bio": "Quesos artesanales manchegos DOP. Leche cruda de oveja. Curación natural en bodega.",
        "location": "Tomelloso, Ciudad Real", "country": "ES", "phone": "+34 926 500 100",
        "fiscal_address": "Polígono Industrial 3, Tomelloso",
        "profile_image": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop",
        "cover_image": "https://images.unsplash.com/photo-1552767059-ce182ead6c1b?w=1400&auto=format&fit=crop",
    },
    {
        "user_id": f"{PREFIX}prod_vino", "email": "bodegasierranorte@demo.hispaloshop.com",
        "name": "Bodega Sierra Norte", "username": "bodega.sierranorte", "role": "producer",
        "company_name": "Bodega Sierra Norte SL", "vat_cif": "B26543210",
        "bio": "Vinos de autor en DOCa Rioja. Viticultura ecológica, fermentación natural, barricas seleccionadas.",
        "location": "Haro, La Rioja", "country": "ES", "phone": "+34 941 300 400",
        "fiscal_address": "Barrio de la Estación 7, Haro, La Rioja",
        "profile_image": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop",
        "cover_image": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=1400&auto=format&fit=crop",
    },
    # ── Importador ──
    {
        "user_id": f"{PREFIX}imp_med", "email": "medimports@demo.hispaloshop.com",
        "name": "Mediterranean Select", "username": "med.select", "role": "importer",
        "company_name": "Mediterranean Select Imports SL", "vat_cif": "B46789012",
        "bio": "Importación premium de Italia, Grecia y Francia. Trazabilidad documental completa.",
        "location": "Valencia, España", "country": "ES", "phone": "+34 961 440 500",
        "fiscal_address": "Av. del Puerto 91, Valencia",
        "profile_image": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop",
        "cover_image": "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=1400&auto=format&fit=crop",
    },
    # ── Influencers ──
    {
        "user_id": f"{PREFIX}inf_laura", "email": "laura.foodie@demo.hispaloshop.com",
        "name": "Laura García", "username": "laura.foodie", "role": "influencer",
        "bio": "Creadora foodie 🍽️ Recetas fáciles con producto de calidad. 48K seguidores en IG.",
        "location": "Barcelona, España", "country": "ES",
        "profile_image": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop",
        "cover_image": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1400&auto=format&fit=crop",
    },
    {
        "user_id": f"{PREFIX}inf_carlos", "email": "carlos.chef@demo.hispaloshop.com",
        "name": "Carlos Ruiz", "username": "carlos.chef", "role": "influencer",
        "bio": "Chef y creador de contenido. Cocina mediterránea con ingredientes trazables.",
        "location": "Madrid, España", "country": "ES",
        "profile_image": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&auto=format&fit=crop",
        "cover_image": "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1400&auto=format&fit=crop",
    },
    # ── Clientes ──
    {
        "user_id": f"{PREFIX}cust_maria", "email": "maria.lopez@demo.hispaloshop.com",
        "name": "María López", "username": "maria.lopez", "role": "customer",
        "bio": "Amante de la gastronomía española. Compradora habitual de productos artesanales.",
        "location": "Madrid, España", "country": "ES",
        "profile_image": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop",
    },
    {
        "user_id": f"{PREFIX}cust_pablo", "email": "pablo.garcia@demo.hispaloshop.com",
        "name": "Pablo García", "username": "pablo.garcia", "role": "customer",
        "bio": "Foodie de corazón. Siempre buscando el mejor aceite y el queso perfecto.",
        "location": "Sevilla, España", "country": "ES",
        "profile_image": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop",
    },
    {
        "user_id": f"{PREFIX}cust_ana", "email": "ana.martinez@demo.hispaloshop.com",
        "name": "Ana Martínez", "username": "ana.martinez", "role": "customer",
        "bio": "Cocinera casera con pasión por lo auténtico. Fan de las conservas del norte.",
        "location": "Bilbao, España", "country": "ES",
        "profile_image": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop",
    },
]

# ═══════════════════════════════════════════════════════════════
# CATEGORIES
# ═══════════════════════════════════════════════════════════════

CATEGORIES = [
    {"category_id": f"{PREFIX}cat_aceites", "name": "Aceites", "slug": "aceites", "icon": "droplet", "active": True},
    {"category_id": f"{PREFIX}cat_embutidos", "name": "Embutidos", "slug": "embutidos", "icon": "beef", "active": True},
    {"category_id": f"{PREFIX}cat_quesos", "name": "Quesos", "slug": "quesos", "icon": "cheese", "active": True},
    {"category_id": f"{PREFIX}cat_vinos", "name": "Vinos", "slug": "vinos", "icon": "wine", "active": True},
    {"category_id": f"{PREFIX}cat_conservas", "name": "Conservas", "slug": "conservas", "icon": "jar", "active": True},
    {"category_id": f"{PREFIX}cat_miel", "name": "Miel y dulces", "slug": "miel-dulces", "icon": "cookie", "active": True},
    {"category_id": f"{PREFIX}cat_pasta", "name": "Pasta y cereales", "slug": "pasta-cereales", "icon": "wheat", "active": True},
    {"category_id": f"{PREFIX}cat_especias", "name": "Especias", "slug": "especias", "icon": "leaf", "active": True},
]

# ═══════════════════════════════════════════════════════════════
# STORE PROFILES
# ═══════════════════════════════════════════════════════════════

STORES = [
    {
        "store_id": f"{PREFIX}store_oliva", "producer_id": f"{PREFIX}prod_oliva",
        "slug": "finca-los-olivares", "name": "Finca Los Olivares",
        "tagline": "Aceite de oliva virgen extra de Jaén desde 1928",
        "story": "Cuatro generaciones cultivando el mejor aceite de la sierra de Jaén. Recolección temprana, extracción en frío a las pocas horas de la cosecha. Cada botella lleva el código de lote y la fecha exacta de molturación.",
        "founder_name": "Antonio Olivares",
        "founder_quote": "El mejor aceite se hace con respeto al olivo y al tiempo.",
        "hero_image": "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=1400&auto=format&fit=crop",
        "logo": "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop",
        "gallery": [
            "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=900&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1544025162-d76694265947?w=900&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?w=900&auto=format&fit=crop",
        ],
        "country": "ES", "region": "Andalucía", "location": "Jaén, Andalucía",
        "full_address": "Ctra. Nacional 322 km 42, Jaén",
        "coordinates": {"lat": 37.7796, "lng": -3.7849},
        "store_type": "producer", "owner_type": "producer", "verified": True,
        "contact_email": "fincaolivares@demo.hispaloshop.com", "contact_phone": "+34 953 100 200",
        "badges": ["verified", "organic", "traceable_origin", "4th_generation"],
        "rating": 4.9, "review_count": 127, "follower_count": 342, "product_count": 6,
    },
    {
        "store_id": f"{PREFIX}store_jamon", "producer_id": f"{PREFIX}prod_jamon",
        "slug": "dehesa-iberica", "name": "Dehesa Ibérica",
        "tagline": "Jamón ibérico de bellota. Crianza natural en dehesa.",
        "story": "Nuestros cerdos ibéricos viven en libertad en la dehesa extremeña, alimentándose de bellotas durante la montanera. Cada pieza se cura durante un mínimo de 36 meses en nuestros secaderos naturales.",
        "hero_image": "https://images.unsplash.com/photo-1603048719539-9ecb4aa395e3?w=1400&auto=format&fit=crop",
        "logo": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop",
        "gallery": [
            "https://images.unsplash.com/photo-1603048719539-9ecb4aa395e3?w=900&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=900&auto=format&fit=crop",
        ],
        "country": "ES", "region": "Extremadura", "location": "Azuaga, Badajoz",
        "full_address": "Finca La Dehesa s/n, Azuaga, Badajoz",
        "coordinates": {"lat": 38.2568, "lng": -5.6731},
        "store_type": "producer", "owner_type": "producer", "verified": True,
        "contact_email": "dehesaiberica@demo.hispaloshop.com", "contact_phone": "+34 924 200 300",
        "badges": ["verified", "dop", "free_range", "36_months"],
        "rating": 4.95, "review_count": 89, "follower_count": 567, "product_count": 5,
    },
    {
        "store_id": f"{PREFIX}store_queso", "producer_id": f"{PREFIX}prod_queso",
        "slug": "quesos-la-mancha", "name": "Quesos La Mancha",
        "tagline": "Quesos artesanales manchegos con leche cruda de oveja DOP",
        "story": "Elaboramos quesos con leche cruda de oveja manchega de nuestro propio rebaño. Cada queso madura en bodega natural durante un mínimo de 4 meses, desarrollando su sabor característico.",
        "hero_image": "https://images.unsplash.com/photo-1552767059-ce182ead6c1b?w=1400&auto=format&fit=crop",
        "logo": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop",
        "gallery": [
            "https://images.unsplash.com/photo-1552767059-ce182ead6c1b?w=900&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=900&auto=format&fit=crop",
        ],
        "country": "ES", "region": "Castilla-La Mancha", "location": "Tomelloso, Ciudad Real",
        "full_address": "Polígono Industrial 3, Tomelloso",
        "coordinates": {"lat": 39.1571, "lng": -3.0230},
        "store_type": "producer", "owner_type": "producer", "verified": True,
        "contact_email": "quesosartesanos@demo.hispaloshop.com", "contact_phone": "+34 926 500 100",
        "badges": ["verified", "dop", "raw_milk", "artisanal"],
        "rating": 4.85, "review_count": 64, "follower_count": 231, "product_count": 4,
    },
    {
        "store_id": f"{PREFIX}store_vino", "producer_id": f"{PREFIX}prod_vino",
        "slug": "bodega-sierra-norte", "name": "Bodega Sierra Norte",
        "tagline": "Vinos de autor en DOCa Rioja. Viticultura ecológica.",
        "story": "Viñedos propios a 650m de altitud. Viticultura ecológica, vendimia manual y fermentación con levaduras autóctonas. Cada cosecha refleja el carácter único de nuestro terroir.",
        "hero_image": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=1400&auto=format&fit=crop",
        "logo": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop",
        "gallery": [
            "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=900&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=900&auto=format&fit=crop",
        ],
        "country": "ES", "region": "La Rioja", "location": "Haro, La Rioja",
        "full_address": "Barrio de la Estación 7, Haro, La Rioja",
        "coordinates": {"lat": 42.5805, "lng": -2.8497},
        "store_type": "producer", "owner_type": "producer", "verified": True,
        "contact_email": "bodegasierranorte@demo.hispaloshop.com", "contact_phone": "+34 941 300 400",
        "badges": ["verified", "organic", "doca_rioja", "estate_bottled"],
        "rating": 4.8, "review_count": 53, "follower_count": 198, "product_count": 4,
    },
    {
        "store_id": f"{PREFIX}store_med", "producer_id": f"{PREFIX}imp_med",
        "slug": "mediterranean-select", "name": "Mediterranean Select",
        "tagline": "Importación premium desde Italia, Grecia y Francia",
        "story": "Seleccionamos las mejores referencias del Mediterráneo con trazabilidad documental completa. Cada producto viene acompañado de su documentación de origen y certificaciones.",
        "hero_image": "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=1400&auto=format&fit=crop",
        "logo": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop",
        "gallery": [
            "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=900&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1542838132-92c53300491e?w=900&auto=format&fit=crop",
        ],
        "country": "ES", "region": "Valencia", "location": "Valencia, España",
        "full_address": "Av. del Puerto 91, Valencia",
        "coordinates": {"lat": 39.4561, "lng": -0.3545},
        "store_type": "importer", "owner_type": "importer", "verified": True,
        "contact_email": "medimports@demo.hispaloshop.com", "contact_phone": "+34 961 440 500",
        "badges": ["verified", "eu_documents", "premium_selection", "cold_chain"],
        "rating": 4.8, "review_count": 41, "follower_count": 156, "product_count": 6,
    },
]

# ═══════════════════════════════════════════════════════════════
# PRODUCTS (20 productos)
# ═══════════════════════════════════════════════════════════════

PRODUCTS = [
    # ── Finca Los Olivares ──
    {"product_id": f"{PREFIX}p_aove_picual", "producer_id": f"{PREFIX}prod_oliva", "store_id": f"{PREFIX}store_oliva", "seller_type": "producer",
     "name": "AOVE Picual Primera Cosecha 500ml", "slug": "aove-picual-primera-cosecha",
     "description": "Aceite de oliva virgen extra de cosecha temprana. Variedad picual 100%. Perfil herbáceo intenso con amargor elegante y picor persistente. Acidez < 0.2°. Extracción en frío en las 4 horas siguientes a la recolección.",
     "price": 18.90, "price_cents": 1890, "currency": "EUR", "category_id": f"{PREFIX}cat_aceites", "category": "Aceites",
     "images": ["https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=1200&auto=format&fit=crop"],
     "country_origin": "ES", "stock": 148, "units_sold": 312, "approved": True, "status": "active", "featured": True,
     "average_rating": 4.9, "review_count": 47},

    {"product_id": f"{PREFIX}p_aove_arbequina", "producer_id": f"{PREFIX}prod_oliva", "store_id": f"{PREFIX}store_oliva", "seller_type": "producer",
     "name": "AOVE Arbequina Suave 250ml", "slug": "aove-arbequina-suave",
     "description": "Aceite suave y frutado, ideal para ensaladas y pescados. Variedad arbequina de finca propia. Notas de almendra verde y manzana.",
     "price": 11.50, "price_cents": 1150, "currency": "EUR", "category_id": f"{PREFIX}cat_aceites", "category": "Aceites",
     "images": ["https://images.unsplash.com/photo-1615484477778-ca3b77940c25?w=1200&auto=format&fit=crop"],
     "country_origin": "ES", "stock": 200, "units_sold": 185, "approved": True, "status": "active",
     "average_rating": 4.8, "review_count": 31},

    {"product_id": f"{PREFIX}p_aove_hojiblanca", "producer_id": f"{PREFIX}prod_oliva", "store_id": f"{PREFIX}store_oliva", "seller_type": "producer",
     "name": "AOVE Hojiblanca Equilibrado 500ml", "slug": "aove-hojiblanca-equilibrado",
     "description": "Aceite equilibrado con notas de hierba fresca y tomate verde. Perfecto para cocinar y aliñar. Variedad hojiblanca de cultivo ecológico.",
     "price": 15.90, "price_cents": 1590, "currency": "EUR", "category_id": f"{PREFIX}cat_aceites", "category": "Aceites",
     "images": ["https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=1200&auto=format&fit=crop"],
     "country_origin": "ES", "stock": 120, "units_sold": 98, "approved": True, "status": "active",
     "average_rating": 4.7, "review_count": 22},

    # ── Dehesa Ibérica ──
    {"product_id": f"{PREFIX}p_jamon_bellota", "producer_id": f"{PREFIX}prod_jamon", "store_id": f"{PREFIX}store_jamon", "seller_type": "producer",
     "name": "Jamón Ibérico de Bellota DOP (sobre 100g)", "slug": "jamon-iberico-bellota-dop",
     "description": "Jamón 100% ibérico de bellota con DOP Los Pedroches. Curación mínima de 36 meses. Cortado a cuchillo y envasado al vacío. Sabor intenso con notas de bellota y grasa infiltrada fundente.",
     "price": 24.90, "price_cents": 2490, "currency": "EUR", "category_id": f"{PREFIX}cat_embutidos", "category": "Embutidos",
     "images": ["https://images.unsplash.com/photo-1603048719539-9ecb4aa395e3?w=1200&auto=format&fit=crop"],
     "country_origin": "ES", "stock": 85, "units_sold": 567, "approved": True, "status": "active", "featured": True,
     "average_rating": 4.95, "review_count": 134},

    {"product_id": f"{PREFIX}p_lomo_iberico", "producer_id": f"{PREFIX}prod_jamon", "store_id": f"{PREFIX}store_jamon", "seller_type": "producer",
     "name": "Lomo Ibérico de Bellota (sobre 100g)", "slug": "lomo-iberico-bellota",
     "description": "Lomo ibérico curado en tripa natural. Carne magra e infiltrada con sabor profundo a pimentón de La Vera y especias nobles.",
     "price": 16.50, "price_cents": 1650, "currency": "EUR", "category_id": f"{PREFIX}cat_embutidos", "category": "Embutidos",
     "images": ["https://images.unsplash.com/photo-1529692236671-f1f6cf45f1d6?w=1200&auto=format&fit=crop"],
     "country_origin": "ES", "stock": 60, "units_sold": 234, "approved": True, "status": "active",
     "average_rating": 4.85, "review_count": 56},

    {"product_id": f"{PREFIX}p_chorizo_iberico", "producer_id": f"{PREFIX}prod_jamon", "store_id": f"{PREFIX}store_jamon", "seller_type": "producer",
     "name": "Chorizo Ibérico de Bellota", "slug": "chorizo-iberico-bellota",
     "description": "Chorizo ibérico curado con pimentón de La Vera ahumado. Textura firme, sabor intenso. Perfecto para tabla o cocinar.",
     "price": 12.90, "price_cents": 1290, "currency": "EUR", "category_id": f"{PREFIX}cat_embutidos", "category": "Embutidos",
     "images": ["https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=1200&auto=format&fit=crop"],
     "country_origin": "ES", "stock": 90, "units_sold": 178, "approved": True, "status": "active",
     "average_rating": 4.8, "review_count": 42},

    # ── Quesos La Mancha ──
    {"product_id": f"{PREFIX}p_manchego_curado", "producer_id": f"{PREFIX}prod_queso", "store_id": f"{PREFIX}store_queso", "seller_type": "producer",
     "name": "Manchego Curado DOP 350g", "slug": "manchego-curado-dop",
     "description": "Queso manchego DOP con curación de 8 meses. Leche cruda de oveja. Textura firme con cristales, sabor intenso y persistente con notas de frutos secos.",
     "price": 14.90, "price_cents": 1490, "currency": "EUR", "category_id": f"{PREFIX}cat_quesos", "category": "Quesos",
     "images": ["https://images.unsplash.com/photo-1552767059-ce182ead6c1b?w=1200&auto=format&fit=crop"],
     "country_origin": "ES", "stock": 65, "units_sold": 289, "approved": True, "status": "active", "featured": True,
     "average_rating": 4.9, "review_count": 73},

    {"product_id": f"{PREFIX}p_manchego_semi", "producer_id": f"{PREFIX}prod_queso", "store_id": f"{PREFIX}store_queso", "seller_type": "producer",
     "name": "Manchego Semicurado DOP 350g", "slug": "manchego-semicurado-dop",
     "description": "Queso manchego semicurado, 4 meses de maduración. Sabor suave y cremoso, ideal para el día a día.",
     "price": 11.90, "price_cents": 1190, "currency": "EUR", "category_id": f"{PREFIX}cat_quesos", "category": "Quesos",
     "images": ["https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=1200&auto=format&fit=crop"],
     "country_origin": "ES", "stock": 80, "units_sold": 195, "approved": True, "status": "active",
     "average_rating": 4.7, "review_count": 38},

    # ── Bodega Sierra Norte ──
    {"product_id": f"{PREFIX}p_rioja_reserva", "producer_id": f"{PREFIX}prod_vino", "store_id": f"{PREFIX}store_vino", "seller_type": "producer",
     "name": "Rioja Reserva 2020", "slug": "rioja-reserva-2020",
     "description": "Tempranillo 100% de viñas viejas. 18 meses en barrica de roble francés. Aromas de frutos negros, especias y vainilla. Estructura elegante y final largo.",
     "price": 22.50, "price_cents": 2250, "currency": "EUR", "category_id": f"{PREFIX}cat_vinos", "category": "Vinos",
     "images": ["https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=1200&auto=format&fit=crop"],
     "country_origin": "ES", "stock": 120, "units_sold": 156, "approved": True, "status": "active", "featured": True,
     "average_rating": 4.8, "review_count": 45},

    {"product_id": f"{PREFIX}p_rioja_crianza", "producer_id": f"{PREFIX}prod_vino", "store_id": f"{PREFIX}store_vino", "seller_type": "producer",
     "name": "Rioja Crianza 2021", "slug": "rioja-crianza-2021",
     "description": "Tempranillo con toques de graciano. 12 meses en barrica. Fresco, afrutado y versátil. Perfecto para el día a día.",
     "price": 12.90, "price_cents": 1290, "currency": "EUR", "category_id": f"{PREFIX}cat_vinos", "category": "Vinos",
     "images": ["https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=1200&auto=format&fit=crop"],
     "country_origin": "ES", "stock": 200, "units_sold": 234, "approved": True, "status": "active",
     "average_rating": 4.6, "review_count": 67},

    {"product_id": f"{PREFIX}p_blanco_verdejo", "producer_id": f"{PREFIX}prod_vino", "store_id": f"{PREFIX}store_vino", "seller_type": "producer",
     "name": "Verdejo Rueda 2023", "slug": "verdejo-rueda-2023",
     "description": "Verdejo 100%. Fermentación a baja temperatura. Fresco, con notas de fruta tropical y hierbas aromáticas. Ideal con marisco y aperitivos.",
     "price": 9.90, "price_cents": 990, "currency": "EUR", "category_id": f"{PREFIX}cat_vinos", "category": "Vinos",
     "images": ["https://images.unsplash.com/photo-1558001373-7b93ee48ffa0?w=1200&auto=format&fit=crop"],
     "country_origin": "ES", "stock": 180, "units_sold": 312, "approved": True, "status": "active",
     "average_rating": 4.7, "review_count": 89},

    # ── Mediterranean Select (importados) ──
    {"product_id": f"{PREFIX}p_parmigiano", "producer_id": f"{PREFIX}imp_med", "store_id": f"{PREFIX}store_med", "seller_type": "importer",
     "name": "Parmigiano Reggiano 24 meses 200g", "slug": "parmigiano-reggiano-24",
     "description": "Queso DOP madurado 24 meses en Emilia-Romagna. Textura granulosa, sabor umami intenso. Perfecto rallado o en lascas.",
     "price": 12.90, "price_cents": 1290, "currency": "EUR", "category_id": f"{PREFIX}cat_quesos", "category": "Quesos",
     "images": ["https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=1200&auto=format&fit=crop"],
     "country_origin": "IT", "stock": 75, "units_sold": 178, "approved": True, "status": "active", "featured": True,
     "average_rating": 4.9, "review_count": 52},

    {"product_id": f"{PREFIX}p_kalamata", "producer_id": f"{PREFIX}imp_med", "store_id": f"{PREFIX}store_med", "seller_type": "importer",
     "name": "Aceitunas Kalamata Premium 350g", "slug": "aceitunas-kalamata-premium",
     "description": "Aceitunas griegas del Peloponeso. Fermentación natural, calibre extra. Carnosas, con sabor profundo.",
     "price": 7.90, "price_cents": 790, "currency": "EUR", "category_id": f"{PREFIX}cat_conservas", "category": "Conservas",
     "images": ["https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=1200&auto=format&fit=crop"],
     "country_origin": "GR", "stock": 130, "units_sold": 98, "approved": True, "status": "active",
     "average_rating": 4.7, "review_count": 29},

    {"product_id": f"{PREFIX}p_pasta_gragnano", "producer_id": f"{PREFIX}imp_med", "store_id": f"{PREFIX}store_med", "seller_type": "importer",
     "name": "Pasta di Gragnano IGP Rigatoni 500g", "slug": "pasta-gragnano-rigatoni",
     "description": "Pasta artesanal de Gragnano (Nápoles). Trafilata al bronzo, secado lento. Textura rugosa que atrapa la salsa.",
     "price": 5.90, "price_cents": 590, "currency": "EUR", "category_id": f"{PREFIX}cat_pasta", "category": "Pasta y cereales",
     "images": ["https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=1200&auto=format&fit=crop"],
     "country_origin": "IT", "stock": 200, "units_sold": 145, "approved": True, "status": "active",
     "average_rating": 4.8, "review_count": 34},

    {"product_id": f"{PREFIX}p_miel_manuka", "producer_id": f"{PREFIX}imp_med", "store_id": f"{PREFIX}store_med", "seller_type": "importer",
     "name": "Miel de Romero del Mediterráneo 500g", "slug": "miel-romero-mediterraneo",
     "description": "Miel cruda de romero, recolectada en primavera en el sur de Francia. Sin filtrar ni pasteurizar. Sabor floral delicado.",
     "price": 14.50, "price_cents": 1450, "currency": "EUR", "category_id": f"{PREFIX}cat_miel", "category": "Miel y dulces",
     "images": ["https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=1200&auto=format&fit=crop"],
     "country_origin": "FR", "stock": 55, "units_sold": 67, "approved": True, "status": "active",
     "average_rating": 4.85, "review_count": 21},

    {"product_id": f"{PREFIX}p_azafran", "producer_id": f"{PREFIX}imp_med", "store_id": f"{PREFIX}store_med", "seller_type": "importer",
     "name": "Azafrán de La Mancha DOP 2g", "slug": "azafran-mancha-dop",
     "description": "Azafrán en hebras de La Mancha. Denominación de Origen. Color, sabor y aroma excepcionales. Recolección y procesado manual.",
     "price": 9.90, "price_cents": 990, "currency": "EUR", "category_id": f"{PREFIX}cat_especias", "category": "Especias",
     "images": ["https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=1200&auto=format&fit=crop"],
     "country_origin": "ES", "stock": 40, "units_sold": 89, "approved": True, "status": "active",
     "average_rating": 4.9, "review_count": 18},
]

# ═══════════════════════════════════════════════════════════════
# CERTIFICATES
# ═══════════════════════════════════════════════════════════════

CERTIFICATES = [
    {"certificate_id": f"{PREFIX}cert_aove", "certificate_number": "HSP-2026-AOV01", "certificate_type": "food_safety",
     "product_id": f"{PREFIX}p_aove_picual", "product_name": "AOVE Picual Primera Cosecha",
     "seller_id": f"{PREFIX}prod_oliva",
     "data": {"origin_country": "España", "lot_code": "FO-PC-2026-01", "harvest": "2025/2026",
              "compliance_requirements": ["origin_verification", "food_safety", "organic_cert"],
              "lab_summary": "Acidez 0.18°, peróxidos 4.2 meq/kg, perfil sensorial: frutado verde intenso, amargo medio, picante medio-alto."}},
    {"certificate_id": f"{PREFIX}cert_jamon", "certificate_number": "HSP-2026-JAM02", "certificate_type": "origin",
     "product_id": f"{PREFIX}p_jamon_bellota", "product_name": "Jamón Ibérico de Bellota DOP",
     "seller_id": f"{PREFIX}prod_jamon",
     "data": {"origin_country": "España", "lot_code": "DI-JB-2023-14", "dop_reference": "DOP Los Pedroches",
              "compliance_requirements": ["origin_verification", "dop_certification", "animal_welfare"],
              "lab_summary": "Análisis de ácidos grasos: 55% ácido oleico. Curación verificada 36+ meses. Trazabilidad individual por crotal."}},
    {"certificate_id": f"{PREFIX}cert_manchego", "certificate_number": "HSP-2026-QSO03", "certificate_type": "origin",
     "product_id": f"{PREFIX}p_manchego_curado", "product_name": "Manchego Curado DOP",
     "seller_id": f"{PREFIX}prod_queso",
     "data": {"origin_country": "España", "lot_code": "QLM-MC-2025-08", "dop_reference": "DOP Queso Manchego",
              "compliance_requirements": ["origin_verification", "raw_milk_certification", "dop_certification"],
              "lab_summary": "Leche cruda de oveja manchega. Maduración 8 meses verificada. Análisis microbiológico conforme."}},
    {"certificate_id": f"{PREFIX}cert_rioja", "certificate_number": "HSP-2026-VIN04", "certificate_type": "origin",
     "product_id": f"{PREFIX}p_rioja_reserva", "product_name": "Rioja Reserva 2020",
     "seller_id": f"{PREFIX}prod_vino",
     "data": {"origin_country": "España", "lot_code": "BSN-RR-2020-06", "dop_reference": "DOCa Rioja",
              "compliance_requirements": ["origin_verification", "doca_certification", "organic_cert"],
              "lab_summary": "Tempranillo 100%. 18 meses barrica roble francés. Análisis enológico completo conforme."}},
    {"certificate_id": f"{PREFIX}cert_parm", "certificate_number": "HSP-2026-PRM05", "certificate_type": "food_safety",
     "product_id": f"{PREFIX}p_parmigiano", "product_name": "Parmigiano Reggiano 24 meses",
     "seller_id": f"{PREFIX}imp_med",
     "data": {"origin_country": "Italia", "lot_code": "MS-IT-2024-22", "dop_reference": "Consorzio Parmigiano Reggiano",
              "compliance_requirements": ["origin_verification", "import_documents", "cold_chain_review"],
              "document_summary": "Factura de origen, certificado DOP, control de temperatura en transporte."}},
]

# ═══════════════════════════════════════════════════════════════
# RECIPES
# ═══════════════════════════════════════════════════════════════

RECIPES = [
    {
        "recipe_id": f"{PREFIX}rec_tostada", "title": "Tostada de jamón ibérico con AOVE y tomate",
        "description": "Desayuno o cena rápida con los mejores ingredientes. 5 minutos, sabor extraordinario.",
        "author_id": f"{PREFIX}inf_laura", "author_name": "Laura García",
        "difficulty": "easy", "time_minutes": 5, "servings": 2,
        "ingredients": [
            {"name": "Pan rústico", "quantity_value": 4, "quantity_unit": "rebanadas"},
            {"name": "Jamón Ibérico de Bellota", "product_id": f"{PREFIX}p_jamon_bellota", "quantity_value": 80, "quantity_unit": "g",
             "suggested_product": {"product_id": f"{PREFIX}p_jamon_bellota", "name": "Jamón Ibérico de Bellota DOP", "price": 24.90, "image": "https://images.unsplash.com/photo-1603048719539-9ecb4aa395e3?w=400"}},
            {"name": "Tomate maduro", "quantity_value": 2, "quantity_unit": "unidades"},
            {"name": "AOVE Picual", "product_id": f"{PREFIX}p_aove_picual", "quantity_value": 2, "quantity_unit": "cucharadas",
             "suggested_product": {"product_id": f"{PREFIX}p_aove_picual", "name": "AOVE Picual Primera Cosecha", "price": 18.90, "image": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400"}},
        ],
        "steps": ["Tostar el pan ligeramente.", "Rallar el tomate sobre las tostadas.", "Disponer lonchas de jamón y aliñar generosamente con AOVE.", "Sal en escama al gusto."],
        "image_url": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&auto=format&fit=crop",
        "tags": ["desayuno", "rápido", "ibérico", "aove"], "likes_count": 156,
    },
    {
        "recipe_id": f"{PREFIX}rec_pasta", "title": "Rigatoni al parmigiano con pimienta negra",
        "description": "Cacio e pepe con producto de verdad. 3 ingredientes, resultado espectacular.",
        "author_id": f"{PREFIX}inf_carlos", "author_name": "Carlos Ruiz",
        "difficulty": "easy", "time_minutes": 18, "servings": 2,
        "ingredients": [
            {"name": "Pasta di Gragnano Rigatoni", "product_id": f"{PREFIX}p_pasta_gragnano", "quantity_value": 200, "quantity_unit": "g",
             "suggested_product": {"product_id": f"{PREFIX}p_pasta_gragnano", "name": "Pasta di Gragnano IGP Rigatoni", "price": 5.90, "image": "https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=400"}},
            {"name": "Parmigiano Reggiano", "product_id": f"{PREFIX}p_parmigiano", "quantity_value": 100, "quantity_unit": "g",
             "suggested_product": {"product_id": f"{PREFIX}p_parmigiano", "name": "Parmigiano Reggiano 24 meses", "price": 12.90, "image": "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400"}},
            {"name": "Pimienta negra", "quantity_value": 1, "quantity_unit": "cucharadita"},
        ],
        "steps": ["Cocer la pasta en abundante agua con sal.", "Rallar el parmigiano finamente.", "Reservar un cazo de agua de cocción.", "Mezclar la pasta escurrida con el queso y el agua poco a poco hasta crear una crema.", "Servir con pimienta recién molida."],
        "image_url": "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=1200&auto=format&fit=crop",
        "tags": ["pasta", "italia", "fácil", "reel-friendly"], "likes_count": 234,
    },
    {
        "recipe_id": f"{PREFIX}rec_tabla", "title": "Tabla de quesos y embutidos ibéricos",
        "description": "La tabla perfecta para compartir. Selección de 3 quesos, 2 embutidos y acompañamientos.",
        "author_id": f"{PREFIX}cust_maria", "author_name": "María López",
        "difficulty": "easy", "time_minutes": 15, "servings": 4,
        "ingredients": [
            {"name": "Manchego Curado DOP", "product_id": f"{PREFIX}p_manchego_curado", "quantity_value": 200, "quantity_unit": "g",
             "suggested_product": {"product_id": f"{PREFIX}p_manchego_curado", "name": "Manchego Curado DOP", "price": 14.90, "image": "https://images.unsplash.com/photo-1552767059-ce182ead6c1b?w=400"}},
            {"name": "Jamón Ibérico de Bellota", "product_id": f"{PREFIX}p_jamon_bellota", "quantity_value": 100, "quantity_unit": "g",
             "suggested_product": {"product_id": f"{PREFIX}p_jamon_bellota", "name": "Jamón Ibérico de Bellota DOP", "price": 24.90, "image": "https://images.unsplash.com/photo-1603048719539-9ecb4aa395e3?w=400"}},
            {"name": "Chorizo Ibérico", "product_id": f"{PREFIX}p_chorizo_iberico", "quantity_value": 100, "quantity_unit": "g",
             "suggested_product": {"product_id": f"{PREFIX}p_chorizo_iberico", "name": "Chorizo Ibérico de Bellota", "price": 12.90, "image": "https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=400"}},
            {"name": "Aceitunas Kalamata", "product_id": f"{PREFIX}p_kalamata", "quantity_value": 150, "quantity_unit": "g"},
            {"name": "Pan crujiente", "quantity_value": 1, "quantity_unit": "barra"},
            {"name": "AOVE para aliñar", "product_id": f"{PREFIX}p_aove_picual", "quantity_value": 3, "quantity_unit": "cucharadas"},
        ],
        "steps": ["Sacar los quesos del frigorífico 30 min antes.", "Cortar el manchego en cuñas y el lomo en lonchas finas.", "Disponer todo en una tabla de madera con las aceitunas.", "Aliñar con un hilo generoso de AOVE.", "Servir con vino tinto."],
        "image_url": "https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&auto=format&fit=crop",
        "tags": ["tabla", "aperitivo", "compartir", "ibérico"], "likes_count": 89,
    },
    {
        "recipe_id": f"{PREFIX}rec_ensalada", "title": "Ensalada mediterránea con queso manchego y AOVE",
        "description": "Ensalada fresca con los sabores del Mediterráneo. Perfecta para días de calor.",
        "author_id": f"{PREFIX}inf_laura", "author_name": "Laura García",
        "difficulty": "easy", "time_minutes": 10, "servings": 2,
        "ingredients": [
            {"name": "Lechuga variada", "quantity_value": 200, "quantity_unit": "g"},
            {"name": "Tomate cherry", "quantity_value": 150, "quantity_unit": "g"},
            {"name": "Manchego Semicurado", "product_id": f"{PREFIX}p_manchego_semi", "quantity_value": 80, "quantity_unit": "g"},
            {"name": "Aceitunas Kalamata", "product_id": f"{PREFIX}p_kalamata", "quantity_value": 50, "quantity_unit": "g"},
            {"name": "AOVE Arbequina", "product_id": f"{PREFIX}p_aove_arbequina", "quantity_value": 3, "quantity_unit": "cucharadas"},
        ],
        "steps": ["Lavar y cortar las verduras.", "Cortar el queso en dados o lascas.", "Montar en un bol y aliñar con AOVE arbequina.", "Terminar con un toque de vinagre de Jerez y sal."],
        "image_url": "https://images.unsplash.com/photo-1547592180-85f173990554?w=1200&auto=format&fit=crop",
        "tags": ["ensalada", "ligero", "verano", "mediterráneo"], "likes_count": 67,
    },
    {
        "recipe_id": f"{PREFIX}rec_maridaje", "title": "Maridaje perfecto: Rioja Reserva con manchego curado",
        "description": "Guía para el maridaje ideal entre nuestro Rioja Reserva y los quesos de La Mancha.",
        "author_id": f"{PREFIX}prod_vino", "author_name": "Bodega Sierra Norte",
        "difficulty": "easy", "time_minutes": 5, "servings": 4,
        "ingredients": [
            {"name": "Rioja Reserva 2020", "product_id": f"{PREFIX}p_rioja_reserva", "quantity_value": 1, "quantity_unit": "botella",
             "suggested_product": {"product_id": f"{PREFIX}p_rioja_reserva", "name": "Rioja Reserva 2020", "price": 22.50, "image": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400"}},
            {"name": "Manchego Curado DOP", "product_id": f"{PREFIX}p_manchego_curado", "quantity_value": 200, "quantity_unit": "g",
             "suggested_product": {"product_id": f"{PREFIX}p_manchego_curado", "name": "Manchego Curado DOP", "price": 14.90, "image": "https://images.unsplash.com/photo-1552767059-ce182ead6c1b?w=400"}},
            {"name": "Membrillo artesano", "quantity_value": 100, "quantity_unit": "g"},
        ],
        "steps": ["Servir el vino a 16-18°C, abrirlo 30 min antes.", "Cortar el manchego en cuñas, con la corteza.", "Acompañar cada cuña de queso con una lámina de membrillo.", "Alternar bocado y sorbo para apreciar cómo se complementan."],
        "image_url": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=1200&auto=format&fit=crop",
        "tags": ["vino", "maridaje", "queso", "rioja"], "likes_count": 112,
    },
]

# ═══════════════════════════════════════════════════════════════
# POSTS (feed social)
# ═══════════════════════════════════════════════════════════════

POSTS = [
    {"post_id": f"{PREFIX}post_oliva1", "user_id": f"{PREFIX}prod_oliva",
     "caption": "Cosecha temprana terminada. Este año el aceite picual tiene un perfil herbáceo extraordinario. Acidez 0.18°, récord de la finca. Ya disponible en nuestra tienda. 🫒",
     "location": "Jaén", "image_url": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=1200&auto=format&fit=crop",
     "likes_count": 89, "comments_count": 12, "tagged_products": [{"product_id": f"{PREFIX}p_aove_picual", "x": 50, "y": 45}], "created_at": ago(2)},

    {"post_id": f"{PREFIX}post_jamon1", "user_id": f"{PREFIX}prod_jamon",
     "caption": "36 meses de curación natural. Cada pieza tiene su historia, su crotal y su trazabilidad completa. Así trabajamos en Dehesa Ibérica.",
     "location": "Azuaga", "image_url": "https://images.unsplash.com/photo-1603048719539-9ecb4aa395e3?w=1200&auto=format&fit=crop",
     "likes_count": 234, "comments_count": 28, "tagged_products": [{"product_id": f"{PREFIX}p_jamon_bellota", "x": 55, "y": 40}], "created_at": ago(1)},

    {"post_id": f"{PREFIX}post_laura1", "user_id": f"{PREFIX}inf_laura",
     "caption": "Desayuno de domingo: tostada con jamón ibérico de @dehesa.iberica y AOVE de @finca.olivares. Esto es lo que pasa cuando usas producto de verdad. Receta en mi perfil.",
     "location": "Barcelona", "image_url": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&auto=format&fit=crop",
     "likes_count": 312, "comments_count": 45, "tagged_products": [{"product_id": f"{PREFIX}p_jamon_bellota", "x": 40, "y": 50}, {"product_id": f"{PREFIX}p_aove_picual", "x": 70, "y": 30}], "created_at": ago(1, 6)},

    {"post_id": f"{PREFIX}post_carlos1", "user_id": f"{PREFIX}inf_carlos",
     "caption": "Rigatoni al parmigiano con pimienta. 3 ingredientes. Pasta de Gragnano + Parmigiano de 24 meses. Simple, auténtico, perfecto. Video completo en reels.",
     "location": "Madrid", "image_url": "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=1200&auto=format&fit=crop",
     "likes_count": 178, "comments_count": 22, "tagged_products": [{"product_id": f"{PREFIX}p_pasta_gragnano", "x": 45, "y": 55}, {"product_id": f"{PREFIX}p_parmigiano", "x": 65, "y": 35}], "created_at": ago(0, 18)},

    {"post_id": f"{PREFIX}post_queso1", "user_id": f"{PREFIX}prod_queso",
     "caption": "Bodega de maduración. Cada queso descansa aquí entre 4 y 12 meses, con volteos manuales semanales. La paciencia es nuestro ingrediente secreto.",
     "location": "Tomelloso", "image_url": "https://images.unsplash.com/photo-1552767059-ce182ead6c1b?w=1200&auto=format&fit=crop",
     "likes_count": 67, "comments_count": 8, "tagged_products": [{"product_id": f"{PREFIX}p_manchego_curado", "x": 50, "y": 50}], "created_at": ago(3)},

    {"post_id": f"{PREFIX}post_vino1", "user_id": f"{PREFIX}prod_vino",
     "caption": "Vendimia 2024 completada. Tempranillo de viñas viejas con rendimiento controlado. En 18 meses tendréis un Reserva excepcional.",
     "location": "Haro, La Rioja", "image_url": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=1200&auto=format&fit=crop",
     "likes_count": 98, "comments_count": 15, "tagged_products": [{"product_id": f"{PREFIX}p_rioja_reserva", "x": 50, "y": 45}], "created_at": ago(5)},

    {"post_id": f"{PREFIX}post_maria1", "user_id": f"{PREFIX}cust_maria",
     "caption": "Mi pedido de esta semana: manchego curado, chorizo ibérico y AOVE picual. Con esto y pan, cena de reyes cada noche. @quesos.lamancha @dehesa.iberica @finca.olivares",
     "location": "Madrid", "image_url": "https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&auto=format&fit=crop",
     "likes_count": 45, "comments_count": 6, "tagged_products": [{"product_id": f"{PREFIX}p_manchego_curado", "x": 30, "y": 50}], "created_at": ago(0, 8)},

    {"post_id": f"{PREFIX}post_med1", "user_id": f"{PREFIX}imp_med",
     "caption": "Nueva partida de Parmigiano Reggiano DOP, directa desde Emilia-Romagna. Documentación de origen y cadena de frío verificadas. Ya disponible.",
     "location": "Valencia", "image_url": "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=1200&auto=format&fit=crop",
     "likes_count": 56, "comments_count": 9, "tagged_products": [{"product_id": f"{PREFIX}p_parmigiano", "x": 50, "y": 45}], "created_at": ago(1, 12)},
]

# ═══════════════════════════════════════════════════════════════
# REELS
# ═══════════════════════════════════════════════════════════════

REELS = [
    {"post_id": f"{PREFIX}reel_laura1", "user_id": f"{PREFIX}inf_laura",
     "caption": "Tostada ibérica en 60 segundos. Pan, tomate, jamón, AOVE. Eso es todo. 🍞🫒",
     "location": "Barcelona", "video_url": "https://res.cloudinary.com/demo/video/upload/v1689798029/samples/sea-turtle.mp4",
     "thumbnail_url": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&auto=format&fit=crop",
     "likes_count": 456, "comments_count": 34, "views_count": 12400,
     "tagged_products": [{"product_id": f"{PREFIX}p_jamon_bellota", "x": 50, "y": 50}], "created_at": ago(1)},

    {"post_id": f"{PREFIX}reel_carlos1", "user_id": f"{PREFIX}inf_carlos",
     "caption": "Cacio e pepe con pasta di Gragnano y Parmigiano de 24 meses. 3 ingredientes, 0 excusas.",
     "location": "Madrid", "video_url": "https://res.cloudinary.com/demo/video/upload/v1689798029/samples/sea-turtle.mp4",
     "thumbnail_url": "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=1200&auto=format&fit=crop",
     "likes_count": 678, "comments_count": 52, "views_count": 18900,
     "tagged_products": [{"product_id": f"{PREFIX}p_pasta_gragnano", "x": 45, "y": 55}, {"product_id": f"{PREFIX}p_parmigiano", "x": 65, "y": 35}], "created_at": ago(0, 20)},

    {"post_id": f"{PREFIX}reel_oliva1", "user_id": f"{PREFIX}prod_oliva",
     "caption": "Del olivo a la botella en menos de 4 horas. Así garantizamos una acidez inferior a 0.2°. 🫒",
     "location": "Jaén", "video_url": "https://res.cloudinary.com/demo/video/upload/v1689798029/samples/sea-turtle.mp4",
     "thumbnail_url": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=1200&auto=format&fit=crop",
     "likes_count": 189, "comments_count": 14, "views_count": 5600,
     "tagged_products": [{"product_id": f"{PREFIX}p_aove_picual", "x": 50, "y": 45}], "created_at": ago(2)},

    {"post_id": f"{PREFIX}reel_jamon1", "user_id": f"{PREFIX}prod_jamon",
     "caption": "Cortando jamón ibérico de bellota. 36 meses de espera para este momento. Cada loncha, una obra de arte.",
     "location": "Azuaga", "video_url": "https://res.cloudinary.com/demo/video/upload/v1689798029/samples/sea-turtle.mp4",
     "thumbnail_url": "https://images.unsplash.com/photo-1603048719539-9ecb4aa395e3?w=1200&auto=format&fit=crop",
     "likes_count": 345, "comments_count": 29, "views_count": 9800,
     "tagged_products": [{"product_id": f"{PREFIX}p_jamon_bellota", "x": 50, "y": 50}], "created_at": ago(3)},
]

# ═══════════════════════════════════════════════════════════════
# STORIES
# ═══════════════════════════════════════════════════════════════

STORIES = [
    {"story_id": f"{PREFIX}story_laura1", "user_id": f"{PREFIX}inf_laura",
     "caption": "Preparando la receta de mañana... pista: lleva manchego 🧀", "location": "Barcelona",
     "image_url": "https://images.unsplash.com/photo-1552767059-ce182ead6c1b?w=1200&auto=format&fit=crop"},
    {"story_id": f"{PREFIX}story_carlos1", "user_id": f"{PREFIX}inf_carlos",
     "caption": "En la bodega probando el Reserva 2020 🍷", "location": "Haro",
     "image_url": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=1200&auto=format&fit=crop"},
    {"story_id": f"{PREFIX}story_oliva1", "user_id": f"{PREFIX}prod_oliva",
     "caption": "Última prensada del día. Color verde intenso.", "location": "Jaén",
     "image_url": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=1200&auto=format&fit=crop"},
    {"story_id": f"{PREFIX}story_jamon1", "user_id": f"{PREFIX}prod_jamon",
     "caption": "Revisión de secaderos. Temperatura y humedad perfectas.", "location": "Azuaga",
     "image_url": "https://images.unsplash.com/photo-1603048719539-9ecb4aa395e3?w=1200&auto=format&fit=crop"},
    {"story_id": f"{PREFIX}story_queso1", "user_id": f"{PREFIX}prod_queso",
     "caption": "Volteo manual de quesos. Cada uno recibe atención individual.", "location": "Tomelloso",
     "image_url": "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=1200&auto=format&fit=crop"},
    {"story_id": f"{PREFIX}story_maria1", "user_id": f"{PREFIX}cust_maria",
     "caption": "Mi pedido acaba de llegar 📦 Todo perfecto!", "location": "Madrid",
     "image_url": "https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&auto=format&fit=crop"},
]

# ═══════════════════════════════════════════════════════════════
# COMMUNITIES
# ═══════════════════════════════════════════════════════════════

COMMUNITIES = [
    {
        "name": "Amantes del AOVE", "slug": "amantes-aove",
        "description": "Comunidad para amantes del aceite de oliva virgen extra. Catas, variedades, maridajes y productores.",
        "emoji": "🫒", "category": "Alimentación", "tags": ["aove", "aceite", "cata"],
        "cover_image": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=1200&auto=format&fit=crop",
        "creator_id": f"{PREFIX}prod_oliva", "creator_username": "finca.olivares",
        "member_count": 234, "post_count": 45,
    },
    {
        "name": "Recetas Fáciles", "slug": "recetas-faciles",
        "description": "Recetas sencillas con ingredientes de calidad. Cocina del día a día sin complicaciones.",
        "emoji": "👩‍🍳", "category": "Recetas", "tags": ["recetas", "fácil", "cocina"],
        "cover_image": "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1200&auto=format&fit=crop",
        "creator_id": f"{PREFIX}inf_laura", "creator_username": "laura.foodie",
        "member_count": 567, "post_count": 89,
    },
    {
        "name": "Productores de España", "slug": "productores-espana",
        "description": "Red de productores artesanales españoles. Intercambio de experiencias, ferias y colaboraciones.",
        "emoji": "🇪🇸", "category": "Productores", "tags": ["productores", "artesanal", "españa"],
        "cover_image": "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=1200&auto=format&fit=crop",
        "creator_id": f"{PREFIX}prod_jamon", "creator_username": "dehesa.iberica",
        "member_count": 189, "post_count": 34,
    },
    {
        "name": "Vinos con Historia", "slug": "vinos-historia",
        "description": "Para los que disfrutan del vino con conocimiento. Bodegas, añadas, catas y maridajes.",
        "emoji": "🍷", "category": "Alimentación", "tags": ["vino", "cata", "bodega"],
        "cover_image": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=1200&auto=format&fit=crop",
        "creator_id": f"{PREFIX}prod_vino", "creator_username": "bodega.sierranorte",
        "member_count": 312, "post_count": 56,
    },
]

COMMUNITY_POSTS = [
    {"community_slug": "amantes-aove", "author_id": f"{PREFIX}prod_oliva", "username": "finca.olivares",
     "text": "¿Cuál es vuestra variedad preferida? Picual, arbequina, hojiblanca... cada una tiene su personalidad.", "likes_count": 23, "comments_count": 15},
    {"community_slug": "amantes-aove", "author_id": f"{PREFIX}cust_pablo", "username": "pablo.garcia",
     "text": "Acabo de probar el picual de @finca.olivares y es una locura. Ese amargor elegante con el final picante... 🔥🫒", "likes_count": 34, "comments_count": 8},
    {"community_slug": "recetas-faciles", "author_id": f"{PREFIX}inf_laura", "username": "laura.foodie",
     "text": "Nueva receta: tostada ibérica en 5 minutos. Pan, tomate, jamón y AOVE. Simplicidad al poder.", "likes_count": 56, "comments_count": 12},
    {"community_slug": "recetas-faciles", "author_id": f"{PREFIX}cust_maria", "username": "maria.lopez",
     "text": "Hice la tabla de quesos y embutidos de @laura.foodie para una cena con amigos. ¡Éxito total! El manchego curado con membrillo es otro nivel.", "likes_count": 28, "comments_count": 6},
    {"community_slug": "productores-espana", "author_id": f"{PREFIX}prod_jamon", "username": "dehesa.iberica",
     "text": "Este año la montanera ha sido excepcional. Bellota abundante y cerdos en plena forma. Los jamones de 2024 van a ser memorables.", "likes_count": 45, "comments_count": 11},
    {"community_slug": "vinos-historia", "author_id": f"{PREFIX}prod_vino", "username": "bodega.sierranorte",
     "text": "Abrimos la primera barrica del Reserva 2020. Aromas de frutos negros con fondo de vainilla. Se presenta un gran vino.", "likes_count": 67, "comments_count": 19},
]

# ═══════════════════════════════════════════════════════════════
# CHATS (conversaciones internas con mensajes)
# ═══════════════════════════════════════════════════════════════

def user_by_id(uid: str):
    for u in USERS:
        if u["user_id"] == uid:
            return u
    return None

CONVERSATIONS = [
    {
        "conversation_id": f"{PREFIX}conv_1",
        "participants": [f"{PREFIX}cust_maria", f"{PREFIX}prod_oliva"],
        "messages": [
            {"sender": f"{PREFIX}cust_maria", "content": "¡Hola! Acabo de ver vuestro AOVE Picual. ¿Tenéis disponibilidad para envío a Madrid esta semana?", "ago_hours": 48},
            {"sender": f"{PREFIX}prod_oliva", "content": "¡Hola María! Sí, tenemos stock disponible. Los envíos a Madrid llegan en 24-48h. ¿Cuántas unidades necesitas?", "ago_hours": 47},
            {"sender": f"{PREFIX}cust_maria", "content": "Perfecto, me llevo 2 botellas del Picual y 1 del Arbequina. ¿El envío es gratuito?", "ago_hours": 46},
            {"sender": f"{PREFIX}prod_oliva", "content": "Envío gratuito a partir de 30€, así que con ese pedido (49,30€) te sale gratis. Te recomiendo la Arbequina para ensaladas, es espectacular. 🫒", "ago_hours": 45},
            {"sender": f"{PREFIX}cust_maria", "content": "¡Genial! Hago el pedido ahora mismo. ¡Muchas gracias!", "ago_hours": 44},
        ],
    },
    {
        "conversation_id": f"{PREFIX}conv_2",
        "participants": [f"{PREFIX}inf_laura", f"{PREFIX}prod_jamon"],
        "messages": [
            {"sender": f"{PREFIX}inf_laura", "content": "Hola, soy Laura (@laura.foodie). Me encantaría hacer una colaboración con vuestro jamón ibérico. Tengo 48K seguidores en IG centrados en gastronomía.", "ago_hours": 72},
            {"sender": f"{PREFIX}prod_jamon", "content": "¡Hola Laura! Nos encanta tu contenido, lo seguimos. Estaríamos encantados de colaborar. ¿Qué tienes en mente?", "ago_hours": 70},
            {"sender": f"{PREFIX}inf_laura", "content": "Me gustaría hacer una serie de 3 reels: unboxing, receta con el jamón, y maridaje con queso. ¿Os enviaríais producto para la grabación?", "ago_hours": 68},
            {"sender": f"{PREFIX}prod_jamon", "content": "Perfecto. Te enviamos un sobre de jamón de bellota y uno de lomo ibérico. ¿Te va bien con código de descuento para tu audiencia?", "ago_hours": 66},
            {"sender": f"{PREFIX}inf_laura", "content": "¡Sí! Un código LAURA15 con 15% de descuento sería ideal. Empiezo a grabar la semana que viene. Os paso el contenido antes de publicar.", "ago_hours": 64},
            {"sender": f"{PREFIX}prod_jamon", "content": "Hecho. Te preparamos el envío mañana. Código LAURA15 activo. ¡Estamos deseando ver el resultado! 🎬", "ago_hours": 62},
        ],
    },
    {
        "conversation_id": f"{PREFIX}conv_3",
        "participants": [f"{PREFIX}prod_vino", f"{PREFIX}imp_med"],
        "messages": [
            {"sender": f"{PREFIX}imp_med", "content": "Buenas tardes. Somos Mediterranean Select, importadores gourmet en Valencia. Nos interesa vuestro Rioja Reserva para incluirlo en nuestra selección.", "ago_hours": 96},
            {"sender": f"{PREFIX}prod_vino", "content": "Hola, encantados. Nuestro Reserva 2020 tiene muy buena acogida. ¿Qué volumen tenéis en mente?", "ago_hours": 94},
            {"sender": f"{PREFIX}imp_med", "content": "Empezaríamos con 120 botellas para tantear demanda. ¿Tenéis precio para B2B y disponibilidad?", "ago_hours": 92},
            {"sender": f"{PREFIX}prod_vino", "content": "Para ese volumen podemos ofrecer 14,50€/botella (PVP 22,50€). Stock disponible. ¿Necesitáis documentación de DOCa para vuestros clientes?", "ago_hours": 90},
            {"sender": f"{PREFIX}imp_med", "content": "Sí, necesitamos el certificado DOCa y la ficha técnica del vino. También la factura con desglose de IVA para nuestra contabilidad.", "ago_hours": 88},
            {"sender": f"{PREFIX}prod_vino", "content": "Todo listo. Os envío la documentación por aquí y formalizamos por la plataforma B2B. ¡Bienvenidos! 🍷", "ago_hours": 86},
        ],
    },
]

# ═══════════════════════════════════════════════════════════════
# REVIEWS
# ═══════════════════════════════════════════════════════════════

REVIEWS = [
    {"product_id": f"{PREFIX}p_aove_picual", "user_id": f"{PREFIX}cust_maria", "user_name": "María López", "rating": 5, "title": "El mejor AOVE que he probado", "comment": "Sabor intenso, herbáceo, con un final picante que demuestra calidad. Uso una botella a la semana."},
    {"product_id": f"{PREFIX}p_aove_picual", "user_id": f"{PREFIX}cust_pablo", "user_name": "Pablo García", "rating": 5, "title": "Excepcional", "comment": "Se nota que es cosecha temprana. El color verde y el aroma son impresionantes. Ya he repetido 3 veces."},
    {"product_id": f"{PREFIX}p_jamon_bellota", "user_id": f"{PREFIX}cust_maria", "user_name": "María López", "rating": 5, "title": "Jamón de otro nivel", "comment": "La grasa infiltrada se funde en la boca. 36 meses de curación se notan en cada loncha. No tiene comparación."},
    {"product_id": f"{PREFIX}p_jamon_bellota", "user_id": f"{PREFIX}cust_ana", "user_name": "Ana Martínez", "rating": 5, "title": "Cortado a la perfección", "comment": "Las lonchas finas cortadas a cuchillo marcan la diferencia. Sabor intenso sin ser salado. Volveré a comprarlo."},
    {"product_id": f"{PREFIX}p_manchego_curado", "user_id": f"{PREFIX}cust_pablo", "user_name": "Pablo García", "rating": 5, "title": "Manchego auténtico", "comment": "Se nota que es leche cruda de oveja. Los cristales de curación le dan una textura increíble. Con membrillo es perfecto."},
    {"product_id": f"{PREFIX}p_rioja_reserva", "user_id": f"{PREFIX}cust_maria", "user_name": "María López", "rating": 5, "title": "Reserva elegante", "comment": "Vino con carácter y estructura. Perfecto para carnes y quesos curados. Muy buena relación calidad-precio."},
    {"product_id": f"{PREFIX}p_parmigiano", "user_id": f"{PREFIX}cust_ana", "user_name": "Ana Martínez", "rating": 5, "title": "Auténtico parmigiano", "comment": "La textura granulosa, el sabor umami... Se nota que son 24 meses reales. Ideal rallado sobre pasta."},
    {"product_id": f"{PREFIX}p_pasta_gragnano", "user_id": f"{PREFIX}inf_carlos", "user_name": "Carlos Ruiz", "rating": 5, "title": "Pasta de verdad", "comment": "La trafilatura al bronzo se nota: atrapa la salsa como ninguna otra pasta. Secado lento = textura perfecta."},
]

# ═══════════════════════════════════════════════════════════════
# FOLLOWS
# ═══════════════════════════════════════════════════════════════

FOLLOWS = [
    # Clientes siguen a productores e influencers
    (f"{PREFIX}cust_maria", f"{PREFIX}prod_oliva"), (f"{PREFIX}cust_maria", f"{PREFIX}prod_jamon"),
    (f"{PREFIX}cust_maria", f"{PREFIX}prod_queso"), (f"{PREFIX}cust_maria", f"{PREFIX}prod_vino"),
    (f"{PREFIX}cust_maria", f"{PREFIX}inf_laura"), (f"{PREFIX}cust_maria", f"{PREFIX}inf_carlos"),
    (f"{PREFIX}cust_pablo", f"{PREFIX}prod_oliva"), (f"{PREFIX}cust_pablo", f"{PREFIX}prod_jamon"),
    (f"{PREFIX}cust_pablo", f"{PREFIX}inf_laura"), (f"{PREFIX}cust_pablo", f"{PREFIX}imp_med"),
    (f"{PREFIX}cust_ana", f"{PREFIX}prod_jamon"), (f"{PREFIX}cust_ana", f"{PREFIX}prod_queso"),
    (f"{PREFIX}cust_ana", f"{PREFIX}inf_carlos"),
    # Influencers siguen a productores
    (f"{PREFIX}inf_laura", f"{PREFIX}prod_oliva"), (f"{PREFIX}inf_laura", f"{PREFIX}prod_jamon"),
    (f"{PREFIX}inf_laura", f"{PREFIX}prod_queso"), (f"{PREFIX}inf_laura", f"{PREFIX}imp_med"),
    (f"{PREFIX}inf_carlos", f"{PREFIX}prod_vino"), (f"{PREFIX}inf_carlos", f"{PREFIX}imp_med"),
    (f"{PREFIX}inf_carlos", f"{PREFIX}prod_oliva"),
    # Productores entre sí
    (f"{PREFIX}prod_oliva", f"{PREFIX}prod_jamon"), (f"{PREFIX}prod_jamon", f"{PREFIX}prod_oliva"),
    (f"{PREFIX}prod_queso", f"{PREFIX}prod_oliva"), (f"{PREFIX}prod_vino", f"{PREFIX}prod_jamon"),
    # Importador sigue productores
    (f"{PREFIX}imp_med", f"{PREFIX}prod_oliva"), (f"{PREFIX}imp_med", f"{PREFIX}prod_vino"),
]

STORE_FOLLOWS = [
    (f"{PREFIX}cust_maria", f"{PREFIX}store_oliva"), (f"{PREFIX}cust_maria", f"{PREFIX}store_jamon"),
    (f"{PREFIX}cust_maria", f"{PREFIX}store_queso"), (f"{PREFIX}cust_pablo", f"{PREFIX}store_oliva"),
    (f"{PREFIX}cust_pablo", f"{PREFIX}store_jamon"), (f"{PREFIX}cust_ana", f"{PREFIX}store_jamon"),
    (f"{PREFIX}cust_ana", f"{PREFIX}store_queso"), (f"{PREFIX}inf_laura", f"{PREFIX}store_oliva"),
    (f"{PREFIX}inf_laura", f"{PREFIX}store_jamon"), (f"{PREFIX}inf_carlos", f"{PREFIX}store_vino"),
]


# ═══════════════════════════════════════════════════════════════
# SEED FUNCTIONS
# ═══════════════════════════════════════════════════════════════

async def seed():
    client = AsyncIOMotorClient(MONGO_URL)
    db_obj = client.get_default_database()
    print("Conectado a MongoDB. Iniciando seed demo...")

    # ── Users ──
    for u in USERS:
        doc = {
            **u, "password_hash": HASHED,
            "avatar_url": u.get("profile_image"),
            "email_verified": True, "approved": True, "onboarding_completed": True,
            "is_active": True, "account_status": "active",
            "followers_count": 0, "following_count": 0, "posts_count": 0,
            "created_at": ago(30), "updated_at": now_iso(),
        }
        await db_obj.users.update_one({"user_id": u["user_id"]}, {"$set": doc}, upsert=True)
    print(f"  [OK] {len(USERS)} usuarios creados")

    # ── Categories ──
    for c in CATEGORIES:
        existing = await db_obj.categories.find_one({"slug": c["slug"]})
        if existing:
            c["category_id"] = existing.get("category_id", c["category_id"])
        await db_obj.categories.update_one({"slug": c["slug"]}, {"$set": {**c, "created_at": ago(60), "updated_at": now_iso()}}, upsert=True)
    print(f"  [OK] {len(CATEGORIES)} categorías")

    # ── Stores ──
    for s in STORES:
        await db_obj.store_profiles.update_one({"store_id": s["store_id"]}, {"$set": {**s, "created_at": ago(60), "updated_at": now_iso()}}, upsert=True)
    print(f"  [OK] {len(STORES)} tiendas")

    # ── Products ──
    for p in PRODUCTS:
        doc = {**p, "image_urls": p.get("images", []), "created_at": ago(15), "updated_at": now_iso()}
        await db_obj.products.update_one({"product_id": p["product_id"]}, {"$set": doc}, upsert=True)
    print(f"  [OK] {len(PRODUCTS)} productos")

    # ── Certificates ──
    for cert in CERTIFICATES:
        doc = {
            **cert, "qr_url": f"https://hispaloshop.com/certificate/{cert['product_id']}",
            "qr_code": "", "approved": True, "status": "approved", "source_language": "es",
            "issue_date": ago(30), "expiry_date": future_days(365), "created_at": ago(30),
        }
        await db_obj.certificates.update_one({"certificate_id": cert["certificate_id"]}, {"$set": doc}, upsert=True)
        await db_obj.products.update_one({"product_id": cert["product_id"]}, {"$set": {"certificate_id": cert["certificate_id"]}})
    print(f"  [OK] {len(CERTIFICATES)} certificados")

    # ── Recipes ──
    for r in RECIPES:
        doc = {**r, "status": "active", "created_at": r.get("created_at") or ago(7)}
        await db_obj.recipes.update_one({"recipe_id": r["recipe_id"]}, {"$set": doc}, upsert=True)
    print(f"  [OK] {len(RECIPES)} recetas")

    # ── Posts ──
    for p in POSTS:
        u = user_by_id(p["user_id"])
        doc = {
            **p, "user_name": u["name"], "user_profile_image": u.get("profile_image", ""),
            "type": "post", "post_type": "post", "media_type": "image",
            "media": media(p["image_url"]), "status": "published",
            "tagged_product": (p.get("tagged_products") or [{}])[0].get("product_id"),
            "is_reel": False, "shares_count": 0, "views_count": 0,
        }
        await db_obj.user_posts.update_one({"post_id": p["post_id"]}, {"$set": doc}, upsert=True)
    print(f"  [OK] {len(POSTS)} posts")

    # ── Reels ──
    for r in REELS:
        u = user_by_id(r["user_id"])
        doc = {
            **r, "user_name": u["name"], "user_profile_image": u.get("profile_image", ""),
            "type": "reel", "post_type": "reel", "media_type": "video",
            "media": media(r["video_url"], "video", "9:16"),
            "image_url": r["thumbnail_url"], "status": "published",
            "tagged_product": (r.get("tagged_products") or [{}])[0].get("product_id"),
            "is_reel": True, "shares_count": 0,
        }
        await db_obj.user_posts.update_one({"post_id": r["post_id"]}, {"$set": doc}, upsert=True)
    print(f"  [OK] {len(REELS)} reels")

    # ── Stories ──
    for s in STORIES:
        u = user_by_id(s["user_id"])
        doc = {
            **s, "user_name": u["name"], "user_profile_image": u.get("profile_image", ""),
            "views": [], "created_at": now_iso(), "expires_at": future(23),
        }
        await db_obj.hispalostories.update_one({"story_id": s["story_id"]}, {"$set": doc}, upsert=True)
    print(f"  [OK] {len(STORIES)} stories")

    # ── Communities ──
    for comm in COMMUNITIES:
        doc = {**comm, "is_active": True, "created_at": ago(45)}
        result = await db_obj.communities.update_one({"slug": comm["slug"]}, {"$set": doc}, upsert=True)
        # Get community _id
        community_doc = await db_obj.communities.find_one({"slug": comm["slug"]})
        community_id = str(community_doc["_id"])

        # Add creator as admin member
        member = {
            "community_id": community_id, "user_id": comm["creator_id"],
            "username": comm["creator_username"], "is_admin": True, "is_seller": False,
            "joined_at": ago(45),
        }
        await db_obj.community_members.update_one(
            {"community_id": community_id, "user_id": comm["creator_id"]},
            {"$set": member}, upsert=True
        )

        # Add some regular members
        for uid_member in [f"{PREFIX}cust_maria", f"{PREFIX}cust_pablo", f"{PREFIX}inf_laura"]:
            u_m = user_by_id(uid_member)
            if u_m and uid_member != comm["creator_id"]:
                await db_obj.community_members.update_one(
                    {"community_id": community_id, "user_id": uid_member},
                    {"$set": {"community_id": community_id, "user_id": uid_member,
                              "username": u_m["username"], "is_admin": False, "is_seller": False,
                              "joined_at": ago(20)}},
                    upsert=True
                )

    # Community posts
    for cp in COMMUNITY_POSTS:
        community_doc = await db_obj.communities.find_one({"slug": cp["community_slug"]})
        if community_doc:
            post_doc = {
                "post_id": uid(), "community_id": str(community_doc["_id"]),
                "author_id": cp["author_id"], "username": cp["username"],
                "text": cp["text"], "image_url": "",
                "likes_count": cp["likes_count"], "comments_count": cp["comments_count"],
                "created_at": ago(5),
            }
            await db_obj.community_posts.insert_one(post_doc)
    print(f"  [OK] {len(COMMUNITIES)} comunidades con posts y miembros")

    # ── Chats ──
    for conv in CONVERSATIONS:
        participants = []
        for pid in conv["participants"]:
            u = user_by_id(pid)
            participants.append({"user_id": pid, "name": u["name"], "role": u["role"], "avatar": u.get("profile_image", "")})

        conv_doc = {
            "conversation_id": conv["conversation_id"],
            "participants": participants, "status": "active",
            "created_at": ago(5), "updated_at": now_iso(),
        }
        await db_obj.internal_conversations.update_one(
            {"conversation_id": conv["conversation_id"]}, {"$set": conv_doc}, upsert=True
        )

        # Delete existing messages for this conv (to avoid duplicates on re-run)
        await db_obj.internal_messages.delete_many({"conversation_id": conv["conversation_id"]})

        for msg in conv["messages"]:
            sender = user_by_id(msg["sender"])
            msg_doc = {
                "message_id": uid(), "conversation_id": conv["conversation_id"],
                "sender_id": msg["sender"], "sender_name": sender["name"],
                "sender_role": sender["role"],
                "content": msg["content"],  # No encryption for demo
                "status": "read", "created_at": ago(0, msg["ago_hours"]),
            }
            await db_obj.internal_messages.insert_one(msg_doc)
    print(f"  [OK] {len(CONVERSATIONS)} conversaciones con mensajes")

    # ── Reviews ──
    for r in REVIEWS:
        doc = {
            "review_id": uid(), **r,
            "verified_purchase": True, "approved": True, "hidden": False,
            "created_at": ago(10),
        }
        await db_obj.reviews.update_one(
            {"product_id": r["product_id"], "user_id": r["user_id"]},
            {"$set": doc}, upsert=True
        )
    print(f"  [OK] {len(REVIEWS)} reviews")

    # ── Follows (user-to-user) ──
    for follower, following in FOLLOWS:
        await db_obj.user_follows.update_one(
            {"follower_id": follower, "following_id": following},
            {"$set": {"created_at": ago(20)}}, upsert=True
        )

    # ── Store follows ──
    for user_id, store_id in STORE_FOLLOWS:
        store = next((s for s in STORES if s["store_id"] == store_id), None)
        if store:
            await db_obj.store_followers.update_one(
                {"user_id": user_id, "store_id": store_id},
                {"$set": {"follower_id": uid(), "user_id": user_id, "store_id": store_id,
                          "store_slug": store["slug"], "store_name": store["name"],
                          "notify_email": True, "created_at": ago(15)}},
                upsert=True
            )
    print(f"  [OK] {len(FOLLOWS)} follows de usuarios + {len(STORE_FOLLOWS)} follows de tiendas")

    # ── Refresh counters ──
    for u in USERS:
        followers = await db_obj.user_follows.count_documents({"following_id": u["user_id"]})
        following = await db_obj.user_follows.count_documents({"follower_id": u["user_id"]})
        posts = await db_obj.user_posts.count_documents({"user_id": u["user_id"]})
        await db_obj.users.update_one(
            {"user_id": u["user_id"]},
            {"$set": {"followers_count": followers, "following_count": following, "posts_count": posts}}
        )
    print("  [OK] Contadores actualizados")

    # ── Post comments (for engagement) ──
    sample_comments = [
        "¡Increíble producto! Lo compré la semana pasada 🔥",
        "¿Hacéis envío a Canarias?",
        "Mi madre estaría orgullosa de este plato 😍",
        "¿Cuál es la fecha de caducidad?",
        "Lo mejor que he probado en mucho tiempo",
        "Ya lo tengo en el carrito! 🛒",
        "¿Tenéis versión ecológica?",
        "Esto merece más visibilidad, compartido!",
    ]
    comment_users = [f"{PREFIX}cust_maria", f"{PREFIX}cust_pablo", f"{PREFIX}cust_ana", f"{PREFIX}inf_laura"]
    for post in POSTS[:4]:
        for i, comment_text in enumerate(sample_comments[:3]):
            cu = user_by_id(comment_users[i % len(comment_users)])
            await db_obj.post_comments.insert_one({
                "comment_id": uid(), "post_id": post["post_id"],
                "user_id": cu["user_id"], "user_name": cu["name"],
                "text": comment_text, "created_at": ago(0, i + 2),
            })
    print("  [OK] Comentarios de ejemplo en posts")

    client.close()

    # ── Print credentials ──
    print("\n" + "=" * 55)
    print("  SEED DEMO COMPLETADO")
    print("=" * 55)
    print(f"\n  Password universal: {PASSWORD}\n")
    print("  Cuentas disponibles:")
    print("  " + "-" * 43)
    for u in USERS:
        role_label = {"producer": "Productor", "importer": "Importador",
                      "influencer": "Influencer", "customer": "Cliente"}.get(u["role"], u["role"])
        print(f"  {role_label:20s}  {u['email']}")
    print("  " + "-" * 43)
    print(f"\n  Total: {len(PRODUCTS)} productos, {len(STORES)} tiendas, {len(POSTS)} posts,")
    print(f"         {len(REELS)} reels, {len(STORIES)} stories, {len(RECIPES)} recetas,")
    print(f"         {len(COMMUNITIES)} comunidades, {len(CONVERSATIONS)} chats,")
    print(f"         {len(CERTIFICATES)} certificados, {len(REVIEWS)} reviews\n")


if __name__ == "__main__":
    asyncio.run(seed())
