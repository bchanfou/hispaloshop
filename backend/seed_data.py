import asyncio

from sqlalchemy import select

from database import AsyncSessionLocal
from models import Category, Product, ProductImage, Tenant, User
from security import get_password_hash


def slugify(name: str) -> str:
    return "-".join(name.lower().split())


async def main():
    async with AsyncSessionLocal() as db:
        tenant = await db.scalar(select(Tenant).where(Tenant.code == "ES"))
        if not tenant:
            raise RuntimeError("Run seed_tenant.py first")

        producer = await db.scalar(select(User).where(User.email == "producer@test.com"))
        if not producer:
            producer = User(
                tenant_id=tenant.id,
                email="producer@test.com",
                hashed_password=get_password_hash("SecurePass123!"),
                full_name="Finca La Esperanza",
                role="producer",
                is_active=True,
            )
            db.add(producer)
            await db.flush()

        category_map = {
            "Alimentación": ["Conservas", "Aceites", "Quesos"],
            "Artesanía": ["Cerámica", "Textil"],
        }
        created = {}
        for parent_name, children in category_map.items():
            parent = await db.scalar(select(Category).where(Category.slug == slugify(parent_name), Category.tenant_id == tenant.id))
            if not parent:
                parent = Category(tenant_id=tenant.id, name=parent_name, slug=slugify(parent_name), description=f"{parent_name} españoles")
                db.add(parent)
                await db.flush()
            created[parent_name] = parent
            for child_name in children:
                child = await db.scalar(select(Category).where(Category.slug == slugify(child_name), Category.tenant_id == tenant.id))
                if not child:
                    db.add(
                        Category(
                            tenant_id=tenant.id,
                            parent_id=parent.id,
                            name=child_name,
                            slug=slugify(child_name),
                            description=f"{child_name} artesanales",
                        )
                    )

        await db.flush()
        aceites = await db.scalar(select(Category).where(Category.slug == "aceites", Category.tenant_id == tenant.id))

        base_products = [
            ("Aceite de Oliva Virgen Extra", 2500),
            ("Aceite Picual Reserva", 3200),
            ("Aceite Ecológico Sierra", 2890),
        ]
        for idx, (name, price) in enumerate(base_products):
            slug = slugify(name)
            exists = await db.scalar(select(Product).where(Product.slug == slug, Product.tenant_id == tenant.id))
            if exists:
                continue
            product = Product(
                tenant_id=tenant.id,
                producer_id=producer.id,
                category_id=aceites.id,
                name=name,
                slug=slug,
                short_description="Aceite premium de Jaén",
                description=f"{name} con extracción en frío.",
                price_cents=price,
                compare_at_price_cents=price + 500,
                inventory_quantity=20,
                status="active",
                is_vegan=True,
                is_organic=idx % 2 == 0,
            )
            db.add(product)
            await db.flush()
            db.add(
                ProductImage(
                    product_id=product.id,
                    url=f"https://picsum.photos/seed/{slug}/800/600",
                    thumbnail_url=f"https://picsum.photos/seed/{slug}/300/200",
                    alt_text=name,
                    is_primary=True,
                )
            )

        await db.commit()
        print("Seed data completed")


if __name__ == "__main__":
    asyncio.run(main())
