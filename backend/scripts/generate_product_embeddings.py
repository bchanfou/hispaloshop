#!/usr/bin/env python3
"""
Genera embeddings para todos los productos activos.
Ejecutar: python scripts/generate_product_embeddings.py
"""

import asyncio
import sys
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent))

from core.database import connect_db, disconnect_db, get_db
from services.ai_embeddings import embedding_service, extract_ai_tags_from_product, calculate_trending_score


async def generate_embeddings(batch_size: int = 50):
    """Genera embeddings para productos sin embedding o con embedding antiguo."""
    print("[AI] Generando embeddings de productos...\n")
    
    await connect_db()
    db = get_db()
    
    # Obtener productos activos
    products = await db.products.find({
        "status": {"$in": ["active", "approved", "pending_review"]}
    }).to_list(length=2000)
    
    print(f"[INFO] Encontrados {len(products)} productos")
    
    generated = 0
    updated = 0
    errors = 0
    skipped = 0
    
    for i, product in enumerate(products, 1):
        try:
            product_id = str(product.get("_id"))
            product_name = product.get("name", "Unknown")[:40]
            
            # Verificar si ya tiene embedding reciente
            existing = await db.product_embeddings.find_one({
                "product_id": product_id
            })
            
            if existing:
                updated_at = existing.get("updated_at")
                if isinstance(updated_at, str):
                    try:
                        updated_at = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
                    except (ValueError, AttributeError):
                        updated_at = None
                
                if updated_at:
                    age_days = (datetime.utcnow() - updated_at).days
                    if age_days < 30:
                        skipped += 1
                        if i % 100 == 0:
                            print(f"  [{i}/{len(products)}] {product_name}... (reciente, skipped)")
                        continue
            
            # Generar embedding
            embedding = await embedding_service.generate_product_embedding(product)
            
            # Extraer tags con IA
            ai_tags = extract_ai_tags_from_product(product)
            
            # Calcular trending score
            trending_score = calculate_trending_score(product)
            
            # Construir texto fuente
            source_text = " | ".join(filter(None, [
                product.get("name", ""),
                product.get("description", "")[:200]
            ]))
            
            # Guardar
            doc = {
                "product_id": product_id,
                "tenant_id": product.get("tenant_id", "ES"),
                "embedding": embedding,
                "source_text": source_text,
                "ai_tags": ai_tags,
                "trending_score": trending_score,
                "updated_at": datetime.utcnow()
            }
            
            await db.product_embeddings.update_one(
                {"product_id": product_id},
                {"$set": doc},
                upsert=True
            )
            
            if existing:
                updated += 1
                print(f"  [{i}/{len(products)}] {product_name}... (actualizado, {len(ai_tags)} tags, score: {trending_score:.0f})")
            else:
                generated += 1
                print(f"  [{i}/{len(products)}] {product_name}... (nuevo, {len(ai_tags)} tags, score: {trending_score:.0f})")
            
            # Pausa cada batch para no saturar la API
            if i % batch_size == 0:
                print(f"\n[INFO] Pausa de 2 segundos despues de {batch_size} productos...")
                await asyncio.sleep(2)
        
        except Exception as e:
            errors += 1
            print(f"  [ERROR] {product.get('name', 'Unknown')}: {str(e)}")
            continue
    
    await disconnect_db()
    
    print(f"\n{'='*60}")
    print(f"[RESUMEN]")
    print(f"  Nuevos:    {generated}")
    print(f"  Actualizados: {updated}")
    print(f"  Skipped (recientes): {skipped}")
    print(f"  Errores:   {errors}")
    print(f"{'='*60}")
    
    return generated + updated, errors


async def update_trending_scores():
    """Actualiza solo los trending scores sin regenerar embeddings."""
    print("[AI] Actualizando trending scores...\n")
    
    await connect_db()
    db = get_db()
    
    products = await db.products.find({
        "status": {"$in": ["active", "approved"]}
    }).to_list(length=2000)
    
    updated = 0
    
    for product in products:
        try:
            product_id = str(product.get("_id"))
            trending_score = calculate_trending_score(product)
            
            await db.product_embeddings.update_one(
                {"product_id": product_id},
                {"$set": {"trending_score": trending_score, "updated_at": datetime.utcnow()}},
                upsert=False
            )
            updated += 1
        except Exception as e:
            print(f"[ERROR] {e}")
    
    await disconnect_db()
    print(f"[OK] {updated} trending scores actualizados")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Generador de embeddings de productos")
    parser.add_argument("--trending-only", action="store_true", help="Solo actualizar trending scores")
    parser.add_argument("--batch-size", type=int, default=50, help="Tamaño del batch (default: 50)")
    args = parser.parse_args()
    
    try:
        if args.trending_only:
            asyncio.run(update_trending_scores())
        else:
            asyncio.run(generate_embeddings(batch_size=args.batch_size))
    except KeyboardInterrupt:
        print("\n\n[!] Cancelado por usuario")
        sys.exit(130)
    except Exception as e:
        print(f"\n\n[ERROR] {e}")
        sys.exit(1)
