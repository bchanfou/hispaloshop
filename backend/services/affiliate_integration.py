"""
Integracion del sistema de afiliados con checkout existente.
Fase 2: Affiliate Engine - Bridge con sistema legacy
"""

from typing import Optional, Dict, List
from datetime import datetime
from services.affiliate_tracking import affiliate_service
from core.database import get_db


async def process_affiliate_from_checkout(
    order_id: str,
    order_number: str,
    customer_id: str,
    line_items: List[Dict],
    affiliate_code: Optional[str] = None,
    influencer_id_from_order: Optional[str] = None
) -> Dict:
    """
    Procesa atribucion de afiliado al completar checkout.
    Compatible con sistema legacy de influencers.
    
    Args:
        order_id: ID de la orden
        order_number: Numero de orden legible
        customer_id: ID del cliente
        line_items: Items de la orden
        affiliate_code: Codigo de afiliado (desde cookie/URL)
        influencer_id_from_order: ID de influencer del sistema legacy (si existe)
    
    Returns:
        Dict con comisiones creadas
    """
    if not affiliate_code and not influencer_id_from_order:
        return {"commissions": [], "message": "No affiliate attribution"}
    
    # Si tenemos influencer_id legacy pero no affiliate_code,
    # buscar el codigo de afiliado del influencer
    if not affiliate_code and influencer_id_from_order:
        db = get_db()
        influencer = await db.users.find_one({
            "user_id": influencer_id_from_order,
            "role": "influencer"
        })
        if influencer:
            affiliate_code = influencer.get("influencer_data", {}).get("affiliate_code")
    
    if not affiliate_code:
        return {"commissions": [], "message": "No affiliate code found"}
    
    # Preparar items para el servicio de afiliados
    affiliate_items = []
    for item in line_items:
        affiliate_items.append({
            "product_id": item.get("product_id"),
            "product_name": item.get("product_name") or item.get("name", "Unknown"),
            "seller_id": item.get("seller_id") or item.get("producer_id"),
            "total_price_cents": int(item.get("total_amount", 0) * 100) if isinstance(item.get("total_amount"), (int, float)) else item.get("price_cents", 0)
        })
    
    # Atribuir venta
    commissions = await affiliate_service.attribute_sale(
        order_id=order_id,
        order_number=order_number,
        customer_id=customer_id,
        items=affiliate_items,
        affiliate_code_from_cookie=affiliate_code
    )
    
    return {
        "commissions": commissions,
        "total_commissions": len(commissions),
        "affiliate_code": affiliate_code
    }


async def get_affiliate_code_from_context(
    request_headers: Optional[Dict] = None,
    user_id: Optional[str] = None
) -> Optional[str]:
    """
    Extrae codigo de afiliado del contexto (cookies, headers, etc).
    
    En produccion, esto leeria cookies HTTP-only.
    Por ahora, busca en headers.
    """
    if request_headers:
        # Buscar en header X-Affiliate-Code
        code = request_headers.get("x-affiliate-code")
        if code:
            return code
        
        # Buscar en cookie string
        cookie = request_headers.get("cookie", "")
        if "affiliate_code=" in cookie:
            import re
            match = re.search(r'affiliate_code=([^;]+)', cookie)
            if match:
                return match.group(1)
    
    return None


async def sync_legacy_influencer_to_affiliate(user_id: str) -> bool:
    """
    Migra un influencer del sistema legacy al nuevo sistema de afiliados.
    Crea el affiliate_code si no existe.
    """
    db = get_db()
    
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        return False
    
    influencer_data = user.get("influencer_data", {})
    
    # Verificar si ya tiene codigo
    if influencer_data.get("affiliate_code"):
        return True  # Ya migrado
    
    # Generar codigo unico basado en nombre o handle
    import re
    base_code = influencer_data.get("handle") or user.get("name", "")
    if not base_code:
        base_code = f"INF{user_id[:6]}"
    
    # Limpiar y formatear
    base_code = re.sub(r'[^a-zA-Z0-9]', '', base_code).upper()
    if len(base_code) < 3:
        base_code = f"INF{user_id[:6]}"
    
    # Verificar unicidad
    affiliate_code = base_code
    counter = 1
    while await db.users.find_one({"influencer_data.affiliate_code": affiliate_code}):
        affiliate_code = f"{base_code}{counter}"
        counter += 1
    
    # Actualizar usuario
    await db.users.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "influencer_data.affiliate_code": affiliate_code,
                "influencer_data.tier": influencer_data.get("current_tier", "hydra").lower(),
                "influencer_data.stats": influencer_data.get("stats", {
                    "total_clicks": 0,
                    "total_conversions": 0,
                    "total_gmv_generated": 0,
                    "total_commission_earned": 0
                })
            }
        }
    )
    
    return True
