"""
Schemas para Dashboard Superadmin
Fase 5: Analytics y KPIs en tiempo real
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum


class TrendDirection(str, Enum):
    UP = "up"
    DOWN = "down"
    NEUTRAL = "neutral"


class KPICard(BaseModel):
    """Tarjeta de métrica clave para dashboard"""
    title: str
    value: str
    subtitle: Optional[str] = None
    trend_value: Optional[float] = None
    trend_direction: Optional[TrendDirection] = TrendDirection.NEUTRAL
    trend_label: Optional[str] = None
    icon: Optional[str] = "chart"
    variant: Optional[str] = "default"  # default, success, warning, danger


class RevenueDataPoint(BaseModel):
    """Punto de datos para gráficos de ingresos"""
    period: datetime
    orders: int
    gmv: float  # Gross Merchandise Value
    platform_revenue: float
    affiliate_costs: float
    net_revenue: float


class GeoDistribution(BaseModel):
    """Distribución geográfica de ventas"""
    country_code: str
    country_name: str
    order_count: int
    total_gmv: float
    unique_buyers: int


class DashboardSummaryResponse(BaseModel):
    """Respuesta completa del dashboard"""
    timestamp: datetime
    period: str = "realtime"
    tenant_id: Optional[str] = None
    metrics: Dict[str, Any] = Field(default_factory=dict)
    kpis: List[KPICard] = Field(default_factory=list)
    revenue_chart: List[RevenueDataPoint] = Field(default_factory=list)
    geo_distribution: List[GeoDistribution] = Field(default_factory=list)


class AnalyticsFilter(BaseModel):
    """Filtros para consultas analíticas"""
    tenant_id: Optional[str] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    granularity: str = "daily"  # hourly, daily, weekly, monthly


class PeriodComparison(BaseModel):
    """Comparación entre períodos"""
    current_period: Dict[str, Any]
    previous_period: Dict[str, Any]
    change_percent: Dict[str, float]


class TopProduct(BaseModel):
    """Producto top por ventas"""
    product_id: str
    product_name: str
    total_sold: int
    total_revenue: float


class TopInfluencer(BaseModel):
    """Influencer top por GMV generado"""
    user_id: str
    display_name: str
    tier: str
    gmv_generated: float
    commission_earned: float
    conversions: int


class AnalyticsReport(BaseModel):
    """Reporte analítico completo"""
    generated_at: datetime
    filters: AnalyticsFilter
    summary: Dict[str, Any]
    period_comparison: Optional[PeriodComparison] = None
    top_products: List[TopProduct] = Field(default_factory=list)
    top_influencers: List[TopInfluencer] = Field(default_factory=list)
    charts: Dict[str, List[Dict[str, Any]]] = Field(default_factory=dict)
