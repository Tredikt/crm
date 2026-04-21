from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.config import get_settings
from app.services.calendar_export_service import (
    build_feed_bytes,
    get_or_create_settings,
    regenerate_token,
    validate_token,
)

router = APIRouter(prefix="/calendar-export", tags=["calendar-export"])


class CalendarExportStatus(BaseModel):
    feed_url_relative: str = Field(description="Путь с query token — дополнить доменом API")
    feed_url_absolute: str | None = Field(
        None, description="Если задан PUBLIC_API_BASE_URL в .env"
    )
    hint: str


@router.get("/status", response_model=CalendarExportStatus)
async def export_status(db: Annotated[AsyncSession, Depends(get_db)]) -> CalendarExportStatus:
    row = await get_or_create_settings(db)
    rel = f"/api/v1/calendar-export/feed.ics?token={row.secret_token}"
    settings = get_settings()
    base = settings.public_api_base_url.strip().rstrip("/")
    absolute = f"{base}{rel}" if base else None
    return CalendarExportStatus(
        feed_url_relative=rel,
        feed_url_absolute=absolute,
        hint="Вставьте в Google Календарь: Настройки → Добавить календарь → Из URL. "
        "Нужен адрес, который Google открывает из интернета (не localhost). "
        "Задайте PUBLIC_API_BASE_URL в .env бэкенда, чтобы видеть готовую ссылку.",
    )


class CalendarExportTokenResponse(BaseModel):
    token: str
    feed_url_relative: str
    feed_url_absolute: str | None


@router.post("/regenerate", response_model=CalendarExportTokenResponse)
async def export_regenerate(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CalendarExportTokenResponse:
    row = await regenerate_token(db)
    rel = f"/api/v1/calendar-export/feed.ics?token={row.secret_token}"
    settings = get_settings()
    base = settings.public_api_base_url.strip().rstrip("/")
    return CalendarExportTokenResponse(
        token=row.secret_token,
        feed_url_relative=rel,
        feed_url_absolute=f"{base}{rel}" if base else None,
    )


@router.get("/feed.ics")
async def export_feed_ics(
    db: Annotated[AsyncSession, Depends(get_db)],
    token: str | None = Query(None),
) -> Response:
    if not await validate_token(db, token):
        raise HTTPException(status_code=401, detail="Неверный или отсутствует token")
    body = await build_feed_bytes(db)
    return Response(
        content=body,
        media_type="text/calendar; charset=utf-8",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
        },
    )
