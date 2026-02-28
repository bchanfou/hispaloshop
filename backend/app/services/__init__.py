"""
Services module - Business logic layer.

Available services:
- ai_inference: GPT-4o signal extraction from chat
"""
from .ai_inference import infer_user_signals_from_chat

__all__ = ['infer_user_signals_from_chat']

