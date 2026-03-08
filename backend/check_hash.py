#!/usr/bin/env python3
"""Verificar tipo de hash en usuarios existentes."""

import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Fix encoding
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from core.database import connect_db, db

async def check():
    await connect_db()
    
    emails = [
        'consumer@test.com',
        'producer@test.com', 
        'admin@test.com'
    ]
    
    for email in emails:
        user = await db.users.find_one({'email': email})
        if user:
            pwd_hash = user.get('password_hash', 'N/A')
            print(f"\nEmail: {email}")
            print(f"Role: {user.get('role')}")
            print(f"Hash length: {len(pwd_hash)}")
            print(f"Hash prefix: {pwd_hash[:20]}...")
            
            # Detectar tipo de hash
            if pwd_hash.startswith('$2'):
                print("Type: bcrypt")
            elif len(pwd_hash) == 64:
                print("Type: SHA-256")
            else:
                print("Type: unknown")
        else:
            print(f"\n{email}: NOT FOUND")

asyncio.run(check())
