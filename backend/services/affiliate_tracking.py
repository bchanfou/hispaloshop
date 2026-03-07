"""
Sistema de tracking de afiliados.
Gestiona clicks, cookies, atribucion y calculo de comisiones.
Fase 2: Affiliate Engine
"""

import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, List
from core.database import get_db


class AffiliateTrackingService:
    """
    Tracking completo del funnel: click → cookie → conversion → comision
    """
    
    COOKIE_DURATION_DAYS = 30
    ATTRIBUTION_MODEL = "last_click"
    
    # Tier thresholds (ejemplo, ajustar segun negocio)
    TIERS = {
        "hydra": {
            "rate": 0.03,
            "min_gmv": 0,
            "min_followers": 0,
            "name": "Hydra",
            "name_es": "Hidra"
        },
        "nemea": {
            "rate": 0.04,
            "min_gmv": 1000,
            "min_followers": 500,
            "name": "Nemea",
            "name_es": "Nemea"
        },
        "atlas": {
            "rate": 0.05,
            "min_gmv": 5000,
            "min_followers": 2000,
            "name": "Atlas",
            "name_es": "Atlas"
        },
        "olympus": {
            "rate": 0.06,
            "min_gmv": 20000,
            "min_followers": 10000,
            "name": "Olympus",
            "name_es": "Olimpo"
        },
        "hercules": {
            "rate": 0.07,
            "min_gmv": 100000,
            "min_followers": 50000,
            "name": "Hercules",
            "name_es": "Hercules"
        }
    }
    
    async def track_click(
        self,
        affiliate_code: str,
        product_id: Optional[str] = None,
        post_id: Optional[str] = None,
        ip_address: str = "unknown",
        user_agent: str = "unknown",
        referrer: Optional[str] = None,
        country: Optional[str] = None,
        city: Optional[str] = None
    ) -> Dict:
        """Registra un click en link de afiliado."""
        db = get_db()
        
        # 1. Validar que el codigo existe y es de influencer activo
        from bson.objectid import ObjectId
        
        # Buscar influencer por codigo
        influencer = await db.users.find_one({
            "influencer_data.affiliate_code": affiliate_code,
            "role": "influencer",
            "status": "active"
        })
        
        if not influencer:
            return {"error": "Invalid affiliate code", "valid": False}
        
        influencer_id = str(influencer.get("_id"))
        
        # 2. Anti-fraude basico
        is_suspicious = False
        suspicion_reason = None
        
        # Mismo IP hizo muchos clicks recientes
        recent_clicks = await db.affiliate_clicks.count_documents({
            "ip_address": ip_address,
            "created_at": {"$gte": datetime.utcnow() - timedelta(hours=1)}
        })
        
        if recent_clicks > 50:
            is_suspicious = True
            suspicion_reason = "excessive_clicks_from_ip"
        
        # User agent es bot conocido
        bot_signatures = ["bot", "crawler", "spider", "scrape"]
        if any(bot in user_agent.lower() for bot in bot_signatures):
            is_suspicious = True
            suspicion_reason = "suspicious_user_agent"
        
        # 3. Crear registro de click
        click_id = str(uuid.uuid4())
        
        click_doc = {
            "click_id": click_id,
            "affiliate_code": affiliate_code,
            "influencer_id": influencer_id,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "referrer": referrer,
            "product_id": product_id,
            "post_id": post_id,
            "cookie_set_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(days=self.COOKIE_DURATION_DAYS),
            "converted": False,
            "attribution_model": self.ATTRIBUTION_MODEL,
            "country": country,
            "city": city,
            "is_suspicious": is_suspicious,
            "suspicion_reason": suspicion_reason,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await db.affiliate_clicks.insert_one(click_doc)
        
        # 4. Actualizar stats del influencer
        await db.users.update_one(
            {"_id": influencer.get("_id")},
            {"$inc": {"influencer_data.stats.total_clicks": 1}}
        )
        
        return {
            "valid": True,
            "click_id": click_id,
            "cookie_duration_days": self.COOKIE_DURATION_DAYS,
            "influencer": {
                "id": influencer_id,
                "name": influencer.get("full_name", "Unknown"),
                "handle": influencer.get("influencer_data", {}).get("handle")
            },
            "is_suspicious": is_suspicious
        }
    
    async def attribute_sale(
        self,
        order_id: str,
        order_number: str,
        customer_id: str,
        items: List[Dict],
        affiliate_code_from_cookie: Optional[str] = None,
        affiliate_code_from_url: Optional[str] = None
    ) -> List[Dict]:
        """Atribuye una venta a influencer y genera comisiones."""
        db = get_db()
        commissions = []
        
        # Determinar codigo a usar (prioridad: URL > Cookie)
        affiliate_code = affiliate_code_from_url or affiliate_code_from_cookie
        
        if not affiliate_code:
            return commissions
        
        # Buscar influencer
        influencer = await db.users.find_one({
            "influencer_data.affiliate_code": affiliate_code,
            "status": "active"
        })
        
        if not influencer:
            return commissions
        
        influencer_id = str(influencer.get("_id"))
        tenant_id = influencer.get("tenant_id", "ES")
        
        # Determinar tier y rate
        influencer_data = influencer.get("influencer_data", {})
        tier = influencer_data.get("tier", "hydra")
        tier_info = self.TIERS.get(tier, self.TIERS["hydra"])
        commission_rate = tier_info["rate"]
        
        # Procesar cada item
        for item in items:
            product_id = item.get("product_id")
            if not product_id:
                continue
            
            # Verificar que no se comisiona dos veces
            existing = await db.commission_records.find_one({
                "order_id": order_id,
                "product_id": product_id,
                "influencer_id": influencer_id
            })
            
            if existing:
                continue
            
            sale_value = item.get("total_price_cents", 0)
            commission_cents = int(sale_value * commission_rate)
            
            now = datetime.utcnow()
            
            # Crear registro de comision
            commission_doc = {
                "order_id": order_id,
                "order_number": order_number,
                "influencer_id": influencer_id,
                "affiliate_code": affiliate_code,
                "product_id": product_id,
                "product_name": item.get("product_name", "Unknown"),
                "seller_id": item.get("seller_id"),
                "sale_value_cents": sale_value,
                "commission_rate": commission_rate,
                "commission_cents": commission_cents,
                "status": "pending",
                "period_year": now.year,
                "period_month": now.month,
                "tenant_id": tenant_id,
                "status_history": [{
                    "from": None,
                    "to": "pending",
                    "by": "system",
                    "at": now,
                    "reason": "Sale attributed, awaiting approval"
                }],
                "created_at": now,
                "updated_at": now
            }
            
            result = await db.commission_records.insert_one(commission_doc)
            commission_doc["id"] = str(result.inserted_id)
            commissions.append(commission_doc)
            
            # Actualizar click como convertido
            await db.affiliate_clicks.update_many(
                {
                    "affiliate_code": affiliate_code,
                    "influencer_id": influencer_id,
                    "converted": False,
                    "expires_at": {"$gte": datetime.utcnow()}
                },
                {
                    "$set": {
                        "converted": True,
                        "conversion_at": now,
                        "order_id": order_id,
                        "conversion_value_cents": sale_value,
                        "commission_cents": commission_cents,
                        "commission_tier": tier
                    }
                }
            )
            
            # Actualizar stats del influencer
            await db.users.update_one(
                {"_id": influencer.get("_id")},
                {
                    "$inc": {
                        "influencer_data.stats.total_conversions": 1,
                        "influencer_data.stats.total_commission_earned": commission_cents,
                        "influencer_data.stats.total_gmv_generated": sale_value
                    }
                }
            )
            
            # Verificar si sube de tier
            await self._check_tier_upgrade(influencer_id)
        
        return commissions
    
    async def _check_tier_upgrade(self, influencer_id: str):
        """Verifica si el influencer califica para tier superior."""
        db = get_db()
        from bson.objectid import ObjectId
        
        try:
            influencer = await db.users.find_one({"_id": ObjectId(influencer_id)})
        except:
            return
        
        if not influencer:
            return
        
        influencer_data = influencer.get("influencer_data", {})
        current_tier = influencer_data.get("tier", "hydra")
        stats = influencer_data.get("stats", {})
        
        gmv = stats.get("total_gmv_generated", 0)
        followers = influencer_data.get("followers_count", 0)
        
        # Encontrar tier mas alto que califica
        new_tier = current_tier
        for tier_key, tier_info in sorted(self.TIERS.items(), 
                                          key=lambda x: x[1]["min_gmv"]):
            if gmv >= tier_info["min_gmv"] and followers >= tier_info["min_followers"]:
                new_tier = tier_key
        
        if new_tier != current_tier:
            # Actualizar tier
            await db.users.update_one(
                {"_id": ObjectId(influencer_id)},
                {"$set": {"influencer_data.tier": new_tier}}
            )
            
            # Registrar historial
            await db.influencer_tier_history.insert_one({
                "influencer_id": influencer_id,
                "tenant_id": influencer.get("tenant_id", "ES"),
                "from_tier": current_tier,
                "to_tier": new_tier,
                "reason": "gmv_threshold",
                "gmv_at_change": gmv,
                "conversions_at_change": stats.get("total_conversions", 0),
                "followers_at_change": followers,
                "changed_at": datetime.utcnow(),
                "changed_by": "system"
            })
            
            print(f"[AFFILIATE] Influencer {influencer_id} subio a tier {new_tier}!")
    
    async def get_influencer_dashboard(self, influencer_id: str, tenant_id: str) -> Dict:
        """Genera datos completos para el dashboard del influencer."""
        db = get_db()
        from bson.objectid import ObjectId
        
        try:
            influencer = await db.users.find_one({"_id": ObjectId(influencer_id)})
        except:
            return {"error": "Influencer not found"}
        
        if not influencer:
            return {"error": "Influencer not found"}
        
        data = influencer.get("influencer_data", {})
        stats = data.get("stats", {})
        
        # Metricas de periodo (ultimos 30 dias)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        
        recent_clicks = await db.affiliate_clicks.count_documents({
            "influencer_id": influencer_id,
            "created_at": {"$gte": thirty_days_ago}
        })
        
        recent_conversions = await db.affiliate_clicks.count_documents({
            "influencer_id": influencer_id,
            "converted": True,
            "conversion_at": {"$gte": thirty_days_ago}
        })
        
        recent_commissions = await db.commission_records.aggregate([
            {
                "$match": {
                    "influencer_id": influencer_id,
                    "created_at": {"$gte": thirty_days_ago},
                    "status": {"$in": ["pending", "approved", "paid"]}
                }
            },
            {"$group": {"_id": None, "total": {"$sum": "$commission_cents"}}}
        ]).to_list(length=1)
        
        recent_commission_cents = recent_commissions[0]["total"] if recent_commissions else 0
        
        # Comisiones pendientes de pago
        pending_payout = await db.commission_records.aggregate([
            {
                "$match": {
                    "influencer_id": influencer_id,
                    "status": "approved"
                }
            },
            {"$group": {"_id": None, "total": {"$sum": "$commission_cents"}}}
        ]).to_list(length=1)
        
        pending_cents = pending_payout[0]["total"] if pending_payout else 0
        
        # Progreso al siguiente tier
        current_tier = data.get("tier", "hydra")
        tier_info = self.TIERS[current_tier]
        
        next_tier = None
        progress_percent = 100
        next_info = None
        
        for tier_key, info in sorted(self.TIERS.items(), key=lambda x: x[1]["min_gmv"]):
            if info["min_gmv"] > tier_info["min_gmv"]:
                next_tier = tier_key
                next_info = info
                current_gmv = stats.get("total_gmv_generated", 0)
                needed_gmv = next_info["min_gmv"]
                progress_percent = min(100, int((current_gmv / needed_gmv) * 100))
                break
        
        # Top productos promocionados
        top_products = await db.commission_records.aggregate([
            {"$match": {"influencer_id": influencer_id}},
            {"$group": {
                "_id": "$product_id",
                "product_name": {"$first": "$product_name"},
                "total_sales": {"$sum": "$sale_value_cents"},
                "total_commission": {"$sum": "$commission_cents"},
                "conversions": {"$sum": 1}
            }},
            {"$sort": {"total_commission": -1}},
            {"$limit": 5}
        ]).to_list(length=5)
        
        return {
            "affiliate_code": data.get("affiliate_code"),
            "affiliate_link": f"https://hispaloshop.com/r/{data.get('affiliate_code')}",
            "current_tier": {
                "key": current_tier,
                "name": tier_info["name_es"],
                "rate": tier_info["rate"],
                "rate_percent": int(tier_info["rate"] * 100)
            },
            "next_tier": {
                "key": next_tier,
                "name": self.TIERS[next_tier]["name_es"] if next_tier else None,
                "rate": self.TIERS[next_tier]["rate"] if next_tier else None,
                "progress_percent": progress_percent,
                "gmv_needed": (next_info["min_gmv"] * 100 - stats.get("total_gmv_generated", 0)) if next_tier else 0
            } if next_tier else None,
            "stats": {
                "lifetime": {
                    "clicks": stats.get("total_clicks", 0),
                    "conversions": stats.get("total_conversions", 0),
                    "gmv_generated_cents": stats.get("total_gmv_generated", 0),
                    "commission_earned_cents": stats.get("total_commission_earned", 0)
                },
                "last_30_days": {
                    "clicks": recent_clicks,
                    "conversions": recent_conversions,
                    "commission_cents": recent_commission_cents
                },
                "pending_payout_cents": pending_cents
            },
            "top_products": top_products,
            "recent_conversions": await self._get_recent_conversions(influencer_id, limit=10)
        }
    
    async def _get_recent_conversions(self, influencer_id: str, limit: int = 10) -> List[Dict]:
        """Obtiene conversiones recientes para el feed del dashboard."""
        db = get_db()
        from bson.objectid import ObjectId
        
        conversions = await db.affiliate_clicks.find({
            "influencer_id": influencer_id,
            "converted": True
        }).sort("conversion_at", -1).limit(limit).to_list(length=limit)
        
        enriched = []
        for conv in conversions:
            product_id = conv.get("product_id")
            product = None
            if product_id:
                try:
                    product = await db.products.find_one({"_id": ObjectId(product_id)})
                except:
                    pass
            
            enriched.append({
                "order_id": conv.get("order_id"),
                "product_name": product["name"] if product else "Unknown",
                "product_image": product.get("images", [{}])[0].get("url") if product and product.get("images") else None,
                "value_cents": conv.get("conversion_value_cents"),
                "commission_cents": conv.get("commission_cents"),
                "converted_at": conv.get("conversion_at")
            })
        
        return enriched
    
    async def approve_commissions(self, commission_ids: List[str], approved_by: str) -> Dict:
        """Aprueba comisiones pendientes (para admin anti-fraude)."""
        db = get_db()
        from bson.objectid import ObjectId
        
        obj_ids = []
        for cid in commission_ids:
            try:
                obj_ids.append(ObjectId(cid))
            except:
                pass
        
        if not obj_ids:
            return {"approved_count": 0, "commission_ids": []}
        
        now = datetime.utcnow()
        
        result = await db.commission_records.update_many(
            {
                "_id": {"$in": obj_ids},
                "status": "pending"
            },
            {
                "$set": {"status": "approved", "updated_at": now},
                "$push": {
                    "status_history": {
                        "from": "pending",
                        "to": "approved",
                        "by": approved_by,
                        "at": now,
                        "reason": "Manual review approved"
                    }
                }
            }
        )
        
        return {
            "approved_count": result.modified_count,
            "commission_ids": commission_ids
        }
    
    async def process_payout_batch(
        self,
        tenant_id: str,
        year: int,
        month: int,
        processed_by: str
    ) -> Dict:
        """Procesa lote de pagos mensual a influencers."""
        db = get_db()
        
        # Obtener comisiones aprobadas pendientes
        commissions = await db.commission_records.find({
            "tenant_id": tenant_id,
            "period_year": year,
            "period_month": month,
            "status": "approved"
        }).to_list(length=10000)
        
        # Agrupar por influencer
        by_influencer = {}
        for comm in commissions:
            inf_id = comm["influencer_id"]
            if inf_id not in by_influencer:
                by_influencer[inf_id] = []
            by_influencer[inf_id].append(comm)
        
        # Crear payouts
        payouts = []
        for inf_id, comms in by_influencer.items():
            total_cents = sum(c["commission_cents"] for c in comms)
            
            payout = {
                "influencer_id": inf_id,
                "commission_ids": [str(c.get("_id")) for c in comms],
                "total_cents": total_cents,
                "method": "stripe_transfer",
                "status": "pending",
                "transfer_id": None
            }
            payouts.append(payout)
            
            # Marcar comisiones como en proceso
            await db.commission_records.update_many(
                {"_id": {"$in": [c.get("_id") for c in comms]}},
                {"$set": {"status": "processing"}}
            )
        
        # Crear batch
        now = datetime.utcnow()
        batch_doc = {
            "tenant_id": tenant_id,
            "period_year": year,
            "period_month": month,
            "status": "processing",
            "total_influencers": len(payouts),
            "total_commissions_cents": sum(p["total_cents"] for p in payouts),
            "total_payouts_cents": sum(p["total_cents"] for p in payouts),
            "payouts": payouts,
            "processed_at": now,
            "processed_by": processed_by,
            "created_at": now
        }
        
        result = await db.payout_batches.insert_one(batch_doc)
        
        return {
            "batch_id": str(result.inserted_id),
            "total_influencers": len(payouts),
            "total_amount_cents": sum(p["total_cents"] for p in payouts),
            "status": "processing"
        }


# Instancia global
affiliate_service = AffiliateTrackingService()
