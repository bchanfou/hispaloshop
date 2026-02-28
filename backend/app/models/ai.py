"""
AI-related models: profile, chat, insights.
"""
from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class AIProfile(BaseModel):
    user_id: str
    diet: List[str] = []
    allergies: List[str] = []
    goals: Optional[str] = None
    dislikes: List[str] = []
    budget_preference: Optional[str] = None
    preferred_origins: List[str] = []
    language: str = "es"
    country: str = "ES"
    last_updated: Optional[str] = None
    first_visit_completed: bool = False


class AIProfileUpdate(BaseModel):
    diet: Optional[List[str]] = None
    allergies: Optional[List[str]] = None
    goals: Optional[str] = None
    dislikes: Optional[List[str]] = None
    budget_preference: Optional[str] = None
    preferred_origins: Optional[List[str]] = None
    language: Optional[str] = None
    country: Optional[str] = None


class ChatMessage(BaseModel):
    message_id: str
    user_id: str
    session_id: str
    role: str  # 'user' or 'assistant'
    content: str
    created_at: str


class ChatMessageInput(BaseModel):
    message: str
    session_id: Optional[str] = None
    session_memory: Optional[List[dict]] = None
    language: Optional[str] = "es"


class PreferencesInput(BaseModel):
    diet_preferences: List[str]
    allergens: List[str]


class InferredTag(BaseModel):
    tag: str
    confidence: float
    source: str = "chat_inference"
    inferred_at: Optional[str] = None


class UserInferredInsights(BaseModel):
    user_id: str
    likes_tags: List[InferredTag] = []
    dislikes_tags: List[InferredTag] = []
    diet_goal_tags: List[InferredTag] = []
    fear_tags: List[InferredTag] = []
    allergy_tags: List[InferredTag] = []
    budget_profile: Optional[str] = None
    ai_action_usage: Dict[str, int] = {}
    total_ai_interactions: int = 0
    total_ai_sessions: int = 0
    recommendation_acceptance_rate: float = 0.0
    last_updated: Optional[str] = None
    consent_version: str = "1.0"


class InsightsConfig(BaseModel):
    config_id: str = "default"
    anonymity_threshold: int = 15
    enable_fear_tracking: bool = True
    enable_health_inference: bool = True
    model_in_use: str = "gpt-4o"
    last_updated: Optional[str] = None
    updated_by: Optional[str] = None


class AICartActionTarget(BaseModel):
    product_id: str
    variant_id: Optional[str] = None
    pack_id: Optional[str] = None
    quantity: int = 1


class AIExecuteActionInput(BaseModel):
    action: str
    targets: str = "all"
    products: Optional[List[AICartActionTarget]] = None


class AISmartCartAction(BaseModel):
    action: str
    criteria: Optional[str] = None
    context: Optional[Dict[str, Any]] = None
