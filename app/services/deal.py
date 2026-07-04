from datetime import datetime
from decimal import Decimal
from zoneinfo import ZoneInfo

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Deal, DealStatus
from app.repositories import DealRepository, LeadRepository
from app.schemas.deal import DealCreate, DealCreateBody, DealSummary, DealUpdate, DealStatusSummary


class DealNotFoundError(Exception):
    pass


class DealStateError(Exception):
    """Некорректное действие для текущего статуса сделки."""


_TERMINAL = (DealStatus.won, DealStatus.lost)

_DEFAULT_PROBABILITY: dict[DealStatus, int] = {
    DealStatus.qualification: 10,
    DealStatus.proposal: 40,
    DealStatus.negotiation: 70,
    DealStatus.won: 100,
    DealStatus.lost: 0,
}


class DealService:
    def __init__(self, session: AsyncSession, user_id: int) -> None:
        self.session = session
        self.user_id = user_id
        self.deals = DealRepository(session)
        self.leads = LeadRepository(session)

    def _now_utc(self) -> datetime:
        return datetime.now(tz=ZoneInfo("UTC"))

    def _apply_status_side_effects(self, deal: Deal, status: DealStatus) -> None:
        deal.status = status
        if status in _TERMINAL:
            if deal.closed_at is None:
                deal.closed_at = self._now_utc()
            deal.probability = _DEFAULT_PROBABILITY[status]
        else:
            deal.closed_at = None

    async def create(self, data: DealCreate) -> Deal:
        lead = await self.leads.get_with_tags(data.lead_id, self.user_id)
        if lead is None or not lead.is_active:
            raise DealNotFoundError("Lead not found or inactive")
        payload = data.model_dump()
        if payload.get("probability") is None or payload["probability"] == 10:
            payload["probability"] = _DEFAULT_PROBABILITY.get(
                payload["status"], payload["probability"]
            )
        deal = Deal(user_id=self.user_id, **payload)
        if deal.status in _TERMINAL and deal.closed_at is None:
            deal.closed_at = self._now_utc()
        self.session.add(deal)
        await self.session.commit()
        await self.session.refresh(deal)
        return deal

    async def create_for_lead(self, lead_id: int, body: DealCreateBody) -> Deal:
        merged = DealCreate(lead_id=lead_id, **body.model_dump())
        return await self.create(merged)

    async def get(self, deal_id: int) -> Deal | None:
        deal = await self.deals.get_by_id(deal_id)
        if deal is None:
            return None
        lead = await self.leads.get_with_tags(deal.lead_id, self.user_id)
        if lead is None:
            return None
        return deal

    async def list_deals(
        self,
        *,
        status: DealStatus | None = None,
        lead_id: int | None = None,
        open_only: bool = False,
        include_inactive: bool = False,
        limit: int = 200,
        offset: int = 0,
    ) -> list[Deal]:
        return await self.deals.list_filtered(
            user_id=self.user_id,
            status=status,
            lead_id=lead_id,
            open_only=open_only,
            include_inactive=include_inactive,
            limit=limit,
            offset=offset,
        )

    async def list_open(self, *, limit: int = 200) -> list[Deal]:
        return await self.deals.list_open(user_id=self.user_id, limit=limit)

    async def list_overdue(self) -> list[Deal]:
        return await self.deals.list_overdue(now=self._now_utc(), user_id=self.user_id)

    async def update(self, deal_id: int, data: DealUpdate) -> Deal | None:
        deal = await self.deals.get_by_id(deal_id)
        if deal is None:
            return None
        lead = await self.leads.get_with_tags(deal.lead_id, self.user_id)
        if lead is None:
            return None
        patch = data.model_dump(exclude_unset=True)
        status_in = patch.pop("status", None)

        if status_in is not None:
            if deal.status in _TERMINAL and status_in not in _TERMINAL:
                raise DealStateError("Закрытую сделку нельзя вернуть в открытый pipeline")
            self._apply_status_side_effects(deal, status_in)

        for key, value in patch.items():
            setattr(deal, key, value)

        if status_in is None and "probability" not in patch:
            pass
        elif deal.status not in _TERMINAL and status_in is None and "probability" not in patch:
            pass

        await self.session.commit()
        await self.session.refresh(deal)
        return deal

    async def soft_delete(self, deal_id: int) -> bool:
        deal = await self.deals.get_by_id(deal_id)
        if deal is None:
            return False
        lead = await self.leads.get_with_tags(deal.lead_id, self.user_id)
        if lead is None:
            return False
        deal.is_active = False
        await self.session.commit()
        return True

    async def get_summary(self) -> DealSummary:
        rows = await self.deals.list_all_active(user_id=self.user_id)
        open_rows = [d for d in rows if d.status not in _TERMINAL]
        won_rows = [d for d in rows if d.status == DealStatus.won]
        lost_rows = [d for d in rows if d.status == DealStatus.lost]
        closed_count = len(won_rows) + len(lost_rows)
        win_rate = (len(won_rows) / closed_count * 100) if closed_count else None

        open_total = sum((d.amount for d in open_rows), Decimal("0"))
        weighted = sum(
            (d.amount * Decimal(d.probability) / Decimal(100) for d in open_rows),
            Decimal("0"),
        )
        won_total = sum((d.amount for d in won_rows), Decimal("0"))

        by_status_map: dict[DealStatus, tuple[int, Decimal]] = {}
        for d in rows:
            count, total = by_status_map.get(d.status, (0, Decimal("0")))
            by_status_map[d.status] = (count + 1, total + d.amount)

        by_status = [
            DealStatusSummary(
                status=status,
                count=count,
                total_amount=float(total),
            )
            for status, (count, total) in sorted(by_status_map.items(), key=lambda x: x[0].value)
        ]

        return DealSummary(
            open_count=len(open_rows),
            open_total_amount=float(open_total),
            weighted_pipeline=float(weighted),
            won_total_amount=float(won_total),
            lost_count=len(lost_rows),
            win_rate=round(win_rate, 1) if win_rate is not None else None,
            by_status=by_status,
        )
