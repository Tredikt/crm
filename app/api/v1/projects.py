from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models import ProjectStatus
from app.schemas.project import ProjectCreate, ProjectListItem, ProjectRead, ProjectUpdate
from app.services.project import (
    ProjectNotFoundError,
    ProjectService,
    ProjectStateError,
)

router = APIRouter(prefix="/projects", tags=["projects"])


def _to_list_item(p) -> ProjectListItem:
    return ProjectListItem(
        id=p.id,
        lead_id=p.lead_id,
        title=p.title,
        status=p.status,
        priority=p.priority,
        deadline=p.deadline,
        is_active=p.is_active,
        created_at=p.created_at,
    )


@router.get("/active", response_model=list[ProjectListItem])
async def list_active_projects(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[ProjectListItem]:
    rows = await ProjectService(db).list_active()
    return [_to_list_item(p) for p in rows]


@router.get("/overdue", response_model=list[ProjectListItem])
async def list_overdue_projects(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[ProjectListItem]:
    rows = await ProjectService(db).list_overdue()
    return [_to_list_item(p) for p in rows]


@router.get("", response_model=list[ProjectRead])
async def list_projects(
    db: Annotated[AsyncSession, Depends(get_db)],
    status_filter: ProjectStatus | None = Query(None, alias="status"),
    lead_id: int | None = None,
    is_active: bool | None = None,
    include_inactive: bool = Query(
        False,
        description="Если true — не ограничивать по is_active, пока не задан явный is_active",
    ),
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> list[ProjectRead]:
    rows = await ProjectService(db).list_projects(
        status=status_filter,
        lead_id=lead_id,
        is_active=is_active,
        include_inactive=include_inactive,
        limit=limit,
        offset=offset,
    )
    return [ProjectRead.model_validate(p) for p in rows]


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
async def create_project(
    body: ProjectCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProjectRead:
    try:
        p = await ProjectService(db).create(body)
    except ProjectNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e) or "Lead not found")
    return ProjectRead.model_validate(p)


@router.get("/{project_id}", response_model=ProjectRead)
async def get_project(
    project_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProjectRead:
    p = await ProjectService(db).get(project_id)
    if p is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProjectRead.model_validate(p)


@router.patch("/{project_id}", response_model=ProjectRead)
async def update_project(
    project_id: int,
    body: ProjectUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProjectRead:
    try:
        p = await ProjectService(db).update(project_id, body)
    except ProjectStateError as e:
        raise HTTPException(status_code=409, detail=str(e))
    if p is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProjectRead.model_validate(p)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    ok = await ProjectService(db).soft_delete(project_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Project not found")
