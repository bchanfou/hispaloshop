"""
Chat Routes — Unified chat API endpoints.

This module re-exports all internal chat endpoints at /api/chat/...
for frontend compatibility.
"""
from fastapi import APIRouter

# Import the internal chat router
from routes.internal_chat import router as internal_router

# Create a new router that includes all internal chat routes
router = APIRouter()

# Copy all routes from internal_chat router
# The routes will be mounted at /api/chat/...
# Available endpoints:
# - GET /conversations
# - GET /conversations/{id}/messages
# - POST /messages
# - POST /upload-image
# - POST /upload-audio
# - PUT /messages/{id}/read
# - GET /unread-count
# - POST /start-conversation
# - DELETE /conversations/{id}
# - POST /escalate
# - GET /escalations
# - POST /conversations/{id}/read
# - POST /conversations/{id}/typing
# - GET /conversations/{id}
# - POST /groups/private
# - POST /groups/community/{id}
# - POST /groups/{id}/join
# - POST /groups/{id}/leave
# - POST /groups/{id}/members
# - GET /groups/{id}
# - GET /groups
# - GET /requests
# - GET /requests/count
# - POST /requests/{id}/accept
# - POST /requests/{id}/decline

# Re-export all routes by copying them
for route in internal_router.routes:
    router.routes.append(route)
