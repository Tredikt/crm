from datetime import datetime, timedelta
from typing import cast
from zoneinfo import ZoneInfo

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models import Interaction, InteractionType, Lead, LeadStatus
from app.repositories import InteractionRepository, LeadRepository
from app.schemas.interaction import InteractionCreate
from app.schemas.lead import LeadCreate, LeadUpdate


class LeadNotFoundError(Exception):
    """Лид не найден."""


class LeadFunnelCompleteError(Exception):
    """Для текущего статуса нет следующего шага воронки."""


FUNNEL_NEXT: dict[LeadStatus, LeadStatus | None] = {
    LeadStatus.new: LeadStatus.in_work,
    LeadStatus.in_work: LeadStatus.first_contact,
    LeadStatus.first_contact: LeadStatus.need_identified,
    LeadStatus.need_identified: LeadStatus.offer_sent,
    LeadStatus.offer_sent: LeadStatus.thinking,
    LeadStatus.thinking: LeadStatus.follow_up,
    LeadStatus.follow_up: LeadStatus.paid,
    LeadStatus.postponed: LeadStatus.follow_up,
    LeadStatus.paid: None,
    LeadStatus.rejected: None,
}


class LeadService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.leads = LeadRepository(session)
        self.interactions = InteractionRepository(session)

    def _now_utc(self) -> datetime:
        return datetime.now(tz=ZoneInfo("UTC"))

    async def create(self, data: LeadCreate) -> Lead:
        payload = data.model_dump(exclude={"tag_ids"})
        lead = Lead(**payload)
        self.session.add(lead)
        await self.session.flush()
        await self.leads.sync_tags(lead, data.tag_ids)
        await self.session.commit()
        reloaded = await self.leads.get_with_tags(lead.id)
        assert reloaded is not None
        return reloaded

    async def update(self, lead_id: int, data: LeadUpdate) -> Lead | None:
        lead = await self.leads.get_by_id(lead_id)
        if lead is None:
            return None
        update_data = data.model_dump(exclude_unset=True)
        tag_ids = cast(list[int] | None, update_data.pop("tag_ids", None))
        for key, value in update_data.items():
            setattr(lead, key, value)
        await self.leads.sync_tags(lead, tag_ids)
        await self.session.commit()
        return await self.leads.get_with_tags(lead_id)

    async def get(self, lead_id: int) -> Lead | None:
        return await self.leads.get_with_tags(lead_id)

    async def delete_soft(self, lead_id: int) -> bool:
        lead = await self.leads.get_by_id(lead_id)
        if lead is None:
            return False
        lead.is_active = False
        await self.session.commit()
        return True

    async def list_interactions(self, lead_id: int, *, limit: int = 100) -> list[Interaction]:
        return await self.interactions.list_for_lead(lead_id, limit=limit)

    async def add_interaction(self, lead_id: int, data: InteractionCreate) -> Interaction | None:
        lead = await self.leads.get_by_id(lead_id)
        if lead is None:
            return None
        inter = Interaction(lead_id=lead_id, type=data.type, text=data.text)
        self.session.add(inter)
        lead.last_contact_at = self._now_utc()
        await self.session.commit()
        await self.session.refresh(inter)
        return inter

    async def record_touch_and_plan(
        self,
        lead_id: int,
        *,
        interaction_text: str,
        interaction_type: InteractionType = InteractionType.telegram,
        next_action: str | None = None,
        next_action_at: datetime | None = None,
        new_status: LeadStatus | None = None,
    ) -> Lead | None:
        lead = await self.leads.get_by_id(lead_id)
        if lead is None:
            return None
        inter = Interaction(
            lead_id=lead_id,
            type=interaction_type,
            text=interaction_text,
        )
        self.session.add(inter)
        lead.last_contact_at = self._now_utc()
        if next_action is not None:
            lead.next_action = next_action
        if next_action_at is not None:
            lead.next_action_at = next_action_at
        if new_status is not None:
            lead.status = new_status
        await self.session.commit()
        return await self.leads.get_with_tags(lead_id)

    async def advance_funnel_stage(self, lead_id: int) -> Lead:
        lead = await self.leads.get_by_id(lead_id)
        if lead is None:
            raise LeadNotFoundError()
        nxt = FUNNEL_NEXT.get(lead.status)
        if nxt is None:
            raise LeadFunnelCompleteError()
        moved = await self.record_touch_and_plan(
            lead_id,
            interaction_text="Этап завершён (уведомление CRM / бот)",
            interaction_type=InteractionType.note,
            new_status=nxt,
            next_action="Уточнить следующий шаг в CRM",
            next_action_at=self._now_utc() + timedelta(days=1),
        )
        if moved is None:
            raise LeadNotFoundError()
        return moved

    async def list_leads(
        self,
        *,
        status: LeadStatus | None = None,
        include_inactive: bool = False,
        no_contact_days: int | None = None,
        next_action_due: bool = False,
        search: str | None = None,
        tag_ids: list[int] | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[Lead]:
        now = self._now_utc()
        no_contact_since = (
            now - timedelta(days=no_contact_days) if no_contact_days is not None else None
        )
        next_before = now if next_action_due else None
        return await self.leads.list_filtered(
            status=status,
            include_inactive=include_inactive,
            no_contact_since=no_contact_since,
            next_action_before=next_before,
            search=search,
            tag_ids=tag_ids,
            limit=limit,
            offset=offset,
        )

    def today_window(self) -> tuple[datetime, datetime]:
        settings = get_settings()
        tz = ZoneInfo(settings.app_timezone)
        now = datetime.now(tz=tz)
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        if start.tzinfo is None:
            start = start.replace(tzinfo=tz)
        end = start + timedelta(days=1)
        return (start.astimezone(ZoneInfo("UTC")), end.astimezone(ZoneInfo("UTC")))
