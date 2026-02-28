"""
Data Cleanup Script for Hispaloshop
Removes test data and sets up production superadmin
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
import bcrypt
from datetime import datetime, timezone

load_dotenv('.env')
client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

# Real users to KEEP (do not delete)
REAL_USER_EMAILS = [
    'bchanfoue@gmail.com',
    'bilalchanfoue@gmail.com',
    'billchanfu@gmail.com',
    'bolokhovapolina@gmail.com',
    'bchanfua@gmail.com',
    'hispalonetwork@gmail.com',
    'bil.chanfu@hispalotrade.com',
    'anacondacorea@gmail.com',
    'francora343@gmail.com',
    'mr.songjin@gmail.com',
    'ceo@hispalotrade.com',
    'admin@hispaloshop.com',
    # Demo accounts for testing (keep for demos)
    'producer@test.com',
    'influencer@test.com',
    'test@example.com',
]

async def cleanup_test_users():
    """Delete all test users except the real ones"""
    print("\n=== CLEANING UP TEST USERS ===")
    
    # Find all users to delete
    users_to_delete = await db.users.find({
        'email': {'$nin': REAL_USER_EMAILS}
    }, {'email': 1, 'name': 1}).to_list(1000)
    
    print(f"Found {len(users_to_delete)} test users to delete")
    
    if users_to_delete:
        # Get user IDs
        user_ids = [u['_id'] for u in users_to_delete]
        user_id_strs = [str(u['_id']) for u in users_to_delete]
        
        # Delete related data first
        # Delete sessions
        sessions_deleted = await db.sessions.delete_many({'user_id': {'$in': user_id_strs}})
        print(f"  Deleted {sessions_deleted.deleted_count} sessions")
        
        # Delete followers
        followers_deleted = await db.followers.delete_many({
            '$or': [
                {'follower_id': {'$in': user_id_strs}},
                {'producer_id': {'$in': user_id_strs}}
            ]
        })
        print(f"  Deleted {followers_deleted.deleted_count} follower records")
        
        # Delete the users
        result = await db.users.delete_many({'email': {'$nin': REAL_USER_EMAILS}})
        print(f"  Deleted {result.deleted_count} test users")
    
    # Count remaining
    remaining = await db.users.count_documents({})
    print(f"Remaining users: {remaining}")

async def setup_superadmin():
    """Set up ceo@hispalotrade.com as the main superadmin"""
    print("\n=== SETTING UP SUPERADMIN ===")
    
    # Check if CEO account exists
    ceo = await db.users.find_one({'email': 'ceo@hispalotrade.com'})
    
    if ceo:
        # Update to superadmin
        result = await db.users.update_one(
            {'email': 'ceo@hispalotrade.com'},
            {'$set': {
                'role': 'super_admin',
                'is_superadmin': True,
                'admin_status': 'active',
                'updated_at': datetime.now(timezone.utc).isoformat()
            }}
        )
        print(f"✅ Updated ceo@hispalotrade.com to super_admin (modified: {result.modified_count})")
    else:
        # Create the account
        hashed = bcrypt.hashpw('HispaloAdmin2026!'.encode(), bcrypt.gensalt()).decode()
        new_ceo = {
            'user_id': 'ceo_hispalotrade',
            'email': 'ceo@hispalotrade.com',
            'password_hash': hashed,
            'name': 'CEO Hispalotrade',
            'role': 'super_admin',
            'is_superadmin': True,
            'admin_status': 'active',
            'email_verified': True,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(new_ceo)
        print("✅ Created new superadmin account: ceo@hispalotrade.com")
    
    # Keep admin@hispaloshop.com as secondary superadmin
    result = await db.users.update_one(
        {'email': 'admin@hispaloshop.com'},
        {'$set': {
            'is_superadmin': True,
            'admin_status': 'active'
        }}
    )
    print(f"✅ Updated admin@hispaloshop.com as secondary superadmin")

async def cleanup_orphaned_data():
    """Clean up data that references deleted users"""
    print("\n=== CLEANING ORPHANED DATA ===")
    
    # Get all valid user IDs
    users = await db.users.find({}, {'_id': 1, 'user_id': 1}).to_list(1000)
    valid_user_ids = set()
    for u in users:
        valid_user_ids.add(str(u['_id']))
        if u.get('user_id'):
            valid_user_ids.add(u['user_id'])
    
    # Clean orphaned orders (orders from deleted users)
    orders = await db.orders.find({}, {'user_id': 1}).to_list(1000)
    orphaned_orders = [o for o in orders if o.get('user_id') not in valid_user_ids]
    if orphaned_orders:
        result = await db.orders.delete_many({'_id': {'$in': [o['_id'] for o in orphaned_orders]}})
        print(f"  Deleted {result.deleted_count} orphaned orders")
    else:
        print("  No orphaned orders found")
    
    # Clean orphaned products (products from deleted producers)
    products = await db.products.find({}, {'producer_id': 1}).to_list(1000)
    orphaned_products = [p for p in products if p.get('producer_id') not in valid_user_ids]
    if orphaned_products:
        result = await db.products.delete_many({'_id': {'$in': [p['_id'] for p in orphaned_products]}})
        print(f"  Deleted {result.deleted_count} orphaned products")
    else:
        print("  No orphaned products found")
    
    # Clean old page visits (keep last 30 days)
    from datetime import timedelta
    cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    old_visits = await db.page_visits.delete_many({'timestamp': {'$lt': cutoff}})
    print(f"  Deleted {old_visits.deleted_count} old page visits (>30 days)")

async def print_final_stats():
    """Print final database statistics"""
    print("\n=== FINAL DATABASE STATS ===")
    
    collections = ['users', 'products', 'orders', 'categories', 'page_visits', 'followers', 'sessions']
    for col in collections:
        count = await db[col].count_documents({})
        print(f"  {col}: {count}")
    
    print("\n=== USERS BY ROLE ===")
    pipeline = [
        {'$group': {'_id': '$role', 'count': {'$sum': 1}}}
    ]
    roles = await db.users.aggregate(pipeline).to_list(10)
    for r in roles:
        print(f"  {r['_id']}: {r['count']}")
    
    print("\n=== SUPERADMINS ===")
    superadmins = await db.users.find({'is_superadmin': True}, {'email': 1, 'name': 1}).to_list(10)
    for sa in superadmins:
        print(f"  ✅ {sa['email']} ({sa.get('name', 'N/A')})")

async def main():
    print("=" * 50)
    print("HISPALOSHOP DATA CLEANUP SCRIPT")
    print("=" * 50)
    
    await cleanup_test_users()
    await setup_superadmin()
    await cleanup_orphaned_data()
    await print_final_stats()
    
    print("\n✅ Cleanup complete!")

if __name__ == "__main__":
    asyncio.run(main())
