from typing import Any, Generic, TypeVar

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import Base

ModelT = TypeVar("ModelT", bound=Base)


class BaseRepository(Generic[ModelT]):
    def __init__(self, session: AsyncSession, model: type[ModelT]) -> None:
        self.session = session
        self.model = model

    async def get_by_id(self, id_: int) -> ModelT | None:
        return await self.session.get(self.model, id_)

    async def flush(self, *instances: Any) -> None:
        self.session.add_all(list(instances))
        await self.session.flush()
