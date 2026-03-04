"""
Seed demo data for local QA:
- users (producer, importer, influencer, customers)
- products + certificates
- social posts + reels + follows
"""

import asyncio
from datetime import datetime, timedelta
from pathlib import Path
import sys

from sqlalchemy import func, select

# Allow running from both repo root and backend directory.
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from database import AsyncSessionLocal
from models import (
    Category,
    Follow,
    Importer,
    InfluencerProfile,
    Post,
    Product,
    ProductCertificate,
    ProductImage,
    ReelView,
    Tenant,
    User,
)
from security import get_password_hash


def utcnow_naive() -> datetime:
    return datetime.utcnow()


async def get_or_create_user(db, tenant_id, email, full_name, role, username):
    user = await db.scalar(select(User).where(User.email == email))
    if user:
        return user
    user = User(
        tenant_id=tenant_id,
        email=email,
        hashed_password=get_password_hash("DemoPass123!"),
        full_name=full_name,
        role=role,
        username=username,
        is_active=True,
        email_verified=True,
        is_verified=True,
        avatar_url=f"https://i.pravatar.cc/300?u={email}",
        bio=f"Cuenta demo de {role}",
        location="Spain",
    )
    db.add(user)
    await db.flush()
    return user


async def ensure_category(db, tenant_id, slug, name):
    category = await db.scalar(select(Category).where(Category.tenant_id == tenant_id, Category.slug == slug))
    if category:
        return category
    category = Category(tenant_id=tenant_id, slug=slug, name=name, description=f"Categoria {name}", is_active=True)
    db.add(category)
    await db.flush()
    return category


async def ensure_product(db, tenant_id, producer_id, category_id, name, slug, price_cents):
    product = await db.scalar(select(Product).where(Product.slug == slug, Product.tenant_id == tenant_id))
    if product:
        return product
    product = Product(
        tenant_id=tenant_id,
        producer_id=producer_id,
        category_id=category_id,
        name=name,
        slug=slug,
        description=f"{name} demo",
        short_description="Producto demo",
        price_cents=price_cents,
        inventory_quantity=50,
        status="active",
        is_organic=True,
        origin_country="ES",
        published_at=utcnow_naive(),
    )
    db.add(product)
    await db.flush()

    db.add(
        ProductImage(
            product_id=product.id,
            url=f"https://picsum.photos/seed/{slug}/1200/900",
            thumbnail_url=f"https://picsum.photos/seed/{slug}/400/300",
            alt_text=name,
            is_primary=True,
            sort_order=0,
        )
    )

    existing_cert = await db.scalar(select(ProductCertificate).where(ProductCertificate.product_id == product.id))
    if not existing_cert:
        db.add(
            ProductCertificate(
                product_id=product.id,
                name="Certificado Digital Hispaloshop",
                issuer="Hispaloshop QA",
                is_verified=True,
            )
        )
    return product


async def ensure_post(db, tenant_id, user_id, content, media_url, is_reel, hours_ago, tagged_ids):
    existing = await db.scalar(select(Post).where(Post.user_id == user_id, Post.content == content))
    if existing:
        return existing
    created_at = utcnow_naive() - timedelta(hours=hours_ago)
    post = Post(
        user_id=user_id,
        tenant_id=tenant_id,
        content=content,
        media_urls=[media_url],
        media_type="video" if is_reel else "image",
        thumbnail_url=media_url if not is_reel else "https://picsum.photos/seed/reel-thumb/900/1600",
        aspect_ratio="9:16" if is_reel else "4:5",
        tagged_products=tagged_ids,
        product_tags_positions=[{"product_id": str(tagged_ids[0]), "x": 42, "y": 35}] if tagged_ids else None,
        likes_count=12 + int(hours_ago),
        comments_count=3 + int(hours_ago % 3),
        shares_count=1,
        saves_count=2,
        views_count=100 + int(hours_ago) * 5,
        views_count_unique=80 + int(hours_ago) * 4,
        is_reel=is_reel,
        video_duration_seconds=18.5 if is_reel else None,
        status="published",
        visibility="public",
        trending_score=10.0,
        viral_score=6.0 if is_reel else 2.0,
        created_at=created_at,
        published_at=created_at,
    )
    db.add(post)
    await db.flush()
    return post


async def main():
    async with AsyncSessionLocal() as db:
        tenant = await db.scalar(select(Tenant).where(Tenant.code == "ES"))
        if not tenant:
            raise RuntimeError("Tenant ES not found. Run python backend/seed_tenant.py first.")

        producer = await get_or_create_user(
            db, tenant.id, "demo.producer@hispaloshop.com", "Demo Productor", "producer", "demoproductor"
        )
        importer_user = await get_or_create_user(
            db, tenant.id, "demo.importer@hispaloshop.com", "Demo Importador", "importer", "demoimportador"
        )
        influencer = await get_or_create_user(
            db, tenant.id, "demo.influencer@hispaloshop.com", "Demo Influencer", "influencer", "demoinfluencer"
        )
        customer1 = await get_or_create_user(
            db, tenant.id, "demo.customer1@hispaloshop.com", "Demo Cliente Uno", "customer", "democliente1"
        )
        customer2 = await get_or_create_user(
            db, tenant.id, "demo.customer2@hispaloshop.com", "Demo Cliente Dos", "customer", "democliente2"
        )

        importer = await db.scalar(select(Importer).where(Importer.user_id == importer_user.id))
        if not importer:
            importer = Importer(
                user_id=importer_user.id,
                company_name="Demo Imports SL",
                vat_tax_id="ESB12345678",
                country_origin="ES",
                warehouses=[{"city": "Valencia", "capacity": "1200m2"}],
                specializations=["aceites", "conservas"],
                certifications={"iso": True},
                payment_terms_accepted=["30d"],
                verification_documents={},
                is_verified=True,
            )
            db.add(importer)
            await db.flush()

        inf_profile = await db.scalar(select(InfluencerProfile).where(InfluencerProfile.user_id == influencer.id))
        if not inf_profile:
            db.add(
                InfluencerProfile(
                    user_id=influencer.id,
                    tier="aquiles",
                    total_gmv_cents=80_000,
                    monthly_gmv_cents=80_000,
                    is_verified=True,
                )
            )

        oils = await ensure_category(db, tenant.id, "aceites-demo", "Aceites Demo")
        snacks = await ensure_category(db, tenant.id, "snacks-demo", "Snacks Demo")

        p1 = await ensure_product(db, tenant.id, producer.id, oils.id, "AOVE Demo Reserva", "aove-demo-reserva", 1890)
        p2 = await ensure_product(
            db, tenant.id, producer.id, snacks.id, "Snack Mediterraneo Demo", "snack-demo-mediterraneo", 790
        )
        p3 = await ensure_product(
            db, tenant.id, importer_user.id, oils.id, "AOVE Importador Demo", "aove-importador-demo", 2090
        )
        p3.importer_id = importer.id
        p3.source_type = "imported"

        follow_pairs = [
            (customer1.id, producer.id),
            (customer1.id, influencer.id),
            (customer2.id, importer_user.id),
            (influencer.id, producer.id),
        ]
        for follower_id, following_id in follow_pairs:
            exists = await db.scalar(
                select(Follow).where(Follow.follower_id == follower_id, Follow.following_id == following_id)
            )
            if not exists:
                db.add(Follow(follower_id=follower_id, following_id=following_id))

        reel1 = await ensure_post(
            db,
            tenant.id,
            producer.id,
            "Reel demo: proceso de embotellado",
            "https://cdn.hispaloshop.demo/reel/producer-bottling.mp4",
            True,
            1,
            [p1.id],
        )
        reel2 = await ensure_post(
            db,
            tenant.id,
            influencer.id,
            "Reel demo: receta rapida con AOVE",
            "https://cdn.hispaloshop.demo/reel/influencer-recipe.mp4",
            True,
            4,
            [p2.id],
        )
        await ensure_post(
            db,
            tenant.id,
            producer.id,
            "Nuevo lote de AOVE demo listo para envio",
            "https://picsum.photos/seed/post-aove-demo/1200/900",
            False,
            2,
            [p1.id],
        )
        await ensure_post(
            db,
            tenant.id,
            influencer.id,
            "Review real del AOVE demo: sabor intenso",
            "https://picsum.photos/seed/post-review-demo/1200/900",
            False,
            5,
            [p1.id],
        )
        await ensure_post(
            db,
            tenant.id,
            importer_user.id,
            "Nueva seleccion importada disponible",
            "https://picsum.photos/seed/post-importer-demo/1200/900",
            False,
            9,
            [p3.id],
        )

        for reel, viewer in [(reel1, customer1.id), (reel1, customer2.id), (reel2, customer1.id)]:
            seen = await db.scalar(select(ReelView).where(ReelView.post_id == reel.id, ReelView.viewer_id == viewer))
            if not seen:
                db.add(
                    ReelView(
                        post_id=reel.id,
                        viewer_id=viewer,
                        watch_time_seconds=15.0,
                        watched_full=True,
                        source="feed",
                        device_type="mobile",
                    )
                )

        await db.commit()

    async with AsyncSessionLocal() as verify:
        users_count = await verify.scalar(select(func.count(User.id)))
        products_count = await verify.scalar(select(func.count(Product.id)))
        certs_count = await verify.scalar(select(func.count(ProductCertificate.id)))
        posts_count = await verify.scalar(select(func.count(Post.id)))
        reels_count = await verify.scalar(select(func.count(Post.id)).where(Post.is_reel.is_(True)))
        print(
            f"Demo seed ready. users={users_count} products={products_count} "
            f"certificates={certs_count} posts={posts_count} reels={reels_count}"
        )


if __name__ == "__main__":
    asyncio.run(main())
