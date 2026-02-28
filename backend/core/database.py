"""
MongoDB database connection with production-ready pooling and timeouts.
"""
from motor.motor_asyncio import AsyncIOMotorClient
from .config import MONGO_URL, DB_NAME

# MongoDB client with connection pooling for stability
client = AsyncIOMotorClient(
    MONGO_URL,
    maxPoolSize=20,
    minPoolSize=2,
    maxIdleTimeMS=30000,
    connectTimeoutMS=5000,
    serverSelectionTimeoutMS=5000,
    socketTimeoutMS=20000,
    retryWrites=True,
    retryReads=True,
)
db = client[DB_NAME]
