from datetime import datetime

from sqlalchemy import and_, select
from sqlalchemy.orm import selectinload

from app.models import Task, TaskStatus
from app.repositories.base import BaseRepository


class TaskRepository(BaseRepository[Task]):
    def __init__(self, session):
        super().__init__(session, Task)

    async def list_open(self, *, limit: int = 200) -> list[Task]:
        q = (
            select(Task)
            .options(selectinload(Task.lead), selectinload(Task.project))
            .where(Task.status.in_((TaskStatus.pending, TaskStatus.in_progress)))
            .order_by(Task.due_at.asc().nullslast(), Task.id.asc())
            .limit(limit)
        )
        result = await self.session.scalars(q)
        return list(result.all())

    async def list_overdue(self, *, now: datetime) -> list[Task]:
        q = (
            select(Task)
            .options(selectinload(Task.lead), selectinload(Task.project))
            .where(
                and_(
                    Task.status.in_((TaskStatus.pending, TaskStatus.in_progress)),
                    Task.due_at.is_not(None),
                    Task.due_at < now,
                )
            )
            .order_by(Task.due_at.asc(), Task.id.asc())
        )
        result = await self.session.scalars(q)
        return list(result.all())

    async def list_due_today(
        self, *, window_start: datetime, window_end: datetime
    ) -> list[Task]:
        q = (
            select(Task)
            .options(selectinload(Task.lead), selectinload(Task.project))
            .where(
                and_(
                    Task.status.in_((TaskStatus.pending, TaskStatus.in_progress)),
                    Task.due_at.is_not(None),
                    Task.due_at >= window_start,
                    Task.due_at < window_end,
                )
            )
            .order_by(Task.due_at.asc(), Task.id.asc())
        )
        result = await self.session.scalars(q)
        return list(result.all())

    async def list_filtered(
        self,
        *,
        status: TaskStatus | None = None,
        include_completed: bool = False,
        lead_id: int | None = None,
        project_id: int | None = None,
        limit: int = 200,
    ) -> list[Task]:
        q = select(Task).options(selectinload(Task.lead), selectinload(Task.project))
        if status is not None:
            q = q.where(Task.status == status)
        elif not include_completed:
            q = q.where(Task.status.in_((TaskStatus.pending, TaskStatus.in_progress)))
        if lead_id is not None:
            q = q.where(Task.lead_id == lead_id)
        if project_id is not None:
            q = q.where(Task.project_id == project_id)
        q = q.order_by(Task.due_at.asc().nullslast(), Task.id.desc()).limit(limit)
        result = await self.session.scalars(q)
        return list(result.all())
