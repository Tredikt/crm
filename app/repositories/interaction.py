from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models import Interaction
from app.repositories.base import BaseRepository


class InteractionRepository(BaseRepository[Interaction]):
    def __init__(self, session):
        super().__init__(session, Interaction)

    async def list_for_lead(self, lead_id: int, *, limit: int = 100) -> list[Interaction]:
        q = (
            select(Interaction)
            .options(selectinload(Interaction.lead))
            .where(Interaction.lead_id == lead_id)
            .order_by(Interaction.created_at.desc())
            .limit(limit)
        )
        result = await self.session.scalars(q)
        return list(result.all())
