"""
Hispaloshop Backend - Main Application
Modular FastAPI application structure.
"""
import os
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

# Import routers (these will be created as we modularize further)
# For now, we maintain backward compatibility by importing from server.py

app = FastAPI(
    title="Hispaloshop API",
    description="API for Hispaloshop e-commerce platform",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
