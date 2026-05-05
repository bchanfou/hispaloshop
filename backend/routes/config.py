"""
Config, Locale, Categories, Regions, Exchange Rates routes.
"""
import hashlib
import httpx
from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid
import logging

from core.database import db
from core.models import (
    User, CategoryInput, LocaleUpdateInput, Address,
    ShippingAddress, UserAddressInput,
)
from core.constants import SUPPORTED_COUNTRIES, SUPPORTED_LANGUAGES, SUPPORTED_CURRENCIES
from core.auth import get_current_user, require_role
from config import get_plans_config as _get_plans_config

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/config/plans")
async def get_plans():
    """Public endpoint — single source of truth for plan pricing and commission rates."""
    return await _get_plans_config(db=db)


# ── Categories ───────────────────────────────────────────────

@router.get("/categories")
async def get_categories():
    categories = await db.categories.find({}, {"_id": 0}).sort("sort_order", 1).to_list(200)
    return categories

@router.get("/categories/tree")
async def get_categories_tree(lang: str = "en"):
    """Get categories as nested tree with translations."""
    all_cats = await db.categories.find({"is_active": True}, {"_id": 0}).sort("sort_order", 1).to_list(200)
    
    # Build tree
    main = [c for c in all_cats if c.get("level") == 1 or c.get("parent_id") is None]
    for cat in main:
        names = cat.get("name_i18n", {})
        cat["display_name"] = names.get(lang, names.get("en", cat.get("name", "")))
        cat["children"] = []
        for sub in all_cats:
            if sub.get("parent_id") == cat.get("category_id"):
                sub_names = sub.get("name_i18n", {})
                sub["display_name"] = sub_names.get(lang, sub_names.get("en", sub.get("name", "")))
                sub["children"] = [s for s in all_cats if s.get("parent_id") == sub.get("category_id")]
                cat["children"].append(sub)
    
    return main


@router.post("/categories")
async def create_category(input: CategoryInput, user: User = Depends(get_current_user)):
    await require_role(user, ["admin"])
    category_id = f"cat_{uuid.uuid4().hex[:8]}"
    slug = input.name.lower().replace(' ', '-')
    category = {
        "category_id": category_id,
        "name": input.name,
        "slug": slug,
        "description": input.description,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.categories.insert_one(category)
    category.pop("_id", None)  # Remove MongoDB ObjectId before returning
    return category


@router.put("/categories/{category_id}")
async def update_category(category_id: str, input: CategoryInput, user: User = Depends(get_current_user)):
    await require_role(user, ["admin"])
    await db.categories.update_one(
        {"category_id": category_id},
        {"$set": {"name": input.name, "description": input.description, "slug": input.name.lower().replace(' ', '-')}}
    )
    return {"message": "Category updated"}


@router.delete("/categories/{category_id}")
async def delete_category(category_id: str, user: User = Depends(get_current_user)):
    await require_role(user, ["admin"])
    await db.categories.delete_one({"category_id": category_id})
    return {"message": "Category deleted"}


# ── Locale & Configuration ───────────────────────────────────

# ═══════════════════════════════════════════════════════════════════════════
# IP geo-detection — used by consumer onboarding (1.1) to pre-fill country
# ───────────────────────────────────────────────────────────────────────────
# Provider: ipapi.co (1000 req/day free, HTTPS).
# Cache: db.ip_geo_cache with TTL 24h to protect the free quota.
# Graceful degradation: any failure → {country: null, city: null, source: "fallback"}.
#   Frontend detects country: null and shows the country dropdown without pre-selection.
# Privacy: IPs are stored as SHA-256 hashes (cache key), never logged in cleartext.
# V2 upgrade path: if we ever put Cloudflare in front of the backend,
#   request.headers.get("CF-IPCountry") is instant + unlimited + free —
#   replace the ipapi.co call with that header read.
# ═══════════════════════════════════════════════════════════════════════════
def _client_ip(request: Request) -> str:
    """Extract the client IP, honoring X-Forwarded-For (Railway sets this)."""
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else ""


def _hash_ip(ip: str) -> str:
    """Return a SHA-256 hex digest of the IP — stable cache key, no cleartext IP stored."""
    return hashlib.sha256(ip.encode("utf-8")).hexdigest()


@router.get("/config/geo")
async def get_client_geo(request: Request):
    """
    Best-effort IP geo-location. Returns country + city when available.
    Never raises — on any failure returns {"country": null, "city": null, "source": "fallback"}.
    """
    ip = _client_ip(request)
    if not ip:
        return {"country": None, "city": None, "source": "fallback"}

    # Localhost / private ranges → no geo possible
    if ip in ("127.0.0.1", "::1") or ip.startswith(("10.", "172.16.", "192.168.")):
        return {"country": None, "city": None, "source": "localhost"}

    ip_key = _hash_ip(ip)
    now = datetime.now(timezone.utc)

    # Cache lookup (24h TTL)
    try:
        cached = await db.ip_geo_cache.find_one({"ip_hash": ip_key}, {"_id": 0})
        if cached:
            cached_at = cached.get("cached_at")
            if isinstance(cached_at, str):
                cached_at = datetime.fromisoformat(cached_at)
            if cached_at and cached_at.tzinfo is None:
                cached_at = cached_at.replace(tzinfo=timezone.utc)
            if cached_at and (now - cached_at).total_seconds() < 86400:
                return {
                    "country": cached.get("country"),
                    "city": cached.get("city"),
                    "source": "cache",
                }
    except Exception as exc:
        logger.debug("[GEO] cache lookup failed (non-fatal): %s", exc)

    # Cache miss → query ipapi.co
    country: Optional[str] = None
    city: Optional[str] = None
    try:
        async with httpx.AsyncClient(timeout=3.0) as http:
            resp = await http.get(f"https://ipapi.co/{ip}/json/")
        if resp.status_code == 200:
            data = resp.json()
            raw_country = (data.get("country_code") or "").strip().upper() or None
            raw_city = (data.get("city") or "").strip() or None
            # ipapi.co returns error envelopes with 200 status sometimes
            if not data.get("error"):
                country = raw_country
                city = raw_city
        elif resp.status_code == 429:
            logger.warning("[GEO] ipapi.co rate limit reached, falling back")
        else:
            logger.info("[GEO] ipapi.co returned status=%d, falling back", resp.status_code)
    except Exception as exc:
        # Network error, timeout, DNS — graceful fallback
        logger.info("[GEO] ipapi.co unreachable (%s), falling back", type(exc).__name__)

    # Cache the result (even nulls — avoids hammering on repeat misses)
    try:
        await db.ip_geo_cache.update_one(
            {"ip_hash": ip_key},
            {
                "$set": {
                    "ip_hash": ip_key,
                    "country": country,
                    "city": city,
                    "cached_at": now,
                }
            },
            upsert=True,
        )
    except Exception as exc:
        logger.debug("[GEO] cache write failed (non-fatal): %s", exc)

    logger.info("[GEO] ipapi.co resolved country=%s", country or "none")
    return {
        "country": country,
        "city": city,
        "source": "ipapi" if country else "fallback",
    }


@router.get("/config/countries")
async def get_countries():
    return SUPPORTED_COUNTRIES


@router.get("/config/languages")
async def get_languages():
    return SUPPORTED_LANGUAGES


@router.get("/config/currencies")
async def get_currencies():
    return SUPPORTED_CURRENCIES


@router.get("/config/locale")
async def get_full_locale_config():
    return {
        "countries": SUPPORTED_COUNTRIES,
        "languages": SUPPORTED_LANGUAGES,
        "currencies": SUPPORTED_CURRENCIES,
        "default_country": "ES",
        "default_language": "en",
        "default_currency": "EUR"
    }


# ── Regions ──────────────────────────────────────────────────

REGIONS_BY_COUNTRY = {
    "ES": {
        "name": "España",
        "regions": [
            {"code": "AN", "name": "Andalucía"}, {"code": "AR", "name": "Aragón"},
            {"code": "AS", "name": "Asturias"}, {"code": "IB", "name": "Islas Baleares"},
            {"code": "CN", "name": "Canarias"}, {"code": "CB", "name": "Cantabria"},
            {"code": "CL", "name": "Castilla y León"}, {"code": "CM", "name": "Castilla-La Mancha"},
            {"code": "CT", "name": "Cataluña"}, {"code": "VC", "name": "Comunidad Valenciana"},
            {"code": "EX", "name": "Extremadura"}, {"code": "GA", "name": "Galicia"},
            {"code": "MD", "name": "Madrid"}, {"code": "MC", "name": "Murcia"},
            {"code": "NC", "name": "Navarra"}, {"code": "PV", "name": "País Vasco"},
            {"code": "RI", "name": "La Rioja"}, {"code": "CE", "name": "Ceuta"},
            {"code": "ML", "name": "Melilla"}
        ]
    },
    "US": {
        "name": "United States",
        "regions": [
            {"code": "AL", "name": "Alabama"}, {"code": "AK", "name": "Alaska"},
            {"code": "AZ", "name": "Arizona"}, {"code": "AR", "name": "Arkansas"},
            {"code": "CA", "name": "California"}, {"code": "CO", "name": "Colorado"},
            {"code": "CT", "name": "Connecticut"}, {"code": "DE", "name": "Delaware"},
            {"code": "FL", "name": "Florida"}, {"code": "GA", "name": "Georgia"},
            {"code": "HI", "name": "Hawaii"}, {"code": "ID", "name": "Idaho"},
            {"code": "IL", "name": "Illinois"}, {"code": "IN", "name": "Indiana"},
            {"code": "IA", "name": "Iowa"}, {"code": "KS", "name": "Kansas"},
            {"code": "KY", "name": "Kentucky"}, {"code": "LA", "name": "Louisiana"},
            {"code": "ME", "name": "Maine"}, {"code": "MD", "name": "Maryland"},
            {"code": "MA", "name": "Massachusetts"}, {"code": "MI", "name": "Michigan"},
            {"code": "MN", "name": "Minnesota"}, {"code": "MS", "name": "Mississippi"},
            {"code": "MO", "name": "Missouri"}, {"code": "MT", "name": "Montana"},
            {"code": "NE", "name": "Nebraska"}, {"code": "NV", "name": "Nevada"},
            {"code": "NH", "name": "New Hampshire"}, {"code": "NJ", "name": "New Jersey"},
            {"code": "NM", "name": "New Mexico"}, {"code": "NY", "name": "New York"},
            {"code": "NC", "name": "North Carolina"}, {"code": "ND", "name": "North Dakota"},
            {"code": "OH", "name": "Ohio"}, {"code": "OK", "name": "Oklahoma"},
            {"code": "OR", "name": "Oregon"}, {"code": "PA", "name": "Pennsylvania"},
            {"code": "RI", "name": "Rhode Island"}, {"code": "SC", "name": "South Carolina"},
            {"code": "SD", "name": "South Dakota"}, {"code": "TN", "name": "Tennessee"},
            {"code": "TX", "name": "Texas"}, {"code": "UT", "name": "Utah"},
            {"code": "VT", "name": "Vermont"}, {"code": "VA", "name": "Virginia"},
            {"code": "WA", "name": "Washington"}, {"code": "WV", "name": "West Virginia"},
            {"code": "WI", "name": "Wisconsin"}, {"code": "WY", "name": "Wyoming"},
            {"code": "DC", "name": "Washington D.C."}
        ]
    },
    "KR": {
        "name": "대한민국",
        "regions": [
            {"code": "SEO", "name": "서울특별시"}, {"code": "BUS", "name": "부산광역시"},
            {"code": "DAG", "name": "대구광역시"}, {"code": "INC", "name": "인천광역시"},
            {"code": "GWJ", "name": "광주광역시"}, {"code": "DJN", "name": "대전광역시"},
            {"code": "ULS", "name": "울산광역시"}, {"code": "SEJ", "name": "세종특별자치시"},
            {"code": "GGI", "name": "경기도"}, {"code": "GWO", "name": "강원도"},
            {"code": "CCB", "name": "충청북도"}, {"code": "CCN", "name": "충청남도"},
            {"code": "JLB", "name": "전라북도"}, {"code": "JLN", "name": "전라남도"},
            {"code": "GSB", "name": "경상북도"}, {"code": "GSN", "name": "경상남도"},
            {"code": "JJU", "name": "제주특별자치도"}
        ]
    },
    "IT": {
        "name": "Italia",
        "regions": [
            {"code": "PIE", "name": "Piemonte"}, {"code": "VDA", "name": "Valle d'Aosta"},
            {"code": "LOM", "name": "Lombardia"}, {"code": "TAA", "name": "Trentino-Alto Adige"},
            {"code": "VEN", "name": "Veneto"}, {"code": "FVG", "name": "Friuli Venezia Giulia"},
            {"code": "LIG", "name": "Liguria"}, {"code": "EMR", "name": "Emilia-Romagna"},
            {"code": "TOS", "name": "Toscana"}, {"code": "UMB", "name": "Umbria"},
            {"code": "MAR", "name": "Marche"}, {"code": "LAZ", "name": "Lazio"},
            {"code": "ABR", "name": "Abruzzo"}, {"code": "MOL", "name": "Molise"},
            {"code": "CAM", "name": "Campania"}, {"code": "PUG", "name": "Puglia"},
            {"code": "BAS", "name": "Basilicata"}, {"code": "CAL", "name": "Calabria"},
            {"code": "SIC", "name": "Sicilia"}, {"code": "SAR", "name": "Sardegna"}
        ]
    },
    "FR": {
        "name": "France",
        "regions": [
            {"code": "IDF", "name": "Île-de-France"}, {"code": "ARA", "name": "Auvergne-Rhône-Alpes"},
            {"code": "BFC", "name": "Bourgogne-Franche-Comté"}, {"code": "BRE", "name": "Bretagne"},
            {"code": "CVL", "name": "Centre-Val de Loire"}, {"code": "COR", "name": "Corse"},
            {"code": "GES", "name": "Grand Est"}, {"code": "HDF", "name": "Hauts-de-France"},
            {"code": "NOR", "name": "Normandie"}, {"code": "NAQ", "name": "Nouvelle-Aquitaine"},
            {"code": "OCC", "name": "Occitanie"}, {"code": "PDL", "name": "Pays de la Loire"},
            {"code": "PAC", "name": "Provence-Alpes-Côte d'Azur"}
        ]
    },
    "DE": {
        "name": "Deutschland",
        "regions": [
            {"code": "BW", "name": "Baden-Württemberg"}, {"code": "BY", "name": "Bayern"},
            {"code": "BE", "name": "Berlin"}, {"code": "BB", "name": "Brandenburg"},
            {"code": "HB", "name": "Bremen"}, {"code": "HH", "name": "Hamburg"},
            {"code": "HE", "name": "Hessen"}, {"code": "MV", "name": "Mecklenburg-Vorpommern"},
            {"code": "NI", "name": "Niedersachsen"}, {"code": "NW", "name": "Nordrhein-Westfalen"},
            {"code": "RP", "name": "Rheinland-Pfalz"}, {"code": "SL", "name": "Saarland"},
            {"code": "SN", "name": "Sachsen"}, {"code": "ST", "name": "Sachsen-Anhalt"},
            {"code": "SH", "name": "Schleswig-Holstein"}, {"code": "TH", "name": "Thüringen"}
        ]
    },
    "PT": {
        "name": "Portugal",
        "regions": [
            {"code": "NOR", "name": "Norte"}, {"code": "CEN", "name": "Centro"},
            {"code": "LIS", "name": "Lisboa"}, {"code": "ALE", "name": "Alentejo"},
            {"code": "ALG", "name": "Algarve"}, {"code": "AZO", "name": "Açores"},
            {"code": "MAD", "name": "Madeira"}
        ]
    },
    "GB": {
        "name": "United Kingdom",
        "regions": [
            {"code": "ENG", "name": "England"}, {"code": "SCT", "name": "Scotland"},
            {"code": "WLS", "name": "Wales"}, {"code": "NIR", "name": "Northern Ireland"}
        ]
    },
    "MX": {
        "name": "México",
        "regions": [
            {"code": "AGU", "name": "Aguascalientes"}, {"code": "BCN", "name": "Baja California"},
            {"code": "BCS", "name": "Baja California Sur"}, {"code": "CAM", "name": "Campeche"},
            {"code": "CHP", "name": "Chiapas"}, {"code": "CHH", "name": "Chihuahua"},
            {"code": "CMX", "name": "Ciudad de México"}, {"code": "COA", "name": "Coahuila"},
            {"code": "COL", "name": "Colima"}, {"code": "DUR", "name": "Durango"},
            {"code": "GUA", "name": "Guanajuato"}, {"code": "GRO", "name": "Guerrero"},
            {"code": "HID", "name": "Hidalgo"}, {"code": "JAL", "name": "Jalisco"},
            {"code": "MEX", "name": "Estado de México"}, {"code": "MIC", "name": "Michoacán"},
            {"code": "MOR", "name": "Morelos"}, {"code": "NAY", "name": "Nayarit"},
            {"code": "NLE", "name": "Nuevo León"}, {"code": "OAX", "name": "Oaxaca"},
            {"code": "PUE", "name": "Puebla"}, {"code": "QUE", "name": "Querétaro"},
            {"code": "ROO", "name": "Quintana Roo"}, {"code": "SLP", "name": "San Luis Potosí"},
            {"code": "SIN", "name": "Sinaloa"}, {"code": "SON", "name": "Sonora"},
            {"code": "TAB", "name": "Tabasco"}, {"code": "TAM", "name": "Tamaulipas"},
            {"code": "TLA", "name": "Tlaxcala"}, {"code": "VER", "name": "Veracruz"},
            {"code": "YUC", "name": "Yucatán"}, {"code": "ZAC", "name": "Zacatecas"}
        ]
    },
    "CO": {
        "name": "Colombia",
        "regions": [
            {"code": "ANT", "name": "Antioquia"}, {"code": "BOG", "name": "Bogotá D.C."},
            {"code": "VAC", "name": "Valle del Cauca"}, {"code": "SAN", "name": "Santander"},
            {"code": "CUN", "name": "Cundinamarca"}, {"code": "ATL", "name": "Atlántico"},
            {"code": "BOL", "name": "Bolívar"}, {"code": "NAR", "name": "Nariño"},
            {"code": "TOL", "name": "Tolima"}, {"code": "CAU", "name": "Cauca"},
            {"code": "RIS", "name": "Risaralda"}, {"code": "CAL", "name": "Caldas"},
            {"code": "HUI", "name": "Huila"}, {"code": "CES", "name": "Cesar"},
            {"code": "MET", "name": "Meta"}, {"code": "MAG", "name": "Magdalena"}
        ]
    },
    "AR": {
        "name": "Argentina",
        "regions": [
            {"code": "BUE", "name": "Buenos Aires"}, {"code": "CAB", "name": "CABA"},
            {"code": "COR", "name": "Córdoba"}, {"code": "SFE", "name": "Santa Fe"},
            {"code": "MEN", "name": "Mendoza"}, {"code": "TUC", "name": "Tucumán"},
            {"code": "ENR", "name": "Entre Ríos"}, {"code": "SAL", "name": "Salta"},
            {"code": "MIS", "name": "Misiones"}, {"code": "CHA", "name": "Chaco"},
            {"code": "SJU", "name": "San Juan"}, {"code": "JUJ", "name": "Jujuy"},
            {"code": "RNE", "name": "Río Negro"}, {"code": "NEU", "name": "Neuquén"},
            {"code": "PAT", "name": "Patagonia"}
        ]
    },
    "JP": {
        "name": "日本",
        "regions": [
            {"code": "HOK", "name": "北海道"}, {"code": "TOH", "name": "東北"},
            {"code": "KAN", "name": "関東"}, {"code": "CHU", "name": "中部"},
            {"code": "KIN", "name": "近畿"}, {"code": "CGK", "name": "中国"},
            {"code": "SHI", "name": "四国"}, {"code": "KYU", "name": "九州・沖縄"}
        ]
    },
    "GR": {
        "name": "Ελλάδα",
        "regions": [
            {"code": "ATT", "name": "Αττική"}, {"code": "MAC", "name": "Μακεδονία"},
            {"code": "THE", "name": "Θεσσαλία"}, {"code": "PEL", "name": "Πελοπόννησος"},
            {"code": "CRE", "name": "Κρήτη"}, {"code": "ION", "name": "Ιόνια Νησιά"},
            {"code": "AEG", "name": "Αιγαίο"}, {"code": "EPI", "name": "Ήπειρος"},
            {"code": "THR", "name": "Θράκη"}
        ]
    },
    "BR": {
        "name": "Brasil",
        "regions": [
            {"code": "SP", "name": "São Paulo"}, {"code": "RJ", "name": "Rio de Janeiro"},
            {"code": "MG", "name": "Minas Gerais"}, {"code": "BA", "name": "Bahia"},
            {"code": "RS", "name": "Rio Grande do Sul"}, {"code": "PR", "name": "Paraná"},
            {"code": "PE", "name": "Pernambuco"}, {"code": "CE", "name": "Ceará"},
            {"code": "PA", "name": "Pará"}, {"code": "SC", "name": "Santa Catarina"},
            {"code": "GO", "name": "Goiás"}, {"code": "AM", "name": "Amazonas"},
            {"code": "DF", "name": "Distrito Federal"}
        ]
    },
    "CL": {
        "name": "Chile",
        "regions": [
            {"code": "RM", "name": "Región Metropolitana"}, {"code": "VAL", "name": "Valparaíso"},
            {"code": "BIO", "name": "Biobío"}, {"code": "MAU", "name": "Maule"},
            {"code": "ARA", "name": "La Araucanía"}, {"code": "LRI", "name": "Los Ríos"},
            {"code": "LLA", "name": "Los Lagos"}, {"code": "COQ", "name": "Coquimbo"},
            {"code": "OHI", "name": "O'Higgins"}, {"code": "ATA", "name": "Atacama"},
            {"code": "ANT", "name": "Antofagasta"}, {"code": "MAG", "name": "Magallanes"}
        ]
    },
    "PE": {
        "name": "Perú",
        "regions": [
            {"code": "LIM", "name": "Lima"}, {"code": "ARC", "name": "Arequipa"},
            {"code": "CUS", "name": "Cusco"}, {"code": "LAL", "name": "La Libertad"},
            {"code": "PIU", "name": "Piura"}, {"code": "JUN", "name": "Junín"},
            {"code": "LAM", "name": "Lambayeque"}, {"code": "CAJ", "name": "Cajamarca"},
            {"code": "PUN", "name": "Puno"}, {"code": "ICA", "name": "Ica"}
        ]
    },
    "NL": {
        "name": "Nederland",
        "regions": [
            {"code": "NH", "name": "Noord-Holland"}, {"code": "ZH", "name": "Zuid-Holland"},
            {"code": "NB", "name": "Noord-Brabant"}, {"code": "GE", "name": "Gelderland"},
            {"code": "UT", "name": "Utrecht"}, {"code": "OV", "name": "Overijssel"},
            {"code": "LI", "name": "Limburg"}, {"code": "FR", "name": "Friesland"},
            {"code": "GR", "name": "Groningen"}, {"code": "DR", "name": "Drenthe"},
            {"code": "FL", "name": "Flevoland"}, {"code": "ZE", "name": "Zeeland"}
        ]
    },
    "BE": {
        "name": "Belgique",
        "regions": [
            {"code": "BRU", "name": "Bruxelles"}, {"code": "VLG", "name": "Vlaanderen"},
            {"code": "WAL", "name": "Wallonie"}
        ]
    },
    "CH": {
        "name": "Schweiz",
        "regions": [
            {"code": "ZH", "name": "Zürich"}, {"code": "BE", "name": "Bern"},
            {"code": "VD", "name": "Vaud"}, {"code": "AG", "name": "Aargau"},
            {"code": "GE", "name": "Genève"}, {"code": "LU", "name": "Luzern"},
            {"code": "TI", "name": "Ticino"}, {"code": "VS", "name": "Valais"}
        ]
    },
    "AT": {
        "name": "Österreich",
        "regions": [
            {"code": "WIE", "name": "Wien"}, {"code": "NOE", "name": "Niederösterreich"},
            {"code": "OOE", "name": "Oberösterreich"}, {"code": "SBG", "name": "Salzburg"},
            {"code": "STM", "name": "Steiermark"}, {"code": "TIR", "name": "Tirol"},
            {"code": "VBG", "name": "Vorarlberg"}, {"code": "KTN", "name": "Kärnten"},
            {"code": "BGL", "name": "Burgenland"}
        ]
    },
    "PL": {
        "name": "Polska",
        "regions": [
            {"code": "MAZ", "name": "Mazowieckie"}, {"code": "SLA", "name": "Śląskie"},
            {"code": "WLK", "name": "Wielkopolskie"}, {"code": "MLP", "name": "Małopolskie"},
            {"code": "DLS", "name": "Dolnośląskie"}, {"code": "LDZ", "name": "Łódzkie"},
            {"code": "POM", "name": "Pomorskie"}, {"code": "LBL", "name": "Lubelskie"}
        ]
    },
    "IE": {
        "name": "Ireland",
        "regions": [
            {"code": "DUB", "name": "Dublin"}, {"code": "COR", "name": "Cork"},
            {"code": "GAL", "name": "Galway"}, {"code": "LIM", "name": "Limerick"}
        ]
    },
    "SE": {
        "name": "Sverige",
        "regions": [
            {"code": "STO", "name": "Stockholm"}, {"code": "VGO", "name": "Västra Götaland"},
            {"code": "SKA", "name": "Skåne"}, {"code": "OGO", "name": "Östergötland"},
            {"code": "UPP", "name": "Uppsala"}, {"code": "NOR", "name": "Norrbotten"}
        ]
    },
    "DK": {
        "name": "Danmark",
        "regions": [
            {"code": "HVD", "name": "Hovedstaden"}, {"code": "MID", "name": "Midtjylland"},
            {"code": "SYD", "name": "Syddanmark"}, {"code": "SJA", "name": "Sjælland"},
            {"code": "NOR", "name": "Nordjylland"}
        ]
    },
    "NO": {
        "name": "Norge",
        "regions": [
            {"code": "OSL", "name": "Oslo"}, {"code": "VIK", "name": "Viken"},
            {"code": "VES", "name": "Vestland"}, {"code": "ROG", "name": "Rogaland"},
            {"code": "TRO", "name": "Trøndelag"}, {"code": "NOR", "name": "Nordland"}
        ]
    },
    "TR": {
        "name": "Türkiye",
        "regions": [
            {"code": "IST", "name": "İstanbul"}, {"code": "ANK", "name": "Ankara"},
            {"code": "IZM", "name": "İzmir"}, {"code": "BUR", "name": "Bursa"},
            {"code": "ANT", "name": "Antalya"}, {"code": "ADN", "name": "Adana"},
            {"code": "GAZ", "name": "Gaziantep"}, {"code": "KON", "name": "Konya"}
        ]
    },
    "CA": {
        "name": "Canada",
        "regions": [
            {"code": "ON", "name": "Ontario"}, {"code": "QC", "name": "Québec"},
            {"code": "BC", "name": "British Columbia"}, {"code": "AB", "name": "Alberta"},
            {"code": "MB", "name": "Manitoba"}, {"code": "SK", "name": "Saskatchewan"},
            {"code": "NS", "name": "Nova Scotia"}, {"code": "NB", "name": "New Brunswick"}
        ]
    },
    "EC": {
        "name": "Ecuador",
        "regions": [
            {"code": "PIC", "name": "Pichincha"}, {"code": "GUA", "name": "Guayas"},
            {"code": "AZU", "name": "Azuay"}, {"code": "MAN", "name": "Manabí"}
        ]
    },
    "AU": {
        "name": "Australia",
        "regions": [
            {"code": "NSW", "name": "New South Wales"}, {"code": "VIC", "name": "Victoria"},
            {"code": "QLD", "name": "Queensland"}, {"code": "WA", "name": "Western Australia"},
            {"code": "SA", "name": "South Australia"}, {"code": "TAS", "name": "Tasmania"}
        ]
    },
    "NZ": {
        "name": "New Zealand",
        "regions": [
            {"code": "AUK", "name": "Auckland"}, {"code": "WEL", "name": "Wellington"},
            {"code": "CAN", "name": "Canterbury"}, {"code": "WAI", "name": "Waikato"}
        ]
    },
    "IN": {
        "name": "India",
        "regions": [
            {"code": "MH", "name": "Maharashtra"}, {"code": "DL", "name": "Delhi"},
            {"code": "KA", "name": "Karnataka"}, {"code": "TN", "name": "Tamil Nadu"},
            {"code": "GJ", "name": "Gujarat"}, {"code": "KL", "name": "Kerala"},
            {"code": "WB", "name": "West Bengal"}, {"code": "RJ", "name": "Rajasthan"}
        ]
    },
    "CN": {
        "name": "中国",
        "regions": [
            {"code": "BJ", "name": "北京"}, {"code": "SH", "name": "上海"},
            {"code": "GD", "name": "广东"}, {"code": "ZJ", "name": "浙江"},
            {"code": "JS", "name": "江苏"}, {"code": "SC", "name": "四川"}
        ]
    },
    "TH": {
        "name": "ประเทศไทย",
        "regions": [
            {"code": "BKK", "name": "Bangkok"}, {"code": "CMI", "name": "Chiang Mai"},
            {"code": "PKT", "name": "Phuket"}, {"code": "CBI", "name": "Chonburi"}
        ]
    },
    "MA": {
        "name": "المغرب",
        "regions": [
            {"code": "CAS", "name": "Casablanca"}, {"code": "RAB", "name": "Rabat"},
            {"code": "MAR", "name": "Marrakech"}, {"code": "FES", "name": "Fès"},
            {"code": "TNG", "name": "Tanger"}
        ]
    },
    "EG": {
        "name": "مصر",
        "regions": [
            {"code": "CAI", "name": "Cairo"}, {"code": "ALX", "name": "Alexandria"},
            {"code": "GIZ", "name": "Giza"}, {"code": "LUX", "name": "Luxor"}
        ]
    },
    "ZA": {
        "name": "South Africa",
        "regions": [
            {"code": "GP", "name": "Gauteng"}, {"code": "WC", "name": "Western Cape"},
            {"code": "KZN", "name": "KwaZulu-Natal"}, {"code": "EC", "name": "Eastern Cape"}
        ]
    },
    "IL": {
        "name": "ישראל",
        "regions": [
            {"code": "TLV", "name": "Tel Aviv"}, {"code": "JER", "name": "Jerusalem"},
            {"code": "HFA", "name": "Haifa"}, {"code": "BSH", "name": "Be'er Sheva"}
        ]
    }
}


@router.get("/config/regions")
async def get_regions():
    return REGIONS_BY_COUNTRY


@router.get("/config/regions/{country_code}")
async def get_country_regions(country_code: str):
    country_code = country_code.upper()
    if country_code not in REGIONS_BY_COUNTRY:
        raise HTTPException(status_code=404, detail=f"Country {country_code} not found")
    return REGIONS_BY_COUNTRY[country_code]


# ── Exchange Rates ───────────────────────────────────────────

exchange_rate_cache = {"rates": None, "updated_at": None}


@router.get("/exchange-rates")
async def get_exchange_rates():
    if exchange_rate_cache["rates"] and exchange_rate_cache["updated_at"]:
        cache_age = datetime.now(timezone.utc) - exchange_rate_cache["updated_at"]
        if cache_age < timedelta(hours=24):
            return {"base": "EUR", "rates": exchange_rate_cache["rates"], "updated_at": exchange_rate_cache["updated_at"].isoformat()}
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.get("https://open.er-api.com/v6/latest/EUR", timeout=5.0)
            response.raise_for_status()
            data = response.json()
            if data.get("result") == "success":
                exchange_rate_cache["rates"] = data.get("rates", {})
                exchange_rate_cache["updated_at"] = datetime.now(timezone.utc)
                return {"base": "EUR", "rates": exchange_rate_cache["rates"], "updated_at": exchange_rate_cache["updated_at"].isoformat()}
    except Exception as e:
        logger.error(f"[Exchange Rates] Error: {e}")
    if exchange_rate_cache["rates"]:
        return {"base": "EUR", "rates": exchange_rate_cache["rates"], "updated_at": exchange_rate_cache["updated_at"].isoformat() if exchange_rate_cache["updated_at"] else None, "stale": True}
    fallback = {"USD": 1.08, "GBP": 0.85, "JPY": 161.0, "CNY": 7.78, "INR": 89.5, "KRW": 1450.0, "AED": 3.97, "BRL": 5.35, "CAD": 1.47, "AUD": 1.65, "RUB": 99.0, "MXN": 18.5, "CHF": 0.97, "SEK": 11.2, "NOK": 11.5, "PLN": 4.3, "TRY": 35.0, "SGD": 1.45, "THB": 38.0, "ZAR": 19.5, "NGN": 1650.0, "EGP": 52.0, "EUR": 1.0}
    return {"base": "EUR", "rates": fallback, "updated_at": datetime.now(timezone.utc).isoformat(), "fallback": True}


# ── User Locale ──────────────────────────────────────────────

@router.get("/user/locale")
async def get_user_locale(user: User = Depends(get_current_user)):
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "locale": 1})
    locale = user_doc.get("locale", {}) if user_doc else {}
    return {"country": locale.get("country", "ES"), "language": locale.get("language", "en"), "currency": locale.get("currency", "EUR")}


@router.put("/user/locale")
async def update_user_locale(input: LocaleUpdateInput, user: User = Depends(get_current_user)):
    update_data = {}
    if input.country:
        if input.country not in SUPPORTED_COUNTRIES:
            raise HTTPException(status_code=400, detail="Invalid country code")
        update_data["locale.country"] = input.country
        if not input.currency:
            update_data["locale.currency"] = SUPPORTED_COUNTRIES[input.country]["currency"]
    if input.language:
        if input.language not in SUPPORTED_LANGUAGES:
            raise HTTPException(status_code=400, detail="Invalid language code")
        update_data["locale.language"] = input.language
    if input.currency:
        if input.currency not in SUPPORTED_CURRENCIES:
            raise HTTPException(status_code=400, detail="Invalid currency code")
        update_data["locale.currency"] = input.currency
    if update_data:
        await db.users.update_one({"user_id": user.user_id}, {"$set": update_data})
    return {"message": "Locale updated"}


# ── User Address ─────────────────────────────────────────────

@router.get("/user/address")
async def get_user_address(user: User = Depends(get_current_user)):
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "address": 1})
    if not user_doc or "address" not in user_doc:
        return {"address": None}
    return {"address": user_doc["address"]}


@router.put("/user/address")
async def update_user_address(address: Address, user: User = Depends(get_current_user)):
    if not address.full_name or not address.street or not address.city or not address.postal_code or not address.country:
        raise HTTPException(status_code=400, detail="All address fields are required except phone")
    address_data = {
        "full_name": address.full_name, "street": address.street,
        "city": address.city, "postal_code": address.postal_code,
        "country": address.country, "phone": address.phone
    }
    await db.users.update_one({"user_id": user.user_id}, {"$set": {"address": address_data, "updated_at": datetime.now(timezone.utc).isoformat()}})
    updated = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "address": 1})
    return {"address": updated.get("address")}
