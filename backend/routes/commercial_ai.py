"""
Commercial AI Agent — ELITE plan producers only.
Endpoint: POST /api/v1/commercial-ai/chat
Uses Claude Sonnet with tool use (agentic loop for multi-step reasoning).
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import List
import json
import os
import logging

from anthropic import Anthropic
from core.database import db
from core.auth import get_current_user
from services.commercial_ai_tools import execute_tool, MARKET_DATA

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/commercial-ai", tags=["commercial-ai"])

COMMERCIAL_MODEL = os.getenv("COMMERCIAL_AI_MODEL", "claude-sonnet-4-6")
MAX_TOOL_ROUNDS = 5  # Safety limit for agentic loop

COMMERCIAL_SYSTEM = """Eres el Agente Comercial IA de Hispaloshop para productores con plan ELITE.
Experto en exportación de alimentos españoles, regulaciones internacionales y contratos B2B.

MERCADOS DISPONIBLES: Alemania (DE), Francia (FR), Reino Unido (GB), Estados Unidos (US), Japón (JP), Italia (IT), Países Bajos (NL), Suecia (SE), Emiratos Árabes (AE).

HERRAMIENTAS:
- search_importers: busca importadores verificados por país y categoría
- analyze_market: análisis completo de demanda, precio, competencia y tendencias
- predict_demand: predicción mensual de demanda con estacionalidad
- generate_contract: genera borrador de contrato B2B con datos del mercado
- check_producer_plan: consulta el plan y límites del productor

REGLAS:
- Los análisis incluyen SIEMPRE datos numéricos (%, €, kg)
- Idioma: español
- Sé conciso pero detallado en los análisis de mercado
- Sugiere acciones concretas basadas en los datos
- Para contratos, pide los datos que falten antes de generar
- Si el usuario pregunta por un mercado no disponible, sugiere los 9 disponibles
- Usa las herramientas proactivamente — no inventes datos, consulta siempre"""

COMMERCIAL_TOOLS = [
    {
        "name": "search_importers",
        "description": "Busca importadores verificados por país, categoría de producto y certificaciones",
        "input_schema": {
            "type": "object",
            "properties": {
                "country": {"type": "string", "description": "País del importador (nombre o código ISO)"},
                "product_category": {"type": "string", "description": "Categoría de producto (ej: aceite de oliva)"},
                "certifications": {"type": "array", "items": {"type": "string"}},
                "min_volume": {"type": "number", "description": "Volumen mínimo en kg"},
            },
            "required": ["country"],
        },
    },
    {
        "name": "analyze_market",
        "description": "Análisis completo de mercado: tamaño, demanda, precio, competencia, aranceles, retailers y tendencias",
        "input_schema": {
            "type": "object",
            "properties": {
                "country": {"type": "string", "description": "País destino"},
                "product_category": {"type": "string", "description": "Categoría de producto"},
            },
            "required": ["country", "product_category"],
        },
    },
    {
        "name": "predict_demand",
        "description": "Predicción mensual de demanda con estacionalidad y tendencias de crecimiento",
        "input_schema": {
            "type": "object",
            "properties": {
                "product_category": {"type": "string"},
                "country": {"type": "string"},
                "months": {"type": "integer", "default": 6, "description": "Meses a predecir (1-12)"},
            },
            "required": ["product_category", "country"],
        },
    },
    {
        "name": "generate_contract",
        "description": "Genera borrador de contrato B2B con términos comerciales y datos del mercado destino",
        "input_schema": {
            "type": "object",
            "properties": {
                "producer_name": {"type": "string"},
                "importer_name": {"type": "string"},
                "product": {"type": "string"},
                "country": {"type": "string"},
                "volume_kg": {"type": "number"},
                "price_eur_kg": {"type": "number"},
                "incoterm": {"type": "string", "default": "FOB", "enum": ["FOB", "CIF", "EXW", "DDP", "DAP"]},
            },
            "required": ["producer_name", "importer_name", "product", "country", "volume_kg", "price_eur_kg"],
        },
    },
    {
        "name": "check_producer_plan",
        "description": "Consulta el plan de suscripción y límites de uso del productor actual",
        "input_schema": {
            "type": "object",
            "properties": {},
        },
    },
]


class ChatMessage(BaseModel):
    role: str
    content: str


class CommercialChatRequest(BaseModel):
    messages: List[ChatMessage]


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
        return {"response": "Agente Comercial no configurado. Contacta con soporte.", "tool_calls": []}

    client = Anthropic(api_key=api_key)
    messages = [{"role": m.role, "content": m.content} for m in request_body.messages]

    tool_results_for_frontend = []

    try:
        # Agentic loop — keep calling Claude until it stops using tools
        for _ in range(MAX_TOOL_ROUNDS):
            response = client.messages.create(
                model=COMMERCIAL_MODEL,
                max_tokens=2048,
                system=COMMERCIAL_SYSTEM,
                tools=COMMERCIAL_TOOLS,
                messages=messages,
            )

            if response.stop_reason != "tool_use":
                # Final text response
                text = next((b.text for b in response.content if hasattr(b, "text")), "")
                return {"response": text, "tool_calls": tool_results_for_frontend}

            # Process tool calls
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    result = await execute_tool(block.name, block.input, user_id)
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

            # Append assistant response + tool results for next iteration
            messages.append({"role": "assistant", "content": response.content})
            messages.append({"role": "user", "content": tool_results})

        # If we hit MAX_TOOL_ROUNDS, extract whatever text we have
        text = next((b.text for b in response.content if hasattr(b, "text")), "Análisis completado.")
        return {"response": text, "tool_calls": tool_results_for_frontend}

    except Exception as e:
        logger.error("Commercial AI error: %s", e)
        return {"response": "Error al conectar con el agente comercial. Inténtalo de nuevo.", "tool_calls": []}


@router.get("/markets")
async def list_markets(request: Request):
    """Public endpoint: list available market data (no auth required for landing page)."""
    return [
        {
            "code": code,
            "name": data["name"],
            "flag": data["flag"],
            "growth_pct": data["growth_yoy_pct"],
            "top_categories": data["top_categories"][:3],
        }
        for code, data in MARKET_DATA.items()
    ]
