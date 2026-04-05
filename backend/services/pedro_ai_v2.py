"""
Pedro AI v2 — Extensions for the ELITE B2B commercial agent.

Adds to the existing commercial_ai_tools.py:
- Deep memory (pedro_profiles): export targets, fears, experience level, conversation summary
- Market entry requirements per country (certifications, labeling, phyto, tariffs)
- Incoterm cost calculator with freight estimates
- Smart importer matching with scoring
- Pitch generation in target importer's language
- Trade show calendar per country/category
- Lead pipeline tracking (pedro_pipeline collection)
- Export goals (pedro_export_goals collection)
- B2B offer integration (pedro_b2b_offers collection)
- Proactive alerts + monthly briefing
- Producer fear detection + tone/experience escalation
"""
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Optional, Any
import uuid
import logging

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════

async def _find_importer(db, importer_id: str) -> Optional[dict]:
    """Find an importer by id (handles ObjectId or string fallback).
    Returns None if not found or id is invalid."""
    if not importer_id:
        return None
    # Try ObjectId first
    try:
        from bson import ObjectId
        if ObjectId.is_valid(importer_id):
            result = await db.importers.find_one({"_id": ObjectId(importer_id)}, {"_id": 0})
            if result:
                return result
    except Exception:
        pass
    # Fallback to string importer_id field
    return await db.importers.find_one({"importer_id": importer_id}, {"_id": 0})


# ═══════════════════════════════════════════════════════
# PEDRO PRODUCER PROFILE — Deep memory
# ═══════════════════════════════════════════════════════

async def get_or_create_pedro_profile(db, user_id: str) -> dict:
    """Fetch or create Pedro's profile for the producer."""
    profile = await db.pedro_profiles.find_one({"user_id": user_id}, {"_id": 0})
    if not profile:
        profile = {
            "user_id": user_id,
            "export_profile": {
                "stage": None,              # "first_time" | "exporting" | "scaling"
                "target_markets": [],       # list of ISO codes
                "main_goal": None,          # "first_contract" | "scale" | "new_market"
                "container_capacity": None,  # "mixed_loads" | "full_container" | "flexible"
                "dream_markets": [],
            },
            "experience_level": "novice",   # "novice" | "intermediate" | "expert"
            "fear_profile": [],             # price_fear, compliance_fear, language_fear, payment_fear, logistics_fear
            "emotional_signals": [],
            "conversation_summary": "",
            "interaction_count": 0,
            "tone_level": 1,                # 1=formal, 2=friendly, 3=close
            "onboarding_completed": False,
            "initial_diagnosis": None,
            "last_briefing_date": None,
            "last_updated": datetime.now(timezone.utc).isoformat(),
        }
        await db.pedro_profiles.insert_one({**profile})
        profile.pop("_id", None)
    return profile


# ═══════════════════════════════════════════════════════
# EXPORT-SPECIFIC FEAR & MOTIVATION DETECTION
# ═══════════════════════════════════════════════════════

EXPORT_FEAR_PATTERNS = {
    "compliance_fear": [
        "regulaciones", "compliance", "me pierdo con los papeles", "certificaciones me vuelven loco",
        "paperwork", "no sé qué certificaciones", "legal requirements",
    ],
    "language_fear": [
        "no hablo ingles", "no hablo inglés", "no hablo aleman", "no hablo alemán",
        "no se el idioma", "no sé el idioma", "don't speak", "language barrier",
        "como les escribo", "cómo les escribo", "how to contact", "barrera del idioma",
    ],
    "payment_fear": [
        "impago", "si no me pagan", "fraude", "scam", "riesgo de cobro", "payment risk",
        "carta de crédito", "letter of credit",
    ],
    "logistics_fear": [
        "cómo llega", "como llega", "container", "flete", "aduanas", "customs", "shipping risk",
        "se me rompe", "phytosanitary", "fitosanitario",
    ],
    "moq_fear": [
        "no tengo tanto volumen", "not enough volume", "container completo", "mínimo muy alto",
        "minimo muy alto", "demasiado volumen", "moq too high", "moq alto",
    ],
    "price_fear": [
        "no sé qué precio poner", "no se que precio poner", "cómo calculo el precio",
        "como calculo el precio", "pricing", "what price", "cuánto cobrar", "cuanto cobrar",
        "qué precio pongo", "que precio pongo",
    ],
}

EXPORT_MOTIVATION_PATTERNS = {
    "escape_local_saturation": ["mercado local saturado", "local market saturated", "diversificar"],
    "premium_markets": ["mercados premium", "high value", "premium positioning", "exclusividad"],
    "legacy_pride": ["llevar nuestros productos", "tradición española", "spanish heritage"],
    "scale_dream": ["contenedores", "full container", "scale up", "grandes volúmenes"],
    "family_future": ["para mis hijos", "futuro de la empresa", "next generation"],
}

EXPORT_EXPERIENCE_SIGNALS = {
    "novice": [
        "nunca he exportado", "primera vez", "no sé cómo empezar", "no se como empezar",
        "never exported", "first time", "qué es incoterm", "que es incoterm",
        "qué es fob", "que es fob", "what is fob", "how does exporting",
    ],
    "intermediate": [
        "ya exporto", "ya llevo", "tengo algunos clientes fuera", "tengo clientes en",
        "already export", "some clients", "llevo un año", "llevo 1 año", "llevo 1 año exportando",
        "1 year exporting", "año exportando", "algunos meses exportando",
    ],
    "expert": [
        "exporto a varios países", "exporto a varios paises", "exporto a 3", "exporto a 4",
        "contenedores completos", "multiple markets", "full containers",
        "llevo años exportando", "llevo años en", "years exporting", "consolidated", "consolidado",
    ],
}


def detect_pedro_signals(message: str, current_profile: dict) -> dict:
    """Detect export-specific fears, motivations, and experience level."""
    msg = message.lower().strip()
    updates = {}

    # Fears
    current_fears = set(current_profile.get("fear_profile", []))
    for fear, patterns in EXPORT_FEAR_PATTERNS.items():
        if any(p in msg for p in patterns):
            current_fears.add(fear)
    if current_fears != set(current_profile.get("fear_profile", [])):
        updates["fear_profile"] = list(current_fears)

    # Signals
    current_signals = set(current_profile.get("emotional_signals", []))
    for motivation, patterns in EXPORT_MOTIVATION_PATTERNS.items():
        if any(p in msg for p in patterns):
            current_signals.add(f"motivation:{motivation}")
    for fear, patterns in EXPORT_FEAR_PATTERNS.items():
        if any(p in msg for p in patterns):
            current_signals.add(f"fear:{fear}")
    if current_signals != set(current_profile.get("emotional_signals", [])):
        updates["emotional_signals"] = list(current_signals)

    # Experience level detection (upgrades only, never downgrades)
    current_level = current_profile.get("experience_level", "novice")
    levels = {"novice": 0, "intermediate": 1, "expert": 2}
    for level, patterns in EXPORT_EXPERIENCE_SIGNALS.items():
        if any(p in msg for p in patterns):
            if levels[level] > levels.get(current_level, 0):
                updates["experience_level"] = level

    return updates


def compute_tone_level(interaction_count: int) -> int:
    """Pedro tone: 1=formal, 2=friendly, 3=close (no humor, always professional)."""
    if interaction_count < 5:
        return 1
    if interaction_count < 20:
        return 2
    return 3


# ═══════════════════════════════════════════════════════
# MARKET ENTRY REQUIREMENTS per country
# ═══════════════════════════════════════════════════════

MARKET_ENTRY_REQUIREMENTS = {
    "DE": {
        "name": "Alemania",
        "general": [
            "Etiquetado en alemán obligatorio (Lebensmittelinformationsverordnung)",
            "Certificación HACCP (obligatoria UE)",
            "Código EAN-13 para retail",
            "Información nutricional por 100g/100ml",
        ],
        "certifications_accepted": ["EU Organic", "BIO (DE)", "Demeter", "Naturland", "Fair Trade"],
        "tariff": "0% (UE)",
        "vat": "7% alimentos / 19% general",
        "phytosanitary": False,
        "customs_time_days": 2,
        "category_specific": {
            "aceite de oliva": ["Certificado origen DOP/IGP valorado", "Análisis acidez", "Panel test"],
            "vino": ["Licencia importador alemán requerida", "Etiqueta con alérgenos (sulfitos)", "VI-1 para no-UE (no aplica España)"],
            "quesos": ["Declaración leche cruda si aplica", "Registro TRACES"],
            "embutidos": ["Certificado veterinario", "Registro en Veterinäramt"],
        },
    },
    "FR": {
        "name": "Francia",
        "general": [
            "Etiquetado en francés obligatorio",
            "HACCP obligatorio",
            "Origen claramente indicado",
            "Declaración nutricional UE",
        ],
        "certifications_accepted": ["EU Organic", "AB (Agriculture Biologique)", "Label Rouge", "IGP", "AOP"],
        "tariff": "0% (UE)",
        "vat": "5.5% alimentos básicos / 20% general",
        "phytosanitary": False,
        "customs_time_days": 2,
        "category_specific": {
            "aceite de oliva": ["DOP bien valorado", "Origen destacado en etiqueta"],
            "vino": ["Registro DGCCRF", "Etiqueta conforme INAO"],
            "embutidos": ["Certificado veterinario", "Sello CE obligatorio"],
        },
    },
    "GB": {
        "name": "Reino Unido",
        "general": [
            "Etiquetado en inglés obligatorio",
            "UKCA mark (sustituye CE desde 2023)",
            "Declaración de origen post-Brexit",
            "HACCP equivalente (FSA)",
            "Registro de importador UK requerido",
        ],
        "certifications_accepted": ["UK Organic (OF&G)", "Soil Association", "Red Tractor", "BRC Global Standard"],
        "tariff": "0-2.5% (TCA post-Brexit, depende de HS code)",
        "vat": "0% alimentos básicos / 20% general",
        "phytosanitary": True,
        "customs_time_days": 5,
        "category_specific": {
            "aceite de oliva": ["Certificado IOC valorado", "Declaración HS 1509"],
            "vino": ["Wine Standards Board", "Licencia importador UK"],
            "embutidos": ["IPAFFS pre-notification", "Certificado veterinario Defra"],
        },
    },
    "US": {
        "name": "Estados Unidos",
        "general": [
            "FDA Food Facility Registration obligatorio (renovable cada 2 años)",
            "FSMA compliance (Food Safety Modernization Act)",
            "Etiquetado en inglés con nutritional facts según FDA",
            "Prior Notice before arrival",
            "FSVP qualified individual requerido",
            "Bioterrorism Act compliance",
        ],
        "certifications_accepted": ["USDA Organic", "Non-GMO Project", "Kosher (OU)", "Halal", "SQF"],
        "tariff": "0-5% (depende HS code)",
        "vat": "Sales tax variable por estado (0-10%)",
        "phytosanitary": True,
        "customs_time_days": 7,
        "category_specific": {
            "aceite de oliva": ["COOC certification ayuda", "Sellos de acidez", "Bottle sizes en oz+ml"],
            "vino": ["TTB approval (COLA)", "Federal excise tax", "State license per distribution state"],
            "quesos": ["Leche cruda <60 días prohibida", "FDA grade A si aplica"],
            "embutidos": ["USDA FSIS inspection", "Países aprobados (España SÍ)", "Etiquetado bilingüe opcional"],
        },
    },
    "JP": {
        "name": "Japón",
        "general": [
            "Etiquetado en japonés OBLIGATORIO (hiragana+kanji)",
            "Food Sanitation Act compliance",
            "Declaración de aditivos según JFSA",
            "Certificado fitosanitario",
            "Plant Quarantine Act inspection",
            "Importer license requerida en destino",
        ],
        "certifications_accepted": ["JAS Organic (único orgánico válido)", "Halal JAKIM", "Kosher"],
        "tariff_notes": "EU-Japan EPA reduce aranceles progresivamente",
        "tariff": "0-10% (EPA UE-Japón, depende categoría)",
        "vat": "8% consumo",
        "phytosanitary": True,
        "customs_time_days": 10,
        "category_specific": {
            "aceite de oliva": ["JAS Organic si orgánico (no vale EU Organic)", "Etiqueta en japonés completa", "Nombre comercial katakana"],
            "vino": ["Wine Act license", "Análisis químico en Japón posible", "Etiqueta con alérgenos JP"],
            "quesos": ["Prohibidos quesos leche cruda <60d", "HACCP declaración"],
            "jamón ibérico": ["Registro JFSA obligatorio", "Inspección 100% cargas"],
        },
    },
    "IT": {
        "name": "Italia",
        "general": [
            "Etiquetado en italiano obligatorio",
            "HACCP obligatorio UE",
            "Origen destacado (competencia directa con producción local)",
        ],
        "certifications_accepted": ["EU Organic", "DOP", "IGP", "BIO"],
        "tariff": "0% (UE)",
        "vat": "4% alimentos básicos / 10% general / 22% premium",
        "phytosanitary": False,
        "customs_time_days": 2,
        "category_specific": {
            "aceite de oliva": ["Competencia local muy fuerte", "Necesitas diferenciación clara (DOP, origen, historia)"],
            "vino": ["Muy competitivo", "Nicho posible con vinos únicos"],
        },
    },
    "NL": {
        "name": "Países Bajos",
        "general": [
            "Etiquetado multilingüe (NL/EN/DE)",
            "HACCP obligatorio",
            "NVWA inspection",
            "Gateway a resto de Europa (Rotterdam)",
        ],
        "certifications_accepted": ["EU Organic", "EKO", "Skal"],
        "tariff": "0% (UE)",
        "vat": "9% alimentos / 21% general",
        "phytosanitary": False,
        "customs_time_days": 2,
        "category_specific": {
            "aceite de oliva": ["Gateway para distribución a Bélgica, Alemania Norte"],
        },
    },
    "SE": {
        "name": "Suecia",
        "general": [
            "Etiquetado en sueco recomendado (otras lenguas nórdicas aceptadas)",
            "Livsmedelsverket compliance",
            "HACCP obligatorio UE",
        ],
        "certifications_accepted": ["EU Organic", "KRAV", "Svanen"],
        "tariff": "0% (UE)",
        "vat": "12% alimentos / 25% general",
        "phytosanitary": False,
        "customs_time_days": 3,
        "category_specific": {
            "aceite de oliva": ["Mercado premium, foco en calidad"],
            "vino": ["Monopolio Systembolaget — canal único para retail"],
        },
    },
    "AE": {
        "name": "Emiratos Árabes Unidos",
        "general": [
            "Etiquetado bilingüe árabe/inglés OBLIGATORIO",
            "Halal certification obligatoria para cárnicos",
            "Dubai Municipality Food Control",
            "Shelf life mínima al llegar: 50% vida útil",
            "No cerdo, no alcohol en hoteles muchos (excepto permitido)",
            "Importer license local requerida",
        ],
        "certifications_accepted": ["Halal (ESMA, JAKIM)", "ISO 22000", "HACCP"],
        "tariff": "5% CIF",
        "vat": "5% VAT",
        "phytosanitary": True,
        "customs_time_days": 5,
        "category_specific": {
            "aceite de oliva": ["Halal no requerido pero valorado", "Premium market, foco gourmet"],
            "vino": ["Solo vía licencia especial hoteles/restaurantes", "Consumo restringido"],
            "jamón ibérico": ["PROHIBIDO (producto porcino)"],
            "quesos": ["Halal certificado requerido si procesado"],
        },
    },
}


def get_market_entry_requirements(country: str, product_category: Optional[str] = None) -> dict:
    """Return market entry checklist for a country + optional category."""
    country_input = country.strip()
    country_key = None

    # Try ISO code (2-3 chars)
    if len(country_input) <= 3:
        candidate = country_input.upper()[:2]
        if candidate in MARKET_ENTRY_REQUIREMENTS:
            country_key = candidate

    # Try name match (partial)
    if not country_key:
        country_lower = country_input.lower()
        # Common aliases
        aliases = {
            "alemania": "DE", "germany": "DE", "deutschland": "DE",
            "francia": "FR", "france": "FR",
            "reino unido": "GB", "uk": "GB", "united kingdom": "GB", "england": "GB",
            "estados unidos": "US", "usa": "US", "united states": "US", "america": "US",
            "japón": "JP", "japon": "JP", "japan": "JP", "nippon": "JP",
            "italia": "IT", "italy": "IT",
            "países bajos": "NL", "paises bajos": "NL", "holanda": "NL", "netherlands": "NL",
            "suecia": "SE", "sweden": "SE",
            "emiratos": "AE", "emiratos árabes unidos": "AE", "uae": "AE", "dubai": "AE",
        }
        if country_lower in aliases:
            country_key = aliases[country_lower]
        else:
            # Partial substring match on country names
            for code, data in MARKET_ENTRY_REQUIREMENTS.items():
                if country_lower in data["name"].lower() or data["name"].lower() in country_lower:
                    country_key = code
                    break

    data = MARKET_ENTRY_REQUIREMENTS.get(country_key)
    if not data:
        return {
            "error": f"País '{country}' no tiene checklist disponible",
            "available": [d["name"] for d in MARKET_ENTRY_REQUIREMENTS.values()],
        }

    result = {
        "country": data["name"],
        "general_requirements": data["general"],
        "accepted_certifications": data["certifications_accepted"],
        "tariff": data["tariff"],
        "vat": data["vat"],
        "phytosanitary_required": data["phytosanitary"],
        "customs_time_days": data["customs_time_days"],
    }

    if product_category:
        cat_key = product_category.lower().strip()
        cat_specific = data.get("category_specific", {}).get(cat_key)
        if not cat_specific:
            # Try partial match
            for k, v in data.get("category_specific", {}).items():
                if cat_key in k or k in cat_key:
                    cat_specific = v
                    break
        if cat_specific:
            result["category_specific_requirements"] = cat_specific
            result["product_category"] = product_category

    return result


# ═══════════════════════════════════════════════════════
# INCOTERM COST CALCULATOR
# ═══════════════════════════════════════════════════════

# Freight estimates: origin Valencia/Barcelona → destination. EUR per container 20ft.
# These are heuristics; actual prices fluctuate with fuel and season.
FREIGHT_ESTIMATES_20FT_EUR = {
    "DE": 1200,   # road/short sea
    "FR": 900,
    "GB": 1800,   # post-Brexit customs overhead
    "IT": 800,
    "NL": 1100,
    "SE": 1500,
    "US": 3500,   # trans-Atlantic
    "JP": 4200,   # trans-Pacific
    "AE": 2800,   # Mediterranean
}

# Typical container capacity: 20ft holds ~20,000kg (palletized dense food products ~18,000kg usable)
CONTAINER_20FT_CAPACITY_KG = 18_000


def calculate_incoterm_costs(country: str, volume_kg: float, price_eur_kg: float,
                             weight_kg: float) -> dict:
    """
    Calculate cost breakdown per Incoterm for a given shipment.
    Returns structured comparison: EXW, FOB, CIF, DDP.
    """
    country_key = country.strip().upper()[:2] if len(country.strip()) <= 3 else None
    if not country_key or country_key not in FREIGHT_ESTIMATES_20FT_EUR:
        country_lower = country.strip().lower()
        country_map = {"alemania": "DE", "germany": "DE", "francia": "FR", "france": "FR",
                       "reino unido": "GB", "uk": "GB", "united kingdom": "GB", "italia": "IT",
                       "italy": "IT", "países bajos": "NL", "netherlands": "NL", "suecia": "SE",
                       "sweden": "SE", "estados unidos": "US", "usa": "US", "united states": "US",
                       "japón": "JP", "japan": "JP", "emiratos": "AE", "uae": "AE", "dubai": "AE"}
        country_key = country_map.get(country_lower)

    if not country_key or country_key not in FREIGHT_ESTIMATES_20FT_EUR:
        return {"error": f"No hay estimaciones de flete para '{country}'"}

    # Base cost
    base_eur = volume_kg * price_eur_kg

    # Freight cost scaled by weight vs container capacity
    containers_needed = max(1, (weight_kg / CONTAINER_20FT_CAPACITY_KG))
    freight_total = FREIGHT_ESTIMATES_20FT_EUR[country_key] * containers_needed

    # Insurance ~0.5-1% of CIF value
    insurance = base_eur * 0.007

    # Tariffs (heuristic per country)
    tariff_pcts = {"DE": 0, "FR": 0, "IT": 0, "NL": 0, "SE": 0, "GB": 2.5, "US": 5, "JP": 6, "AE": 5}
    tariff_pct = tariff_pcts.get(country_key, 0)

    # Customs handling fees (flat per shipment)
    customs_fees = 350 if country_key in ("US", "JP", "AE", "GB") else 150

    # VAT-equivalent at destination (for DDP calculation — usually recoverable by importer)
    vat_pcts = {"DE": 7, "FR": 5.5, "GB": 0, "US": 0, "JP": 8, "IT": 4, "NL": 9, "SE": 12, "AE": 5}
    vat_pct = vat_pcts.get(country_key, 0)

    # CIF = Base + Freight + Insurance
    cif = base_eur + freight_total + insurance
    tariff_cost = cif * (tariff_pct / 100)

    # DDP adds tariff + customs + VAT on (CIF + tariff)
    ddp_base = cif + tariff_cost + customs_fees
    vat_cost = ddp_base * (vat_pct / 100)
    ddp = ddp_base + vat_cost

    return {
        "country": country_key,
        "volume_kg": volume_kg,
        "price_per_kg_eur": price_eur_kg,
        "weight_kg": weight_kg,
        "containers_needed": round(containers_needed, 2),
        "breakdown": {
            "EXW": {
                "total_eur": round(base_eur, 2),
                "producer_receives": round(base_eur, 2),
                "description": "Productor entrega en fábrica. Comprador asume TODO el transporte.",
            },
            "FOB": {
                "total_eur": round(base_eur + freight_total * 0.2, 2),
                "producer_receives": round(base_eur, 2),
                "description": "Productor entrega a bordo del buque en Valencia/Barcelona. Comprador asume flete internacional.",
                "extra_cost": round(freight_total * 0.2, 2),
            },
            "CIF": {
                "total_eur": round(cif, 2),
                "producer_receives": round(base_eur, 2),
                "description": "Productor cubre flete + seguro hasta puerto destino. Comprador desde aduanas.",
                "extra_cost": round(freight_total + insurance, 2),
            },
            "DDP": {
                "total_eur": round(ddp, 2),
                "producer_receives": round(base_eur, 2),
                "description": "Productor entrega en almacén del comprador con TODO pagado (aranceles, IVA, transporte interno).",
                "extra_cost": round(freight_total + insurance + tariff_cost + customs_fees + vat_cost, 2),
                "note": "IVA suele ser recuperable por el importador, pero lo pagas primero.",
            },
        },
        "recommendation": (
            "FOB es el más equilibrado: tú entregas en puerto, el importador asume el trayecto internacional. "
            f"Precio competitivo en {country_key}: {round(base_eur + freight_total * 0.1, 2)}€ total "
            f"(~{round(price_eur_kg * 1.05, 2)}€/kg)."
        ),
        "heuristic_disclaimer": "Estimaciones heurísticas. Pide cotización real a un freight forwarder.",
    }


# ═══════════════════════════════════════════════════════
# SMART IMPORTER MATCHING
# ═══════════════════════════════════════════════════════

async def smart_importer_match(db, producer_id: str, country: str,
                                product_category: Optional[str] = None,
                                limit: int = 5) -> dict:
    """
    Smart importer matching with scoring. Returns top matches ranked by fit.
    """
    from services.commercial_ai_tools import MARKET_DATA, _resolve_country

    market = _resolve_country(country)
    country_name = market["name"] if market else country

    # Get producer's certifications + categories
    my_products = await db.products.find(
        {"producer_id": producer_id, "approved": True},
        {"_id": 0, "certifications": 1, "category_id": 1, "name": 1},
    ).to_list(50)

    my_certs = set()
    my_categories = set()
    for p in my_products:
        for c in p.get("certifications", []) or []:
            my_certs.add(str(c).lower())
        if p.get("category_id"):
            my_categories.add(str(p["category_id"]).lower())

    # Query importers
    query: dict[str, Any] = {"is_verified": True}
    if market:
        query["country"] = {"$regex": market["name"], "$options": "i"}
    else:
        query["country"] = {"$regex": country, "$options": "i"}
    if product_category:
        query["categories"] = {"$regex": product_category, "$options": "i"}

    importers = await db.importers.find(query, {"_id": 1, "company_name": 1, "country": 1,
                                                 "categories": 1, "min_volume_kg": 1,
                                                 "certifications": 1, "languages": 1}).to_list(30)

    if not importers:
        return {
            "country": country_name,
            "matches": [],
            "message": f"No hay importadores verificados en {country_name} todavía. Publica tu catálogo para recibir solicitudes.",
        }

    # Score each importer
    scored = []
    for imp in importers:
        score = 50  # base score

        # Certification overlap (heavy weight)
        imp_certs = {str(c).lower() for c in (imp.get("certifications") or [])}
        cert_overlap = len(my_certs & imp_certs)
        score += cert_overlap * 15

        # Category match
        imp_cats = {str(c).lower() for c in (imp.get("categories") or [])}
        cat_overlap = len(my_categories & imp_cats)
        score += cat_overlap * 10
        if product_category and product_category.lower() in [c.lower() for c in imp.get("categories", [])]:
            score += 15

        # Volume compatibility (if we have product volumes)
        moq = imp.get("min_volume_kg", 0) or 0
        if 0 < moq < 5000:
            score += 10  # low MOQ = more accessible
        elif moq > 20000:
            score -= 10  # very high MOQ = may be too big

        # Cap at 100
        score = max(0, min(100, score))

        fit_reasons = []
        if cert_overlap:
            fit_reasons.append(f"{cert_overlap} certificación(es) coincidentes")
        if cat_overlap:
            fit_reasons.append(f"{cat_overlap} categoría(s) coincidentes")
        if 0 < moq < 5000:
            fit_reasons.append(f"MOQ bajo ({moq}kg) — accesible")
        elif moq >= 20000:
            fit_reasons.append(f"MOQ alto ({moq}kg) — requiere capacidad")
        if not fit_reasons:
            fit_reasons.append("Match básico por país")

        scored.append({
            "importer_id": str(imp["_id"]),
            "company": imp.get("company_name", ""),
            "country": imp.get("country", ""),
            "categories": imp.get("categories", []),
            "min_volume_kg": moq,
            "certifications": imp.get("certifications", []),
            "languages": imp.get("languages", ["en"]),
            "fit_score": score,
            "fit_reasons": fit_reasons,
        })

    scored.sort(key=lambda x: -x["fit_score"])
    return {
        "country": country_name,
        "total_found": len(scored),
        "matches": scored[:limit],
    }


# ═══════════════════════════════════════════════════════
# IMPORTER SEGMENTATION — Analyze importers this producer has touched
# ═══════════════════════════════════════════════════════

async def analyze_importers(db, producer_id: str) -> dict:
    """Segment importers the producer has interacted with (via offers + pipeline).
    Returns RFM-style segmentation: champions, active, at_risk, lost, new_prospects.
    """
    now = datetime.now(timezone.utc)

    # All offers this producer has sent
    offers = await db.pedro_b2b_offers.find(
        {"producer_id": producer_id, "status": {"$ne": "draft"}},
        {"_id": 0},
    ).to_list(500)

    # All pipeline leads
    leads = await db.pedro_pipeline.find(
        {"user_id": producer_id}, {"_id": 0},
    ).to_list(500)

    # Aggregate per importer
    importer_stats: dict[str, dict] = {}
    for offer in offers:
        imp_id = offer.get("importer_id")
        if not imp_id:
            continue
        stat = importer_stats.setdefault(imp_id, {
            "offers_sent": 0, "offers_accepted": 0, "total_value_eur": 0,
            "last_interaction": None, "stage": None,
        })
        stat["offers_sent"] += 1
        if offer.get("status") == "accepted":
            stat["offers_accepted"] += 1
            stat["total_value_eur"] += offer.get("total_eur", 0)
        sent_at = offer.get("sent_at")
        if sent_at and (not stat["last_interaction"] or sent_at > stat["last_interaction"]):
            stat["last_interaction"] = sent_at

    for lead in leads:
        imp_id = lead.get("importer_id")
        if not imp_id:
            continue
        stat = importer_stats.setdefault(imp_id, {
            "offers_sent": 0, "offers_accepted": 0, "total_value_eur": 0,
            "last_interaction": None, "stage": None,
        })
        stat["stage"] = lead.get("stage")
        updated = lead.get("updated_at")
        if updated and (not stat["last_interaction"] or updated > stat["last_interaction"]):
            stat["last_interaction"] = updated

    # Enrich with importer details and segment
    segments = {"champions": [], "active": [], "at_risk": [], "lost": [], "new_prospects": []}
    for imp_id, stat in importer_stats.items():
        importer = await _find_importer(db, imp_id)
        if not importer:
            continue

        days_since = 999
        if stat["last_interaction"]:
            try:
                last = stat["last_interaction"]
                if isinstance(last, str):
                    last = datetime.fromisoformat(last.replace("Z", "+00:00"))
                days_since = (now - last).days
            except Exception:
                pass

        entry = {
            "importer_id": imp_id,
            "company": importer.get("company_name", ""),
            "country": importer.get("country", ""),
            "offers_sent": stat["offers_sent"],
            "offers_accepted": stat["offers_accepted"],
            "total_value_eur": round(stat["total_value_eur"], 2),
            "days_since_interaction": days_since,
            "stage": stat["stage"],
        }

        # Segment by activity + success
        if stat["offers_accepted"] >= 2 and days_since < 60:
            segments["champions"].append(entry)
        elif stat["offers_sent"] >= 1 and days_since < 30:
            segments["active"].append(entry)
        elif stat["offers_sent"] >= 1 and 30 <= days_since < 90:
            segments["at_risk"].append(entry)
        elif stat["offers_sent"] >= 1 and days_since >= 90:
            segments["lost"].append(entry)
        else:
            segments["new_prospects"].append(entry)

    total_importers = sum(len(v) for v in segments.values())
    total_revenue = sum(sum(e["total_value_eur"] for e in v) for v in segments.values())

    return {
        "total_importers": total_importers,
        "total_revenue_eur": round(total_revenue, 2),
        "segments": {
            "champions": {
                "count": len(segments["champions"]),
                "description": "2+ ofertas aceptadas + activos en los últimos 60 días",
                "importers": segments["champions"][:10],
            },
            "active": {
                "count": len(segments["active"]),
                "description": "Contactados en los últimos 30 días",
                "importers": segments["active"][:10],
            },
            "at_risk": {
                "count": len(segments["at_risk"]),
                "description": "Sin contacto 30-90 días — enviar follow-up",
                "importers": segments["at_risk"][:10],
            },
            "lost": {
                "count": len(segments["lost"]),
                "description": "Sin contacto >90 días — considerar marcar como cold",
                "importers": segments["lost"][:10],
            },
            "new_prospects": {
                "count": len(segments["new_prospects"]),
                "description": "En pipeline sin ofertas enviadas aún",
                "importers": segments["new_prospects"][:10],
            },
        },
    }


# ═══════════════════════════════════════════════════════
# PITCH GENERATION
# ═══════════════════════════════════════════════════════

async def generate_pitch(db, producer_id: str, importer_id: str,
                          target_language: str = "en",
                          pitch_type: str = "first_contact") -> dict:
    """
    Generate a personalized pitch email for an importer.
    Returns structured data + instructions for the LLM to compose the final text.
    """
    importer = await _find_importer(db, importer_id)
    if not importer:
        return {"error": "Importador no encontrado"}

    # Fetch producer store + top products
    store = await db.store_profiles.find_one({"producer_id": producer_id}, {"_id": 0})
    products = await db.products.find(
        {"producer_id": producer_id, "approved": True},
        {"_id": 0, "name": 1, "description": 1, "certifications": 1, "price": 1, "category_id": 1},
    ).sort("rating", -1).limit(3).to_list(3)

    pitch_instructions = {
        "first_contact": (
            f"Genera un email profesional de PRIMER CONTACTO en {target_language}. "
            "Estructura: (1) asunto corto y directo, (2) saludo formal, "
            "(3) presentación breve (2 líneas), (4) propuesta de valor concreta basada en los productos del productor, "
            "(5) match específico con el importador (categorías coincidentes), "
            "(6) call-to-action claro (muestra gratis / llamada / catálogo). Max 180 palabras. "
            "Tono profesional B2B, sin marketing fluff."
        ),
        "sample_offer": (
            f"Genera un email de OFERTA DE MUESTRAS en {target_language}. "
            "Tono: generoso pero profesional. Estructura: asunto, oferta concreta de samples gratis, "
            "tiempos de entrega, CTA para confirmar dirección. Max 150 palabras."
        ),
        "formal_offer": (
            f"Genera un email de OFERTA FORMAL en {target_language}. "
            "Estructura: asunto con referencia, condiciones comerciales claras (precio, MOQ, Incoterm, tiempos), "
            "términos de pago propuestos, validez de la oferta. Tono formal comercial. Max 200 palabras."
        ),
        "follow_up": (
            f"Genera un email de SEGUIMIENTO en {target_language} (el importador no ha respondido en 7-14 días). "
            "Estructura: asunto recordatorio, tono cordial no presionante, "
            "aportar valor nuevo (novedad, precio especial, ferias próximas), CTA suave. Max 120 palabras."
        ),
    }

    return {
        "pitch_type": pitch_type,
        "target_language": target_language,
        "importer": {
            "company": importer.get("company_name", ""),
            "country": importer.get("country", ""),
            "categories": importer.get("categories", []),
            "contact_name": importer.get("contact_name", ""),
        },
        "producer": {
            "store_name": store.get("name", "") if store else "",
            "top_products": [
                {"name": p.get("name"), "category": p.get("category_id"),
                 "certifications": p.get("certifications", [])}
                for p in products
            ],
        },
        "instructions": pitch_instructions.get(pitch_type, pitch_instructions["first_contact"]),
    }


# ═══════════════════════════════════════════════════════
# TRADE SHOW CALENDAR
# ═══════════════════════════════════════════════════════

TRADE_SHOWS_2026 = [
    {
        "name": "Anuga", "city": "Colonia", "country": "DE", "date": "2026-10-10",
        "duration_days": 5, "category": ["aceite de oliva", "conservas", "quesos", "embutidos", "vino", "general"],
        "importance": "crítica", "target_markets": ["DE", "AT", "CH", "NL", "BE", "EU"],
        "description": "Feria B2B de alimentación más grande del mundo. Bianual (años pares).",
        "prep_days": 120,
    },
    {
        "name": "SIAL Paris", "city": "París", "country": "FR", "date": "2026-10-17",
        "duration_days": 5, "category": ["general", "vino", "aceite de oliva", "quesos", "gourmet"],
        "importance": "crítica", "target_markets": ["FR", "EU", "global"],
        "description": "Feria B2B alimentación global. Bianual (años pares).",
        "prep_days": 120,
    },
    {
        "name": "Gulfood", "city": "Dubai", "country": "AE", "date": "2026-02-16",
        "duration_days": 5, "category": ["general", "aceite de oliva", "conservas", "halal"],
        "importance": "alta", "target_markets": ["AE", "SA", "KW", "middle_east", "north_africa"],
        "description": "Mayor feria de alimentación de Medio Oriente y África del Norte.",
        "prep_days": 90,
    },
    {
        "name": "Foodex Japan", "city": "Tokio", "country": "JP", "date": "2026-03-10",
        "duration_days": 4, "category": ["general", "aceite de oliva", "vino", "gourmet", "quesos"],
        "importance": "alta", "target_markets": ["JP", "KR", "asia"],
        "description": "Puerta de entrada al mercado asiático premium.",
        "prep_days": 120,
    },
    {
        "name": "Fancy Food Show Winter", "city": "Las Vegas", "country": "US", "date": "2026-01-18",
        "duration_days": 3, "category": ["gourmet", "aceite de oliva", "quesos", "conservas premium"],
        "importance": "alta", "target_markets": ["US", "CA", "MX"],
        "description": "Feria de gourmet specialty food en USA. 2 ediciones/año (Winter + Summer).",
        "prep_days": 90,
    },
    {
        "name": "Summer Fancy Food Show", "city": "Nueva York", "country": "US", "date": "2026-06-28",
        "duration_days": 3, "category": ["gourmet", "aceite de oliva", "quesos", "conservas premium"],
        "importance": "alta", "target_markets": ["US", "CA"],
        "description": "Edición de verano del Fancy Food Show. Menos internacional pero más retailer USA.",
        "prep_days": 90,
    },
    {
        "name": "ProWein", "city": "Düsseldorf", "country": "DE", "date": "2026-03-15",
        "duration_days": 3, "category": ["vino", "bebidas"],
        "importance": "crítica para vino", "target_markets": ["DE", "EU", "global"],
        "description": "Feria internacional de vino más importante del mundo.",
        "prep_days": 120,
    },
    {
        "name": "Vinexpo Paris", "city": "París", "country": "FR", "date": "2026-02-09",
        "duration_days": 3, "category": ["vino"],
        "importance": "alta para vino", "target_markets": ["FR", "EU"],
        "description": "Feria de vino en París alternada con Burdeos.",
        "prep_days": 90,
    },
    {
        "name": "Biofach", "city": "Núremberg", "country": "DE", "date": "2026-02-10",
        "duration_days": 4, "category": ["orgánico", "aceite de oliva eco", "general eco"],
        "importance": "crítica para orgánicos", "target_markets": ["DE", "EU", "global_organic"],
        "description": "Feria líder mundial de productos orgánicos.",
        "prep_days": 90,
    },
    {
        "name": "Alimentaria Barcelona", "city": "Barcelona", "country": "ES", "date": "2026-03-23",
        "duration_days": 4, "category": ["general"],
        "importance": "alta", "target_markets": ["EU", "LATAM", "global"],
        "description": "Feria líder en España. Ideal para importadores extranjeros que visitan.",
        "prep_days": 60,
    },
]


def get_trade_shows(countries: list, category: Optional[str] = None) -> dict:
    """Return upcoming trade shows relevant to producer's target markets and category."""
    today = datetime.now(timezone.utc).date()
    target_set = {c.upper() for c in (countries or [])}

    relevant = []
    for show in TRADE_SHOWS_2026:
        try:
            show_date = datetime.strptime(show["date"], "%Y-%m-%d").date()
        except ValueError:
            continue
        days_until = (show_date - today).days
        if days_until < -5:  # skip events >5 days past
            continue

        # Market match
        market_match = False
        show_markets = {m.upper() for m in show.get("target_markets", [])}
        if target_set & show_markets or "GLOBAL" in show_markets or "global" in show.get("target_markets", []):
            market_match = True
        if not target_set:
            market_match = True  # no filter

        # Category match
        cat_match = True
        if category:
            show_cats = [c.lower() for c in show.get("category", [])]
            cat_match = any(category.lower() in c or c in category.lower() for c in show_cats)

        if market_match and cat_match:
            relevant.append({
                **show,
                "days_until": days_until,
                "should_start_prep": 0 < days_until <= show.get("prep_days", 90),
                "is_past": days_until < 0,
                "is_imminent": 0 <= days_until <= 30,
            })

    relevant.sort(key=lambda x: abs(x["days_until"]))
    return {
        "today": today.isoformat(),
        "total_shows": len(relevant),
        "shows": relevant[:10],
    }


# ═══════════════════════════════════════════════════════
# B2B OFFER INTEGRATION (drafts + send)
# ═══════════════════════════════════════════════════════

async def create_b2b_offer_draft(db, producer_id: str, importer_id: str,
                                  product_id: Optional[str], volume_kg: float,
                                  price_eur_kg: float, incoterm: str = "FOB",
                                  notes: str = "") -> dict:
    """Create a draft B2B offer in the database. Status: 'draft' (not sent yet)."""
    if volume_kg <= 0 or price_eur_kg <= 0:
        return {"success": False, "error": "Volumen y precio deben ser > 0"}

    importer = await _find_importer(db, importer_id)
    if not importer:
        return {"success": False, "error": "Importador no encontrado"}

    # Verify product if specified
    product = None
    if product_id:
        product = await db.products.find_one(
            {"product_id": product_id, "producer_id": producer_id}, {"_id": 0},
        )
        if not product:
            return {"success": False, "error": "Producto no encontrado o no te pertenece"}

    offer = {
        "offer_id": f"offer_{uuid.uuid4().hex[:12]}",
        "producer_id": producer_id,
        "importer_id": importer_id,
        "product_id": product_id,
        "product_name": product.get("name") if product else None,
        "volume_kg": volume_kg,
        "price_eur_kg": price_eur_kg,
        "total_eur": round(volume_kg * price_eur_kg, 2),
        "incoterm": incoterm,
        "notes": notes,
        "status": "draft",
        "created_by": "pedro_ai",
        "created_at": datetime.now(timezone.utc),
        "sent_at": None,
    }
    await db.pedro_b2b_offers.insert_one(offer)
    return {
        "success": True,
        "offer_id": offer["offer_id"],
        "status": "draft",
        "total_eur": offer["total_eur"],
        "message": f"Borrador de oferta creado para {importer.get('company_name', 'importador')}. Revísalo antes de enviar.",
    }


async def send_offer_to_importer(db, producer_id: str, offer_id: str) -> dict:
    """Mark a draft offer as sent + create entry in b2b_operations if available.
    Uses atomic find_one_and_update to prevent double-send race conditions."""
    now = datetime.now(timezone.utc)

    # Atomic transition: only succeeds if status is currently 'draft'
    offer = await db.pedro_b2b_offers.find_one_and_update(
        {"offer_id": offer_id, "producer_id": producer_id, "status": "draft"},
        {"$set": {"status": "sent", "sent_at": now}},
        return_document=False,  # return the pre-update doc
    )
    if not offer:
        # Either not found, not ours, or already sent
        existing = await db.pedro_b2b_offers.find_one(
            {"offer_id": offer_id, "producer_id": producer_id}, {"_id": 0, "status": 1},
        )
        if not existing:
            return {"success": False, "error": "Oferta no encontrada o no te pertenece"}
        return {"success": False, "error": f"Oferta en estado '{existing.get('status')}', ya no es draft"}

    # Also create in db.b2b_operations if collection exists (integration)
    try:
        await db.b2b_operations.insert_one({
            "operation_id": f"op_{uuid.uuid4().hex[:12]}",
            "producer_id": producer_id,
            "importer_id": offer["importer_id"],
            "source": "pedro_ai_offer",
            "offer_ref": offer_id,
            "product_id": offer.get("product_id"),
            "volume_kg": offer["volume_kg"],
            "price_eur_kg": offer["price_eur_kg"],
            "total_eur": offer["total_eur"],
            "incoterm": offer["incoterm"],
            "status": "offer_sent",
            "created_at": now,
        })
    except Exception as e:
        logger.warning("Could not create b2b_operation (non-critical): %s", e)

    # Auto-add to pipeline
    await manage_pipeline(db, producer_id, "add",
                         importer_id=offer["importer_id"],
                         stage="offer_sent",
                         notes=f"Oferta {offer_id} enviada")

    return {
        "success": True,
        "offer_id": offer_id,
        "message": "Oferta enviada al importador. Añadida al pipeline automáticamente.",
    }


# ═══════════════════════════════════════════════════════
# LEAD PIPELINE TRACKING
# ═══════════════════════════════════════════════════════

PIPELINE_STAGES = ["contacted", "interested", "negotiating", "offer_sent", "closed_won", "closed_lost", "cold"]


async def manage_pipeline(db, producer_id: str, operation: str,
                          importer_id: Optional[str] = None,
                          stage: Optional[str] = None,
                          notes: Optional[str] = None,
                          lead_id: Optional[str] = None) -> dict:
    """
    Operations: 'list', 'add', 'update', 'remove'
    Stages: contacted, interested, negotiating, offer_sent, closed_won, closed_lost, cold
    """
    # Validate stage early for any operation that uses it
    if stage and stage not in PIPELINE_STAGES:
        return {"error": f"Stage inválido '{stage}'. Válidos: {', '.join(PIPELINE_STAGES)}"}

    if operation == "list":
        leads = await db.pedro_pipeline.find(
            {"user_id": producer_id}, {"_id": 0},
        ).sort("updated_at", -1).to_list(50)

        # Enrich with importer name
        for lead in leads:
            imp_id = lead.get("importer_id")
            if imp_id:
                try:
                    from bson import ObjectId
                    imp = await db.importers.find_one({"_id": ObjectId(imp_id)}, {"_id": 0, "company_name": 1, "country": 1})
                except Exception:
                    imp = await db.importers.find_one({"importer_id": imp_id}, {"_id": 0, "company_name": 1, "country": 1})
                if imp:
                    lead["importer_name"] = imp.get("company_name", "")
                    lead["importer_country"] = imp.get("country", "")

            # Score the lead
            days_since_update = 999
            if lead.get("updated_at"):
                try:
                    updated = lead["updated_at"]
                    if isinstance(updated, str):
                        updated = datetime.fromisoformat(updated.replace("Z", "+00:00"))
                    days_since_update = (datetime.now(timezone.utc) - updated).days
                except Exception:
                    pass
            lead["days_since_update"] = days_since_update
            lead["heat"] = "hot" if days_since_update < 7 else "warm" if days_since_update < 21 else "cold"

        # Group by stage
        by_stage: dict[str, list] = {s: [] for s in PIPELINE_STAGES}
        for lead in leads:
            s = lead.get("stage", "contacted")
            if s not in by_stage:
                by_stage[s] = []
            by_stage[s].append(lead)

        return {
            "total": len(leads),
            "by_stage": {k: v for k, v in by_stage.items() if v},
            "leads": leads,
        }

    if operation == "add":
        if not importer_id:
            return {"error": "importer_id requerido"}

        # Check if already exists for this producer+importer
        existing = await db.pedro_pipeline.find_one({
            "user_id": producer_id, "importer_id": importer_id,
        })
        if existing:
            # Update stage instead
            await db.pedro_pipeline.update_one(
                {"lead_id": existing["lead_id"]},
                {"$set": {
                    "stage": stage or existing.get("stage", "contacted"),
                    "notes": notes or existing.get("notes", ""),
                    "updated_at": datetime.now(timezone.utc),
                }},
            )
            return {"success": True, "lead_id": existing["lead_id"], "message": "Lead existente actualizado"}

        lead = {
            "lead_id": f"lead_{uuid.uuid4().hex[:12]}",
            "user_id": producer_id,
            "importer_id": importer_id,
            "stage": stage or "contacted",
            "notes": notes or "",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        await db.pedro_pipeline.insert_one(lead)
        return {"success": True, "lead_id": lead["lead_id"], "message": "Lead añadido al pipeline"}

    if operation == "update":
        if not lead_id:
            return {"error": "lead_id requerido"}
        if stage and stage not in PIPELINE_STAGES:
            return {"error": f"Stage inválido. Válidos: {', '.join(PIPELINE_STAGES)}"}
        update: dict[str, Any] = {"updated_at": datetime.now(timezone.utc)}
        if stage:
            update["stage"] = stage
        if notes is not None:
            update["notes"] = notes
        result = await db.pedro_pipeline.update_one(
            {"lead_id": lead_id, "user_id": producer_id}, {"$set": update},
        )
        if result.matched_count == 0:
            return {"error": "Lead no encontrado"}
        return {"success": True, "message": "Lead actualizado"}

    if operation == "remove":
        if not lead_id:
            return {"error": "lead_id requerido"}
        result = await db.pedro_pipeline.delete_one(
            {"lead_id": lead_id, "user_id": producer_id},
        )
        return {"success": result.deleted_count > 0}

    return {"error": f"Operación desconocida: {operation}"}


# ═══════════════════════════════════════════════════════
# EXPORT GOALS
# ═══════════════════════════════════════════════════════

async def manage_export_goals(db, producer_id: str, operation: str,
                               goal_type: Optional[str] = None,
                               target: Optional[float] = None,
                               target_market: Optional[str] = None) -> dict:
    """
    Operations: 'list', 'set', 'celebrate_check'
    Goal types: 'first_contract', 'new_market_entry', 'export_revenue', 'new_importers'
    """
    if operation == "list":
        goals = await db.pedro_export_goals.find(
            {"user_id": producer_id, "status": "active"}, {"_id": 0},
        ).to_list(20)
        for g in goals:
            g["current_progress"] = await _compute_export_goal_progress(db, producer_id, g)
            g["progress_pct"] = round(100 * g["current_progress"] / max(g.get("target", 1), 1), 1)
        return {"goals": goals, "count": len(goals)}

    if operation == "set":
        if not goal_type:
            return {"error": "goal_type requerido"}
        valid_types = {"first_contract", "new_market_entry", "export_revenue", "new_importers"}
        if goal_type not in valid_types:
            return {"error": f"goal_type debe ser uno de: {', '.join(valid_types)}"}

        now = datetime.now(timezone.utc)
        goal = {
            "goal_id": f"egoal_{uuid.uuid4().hex[:12]}",
            "user_id": producer_id,
            "type": goal_type,
            "target": target or 1,
            "target_market": target_market,
            "period_start": now,
            "period_end": now + timedelta(days=180),  # 6 months
            "status": "active",
            "created_at": now,
        }
        await db.pedro_export_goals.insert_one(goal)
        return {
            "success": True,
            "goal_id": goal["goal_id"],
            "message": f"Objetivo de exportación creado: {goal_type} - {target} en {target_market or 'cualquier mercado'}",
        }

    if operation == "celebrate_check":
        # Check all active goals for completion or milestones
        goals = await db.pedro_export_goals.find(
            {"user_id": producer_id, "status": "active"}, {"_id": 0},
        ).to_list(20)
        celebrations = []
        for g in goals:
            progress = await _compute_export_goal_progress(db, producer_id, g)
            pct = 100 * progress / max(g.get("target", 1), 1)
            if pct >= 100:
                await db.pedro_export_goals.update_one(
                    {"goal_id": g["goal_id"]},
                    {"$set": {"status": "achieved", "achieved_at": datetime.now(timezone.utc)}},
                )
                celebrations.append({
                    "type": "achieved",
                    "goal": g["type"],
                    "target": g["target"],
                    "target_market": g.get("target_market"),
                    "message": f"¡Objetivo de {g['type']} cumplido! ({progress}/{g['target']})",
                })
            elif 75 <= pct < 100:
                celebrations.append({
                    "type": "milestone_75",
                    "goal": g["type"],
                    "progress_pct": round(pct, 1),
                    "message": f"Al {round(pct, 1)}% del objetivo de {g['type']}",
                })
        return {"celebrations": celebrations}

    return {"error": f"Operación desconocida: {operation}"}


async def _compute_export_goal_progress(db, producer_id: str, goal: dict) -> float:
    """Compute progress for an export goal."""
    goal_type = goal.get("type")
    period_start = goal.get("period_start")
    if not period_start:
        return 0

    if goal_type == "first_contract":
        offers = await db.pedro_b2b_offers.count_documents({
            "producer_id": producer_id,
            "status": {"$in": ["sent", "accepted"]},
            "sent_at": {"$gte": period_start},
        })
        return min(offers, 1)

    if goal_type == "new_market_entry":
        target_market = goal.get("target_market", "")
        offers = await db.pedro_b2b_offers.find(
            {"producer_id": producer_id, "status": {"$ne": "draft"}},
            {"_id": 0, "importer_id": 1},
        ).to_list(100)
        markets = set()
        for o in offers:
            imp_id = o.get("importer_id")
            if imp_id:
                try:
                    from bson import ObjectId
                    imp = await db.importers.find_one({"_id": ObjectId(imp_id)}, {"country": 1})
                except Exception:
                    imp = await db.importers.find_one({"importer_id": imp_id}, {"country": 1})
                if imp:
                    markets.add(imp.get("country", "").lower())
        if target_market and target_market.lower() in markets:
            return 1
        return 0

    if goal_type == "new_importers":
        count = await db.pedro_b2b_offers.count_documents({
            "producer_id": producer_id,
            "status": {"$ne": "draft"},
            "sent_at": {"$gte": period_start},
        })
        return count

    if goal_type == "export_revenue":
        offers = await db.pedro_b2b_offers.find(
            {"producer_id": producer_id, "status": "accepted",
             "sent_at": {"$gte": period_start}},
            {"_id": 0, "total_eur": 1},
        ).to_list(200)
        return sum(o.get("total_eur", 0) for o in offers)

    return 0


# ═══════════════════════════════════════════════════════
# DETECT EXPORT OPPORTUNITIES (onboarding diagnosis)
# ═══════════════════════════════════════════════════════

async def detect_export_opportunities(db, producer_id: str) -> dict:
    """
    Analyze producer's catalog and return top 3 export opportunities.
    Used in onboarding diagnosis + dynamic frontend cards.
    """
    from services.commercial_ai_tools import MARKET_DATA

    products = await db.products.find(
        {"producer_id": producer_id, "approved": True}, {"_id": 0},
    ).to_list(50)

    if not products:
        return {
            "opportunities": [],
            "all_markets_scored": [],
            "producer_main_category": None,
            "producer_certifications": [],
            "message": "Necesitas productos aprobados para analizar oportunidades de exportación.",
        }

    # Aggregate producer's categories + certifications
    categories: dict[str, int] = {}
    all_certs = set()
    for p in products:
        cat = (p.get("category_id") or "").lower()
        if cat:
            categories[cat] = categories.get(cat, 0) + 1
        for c in p.get("certifications", []) or []:
            all_certs.add(str(c).lower())

    main_category = max(categories.items(), key=lambda x: x[1])[0] if categories else "general"

    # Score each market in MARKET_DATA
    opportunities = []
    for code, market in MARKET_DATA.items():
        score = 50

        # Growth weight
        score += market.get("growth_yoy_pct", 0) * 3

        # Does the market demand this category?
        top_cats = [c.lower() for c in market.get("top_categories", [])]
        if any(main_category in tc or tc in main_category for tc in top_cats):
            score += 20

        # Are there importers on the platform for this market?
        importer_count = await db.importers.count_documents({
            "country": {"$regex": market["name"], "$options": "i"},
            "is_verified": True,
        })
        score += min(importer_count * 2, 15)

        # Tariff penalty
        score -= market.get("tariff_pct", 0) * 2

        # Avg price = opportunity for premium
        avg_price = market.get("avg_prices_eur_kg", {}).get(main_category, 0)
        if avg_price >= 10:
            score += 10

        opportunities.append({
            "country_code": code,
            "country_name": market["name"],
            "flag": market.get("flag", ""),
            "category": main_category,
            "growth_yoy_pct": market.get("growth_yoy_pct", 0),
            "avg_price_eur_kg": avg_price,
            "tariff_pct": market.get("tariff_pct", 0),
            "importers_on_platform": importer_count,
            "score": round(score, 1),
            "headline": f"{market['name']}: {main_category} creciendo {market.get('growth_yoy_pct', 0)}% YoY",
            "reason": f"Precio medio {avg_price}€/kg, {importer_count} importadores verificados, arancel {market.get('tariff_pct', 0)}%",
        })

    opportunities.sort(key=lambda x: -x["score"])
    return {
        "opportunities": opportunities[:3],
        "all_markets_scored": opportunities,
        "producer_main_category": main_category,
        "producer_certifications": list(all_certs),
    }


# ═══════════════════════════════════════════════════════
# PROACTIVE ALERTS + MONTHLY BRIEFING
# ═══════════════════════════════════════════════════════

async def generate_pedro_alerts(db, producer_id: str) -> list[dict]:
    """Generate export-specific alerts."""
    alerts = []

    # Alert 1: Drafts sin enviar >7 días
    since_week = datetime.now(timezone.utc) - timedelta(days=7)
    stale_drafts = await db.pedro_b2b_offers.count_documents({
        "producer_id": producer_id,
        "status": "draft",
        "created_at": {"$lt": since_week},
    })
    if stale_drafts > 0:
        alerts.append({
            "severity": "medium",
            "type": "stale_drafts",
            "message": f"{stale_drafts} borrador(es) de oferta sin enviar >7 días",
            "action": "Revisar y enviar borradores pendientes",
        })

    # Alert 2: Leads fríos (sin update >21 días)
    since_3w = datetime.now(timezone.utc) - timedelta(days=21)
    cold_leads = await db.pedro_pipeline.count_documents({
        "user_id": producer_id,
        "stage": {"$nin": ["closed_won", "closed_lost", "cold"]},
        "updated_at": {"$lt": since_3w},
    })
    if cold_leads > 0:
        alerts.append({
            "severity": "medium",
            "type": "cold_leads",
            "message": f"{cold_leads} lead(s) sin actividad >21 días",
            "action": "Enviar follow-up o marcar como fríos",
        })

    # Alert 3: Ferias próximas (<30 días)
    profile = await db.pedro_profiles.find_one({"user_id": producer_id}, {"_id": 0})
    if profile:
        targets = profile.get("export_profile", {}).get("target_markets", [])
        if targets:
            shows = get_trade_shows(targets)
            for show in shows["shows"][:3]:
                if 0 <= show.get("days_until", 999) <= 30:
                    alerts.append({
                        "severity": "high",
                        "type": "trade_show_imminent",
                        "message": f"{show['name']} en {show['days_until']} días ({show['city']})",
                        "action": "Preparar material / confirmar asistencia",
                    })

    # Alert 4: Ofertas aceptadas (good news!)
    since_month = datetime.now(timezone.utc) - timedelta(days=30)
    accepted = await db.pedro_b2b_offers.count_documents({
        "producer_id": producer_id,
        "status": "accepted",
        "sent_at": {"$gte": since_month},
    })
    if accepted > 0:
        alerts.append({
            "severity": "low",
            "type": "offer_accepted",
            "message": f"{accepted} oferta(s) aceptada(s) este mes",
            "action": "Revisar contratos pendientes",
        })

    return alerts


async def generate_monthly_briefing(db, producer_id: str) -> dict:
    """Generate Pedro's monthly export briefing."""
    since_month = datetime.now(timezone.utc) - timedelta(days=30)
    since_2m = datetime.now(timezone.utc) - timedelta(days=60)

    # Current month offers
    offers_month = await db.pedro_b2b_offers.find(
        {"producer_id": producer_id, "sent_at": {"$gte": since_month}},
        {"_id": 0},
    ).to_list(100)

    offers_prev = await db.pedro_b2b_offers.count_documents({
        "producer_id": producer_id,
        "sent_at": {"$gte": since_2m, "$lt": since_month},
    })

    sent_count = len(offers_month)
    accepted_count = sum(1 for o in offers_month if o.get("status") == "accepted")
    total_value = sum(o.get("total_eur", 0) for o in offers_month if o.get("status") == "accepted")

    change_pct = 0
    if offers_prev > 0:
        change_pct = round(100 * (sent_count - offers_prev) / offers_prev, 1)

    # Pipeline summary
    pipeline = await manage_pipeline(db, producer_id, "list")
    active_leads = pipeline.get("total", 0)

    # Alerts + opportunities + shows
    alerts = await generate_pedro_alerts(db, producer_id)
    opportunities = await detect_export_opportunities(db, producer_id)

    profile = await db.pedro_profiles.find_one({"user_id": producer_id}, {"_id": 0}) or {}
    targets = profile.get("export_profile", {}).get("target_markets", [])
    shows = get_trade_shows(targets)

    # Recommended actions
    actions = []
    if alerts:
        actions.append({
            "priority": 1,
            "title": alerts[0]["message"],
            "action": alerts[0]["action"],
            "why": "Urgente — impacta tus ventas B2B",
        })
    if opportunities.get("opportunities"):
        top = opportunities["opportunities"][0]
        actions.append({
            "priority": 2,
            "title": f"Oportunidad: {top['country_name']}",
            "action": f"Analiza {top['country_name']} y busca importadores",
            "why": top.get("reason", ""),
        })
    if shows.get("shows"):
        next_show = shows["shows"][0]
        if 30 < next_show.get("days_until", 999) < 120:
            actions.append({
                "priority": 3,
                "title": f"Preparar {next_show['name']}",
                "action": f"Comenzar preparación para {next_show['name']} ({next_show['city']})",
                "why": f"Faltan {next_show['days_until']} días",
            })

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "period": "last_30_days",
        "summary": {
            "offers_sent": sent_count,
            "offers_accepted": accepted_count,
            "conversion_rate": round(100 * accepted_count / max(sent_count, 1), 1),
            "total_revenue_eur": round(total_value, 2),
            "change_pct_vs_prev_month": change_pct,
            "active_pipeline_leads": active_leads,
        },
        "alerts": alerts,
        "top_opportunities": opportunities.get("opportunities", [])[:3],
        "upcoming_trade_shows": [s for s in shows.get("shows", []) if s.get("days_until", 999) > 0][:3],
        "recommended_actions": actions[:3],
    }
