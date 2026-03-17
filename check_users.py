import asyncio
from backend.core.database import db

async def check():
    users = await db.users.find({}, {"password_hash": 0}).limit(3).to_list(3)
    for u in users:
        uid = u.get("user_id", "MISSING")
        uname = u.get("username", "MISSING")
        role = u.get("role", "MISSING")
        keys = list(u.keys())[:15]
        print(f"  user_id={uid!r}  username={uname!r}  role={role!r}")
        print(f"  keys={keys}")
    
    no_uid = await db.users.count_documents({"$or": [{"user_id": {"$exists": False}}, {"user_id": None}, {"user_id": ""}]})
    no_uname = await db.users.count_documents({"$or": [{"username": {"$exists": False}}, {"username": None}, {"username": ""}]})
    total = await db.users.count_documents({})
    print(f"\nTotal users: {total}")
    print(f"Users WITHOUT user_id: {no_uid}")
    print(f"Users WITHOUT username: {no_uname}")
    
    sample = await db.users.find({"user_id": {"$exists": True}}, {"user_id": 1, "username": 1, "_id": 0}).limit(5).to_list(5)
    print("\nSample user_id values:")
    for s in sample:
        print(f"  user_id={s.get('user_id')!r}  username={s.get('username')!r}")

asyncio.run(check())
