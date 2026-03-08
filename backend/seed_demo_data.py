#!/usr/bin/env python3
"""
Seed de datos demo para Hispaloshop
Crea productos, tiendas y posts de ejemplo
"""

import asyncio
import sys
import os
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.database import connect_db, db

# Datos de ejemplo
PRODUCTS = [
    {
        "name": "Aceite de Oliva Virgen Extra Premium",
        "description": "Aceite de oliva de primera prensada en frío. Variedad picual. Sabor intenso y frutado.",
        "price": 24.90,
        "category": "aceites",
        "origin_country": "ES",
        "image_url": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600",
        "stock": 50,
        "rating": 4.9,
        "reviews_count": 128
    },
    {
        "name": "Queso Manchego Curado DOP",
        "description": "Queso de oveja manchega. Curación mínima de 6 meses. Sabor intenso y persistente.",
        "price": 18.50,
        "category": "quesos",
        "origin_country": "ES",
        "image_url": "https://images.unsplash.com/photo-1552767059-ce182ead6c1b?w=600",
        "stock": 30,
        "rating": 4.8,
        "reviews_count": 89
    },
    {
        "name": "Miel de Romero Ecológica",
        "description": "Miel cruda de romero recolectada en primavera. Sin filtrar ni pasteurizar.",
        "price": 12.90,
        "category": "miel",
        "origin_country": "ES",
        "image_url": "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600",
        "stock": 40,
        "rating": 4.9,
        "reviews_count": 67
    },
    {
        "name": "Jamón Ibérico de Bellota",
        "description": "Jamón ibérico 100% de bellota. Curación de 36 meses. Denominación de origen.",
        "price": 89.00,
        "category": "embutidos",
        "origin_country": "ES",
        "image_url": "https://images.unsplash.com/photo-1603048719539-9ecb4aa395e3?w=600",
        "stock": 15,
        "rating": 4.9,
        "reviews_count": 234
    },
    {
        "name": "Vino Rioja Reserva 2020",
        "description": "Tempranillo 100%. 18 meses en barrica de roble americano. Aromas a frutos rojos y vainilla.",
        "price": 24.50,
        "category": "vinos",
        "origin_country": "ES",
        "image_url": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600",
        "stock": 60,
        "rating": 4.7,
        "reviews_count": 156
    },
    {
        "name": "Pack Desayuno Mediterráneo",
        "description": "Incluye: Aceite EVOO 500ml, Miel 250g, Mermelada artesanal y Pan de aceite.",
        "price": 32.00,
        "category": "packs",
        "origin_country": "ES",
        "image_url": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600",
        "stock": 25,
        "rating": 4.8,
        "reviews_count": 45
    }
]

POSTS = [
    {
        "caption": "Así prensamos nuestro aceite de oliva virgen extra 🫒✨ Cada gota es oro líquido fruto del trabajo de todo un año. #AOVE #Artesanal #Hispaloshop",
        "image_url": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600",
        "likes_count": 3420,
        "comments_count": 128
    },
    {
        "caption": "12 meses de curación para el mejor sabor 🧀 Así luce nuestro queso manchego cuando está listo para disfrutar. #QuesoManchego #Tradición",
        "image_url": "https://images.unsplash.com/photo-1568627175730-73d05c79fa0f?w=600",
        "likes_count": 5670,
        "comments_count": 234
    },
    {
        "caption": "Directo de la colmena a tu mesa 🍯🐝 Miel cruda sin aditivos. Así la recogemos, así la disfrutas. #MielPura #Ecológico",
        "image_url": "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600",
        "likes_count": 2890,
        "comments_count": 67
    }
]

STORES = [
    {
        "name": "Cortijo Andaluz",
        "slug": "cortijo-andaluz",
        "description": "Productores de aceite de oliva virgen extra desde 1985. Tradición familiar y calidad garantizada.",
        "location": "Córdoba, Andalucía",
        "rating": 4.9,
        "review_count": 328,
        "follower_count": 12500,
        "product_count": 12
    },
    {
        "name": "Quesería La Antigua",
        "slug": "queseria-la-antigua",
        "description": "Quesos artesanales de oveja manchega. Curación tradicional en bodegas de piedra.",
        "location": "Valladolid, Castilla y León",
        "rating": 4.8,
        "review_count": 189,
        "follower_count": 8200,
        "product_count": 8
    },
    {
        "name": "Miel del Sur",
        "slug": "miel-del-sur",
        "description": "Apicultores dedicados a la producción de miel ecológica. De la colmena a tu mesa.",
        "location": "Granada, Andalucía",
        "rating": 4.9,
        "review_count": 156,
        "follower_count": 6400,
        "product_count": 6
    }
]


async def seed_data():
    """Crea datos demo en la base de datos"""
    print("=" * 60)
    print("SEED DEMO DATA - Creando datos de ejemplo")
    print("=" * 60)
    
    try:
        await connect_db()
        print("\n[OK] Conectado a MongoDB")
    except Exception as e:
        print(f"\n[ERROR] {e}")
        return False
    
    # Obtener usuarios de test
    producer = await db.users.find_one({'email': 'producer@test.com'})
    consumer = await db.users.find_one({'email': 'consumer@test.com'})
    
    if not producer:
        print("[ERROR] No se encontró usuario producer@test.com")
        return False
    
    producer_id = producer['user_id']
    consumer_id = consumer['user_id'] if consumer else producer_id
    
    # Crear tiendas
    print("\n--- Creando tiendas ---")
    for store_data in STORES:
        existing = await db.stores.find_one({'slug': store_data['slug']})
        if not existing:
            store_doc = {
                **store_data,
                'owner_id': producer_id,
                'owner_type': 'producer',
                'created_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat(),
                'verified': True
            }
            await db.stores.insert_one(store_doc)
            print(f"[OK] Tienda: {store_data['name']}")
        else:
            print(f"[SKIP] Tienda ya existe: {store_data['name']}")
    
    # Crear productos
    print("\n--- Creando productos ---")
    for product_data in PRODUCTS:
        existing = await db.products.find_one({'name': product_data['name']})
        if not existing:
            product_doc = {
                **product_data,
                'product_id': f"prod_{os.urandom(4).hex()}",
                'producer_id': producer_id,
                'seller_type': 'producer',
                'status': 'active',
                'created_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat()
            }
            await db.products.insert_one(product_doc)
            print(f"[OK] Producto: {product_data['name']}")
        else:
            print(f"[SKIP] Producto ya existe: {product_data['name']}")
    
    # Crear posts
    print("\n--- Creando posts ---")
    for i, post_data in enumerate(POSTS):
        existing = await db.posts.find_one({'caption': post_data['caption']})
        if not existing:
            post_doc = {
                **post_data,
                'post_id': f"post_{os.urandom(4).hex()}",
                'user_id': producer_id,
                'user_name': producer.get('name', 'Cortijo Andaluz'),
                'user_profile_image': producer.get('picture'),
                'type': 'post',
                'created_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat()
            }
            await db.posts.insert_one(post_doc)
            print(f"[OK] Post #{i+1}")
        else:
            print(f"[SKIP] Post #{i+1} ya existe")
    
    print("\n" + "=" * 60)
    print("SEED COMPLETADO")
    print("=" * 60)
    print("\nDatos creados:")
    print(f"- Tiendas: {len(STORES)}")
    print(f"- Productos: {len(PRODUCTS)}")
    print(f"- Posts: {len(POSTS)}")
    
    return True


if __name__ == "__main__":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    
    result = asyncio.run(seed_data())
    sys.exit(0 if result else 1)
