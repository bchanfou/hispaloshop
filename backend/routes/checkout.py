"""
Endpoints de checkout con Stripe y split de pagos.
Fase 4: Checkout + B2B Importer
"""
import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks

from core.database import get_db
from core.auth import get_current_user
from core.config import settings

router = APIRouter(prefix="/checkout", tags=["Checkout"])


@router.post("/create-payment-intent")
async def create_payment_intent(
    shipping_address: dict,
    current_user = Depends(get_current_user)
):
    """
    Crear Payment Intent de Stripe para checkout.
    Calcula totales, split de pagos, y comisiones.
    """
    db = get_db()
    
    # Obtener carrito
    cart = await db.carts.find_one({
        "user_id": current_user.user_id,
        "status": "active"
    })
    
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    items = cart["items"]
    
    # Calcular totales
    subtotal_cents = sum(item.get("total_price_cents", 0) for item in items)
    
    # Calcular envío (simplificado - en producción usar shipping_service)
    shipping_cents = 500  # €5 flat rate por ahora
    
    # Calcular impuestos (21% IVA)
    tax_cents = int((subtotal_cents + shipping_cents) * 0.21)
    
    # Aplicar descuento
    discount_cents = cart.get("discount_cents", 0)
    
    # Total final
    total_cents = subtotal_cents + shipping_cents + tax_cents - discount_cents
    
    if total_cents <= 0:
        raise HTTPException(status_code=400, detail="Invalid total amount")
    
    # Generar número de orden
    order_number = f"HSP-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    
    # Crear orden en estado pending
    order_doc = {
        "order_id": order_number,
        "user_id": current_user.user_id,
        "tenant_id": cart.get("tenant_id", "ES"),
        "status": "pending_payment",
        "items": items,
        "subtotal_cents": subtotal_cents,
        "shipping_cents": shipping_cents,
        "tax_cents": tax_cents,
        "discount_cents": discount_cents,
        "total_cents": total_cents,
        "platform_fee_cents": 0,  # Se calcula después
        "affiliate_fee_cents": 0,
        "producer_payout_cents": 0,
        "affiliate_code": cart.get("affiliate_code"),
        "shipping_address": shipping_address,
        "cart_id": str(cart.get("_id")),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    order_result = await db.orders.insert_one(order_doc)
    order_id = str(order_result.inserted_id)
    
    # Crear Payment Intent en Stripe
    try:
        import stripe
        stripe.api_key = settings.STRIPE_SECRET_KEY
        
        # Crear payment intent
        intent = stripe.PaymentIntent.create(
            amount=total_cents,
            currency="eur",
            metadata={
                "order_id": order_number,
                "user_id": current_user.user_id,
                "tenant_id": cart.get("tenant_id", "ES"),
                "affiliate_code": cart.get("affiliate_code", "")
            },
            transfer_group=order_number,
            automatic_payment_methods={"enabled": True}
        )
        
        # Guardar payment intent ID
        await db.orders.update_one(
            {"_id": order_result.inserted_id},
            {"$set": {"stripe_payment_intent_id": intent.id}}
        )
        
        return {
            "success": True,
            "data": {
                "client_secret": intent.client_secret,
                "order_id": order_number,
                "total_cents": total_cents,
                "total_euros": total_cents / 100
            }
        }
        
    except Exception as e:
        # Revertir orden
        await db.orders.delete_one({"_id": order_result.inserted_id})
        raise HTTPException(status_code=500, detail=f"Stripe error: {str(e)}")


@router.post("/webhook")
async def stripe_webhook(request: Request, background_tasks: BackgroundTasks):
    """
    Webhook de Stripe para manejar pagos exitosos.
    Aquí ocurre el split de pagos.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    try:
        import stripe
        import json as _json
        stripe.api_key = settings.STRIPE_SECRET_KEY

        webhook_secret = settings.STRIPE_WEBHOOK_SECRET
        if webhook_secret:
            event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
        else:
            event = _json.loads(payload)

    except stripe.error.SignatureVerificationError as e:
        raise HTTPException(status_code=400, detail=f"Invalid webhook signature: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Webhook error: {str(e)}")
    
    if event["type"] == "payment_intent.succeeded":
        intent = event["data"]["object"]
        await _process_successful_payment(intent)
    
    elif event["type"] == "payment_intent.payment_failed":
        intent = event["data"]["object"]
        await _process_failed_payment(intent)
    
    return {"status": "success"}


async def _process_successful_payment(intent: dict):
    """Procesar pago exitoso: split de pagos"""
    db = get_db()
    from bson.objectid import ObjectId
    
    order_number = intent["metadata"].get("order_id")
    
    # Buscar orden
    order = await db.orders.find_one({"order_id": order_number})
    if not order:
        print(f"[ERROR] Order {order_number} not found")
        return
    
    if order.get("status") != "pending_payment":
        print(f"[INFO] Order {order_number} already processed")
        return
    
    total_cents = order["total_cents"]
    items = order["items"]
    
    # Calcular split de pagos
    # 1. Comisión de afiliado (si aplica)
    affiliate_code = order.get("affiliate_code")
    affiliate_fee_cents = 0
    affiliate_id = None
    
    if affiliate_code:
        affiliate = await db.users.find_one({
            "influencer_data.affiliate_code": affiliate_code
        })
        if affiliate:
            affiliate_id = str(affiliate.get("_id"))
            # Obtener tier y rate
            tier = affiliate.get("influencer_data", {}).get("tier", "hydra")
            tier_rates = {
                "hydra": 0.03,
                "nemea": 0.04,
                "atlas": 0.05,
                "olympus": 0.06,
                "hercules": 0.07
            }
            rate = tier_rates.get(tier, 0.03)
            affiliate_fee_cents = int(total_cents * rate)
    
    # 2. Comisión de plataforma (20% por defecto, varía por plan del productor)
    platform_fee_cents = int(total_cents * 0.20)
    
    # 3. Lo que recibe el productor
    producer_payout_cents = total_cents - platform_fee_cents - affiliate_fee_cents
    
    # Crear transfers para cada productor
    transfers = []
    import stripe
    stripe.api_key = settings.STRIPE_SECRET_KEY
    
    # Agrupar items por productor
    by_producer = {}
    for item in items:
        seller_id = item.get("seller_id")
        if seller_id not in by_producer:
            by_producer[seller_id] = []
        by_producer[seller_id].append(item)
    
    for seller_id, seller_items in by_producer.items():
        # Calcular monto para este productor
        seller_total = sum(i.get("total_price_cents", 0) for i in seller_items)
        seller_payout = int(seller_total * 0.80)  # 80% al productor
        
        # Obtener cuenta Stripe del productor
        seller = await db.users.find_one({"user_id": seller_id})
        if not seller:
            continue
        
        stripe_account_id = seller.get("stripe_account_id")
        if not stripe_account_id:
            print(f"[WARNING] Seller {seller_id} has no Stripe account")
            continue
        
        try:
            # Crear transfer
            transfer = stripe.Transfer.create(
                amount=seller_payout,
                currency="eur",
                destination=stripe_account_id,
                transfer_group=order_number,
                metadata={
                    "order_id": order_number,
                    "seller_id": seller_id
                }
            )
            
            transfers.append({
                "seller_id": seller_id,
                "amount_cents": seller_payout,
                "stripe_transfer_id": transfer.id,
                "status": "completed"
            })
            
        except Exception as e:
            print(f"[ERROR] Transfer failed for seller {seller_id}: {e}")
            transfers.append({
                "seller_id": seller_id,
                "amount_cents": seller_payout,
                "status": "failed",
                "error": str(e)
            })
    
    # Crear registro de comisión de afiliado
    if affiliate_fee_cents > 0 and affiliate_id:
        await db.commission_records.insert_one({
            "order_id": str(order.get("_id")),
            "order_number": order_number,
            "influencer_id": affiliate_id,
            "affiliate_code": affiliate_code,
            "product_id": items[0].get("product_id") if items else None,
            "product_name": items[0].get("product_name") if items else "Order",
            "seller_id": items[0].get("seller_id") if items else None,
            "sale_value_cents": total_cents,
            "commission_rate": rate,
            "commission_cents": affiliate_fee_cents,
            "status": "pending",  # Se aprueba después de review
            "period_year": datetime.utcnow().year,
            "period_month": datetime.utcnow().month,
            "tenant_id": order.get("tenant_id", "ES"),
            "created_at": datetime.utcnow()
        })
    
    # Actualizar orden
    await db.orders.update_one(
        {"_id": order.get("_id")},
        {
            "$set": {
                "status": "paid",
                "paid_at": datetime.utcnow(),
                "platform_fee_cents": platform_fee_cents,
                "affiliate_fee_cents": affiliate_fee_cents,
                "producer_payout_cents": producer_payout_cents,
                "stripe_transfers": transfers,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    # Reducir stock
    for item in items:
        await db.products.update_one(
            {"_id": ObjectId(item.get("product_id"))},
            {"$inc": {"stock_quantity": -item.get("quantity", 0)}}
        )
    
    # Marcar carrito como convertido
    if order.get("cart_id"):
        await db.carts.update_one(
            {"_id": ObjectId(order["cart_id"])},
            {"$set": {"status": "converted"}}
        )
    
    print(f"[SUCCESS] Order {order_number} processed. Payout: {producer_payout_cents}c")


async def _process_failed_payment(intent: dict):
    """Procesar pago fallido"""
    db = get_db()
    
    order_number = intent["metadata"].get("order_id")
    
    await db.orders.update_one(
        {"order_id": order_number},
        {
            "$set": {
                "status": "payment_failed",
                "payment_error": intent.get("last_payment_error", {}).get("message"),
                "updated_at": datetime.utcnow()
            }
        }
    )


@router.get("/orders")
async def get_order_history(
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    current_user = Depends(get_current_user)
):
    """Historial de órdenes del usuario"""
    db = get_db()
    
    query = {"user_id": current_user.user_id}
    if status:
        query["status"] = status
    
    total = await db.orders.count_documents(query)
    
    orders = await db.orders.find(query)\
        .sort("created_at", -1)\
        .skip((page - 1) * limit)\
        .limit(limit)\
        .to_list(length=limit)
    
    for o in orders:
        o["id"] = str(o.pop("_id", ""))
    
    return {
        "success": True,
        "data": {
            "orders": orders,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit
        }
    }


@router.get("/orders/{order_id}")
async def get_order_detail(
    order_id: str,
    current_user = Depends(get_current_user)
):
    """Detalle de una orden"""
    db = get_db()
    from bson.objectid import ObjectId
    
    try:
        order = await db.orders.find_one({
            "$or": [
                {"_id": ObjectId(order_id)},
                {"order_id": order_id}
            ],
            "user_id": current_user.user_id
        })
    except:
        order = await db.orders.find_one({
            "order_id": order_id,
            "user_id": current_user.user_id
        })
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order["id"] = str(order.pop("_id", ""))
    
    return {"success": True, "data": order}
