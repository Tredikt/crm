from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CalendarExportSettings(Base):
    """Один ряд: секрет для публичной ссылки экспорта iCal."""

    __tablename__ = "calendar_export_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    secret_token: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
