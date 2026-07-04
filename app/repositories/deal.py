from datetime import datetime

from sqlalchemy import and_, select
from sqlalchemy.orm import selectinload

from app.models import Deal, DealStatus, Lead
from app.repositories.base import BaseRepository

_TERMINAL = (DealStatus.won, DealStatus.lost)


class DealRepository(BaseRepository[Deal]):
    def __init__(self, session):
        super().__init__(session, Deal)

    async def list_filtered(
        self,
        *,
        user_id: int,
        status: DealStatus | None = None,
        lead_id: int | None = None,
        open_only: bool = False,
        include_inactive: bool = False,
        limit: int = 200,
        offset: int = 0,
    ) -> list[Deal]:
        q = select(Deal).options(selectinload(Deal.lead)).join(Deal.lead)
        q = q.where(Lead.user_id == user_id)
        if not include_inactive:
            q = q.where(Deal.is_active == True)  # noqa: E712
        if status is not None:
            q = q.where(Deal.status == status)
        if lead_id is not None:
            q = q.where(Deal.lead_id == lead_id)
        if open_only:
            q = q.where(Deal.status.not_in(_TERMINAL))
        q = q.order_by(Deal.expected_close_date.asc().nullslast(), Deal.id.desc())
        q = q.limit(limit).offset(offset)
        result = await self.session.scalars(q)
        return list(result.all())

    async def list_open(self, *, user_id: int, limit: int = 200) -> list[Deal]:
        return await self.list_filtered(user_id=user_id, open_only=True, limit=limit)

    async def list_overdue(self, *, now: datetime, user_id: int) -> list[Deal]:
        q = (
            select(Deal)
            .options(selectinload(Deal.lead))
            .join(Deal.lead)
            .where(
                and_(
                    Lead.user_id == user_id,
                    Deal.is_active == True,  # noqa: E712
                    Deal.status.not_in(_TERMINAL),
                    Deal.expected_close_date.is_not(None),
                    Deal.expected_close_date < now,
                )
            )
            .order_by(Deal.expected_close_date.asc(), Deal.id.asc())
        )
        result = await self.session.scalars(q)
        return list(result.all())

    async def list_all_active(self, *, user_id: int, limit: int = 5000) -> list[Deal]:
        q = (
            select(Deal)
            .join(Deal.lead)
            .where(
                and_(
                    Lead.user_id == user_id,
                    Deal.is_active == True,  # noqa: E712
                )
            )
            .limit(limit)
        )
        result = await self.session.scalars(q)
        return list(result.all())
