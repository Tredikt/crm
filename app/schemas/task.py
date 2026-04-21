from datetime import datetime

from app.models.enums import TaskPriority, TaskStatus
from app.schemas.common import ORMModel


class TaskBase(ORMModel):
    title: str
    description: str | None = None
    due_at: datetime | None = None
    priority: TaskPriority = TaskPriority.normal
    status: TaskStatus = TaskStatus.pending
    lead_id: int | None = None
    project_id: int | None = None


class TaskCreate(TaskBase):
    pass


class TaskUpdate(ORMModel):
    title: str | None = None
    description: str | None = None
    due_at: datetime | None = None
    priority: TaskPriority | None = None
    status: TaskStatus | None = None
    lead_id: int | None = None
    project_id: int | None = None


class TaskRead(TaskBase):
    id: int
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None = None
