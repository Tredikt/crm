import secrets

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.calendar_export_settings import CalendarExportSettings
from app.services.calendar_export_ics import build_lidocrm_calendar_ics


async def get_or_create_settings(session: AsyncSession, user_id: int) -> CalendarExportSettings:
    row = (
        await session.scalars(
            select(CalendarExportSettings).where(CalendarExportSettings.user_id == user_id)
        )
    ).first()
    if row is None:
        row = CalendarExportSettings(user_id=user_id, secret_token=secrets.token_urlsafe(32))
        session.add(row)
        await session.commit()
        await session.refresh(row)
    return row


async def regenerate_token(session: AsyncSession, user_id: int) -> CalendarExportSettings:
    row = await get_or_create_settings(session, user_id)
    row.secret_token = secrets.token_urlsafe(32)
    await session.commit()
    await session.refresh(row)
    return row


async def validate_token(session: AsyncSession, token: str | None) -> CalendarExportSettings | None:
    """Возвращает настройки если токен верный, иначе None."""
    if not token:
        return None
    row = (
        await session.scalars(
            select(CalendarExportSettings).where(CalendarExportSettings.secret_token == token)
        )
    ).first()
    if row is None:
        return None
    if not secrets.compare_digest(row.secret_token, token):
        return None
    return row


async def build_feed_bytes(session: AsyncSession, user_id: int) -> bytes:
    return await build_lidocrm_calendar_ics(session, user_id)
