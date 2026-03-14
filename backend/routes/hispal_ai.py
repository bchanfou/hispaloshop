"""
Hispal AI — Consumer-facing AI assistant powered by Claude Haiku.
Endpoint: POST /api/v1/hispal-ai/chat
"""
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from typing import List, Optional
import json
import os
import logging

from anthropic import Anthropic
from core.database import db
from core.auth import get_optional_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/hispal-ai", tags=["hispal-ai"])

MODEL = os.getenv("HISPAL_AI_MODEL", "claude-haiku-4-5-20251001")

SYSTEM_PROMPT = """
Eres Hispal AI, el asistente de Hispaloshop — la plataforma de alimentos saludables y artesanales.

PERSONALIDAD: Cercano, experto en alimentación, conciso. Español. Máximo 3-4 líneas salvo recetas.
Emojis con moderación (máximo 2 por mensaje).

HERRAMIENTAS DISPONIBLES — úsalas siempre que sean relevantes:
- search_products: busca productos reales del catálogo
- get_product_detail: ingredientes, nutricional, certificados de un producto
- add_to_cart: añade producto al carrito del usuario
- get_user_profile: perfil, alergias, preferencias, historial del usuario
- get_cart_summary: resumen del carrito actual

REGLAS CRÍTICAS:
1. SIEMPRE usa search_products antes de recomendar un producto. Nunca inventes productos.
2. Si el usuario tiene alergias registradas, NUNCA recomiendes productos que las contengan.
3. Para recetas y dietas, usa solo productos REALES del catálogo.
4. add_to_cart solo con confirmación explícita del usuario ("añade", "quiero", "sí").
5. Para pagar: guía al checkout pero NO proceses pagos directamente.
6. Si no hay producto exacto, sugiere el más parecido disponible.
"""

TOOLS = [
    {
        "name": "search_products",
        "description": "Busca productos reales en el catálogo de Hispaloshop",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string"},
                "certifications": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "vegano, halal, ecologico, sin_gluten, sin_lactosa",
                },
                "max_price": {"type": "number"},
                "limit": {"type": "integer", "default": 4},
            },
            "required": ["query"],
        },
    },
    {
        "name": "get_product_detail",
        "description": "Ingredientes, valores nutricionales y certificados de un producto",
        "input_schema": {
            "type": "object",
            "properties": {"product_id": {"type": "string"}},
            "required": ["product_id"],
        },
    },
    {
        "name": "add_to_cart",
        "description": "Añade un producto al carrito del usuario",
        "input_schema": {
            "type": "object",
            "properties": {
                "product_id": {"type": "string"},
                "quantity": {"type": "integer", "default": 1},
            },
            "required": ["product_id"],
        },
    },
    {
        "name": "get_user_profile",
        "description": "Perfil del usuario: alergias, preferencias, historial de compras",
        "input_schema": {
            "type": "object",
            "properties": {"user_id": {"type": "string"}},
            "required": ["user_id"],
        },
    },
    {
        "name": "get_cart_summary",
        "description": "Resumen del carrito actual",
        "input_schema": {
            "type": "object",
            "properties": {"user_id": {"type": "string"}},
            "required": ["user_id"],
        },
    },
]


# ── Pydantic models ──────────────────────────────────

class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    user_id: Optional[str] = None


# ── Tool execution ───────────────────────────────────

async def execute_tool(name: str, inp: dict, user_id: str):
    from services.hispal_ai_tools import (
        search_products_db,
        get_product_detail_db,
        add_to_cart_db,
        get_user_profile_db,
        get_cart_summary_db,
    )

    if name == "search_products":
        return await search_products_db(
            db, inp.get("query"), inp.get("certifications"), inp.get("max_price"), inp.get("limit", 4)
        )
    if name == "get_product_detail":
        return await get_product_detail_db(db, inp["product_id"])
    if name == "add_to_cart":
        return await add_to_cart_db(db, user_id, inp["product_id"], inp.get("quantity", 1))
    if name == "get_user_profile":
        return await get_user_profile_db(db, user_id)
    if name == "get_cart_summary":
        return await get_cart_summary_db(db, user_id)
    return {"error": "Tool not found"}


# ── Main endpoint ────────────────────────────────────

@router.post("/chat")
async def hispal_ai_chat(request_body: ChatRequest, request: Request):
    current_user = await get_optional_user(request)
    user_id = (getattr(current_user, "user_id", None) if current_user else None) or request_body.user_id

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return {"response": "Hispal AI no está configurado en este momento.", "tool_calls": []}

    client = Anthropic(api_key=api_key)
    messages = [{"role": m.role, "content": m.content} for m in request_body.messages]

    try:
        response = client.messages.create(
            model=MODEL,
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            tools=TOOLS,
            messages=messages,
        )
    except Exception as e:
        logger.error("Hispal AI error: %s", e)
        return {"response": "Lo siento, no puedo responder en este momento.", "tool_calls": []}

    tool_results_for_frontend = []

    if response.stop_reason == "tool_use":
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

        messages.append({"role": "assistant", "content": response.content})
        messages.append({"role": "user", "content": tool_results})

        try:
            final = client.messages.create(
                model=MODEL,
                max_tokens=1024,
                system=SYSTEM_PROMPT,
                tools=TOOLS,
                messages=messages,
            )
            text = next((b.text for b in final.content if hasattr(b, "text")), "")
        except Exception as e:
            logger.error("Hispal AI follow-up error: %s", e)
            text = "Lo siento, ha ocurrido un error procesando tu consulta."
    else:
        text = next((b.text for b in response.content if hasattr(b, "text")), "")

    return {
        "response": text,
        "tool_calls": tool_results_for_frontend,
    }
