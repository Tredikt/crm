"""remove external iCal import (calendar_feeds)

Revision ID: 0007_drop_calendar_feeds
Revises: 0006_calendar_export
Create Date: 2026-04-11

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0007_drop_calendar_feeds"
down_revision: Union[str, None] = "0006_calendar_export"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(sa.text("DROP TABLE IF EXISTS imported_calendar_events CASCADE"))
    op.execute(sa.text("DROP TABLE IF EXISTS calendar_feeds CASCADE"))


def downgrade() -> None:
    op.create_table(
        "calendar_feeds",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("label", sa.String(length=255), nullable=False),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "imported_calendar_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("feed_id", sa.Integer(), nullable=False),
        sa.Column("ical_uid", sa.String(length=768), nullable=False),
        sa.Column("title", sa.String(length=1024), nullable=False),
        sa.Column("start_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("location", sa.String(length=512), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["feed_id"], ["calendar_feeds.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("feed_id", "ical_uid", name="uq_imported_event_feed_uid"),
    )
    op.create_index(
        op.f("ix_imported_calendar_events_feed_id"),
        "imported_calendar_events",
        ["feed_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_imported_calendar_events_start_at"),
        "imported_calendar_events",
        ["start_at"],
        unique=False,
    )
