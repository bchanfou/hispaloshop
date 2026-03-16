"""
Servicio de embeddings para IA de recomendaciones.
Usa OpenAI API para generar vectores semanticos de productos y usuarios.
Fase 1: AI Recommendations
"""

import logging
import os
from typing import List, Dict, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

import numpy as np

try:
    from openai import AsyncOpenAI
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False

from core.config import settings

# Modelo de embeddings (1536 dimensiones)
EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSIONS = 1536


class EmbeddingService:
    """Genera y gestiona embeddings vectoriales para busqueda semantica"""
    
    def __init__(self):
        self.client: Optional[AsyncOpenAI] = None
        if HAS_OPENAI and settings.OPENAI_API_KEY:
            self.client = AsyncOpenAI(
                api_key=settings.OPENAI_API_KEY,
                organization=settings.OPENAI_ORG_ID or None
            )
    
    async def generate_embedding(self, text: str) -> List[float]:
        """Genera embedding para un texto dado."""
        if not self.client:
            # Fallback: retornar vector de ceros si no hay OpenAI
            return [0.0] * EMBEDDING_DIMENSIONS
        
        try:
            response = await self.client.embeddings.create(
                model=EMBEDDING_MODEL,
                input=text[:8000]  # Truncar si es muy largo
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error("Generando embedding: %s", e)
            return [0.0] * EMBEDDING_DIMENSIONS
    
    async def generate_product_embedding(self, product: Dict) -> List[float]:
        """
        Genera embedding para un producto basado en:
        - Nombre
        - Descripcion
        - Categoria
        - Tags/keywords
        - Ingredientes (si aplica)
        """
        # Construir texto semantico rico
        text_parts = [
            product.get("name", ""),
            product.get("description", ""),
            product.get("category_name", ""),
            product.get("category_id", ""),
            " ".join(product.get("tags", [])),
            " ".join(product.get("ingredients", [])),
            " ".join(product.get("certifications", [])),
            product.get("country_origin", ""),
        ]
        
        text = " | ".join(filter(None, text_parts))
        
        if not text.strip():
            text = product.get("name", "producto sin nombre")
        
        return await self.generate_embedding(text)
    
    async def generate_user_preference_embedding(
        self,
        preferences: Dict,
        purchase_history: List[Dict] = None,
        liked_products: List[Dict] = None
    ) -> List[float]:
        """
        Genera embedding del perfil de preferencias del usuario.
        Combina: dieta, alergias, objetivos, historial de compras, favoritos.
        """
        parts = []
        
        # Preferencias declaradas
        if preferences.get("diet"):
            parts.append(f"Dieta: {', '.join(preferences['diet'])}")
        if preferences.get("allergies"):
            parts.append(f"Evitar: {', '.join(preferences['allergies'])}")
        if preferences.get("goals"):
            parts.append(f"Objetivos: {', '.join(preferences['goals'])}")
        if preferences.get("preferred_categories"):
            parts.append(f"Categorias: {', '.join(preferences['preferred_categories'])}")
        
        # Historial de compras (ultimos 10 productos)
        if purchase_history:
            purchased_names = [p.get("name", "") for p in purchase_history[-10:] if p.get("name")]
            if purchased_names:
                parts.append(f"Compro: {', '.join(purchased_names)}")
        
        # Productos guardados/favoritos
        if liked_products:
            liked_names = [p.get("name", "") for p in liked_products[-5:] if p.get("name")]
            if liked_names:
                parts.append(f"Le gusta: {', '.join(liked_names)}")
        
        text = " | ".join(parts) if parts else "Usuario nuevo sin preferencias definidas"
        
        return await self.generate_embedding(text)
    
    async def generate_query_embedding(self, query: str) -> List[float]:
        """Genera embedding para una consulta de busqueda."""
        return await self.generate_embedding(query)
    
    @staticmethod
    def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
        """Calcula similitud coseno entre dos vectores (-1 a 1, donde 1 = identicos)"""
        if not vec1 or not vec2 or len(vec1) != len(vec2):
            return 0.0
        
        a = np.array(vec1)
        b = np.array(vec2)
        
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        
        if norm_a == 0 or norm_b == 0:
            return 0.0
        
        return float(np.dot(a, b) / (norm_a * norm_b))
    
    @staticmethod
    def euclidean_distance(vec1: List[float], vec2: List[float]) -> float:
        """Calcula distancia euclidiana entre dos vectores."""
        if not vec1 or not vec2 or len(vec1) != len(vec2):
            return float('inf')
        
        a = np.array(vec1)
        b = np.array(vec2)
        
        return float(np.linalg.norm(a - b))


# Instancia global
embedding_service = EmbeddingService()


# Funciones de utilidad para extraccion de tags

def extract_ai_tags_from_product(product: Dict) -> List[str]:
    """Extrae tags de IA basados en el contenido del producto."""
    tags = []
    
    text_to_analyze = f"{product.get('name', '')} {product.get('description', '')}"
    text_lower = text_to_analyze.lower()
    
    tag_keywords = {
        "organic": ["organico", "organic", "bio", "ecologico", "sin pesticidas"],
        "vegan": ["vegano", "vegan", "plant based", "sin animal", "100% vegetal"],
        "gluten_free": ["sin gluten", "gluten free", "libre de gluten"],
        "local": ["local", "artesanal", "km 0", "proximidad", "de la zona"],
        "premium": ["premium", "seleccion", "gourmet", "alta calidad", "exclusive"],
        "healthy": ["saludable", "healthy", "nutritivo", "bienestar"],
        "protein": ["proteina", "protein", "alto en proteina", "rica en proteina"],
        "low_sugar": ["sin azucar", "low sugar", "0% azucar", "bajo en azucar"],
        "keto": ["keto", "cetogenica", "low carb", "bajo en carbohidratos"],
        "raw": ["raw", "crudo", "sin procesar"],
        "fair_trade": ["comercio justo", "fair trade", "equitativo"],
        "sustainable": ["sostenible", "eco-friendly", "responsable"]
    }
    
    for tag, keywords in tag_keywords.items():
        if any(k in text_lower for k in keywords):
            tags.append(tag)
    
    return tags


def calculate_trending_score(product: Dict) -> float:
    """Calcula un score de trending basado en metricas del producto."""
    score = 50.0  # Base
    
    stats = product.get("stats", {})
    
    # Vistas recientes
    views = stats.get("views_count", 0)
    score += min(views / 100, 20)
    
    # Ventas recientes
    orders = stats.get("orders_count", 0)
    score += min(orders * 2, 20)
    
    # Rating alto
    rating = stats.get("avg_rating", 0)
    if rating >= 4.5:
        score += 10
    elif rating >= 4.0:
        score += 5
    
    # Producto nuevo (boost temporal)
    created_at = product.get("created_at")
    if created_at:
        if isinstance(created_at, str):
            try:
                from datetime import datetime
                created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            except Exception:
                created_at = None
        
        if created_at:
            days_since = (datetime.now(timezone.utc) - created_at).days
            if days_since < 7:
                score += 15  # Boost de nuevo producto
            elif days_since < 30:
                score += 5
    
    return min(100.0, score)
