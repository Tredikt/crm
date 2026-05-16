from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.associations import lead_tags

if TYPE_CHECKING:
    from app.models.lead import Lead
    from app.models.user import User


class Tag(Base):
    __tablename__ = "tags"
    __table_args__ = (UniqueConstraint("name", "user_id", name="uq_tags_name_user"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False, index=True)

    leads: Mapped[list[Lead]] = relationship("Lead", secondary=lead_tags, back_populates="tags")
    owner: Mapped[User] = relationship("User")
