"""
Database connection module for Hispaloshop.
Single source of truth for MongoDB connection.
"""
import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger("server")

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")

if not MONGO_URL or not DB_NAME:
    raise RuntimeError("MONGO_URL and DB_NAME environment variables are required")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
