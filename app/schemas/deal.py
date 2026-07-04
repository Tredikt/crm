from datetime import datetime
from decimal import Decimal

from pydantic import Field, field_serializer

from app.models.enums import DealStatus
from app.schemas.common import ORMModel


class DealBase(ORMModel):
    title: str
    amount: Decimal = Field(default=Decimal("0"), ge=0)
    currency: str = Field(default="RUB", min_length=3, max_length=3)
    status: DealStatus = DealStatus.qualification
    probability: int = Field(default=10, ge=0, le=100)
    expected_close_date: datetime | None = None
    comment: str | None = None
    is_active: bool = True


class DealCreate(DealBase):
    lead_id: int


class DealCreateBody(ORMModel):
    """Тело POST /leads/{lead_id}/deals — lead задаётся из пути."""

    title: str
    amount: Decimal = Field(default=Decimal("0"), ge=0)
    currency: str = Field(default="RUB", min_length=3, max_length=3)
    status: DealStatus = DealStatus.qualification
    probability: int = Field(default=10, ge=0, le=100)
    expected_close_date: datetime | None = None
    comment: str | None = None


class DealUpdate(ORMModel):
    title: str | None = None
    amount: Decimal | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    status: DealStatus | None = None
    probability: int | None = Field(default=None, ge=0, le=100)
    expected_close_date: datetime | None = None
    closed_at: datetime | None = None
    comment: str | None = None
    is_active: bool | None = None


class DealRead(DealBase):
    id: int
    lead_id: int
    created_at: datetime
    updated_at: datetime
    closed_at: datetime | None = None

    @field_serializer("amount")
    def serialize_amount(self, value: Decimal) -> float:
        return float(value)


class DealListItem(ORMModel):
    id: int
    lead_id: int
    title: str
    amount: Decimal
    currency: str
    status: DealStatus
    probability: int
    expected_close_date: datetime | None = None
    is_active: bool
    created_at: datetime

    @field_serializer("amount")
    def serialize_amount(self, value: Decimal) -> float:
        return float(value)


class DealStatusSummary(ORMModel):
    status: DealStatus
    count: int
    total_amount: float


class DealSummary(ORMModel):
    open_count: int
    open_total_amount: float
    weighted_pipeline: float
    won_total_amount: float
    currency: str = "RUB"
    by_status: list[DealStatusSummary]
