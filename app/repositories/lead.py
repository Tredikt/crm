from datetime import datetime, timedelta

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import selectinload

from app.models import Lead, LeadStatus, Tag
from app.models.associations import lead_tags
from app.repositories.base import BaseRepository


class LeadRepository(BaseRepository[Lead]):
    def __init__(self, session):
        super().__init__(session, Lead)

    async def get_with_tags(self, lead_id: int) -> Lead | None:
        q = select(Lead).options(selectinload(Lead.tags)).where(Lead.id == lead_id)
        result = await self.session.scalars(q)
        return result.first()

    async def list_filtered(
        self,
        *,
        status: LeadStatus | None = None,
        include_inactive: bool = False,
        no_contact_since: datetime | None = None,
        next_action_before: datetime | None = None,
        search: str | None = None,
        tag_ids: list[int] | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[Lead]:
        q = select(Lead).options(selectinload(Lead.tags))
        if not include_inactive:
            q = q.where(Lead.is_active == True)  # noqa: E712
        if status is not None:
            q = q.where(Lead.status == status)
        if no_contact_since is not None:
            q = q.where(
                or_(Lead.last_contact_at.is_(None), Lead.last_contact_at < no_contact_since)
            )
        if next_action_before is not None:
            q = q.where(
                and_(
                    Lead.next_action_at.is_not(None),
                    Lead.next_action_at <= next_action_before,
                )
            )
        if search:
            like = f"%{search.strip()}%"
            q = q.where(
                or_(
                    Lead.full_name.ilike(like),
                    Lead.username.ilike(like),
                    Lead.phone.ilike(like),
                )
            )
        if tag_ids:
            q = q.where(
                Lead.id.in_(
                    select(lead_tags.c.lead_id).where(lead_tags.c.tag_id.in_(tag_ids)).distinct()
                )
            )

        q = q.order_by(Lead.next_action_at.asc().nullslast(), Lead.id.asc())
        q = q.limit(limit).offset(offset)
        result = await self.session.scalars(q)
        return list(result.all())

    async def list_no_contact_days(self, days: int, *, now: datetime) -> list[Lead]:
        threshold = now - timedelta(days=days)
        return await self.list_filtered(no_contact_since=threshold)

    async def list_next_action_due(self, *, before: datetime) -> list[Lead]:
        return await self.list_filtered(next_action_before=before)

    async def sync_tags(self, lead: Lead, tag_ids: list[int] | None) -> None:
        if tag_ids is None:
            return
        if not tag_ids:
            lead.tags.clear()
            return
        result = await self.session.scalars(select(Tag).where(Tag.id.in_(tag_ids)))
        tags = list(result.all())
        lead.tags = tags
