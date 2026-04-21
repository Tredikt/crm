from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models import Tag
from app.repositories import TagRepository
from app.schemas.tag import TagCreate, TagRead

router = APIRouter(prefix="/tags", tags=["tags"])


@router.get("", response_model=list[TagRead])
async def list_tags(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[TagRead]:
    tags = await TagRepository(db).list_all()
    return [TagRead.model_validate(t) for t in tags]


@router.post("", response_model=TagRead, status_code=status.HTTP_201_CREATED)
async def create_tag(
    body: TagCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TagRead:
    repo = TagRepository(db)
    existing = await repo.get_by_name(body.name)
    if existing is not None:
        raise HTTPException(status_code=409, detail="Tag already exists")
    tag = Tag(name=body.name.strip())
    db.add(tag)
    await db.commit()
    await db.refresh(tag)
    return TagRead.model_validate(tag)
