"""calendar export settings forical feed url

Revision ID: 0006_calendar_export
Revises: 0005_remove_google_calendar
Create Date: 2026-04-11

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0006_calendar_export"
down_revision: Union[str, None] = "0005_remove_google_calendar"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "calendar_export_settings",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("secret_token", sa.String(length=64), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("secret_token"),
    )


def downgrade() -> None:
    op.drop_table("calendar_export_settings")
