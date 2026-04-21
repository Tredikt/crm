import secrets

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.calendar_export_settings import CalendarExportSettings
from app.services.calendar_export_ics import build_lidocrm_calendar_ics


async def get_or_create_settings(session: AsyncSession) -> CalendarExportSettings:
    row = (await session.scalars(select(CalendarExportSettings).limit(1))).first()
    if row is None:
        row = CalendarExportSettings(secret_token=secrets.token_urlsafe(32))
        session.add(row)
        await session.commit()
        await session.refresh(row)
    return row


async def regenerate_token(session: AsyncSession) -> CalendarExportSettings:
    row = await get_or_create_settings(session)
    row.secret_token = secrets.token_urlsafe(32)
    await session.commit()
    await session.refresh(row)
    return row


async def validate_token(session: AsyncSession, token: str | None) -> bool:
    if not token:
        return False
    row = (await session.scalars(select(CalendarExportSettings).limit(1))).first()
    if row is None:
        return False
    return secrets.compare_digest(row.secret_token, token)


async def build_feed_bytes(session: AsyncSession) -> bytes:
    return await build_lidocrm_calendar_ics(session)
