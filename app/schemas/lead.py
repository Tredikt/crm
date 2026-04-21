from datetime import datetime

from app.models.enums import LeadStatus
from app.schemas.common import ORMModel
from app.schemas.tag import TagRead


class LeadBase(ORMModel):
    full_name: str
    username: str | None = None
    telegram_id: int | None = None
    phone: str | None = None
    profile_url: str | None = None
    source: str | None = None
    niche: str | None = None
    comment: str | None = None
    status: LeadStatus = LeadStatus.new
    last_contact_at: datetime | None = None
    next_action: str | None = None
    next_action_at: datetime | None = None
    budget: str | None = None
    is_active: bool = True
    tag_ids: list[int] | None = None


class LeadCreate(LeadBase):
    pass


class LeadUpdate(ORMModel):
    full_name: str | None = None
    username: str | None = None
    telegram_id: int | None = None
    phone: str | None = None
    profile_url: str | None = None
    source: str | None = None
    niche: str | None = None
    comment: str | None = None
    status: LeadStatus | None = None
    last_contact_at: datetime | None = None
    next_action: str | None = None
    next_action_at: datetime | None = None
    budget: str | None = None
    is_active: bool | None = None
    tag_ids: list[int] | None = None


class LeadRead(LeadBase):
    id: int
    created_at: datetime
    updated_at: datetime
    tags: list[TagRead] = []
