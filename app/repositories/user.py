from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, user_id: int) -> User | None:
        return await self.session.get(User, user_id)

    async def get_by_email_normalized(self, email: str) -> User | None:
        key = email.strip().lower()
        result = await self.session.execute(select(User).where(func.lower(User.email) == key))
        return result.scalar_one_or_none()

    async def count_all(self) -> int:
        result = await self.session.execute(select(func.count()).select_from(User))
        return int(result.scalar_one())

    async def create(self, email: str, hashed_password: str) -> User:
        u = User(email=email.strip().lower(), hashed_password=hashed_password)
        self.session.add(u)
        await self.session.flush()
        await self.session.refresh(u)
        return u
