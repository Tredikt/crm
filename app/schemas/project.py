from datetime import datetime

from pydantic import Field

from app.models.enums import ProjectPriority, ProjectStatus
from app.schemas.common import ORMModel


class ProjectBase(ORMModel):
    title: str
    description: str | None = None
    status: ProjectStatus = ProjectStatus.planned
    priority: ProjectPriority = ProjectPriority.medium
    budget: str | None = None
    start_date: datetime | None = None
    deadline: datetime | None = None
    comment: str | None = None
    is_active: bool = True


class ProjectCreate(ProjectBase):
    lead_id: int


class ProjectCreateBody(ORMModel):
    """Тело POST /leads/{lead_id}/projects — lead задаётся из пути."""

    title: str
    description: str | None = None
    status: ProjectStatus = ProjectStatus.planned
    priority: ProjectPriority = ProjectPriority.medium
    budget: str | None = None
    start_date: datetime | None = None
    deadline: datetime | None = None
    comment: str | None = None


class ProjectUpdate(ORMModel):
    title: str | None = None
    description: str | None = None
    status: ProjectStatus | None = None
    priority: ProjectPriority | None = None
    budget: str | None = None
    start_date: datetime | None = None
    deadline: datetime | None = None
    completed_at: datetime | None = None
    comment: str | None = None
    is_active: bool | None = None


class ProjectRead(ProjectBase):
    id: int
    lead_id: int
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None = None


class ProjectListItem(ORMModel):
    id: int
    lead_id: int
    title: str
    status: ProjectStatus
    priority: ProjectPriority
    deadline: datetime | None = None
    is_active: bool
    created_at: datetime


class ProjectFilterParams(ORMModel):
    status: ProjectStatus | None = None
    is_active: bool | None = Field(
        default=None,
        description="Если None — по умолчанию только активные записи (is_active=True)",
    )
    lead_id: int | None = None
    include_inactive: bool = False
