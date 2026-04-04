"""
LEGACY AI CHAT — Deprecated.

All AI functionality has been consolidated:
  - David AI (consumers): /api/v1/hispal-ai/* (routes/hispal_ai.py)
  - Rebeca AI (PRO producers): /api/v1/rebeca-ai/* (routes/rebeca_ai.py)
  - Pedro AI (ELITE producers): /api/v1/commercial-ai/* (routes/commercial_ai.py)
  - Content Suggester: /api/ai/suggest-content (routes/ai.py)

This file is kept as a stub to prevent import errors in main.py.
The router is empty — no endpoints are served.
"""
from fastapi import APIRouter

router = APIRouter()
