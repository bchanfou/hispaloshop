from fastapi import Request
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base

from config import settings


engine = create_async_engine(settings.DATABASE_URL, echo=False, future=True)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

Base = declarative_base()


async def set_rls_context(session: AsyncSession, user) -> None:
    await session.execute(
        text("SET LOCAL app.current_user_id = :user_id"),
        {"user_id": str(user.id)},
    )
    await session.execute(
        text("SET LOCAL app.is_admin = :is_admin"),
        {"is_admin": str(getattr(user, "role", None) == "admin")},
    )


async def get_db(request: Request):
    async with AsyncSessionLocal() as session:
        try:
            user = getattr(request.state, "user", None)
            if user is not None:
                await set_rls_context(session, user)
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
