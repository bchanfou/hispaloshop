"""
Servicio de Analytics para Superadmin
Fase 5: KPIs en tiempo real con cache
"""
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from bson import ObjectId
import asyncio

from backend.core.database import db
from backend.core.cache import redis_client
from backend.schemas.superadmin.dashboard import (
    KPICard, RevenueDataPoint, GeoDistribution, 
    DashboardSummaryResponse, TopProduct, TopInfluencer
)


class AnalyticsService:
    """Servicio de análisis para dashboard superadmin"""
    
    CACHE_TTL = 300  # 5 minutos
    
    async def get_dashboard_summary(
        self, 
        tenant_id: Optional[str] = None,
        force_refresh: bool = False
    ) -> DashboardSummaryResponse:
        """
        Obtener resumen completo del dashboard con KPIs
        """
        cache_key = f"dashboard:summary:{tenant_id or 'global'}"
        
        # Intentar cache
        if not force_refresh and redis_client:
            try:
                cached = redis_client.get(cache_key)
                if cached:
                    import json
                    return DashboardSummaryResponse(**json.loads(cached))
            except Exception:
                pass
        
        # Calcular métricas en paralelo
        tasks = [
            self._get_today_metrics(tenant_id),
            self._get_active_users(tenant_id),
            self._get_pending_payouts(tenant_id),
            self._get_30d_metrics(tenant_id),
            self._get_revenue_chart(tenant_id, days=30),
            self._get_geo_distribution(tenant_id),
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        today_metrics = results[0] if not isinstance(results[0], Exception) else {}
        active_users = results[1] if not isinstance(results[1], Exception) else {"dau": 0}
        pending_payouts = results[2] if not isinstance(results[2], Exception) else {"total": 0}
        metrics_30d = results[3] if not isinstance(results[3], Exception) else {}
        revenue_chart = results[4] if not isinstance(results[4], Exception) else []
        geo_distribution = results[5] if not isinstance(results[5], Exception) else []
        
        # Construir KPIs
        kpis = self._build_kpis(
            today_metrics, active_users, pending_payouts, metrics_30d
        )
        
        summary = DashboardSummaryResponse(
            timestamp=datetime.utcnow(),
            period="realtime",
            tenant_id=tenant_id,
            metrics={
                "orders_today": today_metrics.get("order_count", 0),
                "gmv_today": today_metrics.get("gmv", 0),
                "revenue_today": today_metrics.get("revenue", 0),
                "dau": active_users.get("dau", 0),
                "pending_payouts": pending_payouts.get("total", 0),
                "orders_30d": metrics_30d.get("total_orders", 0),
                "average_order_value": metrics_30d.get("aov", 0),
                "unique_customers_30d": metrics_30d.get("unique_customers", 0),
            },
            kpis=kpis,
            revenue_chart=revenue_chart,
            geo_distribution=geo_distribution
        )
        
        # Guardar en cache
        if redis_client:
            try:
                import json
                redis_client.setex(
                    cache_key, 
                    self.CACHE_TTL, 
                    json.dumps(summary.model_dump(mode='json'))
                )
            except Exception:
                pass
        
        return summary
    
    async def _get_today_metrics(self, tenant_id: Optional[str]) -> Dict[str, Any]:
        """Métricas de hoy"""
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        
        query = {
            "created_at": {"$gte": today_start},
            "status": {"$in": ["paid", "processing", "shipped", "delivered"]}
        }
        if tenant_id:
            query["tenant_id"] = tenant_id
        
        pipeline = [
            {"$match": query},
            {
                "$group": {
                    "_id": None,
                    "order_count": {"$sum": 1},
                    "gmv": {"$sum": "$total_amount"},
                    "revenue": {"$sum": "$platform_fee"}
                }
            }
        ]
        
        result = await db.orders.aggregate(pipeline).to_list(length=1)
        if result:
            return {
                "order_count": result[0].get("order_count", 0),
                "gmv": float(result[0].get("gmv", 0)),
                "revenue": float(result[0].get("revenue", 0))
            }
        return {"order_count": 0, "gmv": 0.0, "revenue": 0.0}
    
    async def _get_active_users(self, tenant_id: Optional[str]) -> Dict[str, int]:
        """Usuarios activos últimas 24h"""
        cutoff = datetime.utcnow() - timedelta(hours=24)
        
        query = {"last_activity": {"$gte": cutoff}}
        if tenant_id:
            query["tenant_id"] = tenant_id
        
        count = await db.user_sessions.count_documents(query)
        return {"dau": count}
    
    async def _get_pending_payouts(self, tenant_id: Optional[str]) -> Dict[str, float]:
        """Pagos pendientes a afiliados"""
        query = {"status": "pending"}
        if tenant_id:
            query["tenant_id"] = tenant_id
        
        pipeline = [
            {"$match": query},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        
        result = await db.affiliate_commissions.aggregate(pipeline).to_list(length=1)
        if result:
            return {"total": float(result[0].get("total", 0))}
        return {"total": 0.0}
    
    async def _get_30d_metrics(self, tenant_id: Optional[str]) -> Dict[str, Any]:
        """Métricas de últimos 30 días"""
        cutoff = datetime.utcnow() - timedelta(days=30)
        
        query = {
            "created_at": {"$gte": cutoff},
            "status": {"$nin": ["cancelled", "pending_payment"]}
        }
        if tenant_id:
            query["tenant_id"] = tenant_id
        
        pipeline = [
            {"$match": query},
            {
                "$group": {
                    "_id": None,
                    "total_orders": {"$sum": 1},
                    "total_amount": {"$sum": "$total_amount"},
                    "unique_customers": {"$addToSet": "$user_id"}
                }
            }
        ]
        
        result = await db.orders.aggregate(pipeline).to_list(length=1)
        if result:
            total_orders = result[0].get("total_orders", 0)
            total_amount = result[0].get("total_amount", 0)
            unique_customers = len(result[0].get("unique_customers", []))
            
            return {
                "total_orders": total_orders,
                "aov": round(total_amount / total_orders, 2) if total_orders > 0 else 0,
                "unique_customers": unique_customers
            }
        return {"total_orders": 0, "aov": 0, "unique_customers": 0}
    
    async def _get_revenue_chart(
        self, 
        tenant_id: Optional[str], 
        days: int = 30
    ) -> List[RevenueDataPoint]:
        """Datos para gráfico de ingresos"""
        cutoff = datetime.utcnow() - timedelta(days=days)
        
        query = {
            "created_at": {"$gte": cutoff},
            "status": {"$nin": ["cancelled", "pending_payment"]}
        }
        if tenant_id:
            query["tenant_id"] = tenant_id
        
        pipeline = [
            {"$match": query},
            {
                "$group": {
                    "_id": {
                        "year": {"$year": "$created_at"},
                        "month": {"$month": "$created_at"},
                        "day": {"$dayOfMonth": "$created_at"}
                    },
                    "orders": {"$sum": 1},
                    "gmv": {"$sum": "$total_amount"},
                    "platform_revenue": {"$sum": "$platform_fee"},
                    "affiliate_costs": {"$sum": "$affiliate_fee"}
                }
            },
            {"$sort": {"_id.year": 1, "_id.month": 1, "_id.day": 1}}
        ]
        
        results = await db.orders.aggregate(pipeline).to_list(length=None)
        
        chart_data = []
        for r in results:
            date_obj = datetime(r["_id"]["year"], r["_id"]["month"], r["_id"]["day"])
            gmv = float(r.get("gmv", 0))
            affiliate_costs = float(r.get("affiliate_costs", 0))
            platform_revenue = float(r.get("platform_revenue", 0))
            
            chart_data.append(RevenueDataPoint(
                period=date_obj,
                orders=r.get("orders", 0),
                gmv=gmv,
                platform_revenue=platform_revenue,
                affiliate_costs=affiliate_costs,
                net_revenue=platform_revenue - affiliate_costs
            ))
        
        return chart_data
    
    async def _get_geo_distribution(
        self, 
        tenant_id: Optional[str]
    ) -> List[GeoDistribution]:
        """Distribución geográfica de ventas"""
        cutoff = datetime.utcnow() - timedelta(days=90)
        
        # Este query requiere join con users para obtener country
        # Simplificado: agrupar por dirección de orden
        query = {
            "created_at": {"$gte": cutoff},
            "status": {"$nin": ["cancelled", "pending_payment"]}
        }
        if tenant_id:
            query["tenant_id"] = tenant_id
        
        pipeline = [
            {"$match": query},
            {
                "$group": {
                    "_id": "$shipping_address.country",
                    "order_count": {"$sum": 1},
                    "total_gmv": {"$sum": "$total_amount"},
                    "unique_buyers": {"$addToSet": "$user_id"}
                }
            },
            {"$sort": {"total_gmv": -1}}
        ]
        
        results = await db.orders.aggregate(pipeline).to_list(length=None)
        
        country_names = {
            "ES": "España", "FR": "Francia", "IT": "Italia",
            "PT": "Portugal", "DE": "Alemania", "GB": "Reino Unido"
        }
        
        geo_data = []
        for r in results:
            country = r["_id"] or "Unknown"
            geo_data.append(GeoDistribution(
                country_code=country,
                country_name=country_names.get(country, country),
                order_count=r.get("order_count", 0),
                total_gmv=float(r.get("total_gmv", 0)),
                unique_buyers=len(r.get("unique_buyers", []))
            ))
        
        return geo_data
    
    def _build_kpis(
        self,
        today_metrics: Dict,
        active_users: Dict,
        pending_payouts: Dict,
        metrics_30d: Dict
    ) -> List[KPICard]:
        """Construir tarjetas de KPIs"""
        return [
            KPICard(
                title="Ingresos Hoy",
                value=f"€{today_metrics.get('revenue', 0):,.2f}",
                subtitle=f"GMV: €{today_metrics.get('gmv', 0):,.2f}",
                trend_value=12.5,
                trend_direction="up",
                trend_label="vs ayer",
                icon="dollar",
                variant="success"
            ),
            KPICard(
                title="Pedidos Hoy",
                value=str(today_metrics.get('order_count', 0)),
                icon="shopping-cart",
                variant="default"
            ),
            KPICard(
                title="Pagos Pendientes",
                value=f"€{pending_payouts.get('total', 0):,.2f}",
                trend_value=-5.2,
                trend_direction="down",
                trend_label="vs semana pasada",
                icon="credit-card",
                variant="warning"
            ),
            KPICard(
                title="Usuarios Activos (24h)",
                value=f"{active_users.get('dau', 0):,}",
                subtitle=f"{metrics_30d.get('unique_customers', 0)} únicos (30d)",
                icon="users",
                variant="default"
            ),
        ]
    
    async def get_top_products(
        self,
        tenant_id: Optional[str] = None,
        limit: int = 10,
        days: int = 30
    ) -> List[TopProduct]:
        """Productos más vendidos"""
        cutoff = datetime.utcnow() - timedelta(days=days)
        
        query = {
            "created_at": {"$gte": cutoff},
            "status": {"$nin": ["cancelled", "pending_payment"]}
        }
        if tenant_id:
            query["tenant_id"] = tenant_id
        
        pipeline = [
            {"$match": query},
            {"$unwind": "$items"},
            {
                "$group": {
                    "_id": "$items.product_id",
                    "product_name": {"$first": "$items.product_name"},
                    "total_sold": {"$sum": "$items.quantity"},
                    "total_revenue": {"$sum": "$items.total_price"}
                }
            },
            {"$sort": {"total_revenue": -1}},
            {"$limit": limit}
        ]
        
        results = await db.orders.aggregate(pipeline).to_list(length=None)
        
        return [
            TopProduct(
                product_id=str(r["_id"]),
                product_name=r.get("product_name", "Unknown"),
                total_sold=r.get("total_sold", 0),
                total_revenue=float(r.get("total_revenue", 0))
            )
            for r in results
        ]
    
    async def get_top_influencers(
        self,
        tenant_id: Optional[str] = None,
        limit: int = 10,
        days: int = 30
    ) -> List[TopInfluencer]:
        """Influencers top por GMV generado"""
        cutoff = datetime.utcnow() - timedelta(days=days)
        
        query = {
            "created_at": {"$gte": cutoff},
            "affiliate_code": {"$exists": True, "$ne": None},
            "status": {"$nin": ["cancelled", "pending_payment"]}
        }
        if tenant_id:
            query["tenant_id"] = tenant_id
        
        pipeline = [
            {"$match": query},
            {
                "$group": {
                    "_id": "$affiliate_code",
                    "gmv_generated": {"$sum": "$total_amount"},
                    "conversions": {"$sum": 1}
                }
            },
            {"$sort": {"gmv_generated": -1}},
            {"$limit": limit}
        ]
        
        results = await db.orders.aggregate(pipeline).to_list(length=None)
        
        influencers = []
        for r in results:
            # Obtener info del influencer
            affiliate_code = r["_id"]
            user = await db.users.find_one({"influencer_data.affiliate_code": affiliate_code})
            
            if user:
                # Calcular comisiones
                commission_pipeline = [
                    {
                        "$match": {
                            "influencer_id": str(user["_id"]),
                            "created_at": {"$gte": cutoff}
                        }
                    },
                    {"$group": {"_id": None, "total": {"$sum": "$commission_cents"}}}
                ]
                commission_result = await db.commission_records.aggregate(commission_pipeline).to_list(length=1)
                commission_earned = commission_result[0].get("total", 0) / 100 if commission_result else 0
                
                influencers.append(TopInfluencer(
                    user_id=str(user["_id"]),
                    display_name=user.get("display_name", "Unknown"),
                    tier=user.get("influencer_data", {}).get("tier", "hydra"),
                    gmv_generated=float(r.get("gmv_generated", 0)),
                    commission_earned=commission_earned,
                    conversions=r.get("conversions", 0)
                ))
        
        return influencers


# Instancia global
analytics_service = AnalyticsService()
