from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.company import CompanyCreate, CompanyListItem, CompanyRead, CompanyUpdate
from app.services.company import CompanyService

router = APIRouter(prefix="/companies", tags=["companies"])


def _to_list_item(c) -> CompanyListItem:
    return CompanyListItem(
        id=c.id,
        name=c.name,
        phone=c.phone,
        email=c.email,
        is_active=c.is_active,
        created_at=c.created_at,
    )


@router.get("", response_model=list[CompanyRead])
async def list_companies(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    search: str | None = None,
    include_inactive: bool = False,
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> list[CompanyRead]:
    rows = await CompanyService(db, current_user.id).list_companies(
        search=search,
        include_inactive=include_inactive,
        limit=limit,
        offset=offset,
    )
    return [CompanyRead.model_validate(c) for c in rows]


@router.post("", response_model=CompanyRead, status_code=status.HTTP_201_CREATED)
async def create_company(
    body: CompanyCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CompanyRead:
    c = await CompanyService(db, current_user.id).create(body)
    return CompanyRead.model_validate(c)


@router.get("/{company_id}", response_model=CompanyRead)
async def get_company(
    company_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CompanyRead:
    c = await CompanyService(db, current_user.id).get(company_id)
    if c is None:
        raise HTTPException(status_code=404, detail="Company not found")
    return CompanyRead.model_validate(c)


@router.patch("/{company_id}", response_model=CompanyRead)
async def update_company(
    company_id: int,
    body: CompanyUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CompanyRead:
    c = await CompanyService(db, current_user.id).update(company_id, body)
    if c is None:
        raise HTTPException(status_code=404, detail="Company not found")
    return CompanyRead.model_validate(c)


@router.delete("/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_company(
    company_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> None:
    ok = await CompanyService(db, current_user.id).soft_delete(company_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Company not found")
