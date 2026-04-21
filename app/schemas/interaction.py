from datetime import datetime

from app.models.enums import InteractionType
from app.schemas.common import ORMModel


class InteractionBase(ORMModel):
    type: InteractionType
    text: str


class InteractionCreate(InteractionBase):
    pass


class InteractionRead(InteractionBase):
    id: int
    lead_id: int
    created_at: datetime
