from sqlalchemy import select

from app.models import Tag
from app.repositories.base import BaseRepository


class TagRepository(BaseRepository[Tag]):
    def __init__(self, session):
        super().__init__(session, Tag)

    async def get_by_name(self, name: str) -> Tag | None:
        q = select(Tag).where(Tag.name == name)
        return await self.session.scalar(q)

    async def list_all(self, *, limit: int = 500) -> list[Tag]:
        q = select(Tag).order_by(Tag.name.asc()).limit(limit)
        result = await self.session.scalars(q)
        return list(result.all())
