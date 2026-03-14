"""
Commercial AI Agent — ELITE plan producers only.
Endpoint: POST /api/v1/commercial-ai/chat
Uses Claude Sonnet for complex B2B reasoning.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional
import json
import os
import logging

from anthropic import Anthropic
from core.database import db
from core.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/commercial-ai", tags=["commercial-ai"])

COMMERCIAL_MODEL = os.getenv("COMMERCIAL_AI_MODEL", "claude-sonnet-4-6")

COMMERCIAL_SYSTEM = """
Eres el Agente Comercial IA de Hispaloshop para productores con plan ELITE.
Experto en exportación de alimentos españoles, regulaciones internacionales y contratos B2B.

HERRAMIENTAS:
- search_importers: busca importadores por país, categoría y certificaciones
- analyze_market: análisis de demanda, precio, competencia y tendencias por país
- check_regulations: requisitos legales, aranceles y etiquetado por mercado destino
- predict_demand: predicción de demanda con datos históricos

REGLAS:
- Los análisis incluyen SIEMPRE datos numéricos (%, €, kg)
- Idioma: español para el productor
- Sé conciso pero detallado en los análisis de mercado
- Sugiere acciones concretas basadas en los datos
"""

COMMERCIAL_TOOLS = [
    {
        "name": "search_importers",
        "description": "Busca importadores por país, categoría de producto y certificaciones requeridas",
        "input_schema": {
            "type": "object",
            "properties": {
                "country": {"type": "string", "description": "País del importador"},
                "product_category": {"type": "string"},
                "certifications": {"type": "array", "items": {"type": "string"}},
                "min_volume": {"type": "number", "description": "Volumen mínimo en kg"},
            },
            "required": ["country"],
        },
    },
    {
        "name": "analyze_market",
        "description": "Análisis de mercado: demanda, precio, competencia y tendencias",
        "input_schema": {
            "type": "object",
            "properties": {
                "country": {"type": "string"},
                "product_category": {"type": "string"},
            },
            "required": ["country", "product_category"],
        },
    },
    {
        "name": "check_regulations",
        "description": "Requisitos legales, aranceles y etiquetado por mercado destino",
        "input_schema": {
            "type": "object",
            "properties": {
                "country": {"type": "string"},
                "product_category": {"type": "string"},
            },
            "required": ["country", "product_category"],
        },
    },
    {
        "name": "predict_demand",
        "description": "Predicción de demanda por país y periodo",
        "input_schema": {
            "type": "object",
            "properties": {
                "product_category": {"type": "string"},
                "country": {"type": "string"},
                "months": {"type": "integer", "default": 6},
            },
            "required": ["product_category", "country"],
        },
    },
]


class ChatMessage(BaseModel):
    role: str
    content: str


class CommercialChatRequest(BaseModel):
    messages: List[ChatMessage]


async def execute_commercial_tool(name: str, inp: dict, producer_id: str):
    """Execute commercial AI tool. Returns stub data for now — wire to real data sources later."""

    if name == "search_importers":
        importers = await db.importers.find(
            {
                "country": {"$regex": inp.get("country", ""), "$options": "i"},
                "is_verified": True,
            }
        ).limit(5).to_list(length=5)

        if importers:
            return [
                {
                    "id": str(imp["_id"]),
                    "company": imp.get("company_name", ""),
                    "country": imp.get("country", ""),
                    "categories": imp.get("categories", []),
                    "min_volume": imp.get("min_volume_kg", 0),
                    "certifications": imp.get("certifications", []),
                }
                for imp in importers
            ]
        return [
            {
                "id": "demo",
                "company": f"Importador demo ({inp.get('country', 'UE')})",
                "country": inp.get("country", ""),
                "categories": [inp.get("product_category", "alimentación")],
                "min_volume": inp.get("min_volume", 500),
                "certifications": inp.get("certifications", []),
                "note": "Datos de ejemplo — conectar a base de datos real",
            }
        ]

    if name == "analyze_market":
        return {
            "country": inp.get("country"),
            "category": inp.get("product_category"),
            "demand_trend": "+12% interanual",
            "avg_import_price_eur_kg": 8.50,
            "main_competitors": ["Italia", "Grecia", "Túnez"],
            "market_size_eur": "45M€",
            "note": "Datos estimados — conectar a fuentes reales",
        }

    if name == "check_regulations":
        return {
            "country": inp.get("country"),
            "category": inp.get("product_category"),
            "import_tariff_pct": 4.5,
            "labeling_requirements": ["idioma local", "tabla nutricional", "origen"],
            "certifications_required": ["CE", "HACCP"],
            "phytosanitary": True,
            "note": "Verificar con fuentes oficiales antes de exportar",
        }

    if name == "predict_demand":
        months = inp.get("months", 6)
        return {
            "country": inp.get("country"),
            "category": inp.get("product_category"),
            "forecast_months": months,
            "trend": "alcista",
            "peak_months": ["noviembre", "diciembre"],
            "estimated_volume_kg": 2500 * months,
            "confidence": "media",
            "note": "Predicción basada en datos históricos limitados",
        }

    return {"error": "Tool not found"}


@router.post("/chat")
async def commercial_ai_chat(request_body: CommercialChatRequest, request: Request):
    current_user = await get_current_user(request)
    user_id = getattr(current_user, "user_id", None)

    # Verify ELITE plan
    producer = await db.producers.find_one({"user_id": user_id})
    if not producer or producer.get("plan", "free").lower() != "elite":
        raise HTTPException(
            status_code=403,
            detail="Se requiere plan ELITE para acceder al Agente Comercial",
        )

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return {"response": "Agente Comercial no configurado.", "tool_calls": []}

    client = Anthropic(api_key=api_key)
    messages = [{"role": m.role, "content": m.content} for m in request_body.messages]

    try:
        response = client.messages.create(
            model=COMMERCIAL_MODEL,
            max_tokens=2048,
            system=COMMERCIAL_SYSTEM,
            tools=COMMERCIAL_TOOLS,
            messages=messages,
        )
    except Exception as e:
        logger.error("Commercial AI error: %s", e)
        return {"response": "Error al conectar con el agente comercial.", "tool_calls": []}

    tool_results_for_frontend = []

    if response.stop_reason == "tool_use":
        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                result = await execute_commercial_tool(block.name, block.input, user_id)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": json.dumps(result, default=str),
                })
                tool_results_for_frontend.append({
                    "tool": block.name,
                    "input": block.input,
                    "result": result,
                })

        messages.append({"role": "assistant", "content": response.content})
        messages.append({"role": "user", "content": tool_results})

        try:
            final = client.messages.create(
                model=COMMERCIAL_MODEL,
                max_tokens=2048,
                system=COMMERCIAL_SYSTEM,
                tools=COMMERCIAL_TOOLS,
                messages=messages,
            )
            text = next((b.text for b in final.content if hasattr(b, "text")), "")
        except Exception as e:
            logger.error("Commercial AI follow-up error: %s", e)
            text = "Error procesando la consulta comercial."
    else:
        text = next((b.text for b in response.content if hasattr(b, "text")), "")

    return {
        "response": text,
        "tool_calls": tool_results_for_frontend,
    }
