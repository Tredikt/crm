from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Project, ProjectStatus
from app.repositories import LeadRepository, ProjectRepository
from app.schemas.project import ProjectCreate, ProjectCreateBody, ProjectUpdate


class ProjectNotFoundError(Exception):
    pass


class ProjectStateError(Exception):
    """Некорректное действие для текущего статуса проекта."""


_TERMINAL_DONE = (ProjectStatus.completed, ProjectStatus.cancelled)


class ProjectService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.projects = ProjectRepository(session)
        self.leads = LeadRepository(session)

    def _now_utc(self) -> datetime:
        return datetime.now(tz=ZoneInfo("UTC"))

    async def create(self, data: ProjectCreate) -> Project:
        lead = await self.leads.get_by_id(data.lead_id)
        if lead is None or not lead.is_active:
            raise ProjectNotFoundError("Lead not found or inactive")
        payload = data.model_dump()
        proj = Project(**payload)
        self.session.add(proj)
        await self.session.commit()
        await self.session.refresh(proj)
        return proj

    async def create_for_lead(self, lead_id: int, body: ProjectCreateBody) -> Project:
        merged = ProjectCreate(lead_id=lead_id, **body.model_dump())
        return await self.create(merged)

    async def get(self, project_id: int) -> Project | None:
        return await self.projects.get_by_id(project_id)

    async def list_projects(
        self,
        *,
        status: ProjectStatus | None = None,
        lead_id: int | None = None,
        is_active: bool | None = None,
        include_inactive: bool = False,
        limit: int = 200,
        offset: int = 0,
    ) -> list[Project]:
        return await self.projects.list_filtered(
            status=status,
            lead_id=lead_id,
            is_active=is_active,
            include_inactive=include_inactive,
            limit=limit,
            offset=offset,
        )

    async def list_active(self, *, limit: int = 200) -> list[Project]:
        return await self.projects.list_active(limit=limit)

    async def list_overdue(self) -> list[Project]:
        return await self.projects.list_overdue(now=self._now_utc())

    async def update(self, project_id: int, data: ProjectUpdate) -> Project | None:
        proj = await self.projects.get_by_id(project_id)
        if proj is None:
            return None
        patch = data.model_dump(exclude_unset=True)
        status_in = patch.get("status")

        if status_in == ProjectStatus.completed:
            if proj.status == ProjectStatus.completed:
                raise ProjectStateError("Проект уже завершён")
            if proj.status == ProjectStatus.cancelled:
                raise ProjectStateError("Отменённый проект нельзя завершить")
        elif status_in == ProjectStatus.cancelled:
            if proj.status == ProjectStatus.completed:
                raise ProjectStateError("Завершённый проект нельзя отменить")
            if proj.status == ProjectStatus.cancelled:
                raise ProjectStateError("Проект уже отменён")

        for k, v in patch.items():
            setattr(proj, k, v)

        if proj.status == ProjectStatus.completed:
            if proj.completed_at is None:
                proj.completed_at = self._now_utc()
        else:
            proj.completed_at = None

        await self.session.commit()
        await self.session.refresh(proj)
        return proj

    async def complete(self, project_id: int) -> Project | None:
        return await self.update(
            project_id,
            ProjectUpdate(status=ProjectStatus.completed),
        )

    async def cancel(self, project_id: int) -> Project | None:
        return await self.update(
            project_id,
            ProjectUpdate(status=ProjectStatus.cancelled),
        )

    async def soft_delete(self, project_id: int) -> bool:
        proj = await self.projects.get_by_id(project_id)
        if proj is None:
            return False
        proj.is_active = False
        await self.session.commit()
        return True
