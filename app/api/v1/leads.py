from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models import LeadStatus
from app.schemas.interaction import InteractionCreate, InteractionRead
from app.schemas.lead import LeadCreate, LeadRead, LeadUpdate
from app.schemas.project import ProjectCreateBody, ProjectRead
from app.services.lead import LeadFunnelCompleteError, LeadNotFoundError, LeadService
from app.services.project import ProjectNotFoundError, ProjectService

router = APIRouter(prefix="/leads", tags=["leads"])


@router.get("", response_model=list[LeadRead])
async def list_leads(
    db: Annotated[AsyncSession, Depends(get_db)],
    status_filter: LeadStatus | None = Query(None, alias="status"),
    include_inactive: bool = False,
    no_contact_days: int | None = Query(None, ge=1, le=3650),
    next_action_due: bool = False,
    search: str | None = None,
    tag_ids: list[int] | None = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> list[LeadRead]:
    svc = LeadService(db)
    leads = await svc.list_leads(
        status=status_filter,
        include_inactive=include_inactive,
        no_contact_days=no_contact_days,
        next_action_due=next_action_due,
        search=search,
        tag_ids=tag_ids,
        limit=limit,
        offset=offset,
    )
    return [LeadRead.model_validate(x) for x in leads]


@router.post("", response_model=LeadRead, status_code=status.HTTP_201_CREATED)
async def create_lead(
    body: LeadCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> LeadRead:
    lead = await LeadService(db).create(body)
    return LeadRead.model_validate(lead)


@router.get("/no-contact", response_model=list[LeadRead])
async def leads_no_contact(
    db: Annotated[AsyncSession, Depends(get_db)],
    days: int = Query(7, ge=1, le=3650),
) -> list[LeadRead]:
    svc = LeadService(db)
    leads = await svc.list_leads(no_contact_days=days)
    return [LeadRead.model_validate(x) for x in leads]


@router.get("/next-action-due", response_model=list[LeadRead])
async def leads_next_action_due(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[LeadRead]:
    svc = LeadService(db)
    leads = await svc.list_leads(next_action_due=True)
    return [LeadRead.model_validate(x) for x in leads]


@router.post("/{lead_id}/advance", response_model=LeadRead)
async def advance_lead_funnel(
    lead_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> LeadRead:
    svc = LeadService(db)
    try:
        lead = await svc.advance_funnel_stage(lead_id)
    except LeadNotFoundError:
        raise HTTPException(status_code=404, detail="Lead not found")
    except LeadFunnelCompleteError:
        raise HTTPException(
            status_code=409,
            detail="Нет следующего этапа воронки для текущего статуса",
        )
    return LeadRead.model_validate(lead)


@router.get("/{lead_id}/interactions", response_model=list[InteractionRead])
async def list_lead_interactions(
    lead_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[InteractionRead]:
    svc = LeadService(db)
    if await svc.get(lead_id) is None:
        raise HTTPException(status_code=404, detail="Lead not found")
    rows = await svc.list_interactions(lead_id)
    return [InteractionRead.model_validate(x) for x in rows]


@router.get(
    "/{lead_id}/projects",
    response_model=list[ProjectRead],
)
async def list_lead_projects(
    lead_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    include_inactive: bool = False,
) -> list[ProjectRead]:
    if await LeadService(db).get(lead_id) is None:
        raise HTTPException(status_code=404, detail="Lead not found")
    rows = await ProjectService(db).list_projects(
        lead_id=lead_id,
        include_inactive=include_inactive,
        limit=500,
    )
    return [ProjectRead.model_validate(p) for p in rows]


@router.post(
    "/{lead_id}/projects",
    response_model=ProjectRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_lead_project(
    lead_id: int,
    body: ProjectCreateBody,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProjectRead:
    try:
        p = await ProjectService(db).create_for_lead(lead_id, body)
    except ProjectNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e) or "Lead not found")
    return ProjectRead.model_validate(p)


@router.get("/{lead_id}", response_model=LeadRead)
async def get_lead(
    lead_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> LeadRead:
    lead = await LeadService(db).get(lead_id)
    if lead is None:
        raise HTTPException(status_code=404, detail="Lead not found")
    return LeadRead.model_validate(lead)


@router.patch("/{lead_id}", response_model=LeadRead)
async def update_lead(
    lead_id: int,
    body: LeadUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> LeadRead:
    lead = await LeadService(db).update(lead_id, body)
    if lead is None:
        raise HTTPException(status_code=404, detail="Lead not found")
    return LeadRead.model_validate(lead)


@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lead(
    lead_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    ok = await LeadService(db).delete_soft(lead_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Lead not found")


@router.post("/{lead_id}/interactions", response_model=InteractionRead, status_code=201)
async def add_interaction(
    lead_id: int,
    body: InteractionCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> InteractionRead:
    inter = await LeadService(db).add_interaction(lead_id, body)
    if inter is None:
        raise HTTPException(status_code=404, detail="Lead not found")
    return InteractionRead.model_validate(inter)
