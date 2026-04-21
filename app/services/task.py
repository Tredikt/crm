from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models import Project, Task, TaskStatus
from app.repositories import TaskRepository
from app.schemas.task import TaskCreate, TaskUpdate


class TaskTargetError(ValueError):
    """Несогласованные lead_id и project_id или неверная цель задачи."""


class TaskService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.tasks = TaskRepository(session)

    def _now_utc(self) -> datetime:
        return datetime.now(tz=ZoneInfo("UTC"))

    async def _resolve_task_links(
        self,
        lead_id: int | None,
        project_id: int | None,
    ) -> tuple[int | None, int | None]:
        if project_id is not None:
            proj = await self.session.get(Project, project_id)
            if proj is None or not proj.is_active:
                raise TaskTargetError("Проект не найден или неактивен")
            if lead_id is not None and lead_id != proj.lead_id:
                raise TaskTargetError("lead_id должен совпадать с лидом проекта")
            return proj.lead_id, project_id
        return lead_id, None

    async def create(self, data: TaskCreate) -> Task:
        raw = data.model_dump()
        lid, pid = await self._resolve_task_links(raw.get("lead_id"), raw.get("project_id"))
        raw["lead_id"] = lid
        raw["project_id"] = pid
        task = Task(**raw)
        self.session.add(task)
        await self.session.commit()
        await self.session.refresh(task)
        return task

    async def update(self, task_id: int, data: TaskUpdate) -> Task | None:
        task = await self.tasks.get_by_id(task_id)
        if task is None:
            return None
        patch = data.model_dump(exclude_unset=True)

        if "lead_id" in patch or "project_id" in patch:
            new_lead = patch.pop("lead_id", task.lead_id)
            new_proj = patch.pop("project_id", task.project_id)
            lid, pid = await self._resolve_task_links(new_lead, new_proj)
            task.lead_id = lid
            task.project_id = pid

        for key, value in patch.items():
            setattr(task, key, value)
        if task.status == TaskStatus.completed and task.completed_at is None:
            task.completed_at = self._now_utc()
        if task.status != TaskStatus.completed:
            task.completed_at = None
        await self.session.commit()
        await self.session.refresh(task)
        return task

    async def get(self, task_id: int) -> Task | None:
        return await self.tasks.get_by_id(task_id)

    async def delete(self, task_id: int) -> bool:
        task = await self.tasks.get_by_id(task_id)
        if task is None:
            return False
        await self.session.delete(task)
        await self.session.commit()
        return True

    async def complete(self, task_id: int) -> Task | None:
        return await self.update(
            task_id,
            TaskUpdate(status=TaskStatus.completed),
        )

    async def snooze(self, task_id: int, *, days: int) -> Task | None:
        base = self._now_utc()
        new_due = base + timedelta(days=days)
        return await self.update(task_id, TaskUpdate(due_at=new_due))

    async def overdue(self) -> list[Task]:
        return await self.tasks.list_overdue(now=self._now_utc())

    async def due_today(self) -> list[Task]:
        settings = get_settings()
        tz = ZoneInfo(settings.app_timezone)
        now_local = datetime.now(tz=tz)
        start_local = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
        end_local = start_local + timedelta(days=1)
        start_utc = start_local.astimezone(ZoneInfo("UTC"))
        end_utc = end_local.astimezone(ZoneInfo("UTC"))
        return await self.tasks.list_due_today(window_start=start_utc, window_end=end_utc)

    async def list_tasks(
        self,
        *,
        status: TaskStatus | None = None,
        include_completed: bool = False,
        lead_id: int | None = None,
        project_id: int | None = None,
        limit: int = 200,
    ) -> list[Task]:
        return await self.tasks.list_filtered(
            status=status,
            include_completed=include_completed,
            lead_id=lead_id,
            project_id=project_id,
            limit=limit,
        )
