from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models import DealStatus
from app.models.user import User
from app.schemas.deal import DealCreate, DealCreateBody, DealListItem, DealRead, DealSummary, DealUpdate
from app.services.deal import DealNotFoundError, DealService, DealStateError

router = APIRouter(prefix="/deals", tags=["deals"])


def _to_list_item(d) -> DealListItem:
    return DealListItem(
        id=d.id,
        lead_id=d.lead_id,
        title=d.title,
        amount=d.amount,
        currency=d.currency,
        status=d.status,
        probability=d.probability,
        expected_close_date=d.expected_close_date,
        is_active=d.is_active,
        created_at=d.created_at,
    )


@router.get("/summary", response_model=DealSummary)
async def deals_summary(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> DealSummary:
    return await DealService(db, current_user.id).get_summary()


@router.get("/open", response_model=list[DealListItem])
async def list_open_deals(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[DealListItem]:
    rows = await DealService(db, current_user.id).list_open()
    return [_to_list_item(d) for d in rows]


@router.get("/overdue", response_model=list[DealListItem])
async def list_overdue_deals(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[DealListItem]:
    rows = await DealService(db, current_user.id).list_overdue()
    return [_to_list_item(d) for d in rows]


@router.get("", response_model=list[DealRead])
async def list_deals(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    status_filter: DealStatus | None = Query(None, alias="status"),
    lead_id: int | None = None,
    open_only: bool = False,
    include_inactive: bool = False,
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> list[DealRead]:
    rows = await DealService(db, current_user.id).list_deals(
        status=status_filter,
        lead_id=lead_id,
        open_only=open_only,
        include_inactive=include_inactive,
        limit=limit,
        offset=offset,
    )
    return [DealRead.model_validate(d) for d in rows]


@router.post("", response_model=DealRead, status_code=status.HTTP_201_CREATED)
async def create_deal(
    body: DealCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> DealRead:
    try:
        d = await DealService(db, current_user.id).create(body)
    except DealNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e) or "Lead not found")
    return DealRead.model_validate(d)


@router.get("/{deal_id}", response_model=DealRead)
async def get_deal(
    deal_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> DealRead:
    d = await DealService(db, current_user.id).get(deal_id)
    if d is None:
        raise HTTPException(status_code=404, detail="Deal not found")
    return DealRead.model_validate(d)


@router.patch("/{deal_id}", response_model=DealRead)
async def update_deal(
    deal_id: int,
    body: DealUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> DealRead:
    try:
        d = await DealService(db, current_user.id).update(deal_id, body)
    except DealStateError as e:
        raise HTTPException(status_code=409, detail=str(e))
    if d is None:
        raise HTTPException(status_code=404, detail="Deal not found")
    return DealRead.model_validate(d)


@router.delete("/{deal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_deal(
    deal_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> None:
    ok = await DealService(db, current_user.id).soft_delete(deal_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Deal not found")
