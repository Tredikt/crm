from datetime import datetime

from app.schemas.common import ORMModel


class CompanyBase(ORMModel):
    name: str
    website: str | None = None
    phone: str | None = None
    email: str | None = None
    comment: str | None = None
    is_active: bool = True


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(ORMModel):
    name: str | None = None
    website: str | None = None
    phone: str | None = None
    email: str | None = None
    comment: str | None = None
    is_active: bool | None = None


class CompanyRead(CompanyBase):
    id: int
    created_at: datetime
    updated_at: datetime


class CompanyListItem(ORMModel):
    id: int
    name: str
    phone: str | None = None
    email: str | None = None
    is_active: bool
    created_at: datetime
