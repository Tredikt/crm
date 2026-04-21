from datetime import datetime

from sqlalchemy import and_, select
from sqlalchemy.orm import selectinload

from app.models import Project, ProjectStatus
from app.repositories.base import BaseRepository

_TERMINAL = (ProjectStatus.completed, ProjectStatus.cancelled)


class ProjectRepository(BaseRepository[Project]):
    def __init__(self, session):
        super().__init__(session, Project)

    async def list_filtered(
        self,
        *,
        status: ProjectStatus | None = None,
        lead_id: int | None = None,
        is_active: bool | None = None,
        include_inactive: bool = False,
        limit: int = 200,
        offset: int = 0,
    ) -> list[Project]:
        q = select(Project).options(selectinload(Project.lead))
        if is_active is not None:
            q = q.where(Project.is_active == is_active)
        elif not include_inactive:
            q = q.where(Project.is_active == True)  # noqa: E712
        if status is not None:
            q = q.where(Project.status == status)
        if lead_id is not None:
            q = q.where(Project.lead_id == lead_id)
        q = q.order_by(Project.deadline.asc().nullslast(), Project.id.desc())
        q = q.limit(limit).offset(offset)
        result = await self.session.scalars(q)
        return list(result.all())

    async def list_active(self, *, limit: int = 200) -> list[Project]:
        q = (
            select(Project)
            .options(selectinload(Project.lead))
            .where(
                and_(
                    Project.is_active == True,  # noqa: E712
                    Project.status.not_in(_TERMINAL),
                )
            )
            .order_by(Project.deadline.asc().nullslast(), Project.id.desc())
            .limit(limit)
        )
        result = await self.session.scalars(q)
        return list(result.all())

    async def list_overdue(self, *, now: datetime) -> list[Project]:
        q = (
            select(Project)
            .options(selectinload(Project.lead))
            .where(
                and_(
                    Project.is_active == True,  # noqa: E712
                    Project.status.not_in(_TERMINAL),
                    Project.deadline.is_not(None),
                    Project.deadline < now,
                )
            )
            .order_by(Project.deadline.asc(), Project.id.asc())
        )
        result = await self.session.scalars(q)
        return list(result.all())
