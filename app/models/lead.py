from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Enum, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.associations import lead_tags
from app.models.enums import LeadStatus

if TYPE_CHECKING:
    from app.models.interaction import Interaction
    from app.models.project import Project
    from app.models.tag import Tag
    from app.models.task import Task


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    username: Mapped[str | None] = mapped_column(String(255), nullable=True)
    telegram_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    profile_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)

    source: Mapped[str | None] = mapped_column(String(255), nullable=True)
    niche: Mapped[str | None] = mapped_column(String(255), nullable=True)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[LeadStatus] = mapped_column(
        Enum(LeadStatus, name="lead_status", native_enum=False, length=32),
        nullable=False,
        default=LeadStatus.new,
        index=True,
    )

    last_contact_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    next_action: Mapped[str | None] = mapped_column(Text, nullable=True)
    next_action_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )

    budget: Mapped[str | None] = mapped_column(String(128), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)

    projects: Mapped[list[Project]] = relationship(
        "Project",
        back_populates="lead",
        cascade="all, delete-orphan",
        order_by="Project.created_at",
    )
    tasks: Mapped[list[Task]] = relationship(
        "Task", back_populates="lead", cascade="all, delete-orphan"
    )
    interactions: Mapped[list[Interaction]] = relationship(
        "Interaction",
        back_populates="lead",
        cascade="all, delete-orphan",
        order_by="Interaction.created_at",
    )
    tags: Mapped[list[Tag]] = relationship("Tag", secondary=lead_tags, back_populates="leads")
