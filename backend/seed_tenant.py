import asyncio

from sqlalchemy import select

from database import AsyncSessionLocal
from models import Tenant


async def main():
    async with AsyncSessionLocal() as db:
        tenant = await db.scalar(select(Tenant).where(Tenant.code == "ES"))
        if tenant:
            print("Tenant ES already exists")
            return
        db.add(Tenant(code="ES", name="España", default_currency="EUR", is_active=True))
        await db.commit()
        print("Tenant ES created")


if __name__ == "__main__":
    asyncio.run(main())
