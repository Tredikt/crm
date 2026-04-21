from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models import TaskStatus
from app.schemas.task import TaskCreate, TaskRead, TaskUpdate
from app.services import TaskService, TaskTargetError

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("", response_model=list[TaskRead])
async def list_tasks(
    db: Annotated[AsyncSession, Depends(get_db)],
    status_filter: TaskStatus | None = Query(None, alias="status"),
    include_completed: bool = Query(False),
    lead_id: int | None = None,
    project_id: int | None = None,
    limit: int = Query(200, ge=1, le=500),
) -> list[TaskRead]:
    tasks = await TaskService(db).list_tasks(
        status=status_filter,
        include_completed=include_completed,
        lead_id=lead_id,
        project_id=project_id,
        limit=limit,
    )
    return [TaskRead.model_validate(t) for t in tasks]


@router.get("/today", response_model=list[TaskRead])
async def tasks_today(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[TaskRead]:
    tasks = await TaskService(db).due_today()
    return [TaskRead.model_validate(t) for t in tasks]


@router.get("/overdue", response_model=list[TaskRead])
async def tasks_overdue(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[TaskRead]:
    tasks = await TaskService(db).overdue()
    return [TaskRead.model_validate(t) for t in tasks]


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
async def create_task(
    body: TaskCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TaskRead:
    try:
        task = await TaskService(db).create(body)
    except TaskTargetError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return TaskRead.model_validate(task)


@router.get("/{task_id}", response_model=TaskRead)
async def get_task(
    task_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TaskRead:
    task = await TaskService(db).get(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return TaskRead.model_validate(task)


@router.patch("/{task_id}", response_model=TaskRead)
async def update_task(
    task_id: int,
    body: TaskUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TaskRead:
    try:
        task = await TaskService(db).update(task_id, body)
    except TaskTargetError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return TaskRead.model_validate(task)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    ok = await TaskService(db).delete(task_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Task not found")
