"""
Commercial AI Tools — Tool implementations for the ELITE producer agent.
Static market data for 9 key export markets + async tool functions.
"""
import io
import json
from datetime import datetime, timezone

from core.database import db


# ─────────────────────────────────────────────
# STATIC MARKET DATA — 9 countries
# ─────────────────────────────────────────────

MARKET_DATA = {
    "DE": {
        "name": "Alemania",
        "flag": "🇩🇪",
        "population_m": 84,
        "gdp_per_capita_eur": 48_000,
        "spanish_food_imports_eur_m": 2_850,
        "growth_yoy_pct": 6.2,
        "top_categories": ["aceite de oliva", "vino", "embutidos", "conservas"],
        "tariff_pct": 0,  # EU
        "labeling_languages": ["de"],
        "certifications_required": ["CE", "HACCP"],
        "phytosanitary": False,
        "key_retailers": ["REWE", "Edeka", "Aldi Süd", "Lidl"],
        "seasonality": {"peak": ["nov", "dic"], "low": ["jun", "jul"]},
        "avg_prices_eur_kg": {
            "aceite de oliva": 9.50,
            "jamón ibérico": 45.00,
            "vino tinto": 6.80,
            "queso manchego": 18.00,
        },
        "competitors": ["Italia", "Grecia", "Túnez"],
    },
    "FR": {
        "name": "Francia",
        "flag": "🇫🇷",
        "population_m": 68,
        "gdp_per_capita_eur": 42_000,
        "spanish_food_imports_eur_m": 3_200,
        "growth_yoy_pct": 4.8,
        "top_categories": ["vino", "aceite de oliva", "frutas", "embutidos"],
        "tariff_pct": 0,
        "labeling_languages": ["fr"],
        "certifications_required": ["CE", "HACCP"],
        "phytosanitary": False,
        "key_retailers": ["Carrefour", "Leclerc", "Auchan", "Monoprix"],
        "seasonality": {"peak": ["dic", "ene"], "low": ["jul", "ago"]},
        "avg_prices_eur_kg": {
            "aceite de oliva": 10.20,
            "jamón ibérico": 52.00,
            "vino tinto": 7.50,
            "queso manchego": 20.00,
        },
        "competitors": ["Italia", "Portugal", "Grecia"],
    },
    "GB": {
        "name": "Reino Unido",
        "flag": "🇬🇧",
        "population_m": 67,
        "gdp_per_capita_eur": 40_000,
        "spanish_food_imports_eur_m": 1_950,
        "growth_yoy_pct": 8.1,
        "top_categories": ["aceite de oliva", "vino", "conservas", "snacks gourmet"],
        "tariff_pct": 2.5,  # Post-Brexit TCA
        "labeling_languages": ["en"],
        "certifications_required": ["UKCA", "HACCP", "BRC"],
        "phytosanitary": True,
        "key_retailers": ["Tesco", "Sainsbury's", "Waitrose", "M&S Food"],
        "seasonality": {"peak": ["nov", "dic"], "low": ["jun", "jul"]},
        "avg_prices_eur_kg": {
            "aceite de oliva": 11.00,
            "jamón ibérico": 55.00,
            "vino tinto": 8.00,
            "queso manchego": 22.00,
        },
        "competitors": ["Italia", "Grecia", "Turquía"],
    },
    "US": {
        "name": "Estados Unidos",
        "flag": "🇺🇸",
        "population_m": 335,
        "gdp_per_capita_eur": 65_000,
        "spanish_food_imports_eur_m": 1_400,
        "growth_yoy_pct": 12.5,
        "top_categories": ["aceite de oliva", "vino", "quesos", "conservas premium"],
        "tariff_pct": 5.0,
        "labeling_languages": ["en"],
        "certifications_required": ["FDA", "HACCP", "FSMA"],
        "phytosanitary": True,
        "key_retailers": ["Whole Foods", "Trader Joe's", "Kroger", "Costco"],
        "seasonality": {"peak": ["nov", "dic", "feb"], "low": ["ago", "sep"]},
        "avg_prices_eur_kg": {
            "aceite de oliva": 13.00,
            "jamón ibérico": 65.00,
            "vino tinto": 9.50,
            "queso manchego": 28.00,
        },
        "competitors": ["Italia", "Grecia", "California (local)"],
    },
    "JP": {
        "name": "Japón",
        "flag": "🇯🇵",
        "population_m": 125,
        "gdp_per_capita_eur": 35_000,
        "spanish_food_imports_eur_m": 580,
        "growth_yoy_pct": 15.3,
        "top_categories": ["aceite de oliva", "jamón ibérico", "vino", "azafrán"],
        "tariff_pct": 3.8,  # EU-Japan EPA
        "labeling_languages": ["ja"],
        "certifications_required": ["JAS", "HACCP"],
        "phytosanitary": True,
        "key_retailers": ["Isetan Mitsukoshi", "Takashimaya", "Dean & Deluca"],
        "seasonality": {"peak": ["dic", "mar"], "low": ["ago"]},
        "avg_prices_eur_kg": {
            "aceite de oliva": 15.00,
            "jamón ibérico": 85.00,
            "vino tinto": 12.00,
            "queso manchego": 35.00,
        },
        "competitors": ["Italia", "Australia", "Chile"],
    },
    "IT": {
        "name": "Italia",
        "flag": "🇮🇹",
        "population_m": 59,
        "gdp_per_capita_eur": 36_000,
        "spanish_food_imports_eur_m": 1_100,
        "growth_yoy_pct": 3.2,
        "top_categories": ["aceite de oliva (granel)", "vino", "cítricos", "conservas"],
        "tariff_pct": 0,
        "labeling_languages": ["it"],
        "certifications_required": ["CE", "HACCP"],
        "phytosanitary": False,
        "key_retailers": ["Esselunga", "Conad", "Coop", "Eataly"],
        "seasonality": {"peak": ["oct", "nov"], "low": ["jul", "ago"]},
        "avg_prices_eur_kg": {
            "aceite de oliva": 7.80,
            "vino tinto": 5.50,
            "queso manchego": 16.00,
        },
        "competitors": ["Grecia", "Túnez", "Turquía"],
    },
    "NL": {
        "name": "Países Bajos",
        "flag": "🇳🇱",
        "population_m": 18,
        "gdp_per_capita_eur": 52_000,
        "spanish_food_imports_eur_m": 920,
        "growth_yoy_pct": 7.4,
        "top_categories": ["frutas", "aceite de oliva", "vino", "conservas"],
        "tariff_pct": 0,
        "labeling_languages": ["nl"],
        "certifications_required": ["CE", "HACCP", "BRC"],
        "phytosanitary": False,
        "key_retailers": ["Albert Heijn", "Jumbo", "Plus", "Marqt"],
        "seasonality": {"peak": ["nov", "dic"], "low": ["jul", "ago"]},
        "avg_prices_eur_kg": {
            "aceite de oliva": 9.80,
            "vino tinto": 7.00,
            "queso manchego": 19.00,
        },
        "competitors": ["Italia", "Grecia", "Portugal"],
    },
    "SE": {
        "name": "Suecia",
        "flag": "🇸🇪",
        "population_m": 10,
        "gdp_per_capita_eur": 50_000,
        "spanish_food_imports_eur_m": 340,
        "growth_yoy_pct": 9.8,
        "top_categories": ["aceite de oliva", "vino", "conservas", "frutos secos"],
        "tariff_pct": 0,
        "labeling_languages": ["sv"],
        "certifications_required": ["CE", "HACCP"],
        "phytosanitary": False,
        "key_retailers": ["ICA", "Coop", "Hemköp", "Axfood"],
        "seasonality": {"peak": ["nov", "dic", "mar"], "low": ["jun", "jul"]},
        "avg_prices_eur_kg": {
            "aceite de oliva": 12.00,
            "vino tinto": 9.00,
            "queso manchego": 24.00,
        },
        "competitors": ["Italia", "Grecia", "Chile"],
    },
    "AE": {
        "name": "Emiratos Árabes",
        "flag": "🇦🇪",
        "population_m": 10,
        "gdp_per_capita_eur": 42_000,
        "spanish_food_imports_eur_m": 280,
        "growth_yoy_pct": 18.6,
        "top_categories": ["aceite de oliva", "conservas premium", "snacks", "azafrán"],
        "tariff_pct": 5.0,
        "labeling_languages": ["ar", "en"],
        "certifications_required": ["Halal", "HACCP", "ESMA"],
        "phytosanitary": True,
        "key_retailers": ["Spinneys", "Waitrose UAE", "Carrefour UAE", "Gourmet Tower"],
        "seasonality": {"peak": ["oct", "nov", "dic"], "low": ["jun", "jul", "ago"]},
        "avg_prices_eur_kg": {
            "aceite de oliva": 14.00,
            "azafrán": 8_500.00,
            "queso manchego": 30.00,
        },
        "competitors": ["Italia", "Turquía", "Líbano"],
    },
}

# Country name → code mapping for fuzzy matching
_COUNTRY_ALIASES = {}
for _code, _data in MARKET_DATA.items():
    _COUNTRY_ALIASES[_data["name"].lower()] = _code
    _COUNTRY_ALIASES[_code.lower()] = _code

# Extra aliases
_COUNTRY_ALIASES.update({
    "germany": "DE", "alemania": "DE",
    "france": "FR", "francia": "FR",
    "united kingdom": "GB", "uk": "GB", "reino unido": "GB", "gran bretaña": "GB",
    "united states": "US", "usa": "US", "estados unidos": "US", "eeuu": "US",
    "japan": "JP", "japón": "JP", "japon": "JP",
    "italy": "IT", "italia": "IT",
    "netherlands": "NL", "holanda": "NL", "países bajos": "NL", "paises bajos": "NL",
    "sweden": "SE", "suecia": "SE",
    "uae": "AE", "emiratos": "AE", "emiratos árabes": "AE", "emiratos arabes": "AE",
    "dubai": "AE",
})


def _resolve_country(raw: str) -> dict | None:
    """Resolve a country name/code to market data."""
    key = raw.strip().lower()
    code = _COUNTRY_ALIASES.get(key)
    if code:
        return MARKET_DATA[code]
    # Partial match
    for alias, c in _COUNTRY_ALIASES.items():
        if key in alias or alias in key:
            return MARKET_DATA[c]
    return None


# ─────────────────────────────────────────────
# TOOL FUNCTIONS
# ─────────────────────────────────────────────

async def search_importers(country: str, product_category: str = None,
                           certifications: list = None, min_volume: float = None) -> list:
    """Search verified importers by country from the database, with fallback to static data."""
    market = _resolve_country(country)

    # Try database first
    query = {"is_verified": True}
    if market:
        query["country"] = {"$regex": market["name"], "$options": "i"}
    else:
        query["country"] = {"$regex": country, "$options": "i"}

    if product_category:
        query["categories"] = {"$regex": product_category, "$options": "i"}

    importers = await db.importers.find(query).limit(5).to_list(length=5)

    if importers:
        return [
            {
                "id": str(imp["_id"]),
                "company": imp.get("company_name", ""),
                "country": imp.get("country", ""),
                "categories": imp.get("categories", []),
                "min_order_kg": imp.get("min_volume_kg", 0),
                "certifications": imp.get("certifications", []),
                "contact_available": True,
            }
            for imp in importers
        ]

    # Fallback: static suggestions based on market data
    if not market:
        return [{"info": f"No se encontraron importadores en '{country}'. Mercados disponibles: {', '.join(d['name'] for d in MARKET_DATA.values())}"}]

    return [
        {
            "info": f"No hay importadores verificados en {market['name']} todavía.",
            "market_size_eur_m": market["spanish_food_imports_eur_m"],
            "growth_pct": market["growth_yoy_pct"],
            "key_retailers": market["key_retailers"],
            "suggestion": "Publica tu catálogo en Hispaloshop para recibir solicitudes de importadores.",
        }
    ]


async def analyze_market(country: str, product_category: str) -> dict:
    """Full market analysis for a country + product category."""
    market = _resolve_country(country)
    if not market:
        available = ", ".join(d["name"] for d in MARKET_DATA.values())
        return {"error": f"Mercado '{country}' no disponible. Disponibles: {available}"}

    avg_price = market["avg_prices_eur_kg"].get(product_category.lower())

    # Count active importers in DB for this market
    importer_count = await db.importers.count_documents({
        "country": {"$regex": market["name"], "$options": "i"},
        "is_verified": True,
    })

    return {
        "country": market["name"],
        "flag": market["flag"],
        "category": product_category,
        "market_size_eur_m": market["spanish_food_imports_eur_m"],
        "growth_yoy_pct": market["growth_yoy_pct"],
        "gdp_per_capita_eur": market["gdp_per_capita_eur"],
        "population_m": market["population_m"],
        "avg_import_price_eur_kg": avg_price or "Sin datos para esta categoría",
        "tariff_pct": market["tariff_pct"],
        "top_categories": market["top_categories"],
        "competitors": market["competitors"],
        "key_retailers": market["key_retailers"],
        "seasonality": market["seasonality"],
        "labeling_languages": market["labeling_languages"],
        "certifications_required": market["certifications_required"],
        "phytosanitary_required": market["phytosanitary"],
        "importers_on_platform": importer_count,
    }


async def predict_demand(product_category: str, country: str, months: int = 6) -> dict:
    """Demand prediction based on static market data + historical orders."""
    market = _resolve_country(country)
    if not market:
        return {"error": f"Mercado '{country}' no disponible."}

    base_price = market["avg_prices_eur_kg"].get(product_category.lower(), 10.0)
    growth = market["growth_yoy_pct"]
    peak = market["seasonality"]["peak"]

    # Estimate monthly volume
    monthly_volume_kg = int(market["spanish_food_imports_eur_m"] * 1_000_000 / base_price / 12 * 0.01)

    # Generate monthly forecast
    forecast = []
    month_names = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
    now = datetime.now(timezone.utc)
    for i in range(months):
        month_idx = (now.month - 1 + i) % 12
        name = month_names[month_idx]
        multiplier = 1.3 if name in peak else 0.85 if name in market["seasonality"]["low"] else 1.0
        forecast.append({
            "month": name,
            "estimated_volume_kg": int(monthly_volume_kg * multiplier * (1 + growth / 100 * i / 12)),
            "estimated_price_eur_kg": round(base_price * (1 + growth / 200 * i / 12), 2),
            "is_peak": name in peak,
        })

    return {
        "country": market["name"],
        "category": product_category,
        "forecast_months": months,
        "trend": "alcista" if growth > 5 else "estable" if growth > 0 else "bajista",
        "growth_yoy_pct": growth,
        "peak_months": peak,
        "monthly_forecast": forecast,
        "total_estimated_volume_kg": sum(f["estimated_volume_kg"] for f in forecast),
        "confidence": "alta" if growth > 10 else "media" if growth > 5 else "baja",
    }


async def generate_contract(
    producer_name: str,
    importer_name: str,
    product: str,
    country: str,
    volume_kg: float,
    price_eur_kg: float,
    incoterm: str = "FOB",
) -> dict:
    """Generate a B2B contract draft as structured data (PDF via ReportLab if available)."""
    market = _resolve_country(country)
    total_eur = round(volume_kg * price_eur_kg, 2)

    contract = {
        "title": f"Contrato de Suministro B2B — Borrador",
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "seller": producer_name,
        "buyer": importer_name,
        "product": product,
        "destination": market["name"] if market else country,
        "volume_kg": volume_kg,
        "price_eur_kg": price_eur_kg,
        "total_eur": total_eur,
        "incoterm": incoterm,
        "payment_terms": "30% anticipo, 70% contra documentos de embarque",
        "delivery_window": "60 días desde confirmación del pedido",
        "quality_clause": "Según normativa UE vigente y certificaciones HACCP",
        "dispute_resolution": "Cámara de Comercio de Sevilla — Arbitraje",
        "certifications_required": market["certifications_required"] if market else ["HACCP"],
        "labeling": market["labeling_languages"] if market else [],
        "tariff_pct": market["tariff_pct"] if market else "Por determinar",
        "status": "BORRADOR — Requiere revisión legal",
    }

    # Try to generate PDF
    pdf_generated = False
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import cm
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib import colors
        import base64

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=2 * cm, rightMargin=2 * cm)
        styles = getSampleStyleSheet()
        story = []

        story.append(Paragraph("CONTRATO DE SUMINISTRO B2B — BORRADOR", styles["Title"]))
        story.append(Spacer(1, 12))
        story.append(Paragraph(f"Fecha: {contract['date']}", styles["Normal"]))
        story.append(Spacer(1, 20))

        data = [
            ["Campo", "Valor"],
            ["Vendedor", producer_name],
            ["Comprador", importer_name],
            ["Producto", product],
            ["Destino", contract["destination"]],
            ["Volumen", f"{volume_kg:,.0f} kg"],
            ["Precio", f"€{price_eur_kg:.2f}/kg"],
            ["Total", f"€{total_eur:,.2f}"],
            ["Incoterm", incoterm],
            ["Pago", contract["payment_terms"]],
            ["Entrega", contract["delivery_window"]],
            ["Arancel", f"{contract['tariff_pct']}%"],
        ]

        table = Table(data, colWidths=[6 * cm, 10 * cm])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.Color(0.047, 0.039, 0.035)),  # stone-950
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.Color(0.78, 0.76, 0.74)),  # stone-300
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(table)
        story.append(Spacer(1, 20))
        story.append(Paragraph(
            "<b>NOTA:</b> Este documento es un borrador generado automáticamente. "
            "Requiere revisión legal antes de su firma.",
            styles["Normal"],
        ))

        doc.build(story)
        pdf_bytes = buffer.getvalue()
        contract["pdf_base64"] = base64.b64encode(pdf_bytes).decode()
        contract["pdf_size_kb"] = round(len(pdf_bytes) / 1024, 1)
        pdf_generated = True
    except ImportError:
        pass

    contract["pdf_generated"] = pdf_generated
    return contract


async def check_producer_plan(producer_id: str) -> dict:
    """Check producer's subscription plan and usage limits."""
    producer = await db.producers.find_one({"user_id": producer_id})
    if not producer:
        return {"error": "Productor no encontrado"}

    plan = producer.get("plan", "free").lower()
    user = await db.users.find_one({"user_id": producer_id}, {"username": 1, "name": 1})

    plan_limits = {
        "free": {"products": 5, "ai_queries_month": 0, "contract_generation": False, "markets": 0},
        "pro": {"products": 50, "ai_queries_month": 20, "contract_generation": False, "markets": 3},
        "elite": {"products": -1, "ai_queries_month": -1, "contract_generation": True, "markets": -1},
    }

    limits = plan_limits.get(plan, plan_limits["free"])
    product_count = await db.products.count_documents({"producer_id": producer_id, "is_active": True})

    return {
        "producer_name": user.get("name") or user.get("username", ""),
        "plan": plan.upper(),
        "limits": limits,
        "current_usage": {
            "active_products": product_count,
        },
        "can_use_commercial_ai": plan == "elite",
        "can_generate_contracts": limits["contract_generation"],
    }


# ─────────────────────────────────────────────
# TOOL DISPATCHER
# ─────────────────────────────────────────────

async def execute_tool(name: str, inputs: dict, producer_id: str) -> dict | list:
    """Dispatch a tool call to its handler."""
    if name == "search_importers":
        return await search_importers(
            country=inputs.get("country", ""),
            product_category=inputs.get("product_category"),
            certifications=inputs.get("certifications"),
            min_volume=inputs.get("min_volume"),
        )
    if name == "analyze_market":
        return await analyze_market(
            country=inputs.get("country", ""),
            product_category=inputs.get("product_category", ""),
        )
    if name == "predict_demand":
        return await predict_demand(
            product_category=inputs.get("product_category", ""),
            country=inputs.get("country", ""),
            months=inputs.get("months", 6),
        )
    if name == "generate_contract":
        return await generate_contract(
            producer_name=inputs.get("producer_name", ""),
            importer_name=inputs.get("importer_name", ""),
            product=inputs.get("product", ""),
            country=inputs.get("country", ""),
            volume_kg=inputs.get("volume_kg", 0),
            price_eur_kg=inputs.get("price_eur_kg", 0),
            incoterm=inputs.get("incoterm", "FOB"),
        )
    if name == "check_producer_plan":
        return await check_producer_plan(producer_id=producer_id)

    # ── Pedro v2 tools ──
    from services import pedro_ai_v2 as v2
    if name == "smart_importer_match":
        return await v2.smart_importer_match(db, producer_id, inputs.get("country", ""),
                                              inputs.get("product_category"), inputs.get("limit", 5))
    if name == "get_market_entry_requirements":
        return v2.get_market_entry_requirements(inputs.get("country", ""), inputs.get("product_category"))
    if name == "calculate_incoterm_costs":
        return v2.calculate_incoterm_costs(
            inputs.get("country", ""), inputs.get("volume_kg", 0),
            inputs.get("price_eur_kg", 0), inputs.get("weight_kg", 0) or inputs.get("volume_kg", 0),
        )
    if name == "generate_pitch":
        return await v2.generate_pitch(db, producer_id, inputs.get("importer_id", ""),
                                       inputs.get("target_language", "en"), inputs.get("pitch_type", "first_contact"))
    if name == "get_trade_shows":
        return v2.get_trade_shows(inputs.get("countries", []), inputs.get("category"))
    if name == "detect_export_opportunities":
        return await v2.detect_export_opportunities(db, producer_id)
    if name == "analyze_importers":
        return await v2.analyze_importers(db, producer_id)
    if name == "manage_pipeline":
        return await v2.manage_pipeline(
            db, producer_id, inputs.get("operation", "list"),
            importer_id=inputs.get("importer_id"),
            stage=inputs.get("stage"),
            notes=inputs.get("notes"),
            lead_id=inputs.get("lead_id"),
        )
    if name == "manage_export_goals":
        return await v2.manage_export_goals(
            db, producer_id, inputs.get("operation", "list"),
            goal_type=inputs.get("goal_type"), target=inputs.get("target"),
            target_market=inputs.get("target_market"),
        )
    if name == "create_b2b_offer_draft":
        return await v2.create_b2b_offer_draft(
            db, producer_id,
            importer_id=inputs.get("importer_id", ""),
            product_id=inputs.get("product_id"),
            volume_kg=inputs.get("volume_kg", 0),
            price_eur_kg=inputs.get("price_eur_kg", 0),
            incoterm=inputs.get("incoterm", "FOB"),
            notes=inputs.get("notes", ""),
        )
    if name == "send_offer_to_importer":
        return await v2.send_offer_to_importer(db, producer_id, inputs.get("offer_id", ""))

    return {"error": f"Herramienta '{name}' no encontrada"}
